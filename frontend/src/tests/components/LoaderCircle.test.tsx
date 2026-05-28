/* @vitest-environment jsdom */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import LoaderCircle from "../../components/LoaderCircle";

afterEach(() => {
  cleanup();
});

describe("LoaderCircle", () => {
  it("renders the spinner element", () => {
    const { container } = render(<LoaderCircle />);

    expect(container.querySelector("#loader")).not.toBeNull();
  });

  it("appends a custom className to the shell", () => {
    const { container } = render(<LoaderCircle className="custom-loader" />);

    expect(container.querySelector(".loader-shell.custom-loader")).not.toBeNull();
  });
});
