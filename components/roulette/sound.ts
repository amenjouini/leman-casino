/**
 * Tiny synthesised sound effects (no audio files): ball clicks on frets and the
 * final drop into a pocket. Created lazily after a user gesture.
 */
export class RouletteSound {
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      const len = Math.floor(this.ctx.sampleRate * 0.05);
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  unlock() {
    this.ensure();
  }

  click(volume = 0.4, pitch = 3200) {
    const ctx = this.ensure();
    if (!ctx || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = pitch * (0.9 + Math.random() * 0.2);
    filter.Q.value = 6;
    const gain = ctx.createGain();
    gain.gain.value = Math.min(0.8, volume);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
  }

  settle() {
    this.click(0.7, 1800);
    setTimeout(() => this.click(0.35, 2200), 90);
    setTimeout(() => this.click(0.15, 2500), 170);
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
  }
}
