import type { AuthRecord } from "./types";

const AUTH_KEY = "brainspot_auth_v1";

// WARNING: Passwords are stored in plaintext. This is intentional for an
// internal dev-only tool. Do NOT use this approach in a production system —
// replace with a server-side auth solution before any public deployment.
const PASSWORDS_KEY = "brainspot_passwords_v1";

export function loadAuth(): AuthRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthRecord;
  } catch {
    return null;
  }
}

export function saveAuth(auth: AuthRecord): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  } catch {
    // ignore quota / security errors
  }
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch {
    // ignore
  }
}

export function loadPasswords(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PASSWORDS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function savePasswords(passwords: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PASSWORDS_KEY, JSON.stringify(passwords));
  } catch {
    // ignore
  }
}

export function setPassword(employeeId: string, password: string): void {
  const passwords = loadPasswords();
  passwords[employeeId] = password;
  savePasswords(passwords);
}

export function checkPassword(employeeId: string, password: string): boolean {
  const passwords = loadPasswords();
  return passwords[employeeId] === password;
}
