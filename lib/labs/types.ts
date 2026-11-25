import type { Domain, Role } from "@/lib/curriculum";

/** Bounded, deterministic teaching models. These are never real cloud/model calls. */
export type LabParameters = Record<string, number>;
export type LabControl = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
  help: string;
  options?: { value: number; label: string }[];
};
export type LabResult = {
  metrics: { label: string; value: number | string; unit?: string; detail: string }[];
  table: { caption: string; columns: string[]; rows: (number | string)[][] };
  bars?: { title: string; unit: string; items: { label: string; value: number; detail?: string }[] };
  steps: string[];
  insight: string;
};
export type LabPrediction = { prompt: string; choices: string[]; correctIndex: number; explanation: string };
export type LabChallenge = LabPrediction & { id: string; hint: string };
export type LabDefinition = {
  id: string;
  title: string;
  domain: Domain;
  roles: Role[];
  minutes: number;
  summary: string;
  topicIds: string[];
  controls: LabControl[];
  presets: { id: string; label: string; description: string; values: LabParameters }[];
  evaluate: (parameters: LabParameters) => LabResult;
  predict: (parameters: LabParameters) => LabPrediction;
  eli5: { analogy: string; steps: string[]; limit: string };
  senior: {
    principle: string;
    assumptions: string[];
    mechanism: string[];
    tradeoffs: string[];
    failureModes: string[];
    interviewAnswer: string;
  };
  challenges: LabChallenge[];
  transfer: { prompt: string; checklist: string[]; sampleAnswer: string };
  references: { title: string; url: string }[];
};

export function defaultParameters(lab: LabDefinition): LabParameters {
  return Object.fromEntries(lab.controls.map((c) => [c.key, c.defaultValue]));
}

/** Only declared, finite, bounded values enter a calculator or saved experiment. */
export function normalizeParameters(lab: LabDefinition, input: LabParameters): LabParameters {
  return Object.fromEntries(lab.controls.map((c) => {
    const raw = input[c.key];
    let value = Number.isFinite(raw) ? Math.max(c.min, Math.min(c.max, raw!)) : c.defaultValue;
    value = c.min + Math.round((value - c.min) / c.step) * c.step;
    value = Number(Math.max(c.min, Math.min(c.max, value)).toFixed(10));
    if (c.options && !c.options.some((o) => o.value === value)) value = c.defaultValue;
    return [c.key, value];
  }));
}
