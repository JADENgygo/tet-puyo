import {
  emptyPuyoBoard,
  isValidPuyo,
  lockPuyo,
  movePuyo,
  type PuyoBoard,
  type PuyoPair,
  randomPuyoPair,
  resolvePuyoChains,
  rotatePuyo,
} from "./puyo";
import {
  clearTetrisLines,
  emptyTetrisBoard,
  isValidTetris,
  lockTetromino,
  moveTetromino,
  randomTetromino,
  rotateTetromino,
  type TetrisBoard,
  type Tetromino,
} from "./tetris";

export type Side = "tet" | "puyo";

export type GameState = {
  active: Side;
  started: boolean;
  gameOver: boolean;
  tetBoard: TetrisBoard;
  tetPiece: Tetromino;
  tetNext: Tetromino;
  puyoBoard: PuyoBoard;
  puyoPair: PuyoPair;
  puyoNext: PuyoPair;
  score: { tet: number; puyo: number };
};

type ReplacementPieces = { tetNext: Tetromino; puyoNext: PuyoPair };

export type GameAction =
  | { type: "ROTATE_OR_START"; initialState: GameState }
  | { type: "SELECT"; side: Side }
  | { type: "MOVE"; dx: -1 | 1 }
  | ({ type: "DROP_ACTIVE" } & ReplacementPieces)
  | ({ type: "TICK" } & ReplacementPieces);

export function createInitialGameState(): GameState {
  return {
    active: "puyo",
    started: false,
    gameOver: false,
    tetBoard: emptyTetrisBoard(),
    tetPiece: randomTetromino(),
    tetNext: randomTetromino(),
    puyoBoard: emptyPuyoBoard(),
    puyoPair: randomPuyoPair(),
    puyoNext: randomPuyoPair(),
    score: { tet: 0, puyo: 0 },
  };
}

function dropTet(state: GameState, replacement: Tetromino): GameState {
  const moved = moveTetromino(state.tetPiece, 0, 1);
  if (isValidTetris(state.tetBoard, moved))
    return { ...state, tetPiece: moved };

  const result = clearTetrisLines(
    lockTetromino(state.tetBoard, state.tetPiece),
  );
  const incoming = {
    ...state.tetNext,
    cells: [...state.tetNext.cells],
    x: 3,
    y: 0,
  };
  return {
    ...state,
    tetBoard: result.board,
    tetPiece: incoming,
    tetNext: replacement,
    gameOver: state.gameOver || !isValidTetris(result.board, incoming),
    score: { ...state.score, tet: state.score.tet + result.cleared * 100 },
  };
}

function dropPuyo(state: GameState, replacement: PuyoPair): GameState {
  const moved = movePuyo(state.puyoPair, 0, 1);
  if (isValidPuyo(state.puyoBoard, moved)) return { ...state, puyoPair: moved };

  const result = resolvePuyoChains(lockPuyo(state.puyoBoard, state.puyoPair));
  const incoming: PuyoPair = {
    ...state.puyoNext,
    colors: [...state.puyoNext.colors],
    x: 2,
    y: 1,
    rotation: 0,
  };
  return {
    ...state,
    puyoBoard: result.board,
    puyoPair: incoming,
    puyoNext: replacement,
    gameOver: state.gameOver || !isValidPuyo(result.board, incoming),
    score: {
      ...state.score,
      puyo: state.score.puyo + result.cleared * 10 * Math.max(result.chains, 1),
    },
  };
}

function moveActive(state: GameState, dx: -1 | 1): GameState {
  if (state.active === "tet") {
    const candidate = moveTetromino(state.tetPiece, dx, 0);
    return isValidTetris(state.tetBoard, candidate)
      ? { ...state, tetPiece: candidate }
      : state;
  }
  const candidate = movePuyo(state.puyoPair, dx, 0);
  return isValidPuyo(state.puyoBoard, candidate)
    ? { ...state, puyoPair: candidate }
    : state;
}

function rotateActive(state: GameState): GameState {
  if (state.active === "tet") {
    const candidate = rotateTetromino(state.tetPiece);
    return isValidTetris(state.tetBoard, candidate)
      ? { ...state, tetPiece: candidate }
      : state;
  }

  let candidate = rotatePuyo(state.puyoPair);
  if (!isValidPuyo(state.puyoBoard, candidate)) {
    const kicked = movePuyo(candidate, candidate.rotation === 1 ? -1 : 1, 0);
    if (isValidPuyo(state.puyoBoard, kicked)) candidate = kicked;
  }
  return isValidPuyo(state.puyoBoard, candidate)
    ? { ...state, puyoPair: candidate }
    : state;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "ROTATE_OR_START":
      if (!state.started) return { ...state, started: true };
      if (state.gameOver) return { ...action.initialState, started: true };
      return rotateActive(state);
    case "SELECT":
      return { ...state, active: action.side };
    case "MOVE":
      return !state.started || state.gameOver
        ? state
        : moveActive(state, action.dx);
    case "DROP_ACTIVE":
      if (!state.started || state.gameOver) return state;
      return state.active === "tet"
        ? dropTet(state, action.tetNext)
        : dropPuyo(state, action.puyoNext);
    case "TICK":
      if (!state.started || state.gameOver) return state;
      return dropPuyo(dropTet(state, action.tetNext), action.puyoNext);
  }
}
