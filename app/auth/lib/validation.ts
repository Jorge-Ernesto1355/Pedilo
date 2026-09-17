import { z } from "zod";

const normalizedEmail = z
  .string()
  .trim()
  .min(1, "Ingresa tu correo electrónico.")
  .max(254, "Ingresa un correo electrónico válido.")
  .email("Ingresa un correo electrónico válido.")
  .transform((value) => value.toLowerCase());

const password = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(128, "La contraseña es demasiado larga.");

export const recoveryEmailSchema = z.object({
  email: normalizedEmail,
}).strict();

export const verificationCodeSchema = z.object({
  code: z.string()
    .trim()
    .length(6, "Ingresa el código de 6 dígitos.")
    .regex(/^\d{6}$/, "El código debe contener solo números."),
}).strict();

export const resetPasswordSchema = z.object({
  password,
  confirm: z.string().min(1, "Confirma tu contraseña.").max(128, "La contraseña es demasiado larga."),
}).strict().superRefine((values, context) => {
  if (values.password !== values.confirm) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["confirm"], message: "Las contraseñas no coinciden." });
  }
});

export const loginSchema = z.object({
  email: normalizedEmail,
  password: password,
  remember: z.boolean().default(false),
}).strict();

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre completo.").max(100, "El nombre es demasiado largo."),
  email: normalizedEmail,
  password,
  confirm: z.string().min(1, "Confirma tu contraseña.").max(128, "La contraseña es demasiado larga."),
  terms: z.boolean().refine((value) => value, "Debes aceptar los términos para continuar."),
}).strict().superRefine((values, context) => {
  if (values.password !== values.confirm) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["confirm"], message: "Las contraseñas no coinciden." });
  }
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type RecoveryEmailValues = z.infer<typeof recoveryEmailSchema>;
export type VerificationCodeValues = z.infer<typeof verificationCodeSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
