export const PUYO_WIDTH = 6;
export const PUYO_HEIGHT = 12;
export type PuyoColor = "" | "red" | "blue" | "yellow" | "green" | "purple";
export type PuyoBoard = PuyoColor[][];
export type PuyoPair = {
  colors: [PuyoColor, PuyoColor];
  x: number;
  y: number;
  rotation: number;
};

const COLORS: Exclude<PuyoColor, "">[] = [
  "red",
  "blue",
  "yellow",
  "green",
  "purple",
];
const OFFSETS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

export const emptyPuyoBoard = (): PuyoBoard =>
  Array.from({ length: PUYO_HEIGHT }, () =>
    Array<PuyoColor>(PUYO_WIDTH).fill(""),
  );

export function randomPuyoPair(random = Math.random): PuyoPair {
  return {
    colors: [
      COLORS[Math.floor(random() * COLORS.length)],
      COLORS[Math.floor(random() * COLORS.length)],
    ],
    x: 2,
    y: 1,
    rotation: 0,
  };
}

export function puyoCells(
  pair: PuyoPair,
): Array<{ x: number; y: number; color: PuyoColor }> {
  const [dx, dy] = OFFSETS[pair.rotation % 4];
  return [
    { x: pair.x, y: pair.y, color: pair.colors[0] },
    { x: pair.x + dx, y: pair.y + dy, color: pair.colors[1] },
  ];
}

export function isValidPuyo(board: PuyoBoard, pair: PuyoPair): boolean {
  return puyoCells(pair).every(
    ({ x, y }) =>
      x >= 0 && x < PUYO_WIDTH && y >= 0 && y < PUYO_HEIGHT && !board[y][x],
  );
}

export const movePuyo = (pair: PuyoPair, dx: number, dy: number): PuyoPair => ({
  ...pair,
  x: pair.x + dx,
  y: pair.y + dy,
});

export const rotatePuyo = (pair: PuyoPair): PuyoPair => ({
  ...pair,
  rotation: (pair.rotation + 1) % 4,
});

export function lockPuyo(board: PuyoBoard, pair: PuyoPair): PuyoBoard {
  const next = board.map((row) => [...row]);
  for (const { x, y, color } of puyoCells(pair)) next[y][x] = color;
  return applyPuyoGravity(next);
}

export function applyPuyoGravity(board: PuyoBoard): PuyoBoard {
  const next = emptyPuyoBoard();
  for (let x = 0; x < PUYO_WIDTH; x += 1) {
    const colors = board.map((row) => row[x]).filter(Boolean);
    colors.forEach((color, index) => {
      next[PUYO_HEIGHT - colors.length + index][x] = color;
    });
  }
  return next;
}

export function clearPuyoGroups(board: PuyoBoard): {
  board: PuyoBoard;
  cleared: number;
} {
  const visited = new Set<string>();
  const remove = new Set<string>();
  for (let y = 0; y < PUYO_HEIGHT; y += 1) {
    for (let x = 0; x < PUYO_WIDTH; x += 1) {
      const color = board[y][x];
      const key = `${x},${y}`;
      if (!color || visited.has(key)) continue;
      const group: Array<[number, number]> = [];
      const queue: Array<[number, number]> = [[x, y]];
      visited.add(key);
      while (queue.length) {
        const [qx, qy] = queue.shift() as [number, number];
        group.push([qx, qy]);
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = qx + dx;
          const ny = qy + dy;
          const nextKey = `${nx},${ny}`;
          if (
            nx >= 0 &&
            nx < PUYO_WIDTH &&
            ny >= 0 &&
            ny < PUYO_HEIGHT &&
            !visited.has(nextKey) &&
            board[ny][nx] === color
          ) {
            visited.add(nextKey);
            queue.push([nx, ny]);
          }
        }
      }
      if (group.length >= 4)
        group.forEach(([gx, gy]) => {
          remove.add(`${gx},${gy}`);
        });
    }
  }
  const next = board.map((row, y) =>
    row.map((color, x) => (remove.has(`${x},${y}`) ? "" : color)),
  );
  return { board: applyPuyoGravity(next), cleared: remove.size };
}

export function resolvePuyoChains(board: PuyoBoard): {
  board: PuyoBoard;
  cleared: number;
  chains: number;
} {
  let current = board;
  let cleared = 0;
  let chains = 0;
  while (true) {
    const result = clearPuyoGroups(current);
    if (!result.cleared) return { board: current, cleared, chains };
    current = result.board;
    cleared += result.cleared;
    chains += 1;
  }
}

export function paintPuyo(board: PuyoBoard, pair: PuyoPair): PuyoBoard {
  if (!isValidPuyo(board, pair)) return board;
  const next = board.map((row) => [...row]);
  for (const { x, y, color } of puyoCells(pair)) next[y][x] = color;
  return next;
}
