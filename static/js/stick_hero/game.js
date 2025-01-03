import Block from "./block.js";
import controls from "./controls.js";
import Player from "./player.js";
import Stick from "./stick.js";
import { getRandomInteger } from "./utils.js";

export default class Game {
    constructor(canvas, ctx, fps, touchMap, canvasSize) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.touchMap = touchMap;

        this.canvasSize = canvasSize;

        this.state = { gameover: false };
        this.transitionSpeed = 10;
        this.sceneOffset = 0;

        this.targetFrameTime = Math.floor(1000 / fps);
        this.lastPaintTime = 0;

        this.gameLoop = this.gameLoop.bind(this);


        this.blockHeight = this.canvasSize.height * 0.2;
        const blockY = this.canvasSize.height - this.blockHeight;
        this.blocks = [
            new Block(0, blockY, this.canvasSize.width * 0.2, this.blockHeight)
        ];


        this.currentBlock = 0;
        this.currentStick = 0;

        const currentBlockX = this.blocks[this.currentBlock].x;
        const currentBlockWidth = this.blocks[this.currentBlock].width;
        this.playerWidth = 40;
        this.playerHeight = 40;
        const playerXOffset = (currentBlockWidth - this.playerWidth) - 5;
        const playerX = currentBlockX + playerXOffset;
        const playerY = blockY - this.playerHeight;
        this.player = new Player(playerX, playerY, playerXOffset, this.playerWidth, this.playerHeight, this.state);


        const stickX = currentBlockX + currentBlockWidth;
        const stickY = blockY;

        this.sticks = [
            new Stick(stickX, stickY)
        ];


        this.score = 0;



        // generate 5 initial blocks
        this.generateFiveBlocks();

        // this.bgImage = new Image();
        // this.bgImage.src = '../assets/bg.jpg';

        this.gameoverSFX = new Audio('../static/assets/stick_hero/game-over.mp3');
        this.scoreSFX = new Audio('../static/assets/stick_hero/score.mp3');
        this.noScoreSFX = new Audio('../static/assets/stick_hero/no-score.mp3');


        this.gameover = false;

        this.gameoverTextWidth = 250;
        this.gameoverRadius = (this.gameoverTextWidth / 2) + 10;


