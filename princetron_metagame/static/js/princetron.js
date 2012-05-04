			// Websocket connection
			var socket = new WebSocket('ws://ec2-107-22-122-48.compute-1.amazonaws.com:8080');

			socket.onmessage = function(m) {
				var message = JSON.parse(m.data);
				if ("lobby" in message) {
				    var users = message.lobby.users;
				    $("#lobby").html("<h4>Lobby</h4>");
				    $("#invitations").html("<h4>Invitations</h4>");
				    $("#invite_button").toggle();
				    $("#login_data").toggle();
				    $("#lobby_menu").toggle();
		 
				    for (var i = 0; i < users.length; i++) {
					if (users[i] == $('#username_input').val())
					    $("#lobby_menu").append("<option id=\"me\">" + users[i] + "</option>");
					else
					    $("#lobby_menu").append("<option>" + users[i] + "</option>");
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
					player_turns = new Array(player_specs.length);
					for (var i = 0; i < player_specs.length; i++) {
						players[i] = { x : player_specs[i].xStart, 
												 	 y : player_specs[i].yStart,
													 dir : player_specs[i].dirStart,
													 active : true };
						player_turns[i] = new Array();
					}
					my_id = message.enterArena.playerId;
				}
				if ("startGame" in message) {
					game_state = "playing";
					$('#billboard').html("");;
					timestep = 0;
					initBoard();
					drawBoard();

					var TIMING_INTERVAL = 100;

					goal_time = new Date().getTime() + TIMING_INTERVAL; 
					game_timer = window.setInterval(function(i) {
						
						console.log("Hello");
						
						current_time_millis = new Date().getTime();
						var difference = current_time_millis - goal_time;
						//console.log("Goal Time: " + goal_time + " Current Time: " + current_time_millis + " Difference: " + difference);
						
						while(difference >= 0) {
						    advance();
						    //drawBoard();
						    goal_time += TIMING_INTERVAL;
						    difference -= TIMING_INTERVAL;
						    }
					    }, 100);
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
				$("#lobby_menu :selected").each(function(i, e) { 
					msg.readyToPlay.invitations.push($(e).text());
				});
				socket.send(JSON.stringify(msg));
			});

			$(document).keypress(function(e) {
				if (game_state == "playing") {
				    var direction;
				    if (e.which == 106) 
					direction = true;
				    else if (e.which == 107)
					direction = false;
				    else return;
				    
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
                        var player_turns;
                        var goal_time;
                        var ctx = $("#arena").get(0).getContext("2d");

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
				stepForward(timestep);

				// Update board, to be deleted
				/*				for (var i = 0; i < players.length; i++) {
					if (players[i].x >= 0 && players[i].x < BOARD_SIZE &&
							players[i].y >= 0 && players[i].y < BOARD_SIZE &&
							players[i].active) {
						game_board[players[i].x][players[i].y] = i;	
						drawSquare(players[i].x, players[i].y, COLORS[i]);
					}
					}*/
			}
                     

                        function stepForward(time) {
			    //Step snake forward
			    for (var i = 0; i < players.length; i++) {
				//TO BE DELETED mark game board                                                                                                                            
				/*if (players[i].x >= 0 && players[i].y >= 0 && players[i].x < BOARD_SIZE && players[i].y < BOARD_SIZE) {          
				    game_board[players[i].x][players[i].y] = i;
				    drawSquare(players[i].x, players[i].y, COLORS[i]);
				    } */

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
				
				if (players[i].x >= 0 && players[i].y >= 0 && players[i].x < BOARD_SIZE && players[i].y < BOARD_SIZE) {
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
						
				    //clear game board
				if (players[i].x >= 0 && players[i].y >= 0 && players[i].x < BOARD_SIZE && players[i].y < BOARD_SIZE) {          
					game_board[players[i].x][players[i].y] = -1;
					drawSquare(players[i].x, players[i].y, "#000");
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


