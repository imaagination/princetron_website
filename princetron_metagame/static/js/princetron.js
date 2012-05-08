// Websocket connection
var socket = new WebSocket('ws://ec2-107-22-122-48.compute-1.amazonaws.com:8080');

socket.onmessage = function(m) {
    console.log("Message Recieved");
    var message = JSON.parse(m.data);
    if ("lobby" in message) {
	console.log("Lobby Message");
	showElement($("#lobby"));
	var users = message.lobby.users;
	
	
	for (var i = 0; i < users.length; i++) {
	    if (users[i] == $('#username_input').val())
		$("#lobby_menu").append("<div class=\"lobby_item\" id=\"me\">" + users[i] + "</div>");
	    else
		$("#lobby_menu").append("<div class=\"lobby_item\">" + users[i] + "</div>");
	}
    }
    
    if ("invitation" in message) {
	if (confirm("Would you like to play with " + message.invitation.user)) {
	    socket.send(JSON.stringify({"acceptInvitation" : true}));
	}
    }
    if ("enterArena" in message) {
	console.log("Entering Arena");
	var player_specs = message.enterArena.players;
	players = new Array(player_specs.length);
	player_turns = new Array(player_specs.length);
	for (var i = 0; i < player_specs.length; i++) {
	    players[i] = { x : player_specs[i].xStart, 
			   y : player_specs[i].yStart,
			   dir : player_specs[i].dirStart,
			   active : true };
	    player_turns[i] = new Array();
	}
	my_id = message.enterArena.playerId;
	$("#me").css("color", COLORS[my_id]);
	/*$("#lobby_menu > option").each(function() {
	  $(this).css("color", COLORS[my_id]);
	  });	*/				
	
	
    }
    if ("startGame" in message) {
	showElement($("#game"));
	game_state = "playing";
	$('#billboard').html("");;
	timestep = 0;
	initBoard();
	drawBoard();
	
	var TIMING_INTERVAL = 100;
	var REFRESH_INTERVAL = 10;
	
	goal_time = new Date().getTime() + TIMING_INTERVAL; 
	game_timer = window.setInterval(function(i) {
		
		//console.log("Hello");
		
		current_time_millis = new Date().getTime();
		var difference = current_time_millis - goal_time;
		
		while(difference >= 0) {
		    advance();
		    goal_time += TIMING_INTERVAL;
		    difference -= TIMING_INTERVAL;
		}
	    }, REFRESH_INTERVAL);
    }
    if ("opponentTurn" in message) {
	currentTime = timestep;
	console.log("Received Turn: My time = " + timestep + "Their Time= " + message.opponentTurn.timestamp);
	
	for (var i = 0; i < currentTime + 1 - message.opponentTurn.timestamp; i++) {
	    stepBack(currentTime - i);
	}
	
	player_turns[message.opponentTurn.playerId][message.opponentTurn.timestamp] = message.opponentTurn.isLeft;
	
	
	for (var i = 0; i < currentTime + 1 - message.opponentTurn.timestamp; i++) {
	    stepForward(message.opponentTurn.timestamp + i);
	}
	
	drawBoard();
    }
    if ("gameResult" in message) {
	if (message.gameResult.result == "loss") {
	    $('#billboard').append("<p>Player " + 
				   message.gameResult.playerId + " loses</p>");
	    players[message.gameResult.playerId].active = false;	
	}
	if (message.gameResult.result == "win") {
	    $('#billboard').append("<p>Player " + 
				   message.gameResult.playerId + " wins</p>");
	}
    }
    if ("endGame" in message) {
	showElement($("#leaderboard"));
	$("#me").css("color", "#FF00FF");
	window.clearInterval(game_timer);
    }
};

// UI handlers
$("#login_button").click(function() {
	console.log("LOGIN PRESSED");
	var msg = { "logIn" : { "user" : $('#username_input').val() }};
	socket.send(JSON.stringify(msg));
    });


