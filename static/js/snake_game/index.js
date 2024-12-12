//variables
const targetFPS = 4;
const targetFrameTime = 1000/targetFPS;

const moveSFX = new Audio('../static/assets/snake_game/music/move.mp3');
const foodSFX = new Audio('../static/assets/snake_game/music/food.mp3');
const gameoverSFX = new Audio('../static/assets/snake_game/music/gameover.mp3');

let snakeArr = [{x: 8, y: 8}];
let newDir = {x: 0, y: 0};
let foodDir = {x:5, y: 5};
let lastPaintTime = 0;
let score = 0;
let highscore;
let gameover = false;

//functions
function main(timestamp){
    if(!gameover){
        window.requestAnimationFrame(main);
    }
    else{
        window.cancelAnimationFrame(main);
    }

    if((timestamp-lastPaintTime)<targetFrameTime){
        return;
    }

    lastPaintTime = timestamp;
    gameEngine();
}

function isCollision(){
    if(snakeArr[0].x == 1 || snakeArr[0].x == 18 || snakeArr[0].y == 1 || snakeArr[0].y == 18){
        return true;
    }
    for(let i=1; i<snakeArr.length-1; i++){
        if(snakeArr[0].x == snakeArr[i].x && snakeArr[0].y == snakeArr[i].y){
            return true;
        }
    }

    return false;
}

function restartGame(){
    snakeArr = [{x: 8, y: 8}];
    newDir = {x: 0, y: 0};
    foodDir = {x:5, y: 5};
    score = 0;
    displayScore.innerHTML = score;
    instructions.style.display = "block";
}

function gameEngine(){
    //updation
    if(isCollision()){
        gameoverSFX.play();
        gameoverDisplay.style.display = "block";
        playBtn.style.display = "block";
        newDir = {x: 0, y: 0};
        gameover = true;
        return;
    }

    for(let i=snakeArr.length-1; i>0; i--){
        snakeArr[i] = {...snakeArr[i-1]};
    }

    snakeArr[0].x += newDir.x;
    snakeArr[0].y += newDir.y;

    if(snakeArr[0].x == foodDir.x && snakeArr[0].y == foodDir.y){
        foodSFX.play();
        snakeArr.push({x: foodDir.x-newDir.x, y: foodDir.y-newDir.y});
        
        score += 10;
        displayScore.innerHTML = score;
        if(score>highscore){
            highscore = score;
            localStorage.setItem('snake_game_highscore', highscore);
            displayHighscore.innerHTML = highscore;
        }

        let colliding = true;

        while(colliding){
            colliding = false;
            foodDir.x = Math.floor(16 * Math.random())+2;
            foodDir.y = Math.floor(16 * Math.random())+2;
            for(let i=0; i<snakeArr.length; i++){
                if(snakeArr[i].x == foodDir.x && snakeArr[i].y == foodDir.y){
                    colliding = true;
                    break;
                }
            }
        }
    }


    //render
    box.innerHTML = "";

    snakeArr.forEach((element, i) => {
        let snakeElement = document.createElement('div');
        snakeElement.style.gridColumnStart = element.x;
        snakeElement.style.gridRowStart = element.y;
        if(i==0){
            snakeElement.classList.add('head');
        }
        else{
            snakeElement.classList.add('tail');
        }
        box.appendChild(snakeElement);
    });

    let foodElement = document.createElement('div');
    foodElement.classList.add('food');
    foodElement.style.gridColumnStart = foodDir.x;
    foodElement.style.gridRowStart = foodDir.y;
    box.appendChild(foodElement);
}


//main logic
if(localStorage.getItem('snake_game_highscore')==null){
    highscore = 0;
}
else{
    highscore = localStorage.getItem('snake_game_highscore');
}
displayHighscore.innerHTML = highscore;

function moveBtn(){
    const key = this.id;
    let actualKey;
    switch(key){
        case 'upkey':
            actualKey = 'ArrowUp';
            break;
        case 'downkey':
            actualKey = 'ArrowDown';
            break;
        case 'leftkey':
            actualKey = 'ArrowLeft';
            break;
        case 'rightkey':
            actualKey = 'ArrowRight';
            break;
        default:
            actualKey = 'w';
    }

    document.dispatchEvent(new KeyboardEvent('keyup', {'key': actualKey}));
}

function play(){
    playBtn.style.display = "none";
    instructions.style.display = "block";

    gameoverDisplay.style.display = "none";
    gameover = false;
    restartGame();

    document.addEventListener('keyup', e=>{
        const key = e.key;
        if(instructions.style.display!="none"){
            instructions.style.display = "none";
        }

        switch(key){
            case 'ArrowUp':
                if(newDir.y != 1){
	 	            moveSFX.play();
                    newDir.x = 0;
                    newDir.y = -1;
                }
                break;
            case 'ArrowDown':
                if(newDir.y != -1){
		            moveSFX.play();
                    newDir.x = 0;
                    newDir.y = 1;
                }
                break;
            case 'ArrowLeft':
                if(newDir.x != 1){
		            moveSFX.play();
                    newDir.x = -1;
                    newDir.y = 0;
                }
                break;
            case 'ArrowRight':
                if(newDir.x != -1){
		            moveSFX.play();
                    newDir.x = 1;
                    newDir.y = 0;
                }
                break;
        }
    })

    window.requestAnimationFrame(main);
}