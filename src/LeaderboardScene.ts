import Phaser from 'phaser';
import { OnlineLeaderboard, type ScoreEntry } from './OnlineLeaderboard';

export default class LeaderboardScene extends Phaser.Scene {
    private score: number = 0;
    private initials: number[] = [0, 0, 0]; // Indices for A-Z
    private cursorIndex: number = 0; // Which letter is currently active
    private letterTexts: Phaser.GameObjects.Text[] = [];
    private isSubmitting: boolean = false;
    private hasSubmitted: boolean = false;

    constructor() {
        super('LeaderboardScene');
    }

    init(data: { score?: number }) {
        this.score = data.score || 0;
        this.initials = [0, 0, 0];
        this.cursorIndex = 0;
        this.isSubmitting = false;
        this.hasSubmitted = false;
        this.letterTexts = [];
    }

    create() {
        // Background
        this.add.rectangle(0, 0, 800, 600, 0x000000, 0.8).setOrigin(0);

        // Title
        this.add.text(400, 100, 'GAME OVER', {
            fontSize: '32px',
            color: '#FF00FF',
            fontFamily: '"Press Start 2P"'
        }).setOrigin(0.5).setShadow(0, 0, '#00FFFF', 10, false, true);

        this.add.text(400, 160, `YOUR SCORE: ${this.score}`, {
            fontSize: '20px',
            color: '#00FFFF',
            fontFamily: '"Press Start 2P"'
        }).setOrigin(0.5);

        // Prompt for initials
        this.add.text(400, 240, 'ENTER INITIALS', {
            fontSize: '16px',
            color: '#FFFFFF',
            fontFamily: '"Press Start 2P"'
        }).setOrigin(0.5);

        // Render initials
        const startX = 350;
        for (let i = 0; i < 3; i++) {
            const letter = this.add.text(startX + (i * 50), 300, 'A', {
                fontSize: '32px',
                color: '#FFFFFF',
                fontFamily: '"Press Start 2P"'
            }).setOrigin(0.5);
            this.letterTexts.push(letter);
        }

        // Instructions
        this.add.text(400, 400, 'ARROWS: Select Letter\nENTER: Submit', {
            fontSize: '12px',
            color: '#aaaaaa',
            fontFamily: '"Press Start 2P"',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5);

        this.updateLetters();

        // Keyboard Input
        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-UP', () => this.changeLetter(1));
            this.input.keyboard.on('keydown-DOWN', () => this.changeLetter(-1));
            this.input.keyboard.on('keydown-LEFT', () => this.moveCursor(-1));
            this.input.keyboard.on('keydown-RIGHT', () => this.moveCursor(1));
            this.input.keyboard.on('keydown-ENTER', () => this.submitScore());
            this.input.keyboard.on('keydown-SPACE', () => {
                // If leaderboard is shown, space restarts
                if (this.hasSubmitted) {
                    this.scene.start('GameScene');
                } else {
                    this.submitScore();
                }
            });
        }
    }

    private changeLetter(dir: number) {
        if (this.isSubmitting || this.hasSubmitted) return;
        this.initials[this.cursorIndex] = (this.initials[this.cursorIndex] + dir + 26) % 26;
        this.updateLetters();
    }

    private moveCursor(dir: number) {
        if (this.isSubmitting || this.hasSubmitted) return;
        this.cursorIndex = Phaser.Math.Clamp(this.cursorIndex + dir, 0, 2);
        this.updateLetters();
    }

    private updateLetters() {
        if (this.isSubmitting || this.hasSubmitted) return;
        for (let i = 0; i < 3; i++) {
            this.letterTexts[i].setText(String.fromCharCode(65 + this.initials[i]));
            if (i === this.cursorIndex) {
                this.letterTexts[i].setColor('#FF00FF');
                this.letterTexts[i].setShadow(0, 0, '#00FFFF', 10, false, true);
            } else {
                this.letterTexts[i].setColor('#FFFFFF');
                this.letterTexts[i].setShadow(0, 0, '#000000', 0, false, false);
            }
        }
    }

    private async submitScore() {
        if (this.isSubmitting || this.hasSubmitted) return;
        this.isSubmitting = true;

        const name = this.initials.map(i => String.fromCharCode(65 + i)).join('');
        
        // Hide input UI
        this.children.removeAll();
        this.add.rectangle(0, 0, 800, 600, 0x000000, 0.8).setOrigin(0);
        
        const loadingText = this.add.text(400, 300, 'LOADING...', {
            fontSize: '24px',
            color: '#00FFFF',
            fontFamily: '"Press Start 2P"'
        }).setOrigin(0.5);

        // Fetch & Submit
        const top10 = await OnlineLeaderboard.submitScore(name, this.score);
        
        loadingText.destroy();
        this.showLeaderboard(top10);
    }

    private showLeaderboard(scores: ScoreEntry[]) {
        this.hasSubmitted = true;

        this.add.text(400, 80, 'TOP 10 PLAYERS', {
            fontSize: '24px',
            color: '#FF00FF',
            fontFamily: '"Press Start 2P"'
        }).setOrigin(0.5).setShadow(0, 0, '#00FFFF', 10, false, true);

        const startY = 140;
        scores.forEach((entry, index) => {
            const y = startY + (index * 35);
            // Rank and Name (left aligned)
            this.add.text(250, y, `${index + 1}. ${entry.name}`, {
                fontSize: '16px',
                color: '#FFFFFF',
                fontFamily: '"Press Start 2P"'
            }).setOrigin(0, 0.5);
            
            // Score (right aligned)
            this.add.text(550, y, `${entry.score}`, {
                fontSize: '16px',
                color: '#00FFFF',
                fontFamily: '"Press Start 2P"'
            }).setOrigin(1, 0.5);
        });

        if (scores.length === 0) {
            this.add.text(400, 300, 'NO SCORES YET', {
                fontSize: '16px',
                color: '#FFFFFF',
                fontFamily: '"Press Start 2P"'
            }).setOrigin(0.5);
        }

        this.add.text(400, 520, 'PRESS SPACE TO RESTART', {
            fontSize: '16px',
            color: '#00FFFF',
            fontFamily: '"Press Start 2P"'
        }).setOrigin(0.5).setShadow(0, 0, '#FF00FF', 5, false, true);
    }
}
