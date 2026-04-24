import Phaser from 'phaser';

export class BonusScene extends Phaser.Scene {
  constructor() {
    super('BonusScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0f172a');
    this.add.text(640, 360, 'BonusScene (WIP)', {
      fontSize: '32px',
      color: '#e2e8f0'
    }).setOrigin(0.5);
  }
}
