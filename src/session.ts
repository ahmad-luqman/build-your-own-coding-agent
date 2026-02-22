import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SessionFile, SessionListEntry, SessionMetadata, SessionState } from "./types.js";

const DEFAULT_MAX_SESSIONS = 20;

export async function ensureSessionsDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "_",
    pad(date.getHours()),
    "-",
    pad(date.getMinutes()),
    "-",
    pad(date.getSeconds()),
  ].join("");
}

interface SaveOptions {
  name?: string;
  modelId: string;
  cwd: string;
}

export async function saveSession(
  dir: string,
  state: SessionState,
  opts: SaveOptions,
): Promise<string> {
  if (state.messages.length === 0) {
    throw new Error("Cannot save an empty session");
  }

  await ensureSessionsDir(dir);

  const now = new Date();
  const filename = `${formatTimestamp(now)}.json`;
  const filepath = join(dir, filename);

  const metadata: SessionMetadata = {
    id: crypto.randomUUID(),
    name: opts.name ?? `Session ${formatTimestamp(now)}`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    modelId: opts.modelId,
    messageCount: state.displayMessages.length,
    cwd: opts.cwd,
  };

  const sessionFile: SessionFile = {
    version: 1,
    metadata,
    state,
  };

  await writeFile(filepath, JSON.stringify(sessionFile, null, 2), "utf-8");
  await pruneOldSessions(dir);

  return filename;
}

export async function loadSession(dir: string, filename: string): Promise<SessionFile> {
  const filepath = join(dir, filename);
  const raw = await readFile(filepath, "utf-8");

  const parsed = JSON.parse(raw);
  if (!parsed || parsed.version !== 1 || !parsed.metadata || !parsed.state) {
    throw new Error(`Invalid session file: ${filename}`);
  }

  return parsed as SessionFile;
}

export async function listSessions(dir: string): Promise<SessionListEntry[]> {
  await ensureSessionsDir(dir);

  const files = await readdir(dir);
  const jsonFiles = files
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();

  const entries: SessionListEntry[] = [];
  for (const filename of jsonFiles) {
    try {
      const raw = await readFile(join(dir, filename), "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed?.version === 1 && parsed.metadata) {
        entries.push({ ...parsed.metadata, filename });
      }
    } catch {
      // Skip corrupt files silently
    }
  }

  return entries;
}

export async function getMostRecentSession(dir: string): Promise<SessionListEntry | null> {
  const sessions = await listSessions(dir);
  return sessions[0] ?? null;
}

export async function pruneOldSessions(
  dir: string,
  max: number = DEFAULT_MAX_SESSIONS,
): Promise<void> {
  const files = await readdir(dir);
  const jsonFiles = files.filter((f) => f.endsWith(".json")).sort();

  if (jsonFiles.length <= max) return;

  const toDelete = jsonFiles.slice(0, jsonFiles.length - max);
  for (const filename of toDelete) {
    await unlink(join(dir, filename));
  }
}
