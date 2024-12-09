const crashSFX = new Audio("../static/assets/dodge_racing/sfx/sfx_crash.mp3");
const bgm = new Audio("../static/assets/dodge_racing/sfx/bgm.mp3");
const moveSFX = new Audio("../static/assets/dodge_racing/sfx/sfx_move.mp3");
const scoreSFX = new Audio("../static/assets/dodge_racing/sfx/sfx_score.mp3");
const startgameSFX = new Audio("../static/assets/dodge_racing/sfx/sfx_startgame.mp3");

moveSFX.volume = 0.5;
scoreSFX.volume = 0.5;

const background_img = new Image();
background_img.src = "../static/assets/dodge_racing/sprites/myroad.png"
const my_car_img = new Image();
my_car_img.src = "../static/assets/dodge_racing/sprites/my_car.png"
const enemy_cars_img = [new Image(), new Image()];
enemy_cars_img[0].src = "../static/assets/dodge_racing/sprites/enemy_car1.png";
enemy_cars_img[1].src = "../static/assets/dodge_racing/sprites/enemy_car2.png";

let car_height = 100;
let car_width = 60;

let road_left_x = 180;
let road_right_x = 260;
let car_x_dirs = [road_left_x, road_right_x]

let my_car_xdir = 180;
let my_car_ydir = 385;

let enemy_car1_x = road_left_x;
let enemy_car2_x = road_right_x;
let enemy_car1_y = -100;
let enemy_car2_y = -100-(car_height*2+50);
let current_enemy_car1 = enemy_cars_img[0];
let current_enemy_car2 = enemy_cars_img[1];
let my_car_speed = 5;

let targetFPS = 40;
let targetFrameTime = 1000/targetFPS;

let lastPaintTime = 0;
let gameover = false;
let gameStarted = false;
let score = 0;
let highscore = 0;

let bg_y = 0;

let side_collision = false;

let canvas = document.getElementById("myCanvas")
ctx = canvas.getContext("2d")

const randomNumber = (min, max) => {
    let num = (Math.floor(Math.random() * (max - min) + min));
    return num;
}

const randomNumberMultiple10 = (min, max) => {
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
    if((enemy_car1_x==my_car_xdir && (enemy_car1_y>=my_car_ydir-(car_height-10) && enemy_car1_y<=my_car_ydir+(car_height-10))) || (enemy_car2_x==my_car_xdir && (enemy_car2_y>=my_car_ydir-(car_height-10) && enemy_car2_y<=my_car_ydir+(car_height-10)))){
        return true;
    }
    return false;
}

let alreadyScored = false;
function isScore(){
    if((my_car_ydir<=enemy_car1_y) || (my_car_ydir<=enemy_car2_y)){
        alreadyScored = false;
    }
    if(!alreadyScored){
        let y_dir_offset = 50;
        if((my_car_xdir!=enemy_car1_x && my_car_ydir>=enemy_car1_y && my_car_ydir<=enemy_car1_y+(car_height-y_dir_offset)) || (my_car_xdir!=enemy_car2_x && my_car_ydir>=enemy_car2_y && my_car_ydir<=enemy_car2_y+(car_height-y_dir_offset))){
            alreadyScored = true;
            return true;
        }

    }
    return false;
}

function restartGame(){
    gameover = false;
    gameStarted = false;
    my_car_xdir = 180;
    my_car_ydir = 385;
    enemy_car1_y = -100;
    enemy_car2_y = -100-(car_height*2+50);
    my_car_speed = 5;

    play_again.style.display = "none";
    instructions.style.display = "block";
    move_left_btn.style.display = "none";
    move_right_btn.style.display = "none";
    start_btn.style.display = "flex";

    score = 0;
    score_display.innerHTML = score;
    gameEngine();
    return;
}

function spawn_enemy_cars(){
    if(enemy_car1_y>=canvas.height){
        let randomOffset = randomNumberMultiple10(0, 500);
        enemy_car1_y = -car_height-50-randomOffset;
        // console.log(enemy_car1_y)

        enemy_car1_x = car_x_dirs[randomNumber(0, car_x_dirs.length)];
    }
    else{
        let randomOffset = randomNumberMultiple10(car_height+10, 500);
        enemy_car2_y = -car_height-50-randomOffset;
        // console.log(enemy_car2_y)

        enemy_car2_x = car_x_dirs[randomNumber(0, car_x_dirs.length)];
    }
    
}

