import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/auth/login/page";
import { ForgotPasswordFlow } from "@/app/auth/forgot-password/page";
import type { PasswordRecoveryClient } from "@/app/auth/lib/client/password-recovery";

function makeClient(overrides: Partial<PasswordRecoveryClient> = {}): PasswordRecoveryClient {
  return {
    requestReset: vi.fn().mockResolvedValue(undefined),
    verifyCode: vi.fn().mockResolvedValue(undefined),
    resendCode: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

async function enterEmail(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/email/i), " owner@example.com ");
  await user.click(screen.getByRole("button", { name: /send verification code/i }));
  await screen.findByRole("heading", { name: /check your email/i });
}

describe("Forgot password frontend flow", () => {
  afterEach(() => vi.useRealTimers());

  it("navigates from Login to /forgot-password", () => {
    render(<LoginPage />);
    expect(screen.getByRole("link", { name: /olvidaste tu contraseña/i })).toHaveAttribute("href", "/forgot-password");
  });

  it("validates the recovery email with Zod before calling the external client", async () => {
    const user = userEvent.setup();
    const client = makeClient();
    render(<ForgotPasswordFlow client={client} />);

    await user.click(screen.getByRole("button", { name: /send verification code/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/correo/i);
    expect(client.requestReset).not.toHaveBeenCalled();
  });

  it("moves to the six-input code step and normalizes the email", async () => {
    const user = userEvent.setup();
    const client = makeClient();
    render(<ForgotPasswordFlow client={client} />);

    await enterEmail(user);
    expect(screen.getByRole("heading", { name: /check your email/i })).toBeInTheDocument();
    expect(client.requestReset).toHaveBeenCalledWith({ email: "owner@example.com" });
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Dígito 1 de 6" })).toHaveFocus());
  });

  it("distributes pasted digits and verifies automatically when complete", async () => {
    const user = userEvent.setup();
    const client = makeClient();
    render(<ForgotPasswordFlow client={client} />);
    await enterEmail(user);

    const firstCodeInput = await screen.findByRole("textbox", { name: "Dígito 1 de 6" });
    fireEvent.paste(firstCodeInput, {
      clipboardData: { getData: () => " 482195 " },
    });

    await waitFor(() => expect(client.verifyCode).toHaveBeenCalledWith({ email: "owner@example.com", code: "482195" }));
    expect(await screen.findByRole("heading", { name: /create a new password/i })).toBeInTheDocument();
  });

  it("handles invalid code safely and returns focus to the first input", async () => {
    const user = userEvent.setup();
    const client = makeClient({ verifyCode: vi.fn().mockRejectedValue({ status: 401, detail: "internal account detail" }) });
    render(<ForgotPasswordFlow client={client} />);
    await enterEmail(user);
    const firstCodeInput = await screen.findByRole("textbox", { name: "Dígito 1 de 6" });
    fireEvent.paste(firstCodeInput, { clipboardData: { getData: () => "482195" } });

    expect(await screen.findByText(/código no es válido/i)).toBeInTheDocument();
    expect(screen.getByText(/código no es válido/i)).not.toHaveTextContent(/internal|account|401/i);
    expect(screen.getByRole("textbox", { name: "Dígito 1 de 6" })).toHaveFocus();
  });

  it("allows a single resend once the cooldown has finished", async () => {
    const user = userEvent.setup();
    const client = makeClient();
    render(<ForgotPasswordFlow client={client} initialCooldownSeconds={0} />);
    await enterEmail(user);

    expect(screen.getByRole("button", { name: /resend code$/i })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /resend code$/i }));
    expect(client.resendCode).toHaveBeenCalledTimes(1);
  });

  it("validates and submits the new password without persisting sensitive data", async () => {
    const user = userEvent.setup();
    const client = makeClient();
    render(<ForgotPasswordFlow client={client} />);
    await enterEmail(user);
    const firstCodeInput = await screen.findByRole("textbox", { name: "Dígito 1 de 6" });
    fireEvent.paste(firstCodeInput, { clipboardData: { getData: () => "482195" } });
    await screen.findByRole("heading", { name: /create a new password/i });

    const newPassword = screen.getAllByLabelText(/new password/i, { selector: "input" }).at(-1)!;
    const confirmation = screen.getAllByLabelText(/confirm password/i, { selector: "input" }).at(-1)!;
    await user.type(newPassword, "Strong-pass-9!");
    await user.type(confirmation, "different-pass");
    await user.click(screen.getByRole("button", { name: /update password/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/no coinciden/i);
    expect(client.resetPassword).not.toHaveBeenCalled();

    await user.clear(confirmation);
    await user.type(confirmation, "Strong-pass-9!");
    await user.click(screen.getByRole("button", { name: /update password/i }));
    expect(await screen.findByRole("heading", { name: /password updated successfully/i })).toBeInTheDocument();
    expect(client.resetPassword).toHaveBeenCalledWith({ email: "owner@example.com", code: "482195", password: "Strong-pass-9!", confirm: "Strong-pass-9!" });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(window.location.search).not.toContain("Strong-pass");
  });
});
