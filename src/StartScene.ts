import Phaser from 'phaser';

export default class StartScene extends Phaser.Scene {
    constructor() {
        super('StartScene');
    }

    preload() {
        // Load background if not loaded already, though it's loaded in GameScene. 
        // We should move preload to a PreloaderScene or just duplicate it here for now to ensure it's available.
        this.load.image('background', 'assets/bg.png');
    }

    create() {
        // Hintergrund
        this.add.image(400, 300, 'background').setDepth(-1);

        // Highscore laden
        const highscore = localStorage.getItem('astroBenzHighscore') || '0';

        // Titel
        this.add.text(400, 200, 'ASTRO BENZ', {
            fontSize: '48px',
            color: '#ffff00',
            fontFamily: '"Press Start 2P"',
            align: 'center'
        }).setOrigin(0.5);

        // Highscore
        this.add.text(400, 300, `HI-SCORE: ${highscore}`, {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: '"Press Start 2P"',
            align: 'center'
        }).setOrigin(0.5);

        // Steuerung (Tastenbefehle)
        const controlsText = `STEUERUNG:\n\n< > PFEILTASTEN: Bewegen\nSHIFT: Turbo`;
        this.add.text(400, 420, controlsText, {
            fontSize: '16px',
            color: '#aaaaaa',
            fontFamily: '"Press Start 2P"',
            align: 'center'
        }).setOrigin(0.5);

        // Start Text (Blinkend)
        const startText = this.add.text(400, 520, 'PRESS SPACE TO START', {
            fontSize: '20px',
            color: '#ffffff',
            fontFamily: '"Press Start 2P"',
            align: 'center'
        }).setOrigin(0.5);

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
                this.scene.start('GameScene');
            });
        }
    }
}
