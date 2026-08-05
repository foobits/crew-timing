import { describe, expect, it } from "vitest";
import { formatBuildLabel } from "./build-info";

describe("build info", () => {
  it("formats a version and build date label", () => {
    expect(formatBuildLabel()).toMatch(/^v\d+\.\d+\.\d+ · \d{4}-\d{2}-\d{2}$/);
  });
});
