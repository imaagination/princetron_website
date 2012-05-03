var LinkedList = function() {

	var that = {}, first, last;

	that.add = function(direction, time) {
		var node = new Node(direction, time);
		if (first == null) {
			first = node;
			last = node;
		}
		else {
			node.next = first;
			first = node;
		}
	};

	that.first = function() {
		return first;
	};

	that.get = function(time) {

		var current = first;
		while (current != null) {
			console.log("Looking for time: " + time + " " + current.time);
			if (current.time == time) {
				return current;
			}
			current = current.next;
		}
		return null;
	};

	that.clear = function() {
		first = null;
		last = null;
	};

	var Node = function(direction, time) {
		this.direction = direction;
		this.time = time;
		var next = {};
	};


	return that;
};

// Websocket connection
var socket = new WebSocket('ws://ec2-107-22-122-48.compute-1.amazonaws.com:8080');

socket.onmessage = function(m) {
	var message = JSON.parse(m.data);
	if ("lobby" in message) {
		var users = message.lobby.users
			$("#lobby").html("<h4>Lobby</h4>");
		$("#invitations").html("<h4>Invitations</h4>");
		document.getElementById('invite_button').style.visibility='visible';
		document.getElementById('username_input').style.display='none';
		document.getElementById('login_button').style.display='none';
		for (var i = 0; i < users.length; i++) {
			if (users[i] == $('#username_input').val())
				$("#lobby").append("<p id =\"me\">" + users[i] + "</p>");
			else
				$("#lobby").append("<p>" + users[i] + "</p>");
		}
	}
	if ("invitation" in message) {
		if (confirm("Would you like to play with " + message.invitation.user)) {
			socket.send(JSON.stringify({"acceptInvitation" : true}));
		}
	}
	if ("enterArena" in message) {
		var player_specs = message.enterArena.players;
		players = new Array(player_specs.length);
		for (var i = 0; i < player_specs.length; i++) {
			players[i] = { x : player_specs[i].xStart, 
				y : player_specs[i].yStart,
				dir : player_specs[i].dirStart,
				active : true };
		}
		my_id = message.enterArena.playerId;
	}
	if ("startGame" in message) {
		game_state = "playing";
		$('#billboard').html("");
		turn_list.clear();
		timestep = 0;
		initBoard();
		drawBoard();
		game_timer = window.setInterval(function(i) {
				advance();
				drawBoard();
				}, 100);
	}
	if ("opponentTurn" in message) {
		currentTime = timestep;
		console.log("Me:" + timestep);
		console.log("Opponent:" + message.opponentTurn.timestamp);
		for (var i = 0; i < currentTime - message.opponentTurn.timestamp; i++) {
			stepBack(currentTime - i);
		}

		turnPlayer(players[message.opponentTurn.playerId], message.opponentTurn.isLeft);	

		for (var i = 0; i < currentTime - message.opponentTurn.timestamp; i++) {
			stepForward(message.opponentTurn.timestamp + i);
		}

	}
	if ("gameResult" in message) {
		if (message.gameResult.result == "loss") {
			$('#billboard').html("<p>Player " + 
					message.gameResult.playerId + " loses</p>");
			players[message.gameResult.playerId].active = false;	
		}
		if (message.gameResult.result == "win") {
			$('#billboard').html("<p>Player " + 
					message.gameResult.playerId + " wins</p>");
		}
	}
	if ("endGame" in message) {
		window.clearInterval(game_timer);
		$('#billboard').html("<p>Game over!</p>");
	}
};

// UI handlers
$("#login_button").click(function() {
		var msg = { "logIn" : { "user" : $('#username_input').val() }};
		socket.send(JSON.stringify(msg));
		});

$("#lobby").on("click", "#lobby p", function() {
		$("#invitations").append("<p>" + $(this).html() + "</p>");
		});

$("#invite_button").click(function() {
		var msg = { "readyToPlay" : { "invitations" : []}};
		$("#invitations p").each(function(i, e) { 
			msg.readyToPlay.invitations.push($(e).text());
			});
		socket.send(JSON.stringify(msg));
		});
$(document).keypress(function(e) {
		if (game_state == "playing") {
		// Left
		if (e.which == 106) {
		turnPlayer(players[my_id], true);
		turn_list.add(true, timestep);
		socket.send(JSON.stringify({ "turn" : {
				"timestamp" : timestep,
				"isLeft" : true } }));
		}
		// Right
		else if (e.which == 107) {
		turnPlayer(players[my_id], false);
		turn_list.add(false, timestep);
		socket.send(JSON.stringify({ "turn" : {
				"timestamp" : timestep,
				"isLeft" : false } }));
		}					
		}
		});

