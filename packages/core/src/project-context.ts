import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import type { ProjectContext, SharedProjectContext } from "./types.js";

const ARKALEDGE_DIR = ".arkaledge";
const CONTEXT_JSON_FILE = "project-context.json";
const CONTEXT_MARKDOWN_FILE = "project-context.md";
const CONTEXT_SCHEMA_VERSION = 1;
const MAX_GUIDANCE_CHARS = 2500;
const MAX_INVENTORY_FILES = 240;
const MAX_SAMPLE_FILES = 24;
const MAX_IMPORTANT_FILES = 32;
const IGNORED_DIRS = new Set([
  ".git",
  ".arkaledge",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  ".cache",
]);

const CONTEXT_SIGNAL_FILES = [
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
  "tsconfig.json",
  "jsconfig.json",
  "README.md",
  "AGENTS.md",
  "CLOUD.md",
];

const memoryCache = new Map<string, SharedProjectContext>();

interface Inventory {
  files: string[];
  signatures: string[];
  sourceFileCount: number;
  testFileCount: number;
  languageCounts: Record<string, number>;
}

interface FingerprintInput {
  rootEntries: string[];
  signalFileSignatures: string[];
  inventory: Inventory;
}

/**
 * Build (or reuse) a shared project context for a specific output project.
 * Context is persisted per project under `<projectDir>/.arkaledge/`.
 */
export async function ensureSharedProjectContext(projectDir: string): Promise<SharedProjectContext> {
  const contextDir = join(projectDir, ARKALEDGE_DIR);
  const jsonPath = join(contextDir, CONTEXT_JSON_FILE);
  const markdownPath = join(contextDir, CONTEXT_MARKDOWN_FILE);
  await mkdir(contextDir, { recursive: true });

  const fingerprintInput = await collectFingerprintInput(projectDir);
  const fingerprint = hashObject({
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    ...fingerprintInput,
  });

  const cached = memoryCache.get(projectDir);
  if (cached && cached.context.fingerprint === fingerprint) {
    return cached;
  }

  const existing = await loadContext(jsonPath);
  if (existing && existing.fingerprint === fingerprint) {
    const prompt = formatPrompt(existing, markdownPath);
    const shared: SharedProjectContext = {
      context: existing,
      prompt,
      jsonPath,
      markdownPath,
    };
    memoryCache.set(projectDir, shared);
    return shared;
  }

  const context = await buildContext(projectDir, fingerprint, fingerprintInput.inventory);
  const markdown = renderMarkdown(context);

  await writeFile(jsonPath, `${JSON.stringify(context, null, 2)}\n`);
  await writeFile(markdownPath, markdown);

  const prompt = formatPrompt(context, markdownPath);
  const shared: SharedProjectContext = {
    context,
    prompt,
    jsonPath,
    markdownPath,
  };
  memoryCache.set(projectDir, shared);
  return shared;
}

async function buildContext(
  projectDir: string,
  fingerprint: string,
  inventory: Inventory,
): Promise<ProjectContext> {
  const packageJson = await readJsonIfExists<Record<string, unknown>>(join(projectDir, "package.json"));
  const packageScripts = readObject(packageJson?.scripts);
  const dependencies = {
    ...readObject(packageJson?.dependencies),
    ...readObject(packageJson?.devDependencies),
  };

  const testFrameworkHints: string[] = [];
  for (const depName of Object.keys(dependencies)) {
    if (/vitest|jest|mocha|ava|tap|uvu|playwright|pytest/i.test(depName)) {
      testFrameworkHints.push(depName);
    }
  }

  const importantFiles = buildImportantFiles(inventory.files);
  const sampleFiles = inventory.files.filter(isSourceLikeFile).slice(0, MAX_SAMPLE_FILES);
  const primaryLanguage = detectPrimaryLanguage(inventory.languageCounts);
  const packageManager = detectPackageManager(inventory.files);
  const testCommand = detectTestCommand(packageScripts, inventory.testFileCount, primaryLanguage);
  const hasTypeScript = inventory.languageCounts.typescript > 0 || inventory.files.includes("tsconfig.json");
  const agentsGuidance = await readGuidanceFile(projectDir, "AGENTS.md");
  const cloudGuidance = await readGuidanceFile(projectDir, "CLOUD.md");

  // Preserve deterministic ordering for context stability.
  importantFiles.sort();
  sampleFiles.sort();
  testFrameworkHints.sort();

  return {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    fingerprint,
    projectDir,
    primaryLanguage,
    packageManager,
    testCommand,
    hasTypeScript,
    sourceFileCount: inventory.sourceFileCount,
    testFileCount: inventory.testFileCount,
    importantFiles,
    sampleFiles,
    agentsGuidance,
    cloudGuidance,
  };
}

