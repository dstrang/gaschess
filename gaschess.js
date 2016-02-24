var rows = [1, 2, 3, 4, 5, 6, 7];
var columns = ["A", "B", "C", "D", "E", "F", "G", "H"];
var knightMovements = [[2,1], [1,2], [-1,2], [-2,1], [-2,-1], [-1,-2], [1,-2], [2,-1]];
var kingMovements = [[1,0], [1,1], [0,1], [-1,1], [-1,0], [-1,-1], [0,-1], [1,-1]];
var bishopMovements = [[1,1], [-1,1], [-1,-1], [1,-1]];
var columnMap = {"A": 1, "B": 2, "C": 3, "D": 4, "E": 5, "F": 6, "G": 7, "H": 8};
var moveHistory = [];
var boardLocations = [];
var board = {};
var locationTranslation = {};
var gamePieces = {};
var gamePiecesIdMap = {};
var humanTurn = null;
var elapsedTime = null;
var maxDepth = 6;

function gamePiece(id, player, type, gas, location, label){
	this.ID = id;
	this.Player = player;
	this.Type = type;
	this.Gas = gas;
	this.Location = location;
	this.Label = label;
	this.hasGas = function(){
		return this.Gas !== 0;
	};
	this.getLabel = function(){
		return label + this.Gas;
	};
	this.move = function(newPos){
		var history = { Move: null, Gas: null, Captured: null };
		var curPos = this.Location;
		var location = board[newPos];
		history.Move = curPos + newPos;
		history.Gas = this.Gas;
		if(typeof location === "object"){
			var pieces = gamePieces[location.Player];
			var idx = pieces.indexOf(location);
			var captured = pieces.splice(idx, 1)[0];
			captured.CapturedBy = this.Player;
			gamePieces.Captured[location.Player].push(captured);
			history.Captured = captured;
			gamePiecesIdMap[captured.ID] = null;
			this.Gas = 3;
		}else{
			this.Gas = (this.Gas > 0) ? this.Gas - 1 : 0;			
		}
		board[curPos] = "--";
		board[newPos] = this;
		this.Location = newPos;
		moveHistory.push(history);
	};
	this.undoMove = function(){
		var history = moveHistory.pop();
		if(!history) return;
		var captured = history.Captured;
		var newPos = history.Move.substr(0, 2);
		var curPos = history.Move.substr(2, 2);
		this.Location = newPos;
		this.Gas = history.Gas;
		board[newPos] = this;
		if(captured){
			var idx = gamePieces.Captured[captured.Player].indexOf(captured);
			gamePieces.Captured[captured.Player].splice(idx, 1);
			gamePieces[captured.Player].push(captured);
			board[curPos] = captured;
			gamePiecesIdMap[captured.ID] = captured;
			captured.CapturedBy = null;
		}else{
			board[curPos] = "--";
		}
	};
}


function initBoard(){
	var translations = [];
	var reversedRows = rows.slice().reverse();

	for(var row = 0; row < rows.length; row++){
		for(var column = 0; column < columns.length; column++){
			boardLocations.push(columns[column]+rows[row]);
		}
	}

	for(var row = 0; row < reversedRows.length; row++){
		for(var column = 0; column < columns.length; column++){
			translations.push(columns[column]+reversedRows[row]);
		}
	}

	for(var i = 0; i < boardLocations.length; i++){
		locationTranslation[boardLocations[i]] = translations[i];
	}
}

function initPieces(){

	var computerPieces = [];
	var humanPieces = [];

	// computer pieces
	computerPieces.push(new gamePiece(1, "Computer", "King", 3, "E7", "K"));
	computerPieces.push(new gamePiece(2, "Computer", "Queen", 3, "D7", "Q"));
	computerPieces.push(new gamePiece(3, "Computer", "Bishop", 3, "C7", "B"));
	computerPieces.push(new gamePiece(4, "Computer", "Bishop", 3, "F7", "B"));
	computerPieces.push(new gamePiece(5, "Computer", "Knight", 3, "F6", "N"));
	computerPieces.push(new gamePiece(6, "Computer", "Knight", 3, "D6", "N"));

	// human pieces
	humanPieces.push(new gamePiece(7, "Human", "King", 3, "E1", "k"));
	humanPieces.push(new gamePiece(8, "Human", "Queen", 3, "D1", "q"));
	humanPieces.push(new gamePiece(9, "Human", "Bishop", 3, "C1", "b"));
	humanPieces.push(new gamePiece(10, "Human", "Bishop", 3, "F1", "b"));
	humanPieces.push(new gamePiece(11, "Human", "Knight", 3, "F2", "n"));
	humanPieces.push(new gamePiece(12, "Human", "Knight", 3, "D2", "n"));

	gamePieces.Computer = computerPieces;
	gamePieces.Human = humanPieces;
	gamePieces.Captured = {"Computer": [], "Human": []};

	for(var i = 0; i < gamePieces.Computer.length; i++){
		var computerPiece = gamePieces.Computer[i];
		gamePiecesIdMap[computerPiece.ID] = computerPiece;
	}

	for(var j = 0; j < gamePieces.Human.length; j++){
		var humanPiece = gamePieces.Human[j];
		gamePiecesIdMap[humanPiece.ID] = humanPiece;
	}

}

