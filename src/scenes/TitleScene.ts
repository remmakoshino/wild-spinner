import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0b132b');

    this.add.text(width * 0.5, height * 0.26, '爆走！ワイルドスピナー', {
      fontSize: '56px',
      color: '#f8fafc',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width * 0.5, height * 0.38, 'WebGL × Phaser 3 × Tone.js', {
      fontSize: '22px',
      color: '#a5f3fc'
    }).setOrigin(0.5);

    this.add.text(width * 0.5, height * 0.58, 'クリック または ENTER でスタート', {
      fontSize: '28px',
      color: '#fde68a'
    }).setOrigin(0.5);

    this.add.text(width * 0.5, height * 0.68, '操作: 矢印キー移動 / 上でジャンプ(2段) / Shiftダッシュ / Jパリィ / Z攻撃', {
      fontSize: '18px',
      color: '#e2e8f0'
    }).setOrigin(0.5);

    const start = (): void => {
      this.scene.start('StageSelectScene');
    };

    this.input.once('pointerdown', start);
    this.input.keyboard?.once('keydown-ENTER', start);
  }
}
