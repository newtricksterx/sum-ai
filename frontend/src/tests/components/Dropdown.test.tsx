/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ChangeEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Dropdown from "../../components/Dropdown";

afterEach(() => {
  cleanup();
});

describe("Dropdown", () => {
  it("renders mapped option labels", () => {
    const onChangeDropdown = vi.fn();

    render(
      <Dropdown
        list={["english", "action-items", "custom-option"]}
        value="english"
        title="Language"
        onChangeDropdown={onChangeDropdown}
      />
    );

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(options[0].textContent).toBe("English");
    expect(options[1].textContent).toBe("Action items");
    expect(options[2].textContent).toBe("Custom Option");
  });

  it("calls onChangeDropdown with the new select value", () => {
    let capturedValue = "";
    const onChangeDropdown = vi.fn((event: ChangeEvent<HTMLSelectElement>) => {
      capturedValue = event.target.value;
    });

    render(
      <Dropdown
        list={["english", "french", "spanish"]}
        value="english"
        title="Language"
        name="language"
        id="language"
        onChangeDropdown={onChangeDropdown}
      />
    );

    const select = screen.getByRole("combobox", { name: "Language" });
    fireEvent.change(select, { target: { value: "french" } });

    expect(onChangeDropdown).toHaveBeenCalledTimes(1);
    expect(capturedValue).toBe("french");
  });
});
