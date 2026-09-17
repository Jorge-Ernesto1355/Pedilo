import { isAxiosError } from "@/src/lib/api/client";

export type ApiFieldErrors = Record<string, string[]>;

export type BackendErrorBody = {
  error?:
    | {
        code?: unknown;
        message?: unknown;
        formErrors?: unknown;
        fieldErrors?: unknown;
        details?: unknown;
        fields?: unknown;
      }
    | string
    | Array<{ path?: unknown; message?: unknown }>;
};

export class ApiError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly fieldErrors: ApiFieldErrors;

  constructor({
    message,
    status,
    code,
    fieldErrors = {},
  }: {
    message: string;
    status?: number;
    code?: string;
    fieldErrors?: ApiFieldErrors;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readFieldErrors(value: unknown): ApiFieldErrors {
  if (!value || typeof value !== "object") return {};

  if (Array.isArray(value)) {
    return value.reduce<ApiFieldErrors>((result, issue) => {
      if (!issue || typeof issue !== "object") return result;
      const path = Array.isArray(issue.path) ? issue.path.join(".") : asString(issue.path);
      const message = asString(issue.message);
      if (path && message) result[path] = [...(result[path] ?? []), message];
      return result;
    }, {});
  }

  return Object.entries(value).reduce<ApiFieldErrors>((result, [field, messages]) => {
    const normalized = Array.isArray(messages)
      ? messages.filter((message): message is string => typeof message === "string")
      : typeof messages === "string"
        ? [messages]
        : [];
    if (normalized.length) result[field] = normalized;
    return result;
  }, {});
}

function getBody(error: unknown): BackendErrorBody | undefined {
  if (!isAxiosError(error) || !error.response?.data || typeof error.response.data !== "object") {
    return undefined;
  }
  return error.response.data as BackendErrorBody;
}

export function normalizeApiError(error: unknown): ApiError {
  if (!isAxiosError(error)) {
    return new ApiError({ message: "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo." });
  }

  const body = getBody(error);
  const payload = body?.error;
  const objectPayload = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : undefined;
  const code = objectPayload ? asString(objectPayload.code) : undefined;
  const fieldErrors = objectPayload
    ? readFieldErrors(objectPayload.fieldErrors ?? objectPayload.fields ?? objectPayload.details)
    : Array.isArray(payload)
      ? readFieldErrors(payload)
      : {};

  return new ApiError({
    status: error.response?.status,
    code,
    message: objectPayload
      ? asString(objectPayload.message) ?? "No se pudo completar la solicitud."
      : asString(payload) ?? "No se pudo completar la solicitud.",
    fieldErrors,
  });
}