function generateMoves(piece){
	var moves = [];
	if(piece.Gas === 0) return moves;
	var king = (piece.Player === "Human") ? "k" : "K";
	var curPosX = columnMap[piece.Location.substr(0,1)];
	var curPosY = parseInt(piece.Location.substr(1,1));
	switch(piece.Type){
		case "King":
			moves = generateKingMoves(curPosX, curPosY);
			break;
		case "Queen":
			moves = generateBishopMoves(curPosX, curPosY, king);
			moves = moves.concat(generateKnightMoves(curPosX, curPosY, king));
			break;
		case "Bishop":
			moves = generateBishopMoves(curPosX, curPosY, king);
			break;
		case "Knight":
			moves = generateKnightMoves(curPosX, curPosY, king);
			break;
	}
	return moves;
}

function generateKnightMoves(curPosX, curPosY, king){
	var legal = [];
	for(var i = 0; i < knightMovements.length; i++){
		var newPosX, newPosY;
		newPosX = curPosX + knightMovements[i][0];
		newPosY = curPosY + knightMovements[i][1];
		if(newPosX >= 1 && newPosX <= 8 && newPosY >= 1 && newPosY <= 7){
			var key = columns[newPosX - 1] + newPosY;
			var location = board[key];
			if(typeof location === "object"){
				if(location.Label.indexOf(king) === -1){
					legal.push(location.Location);
				}
			}else{
				legal.push(key);
			}
		}
	}
	return legal;
}

function generateKingMoves(curPosX, curPosY){
	var legal = [];
	for(var i = 0; i < kingMovements.length; i++){
		var newPosX, newPosY;
		newPosX = curPosX + kingMovements[i][0];
		newPosY = curPosY + kingMovements[i][1];
		if(newPosX >= 1 && newPosX <= 8 && newPosY >= 1 && newPosY <= 7){
			var location = columns[newPosX - 1] + newPosY;
			legal.push(location);
		}
	}
	return legal;
}

function generateBishopMoves(curPosX, curPosY, king){
	var legal = [];
	for(var i = 0; i < bishopMovements.length; i++){
		var newPosX, newPosY;
		newPosX = curPosX + bishopMovements[i][0];
		newPosY = curPosY + bishopMovements[i][1];
		while(newPosX >= 1 && newPosX <= 8 && newPosY >= 1 && newPosY <= 7){
			var key = columns[newPosX - 1] + newPosY;
			var location = board[key];
			if(typeof location === "object"){
				if(location.Label.indexOf(king) === -1){
					legal.push(location.Location);
				}
				break;
			}else{
				legal.push(key);
			}
			newPosX += bishopMovements[i][0];
			newPosY += bishopMovements[i][1];
		}
		newPosX = curPosX;
		newPosY = curPosY;
	}
	return legal;
}

function movePiece(move){
	var regex = /^[A-H][1-7][A-H][1-7]$/;
	var curPos;
	var newPos;
	var piece;
	var error = null;

	move = move.toUpperCase();
	curPos = move.substr(0, 2);
	newPos = move.substr(2, 2);
	piece = board[curPos];

	if(humanTurn){
		if(!regex.test(move)){
			error = "Invalid move";
		}else if(typeof piece === "object"){
			if(piece.Player === "Computer"){
				error = "Not your piece";
			}else if(curPos === newPos){
				error = "Cannot move to current location";
			}else if(!piece.hasGas()){
				error = "Out of gas";
			}else{
				if(generateMoves(piece).indexOf(newPos) === -1){
					error = "Invalid Move";
				}
			}
		}else{
			error = "No piece at that location";
		}
	}

	if(!error){
		piece.move(newPos);
		updateBoard();
		updateStats(piece, move);
		humanTurn = !humanTurn;
		togglePlayerTurn();
		gameOver();
	}else{
		showError(error);
	}
	while(moveHistory.length) moveHistory.pop();
}



