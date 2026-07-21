function songUrl(file) {
  return new URL(`../assets/songs/${file}`, import.meta.url).href;
}

export const SOUND_GLOBALS = {
  masterVolume: 1,
  musicVolume: 0.8,
  ambienceVolume: 0.8,
  sfxVolume: 1,
  musicTransition: {
    style: "sequential",
    fadeOutSeconds: 2.5,
    fadeInSeconds: 2.5,
  },
  pauseMuffle: {
    musicKeepsPlaying: true,
    lowpassFrequencyHz: 500,
    volumeMultiplier: 0.45,
    sfxMuted: true,
  },
  spatial: {
    refDistance: 4,
    maxDistance: 45,
    rolloffFactor: 1.2,
  },
  lowHealthHeartbeatRatio: 0.1,
  evilLaughSkullPower: 17,
};

export const SOUND_CONFIG = {
  ui: {
    uiClick: {
      enabled: true,
      type: "effect",
      files: ["ui-click.mp3"],
      maxVolume: 0.6,
      loop: false,
    },
    uiHover: {
      enabled: true,
      type: "effect",
      files: ["ui-hover.mp3"],
      maxVolume: 0.35,
      loop: false,
      minRepeatSeconds: 0.05,
    },
    uiPause: {
      enabled: true,
      type: "effect",
      files: ["ui-pause.mp3"],
      maxVolume: 0.6,
      loop: false,
    },
    uiBuy: {
      enabled: true,
      type: "effect",
      files: ["ui-buy.mp3"],
      maxVolume: 0.7,
      loop: false,
    },
    skillSelect: {
      enabled: true,
      type: "effect",
      files: ["skill-select.mp3"],
      maxVolume: 0.7,
      loop: false,
    },
    levelupSelect: {
      enabled: true,
      type: "effect",
      files: ["levelup-select.mp3"],
      maxVolume: 0.7,
      loop: false,
    },
    chestPickup: {
      enabled: true,
      type: "effect",
      files: ["chest-pickup.mp3"],
      maxVolume: 0.8,
      loop: false,
    },
    coin: {
      enabled: false,
      type: "effect",
      files: ["coin.mp3"],
      maxVolume: 0.4,
      loop: false,
      minRepeatSeconds: 0.08,
      maxSimultaneous: 3,
    },
    musicMenu: {
      enabled: true,
      type: "song",
      files: ["music-menu.mp3"],
      maxVolume: 0.5,
      loop: true,
      kind: "music",
      fadeInSeconds: 1.5,
      fadeOutSeconds: 1.5,
    },
    musicGameOver: {
      enabled: true,
      type: "song",
      files: ["music-game-over.mp3"],
      maxVolume: 0.8,
      loop: false,
      kind: "music",
      fadeInSeconds: 0,
      fadeOutSeconds: 2,
    },
  },

  player: {
    playerShoot: {
      enabled: true,
      type: "effect",
      files: ["player-shoot.mp3"],
      maxVolume: 0.3,
      loop: false,
      minRepeatSeconds: 0.04,
      maxSimultaneous: 4,
    },
    playerHurt: {
      enabled: true,
      type: "effect",
      files: ["player-hurt.mp3"],
      maxVolume: 0.8,
      loop: false,
      minRepeatSeconds: 0.25,
    },
    playerLevelUp: {
      enabled: true,
      type: "effect",
      files: ["player-levelup.mp3"],
      maxVolume: 0.5,
      loop: false,
      pauseExempt: true,
    },
    playerDash: {
      enabled: true,
      type: "effect",
      files: ["player-dash.mp3"],
      maxVolume: 0.6,
      loop: false,
    },
    skillEnergyExplosion: {
      enabled: true,
      type: "effect",
      files: ["skill-energy-explosion.mp3"],
      maxVolume: 0.7,
      loop: false,
    },
    skillFreezeExplosion: {
      enabled: true,
      type: "effect",
      files: ["skill-freeze-explosion.mp3"],
      maxVolume: 0.7,
      loop: false,
    },
    thornsHit: {
      enabled: true,
      type: "effect",
      files: ["thorns-hit.mp3"],
      maxVolume: 0.5,
      loop: false,
      minRepeatSeconds: 0.2,
    },
    shieldBreak: {
      enabled: true,
      type: "effect",
      files: ["shield-break.mp3"],
      maxVolume: 0.75,
      loop: false,
    },
    shieldGain: {
      enabled: true,
      type: "effect",
      files: ["shield-gain.mp3"],
      maxVolume: 0.6,
      loop: false,
    },
    heartbeat: {
      enabled: true,
      type: "effect",
      files: ["hearth.mp3"],
      maxVolume: 0.9,
      loop: true,
      fadeInSeconds: 0.6,
      fadeOutSeconds: 1.2,
      healthRatioThreshold: 0.1,
    },
    playerDeath: {
      enabled: true,
      type: "effect",
      files: ["player-death.mp3"],
      maxVolume: 0.9,
      loop: false,
      pauseExempt: true,
    },
  },

  enemies: {
    enemyHit: {
      enabled: true,
      type: "effect",
      files: ["enemy-hit.mp3"],
      maxVolume: 0.4,
      loop: false,
      spatial: true,
      minRepeatSeconds: 0.05,
      maxSimultaneous: 5,
    },
    enemyCrit: {
      enabled: true,
      type: "effect",
      files: ["enemy-crit1.mp3", "enemy-crit2.mp3"],
      randomPick: true,
      maxVolume: 0.6,
      loop: false,
      spatial: true,
      minRepeatSeconds: 0.08,
      maxSimultaneous: 4,
    },
    enemyDeath: {
      enabled: true,
      type: "effect",
      files: ["enemy-death.mp3"],
      maxVolume: 0.5,
      loop: false,
      spatial: true,
      minRepeatSeconds: 0.06,
      maxSimultaneous: 5,
    },
    mimicAwake: {
      enabled: true,
      type: "effect",
      files: ["mimic-wake.mp3"],
      maxVolume: 0.85,
      loop: false,
      spatial: true,
    },
    mimicHit: {
      enabled: true,
      type: "effect",
      files: ["mimic-wake.mp3"],
      maxVolume: 0.6,
      loop: false,
      spatial: true,
      minRepeatSeconds: 0.9,
    },
    bossSpawn: {
      enabled: true,
      type: "effect",
      files: ["boss-spawn.mp3"],
      maxVolume: 0.9,
      loop: false,
    },
    bossAttack: {
      enabled: true,
      type: "effect",
      files: ["boss-attack.mp3"],
      maxVolume: 0.8,
      loop: false,
      spatial: true,
      minRepeatSeconds: 0.8,
    },
    bossTelegraph: {
      enabled: true,
      type: "effect",
      files: ["boss-telegraph.mp3"],
      maxVolume: 0.8,
      loop: false,
      spatial: true,
    },
    bossSummon: {
      enabled: true,
      type: "effect",
      files: ["boss-summon.mp3"],
      maxVolume: 0.8,
      loop: false,
      spatial: true,
    },
    bossDeath: {
      enabled: true,
      type: "effect",
      files: ["boss-death.mp3"],
      maxVolume: 0.95,
      loop: false,
      spatial: true,
    },
  },

  environment: {
    eventDay: {
      enabled: true,
      type: "effect",
      files: ["event-day.mp3"],
      maxVolume: 0.6,
      loop: false,
    },
    musicDay: {
      enabled: true,
      type: "song",
      files: ["music-day.mp3"],
      maxVolume: 0.55,
      loop: true,
      kind: "music",
      fadeInSeconds: 3,
      fadeOutSeconds: 3,
    },
    eventNightfall: {
      enabled: true,
      type: "effect",
      files: ["event-nightfall.mp3"],
      maxVolume: 0.65,
      loop: false,
    },
    musicNight: {
      enabled: true,
      type: "song",
      files: ["music-night.mp3"],
      maxVolume: 0.55,
      loop: true,
      kind: "music",
      fadeInSeconds: 3,
      fadeOutSeconds: 3,
    },
    ambienceNight: {
      enabled: true,
      type: "effect",
      files: ["ambience-night.mp3"],
      maxVolume: 0.45,
      loop: false,
      kind: "ambience",
      randomPlay: { intervalSeconds: { min: 18, max: 45 } },
    },
    eventBloodMoon: {
      enabled: true,
      type: "effect",
      files: ["event-blood-moon.mp3"],
      maxVolume: 0.85,
      loop: false,
    },
    musicBloodMoon: {
      enabled: true,
      type: "song",
      files: ["music-blood-moon.mp3"],
      maxVolume: 0.65,
      loop: false,
      kind: "music",
      fadeInSeconds: 2,
      fadeOutSeconds: 3,
    },
    ambienceBloodmoon: {
      enabled: true,
      type: "effect",
      files: ["ambience-bloodmoon.mp3"],
      maxVolume: 0.5,
      loop: false,
      kind: "ambience",
      randomPlay: { intervalSeconds: { min: 12, max: 30 } },
    },
    creepyEffectBloodmoon: {
      enabled: true,
      type: "effect",
      files: ["creppy_effect.mp3", "creepy_effect1.mp3"],
      randomPick: true,
      maxVolume: 0.55,
      loop: false,
      kind: "ambience",
      randomPlay: { intervalSeconds: { min: 20, max: 50 } },
    },
    eventMist: {
      enabled: true,
      type: "effect",
      files: ["event-mist.mp3"],
      maxVolume: 0.7,
      loop: false,
    },
    ambienceMist: {
      enabled: true,
      type: "effect",
      files: ["ambience-mist.mp3"],
      maxVolume: 0.6,
      loop: true,
      kind: "ambience",
      fadeInSeconds: 2.5,
      fadeOutSeconds: 2.5,
    },
    creepyEffectMist: {
      enabled: true,
      type: "effect",
      files: ["creppy_effect.mp3", "creepy_effect1.mp3"],
      randomPick: true,
      maxVolume: 0.5,
      loop: false,
      kind: "ambience",
      randomPlay: { intervalSeconds: { min: 15, max: 40 } },
    },
  },

  weather: {
    ambienceRain: {
      enabled: true,
      type: "effect",
      files: ["ambience-rain.mp3"],
      maxVolume: 0.55,
      loop: true,
      kind: "ambience",
      fadeInSeconds: 2,
      fadeOutSeconds: 2,
    },
    thunder: {
      enabled: true,
      type: "effect",
      files: ["thunder1.mp3", "thunder2.mp3"],
      randomPick: true,
      maxVolume: 0.75,
      loop: false,
      kind: "ambience",
      randomPlay: { intervalSeconds: { min: 10, max: 35 } },
    },
    desertWind: {
      enabled: true,
      type: "effect",
      files: ["ambience-desert-wind1.mp3", "ambience-desert-wind2.mp3"],
      randomPick: true,
      maxVolume: 0.5,
      loop: false,
      kind: "ambience",
      randomPlay: { intervalSeconds: { min: 8, max: 25 } },
    },
    ambienceSnowWind: {
      enabled: true,
      type: "effect",
      files: ["ambience-snow-wind.mp3"],
      maxVolume: 0.5,
      loop: true,
      kind: "ambience",
      fadeInSeconds: 2,
      fadeOutSeconds: 2,
    },
    snowWindGust: {
      enabled: true,
      type: "effect",
      files: ["ambience-snow-wind1.mp3", "ambience-snow-wind2.mp3"],
      randomPick: true,
      maxVolume: 0.55,
      loop: false,
      kind: "ambience",
      randomPlay: { intervalSeconds: { min: 10, max: 30 } },
    },
  },

  skull: {
    evilLaugh: {
      enabled: true,
      type: "effect",
      files: ["evil_laught.mp3"],
      maxVolume: 0.85,
      loop: false,
      skullPowerTrigger: 17,
      randomPlay: { intervalSeconds: { min: 20, max: 50 } },
    },
  },

};

