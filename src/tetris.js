var canvas, ctx;
var width, height;

var NUM_X_BLOCKS = 10;
var NUM_Y_BLOCKS = 20;
var BLOCK_SIZE = 30;
var keys = [];
var tetrominoes = {
  i: { blocks: [0x0F00, 0x2222, 0x00F0, 0x4444], color: 'cyan'   },
  j: { blocks: [0x44C0, 0x8E00, 0x6440, 0x0E20], color: 'blue'   },
  l: { blocks: [0x4460, 0x0E80, 0xC440, 0x2E00], color: 'orange' },
  o: { blocks: [0xCC00, 0xCC00, 0xCC00, 0xCC00], color: 'yellow' },
  s: { blocks: [0x06C0, 0x8C40, 0x6C00, 0x4620], color: 'green'  },
  t: { blocks: [0x0E40, 0x4C40, 0x4E00, 0x4640], color: 'purple' },
  z: { blocks: [0x0C60, 0x4C80, 0xC600, 0x2640], color: 'red'    },
}

const KEYCODES = {
  DOWN: 40,
  UP: 38,
  LEFT: 37,
  RIGHT: 39,
  SPACE: 32,
  PAUSE: 80, // 80 is keyCode for 'p'
  NEWGAME: 78, // is the keyCode for 'n'
};

var currPiece, currRotation, currPieceX, currPieceY;
var movePieceDelay = 500; // ms to delay until moving the piece down
var datetimeLastMoveDown = new Date().valueOf();
var isPaused = false;
var isGameOver = false;
var board = [];

function makeBlockBitmap(block) {
  // Given a block (e.g. 0x06C0)
  // return a boolean array where true means a block exists
  /*
    Example: 0x06C0

      8 4 2 1
     .-----------
    8|0 0 0 0 = 0
    4|0 1 1 0 = 6
    2|1 1 0 0 = C
    1|0 0 0 0 = 0
  */
  // initialize the array to 4x4 of false
  var result = new Array(4);
  for (var x = 0; x < 4; x++) {
    result[x] = new Array(4);
    for (var y = 0; y < 4; y++)
      result[x][y] = false;
  }

  // (block & 0xF000) would get the first row
  for (var y = 0; y < 4; y++) {
    var row = (block & (0xF << (3 - y) * 4)) >> (3 - y) * 4;
    for (var x = 0; x < 4; x++) {
      var col = row & (1 << (3 - x));
      result[x][y] = (col > 0);
    }
  }

  return result;
}

function isPieceInBounds(blockX, blockY, rotation, tetrominoe) {
  var block = tetrominoe.blocks[rotation];
  var map = makeBlockBitmap(block);
  for (var y = 0; y < 4; y++) {
    for (var x = 0; x < 4; x++) {
      var boardX = blockX + x;
      var boardY = blockY + y;
      var isPositionOnBoard = (
        boardX >= 0 &&
        boardX < NUM_X_BLOCKS &&
        boardY >= 0 &&
        boardY < NUM_Y_BLOCKS
      );
      if (map[x][y] && !isPositionOnBoard)
        return false;
    }
  }
  return true;
}

function doesPieceOverlap(blockX, blockY, rotation, tetrominoe) {
  var block = tetrominoe.blocks[rotation];
  var map = makeBlockBitmap(block);
  for (var y = 0; y < 4; y++) {
    for (var x = 0; x < 4; x++) {
      if (map[x][y] && board[blockX + x][blockY +y] !== '')
        return true;
    }
  }
  return false;
}

function drawTetrominoe(blockX, blockY, rotation, tetrominoe) {
  var block = tetrominoe.blocks[rotation];
  var map = makeBlockBitmap(block);
  for (var y = 0; y < 4; y++) {
    for (var x = 0; x < 4; x++) {
      if (map[x][y]) {
        drawBlock(blockX + x, blockY + y, tetrominoe.color);
      }
    }
  }
}

