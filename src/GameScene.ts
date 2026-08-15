import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private starsGroup!: Phaser.Physics.Arcade.Group;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    private score: number = 0;
    private lives: number = 5;
    private level: number = 1;

    private scoreText!: Phaser.GameObjects.Text;
    private livesText!: Phaser.GameObjects.Text;
    private levelText!: Phaser.GameObjects.Text;
    private spawnTimerEvent!: Phaser.Time.TimerEvent;

    private bgmContext: AudioContext | null = null;
    private bgmTimer: Phaser.Time.TimerEvent | null = null;
    private noteIndex: number = 0;
    private isTurboActive: boolean = false;
    // Giana Sisters inspirierter 32-Step Loop mit Pausen (0)
    private melody = [
        // Part 1: C-Moll Bounce
        261.63, 0, 311.13, 261.63, 0, 392.00, 311.13, 0,
        261.63, 0, 311.13, 261.63, 0, 392.00, 466.16, 0,
        // Part 2: G#-Dur / F-Moll Wechsel
        207.65, 0, 261.63, 207.65, 0, 311.13, 261.63, 0,
        174.61, 0, 207.65, 174.61, 0, 261.63, 311.13, 0
    ];

    constructor() {
        super('GameScene');
    }

    // 1. Assets laden
    preload() {
        this.load.image('player', 'assets/player128x128.png');
        this.load.image('star', 'assets/star.png');
        this.load.image('background', 'assets/bg.png');
        this.load.audio('catchSound', 'assets/catch.wav');
        this.load.audio('missSound', 'assets/miss.wav');
        this.load.audio('turboSound', 'assets/turbo.wav');
    }

    // 2. Spielwelt aufbauen
    create() {
        this.add.image(400, 300, 'background').setDepth(-1);

        this.score = 0;
        this.lives = 5;
        this.level = 1;

        const highscore = localStorage.getItem('astroBenzHighscore') || '0';

        // UI-Texte
        this.scoreText = this.add.text(16, 16, 'SCORE: 0', { fontSize: '24px', color: '#fff', fontFamily: '"Press Start 2P"' });
        this.livesText = this.add.text(16, 50, 'LIVES: 5', { fontSize: '24px', color: '#ff0000', fontFamily: '"Press Start 2P"' });
        this.add.text(800 - 16, 16, `HI-SCORE: ${highscore}`, { fontSize: '24px', color: '#fff', fontFamily: '"Press Start 2P"' }).setOrigin(1, 0);
        this.levelText = this.add.text(400, 300, '', { fontSize: '32px', color: '#ffff00', fontFamily: '"Press Start 2P"' }).setOrigin(0.5);

        // Spieler erstellen und Physik aktivieren
        this.player = this.physics.add.sprite(400, 550, 'player');
        this.player.setCollideWorldBounds(true); // Darf den Bildschirm nicht verlassen
        this.player.setSize(80, 100); // Hitbox anpassen

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

        if (this.input.keyboard) {
            this.input.keyboard.once('keydown', () => {
                this.startBackgroundMusic();
            });
        }
    }

    // 3. Game-Loop (wird 60x pro Sekunde aufgerufen)
    update() {
        if (this.lives <= 0) return; // Spiel ist vorbei, nichts mehr tun

        // Spielerbewegung mit optionalem Turbo
        // Turbo ist nur aktiv, wenn SHIFT gedrückt wird UND wir uns bewegen
        const isMoving = this.cursors.left.isDown || this.cursors.right.isDown;
        const isTurbo = this.cursors.shift.isDown && isMoving;
        
        // Soundeffekt abspielen, wenn Turbo gerade erst aktiviert wurde
        if (isTurbo && !this.isTurboActive) {
            this.sound.play('turboSound', { volume: 0.5 });
            this.isTurboActive = true;
        } else if (!isTurbo && this.isTurboActive) {
            this.isTurboActive = false;
        }

        const speed = isTurbo ? 700 : 400; // 700 für Turbo, 400 normal

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(true);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        // Prüfen, ob Sterne den unteren Rand erreicht haben (verpasst!) und Zickzack-Bewegung anwenden
        this.starsGroup.getChildren().forEach((gameObject) => {
            const star = gameObject as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
            
            // Zickzack-Bewegung
            if (star.getData('isZigzag')) {
                const startX = star.getData('startX');
                const time = this.time.now / 300; // Geschwindigkeit der Seitwärtsbewegung
                star.x = startX + Math.sin(time + star.getData('randomOffset')) * 100;
            }

            if (star.y > 600) {
                this.missStar(star);
            }
        });
    }

    // --- Eigene Spiel-Funktionen ---

    private spawnStar() {
        // Zufällige X-Position zwischen 50 und 750 (Bildschirmbreite vorausgesetzt: 800)
        let x = Phaser.Math.Between(50, 750);
        
        // Verhindern, dass Zickzack-Sterne aus dem Bild fliegen
        if (this.level >= 2) {
            x = Phaser.Math.Between(150, 650); 
        }

        const star = this.starsGroup.create(x, 0, 'star');
        star.setScale(0.5);
        star.setCircle(50, 14, 14); // Hitbox als Kreis anpassen und zentrieren

        // Zickzack-Logik ab Level 2
        if (this.level >= 2 && Phaser.Math.FloatBetween(0, 1) < 0.3) {
            star.setData('isZigzag', true);
            star.setData('startX', x);
            star.setData('randomOffset', Phaser.Math.FloatBetween(0, Math.PI * 2));
            star.setTint(0xff0000); // Rot markieren
        }

        // Fällt nach unten (Schwerkraft für Sterne abhängig vom Level)
        let minSpeed = 150 + (this.level * 30);
        let maxSpeed = 300 + (this.level * 40);
        
        // Obergrenze einfügen, damit es spielbar bleibt
        minSpeed = Math.min(minSpeed, 800);
        maxSpeed = Math.min(maxSpeed, 900);
        
        star.setVelocityY(Phaser.Math.Between(minSpeed, maxSpeed));
    }

    private catchStar(_player: any, star: any) {
        star.destroy(); // Stern verschwindet
        this.score += 100; // 100 Punkte pro Stern
        this.scoreText.setText('SCORE: ' + this.score);

        // Level Up Check (alle 1000 Punkte)
        if (this.score % 1000 === 0) {
            this.level += 1;
            this.showLevelUp();
        }

        this.sound.play('catchSound', { volume: 0.5 });
    }

    private showLevelUp() {
        this.levelText.setText(`WELLE ${this.level}`);
        this.levelText.setAlpha(1);
        
        this.tweens.add({
            targets: this.levelText,
            alpha: 0,
            duration: 2000,
            ease: 'Power2'
        });
    }
    private missStar(star: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
        star.destroy();
        this.lives -= 1;
        this.livesText.setText('LIVES: ' + this.lives);

        this.sound.play('missSound', { volume: 0.5 });
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

        this.playGameOverChiptune();

        // Highscore speichern
        const currentHighscore = parseInt(localStorage.getItem('astroBenzHighscore') || '0', 10);
        if (this.score > currentHighscore) {
            localStorage.setItem('astroBenzHighscore', this.score.toString());
        }

        // Game Over Text anzeigen
        const gameOverText = `GAME OVER\n\nSCORE: ${this.score}\n\nPRESS SPACE TO RESTART\nPRESS 'S' FOR SCREENSHOT`;
        this.add.text(400, 300, gameOverText, {
            fontSize: '24px',
            color: '#fff',
            fontFamily: '"Press Start 2P"',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5, 0.5); // Zentriert den Text

        // Screenshot-Funktion ('S' Taste)
        if (this.input.keyboard) {
            this.input.keyboard.once('keydown-S', () => {
                this.game.renderer.snapshot((image: any) => {
                    const link = document.createElement('a');
                    link.download = `astro-benz-highscore-${this.score}.png`;
                    link.href = image.src;
                    link.click();
                });
            });
        }

        // Neustart mit Leertaste
        this.time.delayedCall(500, () => {
            if (this.input.keyboard) {
                this.input.keyboard.once('keydown-SPACE', () => {
                    this.scene.start('StartScene');
                });
            }
        });
    }

    private playGameOverChiptune() {
        // Audio Context des Browsers abrufen
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Drei absteigende Töne (Rechteck-Welle = klassischer Arcade-Klang)
        const notes = [330.00, 261.63, 164.81]; // Töne: E4, C4, E3
        let startTime = audioCtx.currentTime;

        notes.forEach((freq) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'square'; // Das Geheimnis des 8-Bit-Sounds
            osc.frequency.setValueAtTime(freq, startTime);
            
            // Lautstärke kurz anreißen und schnell ausklingen lassen
            gain.gain.setValueAtTime(0.1, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start(startTime);
            osc.stop(startTime + 0.2);
            
            startTime += 0.25; 
        });

        // Am Ende ein düsterer "Absturz"-Sound (Sägezahn-Welle)
        const buzz = audioCtx.createOscillator();
        const buzzGain = audioCtx.createGain();
        
        buzz.type = 'sawtooth';
        buzz.frequency.setValueAtTime(100, startTime);
        buzz.frequency.exponentialRampToValueAtTime(10, startTime + 0.8); // Tonhöhen-Abfall
        
        buzzGain.gain.setValueAtTime(0.1, startTime);
        buzzGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.8);
        
        buzz.connect(buzzGain);
        buzzGain.connect(audioCtx.destination);
        
        buzz.start(startTime);
        buzz.stop(startTime + 0.8);
    }

    private startBackgroundMusic() {
        if (!this.bgmContext) {
            this.bgmContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.bgmTimer) return;

        this.bgmTimer = this.time.addEvent({
            delay: 150, // Tempo der Melodie (150ms pro Note)
            callback: this.playMelodyNote,
            callbackScope: this,
            loop: true
        });
    }

    private playMelodyNote() {
        // Stoppe die Musik, wenn das Spiel vorbei ist
        if (!this.bgmContext || this.lives <= 0) {
            this.bgmTimer?.remove();
            return;
        }

        const freq = this.melody[this.noteIndex];
        this.noteIndex = (this.noteIndex + 1) % this.melody.length;

        // Wenn die Frequenz 0 ist, spielen wir eine Pause
        if (freq === 0) {
            return;
        }

        const osc = this.bgmContext.createOscillator();
        const gain = this.bgmContext.createGain();

        // Rechteckwelle für den klassischen SID-Chip-Sound des C64
        osc.type = 'square'; 
        osc.frequency.setValueAtTime(freq, this.bgmContext.currentTime);

        // Etwas weicher eingestellt (0.1), damit es beim längeren Hören angenehm bleibt
        gain.gain.setValueAtTime(0.1, this.bgmContext.currentTime);
        
        // Kurzes, perkussives Ausklingen für den "hüpfenden" Rhythmus
        gain.gain.exponentialRampToValueAtTime(0.001, this.bgmContext.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(this.bgmContext.destination);

        osc.start(this.bgmContext.currentTime);
        osc.stop(this.bgmContext.currentTime + 0.12);
    }
}
