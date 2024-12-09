const dieSFX = new Audio("../static/assets/flappy_bird/sfx/sfx_die.wav")
const hitSFX = new Audio("../static/assets/flappy_bird/sfx/sfx_hit.wav")
const pointSFX = new Audio("../static/assets/flappy_bird/sfx/sfx_point.wav")
const wingSFX = new Audio("../static/assets/flappy_bird/sfx/sfx_wing.wav")


const bird_imgs = [new Image(), new Image(), new Image()];
const bird_img_paths = ["../static/assets/flappy_bird/sprites/bird-midflap.png", "../static/assets/flappy_bird/sprites/bird-downflap.png", "../static/assets/flappy_bird/sprites/bird-upflap.png"]
bird_imgs[0].src = bird_img_paths[0]
bird_imgs[1].src = bird_img_paths[1]
bird_imgs[2].src = bird_img_paths[2]

const topPipe_img = new Image();
const bottomPipe_img = new Image();
topPipe_img.src = "../static/assets/flappy_bird/sprites/top_pipe.png";
bottomPipe_img.src = "../static/assets/flappy_bird/sprites/bottom_pipe.png";

const background_img = new Image();
background_img.src = "../static/assets/flappy_bird/sprites/background.jpg"

let current_bird_idx = 0;

let targetFPS = 30;
let targetFrameTime = 1000/targetFPS;

let lastPaintTime = 0;
let gameover = false;
let gameStarted = false;
let score = 0;
let highscore = 0;
let bird_xdir = 80;
let bird_ydir = 200;
let bird_yvelocity = 0;
let bird_ygravity = 1;
let bird_width = 34;
let bird_height = 24;

let jumpStrength = -12;

let canvas = document.getElementById("myCanvas")
ctx = canvas.getContext("2d")

let pipe_xdir = canvas.width-55;
let topPipe_ydir = 200;
let bottomPipe_ydir = 320;
let pipe_width = 52;
let pipe_height = 320;

let pipe_xgravity = 8;


const randomNumber = (min, max) => {
    let multiple = 10;
    let num = (Math.floor(Math.random() * (max - min) + min) / multiple) * multiple;
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
    if((bird_xdir>=pipe_xdir-bird_width && bird_xdir<=pipe_xdir+pipe_width) && (bird_ydir<=topPipe_ydir || bird_ydir>=bottomPipe_ydir-bird_height)){
        return true;
    }
    return false;
}

function change_birdimg(){
    current_bird_idx = (current_bird_idx + 1) % bird_img_paths.length;
}

function isScore(){
    if((bird_xdir>=pipe_xdir && bird_xdir<=pipe_xdir+pipe_xgravity) && (bird_ydir>topPipe_ydir || bird_ydir<bottomPipe_ydir-bird_height)){
        return true;
    }
    return false;
}

function restartGame(){
    gameover = false;
    gameStarted = false;
    bird_xdir = 80;
    bird_ydir = 200;
    pipe_xdir = canvas.width-55;
    topPipe_ydir = 200;
    bottomPipe_ydir = 320;
    play_again.style.display = "none";
    instructions.style.display = "block";
    score = 0;
    score_display.innerHTML = score;
    gameEngine();
}

if(localStorage.getItem('flappy_bird_highscore')==null){
    highscore = 0;
}
else{
    highscore = localStorage.getItem('flappy_bird_highscore');
}
highscore_display.innerHTML = highscore;

function gameEngine(){
    // update
    bird_yvelocity += bird_ygravity;
    bird_ydir += bird_yvelocity;

    pipe_xdir -= pipe_xgravity;

    if(isCollision()){
        hitSFX.play()
        gameover = true;
    }

    if(isScore()){
        pointSFX.play()
        score += 1;
        if(score>highscore){
            highscore = score;
        }
        score_display.innerHTML = score;
        highscore_display.innerHTML = highscore;
        localStorage.setItem("flappy_bird_highscore", highscore);
    }

    if(bird_ydir>=canvas.height-bird_height || bird_ydir<=0){
        dieSFX.play();
        gameover = true;
    }

    // draw
    ctx.drawImage(background_img, 0, 0)

    ctx.beginPath()
    ctx.fillStyle = "rgba(0,0,0,0)"
    ctx.fillRect(bird_xdir, bird_ydir, bird_width, bird_height)
    ctx.drawImage(bird_imgs[current_bird_idx], bird_xdir, bird_ydir)

    
    ctx.fillRect(pipe_xdir, topPipe_ydir, pipe_width, -pipe_height)
    ctx.drawImage(topPipe_img, pipe_xdir, topPipe_ydir-pipe_height)

    ctx.fillRect(pipe_xdir, bottomPipe_ydir, pipe_width, pipe_height)
    ctx.drawImage(bottomPipe_img, pipe_xdir, bottomPipe_ydir)

    if(pipe_xdir+pipe_width<=0){
        pipe_xdir = canvas.width;
        let random_offset = randomNumber(100, 300)
        topPipe_ydir = random_offset
        bottomPipe_ydir = random_offset+120
    }
    change_birdimg()
}

let keyreleased = true;

document.addEventListener("keydown", e=>{
    let key = e.code;
    if (keyreleased){
        keyreleased = false;
        fly_bird(key)
    }
})

document.addEventListener("keyup", e=>{
    keyreleased = true;
})

window.onload = ()=>{
    loadingScreen.style.display = "none";
    mainContent.style.display = "block";
    gameEngine();
}
function startGame(){
    if(gameStarted && !gameover){
        instructions.style.display = "none";
        window.requestAnimationFrame(main);
    }
}

function fly_bird(key){
    if(key=="Space"){
        if (!gameover){
            wingSFX.play()
            bird_yvelocity = jumpStrength;
        }
        gameStarted = true;
        startGame();
    }
}