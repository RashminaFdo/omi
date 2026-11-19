// Lightweight Web Audio API synthesized sound effects for Sri Lankan Omi
// No external audio files required — works offline & zero broken links.

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.7;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.enabled || this.volume <= 0) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public configure(enabled: boolean, volume: number) {
    this.enabled = enabled;
    this.volume = Math.max(0, Math.min(1, volume));
  }

  public playClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.045);
    gain.gain.setValueAtTime(0.12 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playCardDeal() {
    const ctx = this.getContext();
    if (!ctx) return;
    // Crisp filtered white-noise swish x4 rapid flicks
    for (let i = 0; i < 4; i++) {
      const start = ctx.currentTime + i * 0.065;
      const bufferSize = Math.floor(ctx.sampleRate * 0.055);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize * 0.35));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1900 + i * 180, start);
      filter.Q.setValueAtTime(1.4, start);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.28 * this.volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.055);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(start);
    }
  }

  public playCardSlap(isCut = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Tactile wooden table card slap (short noise burst + low punch)
    const bufferSize = Math.floor(ctx.sampleRate * 0.07);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(isCut ? 2600 : 1700, now);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime((isCut ? 0.45 : 0.3) * this.volume, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);

    // Low felt thump
    const osc = ctx.createOscillator();
    const oGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(isCut ? 190 : 140, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.08);
    oGain.gain.setValueAtTime((isCut ? 0.42 : 0.25) * this.volume, now);
    oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    osc.connect(oGain);
    oGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);

    // Extra metallic ping when cutting (Kapanawa!)
    if (isCut) {
      const ping = ctx.createOscillator();
      const pGain = ctx.createGain();
      ping.type = "sine";
      ping.frequency.setValueAtTime(880, now + 0.02);
      ping.frequency.exponentialRampToValueAtTime(1320, now + 0.14);
      pGain.gain.setValueAtTime(0.18 * this.volume, now + 0.02);
      pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      ping.connect(pGain);
      pGain.connect(ctx.destination);
      ping.start(now + 0.02);
      ping.stop(now + 0.19);
    }
  }

  public playTrumpCall() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A major resonant chime
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.18 * this.volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  public playTrickWin(isMyTeam: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = isMyTeam ? [523.25, 659.25, 783.99] : [392.0, 329.63];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.16 * this.volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  }

  public playSeporu() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [349.23, 415.3, 466.16];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.16 * this.volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  public playKapothiFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const melody = [
      { f: 523.25, t: 0, d: 0.14 },
      { f: 659.25, t: 0.12, d: 0.14 },
      { f: 783.99, t: 0.24, d: 0.14 },
      { f: 1046.5, t: 0.38, d: 0.48 },
      { f: 783.99, t: 0.38, d: 0.48 },
      { f: 659.25, t: 0.38, d: 0.48 },
    ];
    melody.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(n.f, now + n.t);
      gain.gain.setValueAtTime(0.2 * this.volume, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.02);
    });
  }
}

export const soundEngine = new SoundEngine();