function updateBoard(){
	for(var i = 0; i < boardLocations.length; i++){
		board[boardLocations[i]] = "--";
	}
	for(var player in gamePieces){
		var pieces = gamePieces[player];
		for(var j = 0; j < pieces.length; j++){
			var piece = pieces[j];
			board[piece.Location] = piece;
		}
	}
	drawBoard();
}

function updateStats(gamePiece, move){
	var computerPanel = $('#computer ul');
	var humanPanel = $('#human ul');
	var computerCaptures = [];
	var humanCaptures = [];
	var player = gamePiece.Player.toLowerCase();
	var played = (player === "human") ? move : (move + " => " + translateMove(move) + " (" + elapsedTime + ")");

	for(var key in gamePieces.Captured){
		var pieces = gamePieces.Captured[key];
		for(var i = 0; i < pieces.length; i++){
			var piece = pieces[i];
			if(piece.CapturedBy === "Human"){
				humanCaptures.push('<li class="' + piece.Player.toLowerCase() + '">' + piece.getLabel() + '</li>');
			}else{
				computerCaptures.push('<li class="' + piece.Player.toLowerCase() + '">' + piece.getLabel() + '</li>');
			}
		}
	}

	computerPanel.children().remove();
	computerPanel.append(computerCaptures.join(""));
	humanPanel.children().remove();
	humanPanel.append(humanCaptures.join(""));
	$('#history ul').prepend('<li class="' + player + '">' + played + '</li>');
	$('#human-input').val("");
}

function translateMove(move){
	var curPos = move.substr(0, 2);
	var newPos = move.substr(2, 2);
	return locationTranslation[curPos] + locationTranslation[newPos];
}

function drawBoard(possibleMoves){
	var gameBoard = $('#gameBoard');
	var boardRows = [];
	var row = [];
	var idx = 0;
	for(var i = 1; i <= boardLocations.length; i++){
		var location = board[boardLocations[i - 1]];
		if(possibleMoves){
			if(possibleMoves.indexOf(boardLocations[i - 1]) > -1){
				var obj = (typeof location === "object") ? location.getLabel() : location;
				row.push(colorize("possible", obj));
			}else{
				row.push(typeof location === "object" ? colorize(location.Player.toLowerCase(), location.getLabel()) : location);
			}
		}else{
			row.push(typeof location === "object" ? colorize(location.Player.toLowerCase(), location.getLabel()) : location);
		}
		if(i % 8 === 0){
			boardRows.push(rows[idx++] + "  " + row.join(" "));
			row = [];
		}
	}
	boardRows = boardRows.reverse();
	boardRows.push("   -----------------------");
	boardRows.push("   " + columns.join("  "));
	gameBoard.html(boardRows.join("\n"));
}

function kingIsCaptured(){
	return !gamePiecesIdMap["1"] || !gamePiecesIdMap["7"];
}

function checkForWinner(){
	var computerKing = false;
	var humanKing = false;
	var computerLegalMoves = 0;
	var humanLegalMoves = 0;
	for(var i = 0; i < gamePieces.Computer.length; i++){
		var computerPiece = gamePieces.Computer[i];
		computerLegalMoves += generateMoves(computerPiece).length;
		if(computerPiece.Label === "K"){
			computerKing = true;
		}
	}
	for(var j = 0; j < gamePieces.Human.length; j++){
		var humanPiece = gamePieces.Human[j];
		humanLegalMoves += generateMoves(humanPiece).length;
		if(humanPiece.Label === "k"){
			humanKing = true;
		}
	}

	if(!computerKing || computerLegalMoves === 0){
		return -5000;
	}else if(!humanKing || humanLegalMoves === 0){
		return 5000;
	}else{
		return 0;
	}
}

function gameOver(){
	if(checkForWinner() === -5000){
		$('#computerInput, #humanInput').hide();
		$('#gameOver h3').text("Human Wins!");
		$('#gameOver, .overlay, .modal-container').show();
	}
	if(checkForWinner() === 5000){
		$('#computerInput, #humanInput').hide();
		$('#gameOver h3').text("Computer Wins!");
		$('#gameOver, .overlay, .modal-container').show();
	}
}

