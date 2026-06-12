/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioSystem {
  private ctx: AudioContext | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private musicInterval: any = null;
  private isMusicPlaying: boolean = false;
  private ambientBuffers: AudioBuffer[] = [];

  constructor() {}

  // Lazily initialize AudioContext to comply with browser autoplay policies
  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play a beautiful synthesized bronze bell (编钟) with metallic overtones
  public playBell(frequency: number = 440, duration: number = 2.5) {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Physical chime resonance has multiple non-harmonic overtones:
    // f1=f0, f2=1.52*f0, f3=2.01*f0, f4=2.7*f0, f5=3.28*f0
    const overtones = [1.0, 1.52, 2.01, 2.72, 3.28];
    const gains = [1.0, 0.45, 0.35, 0.2, 0.1];
    const decays = [1.0, 0.7, 0.5, 0.4, 0.25];

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.35, now + 0.01);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    masterGain.connect(this.ctx.destination);

    overtones.forEach((multiplier, i) => {
      const osc = this.ctx!.createOscillator();
      const oscGain = this.ctx!.createGain();
      
      // Use triangle waveform for clean bell tones or sine
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(frequency * multiplier, now);

      oscGain.gain.setValueAtTime(gains[i] * 0.5, now);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * decays[i]);

      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start(now);
      osc.stop(now + duration + 0.1);
    });
  }

  // Synthesize a heavy bronze drum strike
  public playDrum(duration: number = 1.2) {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    // Sudden rapid pitch sweep down mimics a large membrane
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.2);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.8, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Apply distortion or bandpass filter to give it vintage resonance
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.1);
    
    // Add sub metal-on-metal punch
    this.playIronClank(now);
  }

  // Minor iron percussion element to accent cards and drums
  private playIronClank(time: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(680, time);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, time);
    filter.Q.setValueAtTime(5, time);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.08, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(time);
    osc.stop(time + 0.2);
  }

  // Synthesize card slide whoosh
  public playWhoosh() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.4; // 0.4 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1; // White noise
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    // Sweep frequency up then down to simulate motion
    filter.frequency.setValueAtTime(120, now);
    filter.frequency.exponentialRampToValueAtTime(900, now + 0.15);
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.4);
    filter.Q.setValueAtTime(2.0, now);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.45);
  }

  // Synthesize bonfire sizzle (烈火灼烧)
  public playSizzle(durationMs: number = 1000) {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = durationMs / 1000;
    
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2500, now);
    filter.frequency.linearRampToValueAtTime(1800, now + duration);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.1);
    gainNode.gain.setValueAtTime(0.12, now + duration - 0.2);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    // Dynamic crumbles (sparks)
    const modulator = this.ctx.createOscillator();
    modulator.type = 'sawtooth';
    modulator.frequency.setValueAtTime(25, now);
    const modGain = this.ctx.createGain();
    modGain.gain.setValueAtTime(800, now);
    
    modulator.connect(modGain);
    modGain.connect(filter.frequency);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    modulator.start(now);
    noise.start(now);
    
    modulator.stop(now + duration);
    noise.stop(now + duration);
  }

  // Tortoise bone crack/crackling sounds (卜兆龟裂声)
  public playCrack() {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Play multiple tiny high-passed ticks separated by milliseconds
    for (let i = 0; i < 4; i++) {
      const delay = i * 0.08 + Math.random() * 0.05;
      const tickTime = now + delay;
      
      const bufferSize = this.ctx.sampleRate * 0.04; // Very short click
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(6000 - i * 1000, tickTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15 / (i + 1), tickTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, tickTime + 0.03);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(tickTime);
      noise.stop(tickTime + 0.05);
    }
  }

  // Soft mystical ambient background wind
  public startAmbient() {
    this.init();
    if (!this.ctx) return;
    if (this.ambientOsc) return;

    const now = this.ctx.currentTime;
    
    const bufferSize = this.ctx.sampleRate * 4; // 4 second loop
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
       data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Resonant bandpass filter creates that howling temple cave wind
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(150, now);
    filter.Q.setValueAtTime(4, now);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0, now);
    this.ambientGain.gain.linearRampToValueAtTime(0.03, now + 2.0); // Slow fade in

    // Sweep wind speed slowly over time
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.08, now); // ultra slow LFO
    
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(50, now);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    
    noise.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.ctx.destination);

    lfo.start(now);
    noise.start(now);
    
    this.ambientOsc = noise as any; // Cast for ref
  }

  public stopAmbient() {
    if (this.ambientGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.ambientGain.gain.cancelScheduledValues(now);
      this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, now);
      this.ambientGain.gain.linearRampToValueAtTime(0, now + 1.0);
      setTimeout(() => {
        if (this.ambientOsc) {
          try { this.ambientOsc.stop(); } catch(e){}
          this.ambientOsc = null;
        }
        this.ambientGain = null;
      }, 1100);
    }
  }

  // Play continuous solemn melody using ancient chime pentatonic rules (编钟古调)
  // Pentatonic notes frequencies derived from low drone scale (宫 G, 商 A, 角 B, 征 D, 羽 E)
  public startSacredMusic() {
    if (this.isMusicPlaying) return;
    this.init();
    this.isMusicPlaying = true;

    const scale = [
      196.00, // G3
      220.00, // A3
      246.94, // B3
      293.66, // D4
      329.63, // E4
      392.00, // G4
      440.00, // A4
      493.88, // B4
      587.33, // D5
      659.25,  // E5
    ];

    let noteIndex = 0;
    const playNextNote = () => {
      if (!this.isMusicPlaying) return;

      // Weighted random step in G Pentatonic
      const coin = Math.random();
      if (coin < 0.3) {
        // Step up
        noteIndex = (noteIndex + 1) % scale.length;
      } else if (coin < 0.6) {
        // Step down
        noteIndex = (noteIndex - 1 + scale.length) % scale.length;
      } else if (coin < 0.82) {
        // Leap
        noteIndex = Math.floor(Math.random() * scale.length);
      } // else stay on note

      const pitch = scale[noteIndex];
      
      // Dynamic tempo: slower, majestic ceremonial notes
      const accent = Math.random() > 0.7;
      const decay = accent ? 3.5 : 2.0;
      this.playBell(pitch, decay);

      // occasionally play a parallel five (bell resonance resonance)
      if (Math.random() > 0.8) {
        const fifthPos = (noteIndex + 3) % scale.length;
        setTimeout(() => {
          this.playBell(scale[fifthPos] * 0.5, 3.0);
        }, 150);
      }

      // occasionally accent with a heavy low bronze drum
      if (Math.random() > 0.9) {
        setTimeout(() => {
          this.playDrum(1.8);
        }, 400);
      }

      const nextInterval = accent ? 1800 : 1200;
      this.musicInterval = setTimeout(playNextNote, nextInterval);
    };

    playNextNote();
  }

  public stopSacredMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearTimeout(this.musicInterval);
      this.musicInterval = null;
    }
  }

  // Play victory chime flourish
  public playVictoryCeremony() {
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const notes = [293.66, 329.63, 392.00, 440.00, 493.88, 587.33, 659.25]; // Rising scales
    
    notes.forEach((pitch, i) => {
      setTimeout(() => {
        this.playBell(pitch, 3.5 - (i * 0.2));
      }, i * 180);
    });

    setTimeout(() => {
       this.playDrum(2.5);
    }, 1200);
  }

  // Play loss decay discordance
  public playDefeatCeremony() {
    this.init();
    if (!this.ctx) return;
    
    // Play dark heavy drum, then a sliding flat low-pitch oscillator
    this.playDrum(3.0);
    const now = this.ctx.currentTime;
    
    // Low discord drone
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(92, now + 0.3);
    osc1.frequency.linearRampToValueAtTime(55, now + 2.5);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(95, now + 0.3);
    osc2.frequency.linearRampToValueAtTime(53, now + 2.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now + 0.2);
    osc2.start(now + 0.2);
    osc1.stop(now + 2.7);
    osc2.stop(now + 2.7);

    // sizzling decay
    setTimeout(() => {
      this.playSizzle(1500);
    }, 600);
  }
}

export const GlobalAudio = new AudioSystem();
