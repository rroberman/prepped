import { describe, it, expect } from "vitest";
import { parseScoreTag, computeAdaptiveShift } from "../interviewer";

describe("parseScoreTag", () => {
  it("extracts score from valid tag", () => {
    const result = parseScoreTag("Tell me about your experience.\n[SCORE:7]");
    expect(result.text).toBe("Tell me about your experience.");
    expect(result.score).toBe(7);
  });

  it("handles score at end without newline", () => {
    const result = parseScoreTag("Good answer.[SCORE:9]");
    expect(result.text).toBe("Good answer.");
    expect(result.score).toBe(9);
  });

  it("returns null score when no tag present", () => {
    const result = parseScoreTag("Just a normal response with no score.");
    expect(result.text).toBe("Just a normal response with no score.");
    expect(result.score).toBeNull();
  });

  it("clamps score to max 10", () => {
    const result = parseScoreTag("Response\n[SCORE:15]");
    expect(result.score).toBe(10);
  });

  it("clamps score to min 1", () => {
    const result = parseScoreTag("Response\n[SCORE:0]");
    expect(result.score).toBe(1);
  });

  it("handles trailing whitespace after tag", () => {
    const result = parseScoreTag("Response\n[SCORE:6]  \n");
    expect(result.text).toBe("Response");
    expect(result.score).toBe(6);
  });

  it("handles multiline response with score at end", () => {
    const content = "First paragraph.\n\nSecond paragraph.\n\n[SCORE:8]";
    const result = parseScoreTag(content);
    expect(result.text).toBe("First paragraph.\n\nSecond paragraph.");
    expect(result.score).toBe(8);
  });
});

describe("computeAdaptiveShift", () => {
  it("returns null when fewer than 3 scores", () => {
    expect(computeAdaptiveShift([8, 9], "realistic")).toBeNull();
    expect(computeAdaptiveShift([], "realistic")).toBeNull();
    expect(computeAdaptiveShift([5], "realistic")).toBeNull();
  });

  it("escalates when average >= 8", () => {
    expect(computeAdaptiveShift([8, 9, 8], "realistic")).toBe("tough");
    expect(computeAdaptiveShift([8, 8, 8], "friendly")).toBe("realistic");
  });

  it("de-escalates when average <= 3", () => {
    expect(computeAdaptiveShift([2, 3, 2], "realistic")).toBe("friendly");
    expect(computeAdaptiveShift([1, 3, 3], "tough")).toBe("realistic");
  });

  it("returns null when scores are in the middle range", () => {
    expect(computeAdaptiveShift([5, 6, 5], "realistic")).toBeNull();
    expect(computeAdaptiveShift([7, 7, 7], "realistic")).toBeNull();
  });

  it("does not escalate beyond tough", () => {
    expect(computeAdaptiveShift([9, 10, 9], "tough")).toBeNull();
  });

  it("does not de-escalate below friendly", () => {
    expect(computeAdaptiveShift([1, 1, 1], "friendly")).toBeNull();
  });

  it("uses only the last 3 scores", () => {
    // Earlier scores are low but last 3 are high
    expect(computeAdaptiveShift([1, 2, 1, 9, 8, 9], "realistic")).toBe("tough");
  });

  it("shifts only one level at a time", () => {
    // Even with very high scores, friendly only goes to realistic
    expect(computeAdaptiveShift([10, 10, 10], "friendly")).toBe("realistic");
    // Even with very low scores, tough only goes to realistic
    expect(computeAdaptiveShift([1, 1, 1], "tough")).toBe("realistic");
  });
});
