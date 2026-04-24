import Phaser from 'phaser';

export class DodgeParrySystem {
  private readonly parryKey: Phaser.Input.Keyboard.Key;
  private parryWindowMs = 160;
  private activeUntil = 0;
  private cooldownUntil = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.parryKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.J) as Phaser.Input.Keyboard.Key;
  }

  setParryWindowMs(ms: number): void {
    this.parryWindowMs = Phaser.Math.Clamp(ms, 100, 230);
  }

  update(time: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.parryKey) && time >= this.cooldownUntil) {
      this.activeUntil = time + this.parryWindowMs;
      this.cooldownUntil = time + 750;
    }
  }

  isParryActive(time: number): boolean {
    return time <= this.activeUntil;
  }
}