const SOUND_DEFAULTS = {
  enabled: true,
  type: "effect",
  pauseExempt: false,
  maxVolume: 1,
  loop: false,
  kind: "sfx",
  spatial: false,
  randomPick: false,
  activeFileIndex: 0,
  fadeInSeconds: 0,
  fadeOutSeconds: 0,
  minRepeatSeconds: 0,
  maxSimultaneous: Infinity,
  randomPlay: null,
};

export class SoundRepository {
  constructor(config = SOUND_CONFIG, globals = SOUND_GLOBALS) {
    this.globals = globals;
    this.sounds = new Map();
    this.categories = new Map();

    for (const [categoryName, categorySounds] of Object.entries(config)) {
      const names = [];
      for (const [soundName, soundConfig] of Object.entries(categorySounds)) {
        this.sounds.set(soundName, {
          ...SOUND_DEFAULTS,
          ...soundConfig,
          name: soundName,
          category: categoryName,
          urls: soundConfig.files.map(songUrl),
        });
        names.push(soundName);
      }
      this.categories.set(categoryName, names);
    }
  }

  get(name) {
    return this.sounds.get(name) ?? null;
  }

  isEnabled(name) {
    return this.get(name)?.enabled === true;
  }

  setEnabled(name, enabled) {
    const sound = this.get(name);
    if (sound) {
      sound.enabled = enabled;
    }
  }

  pickUrl(name) {
    const sound = this.get(name);
    if (!sound || !sound.enabled) {
      return null;
    }
    if (sound.urls.length === 1) {
      return sound.urls[0];
    }
    if (sound.randomPick) {
      return sound.urls[Math.floor(Math.random() * sound.urls.length)];
    }
    return sound.urls[Math.min(sound.activeFileIndex, sound.urls.length - 1)];
  }

  getCategory(categoryName) {
    const names = this.categories.get(categoryName) ?? [];
    return names.map((name) => this.sounds.get(name));
  }

  getByType(type) {
    return [...this.sounds.values()].filter((sound) => sound.type === type);
  }

  setTypeEnabled(type, enabled) {
    for (const sound of this.getByType(type)) {
      sound.enabled = enabled;
    }
  }

  getAll() {
    return [...this.sounds.values()];
  }

  rollRandomInterval(name) {
    const sound = this.get(name);
    if (!sound?.randomPlay) {
      return null;
    }
    const { min, max } = sound.randomPlay.intervalSeconds;
    return min + Math.random() * (max - min);
  }
}

export const soundRepository = new SoundRepository();