$("#invite_button").click(function() {
	var msg = { "readyToPlay" : { "invitations" : []}};
	$("div.lobby_item.selected").each(function(i, e) { 
		msg.readyToPlay.invitations.push($(e).text());
	    });
	socket.send(JSON.stringify(msg));
	
	showElement($("#wait"));
	
	/*console.log("Toggling Arena");
	  $("#lobby").toggle();
	  $("#wait").toggle();*/
	
    });

$("div.lobby_item").live("click", function() {
	if($(this).hasClass("selected"))
	    $(this).removeClass("selected");
	else
	    $(this).addClass("selected");			
    });

$(document).keydown(function(e) {
	if (game_state == "playing") {
	    var direction;

	    var current_dir = players[my_id].dir;
	    /*Determine Direction of turn*/
	    switch(e.which) {
	    case KEY_J: direction = true; break;
	    case KEY_K: direction = false; break;
	    case KEY_LEFT:
		if(current_dir == "north") direction = true;
		else if (current_dir == "south") direction = false;
		else return;
		break;
	    case KEY_RIGHT: 
		if(current_dir == "north") direction = false;
                else if (current_dir == "south") direction = true;
                else return;
                break;
	    case KEY_UP:
		if(current_dir == "east") direction = true;
                else if (current_dir == "west") direction = false;
                else return;
                break;
	    case KEY_DOWN:
		if(current_dir == "east") direction = false;
                else if (current_dir == "west") direction = true;
                else return;
                break;
	    default: return;
	    }
	    
	    var turn_time = timestep;
	    
	    
	    while (turn_time in player_turns[my_id])
		{
		    console.log("Triple Equals!");
		    turn_time++;
		}
	    
	    console.log("My turn timestep: " + timestep + " Turn Time: " + turn_time);
	    
	    if (turn_time == timestep)
		turnPlayer(players[my_id], direction);
	    
	    player_turns[my_id][turn_time] = direction;
	    
	    socket.send(JSON.stringify({ "turn" : {
			    "timestamp" : turn_time,
				"isLeft" : direction } }));
	}
	
	
    });

function showElement(element) {
    $("#login").hide();
    $("#lobby").hide();
    $("#wait").hide();
    $("#game").hide();
    $("#leaderboard").hide();
    
    element.show();
}

// Game logic
var game_board;
var board_underneath;
var players;
var game_state = "new";
var my_id;
var timestep;
var game_timer;
var MAX_PLAYERS = 4;
var BOARD_SIZE = 100;
var BOARD_DISPLAY_SIZE = 400;
var CELL_SIZE = BOARD_DISPLAY_SIZE / BOARD_SIZE;
var COLORS = [ "#F00", "#0F0", "#00F", "#FF0" ];
var player_turns;
var goal_time;
var ctx = $("#arena").get(0).getContext("2d");
var KEY_J = 74;
var KEY_K = 75;
var KEY_LEFT = 37;
var KEY_UP = 38;
var KEY_RIGHT = 39;
var KEY_DOWN = 40;

function turnPlayer(player, isLeft) {
    if (isLeft) {
	switch (player.dir) {
	case "north" : 
	    player.dir = "west"; break;
	case "south" : 
	    player.dir = "east"; break;
	case "east" : 
	    player.dir = "north"; break;
	case "west" : 
	    player.dir = "south"; break;
	}
    }
    else {
	switch (player.dir) {
	case "north" : 
	    player.dir = "east"; break;
	case "south" : 
	    player.dir = "west"; break;
	case "east" : 
	    player.dir = "south"; break;
	case "west" : 
	    player.dir = "north"; break;
	}
    }
}

function unturnPlayer(player, isLeft) {
    if (isLeft) {
	switch (player.dir) {
	case "north" :
	    player.dir = "east"; break;
	case "south" :
	    player.dir = "west"; break;
	case "east" :
	    player.dir = "south"; break;
	case "west" :
	    player.dir = "north"; break;
	}
    }
    else {
	switch (player.dir) {
	case "north" :
	    player.dir = "west"; break;
	case "south" :
	    player.dir = "east"; break;
	case "east" :
	    player.dir = "north"; break;
	case "west" :
	    player.dir = "south"; break;
	}
    }
    
}

