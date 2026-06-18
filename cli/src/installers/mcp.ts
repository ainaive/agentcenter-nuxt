import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";
import { homedir } from "os";
import { dirname, join } from "path";

import { removeDir, writeFilesTo } from "./dir-drop";
import { assertValidSlug } from "./safe-paths";

// MCP installs in two parts: drop the server files into ~/.claude/mcp/{slug}/,
// then register an mcpServers[{key}] entry in the Claude config JSON (the file
// is backed up to .bak first and other servers are preserved). When the run
// command can't be auto-detected, the files are still placed and the user is
// told to register the server themselves.

export function mcpServerDir(): string {
  return join(homedir(), ".claude", "mcp");
}

export function defaultMcpConfigPath(): string {
  return join(homedir(), ".claude", "claude_desktop_config.json");
}

interface ServerCmd {
  command: string;
  args: string[];
}

export async function installMcp(
  slug: string,
  files: Record<string, Uint8Array>,
  opts: { serverDir: string; configPath: string; key: string },
): Promise<string> {
  assertValidSlug(slug);
  await writeFilesTo(opts.serverDir, files);

  const cmd = detectCommand(opts.serverDir, files);
  if (!cmd) {
    console.warn(
      `\nCould not auto-detect the MCP server command for "${slug}". ` +
        `Add an entry under "mcpServers" in ${opts.configPath} pointing at the files in ${opts.serverDir}.`,
    );
    return opts.serverDir;
  }

  mergeMcpServer(opts.configPath, opts.key, cmd);
  return opts.serverDir;
}

function detectCommand(
  serverDir: string,
  files: Record<string, Uint8Array>,
): ServerCmd | null {
  const node = ["server.js", "index.js"].find((f) => files[f]);
  if (node) return { command: "node", args: [join(serverDir, node)] };
  const py = ["server.py", "main.py"].find((f) => files[f]);
  if (py) return { command: "python3", args: [join(serverDir, py)] };
  return null;
}

function readConfig(configPath: string): Record<string, unknown> {
  if (!existsSync(configPath)) return {};
  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function serversOf(config: Record<string, unknown>): Record<string, unknown> {
  const s = config.mcpServers;
  return s && typeof s === "object" ? (s as Record<string, unknown>) : {};
}

function mergeMcpServer(configPath: string, key: string, cmd: ServerCmd): void {
  mkdirSync(dirname(configPath), { recursive: true });
  if (existsSync(configPath)) writeFileSync(`${configPath}.bak`, readFileSync(configPath));

  const config = readConfig(configPath);
  const servers = serversOf(config);
  servers[key] = { command: cmd.command, args: cmd.args };
  config.mcpServers = servers;
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

export function uninstallMcp(slug: string, key: string = slug): boolean {
  assertValidSlug(slug);
  const removedDir = removeDir(join(mcpServerDir(), slug));

  let removedEntry = false;
  const configPath = defaultMcpConfigPath();
  if (existsSync(configPath)) {
    const config = readConfig(configPath);
    const servers = serversOf(config);
    if (key in servers) {
      delete servers[key];
      config.mcpServers = servers;
      writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
      removedEntry = true;
    }
  }
  return removedDir || removedEntry;
}

export function listMcpSlugs(): string[] {
  const dir = mcpServerDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n: string) =>
    statSync(join(dir, n)).isDirectory(),
  );
}
