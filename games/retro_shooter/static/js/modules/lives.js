export default class Lives{
    constructor(x, y, totalLives){
        this.x = x;
        this.y = y;

        this.totalLives = totalLives;
        this.lostLives = 0;
        this.remainingLives = this.totalLives;

        this.sfx = new Audio('/game/retro_shooter/static/assets/sfx/life_lost.wav');
    }
    loseLive(){
        if(this.lostLives<this.totalLives){
            this.sfx.play()
            this.lostLives += 1;
            this.remainingLives = this.totalLives - this.lostLives;
        }
    }
    reset(){
        this.lostLives = 0;
        this.remainingLives = this.totalLives;
    }
    draw(ctx){
        ctx.save();
        ctx.fillStyle = 'black';
        ctx.font = "25px serif";
        ctx.fillText(`❤️`.repeat(this.remainingLives), this.x, this.y);
        ctx.restore();
    }
}