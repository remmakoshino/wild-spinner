export type ThreatTier = 0 | 1 | 2 | 3 | 4 | 5;

export interface DifficultyPreset {
  enemyHpScale: number;
  playerDamageTakenScale: number;
  parryWindowMs: number;
  checkpointIntervalMeters: number;
}

export const DIFFICULTY_PRESETS: Record<ThreatTier, DifficultyPreset> = {
  0: { enemyHpScale: 0.8, playerDamageTakenScale: 0.7, parryWindowMs: 220, checkpointIntervalMeters: 60 },
  1: { enemyHpScale: 0.95, playerDamageTakenScale: 0.85, parryWindowMs: 190, checkpointIntervalMeters: 75 },
  2: { enemyHpScale: 1.1, playerDamageTakenScale: 1.0, parryWindowMs: 160, checkpointIntervalMeters: 90 },
  3: { enemyHpScale: 1.25, playerDamageTakenScale: 1.15, parryWindowMs: 140, checkpointIntervalMeters: 110 },
  4: { enemyHpScale: 1.45, playerDamageTakenScale: 1.3, parryWindowMs: 125, checkpointIntervalMeters: 130 },
  5: { enemyHpScale: 1.7, playerDamageTakenScale: 1.5, parryWindowMs: 110, checkpointIntervalMeters: 160 }
};

export const clampThreatTier = (value: number): ThreatTier => {
  if (value <= 0) return 0;
  if (value >= 5) return 5;
  return value as ThreatTier;
};

export const threatTierByClearedStages = (clearedStageCount: number): ThreatTier => {
  if (clearedStageCount <= 0) return 0;
  if (clearedStageCount === 1) return 1;
  if (clearedStageCount <= 3) return 2;
  if (clearedStageCount <= 5) return 3;
  if (clearedStageCount <= 7) return 4;
  return 5;
};
