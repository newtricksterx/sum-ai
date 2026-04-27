/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LoginForm from "../../components/LoginForm";

afterEach(() => {
  cleanup();
});

describe("LoginForm", () => {
  it("submits trimmed email and password", async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);

    render(
      <LoginForm
        onLogin={onLogin}
        onSwitchToRegister={vi.fn()}
        isSubmitting={false}
      />
    );

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "   user@example.com   " },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "abc123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "abc123",
      });
    });
  });

  it("shows messages and submitting state", () => {
    render(
      <LoginForm
        onLogin={vi.fn()}
        onSwitchToRegister={vi.fn()}
        isSubmitting
        errorMessage="Invalid credentials"
        infoMessage="Account created successfully."
      />
    );

    expect(screen.getByText("Invalid credentials")).not.toBeNull();
    expect(screen.getByText("Account created successfully.")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Signing In..." })).not.toBeNull();

    expect((screen.getByLabelText("Email") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("Password") as HTMLInputElement).disabled).toBe(true);
  });

  it("switches to register mode when register button is clicked", () => {
    const onSwitchToRegister = vi.fn();

    render(
      <LoginForm
        onLogin={vi.fn()}
        onSwitchToRegister={onSwitchToRegister}
        isSubmitting={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Register" }));
    expect(onSwitchToRegister).toHaveBeenCalledTimes(1);
  });
});
