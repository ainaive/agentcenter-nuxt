import { existsSync, mkdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { parse, stringify } from "smol-toml";

const CONFIG_DIR = join(homedir(), ".config", "agentcenter");
const CONFIG_FILE = join(CONFIG_DIR, "config.toml");

export interface Config {
  registry: string;
  agent: string;
  [key: string]: unknown;
}

export const DEFAULT_CONFIG: Config = {
  registry: "https://agentcenter.app",
  agent: "claude",
};

function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
}

export async function loadConfig(): Promise<Config> {
  try {
    const raw = await readFile(CONFIG_FILE, "utf8");
    const parsed = parse(raw) as Record<string, unknown>;
    const merged: Config = { ...DEFAULT_CONFIG, ...parsed };
    if (typeof merged.registry !== "string") merged.registry = DEFAULT_CONFIG.registry;
    if (typeof merged.agent !== "string") merged.agent = DEFAULT_CONFIG.agent;
    return merged;
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    // Treat missing file and malformed TOML as "use defaults"; rethrow everything else
    // (permissions, IO, etc.) so the user sees the actual problem.
    if (code === "ENOENT") return { ...DEFAULT_CONFIG };
    if (error instanceof SyntaxError) return { ...DEFAULT_CONFIG };
    // smol-toml throws TomlError on malformed input; detect by name to avoid coupling to its type.
    if ((error as { name?: string })?.name === "TomlError") return { ...DEFAULT_CONFIG };
    throw error;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  ensureConfigDir();
  await writeFile(CONFIG_FILE, stringify(config as Record<string, unknown>), "utf8");
}

export async function getConfigValue(key: string): Promise<unknown> {
  const config = await loadConfig();
  return config[key];
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  const config = await loadConfig();
  config[key] = value;
  await saveConfig(config);
}
