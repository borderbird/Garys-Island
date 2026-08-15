import Phaser from 'phaser';
import StartScene from './StartScene';
import GameScene from './GameScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'app',
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 }, // Eigene Gravitation pro Stern geregelt
            debug: false
        }
    },
    scene: [StartScene, GameScene],
    backgroundColor: '#1a1a2e', // Ein dunkles Blau/Lila für den Retro-Look
    pixelArt: true
};

new Phaser.Game(config);
