function isCollision(rect1, rect2) {
    if (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    ) {
        return true;
    }
    return false;
}


function getRandomInt(min, max, step = 1) {
    const range = Math.floor((max - min) / step) + 1;
    return min + Math.floor(Math.random() * range) * step;
}