function drawBlock(blockX, blockY, color) {
  var blockTop = BLOCK_SIZE * blockY;
  var blockLeft = BLOCK_SIZE * blockX;
  
  ctx.save();

  ctx.fillStyle = color;
  ctx.fillRect(blockLeft, blockTop, BLOCK_SIZE, BLOCK_SIZE);
  
  // white lines on left and top
  ctx.beginPath();
  ctx.moveTo(blockLeft, blockTop + BLOCK_SIZE - 1);
  ctx.lineTo(blockLeft, blockTop);
  ctx.lineTo(blockLeft + BLOCK_SIZE - 1, blockTop);
  ctx.strokeStyle = 'white';
  ctx.stroke();

  // dark grey lines on bottom and right
  ctx.beginPath();
  ctx.moveTo(blockLeft + 1, blockTop + BLOCK_SIZE - 1);
  ctx.lineTo(blockLeft + BLOCK_SIZE - 1, blockTop + BLOCK_SIZE - 1);
  ctx.lineTo(blockLeft + BLOCK_SIZE - 1, blockTop + 1);
  ctx.strokeStyle = 'darkgrey';
  ctx.stroke();

  ctx.restore();
}

function drawBoard() {
  for (var x = 0; x < NUM_X_BLOCKS; x++)
    for (var y = 0; y < NUM_Y_BLOCKS; y++)
      if (board[x][y] !== '')
        drawBlock(x, y, board[x][y]);
}

function drawCurrPiece() {
  drawTetrominoe(currPieceX, currPieceY, currRotation, tetrominoes[currPiece]); 
}

function draw() {
  // clear background
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  
  drawBoard();

  if (isGameOver || isPaused) {
    ctx.save();

    // blue background band
    ctx.fillStyle = 'rgba(0, 0, 200, 0.6)';
    ctx.fillRect(0, 80, width, 120);

    // large 'Paused' text
    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#bbeeff';
    ctx.textBaseline = 'bottom';
    ctx.fillText(isPaused ? 'Paused' : 'Game Over', width / 2, 150);

    // small instruction text
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#bbeeff';
    ctx.textBaseline = 'top';
    ctx.fillText((isPaused ? "press 'p' to play" : "press 'n' to start a new game"), width / 2, 160);

    ctx.restore();
  } else {
    drawCurrPiece();
  }
}

function checkBoard() {
  for (var y = NUM_Y_BLOCKS - 1; y >= 0; y--) {
    var hasFullRow = true;
    for (var x = 0; x < NUM_X_BLOCKS && hasFullRow; x++) {
      hasFullRow &= (board[x][y] !== '');
    }
    if (hasFullRow) {
      // shift all the rows above down one
      for (var i = y - 1; i >= 0; i--) {
        for (var x = 0; x < NUM_X_BLOCKS; x++) {
          board[x][i + 1] = (i == 0 ? '' : board[x][i]);
        }
      }
      // increment y to evaluate the new row shifted down
      y++;
    }
  }
}

function addPieceToBoard(blockX, blockY, rotation, tetrominoe) {
  var block = tetrominoe.blocks[rotation];
  var map = makeBlockBitmap(block);
  for (var y = 0; y < 4; y++) {
    for (var x = 0; x < 4; x++) {
      if (map[x][y]) {
        board[blockX + x][blockY + y] = tetrominoe.color;
      }
    }
  }
  checkBoard();
}

function resetPiece() {
  var pieces = Object.keys(tetrominoes);
  currPiece = pieces[~~(Math.random() * pieces.length)];
  currPieceX = (NUM_X_BLOCKS - 4) / 2; // 4 = size of a piece in width
  currPieceY = 0;
  currRotation = 0;
  datetimeLastMoveDown = new Date().valueOf();

  isGameOver = doesPieceOverlap(
    currPieceX,
    currPieceY,
    currRotation,
    tetrominoes[currPiece]
  );
}

