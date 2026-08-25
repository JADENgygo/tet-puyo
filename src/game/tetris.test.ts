import { describe, expect, it } from "vitest";
import {
  clearTetrisLines,
  emptyTetrisBoard,
  isValidTetris,
  moveTetromino,
  randomTetromino,
  rotateTetromino,
} from "./tetris";

describe("tetris logic", () => {
  it("filled lines are removed", () => {
    const board = emptyTetrisBoard();
    board[17].fill("i");
    const result = clearTetrisLines(board);
    expect(result.cleared).toBe(1);
    expect(result.board[0].every((cell) => cell === "")).toBe(true);
  });

  it("does not allow a piece outside the board", () => {
    const piece = randomTetromino(() => 0);
    expect(
      isValidTetris(emptyTetrisBoard(), moveTetromino(piece, -10, 0)),
    ).toBe(false);
  });

  it("rotates around the center of the tetromino", () => {
    const piece = randomTetromino(() => 0);
    const rotated = rotateTetromino(piece);
    expect(rotated.cells).toEqual([
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
    ]);
    expect(rotated.x).toBe(piece.x);
    expect(rotated.y).toBe(piece.y);
  });

  it("returns to the same cells after four rotations", () => {
    const piece = randomTetromino(() => 0.4);
    let rotated = piece;
    for (let count = 0; count < 4; count += 1)
      rotated = rotateTetromino(rotated);
    expect(rotated).toEqual(piece);
  });
});
