import { soundRepository } from "./SoundRepository.js";

const MUFFLE_OFF_FREQUENCY = 20000;
const DUCKED_MUSIC_FACTOR = 0;
const VOLUME_STORAGE_KEY = "balacoro_volumes";

export class AudioEngine {
  constructor(repository = soundRepository) {
    this.repository = repository;
    this.globals = repository.globals;
    this.context = null;
    this.buffers = new Map();
    this.lastPlayedAt = new Map();
    this.activeCounts = new Map();
    this.loops = new Map();
    this.schedulers = new Map();
    this.currentMusic = null;
    this.pendingMusicName = undefined;
    this.paused = false;

    this.userVolumes = { master: 1, music: 1, effects: 1 };
    try {
      const saved = JSON.parse(localStorage.getItem(VOLUME_STORAGE_KEY));
      if (saved) {
        this.userVolumes.music = saved.music ?? 1;
        this.userVolumes.effects = saved.effects ?? 1;
      }
    } catch {
      this.userVolumes = { master: 1, music: 1, effects: 1 };
    }

    const resume = () => {
      if (this.context?.state === "suspended") {
        this.context.resume();
      }
    };
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);
  }

  _ensureContext() {
    if (this.context) {
      return this.context;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextClass();
    this.context = context;

    this.masterGain = context.createGain();
    this.masterGain.gain.value =
      this.globals.masterVolume * this.userVolumes.master;
    this.masterGain.connect(context.destination);

    this.muffleGain = context.createGain();
    this.muffleGain.connect(this.masterGain);

    this.muffleFilter = context.createBiquadFilter();
    this.muffleFilter.type = "lowpass";
    this.muffleFilter.frequency.value = MUFFLE_OFF_FREQUENCY;
    this.muffleFilter.connect(this.muffleGain);

    this.duckGain = context.createGain();
    this.duckGain.connect(this.muffleFilter);

    this.musicGain = context.createGain();
    this.musicGain.gain.value =
      this.globals.musicVolume * this.userVolumes.music;
    this.musicGain.connect(this.duckGain);

    this.ambienceGain = context.createGain();
    this.ambienceGain.gain.value =
      this.globals.ambienceVolume * this.userVolumes.effects;
    this.ambienceGain.connect(this.muffleFilter);

    this.sfxGain = context.createGain();
    this.sfxGain.gain.value =
      this.globals.sfxVolume * this.userVolumes.effects;
    this.sfxGain.connect(this.masterGain);

    this.uiGain = context.createGain();
    this.uiGain.gain.value =
      this.globals.sfxVolume * this.userVolumes.effects;
    this.uiGain.connect(this.masterGain);

    return context;
  }

  _saveVolumes() {
    try {
      localStorage.setItem(
        VOLUME_STORAGE_KEY,
        JSON.stringify(this.userVolumes)
      );
    } catch {
      return;
    }
  }

  setMasterVolume(value) {
    const clamped = Math.min(Math.max(value, 0), 1);
    this.userVolumes.master = clamped;
    this._saveVolumes();
    if (this.context) {
      this.masterGain.gain.setTargetAtTime(
        this.globals.masterVolume * clamped,
        this.context.currentTime,
        0.05
      );
    }
  }

  setMusicVolume(value) {
    const clamped = Math.min(Math.max(value, 0), 1);
    this.userVolumes.music = clamped;
    this._saveVolumes();
    if (this.context) {
      this.musicGain.gain.setTargetAtTime(
        this.globals.musicVolume * clamped,
        this.context.currentTime,
        0.05
      );
    }
  }

  setEffectsVolume(value) {
    const clamped = Math.min(Math.max(value, 0), 1);
    this.userVolumes.effects = clamped;
    this._saveVolumes();
    if (!this.context) {
      return;
    }
    const now = this.context.currentTime;
    this.ambienceGain.gain.setTargetAtTime(
      this.globals.ambienceVolume * clamped,
      now,
      0.05
    );
    this.uiGain.gain.setTargetAtTime(
      this.globals.sfxVolume * clamped,
      now,
      0.05
    );
    if (!(this.paused && this.globals.pauseMuffle.sfxMuted)) {
      this.sfxGain.gain.setTargetAtTime(
        this.globals.sfxVolume * clamped,
        now,
        0.05
      );
    }
  }

  _loadBuffer(url) {
    let entry = this.buffers.get(url);
    if (!entry) {
      const context = this._ensureContext();
      entry = fetch(url)
        .then((response) => response.arrayBuffer())
        .then((data) => context.decodeAudioData(data));
      this.buffers.set(url, entry);
    }
    return entry;
  }

  _busFor(sound) {
    if (sound.kind === "music") {
      return this.musicGain;
    }
    if (sound.kind === "ambience") {
      return this.ambienceGain;
    }
    if (sound.category === "ui" || sound.pauseExempt) {
      return this.uiGain;
    }
    return this.sfxGain;
  }

  _setNodePosition(node, position) {
    if (node.positionX) {
      node.positionX.value = position.x;
      node.positionY.value = position.y ?? 0;
      node.positionZ.value = position.z;
    } else {
      node.setPosition(position.x, position.y ?? 0, position.z);
    }
  }

  setListenerPosition(position) {
    if (!this.context) {
      return;
    }
    const listener = this.context.listener;
    if (listener.positionX) {
      listener.positionX.value = position.x;
      listener.positionY.value = position.y ?? 0;
      listener.positionZ.value = position.z;
    } else {
      listener.setPosition(position.x, position.y ?? 0, position.z);
    }
  }

  play(name, options = {}) {
    const sound = this.repository.get(name);
    if (!sound?.enabled) {
      return;
    }
    if (sound.type === "song") {
      this.playMusic(name);
      return;
    }
    if (
      this.paused &&
      this.globals.pauseMuffle.sfxMuted &&
      sound.kind === "sfx" &&
      sound.category !== "ui" &&
      !sound.pauseExempt
    ) {
      return;
    }
    const context = this._ensureContext();
    const now = context.currentTime;
    const lastPlayed = this.lastPlayedAt.get(name) ?? -Infinity;
    if (now - lastPlayed < sound.minRepeatSeconds) {
      return;
    }
    if ((this.activeCounts.get(name) ?? 0) >= sound.maxSimultaneous) {
      return;
    }
    const url = this.repository.pickUrl(name);
    if (!url) {
      return;
    }
    this.lastPlayedAt.set(name, now);
    this.activeCounts.set(name, (this.activeCounts.get(name) ?? 0) + 1);
    const release = () =>
      this.activeCounts.set(
        name,
        Math.max((this.activeCounts.get(name) ?? 1) - 1, 0)
      );

    this._loadBuffer(url)
      .then((buffer) => {
        const source = context.createBufferSource();
        source.buffer = buffer;
        const gain = context.createGain();
        gain.gain.value = sound.maxVolume;

        if (sound.spatial && options.position) {
          const panner = context.createPanner();
          panner.panningModel = "equalpower";
          panner.distanceModel = "inverse";
          panner.refDistance = this.globals.spatial.refDistance;
          panner.maxDistance = this.globals.spatial.maxDistance;
          panner.rolloffFactor = this.globals.spatial.rolloffFactor;
          this._setNodePosition(panner, options.position);
          source.connect(panner);
          panner.connect(gain);
        } else {
          source.connect(gain);
        }

        gain.connect(this._busFor(sound));
        source.onended = release;
        source.start();
      })
      .catch(release);
  }

  async playMusic(name) {
    if (name && this.currentMusic?.name === name) {
      return;
    }
    const sound = name ? this.repository.get(name) : null;
    if (name && !sound?.enabled) {
      return;
    }
    this.pendingMusicName = name;
    const context = this._ensureContext();
    const now = context.currentTime;
    let startDelay = 0;

    if (this.currentMusic) {
      const previous = this.currentMusic;
      this.currentMusic = null;
      const fadeOut =
        previous.sound.fadeOutSeconds ||
        this.globals.musicTransition.fadeOutSeconds;
      const gainParam = previous.gain.gain;
      gainParam.cancelScheduledValues(now);
      gainParam.setValueAtTime(gainParam.value, now);
      gainParam.linearRampToValueAtTime(0.0001, now + fadeOut);
      try {
        previous.source.stop(now + fadeOut + 0.1);
      } catch {
        previous.source.disconnect();
      }
      startDelay = fadeOut;
    }

    if (!name) {
      return;
    }

    const url = this.repository.pickUrl(name);
    if (!url) {
      return;
    }
    const buffer = await this._loadBuffer(url);
    if (this.pendingMusicName !== name) {
      return;
    }

    const startAt = Math.max(context.currentTime, now + startDelay);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = sound.loop;
    const gain = context.createGain();
    const fadeIn = sound.fadeInSeconds ?? 0;
    if (fadeIn > 0) {
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.linearRampToValueAtTime(sound.maxVolume, startAt + fadeIn);
    } else {
      gain.gain.setValueAtTime(sound.maxVolume, startAt);
    }
    source.connect(gain);
    gain.connect(this.musicGain);
    source.onended = () => {
      if (this.currentMusic?.source !== source) {
        return;
      }
      this.currentMusic = null;
      this.onMusicEnded?.(name);
    };
    source.start(startAt);
    this.currentMusic = { name, source, gain, sound };
  }

  stopMusic() {
    this.playMusic(null);
  }

  async startLoop(name) {
    const sound = this.repository.get(name);
    if (!sound?.enabled || this.loops.has(name)) {
      return;
    }
    this.loops.set(name, "starting");
    const context = this._ensureContext();
    const url = this.repository.pickUrl(name);
    if (!url) {
      this.loops.delete(name);
      return;
    }
    const buffer = await this._loadBuffer(url);
    if (this.loops.get(name) !== "starting") {
      return;
    }

    const now = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = context.createGain();
    const fadeIn = sound.fadeInSeconds ?? 0;
    if (fadeIn > 0) {
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(sound.maxVolume, now + fadeIn);
    } else {
      gain.gain.setValueAtTime(sound.maxVolume, now);
    }
    source.connect(gain);
    gain.connect(this._busFor(sound));
    source.start(now);
    this.loops.set(name, { source, gain, sound });
  }

  stopLoop(name) {
    const loop = this.loops.get(name);
    if (!loop) {
      return;
    }
    this.loops.delete(name);
    if (loop === "starting") {
      return;
    }
    const context = this.context;
    const now = context.currentTime;
    const fadeOut = loop.sound.fadeOutSeconds ?? 0;
    const gainParam = loop.gain.gain;
    gainParam.cancelScheduledValues(now);
    gainParam.setValueAtTime(gainParam.value, now);
    gainParam.linearRampToValueAtTime(0.0001, now + Math.max(fadeOut, 0.05));
    try {
      loop.source.stop(now + Math.max(fadeOut, 0.05) + 0.1);
    } catch {
      loop.source.disconnect();
    }
  }

  isLoopActive(name) {
    return this.loops.has(name);
  }

  setLoopVolume(name, factor) {
    const loop = this.loops.get(name);
    if (!loop || loop === "starting") {
      return;
    }
    const clamped = Math.min(Math.max(factor, 0), 1);
    loop.gain.gain.setTargetAtTime(
      loop.sound.maxVolume * clamped,
      this.context.currentTime,
      0.3
    );
  }

  setHeartbeat(active) {
    if (active) {
      this.startLoop("heartbeat");
    } else {
      this.stopLoop("heartbeat");
    }
  }

  setScheduler(name, active) {
    if (active) {
      if (!this.schedulers.has(name)) {
        const interval = this.repository.rollRandomInterval(name);
        if (interval !== null) {
          this.schedulers.set(name, interval);
        }
      }
    } else {
      this.schedulers.delete(name);
    }
  }

  update(deltaSeconds) {
    if (deltaSeconds <= 0) {
      return;
    }
    for (const [name, timeLeft] of this.schedulers) {
      const remaining = timeLeft - deltaSeconds;
      if (remaining <= 0) {
        this.play(name);
        this.schedulers.set(
          name,
          this.repository.rollRandomInterval(name) ?? 9999
        );
      } else {
        this.schedulers.set(name, remaining);
      }
    }
  }

  setPaused(paused) {
    this.paused = paused;
    if (!this.context) {
      return;
    }
    const muffle = this.globals.pauseMuffle;
    const now = this.context.currentTime;
    this.muffleFilter.frequency.setTargetAtTime(
      paused ? muffle.lowpassFrequencyHz : MUFFLE_OFF_FREQUENCY,
      now,
      0.15
    );
    this.muffleGain.gain.setTargetAtTime(
      paused ? muffle.volumeMultiplier : 1,
      now,
      0.15
    );
    if (muffle.sfxMuted) {
      this.sfxGain.gain.setTargetAtTime(
        paused ? 0 : this.globals.sfxVolume * this.userVolumes.effects,
        now,
        0.1
      );
    }
  }

  duckMusic(ducked) {
    if (!this.context) {
      return;
    }
    this.duckGain.gain.setTargetAtTime(
      ducked ? DUCKED_MUSIC_FACTOR : 1,
      this.context.currentTime,
      ducked ? 1.5 : 2.5
    );
  }

  stopAll() {
    this.schedulers.clear();
    for (const name of [...this.loops.keys()]) {
      this.stopLoop(name);
    }
    this.pendingMusicName = undefined;
    if (this.currentMusic && this.context) {
      const now = this.context.currentTime;
      const gainParam = this.currentMusic.gain.gain;
      gainParam.cancelScheduledValues(now);
      gainParam.setValueAtTime(gainParam.value, now);
      gainParam.linearRampToValueAtTime(0.0001, now + 0.5);
      try {
        this.currentMusic.source.stop(now + 0.6);
      } catch {
        this.currentMusic.source.disconnect();
      }
      this.currentMusic = null;
    }
    this.duckMusic(false);
    this.setPaused(false);
  }
}

export const audio = new AudioEngine();
