export const TETRIS_WIDTH = 10;
export const TETRIS_HEIGHT = 18;

export type TetrisCell = "" | "i" | "o" | "t" | "s" | "z" | "j" | "l";
export type TetrisBoard = TetrisCell[][];
export type Point = readonly [number, number];
export type Tetromino = {
  kind: Exclude<TetrisCell, "">;
  cells: Point[];
  x: number;
  y: number;
};

const SHAPES: Record<Tetromino["kind"], Point[]> = {
  i: [
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
  ],
  o: [
    [1, 0],
    [2, 0],
    [1, 1],
    [2, 1],
  ],
  t: [
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  s: [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ],
  z: [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
  j: [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  l: [
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
};

const KINDS = Object.keys(SHAPES) as Tetromino["kind"][];

export const emptyTetrisBoard = (): TetrisBoard =>
  Array.from({ length: TETRIS_HEIGHT }, () =>
    Array<TetrisCell>(TETRIS_WIDTH).fill(""),
  );

export function randomTetromino(random = Math.random): Tetromino {
  const kind = KINDS[Math.floor(random() * KINDS.length)];
  return { kind, cells: SHAPES[kind], x: 3, y: 0 };
}

export function isValidTetris(board: TetrisBoard, piece: Tetromino): boolean {
  return piece.cells.every(([cx, cy]) => {
    const x = piece.x + cx;
    const y = piece.y + cy;
    return (
      x >= 0 && x < TETRIS_WIDTH && y >= 0 && y < TETRIS_HEIGHT && !board[y][x]
    );
  });
}

export function moveTetromino(
  piece: Tetromino,
  dx: number,
  dy: number,
): Tetromino {
  return { ...piece, x: piece.x + dx, y: piece.y + dy };
}

export function rotateTetromino(piece: Tetromino): Tetromino {
  if (piece.kind === "o") return piece;
  const [pivotX, pivotY] = piece.kind === "i" ? [1.5, 1.5] : [1, 1];
  return {
    ...piece,
    cells: piece.cells.map(
      ([x, y]) => [pivotX - (y - pivotY), pivotY + (x - pivotX)] as Point,
    ),
  };
}

export function lockTetromino(
  board: TetrisBoard,
  piece: Tetromino,
): TetrisBoard {
  const next = board.map((row) => [...row]);
  for (const [cx, cy] of piece.cells)
    next[piece.y + cy][piece.x + cx] = piece.kind;
  return next;
}

export function clearTetrisLines(board: TetrisBoard): {
  board: TetrisBoard;
  cleared: number;
} {
  const remaining = board.filter((row) => row.some((cell) => !cell));
  const cleared = TETRIS_HEIGHT - remaining.length;
  return {
    board: [
      ...Array.from({ length: cleared }, () =>
        Array<TetrisCell>(TETRIS_WIDTH).fill(""),
      ),
      ...remaining,
    ],
    cleared,
  };
}

export function paintTetris(board: TetrisBoard, piece: Tetromino): TetrisBoard {
  if (!isValidTetris(board, piece)) return board;
  return lockTetromino(board, piece);
}
