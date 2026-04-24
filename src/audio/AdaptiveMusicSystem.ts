import { BgmSection, BgmSequencer } from './BgmSequencer';
import { ThreatTier } from '../utils/difficulty';

export class AdaptiveMusicSystem {
  constructor(private readonly bgm: BgmSequencer) {}

  setThreatTier(tier: ThreatTier): void {
    this.bgm.setThreatTier(tier);
  }

  setSection(section: BgmSection): void {
    this.bgm.transitionTo(section);
  }
}
