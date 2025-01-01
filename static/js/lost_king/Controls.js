class Controls {
    constructor() {
        this.up = false;
        this.down = false;
        this.left = false;
        this.right = false;

        this.action = false;

        this.joystick = nipplejs.create({
            zone: document.getElementById('joystick-container'),
            mode: 'static',
            position: { left: '100px', bottom: '40px' },
            color: 'white',
        });

        this.actionButton = document.getElementById('actionButton');
        this.jumpButton = document.getElementById('jumpButton');

        this.#addKeyboardControls();

        this.#addTouchControls();
    }

    #addTouchControls() {
        this.joystick.on('move', (evt, data) => {
            if (data.direction) {
                if (data.direction.angle === 'up') null;
                else this.up = false;
                if (data.direction.angle === 'down') this.down = true;
                else this.down = false;
                if (data.direction.angle === 'left') this.left = true;
                else this.left = false;
                if (data.direction.angle === 'right') this.right = true;
                else this.right = false;
            }
        });

        this.joystick.on('end', () => {
            this.up = false;
            this.down = false;
            this.left = false;
            this.right = false;
        })

        this.actionButton.addEventListener('pointerdown', (e) => {
            this.action = true;
        })
        this.actionButton.addEventListener('pointerup', (e) => {
            this.action = false;
        })
        this.jumpButton.addEventListener('pointerdown', (e) => {
            this.up = true;
        })
        this.jumpButton.addEventListener('pointerup', (e) => {
            this.up = false;
        })
    }

    #addKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            const key = e.code;

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
                    this.action = true;
                    break;
                default:
                    break;
            }
        });
        document.addEventListener('keyup', (e) => {
            const key = e.code;

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
                    this.action = false;
                    break;
                default:
                    break;
            }
        });
    }

}