import type {
  RecoveryEmailValues,
  ResetPasswordValues,
  VerificationCodeValues,
} from "@/app/auth/lib/validation";

/**
 * Adapter boundary for the external authentication backend.
 *
 * The backend contract is intentionally not assumed here. The integration
 * layer should map its own transport and response format to these methods and
 * resolve on success or reject with an optional `{ status }` error.
 */
export interface PasswordRecoveryClient {
  requestReset(values: RecoveryEmailValues): Promise<void>;
  verifyCode(values: VerificationCodeValues & { email: string }): Promise<void>;
  resendCode(values: RecoveryEmailValues): Promise<void>;
  resetPassword(values: ResetPasswordValues & { email: string; code: string }): Promise<void>;
}

export class RecoveryIntegrationPendingError extends Error {
  constructor() {
    super("Password recovery backend integration is pending.");
    this.name = "RecoveryIntegrationPendingError";
  }
}

export const unavailableRecoveryClient: PasswordRecoveryClient = {
  requestReset: async () => { throw new RecoveryIntegrationPendingError(); },
  verifyCode: async () => { throw new RecoveryIntegrationPendingError(); },
  resendCode: async () => { throw new RecoveryIntegrationPendingError(); },
  resetPassword: async () => { throw new RecoveryIntegrationPendingError(); },
};
