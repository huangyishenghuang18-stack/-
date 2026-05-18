export const GAME_CONSTANTS = {
  GRAVITY: 3,
  SPAWN_INTERVAL: 800,
  LEVELS: [
    { minScore: 0, speedMult: 1, penaltyChance: 0.05, doubleChance: 0.02, label: 'Entry' },
    { minScore: 300, speedMult: 1.2, penaltyChance: 0.08, doubleChance: 0.025, label: 'Novice' },
    { minScore: 800, speedMult: 1.5, penaltyChance: 0.12, doubleChance: 0.03, label: 'Expert' },
    { minScore: 1800, speedMult: 1.8, penaltyChance: 0.18, doubleChance: 0.035, label: 'Elite' },
    { minScore: 3500, speedMult: 2.2, penaltyChance: 0.25, doubleChance: 0.04, label: 'Master' },
  ],
  MULTIPLIER_DURATION: 10,
  PLAYER_SIZE: 64,
  ITEM_SIZE: 32,
  COLORS: {
    BACKGROUND: '#050505',
    STAR: '#ffd700',
    DOUBLE_BOMB: '#ff4e00',
    PENALTY_BOMB: '#ff0055',
    PLAYER: '#ffffff',
    UI_TEXT: '#ffffff',
  },
};
