import { AdaptiveMusicSystem } from './AdaptiveMusicSystem';
import { BgmSequencer } from './BgmSequencer';

export const bgmSequencer = new BgmSequencer();
export const adaptiveMusicSystem = new AdaptiveMusicSystem(bgmSequencer);
