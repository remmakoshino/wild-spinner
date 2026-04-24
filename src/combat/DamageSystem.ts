export const calcEnemyContactDamage = (damageScale: number): number => {
  const baseDamage = 1;
  return Math.max(1, Math.round(baseDamage * damageScale));
};

export const calcPlayerAttackDamage = (): number => 1;
