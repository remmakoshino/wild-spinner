import Phaser from 'phaser';

export interface HudState {
  hp: number;
  maxHp: number;
  tier: number;
  comboRank: string;
  section: string;
  message: string;
  enemiesLeft: number;
  stageLabel: string;
  fruits: number;
  cratesBroken: number;
  cratesTotal: number;
}

export class HUD {
  private readonly statsText: Phaser.GameObjects.Text;
  private readonly messageText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.statsText = scene.add.text(16, 14, '', {
      fontSize: '20px',
      color: '#f4f7ff',
      stroke: '#000000',
      strokeThickness: 4
    }).setScrollFactor(0).setDepth(100);

    this.messageText = scene.add.text(16, 48, '', {
      fontSize: '16px',
      color: '#ffe082',
      stroke: '#000000',
      strokeThickness: 3
    }).setScrollFactor(0).setDepth(100);
  }

  update(state: HudState): void {
    this.statsText.setText(
      `${state.stageLabel}  HP ${state.hp}/${state.maxHp}  TIER ${state.tier}  COMBO ${state.comboRank}  ENEMY ${state.enemiesLeft}  FRUIT ${state.fruits}  CRATE ${state.cratesBroken}/${state.cratesTotal}  BGM ${state.section}`
    );
    this.messageText.setText(state.message);
  }

  destroy(): void {
    this.statsText.destroy();
    this.messageText.destroy();
  }
}
