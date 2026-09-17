import { hashPassword, verifyPassword } from "./password";

type Account = {
  passwordHash: string;
  fullname: string;
};

type AuthStore = Map<string, Account>;

const globalStore = globalThis as typeof globalThis & { __pediloAuthStore?: AuthStore };
const accounts = globalStore.__pediloAuthStore ?? new Map<string, Account>();
globalStore.__pediloAuthStore = accounts;

export async function createAccount(input: { email: string; password: string; fullname: string }) {
  if (accounts.has(input.email)) {
    // Keep duplicate-registration timing closer to a new registration.
    await hashPassword(input.password);
    return false;
  }
  accounts.set(input.email, {
    passwordHash: await hashPassword(input.password),
    fullname: input.fullname,
  });
  return true;
}

export async function authenticateAccount(email: string, password: string) {
  const account = accounts.get(email);
  if (!account) return false;
  return verifyPassword(password, account.passwordHash);
}