// Game logic
var game_board;
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
var turn_list = new LinkedList();

function turnPlayer(player, isLeft) {
	console.log("Turning");
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

function initBoard() {
	game_board = new Array(BOARD_SIZE);
	for (var i = 0; i < BOARD_SIZE; i++) {
		game_board[i] = new Array(BOARD_SIZE);
	}
	for (var i = 0; i < BOARD_SIZE; i++) {
		for (var j = 0; j < BOARD_SIZE; j++) {
			game_board[i][j] = -1;
		}
	}
}

function sendCollision() {
	console.log("Sending Collision Message");
	socket.send(JSON.stringify({collision : { timestamp : timestep}}));
}

function advance() {
	timestep++;

	// Update position and collision check
	stepForward();

	// Update board
	for (var i = 0; i < players.length; i++) {
		if (players[i].x >= 0 && players[i].x < BOARD_SIZE &&
				players[i].y >= 0 && players[i].y < BOARD_SIZE &&
				players[i].active) {
			game_board[players[i].x][players[i].y] = i;	
		}
	}
}


function stepForward(time) {
	//Step snake forward
	for (var i = 0; i < players.length; i++) {
		//mark game board                                                                                                                            
		if (players[my_id].x >= 0 && players[my_id].y >= 0 && players[my_id].x <= BOARD_SIZE && players[my_id].y <= BOARD_SIZE) {           
			game_board[players[i].x][players[i].y] = i;
		} 

		if (i == my_id) {
			var node = turn_list.get(time);

			if (node != null) {
				console.log("Not Null, Stepping Forward");
				if (node.isLeft) {
					switch (players[i].dir) {
						case "north" :
							players[i].dir = "west"; break;
						case "south" :
							players[i].dir = "east"; break;
						case "east" :
							players[i].dir = "north"; break;
						case "west" :
							players[i].dir = "south"; break;
					}
				}
				else {
					switch (players[i].dir) {
						case "north" :
							players[i].dir = "east"; break;
						case "south" :
							players[i].dir = "west"; break;
						case "east" :
							players[i].dir = "south"; break;
						case "west" :
							players[i].dir = "north"; break;
					}
				}
			}
		}


		if (players[i].active) {
			switch (players[i].dir) {
				case "north" : players[i].y++; break;
				case "south" : players[i].y--; break;
				case "east" : players[i].x++; break;
				case "west" : players[i].x--; break;
			}
		}
	}


	// Check for collisions     
	if (players[my_id].active) {
		if (players[my_id].x < 0 || 
				players[my_id].x >= BOARD_SIZE ||
				players[my_id].y < 0 || 
				players[my_id].y >= BOARD_SIZE ||
				game_board[players[my_id].x][players[my_id].y] != -1) {
			players[my_id].active = false;

			console.log("X: " + players[my_id].x)
				console.log("Y: " + players[my_id].y)
				sendCollision();
		}
	}

}

function stepBack(time) {
	// Move everyone back one step
	for (var i = 0; i < players.length; i++) {
		if (players[i].active) {

			if (i == my_id) {
				var node = turn_list.get(time);

				if (node != null) {
					console.log("Not Null, Stepping Backward");
					if (node.isLeft) {
						switch (players[i].dir) {
							case "north" : 
								players[i].dir = "east"; break;
							case "south" : 
								players[i].dir = "west"; break;
							case "east" : 
								players[i].dir = "south"; break;
							case "west" : 
								players[i].dir = "north"; break;
						}
					}
					else {
						switch (players[i].dir) {
							case "north" : 
								players[i].dir = "west"; break;
							case "south" : 
								players[i].dir = "east"; break;
							case "east" : 
								players[i].dir = "north"; break;
							case "west" : 
								players[i].dir = "south"; break;
						}
					}
				}
			}

			//clear game board
			game_board[players[i].x][players[i].y] = -1;

			switch (players[i].dir) {
				case "north" : players[i].y--; break;
				case "south" : players[i].y++; break;
				case "east" : players[i].x--; break;
				case "west" : players[i].x++; break;
			}
		}
	}
	console.log("Stepped Back");
}


function drawBoard() {
	var ctx = $("#arena").get(0).getContext("2d");
	for (var i = 0; i < BOARD_SIZE; i++) {
		for (var j = 0; j < BOARD_SIZE; j++) {
			if (game_board[i][j] == -1) ctx.fillStyle = "#000";
			else ctx.fillStyle = COLORS[game_board[i][j]];
			ctx.fillRect(i*CELL_SIZE, (BOARD_SIZE-j-1)*CELL_SIZE, CELL_SIZE, CELL_SIZE);
		}
	}
}


