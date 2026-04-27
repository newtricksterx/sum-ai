/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Button from "../../components/Button";

afterEach(() => {
  cleanup();
});

describe("Button", () => {
  it("renders children and forwards attributes", () => {
    render(
      <Button className="my-class" title="my-title">
        Child Label
      </Button>
    );

    const button = screen.getByRole("button", { name: "Child Label" });
    expect(button.getAttribute("title")).toBe("my-title");
    expect(button.className).toContain("my-class");
    expect(button.className).toContain("cursor-pointer");
  });

  it("forwards refs to the underlying button element", () => {
    const buttonRef = createRef<HTMLButtonElement>();

    render(<Button ref={buttonRef}>Ref Button</Button>);

    expect(buttonRef.current).not.toBeNull();
    expect(buttonRef.current?.tagName).toBe("BUTTON");
    expect(buttonRef.current?.textContent).toBe("Ref Button");
  });

  it("calls onClick when enabled", () => {
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Click Me</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Click Me" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("stays disabled and does not include hover utility class when disabled", () => {
    const onClick = vi.fn();

    render(
      <Button disabled onClick={onClick}>
        Disabled Button
      </Button>
    );

    const button = screen.getByRole("button", { name: "Disabled Button" });
    fireEvent.click(button);

    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.className).not.toContain("cursor-pointer");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("makes changes to a value when clicked", () => {
    let number = 0
    
    const onClick = vi.fn(() => {
      number = number + 1
    })

    render (
      <Button onClick={onClick}>
        Click Me
      </Button>
    );

    const button = screen.getByRole("button", {name: "Click Me"});
    fireEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(number).toBe(1)

    fireEvent.click(button)
    
    expect(onClick).toHaveBeenCalledTimes(2)
    expect(number).toBe(2)

  })
});
