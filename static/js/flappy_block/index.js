const dieSFX = new Audio("../static/assets/flappy_block/sfx/sfx_die.wav")
const hitSFX = new Audio("../static/assets/flappy_block/sfx/sfx_hit.wav")
const pointSFX = new Audio("../static/assets/flappy_block/sfx/sfx_point.wav")
const wingSFX = new Audio("../static/assets/flappy_block/sfx/sfx_wing.wav")

let targetFPS = 6;
let targetFrameTime = 1000/targetFPS;

const box_start = 1
const box_end = 20

let lastPaintTime = 0;
let bird_xdir = 4;
let bird_ydir = 10;
let obstacle_xdir = 20;
let topPipe_dir = {start: 1, end: 10}
let bottomPipe_dir = {start: 15, end: 21}
let gameover = false;
let gameStarted = false;
let score = 0;
let highscore = 0;


const randomNumber = (min, max) => {
    num = Math.floor(Math.random() * (max - min) + min);
    return num;
}


function main(timestamp){
    if(gameover){
        window.cancelAnimationFrame(main);
        play_again.style.display = "block";
        return;
    }
    else{
        window.requestAnimationFrame(main);
    }

    if((timestamp-lastPaintTime)<targetFrameTime){
        return;
    }

    lastPaintTime = timestamp;

    gameEngine();
}

function isCollision(){
    if ((bird_xdir>=obstacle_xdir-1 && bird_xdir<=obstacle_xdir) && (bird_ydir<=topPipe_dir.end || bird_ydir>=bottomPipe_dir.start)){
        return true;
    }
    return false;
}

function isScore(){
    if (bird_xdir==obstacle_xdir+1 && (bird_ydir>=topPipe_dir.end && bird_ydir<=bottomPipe_dir.start)){
        return true;
    }
    return false;
}

function restartGame(){
    gameover = false;
    gameStarted = false;
    bird_xdir = 4;
    bird_ydir = 10;
    obstacle_xdir = 20;
    topPipe_dir = {start: 1, end: 10};
    bottomPipe_dir = {start: 15, end: 21};
    play_again.style.display = "none";
    instructions.style.display = "block";
    score = 0;
    score_display.innerHTML = score;
    gameEngine();
}

function gameEngine(){
    // update
    bird_ydir += 1;
    obstacle_xdir -= 1;

    if(isScore()){
        pointSFX.play();
        score += 10;
        score_display.innerHTML = score;
        if(score>highscore){
            highscore = score;
            localStorage.setItem('flappy_block_highscore', highscore);
            highscore_display.innerHTML = highscore;
        }
    }

    if (obstacle_xdir<=box_start){
        topPipe_dir.end = randomNumber(6, 10);
        bottomPipe_dir.start = randomNumber(12, 16);
        obstacle_xdir = 20;
    }

    if(isCollision()){
        hitSFX.play();
        gameover = true;
    }

    if(bird_ydir>=20 || bird_ydir<=1){
        dieSFX.play();
        gameover = true;
    }

    
    

    // draw
    box.innerHTML = ""
    let birdElement = document.createElement('div');
    birdElement.classList.add('bird');
    birdElement.style.gridColumnStart = bird_xdir;
    box.appendChild(birdElement);

    birdElement.style.gridRowStart = bird_ydir;


    let topPipe = document.createElement('div');
    topPipe.classList.add('obstacle');
    topPipe.style.gridColumnStart = obstacle_xdir;
    topPipe.style.gridRowStart = topPipe_dir.start;
    topPipe.style.gridRowEnd = topPipe_dir.end;
    box.appendChild(topPipe);

    let bottomPipe = document.createElement('div');
    bottomPipe.classList.add('obstacle');
    bottomPipe.style.gridColumnStart = obstacle_xdir;
    bottomPipe.style.gridRowStart = bottomPipe_dir.start;
    bottomPipe.style.gridRowEnd = bottomPipe_dir.end;
    box.appendChild(bottomPipe);
}

let keyreleased = true;

document.addEventListener("keydown", e=>{
    if (keyreleased){
        keyreleased = false;
        if (!gameover){
            wingSFX.play();
            bird_ydir -= 3;
        }
        
        gameStarted = true;
        startGame();
    }
})

document.addEventListener("keyup", e=>{
    keyreleased = true;
})

if(localStorage.getItem('flappy_block_highscore')==null){
    highscore = 0;
}
else{
    highscore = localStorage.getItem('flappy_block_highscore');
}
highscore_display.innerHTML = highscore;

gameEngine();
function startGame(){
    if(gameStarted && !gameover){
        instructions.style.display = "none";
        window.requestAnimationFrame(main);
    }
}

function moveBtn(){

    document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Space'}));
    document.dispatchEvent(new KeyboardEvent('keyup', {'key': 'Space'}));
}