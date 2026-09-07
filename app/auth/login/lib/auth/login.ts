import type { LoginFormValues } from "../validations/auth";
import { authenticateAccount } from "../../../lib/server/store";

export interface LoginResult {
  success: true;
}

export class LoginError extends Error {}

/**
 * Server-side credential check used by the authentication boundary.
 */
export async function loginUser(
  credentials: Pick<LoginFormValues, "email" | "password">
): Promise<LoginResult> {
  const validCredentials = await authenticateAccount(credentials.email, credentials.password);
  if (!validCredentials) throw new LoginError("Invalid credentials");
  return { success: true };
}
