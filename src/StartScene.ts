import Phaser from 'phaser';
import AudioController from './AudioController';

export default class StartScene extends Phaser.Scene {
    constructor() {
        super('StartScene');
    }

    private bgKey: string = 'bg1';

    preload() {
        this.load.image('bg1', 'assets/bg1.jpg');
        this.load.image('bg2', 'assets/bg2.jpg');
        this.load.image('bg3', 'assets/bg3.jpg');
        this.load.audio('bgm', 'assets/bgm.wav');
    }

    create() {
        const bgIndex = Phaser.Math.Between(1, 3);
        this.bgKey = `bg${bgIndex}`;

        // Hintergrund
        const bg = this.add.image(400, 300, this.bgKey).setDepth(-1);
        bg.setDisplaySize(800, 600); // fill screen

        // Highscore laden
        const highscore = localStorage.getItem('garysIslandHighscore') || '0';

        // Titel
        const titleText = this.add.text(400, 200, "Gary's Island", {
            fontSize: '56px',
            color: '#FF00FF', // Neon Pink
            fontFamily: '"Press Start 2P"',
            align: 'center'
        }).setOrigin(0.5);
        titleText.setShadow(0, 0, '#00FFFF', 15, false, true); // Cyan Glow

        // Highscore
        const hsText = this.add.text(400, 300, `HI-SCORE: ${highscore}`, {
            fontSize: '24px',
            color: '#00FFFF', // Cyan
            fontFamily: '"Press Start 2P"',
            align: 'center'
        }).setOrigin(0.5);
        hsText.setShadow(0, 0, '#FF00FF', 8, false, true);

        // Steuerung (Tastenbefehle)
        const isMobile = !this.sys.game.device.os.desktop;
        const controlsText = isMobile 
            ? `STEUERUNG:\n\n◀ SWIPE ▶: Bewegen\n(Auto-Turbo aktiv)\n\nTAP: Start`
            : `STEUERUNG:\n\n< > PFEILE: Bewegen\nSHIFT: Turbo\nM: Sound An/Aus\nSPACE: Pause\nQ: Beenden`;
        const ctrlTextObj = this.add.text(400, 430, controlsText, {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: '"Press Start 2P"',
            align: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: { x: 20, y: 20 }
        }).setOrigin(0.5);
        ctrlTextObj.setShadow(0, 0, '#FF00FF', 4, false, true);

        // Start Text (Blinkend)
        const startText = this.add.text(400, 550, 'PRESS SPACE OR TAP TO START', {
            fontSize: '20px',
            color: '#00FFFF',
            fontFamily: '"Press Start 2P"',
            align: 'center'
        }).setOrigin(0.5);
        startText.setShadow(0, 0, '#FF00FF', 10, false, true);

        // Blink-Effekt
        this.time.addEvent({
            delay: 500,
            loop: true,
            callback: () => {
                startText.visible = !startText.visible;
            }
        });

        // Space-Taste zum Starten
        if (this.input.keyboard) {
            this.input.keyboard.once('keydown-SPACE', () => {
                this.scene.start('GameScene', { bgKey: this.bgKey });
            });

            // M-Taste für Mute
            this.input.keyboard.on('keydown-M', () => {
                const isMuted = !this.sound.mute;
                this.sound.mute = isMuted;
                this.registry.set('isMuted', isMuted);
            });
        }

        // Native DOM Event Listener für iOS Audio Unlock
        const unlockAudio = () => {
            AudioController.initContext();
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('click', unlockAudio);
        };
        document.addEventListener('touchstart', unlockAudio, { once: true });
        document.addEventListener('click', unlockAudio, { once: true });

        // Touch zum Starten (Phaser Event)
        this.input.once('pointerdown', () => {
            this.scene.start('GameScene', { bgKey: this.bgKey });
        });
    }
}
