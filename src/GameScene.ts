import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private starsGroup!: Phaser.Physics.Arcade.Group;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    private score: number = 0;
    private lives: number = 5;

    private scoreText!: Phaser.GameObjects.Text;
    private livesText!: Phaser.GameObjects.Text;
    private spawnTimerEvent!: Phaser.Time.TimerEvent;

    constructor() {
        super('GameScene');
    }

    // 1. Assets laden
    preload() {
        this.load.image('player', 'assets/player128x128.png');
        this.load.image('star', 'assets/star.png');
        this.load.image('background', 'assets/bg.png');
    }

    // 2. Spielwelt aufbauen
    create() {
        this.add.image(400, 300, 'background').setDepth(-1);

        this.score = 0;
        this.lives = 5;

        // UI-Texte
        this.scoreText = this.add.text(16, 16, 'Sterne: 0', { fontSize: '24px', color: '#fff', fontFamily: '"Press Start 2P"' });
        this.livesText = this.add.text(16, 50, 'Leben: 5', { fontSize: '24px', color: '#ff0000', fontFamily: '"Press Start 2P"' });

        // Spieler erstellen und Physik aktivieren
        this.player = this.physics.add.sprite(400, 550, 'player');
        this.player.setCollideWorldBounds(true); // Darf den Bildschirm nicht verlassen
        this.player.setSize(80, 100, true); // Hitbox anpassen und zentrieren

        // Gruppe für die Sterne
        this.starsGroup = this.physics.add.group();

        // Kollisions-Erkennung: Wenn Spieler und Stern sich berühren -> Stern fangen!
        this.physics.add.overlap(this.player, this.starsGroup, this.catchStar, undefined, this);

        // Eingabe-Tasten (Pfeiltasten)
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
        }

        // Timer, der alle 1 Sekunde einen neuen Stern spawnt
        this.spawnTimerEvent = this.time.addEvent({
            delay: 1000,
            callback: this.spawnStar,
            callbackScope: this,
            loop: true
        });
    }

    // 3. Game-Loop (wird 60x pro Sekunde aufgerufen)
    update() {
        if (this.lives <= 0) return; // Spiel ist vorbei, nichts mehr tun

        // Spielerbewegung
        const speed = 400;
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
        } else {
            this.player.setVelocityX(0);
        }

        // Prüfen, ob Sterne den unteren Rand erreicht haben (verpasst!)
        this.starsGroup.getChildren().forEach((gameObject) => {
            const star = gameObject as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
            if (star.y > 600) {
                this.missStar(star);
            }
        });
    }

    // --- Eigene Spiel-Funktionen ---

    private spawnStar() {
        // Zufällige X-Position zwischen 50 und 750 (Bildschirmbreite vorausgesetzt: 800)
        const x = Phaser.Math.Between(50, 750);
        const star = this.starsGroup.create(x, 0, 'star');
        star.setScale(0.5);
        star.setCircle(50, 14, 14); // Hitbox als Kreis anpassen und zentrieren

        // Fällt nach unten (Schwerkraft für Sterne abhängig vom Punktestand)
        let minSpeed = 150 + (this.score * 10);
        let maxSpeed = 300 + (this.score * 15);
        
        // Obergrenze einfügen, damit es spielbar bleibt
        minSpeed = Math.min(minSpeed, 800);
        maxSpeed = Math.min(maxSpeed, 900);
        
        star.setVelocityY(Phaser.Math.Between(minSpeed, maxSpeed));
    }

    private catchStar(player: any, star: any) {
        star.destroy(); // Stern verschwindet
        this.score += 1; // Punkt dazu
        this.scoreText.setText('Sterne: ' + this.score);

        // Hier könnte später ein schöner 8-Bit-Soundeffekt hin!
    }

    private missStar(star: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
        star.destroy();
        this.lives -= 1;
        this.livesText.setText('Leben: ' + this.lives);

        // Kamera-Wackeln als Feedback für Fehler
        this.cameras.main.shake(100, 0.01);

        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    private gameOver() {
        this.physics.pause(); // Alle Bewegungen stoppen
        this.spawnTimerEvent.remove(); // Keine Sterne mehr spawnen
        this.player.setTint(0xff0000); // Spieler wird rot

        // Game Over Text anzeigen
        const gameOverText = `GAME OVER\n\nDu hast ${this.score} Sterne gefangen!`;
        this.add.text(400, 300, gameOverText, {
            fontSize: '24px',
            color: '#fff',
            fontFamily: '"Press Start 2P"',
            align: 'center'
        }).setOrigin(0.5, 0.5); // Zentriert den Text
    }
}
