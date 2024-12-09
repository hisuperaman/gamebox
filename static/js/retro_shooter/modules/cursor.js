export default class Cursor{
    constructor(x, y, size){
        this.size = size;
        
        this.x = x - this.size/2;
        this.y = y - this.size/2;

        this.cursorImage = new Image();
        this.cursorImage.src = '../static/assets/retro_shooter/sprites/cursor.png';
    }
    update(x, y){
        this.x = x - this.size/2;
        this.y = y - this.size/2;
    }
    draw(ctx){
        ctx.drawImage(this.cursorImage, this.x, this.y, this.size, this.size);
    }
}