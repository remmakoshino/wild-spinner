import Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH } from './utils/constants';
import { BootScene } from './scenes/BootScene';
import { ResultScene } from './scenes/ResultScene';
import { StageScene } from './scenes/StageScene';
import { StageSelectScene } from './scenes/StageSelectScene';
import { TitleScene } from './scenes/TitleScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  backgroundColor: '#0f172a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    min: { width: 320, height: 180 },
    max: { width: 1920, height: 1080 }
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1380 },
      debug: false
    }
  },
  scene: [BootScene, TitleScene, StageSelectScene, StageScene, ResultScene]
};
