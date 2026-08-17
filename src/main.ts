import Phaser from 'phaser';
import StartScene from './StartScene';
import GameScene from './GameScene';
import LeaderboardScene from './LeaderboardScene';

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
    scene: [StartScene, GameScene, LeaderboardScene],
    backgroundColor: '#0b0410', // Tiefes Violett für Synthwave
    pixelArt: true
};

new Phaser.Game(config);