function initBoard() {
    game_board = new Array(BOARD_SIZE);
    board_underneath = new Array(BOARD_SIZE);
    for (var i = 0; i < BOARD_SIZE; i++) {
	game_board[i] = new Array(BOARD_SIZE);
	board_underneath[i] = new Array(BOARD_SIZE);
    }
    for (var i = 0; i < BOARD_SIZE; i++) {
	for (var j = 0; j < BOARD_SIZE; j++) {
	    game_board[i][j] = -1;
	    board_underneath[i][j] = -1;
	}
    }
}

function sendCollision() {
    console.log("Sending Collision Message");
    socket.send(JSON.stringify({collision : { timestamp : timestep}}));
}

function advance() {
    timestep++;
    stepForward(timestep);
}


function stepForward(time) {
    //Step snake forward
    for (var i = 0; i < players.length; i++) {
	if (players[i].active) {
	    switch (players[i].dir) {
	    case "north" : players[i].y++; break;
	    case "south" : players[i].y--; break;
	    case "east" : players[i].x++; break;
	    case "west" : players[i].x--; break;
	    }
	}
	
	if (players[i].active) {
	    if (time in player_turns[i]) {
		turnPlayer(players[i], player_turns[i][time]);
	    }
	}
	
	// Check for collisions     
	if (players[my_id].active && i == my_id) {
	    if (players[my_id].x < 0 || 
		players[my_id].x >= BOARD_SIZE ||
		players[my_id].y < 0 || 
		players[my_id].y >= BOARD_SIZE ||
		game_board[players[my_id].x][players[my_id].y] != -1) {
					players[my_id].active = false;
					sendCollision();
	    }
	}
	
	//Update Board
	if (players[i].x >= 0 && players[i].y >= 0 && players[i].x < BOARD_SIZE && players[i].y < BOARD_SIZE) {
	    //If we're clobbering another snake, leave the underneath board intact
	    if (board_underneath[players[i].x][players[i].y] == -1) {
		board_underneath[players[i].x][players[i].y] = i;
	    }
	    game_board[players[i].x][players[i].y] = i;
	    drawSquare(players[i].x, players[i].y, COLORS[i]);
	}
    }
}

function stepBack(time) {
    // Move everyone back one step
    for (var i = 0; i < players.length; i++) {
	if (players[i].active) {
	    if (time in player_turns[i]) {
		unturnPlayer(players[i], player_turns[i][time]);
	    }
	}
	
	var x_val = players[i].x;
	var y_val = players[i].y;
	
	//clear game board, resetting if it was clobbered
	if (x_val >= 0 && y_val >= 0 && x_val < BOARD_SIZE && y_val < BOARD_SIZE) {          
	    if (board_underneath[x_val][y_val] == i)
		game_board[x_val][y_val] = -1;
	    else
		game_board[x_val][y_val] = board_underneath[x_val][y_val];
	}
	
	switch (players[i].dir) {
	case "north" : players[i].y--; break;
	case "south" : players[i].y++; break;
	case "east" : players[i].x--; break;
	case "west" : players[i].x++; break;
	}
    }
    console.log("Stepped Back");
}

function drawSquare(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x*CELL_SIZE, (BOARD_SIZE-y-1)*CELL_SIZE, CELL_SIZE, CELL_SIZE);
    
}


function drawBoard() {
    for (var i = 0; i < BOARD_SIZE; i++) {
	for (var j = 0; j < BOARD_SIZE; j++) {
	    if (game_board[i][j] == -1) drawSquare(i, j, "#000");//ctx.fillStyle = "#000";
	    else drawSquare(i, j, COLORS[game_board[i][j]]);
	    //ctx.fillRect(i*CELL_SIZE, (BOARD_SIZE-j-1)*CELL_SIZE, CELL_SIZE, CELL_SIZE);
	}
    }
}


