import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RegisterPage from "@/app/auth/register/page";

const fetchMock = vi.fn();

function response(status: number, body: unknown = {}) {
  return { ok: status >= 200 && status < 300, status, json: vi.fn().mockResolvedValue(body) };
}

async function fillValidRegistration(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/nombre completo/i), "Ana López");
  await user.type(screen.getByLabelText(/nombre del negocio/i), "La Esquina");
  await user.type(screen.getByLabelText(/correo electrónico/i), " OWNER@EXAMPLE.COM ");
  await user.type(screen.getByLabelText(/^contraseña$/i), "correct-horse-7");
  await user.type(screen.getByLabelText(/confirmar contraseña/i), "correct-horse-7");
  await user.click(screen.getByRole("checkbox"));
}

describe("Register frontend", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  it("renders accessible fields and submits without password confirmation", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(response(200, { success: true }));
    render(<RegisterPage />);
    await fillValidRegistration(user);
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() => expect(screen.getByText(/cuenta creada/i)).toBeInTheDocument());
    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request).toEqual({ fullname: "Ana López", business: "La Esquina", email: "owner@example.com", password: "correct-horse-7", terms: true });
    expect(request.confirm).toBeUndefined();
  });

  it("reports all invalid required fields and does not submit", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(await screen.findByText(/por favor ingresa tu nombre completo/i)).toBeInTheDocument();
    expect(await screen.findByText(/por favor ingresa el nombre de tu negocio/i)).toBeInTheDocument();
    expect(await screen.findByText(/correo válido/i)).toBeInTheDocument();
    expect(await screen.findByText(/al menos 8 caracteres/i)).toBeInTheDocument();
    expect(await screen.findByText(/contraseñas no coinciden/i)).toBeInTheDocument();
    expect(await screen.findByText(/debes aceptar los términos/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords and unchecked terms", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.type(screen.getByLabelText(/nombre completo/i), "Ana López");
    await user.type(screen.getByLabelText(/nombre del negocio/i), "La Esquina");
    await user.type(screen.getByLabelText(/correo electrónico/i), "owner@example.com");
    await user.type(screen.getByLabelText(/^contraseña$/i), "correct-horse-7");
    await user.type(screen.getByLabelText(/confirmar contraseña/i), "different-password");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(await screen.findByText(/contraseñas no coinciden/i)).toBeInTheDocument();
    expect(await screen.findByText(/debes aceptar los términos/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prevents duplicate submissions while loading", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(() => new Promise(() => undefined));
    render(<RegisterPage />);
    await fillValidRegistration(user);
    const submit = screen.getByRole("button", { name: /crear cuenta/i });
    await user.click(submit);
    await user.click(submit);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();
  });

  it.each([
    ["duplicate account", 409, "Email already exists in database"],
    ["unauthorized", 401, "token=secret"],
    ["server error", 500, "Stack trace: password=secret"],
  ])("does not expose %s backend details", async (_label, status, backendError) => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(response(status, { error: backendError }));
    render(<RegisterPage />);
    await fillValidRegistration(user);
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).not.toContain(backendError);
    expect(alert.textContent).not.toMatch(/database|stack trace|token|password/i);
    expect(screen.getByRole("button", { name: /crear cuenta/i })).toBeEnabled();
  });

  it("shows a safe network error and restores the form", async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValue(new TypeError("backend timeout with secret"));
    render(<RegisterPage />);
    await fillValidRegistration(user);
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pudo conectar/i);
    expect(screen.queryByText(/backend timeout/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crear cuenta/i })).toBeEnabled();
  });

  it("exposes password strength feedback without persisting the password", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    const password = screen.getByLabelText(/^contraseña$/i);
    await user.type(password, "abc12345");

    expect(screen.getByText(/seguridad de la contraseña/i)).toBeInTheDocument();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(document.body.textContent).not.toContain("abc12345");
  });

  it("provides a keyboard-accessible terms checkbox and login link", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getAllByRole("link", { name: /iniciar sesión/i }).length).toBeGreaterThan(0);
  });
});
