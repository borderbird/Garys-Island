import Phaser from 'phaser';

export default class AudioController {
    private static bgmContext: AudioContext | null = null;
    private bgmTimer: Phaser.Time.TimerEvent | null = null;
    private noteIndex: number = 0;

    // Giana Sisters inspirierter 32-Step Loop mit Pausen (0)
    private melody = [
        // Part 1: C-Moll Bounce
        261.63, 0, 311.13, 261.63, 0, 392.00, 311.13, 0,
        261.63, 0, 311.13, 261.63, 0, 392.00, 466.16, 0,
        // Part 2: G#-Dur / F-Moll Wechsel
        207.65, 0, 261.63, 207.65, 0, 311.13, 261.63, 0,
        174.61, 0, 207.65, 174.61, 0, 261.63, 311.13, 0
    ];

    constructor() {}

    public startBackgroundMusic(scene: Phaser.Scene) {
        if (!AudioController.bgmContext) {
            AudioController.bgmContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.bgmTimer) return;

        this.noteIndex = 0;
        this.bgmTimer = scene.time.addEvent({
            delay: 150, // Tempo der Melodie (150ms pro Note)
            callback: () => this.playMelodyNote(scene),
            callbackScope: this,
            loop: true
        });
    }

    private playMelodyNote(scene: Phaser.Scene) {
        if (!AudioController.bgmContext) {
            this.stop();
            return;
        }

        if (scene.registry.get('isMuted')) return;

        const freq = this.melody[this.noteIndex];
        this.noteIndex = (this.noteIndex + 1) % this.melody.length;

        if (freq === 0) return;

        const osc = AudioController.bgmContext.createOscillator();
        const gain = AudioController.bgmContext.createGain();

        // Rechteckwelle für den klassischen SID-Chip-Sound des C64
        osc.type = 'square'; 
        osc.frequency.setValueAtTime(freq, AudioController.bgmContext.currentTime);

        // Etwas weicher eingestellt (0.1)
        gain.gain.setValueAtTime(0.1, AudioController.bgmContext.currentTime);
        
        // Kurzes, perkussives Ausklingen für den "hüpfenden" Rhythmus
        gain.gain.exponentialRampToValueAtTime(0.001, AudioController.bgmContext.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(AudioController.bgmContext.destination);

        osc.start(AudioController.bgmContext.currentTime);
        osc.stop(AudioController.bgmContext.currentTime + 0.12);
    }

    public playGameOverChiptune(scene: Phaser.Scene) {
        if (scene.registry.get('isMuted')) return;

        // Eigener, kurzer Audio Context für Game Over
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        const notes = [330.00, 261.63, 164.81]; // Töne: E4, C4, E3
        let startTime = audioCtx.currentTime;

        notes.forEach((freq) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'square'; 
            osc.frequency.setValueAtTime(freq, startTime);
            
            gain.gain.setValueAtTime(0.1, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start(startTime);
            osc.stop(startTime + 0.2);
            
            startTime += 0.25; 
        });

        // "Absturz"-Sound
        const buzz = audioCtx.createOscillator();
        const buzzGain = audioCtx.createGain();
        
        buzz.type = 'sawtooth';
        buzz.frequency.setValueAtTime(100, startTime);
        buzz.frequency.exponentialRampToValueAtTime(10, startTime + 0.8);
        
        buzzGain.gain.setValueAtTime(0.1, startTime);
        buzzGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.8);
        
        buzz.connect(buzzGain);
        buzzGain.connect(audioCtx.destination);
        
        buzz.start(startTime);
        buzz.stop(startTime + 0.8);
    }

    public pause() {
        if (this.bgmTimer) {
            this.bgmTimer.paused = true;
        }
    }

    public resume() {
        if (this.bgmTimer) {
            this.bgmTimer.paused = false;
        }
    }

    public stop() {
        if (this.bgmTimer) {
            this.bgmTimer.remove();
            this.bgmTimer = null;
        }
    }
}
