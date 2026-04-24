import Phaser from 'phaser';

interface ResultData {
  stageId: number;
  clearTimeMs: number;
  tierBefore: number;
  tierAfter: number;
  fruitsCollected?: number;
  cratesBroken?: number;
  cratesTotal?: number;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  create(data: ResultData): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1f2937');

    this.add.text(width * 0.5, height * 0.24, 'ステージクリア！', {
      fontSize: '56px',
      color: '#fef3c7',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width * 0.5, height * 0.40, `STAGE ${data.stageId}`, {
      fontSize: '30px',
      color: '#dbeafe'
    }).setOrigin(0.5);

    this.add.text(width * 0.5, height * 0.48, `クリアタイム: ${(data.clearTimeMs / 1000).toFixed(2)} 秒`, {
      fontSize: '26px',
      color: '#e5e7eb'
    }).setOrigin(0.5);

    this.add.text(width * 0.5, height * 0.56, `難易度ティア: ${data.tierBefore} → ${data.tierAfter}`, {
      fontSize: '28px',
      color: '#93c5fd'
    }).setOrigin(0.5);

    this.add.text(
      width * 0.5,
      height * 0.63,
      `フルーツ: ${data.fruitsCollected ?? 0}  クレート: ${data.cratesBroken ?? 0}/${data.cratesTotal ?? 0}`,
      {
        fontSize: '24px',
        color: '#bbf7d0'
      }
    ).setOrigin(0.5);

    this.add.text(width * 0.5, height * 0.74, 'ENTERでステージ選択へ', {
      fontSize: '24px',
      color: '#fde68a'
    }).setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () => {
      this.scene.start('StageSelectScene');
    });
  }
}
