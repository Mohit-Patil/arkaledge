/**
 * Entropy Scanner - Detects drift patterns in agent-generated code
 *
 * Run as: npx tsx packages/core/src/scripts/entropy-scanner.ts [path]
 *
 * Purpose: "This functions like garbage collection" - catch drift patterns
 * before they compound. Run as part of CI or before commits.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

interface DriftPattern {
  name: string;
  pattern: RegExp;
  message: string;
  exclude?: RegExp;
  severity: "error" | "warning";
}

const DRIFT_PATTERNS: DriftPattern[] = [
  {
    name: "any-type-usage",
    pattern: /:\s*any\b/,
    message: "Avoid 'any' type — use 'unknown' and narrow",
    severity: "error",
  },
  {
    name: "silent-error-swallow",
    pattern: /catch\s*\{[\s]*\}/,
    message: "Empty catch block — errors are silently swallowed",
    severity: "error",
  },
  {
    name: "console-log-usage",
    pattern: /console\.(log|debug|info)\(/,
    message: "Use structured logger instead of console.log",
    severity: "warning",
  },
  {
    name: "non-null-assertion",
    pattern: /!\./,
    message: "Avoid non-null assertions — use explicit null checks",
    severity: "error",
  },
  {
    name: "magic-numbers",
    pattern: /\b\d{4,}\b/,
    message: "Magic number detected — extract to named constant",
    exclude: /timeout|port|version|^\d{4}-\d{2}-\d{2}/,
    severity: "warning",
  },
  {
    name: "any-return-type",
    pattern: /=>\s*any\b/,
    message: "Avoid returning 'any' — use 'unknown' and narrow",
    severity: "error",
  },
];

interface Violation {
  file: string;
  line: number;
  pattern: string;
  lineContent: string;
  severity: "error" | "warning";
}

async function scanForDrift(projectDir: string): Promise<Violation[]> {
  const files = await findTypeScriptFiles(projectDir);
  const violations: Violation[] = [];

  for (const file of files) {
    const content = await readFile(file, "utf-8");
    const lines = content.split("\n");

    for (const pattern of DRIFT_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comments
        if (line.trim().startsWith("//") || line.trim().startsWith("/*")) continue;

        if (pattern.exclude && pattern.exclude.test(line)) continue;
        if (pattern.pattern.test(line)) {
          violations.push({
            file,
            line: i + 1,
            pattern: pattern.name,
            lineContent: line.trim(),
            severity: pattern.severity,
          });
        }
      }
    }
  }

  return violations;
}

async function findTypeScriptFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      files.push(...(await findTypeScriptFiles(path)));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
      files.push(path);
    }
  }

  return files;
}

function printViolations(violations: Violation[]): void {
  const errors = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");

  if (errors.length > 0) {
    console.error("\n=== ERRORS ===");
    for (const v of errors) {
      console.error(`  ${v.file}:${v.line}: ${v.pattern}`);
      console.error(`    ${v.lineContent}`);
    }
  }

  if (warnings.length > 0) {
    console.warn("\n=== WARNINGS ===");
    for (const v of warnings) {
      console.warn(`  ${v.file}:${v.line}: ${v.pattern}`);
      console.warn(`    ${v.lineContent}`);
    }
  }
}

async function main() {
  const targetDir = process.argv[2] || process.cwd();

  console.log(`Scanning for drift in: ${targetDir}`);

  const violations = await scanForDrift(targetDir);

  if (violations.length === 0) {
    console.log("\n✓ No drift detected.");
    process.exit(0);
  }

  const errors = violations.filter((v) => v.severity === "error").length;
  const warnings = violations.filter((v) => v.severity === "warning").length;

  console.log(`\n✗ Found ${violations.length} drift patterns (${errors} errors, ${warnings} warnings)`);

  printViolations(violations);

  // Exit with error if there are any errors
  process.exit(errors > 0 ? 1 : 0);
}

main().catch(console.error);
