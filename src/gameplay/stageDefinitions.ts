export type EnemyVariant = 'charger' | 'shooter' | 'support';

export interface StagePlatformDefinition {
  x: number;
  y: number;
  scaleX: number;
}

export interface StageEnemySpawnDefinition {
  id: string;
  variant: EnemyVariant;
  x: number;
  y: number;
  hp: number;
  speed: number;
  patrolMinX?: number;
  patrolMaxX?: number;
  shootIntervalMs?: number;
}

export type StageGimmickDefinition =
  | {
      id: string;
      type: 'turbine-zone';
      x: number;
      y: number;
      width: number;
      height: number;
      boostY: number;
      cooldownMs: number;
    }
  | {
      id: string;
      type: 'moving-platform';
      x: number;
      y: number;
      scaleX: number;
      travel: number;
      speed: number;
      phase: number;
    }
  | {
      id: string;
      type: 'freeze-zone';
      x: number;
      y: number;
      width: number;
      height: number;
      slowFactor: number;
      damageIntervalMs: number;
    }
  | {
      id: string;
      type: 'crumble-platform';
      x: number;
      y: number;
      scaleX: number;
      collapseDelayMs: number;
      respawnMs: number;
    };

export interface StageDefinition {
  id: number;
  name: string;
  backgroundColor: string;
  hint: string;
  goalX: number;
  checkpoints: number[];
  platforms: StagePlatformDefinition[];
  enemySpawns: StageEnemySpawnDefinition[];
  gimmicks: StageGimmickDefinition[];
  finalChallenge?: {
    triggerX: number;
    message: string;
    reinforcements: StageEnemySpawnDefinition[];
  };
}

const STAGE_DEFINITIONS: Record<number, StageDefinition> = {
  1: {
    id: 1,
    name: '密林リフト街道',
    backgroundColor: '#0f172a',
    hint: 'Zで攻撃 / Jでパリィ / Shiftでダッシュ',
    goalX: 3120,
    checkpoints: [120, 1050, 2200],
    platforms: [
      { x: 400, y: 690, scaleX: 5.0 },
      { x: 1400, y: 640, scaleX: 3.6 },
      { x: 2150, y: 690, scaleX: 3.2 },
      { x: 2820, y: 610, scaleX: 2.1 }
    ],
    enemySpawns: [
      {
        id: 'st1-charger-1',
        variant: 'charger',
        x: 1230,
        y: 560,
        hp: 3,
        speed: 120,
        patrolMinX: 980,
        patrolMaxX: 1500
      }
    ],
    gimmicks: [],
    finalChallenge: undefined
  },
  2: {
    id: 2,
    name: '遺跡タービン回廊',
    backgroundColor: '#111827',
    hint: '青い上昇気流を使って縦移動 / 射撃敵の弾をパリィ',
    goalX: 3120,
    checkpoints: [120, 980, 2050],
    platforms: [
      { x: 350, y: 700, scaleX: 3.8 },
      { x: 980, y: 620, scaleX: 2.2 },
      { x: 1600, y: 700, scaleX: 2.5 },
      { x: 2520, y: 620, scaleX: 2.1 }
    ],
    enemySpawns: [
      {
        id: 'st2-charger-1',
        variant: 'charger',
        x: 980,
        y: 560,
        hp: 4,
        speed: 130,
        patrolMinX: 800,
        patrolMaxX: 1200
      },
      {
        id: 'st2-shooter-1',
        variant: 'shooter',
        x: 2050,
        y: 540,
        hp: 3,
        speed: 0,
        shootIntervalMs: 1450
      }
    ],
    gimmicks: [
      {
        id: 'st2-turbine-1',
        type: 'turbine-zone',
        x: 1490,
        y: 615,
        width: 240,
        height: 170,
        boostY: -860,
        cooldownMs: 650
      },
      {
        id: 'st2-moving-1',
        type: 'moving-platform',
        x: 2260,
        y: 500,
        scaleX: 1.8,
        travel: 220,
        speed: 1.6,
        phase: 0.4
      }
    ],
    finalChallenge: undefined
  },
  3: {
    id: 3,
    name: '極寒ベルトライン',
    backgroundColor: '#0b1320',
    hint: '氷結帯は移動減速と継続ダメージ / 崩落床は素早く通過',
    goalX: 3120,
    checkpoints: [120, 960, 1980],
    platforms: [
      { x: 360, y: 700, scaleX: 4.1 },
      { x: 1260, y: 660, scaleX: 2.1 },
      { x: 2230, y: 700, scaleX: 2.7 },
      { x: 2920, y: 640, scaleX: 1.4 }
    ],
    enemySpawns: [
      {
        id: 'st3-charger-1',
        variant: 'charger',
        x: 980,
        y: 560,
        hp: 4,
        speed: 140,
        patrolMinX: 760,
        patrolMaxX: 1260
      },
      {
        id: 'st3-support-1',
        variant: 'support',
        x: 1730,
        y: 560,
        hp: 5,
        speed: 90,
        patrolMinX: 1550,
        patrolMaxX: 1920
      },
      {
        id: 'st3-shooter-1',
        variant: 'shooter',
        x: 2510,
        y: 540,
        hp: 4,
        speed: 0,
        shootIntervalMs: 1250
      }
    ],
    gimmicks: [
      {
        id: 'st3-freeze-1',
        type: 'freeze-zone',
        x: 1180,
        y: 640,
        width: 460,
        height: 180,
        slowFactor: 0.58,
        damageIntervalMs: 1400
      },
      {
        id: 'st3-crumble-1',
        type: 'crumble-platform',
        x: 1880,
        y: 560,
        scaleX: 1.9,
        collapseDelayMs: 850,
        respawnMs: 3200
      }
    ],
    finalChallenge: {
      triggerX: 2720,
      message: '最終防衛ライン: 増援を突破してゴールを解放せよ',
      reinforcements: [
        {
          id: 'st3-final-shooter-1',
          variant: 'shooter',
          x: 2860,
          y: 520,
          hp: 5,
          speed: 0,
          shootIntervalMs: 980
        },
        {
          id: 'st3-final-support-1',
          variant: 'support',
          x: 3000,
          y: 560,
          hp: 6,
          speed: 110,
          patrolMinX: 2810,
          patrolMaxX: 3070
        }
      ]
    }
  }
};

export const getStageDefinition = (stageId: number): StageDefinition => {
  return STAGE_DEFINITIONS[stageId] ?? STAGE_DEFINITIONS[1];
};

export const getAllStageDefinitions = (): StageDefinition[] => {
  return Object.values(STAGE_DEFINITIONS).sort((a, b) => a.id - b.id);
};
