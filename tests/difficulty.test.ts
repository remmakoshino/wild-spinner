import { describe, expect, it } from 'vitest';

import { threatTierByClearedStages } from '../src/utils/difficulty';

describe('threat tier progression', () => {
  it('maps cleared stage counts to expected tiers', () => {
    expect(threatTierByClearedStages(0)).toBe(0);
    expect(threatTierByClearedStages(1)).toBe(1);
    expect(threatTierByClearedStages(2)).toBe(2);
    expect(threatTierByClearedStages(3)).toBe(2);
    expect(threatTierByClearedStages(4)).toBe(3);
    expect(threatTierByClearedStages(5)).toBe(3);
    expect(threatTierByClearedStages(6)).toBe(4);
    expect(threatTierByClearedStages(8)).toBe(5);
  });
});
