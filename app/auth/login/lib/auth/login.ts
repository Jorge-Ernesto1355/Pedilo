import type { LoginFormValues } from "@/lib/validations/auth";

export interface LoginResult {
  success: true;
  // Placeholder hasta que el backend defina el contrato real.
  token: string;
}

export class LoginError extends Error {}

/**
 * Simula la llamada de autenticación.
 *
 * Cuando el backend esté listo, sustituye el cuerpo de esta función por
 * la llamada real (por ejemplo `fetch("/api/auth/login", { method: "POST", body: ... })`
 * o el cliente que uses con Better Auth). La forma de retorno (`LoginResult`)
 * y el tipo de error (`LoginError`) se mantienen para no tener que tocar
 * `LoginForm.tsx` al conectar la API real.
 */
export async function loginUser(
  credentials: Pick<LoginFormValues, "email" | "password">
): Promise<LoginResult> {
  await new Promise((resolve) => setTimeout(resolve, 900));

  // Credencial de prueba para poder ver el estado de error en la UI:
  // usa "error@demo.com" con cualquier contraseña.
  if (credentials.email.trim().toLowerCase() === "error@demo.com") {
    throw new LoginError("Correo o contraseña incorrectos.");
  }

  return { success: true, token: "mock-token" };
}
