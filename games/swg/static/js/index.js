let rounds;
let usr = 0;
let cpu = 0;

//number of rounds input field max and min limit
function round()
{    
    rounds = document.getElementById("rounds").value;

    if(rounds>20)
    {
        document.getElementById("rounds").value = 20;
    }
    else if(rounds<1)
    {
        document.getElementById("rounds").value = " ";
    }
}

//cpu selection
function cpu_sel()
{
    const choices = ['s', 'w', 'g'];
    let random = Math.floor(Math.random() * 3);
    return choices[random];
}

//checking valid number of rounds and displaying the game
function next_page()
{
    let n = document.getElementById("rounds").value;
    if(isNaN(n) || n=="")
    {
        document.getElementById("round_err").innerHTML = "Please enter valid number of rounds";
    }
    else
    {
        document.getElementById("round_err").innerHTML = "";
        document.getElementById("game").style.display = "block";
        document.getElementById("intro").style.display = "none";
    }
}

function choice_name(n)
{
    const names = ["snake", "water", "gun"];
    for(i=0; i<3; i++)
    {
        if((names[i]).slice(0, 1)==n)
        {
            return names[i];
        }
    }
}

//snake water gun logic
let n = 1;
function the_game(usr_ch)
{
    let cpu_ch = cpu_sel();
    n++;

    if(usr_ch==cpu_ch)
    {
        document.getElementById("dis_sel").innerHTML = "No one get point";
    }

    else
    {
        document.getElementById("dis_sel").innerHTML = "";
        if(usr_ch=='s')
        {
            if(cpu_ch=='w')
            {
                usr += 1;
            }
            else if(cpu_ch=='g')
            {
                cpu += 1;
            }
        }
        else if(usr_ch=='w')
        {
            if(cpu_ch=='s')
            {
                cpu += 1;
            }
            else if(cpu_ch=='g')
            {
                usr += 1;
            }
        }
        else if(usr_ch=='g')
        {
            if(cpu_ch=='s')
            {
                usr += 1;
            }
            else if(cpu_ch=='w')
            {
                cpu += 1;
            }
        }
    }

    document.getElementById("selections").style.display = "block";
    document.getElementById("dis_usr_sel").innerHTML = choice_name(usr_ch);
    document.getElementById("dis_cpu_sel").innerHTML = choice_name(cpu_ch);
    document.getElementById("dis_usr").innerHTML = usr;
    document.getElementById("dis_cpu").innerHTML = cpu;
    
    if(n>rounds)
    {
        document.getElementById("result").style.display = "block";
        if(usr==cpu)
        {
            document.getElementById("result_line").innerHTML = "Draw";
        }
        else if(usr>cpu)
        {
            document.getElementById("result_line").innerHTML = "You win!";
        }
        else
        {
            document.getElementById("result_line").innerHTML = "You lose!";
        }
        document.getElementById("choices").style.display = "none";
        document.getElementById("play_again").style.display = "inline-block";
    }
    else
    {
        document.getElementById("round_num").innerHTML = n;
    }
}