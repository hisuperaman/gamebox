class Player extends Sprite {
    constructor({ x, y, canvasSize, collisionBlocks, animations, currentAnimation, doors }) {
        super({ imageSrc: animations[currentAnimation]['imageSrc'], frameRate: animations[currentAnimation]['frameRate'], animations, currentAnimation })
        this.position = { x, y };

        this.gravity = 1;
        this.velocity = {
            x: 2, y: 0
        }

        this.jumpStrength = 12;
        this.speed = 3;

        this.canvasSize = canvasSize;

        this.controls = new Controls();

        this.collisionBlocks = collisionBlocks;

        this.hitbox = {
            position: {
                x: this.position.x + 54,
                y: this.position.y + 33
            },
            width: 50,
            height: 54
        }

        this.preventInput = false;

        this.doors = doors;

        this.atGround = false;
    }

    update() {
        this.position.x += this.velocity.x;

        this.#updateHitbox();

        this.#handleHorizontalCollision()
        this.#applyGravity();

        this.#updateHitbox();

        this.#handleVerticalCollision()

        this.#handleMovement();

    }

    #updateHitbox() {
        this.hitbox = {
            position: {
                x: this.position.x + 54,
                y: this.position.y + 33
            },
            width: 50,
            height: 54
        }
    }

    #handleDoorCollision() {


    }

    #handleHorizontalCollision() {
        for (let i = 0; i < this.collisionBlocks.length; i++) {
            const block = this.collisionBlocks[i];

            if (
                isCollision(this.hitbox.position.x, this.hitbox.position.y, this.hitbox.width, this.hitbox.height,
                    block.position.x, block.position.y, block.width, block.height)
            ) {
                if (this.velocity.x < 0) {
                    const offset = this.hitbox.position.x - this.position.x;
                    this.position.x = block.position.x + block.width - offset + 0.01;
                    break;
                }
                if (this.velocity.x > 0) {
                    const offset = this.hitbox.position.x - this.position.x + this.hitbox.width;
                    this.position.x = block.position.x - offset - 0.01;
                    break;
                }
            }
        }
    }
    #handleVerticalCollision() {
        for (let i = 0; i < this.collisionBlocks.length; i++) {
            const block = this.collisionBlocks[i];
            if (
                isCollision(this.hitbox.position.x, this.hitbox.position.y, this.hitbox.width, this.hitbox.height,
                    block.position.x, block.position.y, block.width, block.height)
            ) {
                if (this.velocity.y < 0) {
                    this.velocity.y = 0;
                    const offset = this.hitbox.position.y - this.position.y
                    this.position.y = block.position.y + block.height - offset + 0.01;
                    break;
                }
                if (this.velocity.y > 0) {
                    this.atGround = true;

                    this.velocity.y = 0;
                    const offset = this.hitbox.position.y - this.position.y + this.hitbox.height;
                    this.position.y = block.position.y - offset - 0.01;
                    break;
                }
            }
        }
    }

    #applyGravity() {
        this.velocity.y += this.gravity;
        this.position.y += this.velocity.y;
    }

    #handleMovement() {
        if(this.preventInput) return;

        if (this.controls.up && this.atGround) {
            for (let i = 0; i < this.doors.length; i++) {
                const door = this.doors[i];

                if (
                    isCollision(
                        this.hitbox.position.x, this.hitbox.position.y, this.hitbox.width, this.hitbox.height,
                        door.position.x, door.position.y, door.width, door.height
                    )
                ) {
                    const difference = Math.abs((this.hitbox.position.x + this.hitbox.width / 2) - (door.position.x + door.width / 2));
                    const offset = 10;
                    if (
                        difference <= offset
                    ) {
                        this.velocity.x = 0;
                        this.velocity.y = 0;
                        this.preventInput = true;
                        this.switchSprite('enterDoor')
                        door.play()
                        return;
                    }
                }
            }

            this.atGround = false;
            if (this.velocity.y == 0 && this.position.y > this.position.y-this.jumpStrength) this.velocity.y = -this.jumpStrength;
        }

        if (this.controls.left) {
            if (this.currentAnimation != 'runLeft') this.switchSprite('runLeft')

            this.velocity.x = -this.speed;
        }
        else if (this.controls.right) {
            if (this.currentAnimation != 'runRight') this.switchSprite('runRight')

            this.velocity.x = this.speed;
        }
        else {
            if (this.velocity.x > 0) {
                if (this.currentAnimation != 'idleRight') this.switchSprite('idleRight')
            }
            else if (this.velocity.x < 0) {
                if (this.currentAnimation != 'idleLeft') this.switchSprite('idleLeft')
            }

            this.velocity.x = 0;
        }
    }
}