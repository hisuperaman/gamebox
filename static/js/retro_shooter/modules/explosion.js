export default class Explosion{
    constructor(x, y, scale, canvasWidth, canvasHeight){
        this.spriteSheet = new Image();
        this.spriteSheet.src = '../static/assets/retro_shooter/sprites/explosion.png'

        this.frame = 0;
        this.totalFrames = 5;

        this.spriteWidth = 1000/this.totalFrames;
        this.spriteHeight = 179;
        this.scale = scale;

        this.width = this.spriteWidth * this.scale;
        this.height = this.spriteHeight * this.scale;
        
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        this.x = x - this.spriteWidth/2;
        this.y = y - this.spriteHeight/2;


        this.lastExplosionTime = 0;
        this.explosionInterval = 100;

        this.markedForDeletion = false;

        this.sfx = new Audio('../static/assets/retro_shooter/sfx/explosion.wav');

    }
    update(deltaTime){
        if(this.frame == 0){
            this.sfx.play();
        }

        if(this.frame >= this.totalFrames){
            this.markedForDeletion = true;
        }

        if(this.lastExplosionTime > this.explosionInterval){
            this.frame += 1;
            this.lastExplosionTime = 0;
        }
        
        this.lastExplosionTime += deltaTime;
    }
    draw(ctx){
        ctx.drawImage(this.spriteSheet, this.spriteWidth * this.frame, 0, this.spriteWidth, this.spriteHeight, this.x, this.y, this.width, this.height);
    }
}