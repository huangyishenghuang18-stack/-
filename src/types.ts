export enum GameObjectType {
  STAR = 'STAR',
  DOUBLE_BOMB = 'DOUBLE_BOMB',
  PENALTY_BOMB = 'PENALTY_BOMB',
}

export interface GameObject {
  id: string;
  type: GameObjectType;
  x: number;
  y: number;
  speed: number;
  size: number;
}

export interface GameState {
  score: number;
  multiplier: number;
  multiplierTimeRemaining: number;
  isGameOver: boolean;
  gameStarted: boolean;
  level: number;
}
