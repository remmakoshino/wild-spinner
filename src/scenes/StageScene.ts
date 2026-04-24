import Phaser from 'phaser';

import { adaptiveMusicSystem } from '../audio/runtime';
import { calcEnemyContactDamage, calcPlayerAttackDamage } from '../combat/DamageSystem';
import { EnemyAI } from '../combat/EnemyAI';
import { CheckpointSystem } from '../gameplay/CheckpointSystem';
import { ComboSystem } from '../gameplay/ComboSystem';
import { DodgeParrySystem } from '../gameplay/DodgeParrySystem';
import { MovementSystem } from '../gameplay/MovementSystem';
import {
  EnemyVariant,
  StageCrateDefinition,
  StageCrateType,
  StageDefinition,
  StageEnemySpawnDefinition,
  getStageDefinition
} from '../gameplay/stageDefinitions';
import { HUD } from '../ui/HUD';
import {
  PLAYER_BASE_HP,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from '../utils/constants';
import { DIFFICULTY_PRESETS, ThreatTier } from '../utils/difficulty';
import { loadSaveData, markStageCleared, saveSaveData, SaveData } from '../utils/save';

interface StageSceneData {
  stageId?: number;
}

interface EnemyRuntime {
  spawn: StageEnemySpawnDefinition;
  sprite: Phaser.Physics.Arcade.Sprite;
  ai?: EnemyAI;
  hp: number;
  maxHp: number;
  nextActionAt: number;
}

interface MovingPlatformRuntime {
  platform: Phaser.Physics.Arcade.Image;
  originX: number;
  travel: number;
  speed: number;
  phase: number;
}

interface TurbineZoneRuntime {
  zone: Phaser.GameObjects.Rectangle;
  boostY: number;
  cooldownMs: number;
  nextReadyAt: number;
}

interface FreezeZoneRuntime {
  zone: Phaser.GameObjects.Rectangle;
  slowFactor: number;
  damageIntervalMs: number;
  nextDamageAt: number;
}

interface CrumblePlatformRuntime {
  platform: Phaser.Physics.Arcade.Image;
  x: number;
  y: number;
  scaleX: number;
  collapseDelayMs: number;
  respawnMs: number;
  collapsed: boolean;
  collapseAt: number;
  respawnAt: number;
}

interface CrateRuntime {
  definition: StageCrateDefinition;
  sprite: Phaser.Physics.Arcade.Image;
  broken: boolean;
  nextActionAt: number;
}

export class StageScene extends Phaser.Scene {
  private stageId = 1;
  private stageDefinition!: StageDefinition;

  private saveData!: SaveData;
  private tier: ThreatTier = 0;

  private staticPlatforms!: Phaser.Physics.Arcade.StaticGroup;
  private player!: Phaser.Physics.Arcade.Sprite;
  private goal!: Phaser.Physics.Arcade.Sprite;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private fruitPickups!: Phaser.Physics.Arcade.Group;

  private enemies: EnemyRuntime[] = [];
  private movingPlatforms: MovingPlatformRuntime[] = [];
  private turbineZones: TurbineZoneRuntime[] = [];
  private freezeZones: FreezeZoneRuntime[] = [];
  private crumblePlatforms: CrumblePlatformRuntime[] = [];
  private crates: CrateRuntime[] = [];

  private movementSystem!: MovementSystem;
  private dodgeParrySystem!: DodgeParrySystem;
  private checkpointSystem!: CheckpointSystem;
  private comboSystem!: ComboSystem;
  private hud!: HUD;

  private attackKey!: Phaser.Input.Keyboard.Key;

  private playerHp = PLAYER_BASE_HP;

  private nextContactDamageAt = 0;
  private startedAt = 0;

  private currentBgmSection: 'explore' | 'battle' | 'boss' = 'explore';
  private message = '';
  private messageUntil = 0;
  private finished = false;
  private goalUnlocked = true;
  private finalChallengeTriggered = false;
  private finalChallengeCleared = false;
  private fruitsCollected = 0;
  private cratesBroken = 0;
  private totalCrates = 0;

  constructor() {
    super('StageScene');
  }

  create(data: StageSceneData): void {
    this.stageId = data.stageId ?? 1;
    this.stageDefinition = getStageDefinition(this.stageId);

    this.saveData = loadSaveData();
    this.tier = this.saveData.difficulty.threatTier;

    const preset = DIFFICULTY_PRESETS[this.tier];
    this.playerHp = PLAYER_BASE_HP;

    this.cameras.main.setBackgroundColor(this.stageDefinition.backgroundColor);
    this.add.rectangle(WORLD_WIDTH * 0.5, WORLD_HEIGHT * 0.5, WORLD_WIDTH, WORLD_HEIGHT, 0x0f172a);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.createCoreTextures();
    this.createStageTerrain();
    this.createCrates();

    this.goal = this.physics.add.staticSprite(this.stageDefinition.goalX, 560, 'goal-tex');

    this.player = this.physics.add.sprite(120, 560, 'player-tex');
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.02);

    this.enemyProjectiles = this.physics.add.group({
      maxSize: 32,
      allowGravity: false
    });

    this.fruitPickups = this.physics.add.group({
      maxSize: 96,
      allowGravity: false
    });

    this.physics.add.collider(this.player, this.staticPlatforms);
    this.movingPlatforms.forEach((runtime) => {
      this.physics.add.collider(this.player, runtime.platform);
    });
    this.crumblePlatforms.forEach((runtime) => {
      this.physics.add.collider(this.player, runtime.platform);
    });
    this.crates.forEach((runtime) => {
      this.physics.add.collider(this.player, runtime.sprite, () => {
        this.handlePlayerCrateCollision(runtime, this.time.now);
      });
    });

    this.physics.add.overlap(this.player, this.enemyProjectiles, (_player, projObj) => {
      this.handleProjectileContact(projObj as Phaser.Physics.Arcade.Sprite, this.time.now);
    });

    this.physics.add.overlap(this.player, this.fruitPickups, (_player, fruitObj) => {
      this.collectFruit(fruitObj as Phaser.Physics.Arcade.Sprite);
    });

    this.physics.add.overlap(this.player, this.goal, () => {
      if (this.goalUnlocked) {
        this.finishStage();
      }
    });

    this.spawnEnemies();

    if (this.stageDefinition.finalChallenge) {
      this.setGoalUnlocked(false);
      this.showMessage('Stage 3/3 提案実装: 最終防衛ラインを突破してゴール解放');
    } else {
      this.setGoalUnlocked(true);
    }

    this.movementSystem = new MovementSystem(this);
    this.dodgeParrySystem = new DodgeParrySystem(this);
    this.dodgeParrySystem.setParryWindowMs(preset.parryWindowMs);

    this.checkpointSystem = new CheckpointSystem(this.stageDefinition.checkpoints);
    this.comboSystem = new ComboSystem();

    this.hud = new HUD(this);
    this.attackKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Z) as Phaser.Input.Keyboard.Key;

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    this.startedAt = this.time.now;

    adaptiveMusicSystem.setThreatTier(this.tier);
    adaptiveMusicSystem.setSection('explore');
    this.currentBgmSection = 'explore';

    this.showMessage(`開始: ${this.stageDefinition.name}`);
  }

  update(time: number): void {
    if (this.finished) return;

    this.movementSystem.update(this.player, time);
    this.updateMovingPlatforms(time);
    this.updateCrumblePlatforms(time);

    this.dodgeParrySystem.update(time);
    this.comboSystem.update(time);

    this.updateEnemyBehaviors(time);
    this.updateProjectiles(time);
    this.updateFruitPickups(time);
    this.updateCrates(time);
    this.updateFinalChallenge(time);

    this.handlePlayerAttack(time);
    this.updateStageGimmicks(time);

    this.checkpointSystem.updateByX(this.player.x);

    if (this.player.y > WORLD_HEIGHT + 30) {
      this.respawnAtCheckpoint();
      this.showMessage('落下: チェックポイントへ復帰');
    }

    this.updateMusicSection();

    if (time > this.messageUntil) {
      this.message = this.stageDefinition.hint;
    }

    this.hud.update({
      hp: this.playerHp,
      maxHp: PLAYER_BASE_HP,
      tier: this.tier,
      comboRank: this.comboSystem.getRank(),
      section: this.currentBgmSection,
      message: this.message,
      enemiesLeft: this.getAliveEnemyCount(),
      stageLabel: `STAGE ${this.stageDefinition.id}`,
      fruits: this.fruitsCollected,
      cratesBroken: this.cratesBroken,
      cratesTotal: this.totalCrates
    });
  }

  private createCoreTextures(): void {
    if (!this.textures.exists('player-tex')) {
      const g = this.add.graphics();

      // 主人公: キツネモチーフ
      g.fillStyle(0xf97316, 1);
      g.fillTriangle(2, 30, 14, 20, 14, 40);
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(4, 30, 12, 24, 12, 36);

      g.fillStyle(0xfb923c, 1);
      g.fillRoundedRect(12, 16, 20, 22, 8);

      g.fillStyle(0xf97316, 1);
      g.fillCircle(24, 12, 10);
      g.fillTriangle(17, 6, 21, 0, 24, 8);
      g.fillTriangle(24, 8, 27, 0, 31, 6);

      g.fillStyle(0xffffff, 1);
      g.fillCircle(24, 16, 5);
      g.fillStyle(0x111827, 1);
      g.fillCircle(21, 11, 1.5);
      g.fillCircle(27, 11, 1.5);
      g.fillCircle(24, 14, 1.5);

      g.generateTexture('player-tex', 40, 48);
      g.destroy();
    }

    if (!this.textures.exists('enemy-tex')) {
      const g = this.add.graphics();

      // 突進型: ハリネズミモチーフ
      g.fillStyle(0x6b4f3b, 1);
      g.fillTriangle(6, 12, 10, 2, 14, 12);
      g.fillTriangle(12, 12, 16, 0, 20, 12);
      g.fillTriangle(18, 12, 22, 2, 26, 12);
      g.fillTriangle(24, 12, 28, 1, 32, 12);

      g.fillStyle(0x8b5e3c, 1);
      g.fillRoundedRect(4, 12, 30, 22, 8);
      g.fillStyle(0xd6b08c, 1);
      g.fillRoundedRect(20, 18, 12, 10, 5);
      g.fillStyle(0x111827, 1);
      g.fillCircle(24, 16, 1.5);
      g.fillCircle(30, 22, 1.2);

      g.generateTexture('enemy-tex', 40, 40);
      g.destroy();
    }

    if (!this.textures.exists('enemy-shooter-tex')) {
      const g = this.add.graphics();

      // 射撃型: フクロウモチーフ
      g.fillStyle(0x8b5cf6, 1);
      g.fillRoundedRect(4, 8, 30, 28, 10);
      g.fillTriangle(8, 10, 14, 2, 18, 10);
      g.fillTriangle(20, 10, 24, 2, 30, 10);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(15, 20, 5);
      g.fillCircle(23, 20, 5);
      g.fillStyle(0x111827, 1);
      g.fillCircle(15, 20, 2);
      g.fillCircle(23, 20, 2);
      g.fillStyle(0xf59e0b, 1);
      g.fillTriangle(18, 24, 20, 28, 22, 24);

      g.generateTexture('enemy-shooter-tex', 40, 40);
      g.destroy();
    }

    if (!this.textures.exists('enemy-support-tex')) {
      const g = this.add.graphics();

      // 支援型: タヌキモチーフ
      g.fillStyle(0x9ca3af, 1);
      g.fillRoundedRect(6, 12, 28, 28, 10);
      g.fillStyle(0x4b5563, 1);
      g.fillRoundedRect(8, 14, 24, 12, 6);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(16, 20, 3.2);
      g.fillCircle(24, 20, 3.2);
      g.fillStyle(0x111827, 1);
      g.fillCircle(16, 20, 1.5);
      g.fillCircle(24, 20, 1.5);
      g.fillStyle(0x6b7280, 1);
      g.fillRoundedRect(2, 24, 8, 10, 3);

      g.generateTexture('enemy-support-tex', 40, 42);
      g.destroy();
    }

    if (!this.textures.exists('platform-tex')) {
      const g = this.add.graphics();
      g.fillStyle(0x334155, 1);
      g.fillRoundedRect(0, 0, 220, 34, 6);
      g.generateTexture('platform-tex', 220, 34);
      g.destroy();
    }

    if (!this.textures.exists('goal-tex')) {
      const g = this.add.graphics();
      g.fillStyle(0xfacc15, 1);
      g.fillRect(0, 0, 24, 80);
      g.generateTexture('goal-tex', 24, 80);
      g.destroy();
    }

    if (!this.textures.exists('projectile-tex')) {
      const g = this.add.graphics();
      g.fillStyle(0xfbbf24, 1);
      g.fillCircle(8, 8, 8);
      g.generateTexture('projectile-tex', 16, 16);
      g.destroy();
    }

    if (!this.textures.exists('crate-fruit-tex')) {
      const g = this.add.graphics();
      g.fillStyle(0x1a141e, 1);
      g.fillRoundedRect(0, 0, 38, 38, 5);
      g.fillStyle(0x8b5a2b, 1);
      g.fillRoundedRect(3, 3, 32, 32, 4);
      g.lineStyle(2, 0x6b4423, 1);
      g.strokeLineShape(new Phaser.Geom.Line(4, 4, 34, 34));
      g.strokeLineShape(new Phaser.Geom.Line(34, 4, 4, 34));
      g.fillStyle(0xf59e0b, 1);
      g.fillCircle(19, 19, 6);
      g.generateTexture('crate-fruit-tex', 38, 38);
      g.destroy();
    }

    if (!this.textures.exists('crate-bounce-tex')) {
      const g = this.add.graphics();
      g.fillStyle(0x0f172a, 1);
      g.fillRoundedRect(0, 0, 38, 38, 5);
      g.fillStyle(0x7c3aed, 1);
      g.fillRoundedRect(3, 3, 32, 32, 4);
      g.fillStyle(0xd8b4fe, 1);
      g.fillTriangle(19, 8, 29, 22, 23, 22);
      g.fillTriangle(19, 8, 9, 22, 15, 22);
      g.fillRect(13, 22, 12, 8);
      g.generateTexture('crate-bounce-tex', 38, 38);
      g.destroy();
    }

    if (!this.textures.exists('crate-volatile-tex')) {
      const g = this.add.graphics();
      g.fillStyle(0x1f2937, 1);
      g.fillRoundedRect(0, 0, 38, 38, 5);
      g.fillStyle(0xb91c1c, 1);
      g.fillRoundedRect(3, 3, 32, 32, 4);
      g.fillStyle(0xfef08a, 1);
      g.fillTriangle(19, 10, 26, 26, 20, 26);
      g.fillTriangle(19, 10, 12, 26, 18, 26);
      g.fillCircle(19, 31, 2);
      g.generateTexture('crate-volatile-tex', 38, 38);
      g.destroy();
    }

    if (!this.textures.exists('fruit-tex')) {
      const g = this.add.graphics();
      g.fillStyle(0xf59e0b, 1);
      g.fillCircle(8, 8, 7);
      g.fillStyle(0x84cc16, 1);
      g.fillTriangle(8, 1, 10, -3, 12, 1);
      g.generateTexture('fruit-tex', 16, 16);
      g.destroy();
    }
  }

  private createStageTerrain(): void {
    this.staticPlatforms = this.physics.add.staticGroup();
    this.stageDefinition.platforms.forEach((platform) => {
      this.createPlatform(this.staticPlatforms, platform.x, platform.y, platform.scaleX);
    });

    this.stageDefinition.gimmicks.forEach((gimmick) => {
      if (gimmick.type === 'moving-platform') {
        const platform = this.physics.add.image(gimmick.x, gimmick.y, 'platform-tex');
        platform.setDisplaySize(220 * gimmick.scaleX, 34);
        platform.setImmovable(true);
        platform.setTint(0x7c3aed);
        const body = platform.body as Phaser.Physics.Arcade.Body;
        body.allowGravity = false;
        body.setSize(platform.displayWidth, platform.displayHeight, true);

        this.movingPlatforms.push({
          platform,
          originX: gimmick.x,
          travel: gimmick.travel,
          speed: gimmick.speed,
          phase: gimmick.phase
        });
      }

      if (gimmick.type === 'turbine-zone') {
        const zone = this.add.rectangle(gimmick.x, gimmick.y, gimmick.width, gimmick.height, 0x38bdf8, 0.22);
        zone.setStrokeStyle(2, 0x7dd3fc, 0.7);
        this.turbineZones.push({
          zone,
          boostY: gimmick.boostY,
          cooldownMs: gimmick.cooldownMs,
          nextReadyAt: 0
        });
      }

      if (gimmick.type === 'freeze-zone') {
        const zone = this.add.rectangle(gimmick.x, gimmick.y, gimmick.width, gimmick.height, 0x60a5fa, 0.18);
        zone.setStrokeStyle(2, 0xbfdbfe, 0.65);
        this.freezeZones.push({
          zone,
          slowFactor: gimmick.slowFactor,
          damageIntervalMs: gimmick.damageIntervalMs,
          nextDamageAt: 0
        });
      }

      if (gimmick.type === 'crumble-platform') {
        const platform = this.physics.add.image(gimmick.x, gimmick.y, 'platform-tex');
        platform.setDisplaySize(220 * gimmick.scaleX, 34);
        platform.setImmovable(true);
        platform.setTint(0x64748b);
        const body = platform.body as Phaser.Physics.Arcade.Body;
        body.allowGravity = false;
        body.setSize(platform.displayWidth, platform.displayHeight, true);

        this.crumblePlatforms.push({
          platform,
          x: gimmick.x,
          y: gimmick.y,
          scaleX: gimmick.scaleX,
          collapseDelayMs: gimmick.collapseDelayMs,
          respawnMs: gimmick.respawnMs,
          collapsed: false,
          collapseAt: 0,
          respawnAt: 0
        });
      }
    });
  }

  private createPlatform(
    group: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    scaleX: number
  ): void {
    const platform = group.create(x, y, 'platform-tex') as Phaser.Physics.Arcade.Image;
    platform.setScale(scaleX, 1).refreshBody();
  }

  private createCrates(): void {
    this.stageDefinition.crates.forEach((definition) => {
      const sprite = this.physics.add.staticImage(definition.x, definition.y, this.getCrateTexture(definition.type));
      sprite.setDepth(4);

      this.crates.push({
        definition,
        sprite,
        broken: false,
        nextActionAt: 0
      });
    });

    this.totalCrates = this.crates.length;
  }

  private getCrateTexture(type: StageCrateType): string {
    if (type === 'bounce') return 'crate-bounce-tex';
    if (type === 'volatile') return 'crate-volatile-tex';
    return 'crate-fruit-tex';
  }

  private spawnEnemies(): void {
    const preset = DIFFICULTY_PRESETS[this.tier];

    this.stageDefinition.enemySpawns.forEach((spawn) => {
      this.spawnEnemyRuntime(spawn, preset.enemyHpScale);
    });
  }

  private spawnEnemyRuntime(spawn: StageEnemySpawnDefinition, hpScale: number): EnemyRuntime {
    const texture = this.getEnemyTexture(spawn.variant);
    const sprite = this.physics.add.sprite(spawn.x, spawn.y, texture);
    sprite.setCollideWorldBounds(true);

    const hp = Math.max(1, Math.round(spawn.hp * hpScale));
    const runtime: EnemyRuntime = {
      spawn,
      sprite,
      hp,
      maxHp: hp,
      nextActionAt: this.time.now + 800
    };

    if (spawn.variant !== 'shooter') {
      runtime.ai = new EnemyAI(
        sprite,
        spawn.patrolMinX ?? spawn.x - 140,
        spawn.patrolMaxX ?? spawn.x + 140,
        spawn.speed + this.tier * 10
      );
    }

    this.physics.add.collider(sprite, this.staticPlatforms);
    this.movingPlatforms.forEach((platform) => this.physics.add.collider(sprite, platform.platform));
    this.crumblePlatforms.forEach((platform) => this.physics.add.collider(sprite, platform.platform));

    this.physics.add.overlap(this.player, sprite, () => {
      this.handleEnemyContact(runtime, this.time.now);
    });

    this.enemies.push(runtime);
    return runtime;
  }

  private getEnemyTexture(variant: EnemyVariant): string {
    if (variant === 'shooter') return 'enemy-shooter-tex';
    if (variant === 'support') return 'enemy-support-tex';
    return 'enemy-tex';
  }

  private handlePlayerAttack(time: number): void {
    if (!Phaser.Input.Keyboard.JustDown(this.attackKey)) return;

    let hitSomething = false;

    const target = this.findNearestEnemy(110);
    if (target) {
      target.hp -= calcPlayerAttackDamage();
      this.comboSystem.registerHit(time);
      hitSomething = true;

      if (target.hp <= 0) {
        target.sprite.disableBody(true, true);
        this.showMessage(`${this.enemyVariantLabel(target.spawn.variant)}を撃破`);
      } else {
        target.ai?.stun(time, 500);
        this.showMessage(`攻撃命中: 敵HP ${target.hp}`);
      }
    }

    if (this.breakNearbyCrate(120, time)) {
      hitSomething = true;
    }

    if (!hitSomething) return;
  }

  private handleEnemyContact(enemy: EnemyRuntime, time: number): void {
    if (!enemy.sprite.active || time < this.nextContactDamageAt) return;

    if (this.dodgeParrySystem.isParryActive(time)) {
      enemy.ai?.stun(time, 900);
      enemy.nextActionAt = Math.max(enemy.nextActionAt, time + 800);
      this.comboSystem.registerHit(time);
      this.nextContactDamageAt = time + 320;
      this.showMessage('パリィ成功: 敵スタン');
      return;
    }

    const preset = DIFFICULTY_PRESETS[this.tier];
    const damage = calcEnemyContactDamage(preset.playerDamageTakenScale);
    this.applyPlayerDamage(damage, time, `被弾: HP ${Math.max(0, this.playerHp - damage)}/${PLAYER_BASE_HP}`);
  }

  private handleProjectileContact(projectile: Phaser.Physics.Arcade.Sprite, time: number): void {
    if (!projectile.active || time < this.nextContactDamageAt) return;

    projectile.disableBody(true, true);

    if (this.dodgeParrySystem.isParryActive(time)) {
      this.comboSystem.registerHit(time);
      this.nextContactDamageAt = time + 180;
      this.showMessage('射撃をパリィ');
      return;
    }

    const preset = DIFFICULTY_PRESETS[this.tier];
    const damage = Math.max(1, Math.round(calcEnemyContactDamage(preset.playerDamageTakenScale) * 0.8));
    this.applyPlayerDamage(damage, time, `射撃被弾: HP ${Math.max(0, this.playerHp - damage)}/${PLAYER_BASE_HP}`);
  }

  private handlePlayerCrateCollision(crate: CrateRuntime, time: number): void {
    const crateBody = crate.sprite.body as Phaser.Physics.Arcade.StaticBody | null;
    if (crate.broken || !crateBody?.enable) return;

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

    const landedFromTop = playerBody.velocity.y > 220 && playerBody.bottom <= crateBody.top + 18;

    if (crate.definition.type === 'bounce') {
      if (landedFromTop && time >= crate.nextActionAt) {
        crate.nextActionAt = time + 260;
        this.player.setVelocityY(-760);
        this.showMessage('バウンスクレート: 高く跳ね上がる');
      }
      return;
    }

    if (landedFromTop) {
      this.breakCrate(crate, time, true);
      this.player.setVelocityY(-430);
      return;
    }

    if (crate.definition.type === 'volatile') {
      this.breakCrate(crate, time, false);
    }
  }

  private breakNearbyCrate(range: number, time: number): boolean {
    let nearest: CrateRuntime | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;

    this.crates.forEach((crate) => {
      if (crate.broken || !crate.sprite.active) return;

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, crate.sprite.x, crate.sprite.y);
      if (distance <= range && distance < bestDistance) {
        bestDistance = distance;
        nearest = crate;
      }
    });

    if (!nearest) return false;
    this.breakCrate(nearest, time, true);
    return true;
  }

  private breakCrate(crate: CrateRuntime, time: number, rewardable: boolean): void {
    if (crate.broken) return;

    crate.broken = true;
    crate.sprite.disableBody(true, true);
    this.cratesBroken += 1;

    if (crate.definition.type === 'volatile') {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, crate.sprite.x, crate.sprite.y);
      if (dist < 120) {
        this.applyPlayerDamage(2, time, '危険クレート爆発');
      }
      this.showMessage('危険クレートが爆発');
      return;
    }

    if (rewardable) {
      const fruitCount = crate.definition.fruitCount ?? (crate.definition.type === 'bounce' ? 1 : 2);
      this.spawnFruits(crate.sprite.x, crate.sprite.y - 12, fruitCount, time);
      this.showMessage('クレートを破壊してフルーツ獲得');
    }
  }

  private spawnFruits(x: number, y: number, count: number, time: number): void {
    for (let i = 0; i < count; i += 1) {
      const fruit = this.fruitPickups.get(x, y, 'fruit-tex') as Phaser.Physics.Arcade.Sprite | null;
      if (!fruit) continue;

      fruit.enableBody(true, x, y, true, true);
      fruit.setActive(true).setVisible(true);

      const body = fruit.body as Phaser.Physics.Arcade.Body;
      body.allowGravity = false;
      body.setVelocity(Phaser.Math.Between(-110, 110), Phaser.Math.Between(-60, -15));
      fruit.setData('despawnAt', time + 2600);
      fruit.setDepth(5);
    }
  }

  private collectFruit(fruit: Phaser.Physics.Arcade.Sprite): void {
    if (!fruit.active) return;

    fruit.disableBody(true, true);
    this.fruitsCollected += 1;

    if (this.fruitsCollected % 20 === 0) {
      this.showMessage(`フルーツ ${this.fruitsCollected} 個`);
    }
  }

  private applyPlayerDamage(amount: number, time: number, message: string): void {
    this.playerHp -= amount;
    this.nextContactDamageAt = time + 600;

    if (this.playerHp <= 0) {
      this.playerHp = PLAYER_BASE_HP;
      this.respawnAtCheckpoint();
      this.showMessage('HP 0: チェックポイントから再開');
      return;
    }

    this.showMessage(message);
  }

  private findNearestEnemy(range: number): EnemyRuntime | undefined {
    const candidates = this.enemies.filter((enemy) => enemy.sprite.active);
    if (candidates.length === 0) return undefined;

    let nearest: EnemyRuntime | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;

    candidates.forEach((enemy) => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y);
      if (dist < range && dist < bestDistance) {
        bestDistance = dist;
        nearest = enemy;
      }
    });

    return nearest;
  }

  private updateEnemyBehaviors(time: number): void {
    this.enemies.forEach((enemy) => {
      if (!enemy.sprite.active) return;

      if (enemy.spawn.variant === 'charger') {
        enemy.ai?.update(time);
        return;
      }

      if (enemy.spawn.variant === 'support') {
        enemy.ai?.update(time);

        if (time >= enemy.nextActionAt) {
          this.activateSupportPulse(enemy, time);
          enemy.nextActionAt = time + Math.max(2200, 3800 - this.tier * 240);
        }
        return;
      }

      enemy.sprite.setVelocityX(0);
      if (time >= enemy.nextActionAt) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y);
        if (dist < 700) {
          this.fireEnemyProjectile(enemy, time);
          enemy.nextActionAt = time + Math.max(650, (enemy.spawn.shootIntervalMs ?? 1500) - this.tier * 80);
        }
      }
    });
  }

  private activateSupportPulse(source: EnemyRuntime, time: number): void {
    let healedCount = 0;

    this.enemies.forEach((ally) => {
      if (!ally.sprite.active || ally === source) return;

      const dist = Phaser.Math.Distance.Between(source.sprite.x, source.sprite.y, ally.sprite.x, ally.sprite.y);
      if (dist > 260) return;
      if (ally.hp >= ally.maxHp) return;

      ally.hp = Math.min(ally.maxHp, ally.hp + 1);
      healedCount += 1;
    });

    if (healedCount > 0) {
      this.showMessage(`支援敵が回復オーラを展開 (+${healedCount})`);
      source.sprite.setTintFill(0x86efac);
      this.time.delayedCall(180, () => source.sprite.clearTint());
    }

    source.ai?.stun(time, 180);
  }

  private fireEnemyProjectile(enemy: EnemyRuntime, time: number): void {
    const projectile = this.enemyProjectiles.get(enemy.sprite.x, enemy.sprite.y - 10, 'projectile-tex') as
      | Phaser.Physics.Arcade.Sprite
      | null;
    if (!projectile) return;

    projectile.enableBody(true, enemy.sprite.x, enemy.sprite.y - 10, true, true);
    projectile.setActive(true).setVisible(true);
    const body = projectile.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    projectile.setDepth(5);

    const dir = new Phaser.Math.Vector2(this.player.x - enemy.sprite.x, this.player.y - enemy.sprite.y);
    if (dir.length() > 0) dir.normalize();

    projectile.setVelocity(dir.x * 340, dir.y * 340);
    projectile.setData('spawnedAt', time);
  }

  private updateProjectiles(time: number): void {
    const projectiles = this.enemyProjectiles.getChildren() as Phaser.Physics.Arcade.Sprite[];
    projectiles.forEach((projectile) => {
      if (!projectile.active) return;

      const spawnedAt = Number(projectile.getData('spawnedAt') ?? time);
      if (time - spawnedAt > 5000) {
        projectile.disableBody(true, true);
        return;
      }

      if (
        projectile.x < -80 ||
        projectile.x > WORLD_WIDTH + 80 ||
        projectile.y < -80 ||
        projectile.y > WORLD_HEIGHT + 80
      ) {
        projectile.disableBody(true, true);
      }
    });
  }

  private updateFruitPickups(time: number): void {
    const fruits = this.fruitPickups.getChildren() as Phaser.Physics.Arcade.Sprite[];
    fruits.forEach((fruit) => {
      if (!fruit.active) return;

      const despawnAt = Number(fruit.getData('despawnAt') ?? 0);
      if (despawnAt > 0 && time >= despawnAt) {
        fruit.disableBody(true, true);
        return;
      }

      const body = fruit.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(body.velocity.x * 0.92, body.velocity.y * 0.92);
    });
  }

  private updateCrates(time: number): void {
    this.crates.forEach((crate) => {
      if (crate.broken || !crate.sprite.active) return;

      if (crate.definition.type === 'volatile') {
        const playerBounds = this.player.getBounds();
        const crateBounds = crate.sprite.getBounds();
        if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, crateBounds)) {
          this.breakCrate(crate, time, false);
        }
      }
    });
  }

  private updateMovingPlatforms(time: number): void {
    this.movingPlatforms.forEach((runtime) => {
      const targetX = runtime.originX + Math.sin(time * 0.001 * runtime.speed + runtime.phase) * runtime.travel;
      const velocityX = (targetX - runtime.platform.x) * 8;
      runtime.platform.setVelocityX(velocityX);
    });
  }

  private updateStageGimmicks(time: number): void {
    this.turbineZones.forEach((runtime) => {
      if (!this.isPlayerInsideRect(runtime.zone)) return;
      if (time < runtime.nextReadyAt) return;

      this.player.setVelocityY(runtime.boostY);
      runtime.nextReadyAt = time + runtime.cooldownMs;
      this.showMessage('タービン上昇: 高所へジャンプ');
    });

    this.freezeZones.forEach((runtime) => {
      if (!this.isPlayerInsideRect(runtime.zone)) return;

      const body = this.player.body as Phaser.Physics.Arcade.Body;
      this.player.setVelocityX(body.velocity.x * runtime.slowFactor);

      if (time >= runtime.nextDamageAt) {
        runtime.nextDamageAt = time + runtime.damageIntervalMs;
        this.applyPlayerDamage(1, time, '氷結帯ダメージ');
      }
    });
  }

  private updateCrumblePlatforms(time: number): void {
    this.crumblePlatforms.forEach((runtime) => {
      const body = runtime.platform.body as Phaser.Physics.Arcade.Body;

      if (runtime.collapsed) {
        if (time >= runtime.respawnAt) {
          runtime.collapsed = false;
          runtime.platform.setPosition(runtime.x, runtime.y);
          runtime.platform.setActive(true).setVisible(true);
          body.enable = true;
          runtime.platform.setVelocity(0, 0);
        }
        return;
      }

      if (runtime.collapseAt === 0 && this.isPlayerOnPlatform(runtime.platform)) {
        runtime.collapseAt = time + runtime.collapseDelayMs;
        this.showMessage('崩落床: すぐに離脱！');
      }

      if (runtime.collapseAt > 0 && time >= runtime.collapseAt) {
        runtime.collapsed = true;
        runtime.collapseAt = 0;
        runtime.respawnAt = time + runtime.respawnMs;
        runtime.platform.setVelocity(0, 0);
        runtime.platform.setActive(false).setVisible(false);
        body.enable = false;
      }
    });
  }

  private isPlayerInsideRect(zone: Phaser.GameObjects.Rectangle): boolean {
    return Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), zone.getBounds());
  }

  private isPlayerOnPlatform(platform: Phaser.Physics.Arcade.Image): boolean {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const platformBody = platform.body as Phaser.Physics.Arcade.Body;
    if (!platformBody.enable) return false;

    const onSameVertical = Math.abs(playerBody.bottom - platformBody.top) <= 8;
    const overlapHorizontal = playerBody.right > platformBody.left + 8 && playerBody.left < platformBody.right - 8;
    return playerBody.blocked.down && onSameVertical && overlapHorizontal;
  }

  private respawnAtCheckpoint(): void {
    const x = this.checkpointSystem.getRespawnX();
    this.player.setPosition(x, 520);
    this.player.setVelocity(0, 0);
  }

  private updateMusicSection(): void {
    let nextSection: 'explore' | 'battle' | 'boss' = 'explore';
    const hasNearbyEnemy = this.enemies.some((enemy) => {
      if (!enemy.sprite.active) return false;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y);
      return dist < 380;
    });

    if (!this.goalUnlocked || this.player.x >= this.stageDefinition.goalX - 420) {
      nextSection = 'boss';
    } else if (hasNearbyEnemy) {
      nextSection = 'battle';
    }

    if (nextSection !== this.currentBgmSection) {
      adaptiveMusicSystem.setSection(nextSection);
      this.currentBgmSection = nextSection;
    }
  }

  private finishStage(): void {
    if (this.finished) return;
    this.finished = true;

    const clearTimeMs = Math.round(this.time.now - this.startedAt);
    let nextSave = markStageCleared(this.saveData, this.stageId);

    const bestKey = `stage-${this.stageId}`;
    const prevBest = nextSave.bestTimes[bestKey];
    if (!prevBest || clearTimeMs < prevBest) {
      nextSave = {
        ...nextSave,
        bestTimes: {
          ...nextSave.bestTimes,
          [bestKey]: clearTimeMs
        }
      };
    }

    if (this.fruitsCollected > 0) {
      nextSave = {
        ...nextSave,
        totalFruit: nextSave.totalFruit + this.fruitsCollected
      };
    }

    saveSaveData(nextSave);
    adaptiveMusicSystem.setThreatTier(nextSave.difficulty.threatTier);

    this.scene.start('ResultScene', {
      stageId: this.stageId,
      clearTimeMs,
      tierBefore: this.tier,
      tierAfter: nextSave.difficulty.threatTier,
      fruitsCollected: this.fruitsCollected,
      cratesBroken: this.cratesBroken,
      cratesTotal: this.totalCrates
    });
  }

  private getAliveEnemyCount(): number {
    return this.enemies.filter((enemy) => enemy.sprite.active).length;
  }

  private updateFinalChallenge(time: number): void {
    const finalChallenge = this.stageDefinition.finalChallenge;
    if (!finalChallenge || this.finalChallengeCleared) return;

    if (!this.finalChallengeTriggered && this.player.x >= finalChallenge.triggerX) {
      this.finalChallengeTriggered = true;

      const hpScale = DIFFICULTY_PRESETS[this.tier].enemyHpScale;
      finalChallenge.reinforcements.forEach((spawn) => {
        this.spawnEnemyRuntime(spawn, hpScale);
      });

      adaptiveMusicSystem.setSection('boss');
      this.currentBgmSection = 'boss';
      this.showMessage(finalChallenge.message);
      return;
    }

    if (this.finalChallengeTriggered && this.getAliveEnemyCount() === 0) {
      this.finalChallengeCleared = true;
      this.setGoalUnlocked(true);
      this.showMessage('最終防衛ライン突破: ゴール解放');
      return;
    }

    if (this.finalChallengeTriggered && !this.goalUnlocked && time > this.messageUntil) {
      this.message = 'ゴール封鎖中: 増援敵を全滅させると解放';
    }
  }

  private setGoalUnlocked(unlocked: boolean): void {
    this.goalUnlocked = unlocked;

    const body = this.goal.body as Phaser.Physics.Arcade.StaticBody;
    body.enable = unlocked;

    if (unlocked) {
      this.goal.setTint(0xfacc15);
    } else {
      this.goal.setTint(0xef4444);
    }
  }

  private enemyVariantLabel(variant: EnemyVariant): string {
    if (variant === 'shooter') return '射撃型';
    if (variant === 'support') return '支援型';
    return '突進型';
  }

  private showMessage(text: string): void {
    this.message = text;
    this.messageUntil = this.time.now + 1800;
  }
}
