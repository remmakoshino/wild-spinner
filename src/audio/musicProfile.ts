import { ThreatTier } from '../utils/difficulty';

export interface TierMusicProfile {
  bpm: number;
  harmonyDensity: 0 | 1 | 2 | 3;
  percussionDensity: 0 | 1 | 2 | 3 | 4;
  harmonyDb: number;
  drumDb: number;
  filterCutoffHz: number;
}

const TIER_MUSIC_PROFILE: Record<ThreatTier, TierMusicProfile> = {
  0: {
    bpm: 118,
    harmonyDensity: 0,
    percussionDensity: 1,
    harmonyDb: -36,
    drumDb: -30,
    filterCutoffHz: 1250
  },
  1: {
    bpm: 124,
    harmonyDensity: 1,
    percussionDensity: 1,
    harmonyDb: -26,
    drumDb: -24,
    filterCutoffHz: 1800
  },
  2: {
    bpm: 130,
    harmonyDensity: 1,
    percussionDensity: 2,
    harmonyDb: -20,
    drumDb: -18,
    filterCutoffHz: 2500
  },
  3: {
    bpm: 136,
    harmonyDensity: 2,
    percussionDensity: 3,
    harmonyDb: -15,
    drumDb: -13,
    filterCutoffHz: 3300
  },
  4: {
    bpm: 142,
    harmonyDensity: 3,
    percussionDensity: 4,
    harmonyDb: -11,
    drumDb: -9,
    filterCutoffHz: 4300
  },
  5: {
    bpm: 148,
    harmonyDensity: 3,
    percussionDensity: 4,
    harmonyDb: -8,
    drumDb: -6,
    filterCutoffHz: 5600
  }
};

export const getTierMusicProfile = (tier: ThreatTier): TierMusicProfile => {
  return TIER_MUSIC_PROFILE[tier];
};
