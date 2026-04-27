/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import LoaderCircle from "../../components/LoaderCircle";

afterEach(() => {
  cleanup();
});

describe("LoaderCircle", () => {
  it("renders loader shell and text", () => {
    const { container } = render(<LoaderCircle />);

    expect(screen.getByText("Drafting Summary")).not.toBeNull();
    expect(container.querySelector("#loader")).not.toBeNull();
  });
});
