Array.prototype.parse2D = function () {
    let rows = [];
    for (let i = 0; i < this.length; i += 16) {
        rows.push(this.slice(i, i + 16));
    }
    return rows;
}


function getCollisionBlocks(collisionMap) {
    let collisionBlocks = [];

    collisionMap.forEach((row, y) => {
        row.forEach((symbol, x) => {
            if (symbol == 292 || symbol == 250) {
                collisionBlocks.push(
                    new CollisionBlock({
                        position: { x: x * 64, y: y * 64 }
                    })
                )
            }
        })
    });
    return collisionBlocks;
}


function isCollision(rect1X, rect1Y, rect1Width, rect1Height, 
                    rect2X, rect2Y, rect2Width, rect2Height) {
    if (
        rect1X < rect2X + rect2Width &&
        rect1X + rect1Width > rect2X &&
        rect1Y < rect2Y + rect2Height &&
        rect1Y + rect1Height > rect2Y
    ) {
        return true;
    }
    return false;
}