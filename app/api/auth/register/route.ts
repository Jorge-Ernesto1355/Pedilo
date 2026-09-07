import { NextResponse } from "next/server";

import { registerSchema } from "@/app/auth/lib/validation";
import { createAccount } from "@/app/auth/lib/server/store";
import { allowAttempt, getClientKey } from "@/app/auth/lib/server/rate-limit";

export async function POST(request: Request) {
  const attempt = allowAttempt(getClientKey(request, "register"));
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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisa los datos ingresados." }, { status: 400 });
  }

  const { email, password, fullname, business } = parsed.data;
  try {
    await createAccount({ email, password, fullname, business });
  } catch {
    return NextResponse.json({ error: "No se pudo procesar la solicitud." }, { status: 503 });
  }

  // Keep duplicate-registration responses indistinguishable from successful ones.
  return NextResponse.json({ success: true, message: "Solicitud procesada." });
}
