export class AudioManager {
  constructor() {
    this.context = null;
  }

  async arm() {
    if (typeof window === "undefined") {
      return;
    }

    const AudioContextRef = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextRef) {
      return;
    }

    if (!this.context) {
      this.context = new AudioContextRef();
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  play(cueName) {
    if (!this.context) {
      return;
    }

    const cues = {
      start: [
        { frequency: 330, duration: 0.07, wave: "square", gain: 0.035 },
        { frequency: 494, duration: 0.09, wave: "square", gain: 0.03, delay: 0.08 },
        { frequency: 659, duration: 0.12, wave: "square", gain: 0.028, delay: 0.18 },
      ],
      move: [
        { frequency: 220, duration: 0.04, wave: "square", gain: 0.018 },
      ],
      block: [
        { frequency: 140, duration: 0.06, wave: "sawtooth", gain: 0.025 },
      ],
      collect: [
        { frequency: 523, duration: 0.05, wave: "square", gain: 0.03 },
        { frequency: 784, duration: 0.08, wave: "triangle", gain: 0.02, delay: 0.05 },
      ],
      debug: [
        { frequency: 240, duration: 0.08, wave: "sine", gain: 0.025 },
        { frequency: 180, duration: 0.12, wave: "triangle", gain: 0.025, delay: 0.05 },
      ],
      blink: [
        { frequency: 860, duration: 0.06, wave: "square", gain: 0.03 },
        { frequency: 430, duration: 0.08, wave: "triangle", gain: 0.02, delay: 0.03 },
      ],
      fail: [
        { frequency: 190, duration: 0.12, wave: "sawtooth", gain: 0.03 },
        { frequency: 120, duration: 0.18, wave: "sawtooth", gain: 0.03, delay: 0.08 },
      ],
      level: [
        { frequency: 392, duration: 0.07, wave: "square", gain: 0.03 },
        { frequency: 523, duration: 0.07, wave: "square", gain: 0.03, delay: 0.07 },
        { frequency: 659, duration: 0.11, wave: "square", gain: 0.03, delay: 0.14 },
      ],
      complete: [
        { frequency: 392, duration: 0.08, wave: "triangle", gain: 0.03 },
        { frequency: 523, duration: 0.08, wave: "triangle", gain: 0.03, delay: 0.08 },
        { frequency: 659, duration: 0.1, wave: "triangle", gain: 0.028, delay: 0.16 },
        { frequency: 784, duration: 0.16, wave: "triangle", gain: 0.025, delay: 0.26 },
      ],
    };

    (cues[cueName] ?? []).forEach((tone) => this.playTone(tone));
  }

  playTone({
    frequency,
    duration,
    wave = "square",
    gain = 0.02,
    delay = 0,
  }) {
    if (!this.context) {
      return;
    }

    const startAt = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();

    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, startAt);

    envelope.gain.setValueAtTime(0.0001, startAt);
    envelope.gain.exponentialRampToValueAtTime(gain, startAt + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(envelope);
    envelope.connect(this.context.destination);

    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  }
}
