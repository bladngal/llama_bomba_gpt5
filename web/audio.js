// Web audio adapter (platform-specific) driven by events

export class AudioManager {
  constructor() {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = AC ? new AC() : null;
    this.muted = false;
    this.unlocked = false;
  }

  unlock() {
    if (!this.ctx || this.unlocked) return;
    // Resume on first user gesture to satisfy autoplay policies
    this.ctx.resume().catch(() => {});
    this.unlocked = true;
  }

  setMuted(m) { this.muted = !!m; }
  toggleMuted() { this.muted = !this.muted; return this.muted; }

  play(id, opts = {}) {
    if (!this.ctx || this.muted) return;
    // Minimal synth: short envelopes with oscillator + optional noise
    const now = this.ctx.currentTime;
    const dur = opts.dur ?? 0.12;
    const vol = opts.vol ?? 0.2;
    const freq = this._freqFor(id, opts);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = this._waveFor(id);
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);

    // Subtle click for shoot
    if (id === 'shoot') {
      const click = this.ctx.createOscillator();
      const g2 = this.ctx.createGain();
      click.type = 'square';
      click.frequency.setValueAtTime(freq * 2, now);
      g2.gain.setValueAtTime(vol * 0.1, now);
      g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
      click.connect(g2).connect(this.ctx.destination);
      click.start(now);
      click.stop(now + 0.04);
    }
  }

  _waveFor(id) {
    switch (id) {
      case 'shoot': return 'triangle';
      case 'match': return 'sine';
      case 'chain': return 'sawtooth';
      case 'bomb': return 'square';
      case 'win': return 'sine';
      case 'lose': return 'square';
      default: return 'sine';
    }
  }

  _freqFor(id, opts) {
    const base = 220; // A3
    switch (id) {
      case 'shoot': return 660; // E5
      case 'match': {
        const count = Math.max(0, (opts.count ?? 3) - 3);
        return 440 + count * 60; // rises with bigger clears
      }
      case 'chain': return 520;
      case 'win': return 784; // G5
      case 'lose': return 180;
      default: return base;
    }
  }
}
