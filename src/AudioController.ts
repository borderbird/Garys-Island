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

    public static initContext() {
        if (!AudioController.bgmContext) {
            AudioController.bgmContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (AudioController.bgmContext.state === 'suspended') {
            AudioController.bgmContext.resume();
        }
        
        // WICHTIG: Leeren Buffer abspielen, um iOS Safari Audio 100% zuverlässig zu entsperren
        // (Oscillators mit Volume 0 werden von iOS oft wegoptimiert und entsperren nicht!)
        const buffer = AudioController.bgmContext.createBuffer(1, 1, 22050);
        const source = AudioController.bgmContext.createBufferSource();
        source.buffer = buffer;
        source.connect(AudioController.bgmContext.destination);
        source.start(0);
    }

    private nextNoteTime: number = 0;

    public startBackgroundMusic(scene: Phaser.Scene) {
        AudioController.initContext();
        if (this.bgmTimer) return;

        this.noteIndex = 0;
        if (AudioController.bgmContext) {
            this.nextNoteTime = AudioController.bgmContext.currentTime + 0.2;
        }

        this.bgmTimer = scene.time.addEvent({
            delay: 50, // Sehr häufig prüfen (alle 50ms)
            callback: () => this.scheduleLoop(scene),
            callbackScope: this,
            loop: true
        });
    }

    private scheduleLoop(scene: Phaser.Scene) {
        if (!AudioController.bgmContext) return;

        const audioCtx = AudioController.bgmContext;
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;

        // Falls wir hinterherhinken (z.B. Tab im Hintergrund), Zeitstempel resetten
        if (this.nextNoteTime < now) {
            this.nextNoteTime = now + 0.1;
        }

        // Alle Töne planen, die in den nächsten 500ms an der Reihe sind
        // Dadurch ist die Musik völlig immun gegen Framerate-Drops auf physischen iPhones
        while (this.nextNoteTime < now + 0.5) {
            const freq = this.melody[this.noteIndex];
            
            // Nur abspielen, wenn Ton existiert und nicht gemutet ist
            if (freq > 0 && !scene.registry.get('isMuted')) {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                osc.type = 'square'; 
                osc.frequency.setValueAtTime(freq, this.nextNoteTime);

                gain.gain.setValueAtTime(0.15, this.nextNoteTime);
                gain.gain.linearRampToValueAtTime(0, this.nextNoteTime + 0.12);

                osc.connect(gain);
                gain.connect(audioCtx.destination);

                osc.start(this.nextNoteTime);
                osc.stop(this.nextNoteTime + 0.12);
            }

            // Nächsten Ton voranschreiten (150ms pro Step)
            this.noteIndex = (this.noteIndex + 1) % this.melody.length;
            this.nextNoteTime += 0.15; 
        }
    }

    public playGameOverChiptune(scene: Phaser.Scene) {
        if (scene.registry.get('isMuted')) return;

        if (!AudioController.bgmContext) {
            AudioController.bgmContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const audioCtx = AudioController.bgmContext;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
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

    public playShieldCatchSound(scene: Phaser.Scene) {
        if (scene.registry.get('isMuted')) return;

        if (!AudioController.bgmContext) {
            AudioController.bgmContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const audioCtx = AudioController.bgmContext;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        let startTime = audioCtx.currentTime;

        // Heller, aufsteigender Arpeggio-Sound
        const notes = [440.00, 554.37, 659.25, 880.00]; // A4, C#5, E5, A5
        
        notes.forEach((freq, index) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'sine'; // Weicherer, magischer Klang
            osc.frequency.setValueAtTime(freq, startTime + index * 0.1);
            
            gain.gain.setValueAtTime(0, startTime + index * 0.1);
            gain.gain.linearRampToValueAtTime(0.2, startTime + index * 0.1 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + index * 0.1 + 0.2);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start(startTime + index * 0.1);
            osc.stop(startTime + index * 0.1 + 0.2);
        });
    }

    public playCrashSound(scene: Phaser.Scene) {
        if (scene.registry.get('isMuted')) return;

        if (!AudioController.bgmContext) {
            AudioController.bgmContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const audioCtx = AudioController.bgmContext;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        const startTime = audioCtx.currentTime;

        // Tiefer, rauer Crash-Sound (Sawtooth + starker Frequenzabfall)
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, startTime);
        osc.frequency.exponentialRampToValueAtTime(10, startTime + 0.4);
        
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + 0.4);
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
