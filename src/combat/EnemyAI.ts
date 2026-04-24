import Phaser from 'phaser';

export class EnemyAI {
  private direction: 1 | -1 = 1;
  private stunnedUntil = 0;

  constructor(
    private readonly enemy: Phaser.Physics.Arcade.Sprite,
    private readonly minX: number,
    private readonly maxX: number,
    private readonly speed: number
  ) {}

  update(time: number): void {
    if (time < this.stunnedUntil) {
      this.enemy.setVelocityX(0);
      return;
    }

    if (this.enemy.x <= this.minX) this.direction = 1;
    if (this.enemy.x >= this.maxX) this.direction = -1;

    this.enemy.setVelocityX(this.direction * this.speed);
    this.enemy.setFlipX(this.direction < 0);
  }

  stun(time: number, durationMs: number): void {
    this.stunnedUntil = time + durationMs;
  }

  isStunned(time: number): boolean {
    return time < this.stunnedUntil;
  }
}