        const storedHighscore = localStorage.getItem('aman-stickhero-highscore');
        this.highscore = 0;
        if (storedHighscore) {
            this.highscore = parseInt(storedHighscore);
        }

    }

    start() {
        console.log('Started');
        requestAnimationFrame(this.gameLoop);
    }

    gameLoop(timestamp) {
        if (this.state.gameover && this.player.y >= this.canvasSize.height) {
            this.gameoverSFX.currentTime = 0;
            this.gameoverSFX.play();

            this.saveHighscore();
            cancelAnimationFrame(this.gameLoop);
        }
        else {
            requestAnimationFrame(this.gameLoop)
        }
        if ((timestamp - this.lastPaintTime) < this.targetFrameTime) {
            return;
        }


        this.lastPaintTime = timestamp;

        this.gameEngine();
    }

    gameEngine() {
        // update
        this.ctx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);

        this.player.update(this.blocks[this.currentBlock], this.blocks[this.currentBlock - 1], this.sticks[this.currentStick], this.sticks[this.currentStick - 1]);
        this.sticks[this.currentStick].update(this.state);
        controls(this.touchMap, this.sticks[this.currentStick]);


        if (!this.sticks[this.currentStick].active) {

            let lastActiveBlock;

            const lastStick = this.sticks[this.currentStick];
            let passedCount = -1;
            for (let i = this.currentBlock; i < this.blocks.length; i++) {
                const block = this.blocks[i];
                const lastStickRightX = lastStick.x + lastStick.length;

                if (lastStickRightX < block.x) {
                    lastActiveBlock = this.blocks[i - 1];
                    break;
                }
                if ((lastStickRightX >= block.x && lastStickRightX <= block.x + block.width) || (lastStickRightX >= block.x + block.width)) {
                    passedCount++;
                }

            }


            if (lastStick.x + lastStick.length <= lastActiveBlock.x + lastActiveBlock.width) {
                this.scoreSFX.currentTime = 0;
                this.scoreSFX.play();
                this.score += passedCount;
            }
            else {
                this.noScoreSFX.currentTime = 0;
                this.noScoreSFX.play();
            }

            lastStick.blocksPassed = passedCount;

            this.generateNewBlock();
            this.generateNewStick();

            {
                // checking stick longer than current block
                let passedCount = 0;
                const currentBlockRightX = this.blocks[this.currentBlock].x + this.blocks[this.currentBlock].width;
                const nextBlockX = this.blocks[this.currentBlock + 1].x;
                const lastStickRightX = lastStick.x + lastStick.length;
                if ((lastStickRightX > currentBlockRightX && lastStickRightX < nextBlockX)) {
                    passedCount += 1;
                }

                this.currentBlock += passedCount;
            }



        }




        // draw
        // this.drawBg();
        this.drawScore();

        this.ctx.fillStyle = 'black';
        this.ctx.save();

        this.ctx.translate(-this.sceneOffset, 0);

        this.adjustScene();

        this.player.draw(this.ctx);
        this.blocks.forEach(block => {
            block.draw(this.ctx);
        });
        this.sticks.forEach(stick => {
            stick.draw(this.ctx);
        })


        if (this.state.gameover && this.player.y >= this.canvasSize.height) {
            this.gameover = true;
            this.drawGameOver();
        }


        this.ctx.restore();
    }

    generateNewStick() {
        this.currentStick++;

        const currentBlock = this.blocks[this.currentBlock];
        const stickX = currentBlock.x + currentBlock.width;
        const stickY = currentBlock.y;
        this.sticks.push(
            new Stick(stickX, stickY)
        )

    }

    generateNewBlock() {
        this.currentBlock += this.sticks[this.currentStick].blocksPassed;

        this.generateFiveBlocks();
    }

    generateFiveBlocks() {
        const blockGapMin = this.player.width * 1;
        const blockGapMaxOffset = (this.canvasSize.width >= this.canvasSize.height) ? (this.canvasSize.width * 0.02) : (this.canvasSize.width * 0.1);


        for (let i = 0; i < 5; i++) {
            const lastBlock = this.blocks[this.blocks.length - 1];

            const newBlockWidthMax =  (this.canvasSize.width >= this.canvasSize.height) ? (this.canvasSize.width * 0.2) : (this.canvasSize.width * 0.3);
            const newBlockWidth = getRandomInteger(this.player.width + 10, newBlockWidthMax);

            const lastBlockRightX = lastBlock.x + lastBlock.width;

            const blockGapMax = newBlockWidth + blockGapMaxOffset;

            const newBlockX = getRandomInteger(lastBlockRightX + blockGapMin, lastBlockRightX + blockGapMax);

            this.blocks.push(
                new Block(newBlockX, lastBlock.y, newBlockWidth, lastBlock.height)
            )
        }
    }



    adjustScene() {
        if (this.state.waiting && this.player.x > this.sceneOffset + (this.canvasSize.width * 0.2)) {
            this.sceneOffset += this.transitionSpeed;
        }
    }



    drawBg() {
        this.ctx.drawImage(this.bgImage, 0, 0, this.canvasSize.width, this.canvasSize.height);
    }

    drawScore() {
        this.ctx.font = "50px 'Roboto', sans-serif";
        this.ctx.fillStyle = 'black';
        const textWidth = 100;
        const textY = 60;
        this.ctx.fillText(`${this.score}`, this.canvasSize.width - textWidth, textY, textWidth);
        const highscoreTextWidth = 100;
        this.ctx.fillText(`${this.highscore}`, 40, textY, highscoreTextWidth);
    }

    drawGameOver() {
        this.ctx.font = "50px 'Roboto', sans-serif";
        this.ctx.fillStyle = 'black';
        const textWidth = this.gameoverTextWidth;

        const centerX = (this.canvasSize.width / 2) + this.sceneOffset;
        const centerY = (this.canvasSize.height / 2);
        const radius = this.gameoverRadius;

        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY - 10, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'red';
        this.ctx.fill();

        this.ctx.fillStyle = 'white'
        this.ctx.fillText(`Game Over`, centerX - (textWidth / 2), centerY, textWidth);

        this.ctx.font = "20px 'Roboto', sans-serif";
        const smallTextWidth = 140;
        this.ctx.fillText(`Click to restart`, centerX - (smallTextWidth / 2), centerY + 50, smallTextWidth);

        this.ctx.fillStyle = 'black'

    }


    saveHighscore() {
        if (this.score > this.highscore) {
            localStorage.setItem('aman-stickhero-highscore', this.score);
            this.highscore = this.score;
        }
    }


    reset() {
        this.state = { gameover: false };
        this.sceneOffset = 0;


        const blockY = this.canvasSize.height - this.blockHeight;
        this.blocks = [
            new Block(0, blockY, this.canvasSize.width * 0.2, this.blockHeight)
        ];


        this.currentBlock = 0;
        this.currentStick = 0;

        const currentBlockX = this.blocks[this.currentBlock].x;
        const currentBlockWidth = this.blocks[this.currentBlock].width;
        const playerXOffset = (currentBlockWidth - this.playerWidth) - 5;
        const playerX = currentBlockX + playerXOffset;
        const playerY = blockY - this.playerHeight;
        this.player = new Player(playerX, playerY, playerXOffset, this.playerWidth, this.playerHeight, this.state);


        const stickX = currentBlockX + currentBlockWidth;
        const stickY = blockY;

        this.sticks = [
            new Stick(stickX, stickY)
        ];


        this.score = 0;

        // generate 5 initial blocks
        this.generateFiveBlocks();


        this.gameover = false;

        this.start();
    }

}