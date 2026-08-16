import Phaser from 'phaser';
import AudioController from './AudioController';

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

    private audioController!: AudioController;
    private isTurboActive: boolean = false;

    private isShieldActive: boolean = false;
    private shieldTimerEvent: Phaser.Time.TimerEvent | null = null;

    private isSlowed: boolean = false;
    private slowdownTimerEvent: Phaser.Time.TimerEvent | null = null;

    private highscoreText!: Phaser.GameObjects.Text;

    private isQuitPromptActive: boolean = false;
    private quitPromptText!: Phaser.GameObjects.Text;
    private isPaused: boolean = false;
    private pausedText!: Phaser.GameObjects.Text;
    private bgKey: string = 'bg1';

    constructor() {
        super('GameScene');
    }

    init(data: any) {
        if (data && data.bgKey) {
            this.bgKey = data.bgKey;
        }
    }

    // 1. Assets laden
    preload() {
        this.load.image('player', 'assets/player128x128.png');
        this.load.image('star', 'assets/star.png');
        this.load.image('shield', 'assets/shield.png');
        this.load.image('pylon', 'assets/pylon.png');
        // bg is loaded in StartScene
        this.load.audio('catchSound', 'assets/catch.wav');
        this.load.audio('missSound', 'assets/miss.wav');
        this.load.audio('turboSound', 'assets/turbo.wav');
        this.load.audio('pylonSound', 'assets/pylon.wav');
    }

    // 2. Spielwelt aufbauen
    create() {
        this.add.image(400, 300, this.bgKey).setDepth(-1);

        this.score = 0;
        this.lives = 5;
        this.level = 1;
        this.isQuitPromptActive = false;
        this.isPaused = false;
        this.audioController = new AudioController();
        this.isTurboActive = false;
        this.isShieldActive = false;
        this.shieldTimerEvent = null;
        this.isSlowed = false;
        this.slowdownTimerEvent = null;

        const highscore = localStorage.getItem('astroBenzHighscore') || '0';

        // UI-Texte
        this.scoreText = this.add.text(16, 16, 'SCORE: 0', { fontSize: '24px', color: '#fff', fontFamily: '"Press Start 2P"' });
        this.livesText = this.add.text(16, 50, 'LIVES: 5', { fontSize: '24px', color: '#ff0000', fontFamily: '"Press Start 2P"' });
        this.highscoreText = this.add.text(800 - 16, 16, `HI-SCORE: ${highscore}`, { fontSize: '24px', color: '#fff', fontFamily: '"Press Start 2P"' }).setOrigin(1, 0);
        this.levelText = this.add.text(400, 300, '', { fontSize: '32px', color: '#ffff00', fontFamily: '"Press Start 2P"' }).setOrigin(0.5);

        // Partikel-Textur erstellen
        const graphics = this.make.graphics({ x: 0, y: 0 });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRect(0, 0, 6, 6);
        graphics.generateTexture('pixel', 6, 6);

        // Pause-Text (unsichtbar am Start)
        this.pausedText = this.add.text(400, 300, 'PAUSED', {
            fontSize: '48px',
            color: '#ffffff',
            fontFamily: '"Press Start 2P"',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: { x: 20, y: 20 }
        }).setOrigin(0.5).setDepth(100).setVisible(false);

        // Quit-Prompt-Text (unsichtbar am Start)
        this.quitPromptText = this.add.text(400, 300, 'PRESS Q AGAIN TO QUIT\n\nPRESS ANY OTHER KEY\nTO CONTINUE', {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: '"Press Start 2P"',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            padding: { x: 20, y: 20 },
            align: 'center',
            lineSpacing: 15
        }).setOrigin(0.5).setDepth(100).setVisible(false);

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
                this.audioController.startBackgroundMusic(this);
            });

            // Zentraler Keydown Handler für Mute, Pause und Quit
            this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
                if (this.lives <= 0) return; // Wenn Game Over, nichts tun

                const key = event.key.toLowerCase();

                // 1. Mute Toggle
                if (key === 'm') {
                    const isMuted = !this.sound.mute;
                    this.sound.mute = isMuted;
                    this.registry.set('isMuted', isMuted);
                }

                // 2. Quit Prompt Logik
                if (this.isQuitPromptActive) {
                    if (key === 'q') {
                        this.quitGame();
                    } else {
                        // Abbrechen und Spiel fortsetzen
                        this.isQuitPromptActive = false;
                        this.quitPromptText.setVisible(false);
                        this.isPaused = false;
                        this.physics.resume();
                        this.tweens.resumeAll();
                        if (this.spawnTimerEvent) this.spawnTimerEvent.paused = false;
                        if (this.shieldTimerEvent) this.shieldTimerEvent.paused = false;
                        if (this.slowdownTimerEvent) this.slowdownTimerEvent.paused = false;
                        this.audioController.resume();
                    }
                    return; // Event wurde verarbeitet
                }

                // 3. Wenn nicht im Quit Prompt
                if (key === 'q') {
                    this.isQuitPromptActive = true;
                    this.quitPromptText.setVisible(true);

                    if (this.isPaused) {
                        this.pausedText.setVisible(false);
                    } else {
                        this.isPaused = true;
                        this.physics.pause();
                        this.tweens.pauseAll();
                        if (this.spawnTimerEvent) this.spawnTimerEvent.paused = true;
                        if (this.shieldTimerEvent) this.shieldTimerEvent.paused = true;
                        if (this.slowdownTimerEvent) this.slowdownTimerEvent.paused = true;
                        this.audioController.pause();
                    }
                } else if (key === ' ' || event.code === 'Space') {
                    // Pause Toggle
                    this.isPaused = !this.isPaused;

                    if (this.isPaused) {
                        this.physics.pause();
                        this.tweens.pauseAll();
                        if (this.spawnTimerEvent) this.spawnTimerEvent.paused = true;
                        if (this.shieldTimerEvent) this.shieldTimerEvent.paused = true;
                        if (this.slowdownTimerEvent) this.slowdownTimerEvent.paused = true;
                        this.audioController.pause();
                        this.pausedText.setVisible(true);
                    } else {
                        this.physics.resume();
                        this.tweens.resumeAll();
                        if (this.spawnTimerEvent) this.spawnTimerEvent.paused = false;
                        if (this.shieldTimerEvent) this.shieldTimerEvent.paused = false;
                        if (this.slowdownTimerEvent) this.slowdownTimerEvent.paused = false;
                        this.audioController.resume();
                        this.pausedText.setVisible(false);
                    }
                }
            });
        }
    }

    // 3. Game-Loop (wird 60x pro Sekunde aufgerufen)
    update() {
        if (this.lives <= 0 || this.isPaused) return; // Spiel ist vorbei oder pausiert, nichts mehr tun

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

        const speed = this.isSlowed ? 200 : (isTurbo ? 700 : 400);

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(true);
            this.player.angle = -5 + Math.sin(this.time.now / 100) * 5; // Leichtes Wackeln
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(false);
            this.player.angle = 5 + Math.sin(this.time.now / 100) * 5; // Leichtes Wackeln
        } else {
            this.player.setVelocityX(0);
            this.player.angle = 0;
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
        // Zufällige X-Position zwischen 50 und 750
        let x = Phaser.Math.Between(50, 750);
        if (this.level >= 2) {
            x = Phaser.Math.Between(150, 650); 
        }

        const typeRoll = Phaser.Math.Between(1, 100);
        let type = 'star';
        
        // 10% Chance für Shield, 15% Chance für Pylon
        if (typeRoll <= 10) {
            type = 'shield';
        } else if (typeRoll <= 25) {
            type = 'pylon';
        }

        const item = this.starsGroup.create(x, 0, type);
        item.setData('type', type);

        if (type === 'star') {
            item.setScale(0.5);
            item.setCircle(50, 14, 14); 
            if (this.level >= 2 && Phaser.Math.FloatBetween(0, 1) < 0.3) {
                item.setData('isZigzag', true);
                item.setData('startX', x);
                item.setData('randomOffset', Phaser.Math.FloatBetween(0, Math.PI * 2));
                item.setTint(0xff0000); 
            }
        } else if (type === 'shield') {
            item.setScale(0.5); // 128x128 -> 64x64
            item.setCircle(50, 14, 14); 
            item.setTint(0x00ffff);
        } else if (type === 'pylon') {
            item.setScale(0.5); // 128x128 -> 64x64
            item.setSize(80, 100);
            item.setOffset(24, 28);
        }

        let minSpeed = 150 + (this.level * 30);
        let maxSpeed = 300 + (this.level * 40);
        minSpeed = Math.min(minSpeed, 800);
        maxSpeed = Math.min(maxSpeed, 900);
        
        item.setVelocityY(Phaser.Math.Between(minSpeed, maxSpeed));
        
        if (type === 'star' || type === 'shield') {
            this.tweens.add({
                targets: item,
                angle: 360,
                duration: 2500,
                repeat: -1
            });
        }
    }

    private catchStar(_player: any, item: any) {
        const type = item.getData('type') || 'star';
        const itemX = item.x;
        const itemY = item.y;
        const isZigzag = item.getData('isZigzag');

        item.destroy(); 

        if (type === 'shield') {
            this.activateShield();
            const emitter = this.add.particles(itemX, itemY, 'pixel', {
                speed: { min: 100, max: 300 },
                scale: { start: 1, end: 0 },
                lifespan: 800,
                tint: 0x00ffff,
                emitting: false
            });
            emitter.explode(30);
            this.audioController.playShieldCatchSound(this);
            return;
        }

        if (type === 'pylon') {
            this.hitPylon();
            const emitter = this.add.particles(itemX, itemY, 'pixel', {
                speed: { min: 50, max: 200 },
                scale: { start: 1, end: 0 },
                lifespan: 600,
                tint: 0xff8800,
                emitting: false
            });
            emitter.explode(20);
            return;
        }

        // Es ist ein Stern
        const points = isZigzag ? 200 : 100;
        
        const emitter = this.add.particles(itemX, itemY, 'pixel', {
            speed: { min: 50, max: 200 },
            scale: { start: 1, end: 0 },
            lifespan: 600,
            tint: isZigzag ? 0xff0000 : 0xffff00,
            emitting: false
        });
        emitter.explode(15);
        
        // Punktewert-Popup
        const popup = this.add.text(itemX, itemY - 20, `+${points}`, {
            fontSize: '16px',
            color: isZigzag ? '#ff0000' : '#ffff00',
            fontFamily: '"Press Start 2P"'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: popup,
            y: popup.y - 50,
            alpha: 0,
            duration: 800,
            onComplete: () => popup.destroy()
        });
        
        this.score += points;
        this.scoreText.setText('SCORE: ' + this.score);

        // Level Up Check (alle 1000 Punkte)
        if (this.score >= this.level * 1000) {
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
    private missStar(item: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
        const type = item.getData('type') || 'star';
        item.destroy();

        if (type === 'shield' || type === 'pylon') {
            return; // Keine Strafe beim Verfehlen
        }

        if (this.isShieldActive) {
            return; // Schild fängt den Fehler ab
        }

        this.lives -= 1;
        this.livesText.setText('LIVES: ' + this.lives);

        this.sound.play('missSound', { volume: 0.5 });
        this.cameras.main.shake(100, 0.01);

        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    private activateShield() {
        this.isShieldActive = true;
        this.player.setTint(0x00ffff);
        
        if (this.shieldTimerEvent) {
            this.shieldTimerEvent.remove();
        }
        
        this.shieldTimerEvent = this.time.delayedCall(5000, () => {
            this.isShieldActive = false;
            this.player.clearTint();
        });
    }

    private hitPylon() {
        this.sound.play('pylonSound', { volume: 0.5 });
        this.audioController.playCrashSound(this);
        this.cameras.main.shake(300, 0.03);
        
        this.isSlowed = true;
        if (this.slowdownTimerEvent) this.slowdownTimerEvent.remove();
        this.slowdownTimerEvent = this.time.delayedCall(2000, () => {
            this.isSlowed = false;
        });
        
        this.player.setTint(0xff0000);
        this.time.delayedCall(150, () => {
            if (this.isShieldActive) {
                this.player.setTint(0x00ffff);
            } else {
                this.player.clearTint();
            }
        });
    }

    private gameOver() {
        this.physics.pause(); // Alle Bewegungen stoppen
        this.spawnTimerEvent.remove(); // Keine Sterne mehr spawnen
        if (this.shieldTimerEvent) this.shieldTimerEvent.remove();
        if (this.slowdownTimerEvent) this.slowdownTimerEvent.remove();
        this.audioController.stop(); // Musik stoppen
        this.player.setTint(0xff0000); // Spieler wird rot

        this.audioController.playGameOverChiptune(this);

        // Highscore speichern
        const currentHighscore = parseInt(localStorage.getItem('astroBenzHighscore') || '0', 10);
        let isNewHighscore = false;
        
        if (this.score > currentHighscore) {
            localStorage.setItem('astroBenzHighscore', this.score.toString());
            this.highscoreText.setText(`HI-SCORE: ${this.score}`);
            this.highscoreText.setColor('#00ff00'); // Grün für neuen Highscore
            isNewHighscore = true;
        }

        // Game Over Text anzeigen
        const title = isNewHighscore ? 'NEW HIGH SCORE!' : 'GAME OVER';
        const gameOverText = `${title}\n\nSCORE: ${this.score}\n\nPRESS SPACE TO RESTART\nPRESS 'S' FOR SCREENSHOT`;
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

    private quitGame() {
        this.lives = 0; // Stoppt Update-Loop und Musik
        this.physics.pause();
        if (this.spawnTimerEvent) this.spawnTimerEvent.remove();
        if (this.shieldTimerEvent) this.shieldTimerEvent.remove();
        if (this.slowdownTimerEvent) this.slowdownTimerEvent.remove();
        this.audioController.stop();
        
        // Zurück zum Startbildschirm (OHNE Highscore-Speicherung)
        this.scene.start('StartScene');
    }
}
