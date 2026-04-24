import { describe, expect, it } from 'vitest';

import { getStageDefinition } from '../src/gameplay/stageDefinitions';

describe('stage definitions', () => {
  it('stage 2 has unique gimmicks and enemy variants', () => {
    const stage2 = getStageDefinition(2);
    expect(stage2.gimmicks.some((g) => g.type === 'turbine-zone')).toBe(true);
    expect(stage2.gimmicks.some((g) => g.type === 'moving-platform')).toBe(true);
    expect(stage2.crates.some((c) => c.type === 'bounce')).toBe(true);

    const variants = new Set(stage2.enemySpawns.map((e) => e.variant));
    expect(variants.has('charger')).toBe(true);
    expect(variants.has('shooter')).toBe(true);
  });

  it('stage 3 has unique gimmicks and support enemy', () => {
    const stage3 = getStageDefinition(3);
    expect(stage3.gimmicks.some((g) => g.type === 'freeze-zone')).toBe(true);
    expect(stage3.gimmicks.some((g) => g.type === 'crumble-platform')).toBe(true);

    const variants = new Set(stage3.enemySpawns.map((e) => e.variant));
    expect(variants.has('support')).toBe(true);
    expect(variants.has('shooter')).toBe(true);

    expect(stage3.crates.some((c) => c.type === 'volatile')).toBe(true);

    expect(stage3.finalChallenge).toBeDefined();
    expect(stage3.finalChallenge?.reinforcements.length).toBeGreaterThanOrEqual(2);
  });
});
