import type { Role } from "@/lib/curriculum";

/** Roles added to existing topics, for example the data analyst track. Merged by content/raw.ts. */
export const ROLE_PATCHES: Record<string, Role[]> = {
  "w01-d01-python-r-idioms": ["data-analyst"],
  "w01-d03-testing-reproducibility": ["data-analyst"],
  "w02-d01-joins-and-keys": ["data-analyst"],
  "w02-d02-window-functions": ["data-analyst"],
  "w02-d03-scd2-dimensions": ["data-analyst"],
  "w05-d01-probability-distributions": ["data-analyst"],
  "w05-d02-hypothesis-testing": ["data-analyst"],
  "w05-d03-ab-test-power": ["data-analyst"],
  "w05-d04-bayesian-ab": ["data-analyst"],
  "w06-d01-data-quality-eda": ["data-analyst"],
  "w06-d02-metrics-funnels": ["data-analyst"],
  "w06-d03-cohort-retention": ["data-analyst"],
  "w07-d03-classification-metrics": ["data-analyst"],
  "w08-d01-clustering-pca": ["data-analyst"],
  "w08-d02-anomaly-forecasting": ["data-analyst"],
  "w08-d03-causal-inference": ["data-analyst"],
  "w11-d04-data-quality-orchestration": ["data-analyst"],
  "w16-d01-capstone-scoping": ["data-analyst"],
  "w16-d02-behavioral-star": ["data-analyst"],
  "w16-d03-remediation-planning": ["data-analyst"],
};
