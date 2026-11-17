/** Audio sintetis lokal Kafe Hantu: hangat, pelan, tanpa rekaman atau jaringan. */
export class CafeAudio {
  private audio: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sources: AudioScheduledSourceNode[] = [];
  private muted = false;
  private started = false;
  private ambientTimer: ReturnType<typeof setTimeout> | null = null;

  unlock() {
    try {
      this.audio ??= new AudioContext();
      if (this.audio.state === 'suspended') void this.audio.resume();
      this.master ??= this.audio.createGain();
      this.master.gain.value = this.muted ? 0 : .34;
      this.master.connect(this.audio.destination);
      if (!this.started) {
        this.started = true;
        this.startAmbient();
      }
    } catch { /* audio opsional; game tetap berjalan */ }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.audio) this.master.gain.setTargetAtTime(muted ? 0 : .34, this.audio.currentTime, .05);
  }

  stop() {
    if (this.ambientTimer) clearTimeout(this.ambientTimer);
    this.ambientTimer = null;
    for (const source of this.sources) { try { source.stop(); } catch {} }
    this.sources = [];
    try { void this.audio?.close(); } catch {}
    this.audio = null; this.master = null; this.ambientGain = null; this.started = false;
  }

  private startAmbient() {
    if (!this.audio || !this.master) return;
    const ctx = this.audio;
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = .16;
    this.ambientGain.connect(this.master);

    // Alunan ruangan: dua sinus rendah yang saling bergeser, ditambah noise saring sangat pelan.
    for (const [frequency, gain, detune] of [[55, .018, 0], [82.5, .012, 4], [110, .007, -3]] as const) {
      const osc = ctx.createOscillator(); const volume = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = frequency; osc.detune.value = detune;
      volume.gain.value = gain; osc.connect(volume); volume.connect(this.ambientGain); osc.start();
      this.sources.push(osc);
    }
    const length = Math.floor(ctx.sampleRate * 2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buffer; noise.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 260; filter.Q.value = .7;
    const noiseGain = ctx.createGain(); noiseGain.gain.value = .035;
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(this.ambientGain); noise.start(); this.sources.push(noise);

    // Denting gelas dan bel pintu yang jarang, sangat pelan.
    const pulse = () => {
      if (!this.audio || this.audio.state !== 'running') return;
      if (!this.muted) {
        if (Math.random() < .68) this.chime([523, 784], .012, 1.5);
        else this.chime([659], .008, 1.1);
      }
      this.ambientTimer = setTimeout(pulse, 5800 + Math.random() * 9000);
    };
    this.ambientTimer = setTimeout(pulse, 4200);
  }

  private tone(frequency: number, duration: number, volume: number, type: OscillatorType = 'sine', slide?: number, delay = 0) {
    if (!this.audio || !this.master || this.muted) return;
    const ctx = this.audio, at = ctx.currentTime + delay;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, at);
    if (slide !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slide), at + duration);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + .015);
    gain.gain.exponentialRampToValueAtTime(.0008, at + duration);
    osc.connect(gain); gain.connect(this.master); osc.start(at); osc.stop(at + duration + .03);
  }

  private chime(notes: number[], volume = .018, duration = .42) {
    notes.forEach((note, i) => this.tone(note, duration, volume, 'sine', undefined, i * .055));
  }

  private whisper() {
    if (!this.audio || !this.master || this.muted) return;
    const ctx = this.audio, at = ctx.currentTime;
    const length = Math.floor(ctx.sampleRate * .55), buffer = ctx.createBuffer(1, length, ctx.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource(); source.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 880; filter.Q.value = 1.4;
    const gain = ctx.createGain(); gain.gain.setValueAtTime(.012, at); gain.gain.exponentialRampToValueAtTime(.0005, at + .5);
    source.connect(filter); filter.connect(gain); gain.connect(this.master); source.start(); source.stop(at + .55);
    this.tone(392, .38, .01, 'sine', 466, .08);
  }

  private pour() {
    if (!this.audio || !this.master || this.muted) return;
    const ctx = this.audio, at = ctx.currentTime;
    const length = Math.floor(ctx.sampleRate * .32), buffer = ctx.createBuffer(1, length, ctx.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * .7;
    const source = ctx.createBufferSource(); source.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 420; filter.Q.value = .8;
    const gain = ctx.createGain(); gain.gain.setValueAtTime(.018, at); gain.gain.exponentialRampToValueAtTime(.001, at + .3);
    source.connect(filter); filter.connect(gain); gain.connect(this.master); source.start(); source.stop(at + .34);
  }

  update(previous: any, next: any, info: {operator: boolean; muted: boolean}) {
    const muted = info.muted || !!next?.soundMuted;
    if (this.muted !== muted) this.setMuted(muted);
    if (!this.audio || muted) return;
    const before = previous?.game, game = next?.game;
    if (!game || !before || previous?.gameInstanceId !== next?.gameInstanceId) return;
    if (!this.started) { this.started = true; this.startAmbient(); }
    if (before.lastMarkAt !== game.lastMarkAt) this.chime([523, 659], .012, .34);
    if (before.lastListenAt !== game.lastListenAt) this.whisper();
    if (before.lastBrewAt !== game.lastBrewAt) this.pour();
    if (before.lastServeAt !== game.lastServeAt) this.chime([659, 784, 1047], .018, .6);
    if (before.lastMistakeAt !== game.lastMistakeAt) {
      this.tone(330, .26, .012, 'triangle', 247);
      this.tone(220, .45, .008, 'sine', 196, .08);
    }
    if (!before.finished && game.finished) {
      [523, 659, 784, 1047, 1319].forEach((note, i) => this.tone(note, .8, .014, 'sine', undefined, .12 + i * .13));
      this.chime([392, 523], .012, 1.1);
    }
  }
}
