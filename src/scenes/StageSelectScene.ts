import Phaser from 'phaser';

import { STAGE_LIST } from '../utils/constants';
import { loadSaveData } from '../utils/save';

export class StageSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private labels: Phaser.GameObjects.Text[] = [];
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('StageSelectScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#111827');

    this.add.text(width * 0.5, 92, 'ステージ選択', {
      fontSize: '44px',
      color: '#f8fafc'
    }).setOrigin(0.5);

    this.add.text(width * 0.5, 138, '左右キーで選択 / Enterで決定', {
      fontSize: '18px',
      color: '#93c5fd'
    }).setOrigin(0.5);

    const startY = height * 0.35;
    this.labels = STAGE_LIST.map((_, i) => this.add.text(width * 0.5, startY + i * 78, '', {
      fontSize: '30px',
      color: '#d1d5db'
    }).setOrigin(0.5));

    this.leftKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT) as Phaser.Input.Keyboard.Key;
    this.rightKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT) as Phaser.Input.Keyboard.Key;
    this.enterKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER) as Phaser.Input.Keyboard.Key;

    this.renderLabels();
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.leftKey)) {
      this.selectedIndex = (this.selectedIndex + STAGE_LIST.length - 1) % STAGE_LIST.length;
      this.renderLabels();
    }

    if (Phaser.Input.Keyboard.JustDown(this.rightKey)) {
      this.selectedIndex = (this.selectedIndex + 1) % STAGE_LIST.length;
      this.renderLabels();
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      const save = loadSaveData();
      const stage = STAGE_LIST[this.selectedIndex];
      if (!save.unlockedStages.includes(stage.id)) return;

      this.scene.start('StageScene', { stageId: stage.id });
    }
  }

  private renderLabels(): void {
    const save = loadSaveData();
    STAGE_LIST.forEach((stage, i) => {
      const unlocked = save.unlockedStages.includes(stage.id);
      const selected = i === this.selectedIndex;
      const prefix = selected ? '▶' : '  ';
      const lockLabel = unlocked ? '' : ' (LOCK)';

      this.labels[i].setText(`${prefix} STAGE ${stage.id}: ${stage.name}${lockLabel}`);
      this.labels[i].setColor(unlocked ? (selected ? '#fef08a' : '#e5e7eb') : '#6b7280');
    });
  }
}