function canCaptureKing(){
	var kingPos = gamePiecesIdMap["7"].Location;
	for(var i = 0; i < gamePieces.Computer.length; i++){
		var piece = gamePieces.Computer[i];
		if(generateMoves(piece).indexOf(kingPos) > -1){
			return piece.Location + kingPos;
		}
	}
	return 0;
}

/***** MINIMAX *****/

var startTime;

function checkTimer(){
	var curTime = new Date().getTime();
	if(curTime - startTime > 4998){
		console.log("asdfd");
		return true;
	}
}

function computerMove(){

	var best = -50000;
	var depth = 1;
	var score;
	var finalMove;
	var bestMoves = [];

	startTime = new Date().getTime();

	if(canCaptureKing()){
		finalMove = canCaptureKing();
	}else{
		for(var i = 0; i < gamePieces.Computer.length; i++){
			var piece = gamePieces.Computer[i];
			var legalMoves = generateMoves(piece);
			for(var j = 0; j < legalMoves.length; j++){
				if(checkTimer()) break;
				piece.move(legalMoves[j]);
				score = min(depth + 1, best);
				piece.undoMove();
				console.log(piece.Type + ":" + score + " ," + piece.Location + legalMoves[j]);
				if(score == best) bestMoves.push(piece.Location + legalMoves[j]);
				if(score > best){
					bestMoves = [];
					bestMoves.push(piece.Location + legalMoves[j]);
					best = score;
				}
			}
		}
		finalMove = bestMoves[Math.floor(Math.random()*bestMoves.length)];
	}

	var endTime = new Date().getTime();
	elapsedTime = ((endTime - startTime) / 1000).toFixed(3);
	movePiece(finalMove);
}

function min(depth, maxBest){
	var best = 50000;
	var score;
	if(kingIsCaptured()){
		return checkForWinner();
	}
	if(depth === maxDepth){
		return evaluate();
	}else{
		for(var i = 0; i < gamePieces.Human.length; i++){
			var piece = gamePieces.Human[i];
			var legalMoves = generateMoves(piece);
			for(var j = 0; j < legalMoves.length; j++){
				if(checkTimer()) break;
				piece.move(legalMoves[j]);
				score = max(depth + 1, best);
				if(score < best) best = score;
				piece.undoMove();
				if(best <= maxBest) break;
			}
		}
		return best;
	}
}

function max(depth, minBest){
	var best = -50000;
	var score;
	if(kingIsCaptured()){
		return checkForWinner();
	}
	if(depth === maxDepth){
		return evaluate();
	}else{
		for(var i = 0; i < gamePieces.Computer.length; i++){
			var piece = gamePieces.Computer[i];
			var legalMoves = generateMoves(piece);
			for(var j = 0; j < legalMoves.length; j++){
				if(checkTimer()) break;
				piece.move(legalMoves[j]);
				score = min(depth + 1, best);
				if(score > best) best = score;
				piece.undoMove();
				if(best >= minBest) break;
			}
		}
		return best;
	}
}

