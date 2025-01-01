class Note extends Sprite {
    constructor({ position, imageSrc, text, canvasSize }) {
        super({ imageSrc: imageSrc });

        this.position = position;

        this.showInteractionHint = false;

        this.showNoteScreen = false;
        this.text = text;

        this.canvasSize = canvasSize;
    }

    drawInteractionHint(ctx) {
        if (this.showInteractionHint) {
            ctx.save();
            ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;

            ctx.font = '12px Arial'
            ctx.fillText('Action', this.position.x, this.position.y - 5)
            ctx.restore();
        }
    }

    drawNoteScreen(ctx) {
        if (this.showNoteScreen) {
            ctx.save();
            const height = this.canvasSize.height - 300;
            ctx.fillStyle = '#E59F64'
            const notePosition = {
                x: 0, y: 300
            }
            ctx.fillRect(notePosition.x, notePosition.y, this.canvasSize.width, height);

            ctx.font = '30px Arial'
            ctx.fillStyle = 'black'
            ctx.fillText("It's tutorial time! :)", notePosition.x+20, notePosition.y+30)

            ctx.fillText("Action", notePosition.x+this.canvasSize.width-100, this.canvasSize.height-30)
            ctx.restore();
        }
    }
}