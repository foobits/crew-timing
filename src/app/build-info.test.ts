import { describe, expect, it } from "vitest";
import { formatBuildLabel } from "./build-info";
import { resolveAppVersion } from "./resolve-app-version";

describe("resolveAppVersion", () => {
  it("appends the CI build number as patch for production builds", () => {
    expect(resolveAppVersion("1.0.0", "42")).toBe("1.0.42");
    expect(resolveAppVersion("2.3.9", "100")).toBe("2.3.100");
  });

  it("uses a dev suffix when no build number is set", () => {
    expect(resolveAppVersion("1.0.0")).toBe("1.0.0-dev");
  });
});

describe("formatBuildLabel", () => {
  it("formats a version and build date label", () => {
    expect(formatBuildLabel()).toMatch(/^v[\d.]+(?:-dev)? · \d{4}-\d{2}-\d{2}$/);
  });
});
