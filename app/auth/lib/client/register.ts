import { apiClient } from "@/src/lib/api/client";
import type { RegisterFormValues } from "@/app/auth/lib/validation";
import { normalizeApiError } from "./api-error";

export type RegisterPayload = Omit<RegisterFormValues, "confirm">;

export type RegisterResponse = {
  success: true;
  message?: string;
};

export async function registerUser(payload: RegisterPayload): Promise<RegisterResponse> {
  try {
    const { data } = await apiClient.post<RegisterResponse>("/auth/register", payload);
    return data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}
