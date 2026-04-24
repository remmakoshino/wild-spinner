import Phaser from 'phaser';

export class BossScene extends Phaser.Scene {
  constructor() {
    super('BossScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1f2937');
    this.add.text(640, 360, 'BossScene (WIP)', {
      fontSize: '32px',
      color: '#fde68a'
    }).setOrigin(0.5);
  }
}
