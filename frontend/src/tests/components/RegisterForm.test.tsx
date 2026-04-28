/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RegisterForm from "../../components/RegisterForm";

afterEach(() => {
  cleanup();
});

describe("RegisterForm", () => {
  it("submits normalized email when passwords match", async () => {
    const onRegister = vi.fn().mockResolvedValue(undefined);

    render(
      <RegisterForm
        onRegister={onRegister}
        onSwitchToLogin={vi.fn()}
        isSubmitting={false}
      />
    );

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "   user@example.com   " },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "abc12345" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "abc12345" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(onRegister).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "abc12345",
      });
    });
  });

  it("blocks submit when passwords do not match", () => {
    const onRegister = vi.fn();

    render(
      <RegisterForm
        onRegister={onRegister}
        onSwitchToLogin={vi.fn()}
        isSubmitting={false}
      />
    );

    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "abc12345" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "different" },
    });

    const submitButton = screen.getByRole("button", { name: "Create Account" });
    expect((submitButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Passwords do not match.")).not.toBeNull();

    fireEvent.click(submitButton);
    expect(onRegister).not.toHaveBeenCalled();
  });

  it("shows submitting state and supports switching back to login", () => {
    const onSwitchToLogin = vi.fn();

    render(
      <RegisterForm
        onRegister={vi.fn()}
        onSwitchToLogin={onSwitchToLogin}
        isSubmitting
        errorMessage="Email already exists"
      />
    );

    expect(screen.getByText("Email already exists")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Creating Account..." })).not.toBeNull();
    expect((screen.getByLabelText("Email") as HTMLInputElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(onSwitchToLogin).toHaveBeenCalledTimes(1);
  });
});
