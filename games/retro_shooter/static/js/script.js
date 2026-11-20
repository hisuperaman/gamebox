import Bird from "./modules/bird.js";
import Explosion from "./modules/explosion.js";
import Lives from "./modules/lives.js";
import Button from "./modules/button.js";
import Cursor from "./modules/cursor.js";


document.addEventListener('DOMContentLoaded', (e)=>{

    const canvas = document.getElementById('mainCanvas');
    const ctx = canvas.getContext('2d');
    
    const collisionCanvas = document.getElementById('collisionCanvas');
    const collisionCtx = collisionCanvas.getContext('2d');
    
    collisionCanvas.width = collisionCanvas.scrollWidth;
    collisionCanvas.height = collisionCanvas.scrollHeight;
    
    let CANVAS_WIDTH = canvas.width = canvas.scrollWidth;
    let CANVAS_HEIGHT = canvas.height = canvas.scrollHeight;


    window.onload = ()=>{
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';

        animate(0);     
    }

    
    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
    
        // console.log(dpr)
    
        const width = window.innerWidth;
        const height = window.innerHeight;
    
        canvas.width = width * dpr;
        canvas.height = height * dpr;
    
        CANVAS_WIDTH = width;
        CANVAS_HEIGHT = height;
    
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        
        collisionCanvas.width = width * dpr;
        collisionCanvas.height = height * dpr;
        collisionCanvas.style.width = width + 'px';
        collisionCanvas.style.height = height + 'px';
    
    
        ctx.scale(dpr, dpr)
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    let lastPaintTime = 0;
    const paintInterval = 1000;
    let elapsedTime = 0;
    
    let birds = [];
    let explosions = [];
    
    birds.push(new Bird(CANVAS_WIDTH, CANVAS_HEIGHT));
    new Explosion(0, 0, 1, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    let score = 0;
    
    let highscore = localStorage.getItem('hisuperaman-bird_shooting');
    if(highscore==null){
        highscore = 0;
    }
    
    let isGameover = false;
    
    
    function restartGame(){
        score = 0;
        birds = [];
        explosions = [];
        elapsedTime = 0;
        lastPaintTime = 0;
        lives.reset();
        
        isGameover = false;
    
        birdSpawnFrequency = 1;
    
        canvas.style.cursor = 'none';
    
        animate(0);
    }
    
    document.addEventListener('click', (e)=>{
        const mouseX = e.clientX;
        const mouseY = e.clientY;
    
        const canvasRect = canvas.getBoundingClientRect();
        const {x: canvasX, y: canvasY} = canvasRect;
    
        const x = mouseX - canvasX;
        const y = mouseY - canvasY;
    
        if(restartButton && restartButton.isClicked(x, y)){
            restartButton = null;
            restartGame();
        }
        else{
            if(!isGameover){
                handleCollision(x, y);
            }
        }
    })
    
    const mousePos = {x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT/2};
    document.addEventListener('mousemove', (e)=>{
        const mouseX = e.clientX;
        const mouseY = e.clientY;
    
        const canvasRect = canvas.getBoundingClientRect();
        const {x: canvasX, y: canvasY} = canvasRect;
    
        const x = mouseX - canvasX;
        const y = mouseY - canvasY;
    
        mousePos.x = x;
        mousePos.y = y;
    
        if(isGameover){
            canvas.style.cursor = 'default';
        }
    })
    
    
    
    function handleCollision(x, y){
        const clickedPixel = collisionCtx.getImageData(x, y, 1, 1);
        const pixelData = clickedPixel.data;
        
    
        birds = birds.filter(bird => {
            if(bird.hitboxColorArray[0] === pixelData[0] && bird.hitboxColorArray[1] === pixelData[1] && bird.hitboxColorArray[2] === pixelData[2]){
                score += 1;
                if(score > highscore){
                    localStorage.setItem('hisuperaman-bird_shooting', score);
                    highscore = score;
                }
                return false;
            }
            return true;
        });
    
    
        explosions.push(new Explosion(x, y, 1, CANVAS_WIDTH, CANVAS_HEIGHT));
    }
    
    ctx.font = "30px serif";
    function drawScore(ctx){
        ctx.save();
        ctx.fillStyle = 'black';
        ctx.fillText(`${score}`, 12, 40);
        ctx.restore();
    }
    
    function drawHighScore(ctx){
        ctx.save();
        ctx.font = "25px serif";
        ctx.fillStyle = 'black';
        ctx.fillText(`🏆: ${highscore}`, CANVAS_WIDTH/2-50, 40);
        ctx.restore();
    }
    
    function drawGameOver(ctx){
        ctx.save();
        ctx.textAlign = "center";
        ctx.fillStyle = 'white';
        ctx.fillText(`Game Over`, CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
        ctx.fillStyle = 'black';
        ctx.fillText(`Game Over`, CANVAS_WIDTH/2+1, CANVAS_HEIGHT/2+2);
        ctx.restore();
    }
    
    const lives = new Lives(CANVAS_WIDTH - 120, 40, 3);
    
    const canvasPreferredWidth = CANVAS_WIDTH < CANVAS_HEIGHT ? CANVAS_WIDTH : CANVAS_HEIGHT;
    const cursorSize = canvasPreferredWidth * 0.1;
    const cursor = new Cursor(mousePos.x, mousePos.y, cursorSize);
    
    let restartButton = null;
    
    
    let birdSpawnFrequency = 1;
    
    function animate(timestamp){
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        collisionCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
        const deltaTime = timestamp - lastPaintTime;
        elapsedTime += deltaTime;
    
        if(elapsedTime > paintInterval){
            // update
            for (let i = 0; i < birdSpawnFrequency; i++) {
                birds.push(new Bird(CANVAS_WIDTH, CANVAS_HEIGHT))
            }
    
            birds = birds.filter(bird => !bird.markedForDeletion);
            explosions = explosions.filter(explosion => !explosion.markedForDeletion);
    
            birds.sort((a, b)=>a.width-b.width);
    
            // console.log(birds)
            elapsedTime = 0;
        }
    
        if(score > 100){
            birdSpawnFrequency = 4;
        }
        else if(score > 50){
            birdSpawnFrequency = 3;
        }
        else if(score > 10){
            birdSpawnFrequency = 2;
        }
    
        if(lives.remainingLives<=0){
            isGameover = true;
        }
    
        [...birds, ...explosions].forEach(object => object.update(deltaTime, lives));
        [...birds, ...explosions].forEach(object => object.draw(ctx, collisionCtx));
    
        drawScore(ctx);
        drawHighScore(ctx);
        lives.draw(ctx);
    
        cursor.update(mousePos.x, mousePos.y);
        cursor.draw(ctx);
    
        lastPaintTime = timestamp;
        if(!isGameover){
            requestAnimationFrame(animate);
        } 
        else{
            drawGameOver(ctx);
            restartButton = new Button(CANVAS_WIDTH/2-50, CANVAS_HEIGHT/2+20, 100, 50, 'Restart');  
            restartButton.draw(ctx);
        }
    }    
})
