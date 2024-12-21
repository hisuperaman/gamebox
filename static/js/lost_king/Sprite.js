class Sprite {
    constructor({ position, imageSrc, frameRate = 1, loop = true, autoplay = true, animations, currentAnimation }) {
        this.position = position;
        this.image = new Image();
        this.image.src = imageSrc;
        this.loaded = false;
        this.image.onload = () => {
            this.width = this.image.width / frameRate;
            this.height = this.image.height;
            this.loaded = true;
        }

        this.frameRate = frameRate;
        this.frameBuffer = 2;
        this.elapsedFrames = 0;
        this.currentFrame = 0;

        this.loop = loop;
        this.autoplay = autoplay;

        if (animations) {
            this.animations = animations;
            for (const key in this.animations) {
                const image = new Image();
                image.src = this.animations[key]['imageSrc'];
                image.onload = () => {
                    this.width = this.image.width / frameRate;
                    this.height = this.image.height;
                    this.image = this.animations[currentAnimation]['image'];
                    this.frameRate = this.animations[currentAnimation]['frameRate'];
                    this.frameBuffer = this.animations[currentAnimation]['frameBuffer']
                    this.currentAnimation = currentAnimation;
                    this.loaded = true;
                }
                this.animations[key]['image'] = image;
            }
        }
    }

    draw(ctx) {
        if (!this.loaded) return;
        // ctx.fillRect(this.position.x, this.position.y, this.width, this.height)

        // if(this.hitbox) {
        //     ctx.save()
        //     ctx.fillStyle = 'blue'
        //     ctx.fillRect(this.hitbox.position.x, this.hitbox.position.y, this.hitbox.width, this.hitbox.height)
        //     ctx.restore()
        // }

        const cropBox = {
            sx: this.width * this.currentFrame,
            sy: 0,
            sw: this.width,
            sh: this.height
        }
        ctx.drawImage(this.image,
            cropBox.sx,
            cropBox.sy,
            cropBox.sw,
            cropBox.sh,
            this.position.x,
            this.position.y,
            this.width,
            this.height);

        if(this.autoplay) this.updateFrames();
    }

    updateFrames() {
        if (this.frameRate == 1) return;
        if(this.currentFrame >= this.frameRate-1 && !this.loop) return;
        
        if (this.elapsedFrames % this.frameBuffer == 0) {
            this.currentFrame = (this.currentFrame + 1) % this.frameRate;
        }
        this.elapsedFrames++;

        if(this.currentAnimation && this.animations[this.currentAnimation]?.onComplete) {
            if(this.currentFrame == this.frameRate-1) {
                this.animations[this.currentAnimation].onComplete()
            }
        }
    }

    play() {
        this.autoplay = true;
    }

    switchSprite(name) {
        this.image = this.animations[name]['image'];
        this.frameRate = this.animations[name]['frameRate'];
        this.frameBuffer = this.animations[name]['frameBuffer']
        
        if(this.animations[name]['loop'] != undefined) this.loop = this.animations[name]['loop'] 
        else this.loop = true;
        if(this.animations[name]['autoplay'] != undefined) this.autoplay = this.animations[name]['autoplay'];
        else this.autoplay = true;
        
        this.width = this.image.width / this.frameRate;
        this.height = this.image.height;
        this.currentFrame = 0;
        this.currentAnimation = name;
    }
}