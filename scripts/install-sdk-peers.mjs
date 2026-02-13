import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT_DIR = process.cwd();
const CORE_PKG_PATH = resolve(ROOT_DIR, "packages/core/package.json");
const REQUIRED_PEERS = [
  "@openai/codex-sdk",
  "@anthropic-ai/claude-agent-sdk",
];

function loadPeerSpecs() {
  const pkg = JSON.parse(readFileSync(CORE_PKG_PATH, "utf8"));
  const peers = pkg.peerDependencies ?? {};

  return REQUIRED_PEERS.map((name) => {
    const spec = peers[name];
    if (!spec || typeof spec !== "string") {
      throw new Error(
        `Missing peer dependency spec for ${name} in packages/core/package.json`,
      );
    }
    return `${name}@${spec}`;
  });
}

function run() {
  const sdkSpecs = loadPeerSpecs();
  console.log(`Installing SDK peers: ${sdkSpecs.join(", ")}`);

  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmCmd, ["install", "--no-save", ...sdkSpecs], {
    cwd: ROOT_DIR,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

try {
  run();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`install:sdk-peers failed: ${message}`);
  process.exit(1);
}
