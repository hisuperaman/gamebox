let current_player = 1;
let p1_sign, p2_sign;

function toggle_start(){
    let max = 1;
    this.value = this.value.substring(0, max);
    let input_sign = this.value.toUpperCase();
    let inputWarning = document.getElementById('inputWarning');
    if(input_sign=='X'||input_sign=='O'){
        inputWarning.style.display = "none";
        document.getElementById('start_btn').disabled = false;
    }
    else{
        inputWarning.style.display = `block`;
        document.getElementById('start_btn').disabled = true;
    }
}

function btn(){
    if(this.innerHTML==''){
        if(current_player==1){
            (p1_sign=='O')?(this.style.color = "blue"):(this.style.color = "red");
            this.innerHTML = p1_sign;
        }
        else{
            (p2_sign=='O')?(this.style.color = "blue"):(this.style.color = "red");
            this.innerHTML = p2_sign;
        }
    }

    let items = document.getElementsByClassName('items');
    let winnerElement = document.getElementById('winner');
    let container = document.getElementById('container');
    let winner = null, filled=false;
    let itemsArray = [];

    for(let i=0; i<items.length; i++){
        itemsArray[i] = items[i].innerHTML;
    }


    if((itemsArray[0]==itemsArray[1]&&itemsArray[0]==itemsArray[2])&&(itemsArray[0]==p1_sign||itemsArray[0]==p2_sign)){
        (itemsArray[0]==p1_sign)?(winner="Player1"):(winner="Player2");
    }
    else if((itemsArray[3]==itemsArray[4]&&itemsArray[3]==itemsArray[5])&&(itemsArray[3]==p1_sign||itemsArray[3]==p2_sign)){
        (itemsArray[3]==p1_sign)?(winner="Player1"):(winner="Player2");
    }
    else if((itemsArray[6]==itemsArray[7]&&itemsArray[6]==itemsArray[8])&&(itemsArray[6]==p1_sign||itemsArray[6]==p2_sign)){
        (itemsArray[6]==p1_sign)?(winner="Player1"):(winner="Player2");
    }

    else if((itemsArray[0]==itemsArray[3]&&itemsArray[0]==itemsArray[6])&&(itemsArray[0]==p1_sign||itemsArray[0]==p2_sign)){
        (itemsArray[0]==p1_sign)?(winner="Player1"):(winner="Player2");
    }
    else if((itemsArray[1]==itemsArray[4]&&itemsArray[1]==itemsArray[7])&&(itemsArray[1]==p1_sign||itemsArray[1]==p2_sign)){
        (itemsArray[1]==p1_sign)?(winner="Player1"):(winner="Player2");
    }
    else if((itemsArray[2]==itemsArray[5]&&itemsArray[2]==itemsArray[8])&&(itemsArray[2]==p1_sign||itemsArray[2]==p2_sign)){
        (itemsArray[2]==p1_sign)?(winner="Player1"):(winner="Player2");
    }

    else if((itemsArray[0]==itemsArray[4]&&itemsArray[0]==itemsArray[8])&&(itemsArray[0]==p1_sign||itemsArray[0]==p2_sign)){
        (itemsArray[2]==p1_sign)?(winner="Player1"):(winner="Player2");
    }
    else if((itemsArray[2]==itemsArray[4]&&itemsArray[2]==itemsArray[6])&&(itemsArray[2]==p1_sign||itemsArray[2]==p2_sign)){
        (itemsArray[2]==p1_sign)?(winner="Player1"):(winner="Player2");
    }
    else{
        filled = true;
        itemsArray.forEach(element => {
            if(element==''){
                filled = false;
            }
        });
    }

    if(winner!=null || filled!=false){
        if(winner!=null){
            document.getElementById('who_win').innerHTML = `${winner} won!`;
            for(let i=0; i<items.length; i++){
                items[i].disabled = true;
            }
        }
        else{
            document.getElementById('who_win').innerHTML = `Draw, no one won!`;
        }
        document.getElementById('current_player').style.display = 'none';
        winnerElement.style.display = 'flex';
    }

    this.disabled = true;
    current_player = (current_player==1)?(2):(1);
    document.getElementById('current_player_display').innerHTML = `Player${current_player}`;
}

function start_btn(){
    p1_sign = document.getElementById('p1_sign').value;
    p1_sign = p1_sign.toUpperCase();
    p2_sign = (p1_sign=='O')?('X'):('O');
    document.getElementById('p1_sign_display').innerHTML = p1_sign;
    document.getElementById('p2_sign_display').innerHTML = p2_sign;
    document.getElementById('current_player_display').innerHTML = `Player${current_player}`;

    document.getElementById('init-game').style.display = 'none';
    document.getElementById('container').style.display = 'grid';
    document.getElementById('game-status').style.display = 'block';
}