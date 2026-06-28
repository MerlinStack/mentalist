export type MatchRange = "close" | "balanced" | "far" | "maximum";

export interface DistanceThresholds {
  tokenThreshold: number;
  semanticThreshold: number;
}

const DISTANCE_MAP: Record<MatchRange, DistanceThresholds> = {
  close:    { tokenThreshold: 85, semanticThreshold: 0.50 },
  balanced: { tokenThreshold: 75, semanticThreshold: 0.30 },
  far:      { tokenThreshold: 55, semanticThreshold: 0.10 },
  maximum:  { tokenThreshold: 30, semanticThreshold: 0.02 },
};

export function getDistanceThresholds(range: MatchRange): DistanceThresholds {
  return DISTANCE_MAP[range] ?? DISTANCE_MAP.balanced;
}

export const MATCH_RANGE_OPTIONS: { value: MatchRange; label: string; description: string }[] = [
  { value: "close",    label: "Close",    description: "Only strong matches" },
  { value: "balanced", label: "Balanced",  description: "Default matching range" },
  { value: "far",      label: "Far",       description: "Broader matching" },
  { value: "maximum",  label: "Maximum",   description: "Widest possible range" },
];
