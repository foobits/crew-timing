import { describe, expect, it } from "vitest";
import {
  validateLaneGapInput,
  validateReferenceElapsedInput,
  validateStartTimestampInput,
} from "./field-validation";

describe("validateStartTimestampInput", () => {
  it("accepts empty input while editing", () => {
    expect(validateStartTimestampInput("")).toBeNull();
    expect(validateStartTimestampInput("   ")).toBeNull();
  });

  it("accepts valid timestamps", () => {
    expect(validateStartTimestampInput("13:08:01.491")).toBeNull();
  });

  it("rejects invalid timestamps", () => {
    expect(validateStartTimestampInput("13:08")).toMatch(/HH:MM:SS/i);
  });
});

describe("validateReferenceElapsedInput", () => {
  it("accepts empty input while editing", () => {
    expect(validateReferenceElapsedInput("")).toBeNull();
  });

  it("accepts valid elapsed values", () => {
    expect(validateReferenceElapsedInput("07:23.450")).toBeNull();
    expect(validateReferenceElapsedInput("2.511")).toBeNull();
  });

  it("rejects invalid elapsed values", () => {
    expect(validateReferenceElapsedInput("not-valid")).toBeTruthy();
  });
});

describe("validateLaneGapInput", () => {
  it("accepts empty input while editing", () => {
    expect(validateLaneGapInput("")).toBeNull();
  });

  it("accepts signed and unsigned gaps", () => {
    expect(validateLaneGapInput("2.511")).toBeNull();
    expect(validateLaneGapInput("-0:01.200")).toBeNull();
    expect(validateLaneGapInput("+1:23.450")).toBeNull();
  });

  it("rejects invalid gap values", () => {
    expect(validateLaneGapInput("not-a-gap")).toBeTruthy();
  });
});

describe("typing validation", () => {
  it("allows bare digits without showing an error while typing", () => {
    expect(validateReferenceElapsedInput("7")).toBeNull();
    expect(validateReferenceElapsedInput("72")).toBeNull();
  });
});
