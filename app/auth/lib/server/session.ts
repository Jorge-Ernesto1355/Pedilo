import { randomBytes } from "node:crypto";

type SessionStore = Map<string, string>;
const globalStore = globalThis as typeof globalThis & { __pediloSessionStore?: SessionStore };
const sessions = globalStore.__pediloSessionStore ?? new Map<string, string>();
globalStore.__pediloSessionStore = sessions;

export function createSession(email: string) {
  const sessionId = randomBytes(32).toString("base64url");
  sessions.set(sessionId, email);
  return sessionId;
}
