import { getRandomDecimal, getRandomInteger } from "./helpers.js";

export default class Bird{
    constructor(canvasWidth, canvasHeight){

        let canvasPreferredWidth = canvasWidth < canvasHeight ? canvasWidth : canvasHeight;

        this.sprites = [
            new Image(),
            new Image(),
            new Image(),
            new Image(),
            new Image(),
            new Image(),
            new Image(),
            new Image(),
            new Image(),
            new Image(),
            new Image(),
            new Image(),
            new Image(),
            new Image(),
            new Image(),
            new Image(),
            new Image(),
        ];
        this.sprites.forEach((sprite, index)=>{
            sprite.src = `../static/assets/retro_shooter/sprites/skeleton-01_fly_${index.toString().padStart(2, '0')}.png`
        });

        this.spriteWidth = 1327;
        this.spriteHeight = 863;

        this.scale = getRandomDecimal((canvasPreferredWidth * 0.015)/100, (canvasPreferredWidth * 0.03)/100);
        // this.scale = getRandomDecimal(0.08, 0.15);

        this.width = this.spriteWidth * this.scale;
        this.height = this.spriteHeight * this.scale;
        
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        this.x = this.canvasWidth;
        this.y = getRandomDecimal(0, this.canvasHeight-this.height);

        this.frame = 0;
        this.totalFrames = 17;

        this.lastFlapTime = 0;
        this.flapInterval = getRandomInteger(15, 50);

        this.velocityX = getRandomDecimal(1.5, 4);
        this.velocityY = getRandomDecimal(-1.5, 1.5);

        this.markedForDeletion = false;

        this.hitboxColorArray = [getRandomInteger(0, 255), getRandomInteger(0, 255), getRandomInteger(0, 255)];
        this.hitboxColor = `rgb(${this.hitboxColorArray[0]}, ${this.hitboxColorArray[1]}, ${this.hitboxColorArray[2]})`;
    }
    update(deltaTime, lives){
        if(this.x+this.width < 0 && !this.markedForDeletion){
            lives.loseLive();
            this.markedForDeletion = true;
        }


        if(this.y < 0 || this.y > this.canvasHeight-this.height){
            this.velocityY *= -1;
        }

        this.x -= this.velocityX;
        this.y += this.velocityY;

        if(this.lastFlapTime > this.flapInterval){
            this.frame = (this.frame + 1) % this.totalFrames;
            this.lastFlapTime = 0;
        }
        
        this.lastFlapTime += deltaTime;
    }
    draw(ctx, collisionCtx){
        collisionCtx.fillStyle = this.hitboxColor;
        collisionCtx.fillRect(this.x, this.y, this.width, this.height);
        ctx.drawImage(this.sprites[this.frame], this.x, this.y, this.width, this.height);
    }
}