function evaluate(){

	var computerGas = 0;
	var humanGas = 0;

	var K = gamePiecesIdMap["1"];
	var Q = gamePiecesIdMap["2"];
	var B1 = gamePiecesIdMap["3"];
	var B2 = gamePiecesIdMap["4"];
	var N1 = gamePiecesIdMap["5"];
	var N2 = gamePiecesIdMap["6"];
	var k = gamePiecesIdMap["7"];
	var q = gamePiecesIdMap["8"];
	var b1 = gamePiecesIdMap["9"];
	var b2 = gamePiecesIdMap["10"];
	var n1 = gamePiecesIdMap["11"];
	var n2 = gamePiecesIdMap["12"];

	var cKing, cQueen, cBishop1, cBishop2, cKnight1, cKnight2;
	var hKing, hQueen, hBishop1, hBishop2, hKnight1, hKnight2;
	if(K){
		computerGas += K.Gas;
		cKing = 1;
	}else{
		cKing = 0;
	}
	if(Q){
		computerGas += Q.Gas;
		cQueen = 1;
	}else{
		cQueen = 0;
	}
	if(B1){
		computerGas += B1.Gas;
		cBishop1 = 1;
	}else{
		cBishop1 = 0;
	}
	if(B2){
		computerGas += B2.Gas;
		cBishop2 = 1;
	}else{
		cBishop2 = 0;
	}
	if(N1){
		computerGas += N1.Gas;
		cKnight1 = 1;
	}else{
		cKnight1 = 0;
	}
	if(N2){
		computerGas += N2.Gas;
		cKnight2 = 1;
	}else{
		cKnight2 = 0;
	}

	if(k){
		humanGas += k.Gas;
		hKing = 1;
	}else{
		hKing = 0;
	}
	if(q){
		humanGas += q.Gas;
		hQueen = 1;
	}else{
		hQueen = 0;
	}
	if(b1){
		humanGas += b1.Gas;
		hBishop1 = 1;
	}else{
		hBishop1 = 0;
	}
	if(b2){
		humanGas += b2.Gas;
		hBishop2 = 1;
	}else{
		hBishop2 = 0;
	}
	if(n1){
		humanGas += n1.Gas;
		hKnight1 = 1;
	}else{
		hKnight1 = 0;
	}
	if(n2){
		humanGas += n2.Gas;
		hKnight2 = 1;
	}else{
		hKnight2 = 0;
	}

	var kingWeight = 200 * (cKing - hKing);
	var queenWeight = 9 * (cQueen - hQueen);
	var bishopWeight = 3 * ((cBishop1 + cBishop2) - (hBishop1 + hBishop2));
	var knightWeight = 3 * ((cKnight1 + cKnight2) - (hKnight1 + hKnight2));
	var gasWeight = 0.5 * (computerGas - humanGas);
	return kingWeight + queenWeight + bishopWeight + knightWeight + gasWeight;
}

/***** END MINIMAX *****/


/***** UI HELPERS *****/

$(function(){

	initBoard();
	initPieces();
	updateBoard();

	$('#human-input').keyup(function(e){
		var input = $(this);
		var val = input.val();

		switch(e.which){
			case 27:
				if(val !== ""){
					input.val("");
					$('.error').fadeOut(function(){$(this).text("");});
					drawBoard();
				}
				break;
			case 13:
				if(val !== "") movePiece(val);
				break;
			default:
				if(val.length === 2){
					var piece = board[val.toUpperCase()];
					if(typeof piece === "object"){
						if(piece.Player === "Human"){
							var legalMoves = generateMoves(piece);
							drawBoard(legalMoves);
						}
					}
				}
				if(val.length === 1){
					drawBoard();
				}
		}


	});

	$('#computer-btn').click(function(){
		computerMove();
	});

	$('.player-btn').click(function(){
		var button = $(this).text();
		humanTurn = button === "Human";
		$('.overlay, .modal-container, #gameStart').hide();
		togglePlayerTurn();
	});

	$('.gameover-btn').click(function(){
		var button = $(this).text();
		if(button === "Close"){
			$('.overlay, .modal-container, #gameOver').hide();
		}else{
			location.reload();
		}
	});
});

function toggleRandomButton(){
	$('#randomHumanMove').toggle();
}

function togglePlayerTurn(){
	$('.error').hide();
	if(humanTurn === null) return;
	$('#computerInput').toggle(!humanTurn);
	$('#humanInput').toggle(humanTurn);
	if(humanTurn) $('#human-input').focus();
}

function showError(error){
	var message = humanTurn ? $('#humanInput .error') : $('#computerInput .error');
	if(message.text() === error){

	}else{
		message.text(error).slideDown(100);
	}
}

function colorize(colorClass, text){
	return "<span class=" + colorClass + ">" + text + "</span>";
}

/***** END UI HELPERS *****/





function setDepth(depth){
	maxDepth = depth;
}


function randomHumanMove(){
	var pieces = gamePieces.Human;
	var piece = pieces[Math.floor(Math.random()*pieces.length)];
	if(piece.hasGas()){
		var moves = generateMoves(piece);
		var move = moves[Math.floor(Math.random()*moves.length)];
		if(move) movePiece(piece.Location + move);
	}
}

function printLegalMoves(){
	var arr = [];
	for(var i = 0; i < gamePieces.Computer.length; i++){
		var piece = gamePieces.Computer[i];
		var moves = generateMoves(piece);
		for(var j = 0; j < moves.length; j++){
			arr.push(piece.Location + moves[j]);
		}
	}

	console.log(arr);
}





