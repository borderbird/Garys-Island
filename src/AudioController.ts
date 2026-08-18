import Phaser from 'phaser';

export default class AudioController {
    private static bgmContext: AudioContext | null = null;
    private bgmSound: Phaser.Sound.BaseSound | null = null;

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

    public startBackgroundMusic(scene: Phaser.Scene) {
        AudioController.initContext();
        if (this.bgmSound) return;

        // Phaser's Audio System takes care of iOS playback bugs automatically
        this.bgmSound = scene.sound.add('bgm', { loop: true, volume: 0.15 });
        
        if (!scene.registry.get('isMuted')) {
            this.bgmSound.play();
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
        if (this.bgmSound && (this.bgmSound as any).isPlaying) {
            this.bgmSound.pause();
        }
    }

    public resume() {
        if (this.bgmSound && (this.bgmSound as any).isPaused) {
            this.bgmSound.resume();
        }
    }

    public stop() {
        if (this.bgmSound) {
            this.bgmSound.stop();
            this.bgmSound.destroy();
            this.bgmSound = null;
        }
    }
}
