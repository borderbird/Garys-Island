import Phaser from 'phaser';

export default class StartScene extends Phaser.Scene {
    constructor() {
        super('StartScene');
    }

    private bgKey: string = 'bg1';

    preload() {
        this.load.image('bg1', 'assets/bg.png');
        this.load.image('bg2', 'assets/bg2.jpg');
        this.load.image('bg3', 'assets/bg3.jpg');
    }

    create() {
        const bgIndex = Phaser.Math.Between(1, 3);
        this.bgKey = `bg${bgIndex}`;

        // Hintergrund
        this.add.image(400, 300, this.bgKey).setDepth(-1);

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
        this.add.text(400, 430, controlsText, {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: '"Press Start 2P"',
            align: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: { x: 20, y: 20 }
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
                this.scene.start('GameScene', { bgKey: this.bgKey });
            });
        }
    }
}