function update() {
  // Check the end game state
  if (isGameOver && keys.includes(KEYCODES.NEWGAME)) {
    keys = keys.filter(key => key !== KEYCODES.NEWGAME);
    // toggle the paused state
    isGameOver = false;
    initBoard();
  }
  // Short-circuit the function if game is over
  if (isGameOver)
    return;

  // Check the paused state
  // to prevent the game updating while paused
  // but also must leave a way to unpause the game
  if (keys.includes(KEYCODES.PAUSE)) {
    keys = keys.filter(key => key !== KEYCODES.PAUSE);
    // toggle the paused state
    isPaused = !isPaused;
  }
  if (isPaused)
    return;

  // Check for keys that affect the game
  if (keys.includes(KEYCODES.UP)) {
    keys = keys.filter(key => key !== KEYCODES.UP);
    // rotate the piece, if permitted
    const nextRotation = (currRotation + 1) % 4;
    if (isPieceInBounds(currPieceX, currPieceY, nextRotation, tetrominoes[currPiece]) &&
        !doesPieceOverlap(currPieceX, currPieceY, nextRotation, tetrominoes[currPiece]))
      currRotation = nextRotation;
  }
  if (keys.includes(KEYCODES.DOWN)) {
    keys = keys.filter(key => key !== KEYCODES.DOWN);
    // move the piece down, if permitted
    if (isPieceInBounds(currPieceX, currPieceY + 1, currRotation, tetrominoes[currPiece]) &&
      !doesPieceOverlap(currPieceX, currPieceY + 1, currRotation, tetrominoes[currPiece]))
      currPieceY++;
  }
  if (keys.includes(KEYCODES.LEFT)) {
    keys = keys.filter(key => key !== KEYCODES.LEFT);
    // move the piece left, if permitted
    if (isPieceInBounds(currPieceX - 1, currPieceY, currRotation, tetrominoes[currPiece]) &&
      !doesPieceOverlap(currPieceX - 1, currPieceY, currRotation, tetrominoes[currPiece]))
      currPieceX--;
  }
  if (keys.includes(KEYCODES.RIGHT)) {
    keys = keys.filter(key => key !== KEYCODES.RIGHT);
    // move the piece right, if permitted
    if (isPieceInBounds(currPieceX + 1, currPieceY, currRotation, tetrominoes[currPiece]) &&
      !doesPieceOverlap(currPieceX + 1, currPieceY, currRotation, tetrominoes[currPiece]))
      currPieceX++;
  }
  if (keys.includes(KEYCODES.SPACE)) {
    keys = keys.filter(key => key !== KEYCODES.SPACE);
    // drop piece
    while (isPieceInBounds(currPieceX, currPieceY + 1, currRotation, tetrominoes[currPiece]) &&
      !doesPieceOverlap(currPieceX, currPieceY + 1, currRotation, tetrominoes[currPiece]))
        currPieceY++;
    addPieceToBoard(currPieceX, currPieceY, currRotation, tetrominoes[currPiece]);
    resetPiece();
  }

  // Move the piece down after delay has completed
  var now = new Date().valueOf();
  if (now - datetimeLastMoveDown > movePieceDelay) {
    // hit detection
    var canMovePiece = !doesPieceOverlap(
      currPieceX,
      currPieceY + 1,
      currRotation,
      tetrominoes[currPiece]
    ) && isPieceInBounds(
      currPieceX, 
      currPieceY + 1,
      currRotation,
      tetrominoes[currPiece]
    );
    if (canMovePiece) {
      currPieceY++;
    } else {
      // add piece to board
      addPieceToBoard(currPieceX, currPieceY, currRotation, tetrominoes[currPiece]);
      // reset current piece
      resetPiece();
    }
    // reset the delay
    datetimeLastMoveDown = now;
  }
}

function loop() {
  update();
  draw();
  window.requestAnimationFrame(loop);
}

function onKeydown(e) {
  keys = keys.concat(e.keyCode);
}

function initBoard() {
  // init the board
  board = new Array(NUM_X_BLOCKS);
  for (var x = 0; x < NUM_X_BLOCKS; x++) {
    board[x] = new Array(NUM_Y_BLOCKS);
    for (var y = 0; y < NUM_Y_BLOCKS; y++) {
      board[x][y] = ''; // holds color or empty
    }
  }
}

function startNewGame() {
  initBoard();
  resetPiece();
}

window.addEventListener('load', function() {
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;

  width = canvas.width = BLOCK_SIZE * NUM_X_BLOCKS;
  height = canvas.height = BLOCK_SIZE * NUM_Y_BLOCKS;
  
  document.addEventListener('keydown', onKeydown);

  startNewGame();

  loop();
});