function formatPrompt(context: ProjectContext, markdownPath: string): string {
  const lines: string[] = [
    "Shared project context (same for all agents in this run):",
    `- Fingerprint: ${context.fingerprint}`,
    `- Context file: ${markdownPath}`,
    `- Primary language: ${context.primaryLanguage}`,
    `- Package manager: ${context.packageManager}`,
    `- TypeScript project: ${context.hasTypeScript ? "yes" : "no"}`,
    `- Recommended test command: ${context.testCommand}`,
    `- Source files detected: ${context.sourceFileCount}`,
    `- Test files detected: ${context.testFileCount}`,
    `- Important files: ${context.importantFiles.join(", ") || "(none detected)"}`,
    `- Sample files: ${context.sampleFiles.join(", ") || "(none detected)"}`,
    "Use this context as the default source of truth.",
    "Avoid full repository re-discovery unless this task clearly needs additional files.",
  ];

  if (context.agentsGuidance) {
    lines.push("AGENTS.md guidance excerpt:");
    lines.push(context.agentsGuidance);
  }

  if (context.cloudGuidance) {
    lines.push("CLOUD.md guidance excerpt:");
    lines.push(context.cloudGuidance);
  }

  return lines.join("\n");
}

function renderMarkdown(context: ProjectContext): string {
  const lines: string[] = [
    "# Shared Project Context",
    "",
    `- Schema version: ${context.schemaVersion}`,
    `- Generated at: ${context.generatedAt}`,
    `- Fingerprint: ${context.fingerprint}`,
    `- Project dir: ${context.projectDir}`,
    "",
    "## Stack",
    "",
    `- Primary language: ${context.primaryLanguage}`,
    `- Package manager: ${context.packageManager}`,
    `- TypeScript: ${context.hasTypeScript ? "yes" : "no"}`,
    `- Recommended test command: ${context.testCommand}`,
    `- Source file count: ${context.sourceFileCount}`,
    `- Test file count: ${context.testFileCount}`,
    "",
    "## Important Files",
    "",
    ...(context.importantFiles.length > 0
      ? context.importantFiles.map((file) => `- ${file}`)
      : ["- (none detected)"]),
    "",
    "## Sample Files",
    "",
    ...(context.sampleFiles.length > 0
      ? context.sampleFiles.map((file) => `- ${file}`)
      : ["- (none detected)"]),
  ];

  if (context.agentsGuidance) {
    lines.push("", "## AGENTS.md Guidance (Excerpt)", "", context.agentsGuidance);
  }

  if (context.cloudGuidance) {
    lines.push("", "## CLOUD.md Guidance (Excerpt)", "", context.cloudGuidance);
  }

  lines.push("");
  return lines.join("\n");
}

async function collectFingerprintInput(projectDir: string): Promise<FingerprintInput> {
  const rootEntries = await listRootEntries(projectDir);
  const signalFileSignatures = await collectSignalFileSignatures(projectDir);
  const inventory = await collectInventory(projectDir);

  return {
    rootEntries,
    signalFileSignatures,
    inventory,
  };
}

async function listRootEntries(projectDir: string): Promise<string[]> {
  const entries = await readdir(projectDir, { withFileTypes: true });
  return entries
    .filter((entry) => !(entry.isDirectory() && IGNORED_DIRS.has(entry.name)))
    .map((entry) => entry.name)
    .sort();
}

async function collectSignalFileSignatures(projectDir: string): Promise<string[]> {
  const signatures: string[] = [];
  for (const file of CONTEXT_SIGNAL_FILES) {
    const fullPath = join(projectDir, file);
    const sig = await fileSignature(fullPath, file);
    if (sig) signatures.push(sig);
  }
  signatures.sort();
  return signatures;
}

