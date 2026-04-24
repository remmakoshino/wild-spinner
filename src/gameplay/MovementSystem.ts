import Phaser from 'phaser';

import {
  PLAYER_DASH_VELOCITY,
  PLAYER_JUMP_VELOCITY,
  PLAYER_MOVE_SPEED
} from '../utils/constants';

export class MovementSystem {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly jumpKey: Phaser.Input.Keyboard.Key;
  private readonly dashKey: Phaser.Input.Keyboard.Key;

  private jumpsUsed = 0;
  private dashCooldownUntil = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.cursors = this.scene.input.keyboard?.createCursorKeys() as Phaser.Types.Input.Keyboard.CursorKeys;
    this.jumpKey = this.cursors.up;
    this.dashKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT) as Phaser.Input.Keyboard.Key;
  }

  update(player: Phaser.Physics.Arcade.Sprite, time: number): void {
    const body = player.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    if (body.blocked.down || body.touching.down) {
      this.jumpsUsed = 0;
    }

    let velocityX = 0;
    if (this.cursors.left.isDown) velocityX = -PLAYER_MOVE_SPEED;
    if (this.cursors.right.isDown) velocityX = PLAYER_MOVE_SPEED;
    player.setVelocityX(velocityX);

    if (Phaser.Input.Keyboard.JustDown(this.jumpKey)) {
      if (this.jumpsUsed < 2) {
        player.setVelocityY(PLAYER_JUMP_VELOCITY);
        this.jumpsUsed += 1;
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.dashKey) && time >= this.dashCooldownUntil) {
      const facing = velocityX === 0 ? (player.flipX ? -1 : 1) : Math.sign(velocityX);
      player.setVelocityX(facing * PLAYER_DASH_VELOCITY);
      this.dashCooldownUntil = time + 650;
    }

    if (velocityX < 0) player.setFlipX(true);
    if (velocityX > 0) player.setFlipX(false);
  }
}
