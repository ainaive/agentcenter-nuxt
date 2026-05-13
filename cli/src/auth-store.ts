import { existsSync, mkdirSync } from "fs";
import { chmod, readFile, writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

const CONFIG_DIR = join(homedir(), ".config", "agentcenter");
const CREDS_FILE = join(CONFIG_DIR, "credentials.json");

export interface Credentials {
  token: string;
  userId: string;
  email: string;
  name: string | null;
}

function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
}

function isCredentials(value: unknown): value is Credentials {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.token === "string" &&
    typeof v.userId === "string" &&
    typeof v.email === "string" &&
    (typeof v.name === "string" || v.name === null)
  );
}

export async function loadCredentials(): Promise<Credentials | null> {
  try {
    const raw = await readFile(CREDS_FILE, "utf8");
    if (raw.trim() === "") return null;
    const parsed: unknown = JSON.parse(raw);
    return isCredentials(parsed) ? parsed : null;
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === "ENOENT" || error instanceof SyntaxError) return null;
    throw error;
  }
}

export async function saveCredentials(creds: Credentials): Promise<void> {
  ensureConfigDir();
  await writeFile(CREDS_FILE, JSON.stringify(creds, null, 2), "utf8");
  await chmod(CREDS_FILE, 0o600);
}

export async function clearCredentials(): Promise<void> {
  try {
    await writeFile(CREDS_FILE, "", "utf8");
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === "ENOENT") return;
    throw error;
  }
}