async function collectInventory(projectDir: string): Promise<Inventory> {
  const queue: string[] = [projectDir];
  const files: string[] = [];
  const signatures: string[] = [];
  const languageCounts: Record<string, number> = {
    typescript: 0,
    javascript: 0,
    python: 0,
    go: 0,
    rust: 0,
    java: 0,
    other: 0,
  };
  let sourceFileCount = 0;
  let testFileCount = 0;

  while (queue.length > 0 && files.length < MAX_INVENTORY_FILES) {
    const dir = queue.shift();
    if (!dir) continue;

    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (files.length >= MAX_INVENTORY_FILES) break;

      const fullPath = join(dir, entry.name);
      const rel = normalizePath(relative(projectDir, fullPath));

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        queue.push(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      files.push(rel);
      const st = await stat(fullPath);
      signatures.push(`${rel}:${st.size}:${Math.trunc(st.mtimeMs)}`);

      if (isSourceLikeFile(rel)) {
        sourceFileCount++;
      }
      if (isTestFile(rel)) {
        testFileCount++;
      }

      const language = detectFileLanguage(rel);
      languageCounts[language] = (languageCounts[language] ?? 0) + 1;
    }
  }

  files.sort();
  signatures.sort();

  return {
    files,
    signatures,
    sourceFileCount,
    testFileCount,
    languageCounts,
  };
}

function buildImportantFiles(files: string[]): string[] {
  const important = new Set<string>();
  const namedFiles = new Set([
    "AGENTS.md",
    "CLOUD.md",
    "README.md",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lockb",
    "tsconfig.json",
    "jsconfig.json",
    "eslint.config.js",
    "eslint.config.mjs",
    ".eslintrc",
    ".eslintrc.json",
    ".eslintrc.js",
  ]);

  for (const file of files) {
    const fileName = basename(file);
    if (namedFiles.has(fileName) || isTestFile(file)) {
      important.add(file);
      if (important.size >= MAX_IMPORTANT_FILES) break;
    }
  }

  return [...important];
}

function detectPrimaryLanguage(counts: Record<string, number>): string {
  const ranked: Array<[string, number]> = [
    ["typescript", counts.typescript ?? 0],
    ["javascript", counts.javascript ?? 0],
    ["python", counts.python ?? 0],
    ["go", counts.go ?? 0],
    ["rust", counts.rust ?? 0],
    ["java", counts.java ?? 0],
    ["other", counts.other ?? 0],
  ];

  ranked.sort((a, b) => b[1] - a[1]);
  const [lang, count] = ranked[0];
  if (count <= 0) return "unknown";
  return lang;
}

function detectPackageManager(files: string[]): ProjectContext["packageManager"] {
  if (files.includes("pnpm-lock.yaml")) return "pnpm";
  if (files.includes("yarn.lock")) return "yarn";
  if (files.includes("bun.lockb")) return "bun";
  if (files.includes("package-lock.json") || files.includes("package.json")) return "npm";
  return "none";
}

function detectTestCommand(
  packageScripts: Record<string, unknown>,
  testFileCount: number,
  primaryLanguage: string,
): string {
  if (typeof packageScripts.test === "string" && packageScripts.test.trim().length > 0) {
    return packageScripts.test.trim();
  }
  if (testFileCount > 0 && (primaryLanguage === "javascript" || primaryLanguage === "typescript")) {
    return "node --test";
  }
  if (primaryLanguage === "python") return "pytest";
  return "N/A";
}

function detectFileLanguage(file: string): keyof Inventory["languageCounts"] {
  const ext = file.slice(file.lastIndexOf(".")).toLowerCase();
  if (ext === ".ts" || ext === ".tsx") return "typescript";
  if (ext === ".js" || ext === ".jsx" || ext === ".mjs" || ext === ".cjs") return "javascript";
  if (ext === ".py") return "python";
  if (ext === ".go") return "go";
  if (ext === ".rs") return "rust";
  if (ext === ".java") return "java";
  return "other";
}

function isSourceLikeFile(file: string): boolean {
  return /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java)$/i.test(file);
}

function isTestFile(file: string): boolean {
  return /(^|\/).+\.(test|spec)\.[^/]+$/i.test(file);
}

function normalizePath(pathValue: string): string {
  return pathValue.replace(/\\/g, "/");
}

function hashObject(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function fileSignature(filePath: string, label: string): Promise<string | null> {
  try {
    const st = await stat(filePath);
    if (st.isFile()) {
      return `${label}:${st.size}:${Math.trunc(st.mtimeMs)}`;
    }
    return null;
  } catch {
    return null;
  }
}

async function loadContext(filePath: string): Promise<ProjectContext | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as ProjectContext;
  } catch {
    return null;
  }
}

async function readGuidanceFile(projectDir: string, filename: string): Promise<string | undefined> {
  const candidates = [join(projectDir, filename), join(process.cwd(), filename)];
  for (const candidate of candidates) {
    try {
      const content = await readFile(candidate, "utf-8");
      return content.slice(0, MAX_GUIDANCE_CHARS).trim() || undefined;
    } catch {
      continue;
    }
  }
  return undefined;
}

function readObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
