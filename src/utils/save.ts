import { ThreatTier, clampThreatTier, threatTierByClearedStages } from './difficulty';

const SAVE_KEY = 'wild-spinner-save-v1';

export interface SaveData {
  unlockedStages: number[];
  bestTimes: Record<string, number>;
  emblemProgress: Record<string, string[]>;
  totalFruit: number;
  difficulty: {
    adaptiveEnabled: boolean;
    clearedStageCount: number;
    threatTier: ThreatTier;
    lastAppliedAt: number;
  };
  options: {
    bgmVolume: number;
    seVolume: number;
    vibration: boolean;
  };
}

export const createDefaultSaveData = (): SaveData => ({
  unlockedStages: [1],
  bestTimes: {},
  emblemProgress: {},
  totalFruit: 0,
  difficulty: {
    adaptiveEnabled: true,
    clearedStageCount: 0,
    threatTier: 0,
    lastAppliedAt: Date.now()
  },
  options: {
    bgmVolume: 0.8,
    seVolume: 0.8,
    vibration: false
  }
});

const sanitize = (raw: Partial<SaveData>): SaveData => {
  const base = createDefaultSaveData();
  return {
    ...base,
    ...raw,
    unlockedStages: Array.isArray(raw.unlockedStages) ? raw.unlockedStages : base.unlockedStages,
    bestTimes: raw.bestTimes ?? base.bestTimes,
    emblemProgress: raw.emblemProgress ?? base.emblemProgress,
    totalFruit: Number.isFinite(raw.totalFruit) ? Number(raw.totalFruit) : base.totalFruit,
    difficulty: {
      ...base.difficulty,
      ...(raw.difficulty ?? {}),
      threatTier: clampThreatTier(raw.difficulty?.threatTier ?? base.difficulty.threatTier)
    },
    options: {
      ...base.options,
      ...(raw.options ?? {})
    }
  };
};

export const loadSaveData = (): SaveData => {
  const text = localStorage.getItem(SAVE_KEY);
  if (!text) return createDefaultSaveData();

  try {
    return sanitize(JSON.parse(text) as Partial<SaveData>);
  } catch {
    return createDefaultSaveData();
  }
};

export const saveSaveData = (data: SaveData): void => {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
};

export const markStageCleared = (data: SaveData, stageId: number): SaveData => {
  const unlockedStages = new Set(data.unlockedStages);
  unlockedStages.add(stageId);
  unlockedStages.add(stageId + 1);

  const clearedStageCount = data.difficulty.clearedStageCount + 1;
  const threatTier = threatTierByClearedStages(clearedStageCount);

  return {
    ...data,
    unlockedStages: [...unlockedStages].sort((a, b) => a - b),
    difficulty: {
      ...data.difficulty,
      clearedStageCount,
      threatTier,
      lastAppliedAt: Date.now()
    }
  };
};
