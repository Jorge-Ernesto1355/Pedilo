import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "@/app/auth/login/page";

const fetchMock = vi.fn();

function response(status: number, body: unknown = {}) {
  return { ok: status >= 200 && status < 300, status, json: vi.fn().mockResolvedValue(body) };
}

describe("Login frontend", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  it("renders accessible controls and submits normalized credentials", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(response(200, { success: true }));
    render(<LoginPage />);

    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^contraseña$/i, { selector: "input" })).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeEnabled();

    await user.type(screen.getByLabelText(/correo electrónico/i), " OWNER@EXAMPLE.COM ");
    await user.type(screen.getByLabelText(/^contraseña$/i, { selector: "input" }), "correct-horse");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => expect(screen.getByText(/sesión iniciada/i)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ email: "owner@example.com", password: "correct-horse", remember: false }),
    }));
  });

  it("rejects invalid fields without contacting the backend", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(await screen.findByText(/ingresa tu correo/i)).toBeInTheDocument();
    expect(await screen.findByText(/al menos 8 caracteres/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits with Enter and prevents rapid duplicate submissions", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(() => new Promise(() => undefined));
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/correo electrónico/i), "owner@example.com");
    await user.type(screen.getByLabelText(/^contraseña$/i, { selector: "input" }), "correct-horse");
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeDisabled();
  });

  it("shows a safe message for backend authentication failures", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(response(401, { error: "User found in database" }));
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/correo electrónico/i), "owner@example.com");
    await user.type(screen.getByLabelText(/^contraseña$/i, { selector: "input" }), "wrong-pass");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Correo o contraseña inválidos.");
    expect(screen.queryByText(/database|user found/i)).not.toBeInTheDocument();
  });

  it("shows a safe network error and restores the form", async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch: secret backend details"));
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/correo electrónico/i), "owner@example.com");
    await user.type(screen.getByLabelText(/^contraseña$/i, { selector: "input" }), "correct-horse");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pudo conectar/i);
    expect(screen.queryByText(/secret backend/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeEnabled();
  });

  it("toggles password visibility without persisting credentials", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const password = screen.getByLabelText(/^contraseña$/i, { selector: "input" });
    await user.type(password, "correct-horse");
    await user.click(screen.getByRole("button", { name: /mostrar contraseña/i }));

    expect(password).toHaveAttribute("type", "text");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(window.location.href).not.toContain("correct-horse");
  });

  it("keeps registration and forgot-password actions as links", () => {
    render(<LoginPage />);
    expect(screen.getAllByRole("link", { name: /crea una cuenta/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /olvidaste tu contraseña/i })).toBeInTheDocument();
  });
});
