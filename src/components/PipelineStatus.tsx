import { CheckCircle2, Loader2, XCircle, Circle } from "lucide-react";
import { motion } from "framer-motion";

export type PipelineStageStatus = "pending" | "running" | "done" | "failed";

export interface PipelineStageState {
  id: string;
  label: string;
  status: PipelineStageStatus;
  durationMs?: number;
  error?: string;
}

export interface PipelineStageEvent {
  type: string;
  stage?: string;
  status?: string;
  durationMs?: number;
  error?: string;
  report?: unknown;
}

/** Pure reducer: applies one streamed stage-status event onto the current stage list.
 * Unknown/malformed events (missing stage or status) are ignored rather than thrown,
 * since a single bad line in an otherwise-good stream shouldn't abort the pipeline UI. */
export function applyPipelineStageEvent(stages: PipelineStageState[], event: PipelineStageEvent): PipelineStageState[] {
  if (event.type !== "stage" || !event.stage || !event.status) return stages;
  const status = event.status as PipelineStageStatus;
  return stages.map((s) => (s.id === event.stage ? { ...s, status, durationMs: event.durationMs, error: event.error } : s));
}

/** Splits a growing NDJSON buffer into complete lines plus the trailing partial line
 * (which may not have arrived in full yet and should be prepended to the next chunk). */
export function splitNdjsonLines(buffer: string): { lines: string[]; remainder: string } {
  const parts = buffer.split("\n");
  const remainder = parts.pop() ?? "";
  return { lines: parts.filter((l) => l.trim().length > 0), remainder };
}

const STATUS_STYLES: Record<PipelineStageStatus, string> = {
  pending: "border-border bg-secondary/20",
  running: "border-primary/40 bg-primary/5",
  done: "border-green-500/30 bg-green-500/5",
  failed: "border-red-500/40 bg-red-500/5",
};

const StatusIcon = ({ status }: { status: PipelineStageStatus }) => {
  if (status === "done") return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
  if (status === "running") return <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
  return <Circle className="w-4 h-4 text-muted-foreground shrink-0" />;
};

const StatusLabel = ({ stage }: { stage: PipelineStageState }) => {
  if (stage.status === "done") return <span className="text-green-500">{stage.durationMs != null ? `${(stage.durationMs / 1000).toFixed(1)}s` : "Completed"}</span>;
  if (stage.status === "running") return <span className="text-primary">Running…</span>;
  if (stage.status === "failed") return <span className="text-red-500">Failed</span>;
  return <span className="text-muted-foreground">Pending</span>;
};

/**
 * Visible per-stage status list for the 6-stage marketing-report automation pipeline.
 * Each stage independently transitions pending -> running -> done (or failed) as the
 * backend streams stage-status events — this replaces a generic "Analyzing..." spinner.
 */
export const PipelineStatus = ({ stages, title, subtitle }: { stages: PipelineStageState[]; title?: string; subtitle?: string }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 md:p-10">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-accent blur-2xl opacity-50 animate-pulse" />
        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      </div>
      <h3 className="text-xl font-heading font-semibold mb-1">{title ?? "Running the AI Employee Pipeline"}</h3>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
        {subtitle ?? "Six automated stages run in sequence — watch each one complete below."}
      </p>
      <div className="w-full max-w-md space-y-2" data-testid="pipeline-stage-list">
        {stages.map((s) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${STATUS_STYLES[s.status]}`}
            data-testid={`pipeline-stage-${s.id}`}
            data-status={s.status}
          >
            <span className="flex items-center gap-2 font-medium">
              <StatusIcon status={s.status} />
              {s.label}
            </span>
            <span className="text-xs">
              <StatusLabel stage={s} />
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PipelineStatus;
