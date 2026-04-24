export class CheckpointSystem {
  private activeIndex = 0;

  constructor(private readonly checkpoints: number[]) {}

  updateByX(playerX: number): void {
    while (
      this.activeIndex < this.checkpoints.length - 1 &&
      playerX >= this.checkpoints[this.activeIndex + 1]
    ) {
      this.activeIndex += 1;
    }
  }

  getRespawnX(): number {
    return this.checkpoints[this.activeIndex];
  }
}
