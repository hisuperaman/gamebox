export function getRandomInteger(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomDecimal(min, max){
    return (Math.random() * (max - min)) + min;
}