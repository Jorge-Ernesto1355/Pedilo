export function safeAuthError(status: number, context: "login" | "register") {
  if (status === 400) return "Revisa los datos ingresados.";
  if (status === 401 && context === "login") return "Correo o contraseña inválidos.";
  if (status === 429) return "Demasiados intentos. Intenta de nuevo más tarde.";
  return context === "login"
    ? "No se pudo iniciar sesión. Intenta de nuevo."
    : "No se pudo crear la cuenta. Intenta de nuevo.";
}

export const networkAuthError = "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.";

export type RecoveryPhase = "request" | "verify" | "resend" | "reset";

export function safeRecoveryError(status: number | undefined, phase: RecoveryPhase) {
  if (status === 429) return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
  if (status === 410) return "Este código expiró. Solicita uno nuevo para continuar.";
  if (phase === "verify" && (status === 400 || status === 401)) return "El código no es válido. Revísalo e inténtalo de nuevo.";
  if (phase === "reset" && status === 400) return "No se pudo actualizar la contraseña. Revisa los datos e inténtalo de nuevo.";
  return "No se pudo completar la recuperación. Inténtalo de nuevo.";
}

export function getRecoveryError(error: unknown, phase: RecoveryPhase) {
  if (error instanceof Error && error.name === "RecoveryIntegrationPendingError") {
    return "La recuperación estará disponible cuando se conecte el servicio de autenticación.";
  }
  const status = typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
    ? error.status
    : undefined;
  return status === undefined ? networkAuthError : safeRecoveryError(status, phase);
}
