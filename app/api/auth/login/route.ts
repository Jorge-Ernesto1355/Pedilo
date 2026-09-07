import { NextResponse } from "next/server";

import { loginSchema } from "@/app/auth/lib/validation";
import { authenticateAccount } from "@/app/auth/lib/server/store";
import { createSession } from "@/app/auth/lib/server/session";
import { allowAttempt, getClientKey } from "@/app/auth/lib/server/rate-limit";

const genericAuthError = "Correo o contraseña inválidos.";

export async function POST(request: Request) {
  const attempt = allowAttempt(getClientKey(request, "login"));
  if (!attempt.allowed) {
    return NextResponse.json({ error: "Demasiados intentos. Intenta de nuevo más tarde." }, {
      status: 429,
      headers: { "Retry-After": String(attempt.retryAfter) },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Revisa los datos ingresados." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisa los datos ingresados." }, { status: 400 });
  }

  let validCredentials = false;
  try {
    validCredentials = await authenticateAccount(parsed.data.email, parsed.data.password);
  } catch {
    return NextResponse.json({ error: "No se pudo procesar la solicitud." }, { status: 503 });
  }
  if (!validCredentials) {
    return NextResponse.json({ error: genericAuthError }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("pedilo_session", createSession(parsed.data.email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: parsed.data.remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
  });
  return response;
}
