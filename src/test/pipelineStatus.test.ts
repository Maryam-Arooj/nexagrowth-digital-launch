import { describe, it, expect } from "vitest";
import { applyPipelineStageEvent, splitNdjsonLines, type PipelineStageState } from "@/components/PipelineStatus";

const STAGES: PipelineStageState[] = [
  { id: "business-analyst", label: "Business Analyst", status: "pending" },
  { id: "lead-scorer", label: "Lead Scorer", status: "pending" },
  { id: "competitor-analyst", label: "Competitor Analyst", status: "pending" },
];

describe("applyPipelineStageEvent", () => {
  it("transitions the matching stage to running", () => {
    const next = applyPipelineStageEvent(STAGES, { type: "stage", stage: "business-analyst", status: "running" });
    expect(next.find((s) => s.id === "business-analyst")?.status).toBe("running");
    expect(next.find((s) => s.id === "lead-scorer")?.status).toBe("pending");
  });

  it("transitions the matching stage to done and records duration", () => {
    const next = applyPipelineStageEvent(STAGES, { type: "stage", stage: "lead-scorer", status: "done", durationMs: 42 });
    const stage = next.find((s) => s.id === "lead-scorer");
    expect(stage?.status).toBe("done");
    expect(stage?.durationMs).toBe(42);
  });

  it("transitions the matching stage to failed and records the error", () => {
    const next = applyPipelineStageEvent(STAGES, { type: "stage", stage: "competitor-analyst", status: "failed", error: "AI rate limit reached" });
    const stage = next.find((s) => s.id === "competitor-analyst");
    expect(stage?.status).toBe("failed");
    expect(stage?.error).toBe("AI rate limit reached");
  });

  it("does not mutate the input array", () => {
    const next = applyPipelineStageEvent(STAGES, { type: "stage", stage: "business-analyst", status: "running" });
    expect(next).not.toBe(STAGES);
    expect(STAGES.find((s) => s.id === "business-analyst")?.status).toBe("pending");
  });

  it("ignores non-stage events", () => {
    const next = applyPipelineStageEvent(STAGES, { type: "final", report: {} });
    expect(next).toEqual(STAGES);
  });

  it("ignores malformed stage events missing a stage id or status", () => {
    expect(applyPipelineStageEvent(STAGES, { type: "stage" })).toEqual(STAGES);
    expect(applyPipelineStageEvent(STAGES, { type: "stage", stage: "lead-scorer" })).toEqual(STAGES);
  });

  it("leaves the list unchanged if the event references an unknown stage id", () => {
    const next = applyPipelineStageEvent(STAGES, { type: "stage", stage: "unknown-stage", status: "done" });
    expect(next).toEqual(STAGES);
  });
});

describe("splitNdjsonLines", () => {
  it("splits complete lines and keeps the trailing partial line as remainder", () => {
    const { lines, remainder } = splitNdjsonLines('{"a":1}\n{"b":2}\n{"c":3');
    expect(lines).toEqual(['{"a":1}', '{"b":2}']);
    expect(remainder).toBe('{"c":3');
  });

  it("returns no complete lines when the buffer has no newline yet", () => {
    const { lines, remainder } = splitNdjsonLines('{"a":1');
    expect(lines).toEqual([]);
    expect(remainder).toBe('{"a":1');
  });

  it("skips blank lines", () => {
    const { lines, remainder } = splitNdjsonLines('{"a":1}\n\n{"b":2}\n');
    expect(lines).toEqual(['{"a":1}', '{"b":2}']);
    expect(remainder).toBe("");
  });
});
