// Gameplay and level configuration (config-driven design)

export const gameConfig = {
  colors: ['#e94f37', '#1c77c3', '#f6c945', '#48a23f', '#8e5ac8', '#ff8a00'],
  chainSpeed: 60, // px/sec
  projectileSpeed: 550, // px/sec
  pathWidth: 8,
  trajectoryPreview: true,
  scoring: { basePerOrb: 100, chainBonusStep: 50 },
  powerups: {
    bomb: { radius: 3 * 28 /* ~3 orb spacings worth in px */, stock: 3 },
    slow: { factor: 0.35, durationSec: 4, stock: 3 },
  },
};

export const levels = [
  {
    id: 'level-1',
    name: 'Level 1',
    colors: 4, // number of colors from gameConfig.colors
    chainCount: 40,
    path: [
      [120, 120], [240, 100], [360, 120], [480, 200], [600, 280], [720, 300],
      [780, 360], [700, 420], [600, 480], [480, 520], [360, 540], [240, 520],
      [160, 460], [200, 380], [280, 320], [360, 300], [440, 280], [520, 260],
      [600, 220], [680, 180], [820, 160]
    ],
    templeEndOffset: -40,
  },
];