if(localStorage.getItem('dodge_racing_highscore')!=null){
    highscore = localStorage.getItem('dodge_racing_highscore');
}
else{
    highscore = 0;
}
highscore_display.innerHTML = highscore;

function gameEngine(){
    // update
    if(gameStarted && !gameover){
        bgm.play();
    }
    
    bg_y += my_car_speed;
    enemy_car1_y += my_car_speed;
    enemy_car2_y += my_car_speed;

    if(isCollision()){
        bgm.pause();
        bgm.currentTime = 0;
        crashSFX.play();
        gameover = true;
    }

    if(isScore()){
        scoreSFX.play();
        score += 1;
        score_display.innerHTML = score;
        my_car_speed += 0.2;
        if(score>highscore){
            highscore = score;
            highscore_display.innerHTML = highscore;
            localStorage.setItem("dodge_racing_highscore", highscore);
        }
    }

    // draw
    ctx.drawImage(background_img, 0, bg_y);
    ctx.drawImage(background_img, 0, (bg_y+1)-canvas.height);

    ctx.beginPath();
    if(!isCollision()){
        ctx.drawImage(my_car_img, my_car_xdir, my_car_ydir);
    }
    else{
        // console.log((Math.abs(enemy_car1_y-enemy_car2_y)));
        if(!side_collision){
            ctx.drawImage(my_car_img, my_car_xdir, my_car_ydir);
        }
        else{
            if(my_car_xdir==road_left_x){
                ctx.drawImage(my_car_img, road_right_x-(car_width/2), my_car_ydir);
            }
            else{
                ctx.drawImage(my_car_img, road_left_x+(car_width/2), my_car_ydir);
            }

        }
    }

    ctx.drawImage(current_enemy_car1, enemy_car1_x, enemy_car1_y);
    ctx.drawImage(current_enemy_car2, enemy_car2_x, enemy_car2_y);

    if(enemy_car1_y>=canvas.height || enemy_car2_y>=canvas.height){
        spawn_enemy_cars();
    }

    if((Math.abs(enemy_car1_y-enemy_car2_y)<=(car_height*3)) && enemy_car1_y<-90 && enemy_car2_y<-90){
        if(enemy_car1_x!=enemy_car2_x){
            // console.log("different")
            if(enemy_car1_y<=enemy_car2_y){
                enemy_car1_y -= car_height*randomNumber(3, 6);
            }
            else{
                enemy_car2_y += enemy_car1_y-(car_height*randomNumber(3, 6));
            }
        }
        else{
            // console.log("same")
            if(enemy_car1_y>=enemy_car2_y){
                enemy_car1_y -= car_height*randomNumber(2, 5);
            }
            else{
                enemy_car2_y -= car_height*randomNumber(2, 5);
            }
        }
    }

    if(bg_y>=canvas.height){
        bg_y = 0;
    }

    side_collision = false;
}

let keyreleased = true;

document.addEventListener("keydown", e=>{
    let key = e.code;
    if(key=='Space' && !gameStarted){
        gameStarted = true;
        startGame();
    }
    else{
        if(gameStarted){
            move_car(key);
        }
    }
})

window.onload = ()=>{
    loadingScreen.style.display = "none";
    mainContent.style.display = "block";
    gameEngine();
}

function startGame(){
    if(gameStarted && !gameover){
        instructions.style.display = "none";
        move_left_btn.style.display = "flex";
        move_right_btn.style.display = "flex";
        start_btn.style.display = "none";

        window.requestAnimationFrame(main);
    }
}

function move_car(key){
    if(key=='ArrowLeft' || key=='ArrowRight'){
        if (!gameover){
            moveSFX.play();
            if(key=='ArrowRight'){
                my_car_xdir = road_right_x;
                if(isCollision()){
                    side_collision = true;
                }
            }
            else if(key=='ArrowLeft'){
                my_car_xdir = road_left_x;
                if(isCollision()){
                    side_collision = true;
                }
            }
        }
    }
}

function space_click(){
    if(!gameStarted){
        startgameSFX.play();
        gameStarted = true;
        startGame();
    }
}