export const ENEMY_SPAWN_INTERVAL = { min: 1.2, max: 2 };
export const ITEM_SPAWN_INTERVAL = { min: 60, max: 120 };
export const ENEMY_SPAWN_DISTANCE = { min: 50, max: 80 };
export const ITEM_SPAWN_DISTANCE = { min: 20, max: 50 };

export const BASE_ENEMY_HEALTH = 2;
export const ENEMY_HEALTH_GROWTH = 0.8;

export const BASE_ENEMY_DAMAGE = 10;
export const ENEMY_DAMAGE_GROWTH = 0.75;

export const PLAYER_RADIUS = 0.5;
export const ENEMY_RADIUS = 0.5;

export const DIFFICULTY_INCREASE_INTERVAL_SECONDS = 180;
export const INITIAL_DIFFICULTY = 0;

export const PLAYER_INITIAL_HEALTH = 100;
export const PLAYER_INITIAL_SPEED = 7;
export const PLAYER_INITIAL_ATTACK_SPEED = 1;
export const PLAYER_INITIAL_SHARPENING = 1;
export const PLAYER_INITIAL_HEALTH_REGEN = 0;
export const PLAYER_INITIAL_CRITICAL_DAMAGE = 0;
export const PLAYER_INITIAL_CRITICAL_CHANCE = 0;
export const PLAYER_INITIAL_LIFE_STEAL = 0;
export const INITIAL_PLAYER_SKILLS = {
  dash: { enabled: true, cooldown: 10, growthCooldown: -0.5, maxCooldown: 1 },
  energyExplosion: {
    enabled: true,
    cooldown: 15,
    damage: 1,
    range: 2,
    growthCooldown: -0.5,
    growthDamage: 0.05,
    growthRange: 0.5,
    maxCooldown: 4,
  },
  freezeExplosion: {
    enabled: true,
    cooldown: 15,
    duration: 5,
    range: 3,
    growthCooldown: -0.5,
    growthRange: 0.5,
    growthDuration: 0.05,
    maxCooldown: 3,
  },
  forceField: {
    enabled: true,
    shieldCount: 1,
    growthShieldCount: 1,
    cooldown: 15,
    growthCooldown: -0.5,
    maxCooldown: 5,
  },
  thorns: { enabled: true, damage: 1, growthDamage: 0.05 },
  glowing: { enabled: false },
  projectGlowing: { enabled: false },
};

export const PLAYER_PASSIVES = {
  health: {
    initial: PLAYER_INITIAL_HEALTH,
    increment: 10,
  },
  speed: {
    initial: PLAYER_INITIAL_SPEED,
    increment: 1,
  },
  attackSpeed: {
    initial: PLAYER_INITIAL_ATTACK_SPEED,
    increment: 0.1,
  },
  sharpening: {
    initial: PLAYER_INITIAL_SHARPENING,
    increment: 1,
  },
  healthRegen: {
    initial: PLAYER_INITIAL_HEALTH_REGEN,
    increment: 0.02,
  },
  criticalDamage: {
    initial: PLAYER_INITIAL_CRITICAL_DAMAGE,
    increment: 0.025,
  },
  criticalChance: {
    initial: PLAYER_INITIAL_CRITICAL_CHANCE,
    increment: 0.01,
  },
  lifeSteal: {
    initial: PLAYER_INITIAL_LIFE_STEAL,
    increment: 0.01,
  },
};

export const PLAYER_INITIAL_LEVEL = 1;
export const PLAYER_INITIAL_XP = 0;

export const PLAYER_LIGHT_COLOR = 0xf5e690;
export const PLAYER_LIGHT_INTENSITY_GLOWING = 5;
export const PLAYER_LIGHT_INTENSITY_NORMAL = 1;
export const PLAYER_LIGHT_DISTANCE_GLOWING = 50;
export const PLAYER_LIGHT_DISTANCE_NORMAL = 10;

export const PLAYER_COLOR = 0xffee00;
export const PLAYER_EMISSIVE_COLOR = 0xf5e690;
export const PLAYER_EMISSIVE_INTENSITY = 1.5;

export const PLAYER_XP_BASE = 10;
export const PLAYER_XP_GROWTH_RATE = 1.2;

export const PROJECTILE_SPEED_BASE = 10;
export const PROJECTILE_LIFETIME = 10;
export const PROJECTILE_DAMAGE = 1;
export const PROJECTILE_SIZE = 0.5;
export const PROJECTILE_COLOR = 0x00ff00;

export const DAY_DURATION = 360;
export const NIGHT_DURATION = 180;
export const ENABLE_MINI_VIEW = true;
