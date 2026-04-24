import { getAllStageDefinitions } from '../gameplay/stageDefinitions';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const WORLD_WIDTH = 3200;
export const WORLD_HEIGHT = 900;

export const STAGE_LIST = getAllStageDefinitions().map((stage) => ({
  id: stage.id,
  name: stage.name
}));

export const PLAYER_BASE_HP = 8;
export const PLAYER_MOVE_SPEED = 280;
export const PLAYER_JUMP_VELOCITY = -560;
export const PLAYER_DASH_VELOCITY = 560;
