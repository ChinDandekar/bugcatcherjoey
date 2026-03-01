// A lightweight synthesizer to generate 8-bit style UI sounds
// using the browser's native Web Audio API

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.battleMusic = new Audio("https://play.pokemonshowdown.com/audio/hgss-johto-trainer.mp3");
        this.battleMusic.loop = true;
        this.battleMusic.volume = 0.2;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playHover() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playClick() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playBoot() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'square';

        osc1.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc1.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 1.5);
        osc1.frequency.linearRampToValueAtTime(1200, this.ctx.currentTime + 2.0);

        osc2.frequency.setValueAtTime(205, this.ctx.currentTime);
        osc2.frequency.linearRampToValueAtTime(805, this.ctx.currentTime + 1.5);
        osc2.frequency.linearRampToValueAtTime(1205, this.ctx.currentTime + 2.0);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime + 2.5);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 3.0);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start();
        osc2.start();

        osc1.stop(this.ctx.currentTime + 3.0);
        osc2.stop(this.ctx.currentTime + 3.0);
    }

    playBattleMusic() {
        if (this.battleMusic) {
            this.battleMusic.currentTime = 0;
            const playPromise = this.battleMusic.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => console.log("BGM autoplay prevented:", e));
            }
        }
    }

    stopBattleMusic() {
        if (this.battleMusic) {
            this.battleMusic.pause();
            this.battleMusic.currentTime = 0;
        }
    }

    playVictoryFanfare() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        // An 8-bit Pokemon Level Up / Victory Fanfare style arpeggio
        const notes = [
            { freq: 440, time: 0, dur: 0.15 },    // A4
            { freq: 440, time: 0.15, dur: 0.15 }, // A4
            { freq: 440, time: 0.3, dur: 0.15 },  // A4
            { freq: 440, time: 0.45, dur: 0.4 },  // A4
            { freq: 349.23, time: 0.85, dur: 0.3 }, // F4
            { freq: 392.00, time: 1.15, dur: 0.3 }, // G4
            { freq: 440, time: 1.45, dur: 0.2 },  // A4
            { freq: 392.00, time: 1.65, dur: 0.15 },// G4
            { freq: 440, time: 1.8, dur: 1.0 }    // A4
        ];

        const now = this.ctx.currentTime;

        notes.forEach(note => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(note.freq, now + note.time);

            // Envelope
            gain.gain.setValueAtTime(0, now + note.time);
            gain.gain.linearRampToValueAtTime(0.1, now + note.time + 0.05); // Attack
            gain.gain.setValueAtTime(0.1, now + note.time + note.dur - 0.05); // Sustain
            gain.gain.linearRampToValueAtTime(0, now + note.time + note.dur); // Release

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + note.time);
            osc.stop(now + note.time + note.dur);
        });
    }
}

export const sfx = new SoundEngine();
