import { describe, expect, it } from 'vitest';

import { ThreatTier } from '../src/utils/difficulty';
import { getTierMusicProfile } from '../src/audio/musicProfile';

const tiers: ThreatTier[] = [0, 1, 2, 3, 4, 5];

describe('tier music profile', () => {
  it('increases bpm and filter cutoff with tier', () => {
    const bpms = tiers.map((tier) => getTierMusicProfile(tier).bpm);
    const cutoffs = tiers.map((tier) => getTierMusicProfile(tier).filterCutoffHz);

    expect(bpms).toEqual([118, 124, 130, 136, 142, 148]);
    expect(cutoffs).toEqual([1250, 1800, 2500, 3300, 4300, 5600]);
  });

  it('does not reduce harmony/percussion density at higher tiers', () => {
    const harmonies = tiers.map((tier) => getTierMusicProfile(tier).harmonyDensity);
    const percussions = tiers.map((tier) => getTierMusicProfile(tier).percussionDensity);

    for (let i = 1; i < tiers.length; i += 1) {
      expect(harmonies[i]).toBeGreaterThanOrEqual(harmonies[i - 1]);
      expect(percussions[i]).toBeGreaterThanOrEqual(percussions[i - 1]);
    }
  });
});
