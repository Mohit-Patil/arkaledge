import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

const require = createRequire(import.meta.url);

function findPackageJsonPath(packageName) {
  const directNodeModulesPath = resolve(
    process.cwd(),
    "node_modules",
    ...packageName.split("/"),
    "package.json",
  );

  if (existsSync(directNodeModulesPath)) {
    return directNodeModulesPath;
  }

  let entryPath;
  try {
    entryPath = require.resolve(packageName);
  } catch {
    throw new Error(
      `Could not resolve ${packageName}. Install dependencies and SDK peers first.`,
    );
  }

  let cursor = dirname(entryPath);

  while (true) {
    const candidate = resolve(cursor, "package.json");
    if (existsSync(candidate)) {
      const parsed = JSON.parse(readFileSync(candidate, "utf8"));
      if (parsed.name === packageName) {
        return candidate;
      }
    }

    const parent = dirname(cursor);
    if (parent === cursor) {
      throw new Error(`Could not locate package.json for ${packageName}`);
    }
    cursor = parent;
  }
}

function readPackageJson(packageName) {
  const pkgJsonPath = findPackageJsonPath(packageName);
  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
  return { pkg, pkgJsonPath };
}

function resolveTypesFile(packageName) {
  const { pkg, pkgJsonPath } = readPackageJson(packageName);
  const pkgDir = dirname(pkgJsonPath);

  if (typeof pkg.types === "string") {
    const typesPath = resolve(pkgDir, pkg.types);
    if (existsSync(typesPath)) return { version: pkg.version, typesPath };
  }

  const rootExport = pkg.exports?.["."] ?? pkg.exports;
  if (rootExport && typeof rootExport === "object") {
    const typesPathFromExport = rootExport.types;
    if (typeof typesPathFromExport === "string") {
      const typesPath = resolve(pkgDir, typesPathFromExport);
      if (existsSync(typesPath)) return { version: pkg.version, typesPath };
    }
  }

  return { version: pkg.version, typesPath: null };
}

function assertTypesContain(packageName, snippets) {
  const { version, typesPath } = resolveTypesFile(packageName);
  if (!typesPath) {
    throw new Error(
      `Could not resolve a .d.ts file for ${packageName}@${version}`,
    );
  }

  const contents = readFileSync(typesPath, "utf8");
  for (const snippet of snippets) {
    assert.ok(
      contents.includes(snippet),
      `${packageName}@${version} is missing expected type snippet: ${snippet}`,
    );
  }

  return version;
}

async function checkCodexSdk() {
  const mod = await import("@openai/codex-sdk");
  const Codex = mod.Codex ?? mod.default?.Codex;
  assert.equal(typeof Codex, "function", "Codex class export is missing");

  // Use codexPathOverride so this contract check does not depend on optional CLI binaries.
  const codex = new Codex({ codexPathOverride: process.execPath });
  assert.equal(
    typeof codex.startThread,
    "function",
    "Codex.startThread() is missing",
  );
  assert.equal(
    typeof codex.resumeThread,
    "function",
    "Codex.resumeThread() is missing",
  );

  const thread = codex.startThread({
    model: "o3",
    sandboxMode: "workspace-write",
    approvalPolicy: "never",
    workingDirectory: process.cwd(),
    skipGitRepoCheck: true,
  });
  assert.equal(typeof thread.run, "function", "Thread.run() is missing");
  assert.equal(
    typeof thread.runStreamed,
    "function",
    "Thread.runStreamed() is missing",
  );

  const resumedThread = codex.resumeThread("contract-smoke-thread-id", {
    model: "o3",
    sandboxMode: "workspace-write",
    approvalPolicy: "never",
  });
  assert.equal(
    typeof resumedThread.runStreamed,
    "function",
    "Resumed thread is missing runStreamed()",
  );

  const version = assertTypesContain("@openai/codex-sdk", [
    "type ThreadEvent",
    "\"thread.started\"",
    "\"item.completed\"",
    "resumeThread(id: string, options?: ThreadOptions): Thread;",
  ]);

  console.log(`[ok] @openai/codex-sdk@${version} contract check passed`);
}

async function checkClaudeSdk() {
  const mod = await import("@anthropic-ai/claude-agent-sdk");
  const query = mod.query ?? mod.default?.query;
  assert.equal(
    typeof query,
    "function",
    "Claude SDK query() export is missing",
  );

  const version = assertTypesContain("@anthropic-ai/claude-agent-sdk", [
    "query(",
    "AsyncIterable",
  ]);

  console.log(
    `[ok] @anthropic-ai/claude-agent-sdk@${version} contract check passed`,
  );
}

async function main() {
  await checkCodexSdk();
  await checkClaudeSdk();
  console.log("SDK contract smoke checks passed.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`SDK contract smoke checks failed: ${message}`);
  process.exit(1);
});
