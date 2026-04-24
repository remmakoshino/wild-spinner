import Phaser from 'phaser';

import { bindAudioUnlock } from './audio/AudioUnlockGate';
import { bgmSequencer } from './audio/runtime';
import { gameConfig } from './config';
import './style.css';

const mountNode = document.querySelector<HTMLDivElement>('#app');
if (!mountNode) {
  throw new Error('マウントノード #app が見つかりません');
}

const game = new Phaser.Game({
  ...gameConfig,
  parent: mountNode
});

bindAudioUnlock(document.body, async () => {
  await bgmSequencer.unlockAndStart();
  bgmSequencer.transitionTo('explore');
});

window.addEventListener('beforeunload', () => {
  bgmSequencer.dispose();
  game.destroy(true);
});
