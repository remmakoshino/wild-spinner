export type ComboRank = 'D' | 'C' | 'B' | 'A' | 'S';

export class ComboSystem {
  private combo = 0;
  private lastHitAt = 0;

  registerHit(time: number): void {
    if (time - this.lastHitAt > 1500) {
      this.combo = 0;
    }

    this.combo += 1;
    this.lastHitAt = time;
  }

  update(time: number): void {
    if (this.combo > 0 && time - this.lastHitAt > 1800) {
      this.combo = 0;
    }
  }

  getRank(): ComboRank {
    if (this.combo >= 12) return 'S';
    if (this.combo >= 8) return 'A';
    if (this.combo >= 5) return 'B';
    if (this.combo >= 3) return 'C';
    return 'D';
  }

  getCount(): number {
    return this.combo;
  }
}
