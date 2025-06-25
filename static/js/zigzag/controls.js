class Controls {
    constructor() {
        this.up = false;
        this.down = false;
        this.left = false;
        this.right = false;

        this.action = false;

        this.actionPressedOnce = false

        this.#addKeyboardControls();
        this.#addTouchControls();
    }

    #addTouchControls() {
        document.addEventListener('pointerdown', (e) => {
            this.actionPressedOnce = true;
            this.action = true;
        })
    }

    #addKeyboardControls() {
        const pressedKeys = new Set()
        document.addEventListener('keydown', (e) => {
            const key = e.code;

            if (pressedKeys.has(key)) return

            pressedKeys.add(key)

            switch (key) {
                case 'ArrowUp':
                    this.up = true;

                    break;
                case 'ArrowDown':
                    this.down = true;

                    break;
                case 'ArrowLeft':
                    this.left = true;
                    break;
                case 'ArrowRight':
                    this.right = true;
                    break;
                case 'Space':
                    // this.up = true
                    this.actionPressedOnce = true;
                    this.action = true;

                    break;
                default:
                    break;
            }
        });
        document.addEventListener('keyup', (e) => {
            const key = e.code;

            pressedKeys.delete(key);

            switch (key) {
                case 'ArrowUp':
                    this.up = false;
                    break;
                case 'ArrowDown':
                    this.down = false;
                    break;
                case 'ArrowLeft':
                    this.left = false;
                    break;
                case 'ArrowRight':
                    this.right = false;
                    break;
                case 'Space':
                    // this.up = false
                    this.action = false;
                    break;
                default:
                    break;
            }
        });
    }

    consumeAction() {
        const wasPressed = this.actionPressedOnce;
        this.actionPressedOnce = false;
        return wasPressed;
    }
}