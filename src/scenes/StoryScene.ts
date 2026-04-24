import Phaser from 'phaser';

export class StoryScene extends Phaser.Scene {
  constructor() {
    super('StoryScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#111827');
    this.add.text(640, 360, 'StoryScene (WIP)', {
      fontSize: '32px',
      color: '#bfdbfe'
    }).setOrigin(0.5);
  }
}
