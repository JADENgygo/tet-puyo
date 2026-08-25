import { describe, expect, it } from "vitest";
import { clearPuyoGroups, emptyPuyoBoard, resolvePuyoChains } from "./puyo";

describe("puyo logic", () => {
  it("clears four connected puyos", () => {
    const board = emptyPuyoBoard();
    for (let y = 8; y < 12; y += 1) board[y][0] = "red";
    const result = clearPuyoGroups(board);
    expect(result.cleared).toBe(4);
    expect(result.board.every((row) => row[0] === "")).toBe(true);
  });

  it("resolves a chain after gravity", () => {
    const board = emptyPuyoBoard();
    for (let y = 8; y < 12; y += 1) board[y][0] = "blue";
    for (let y = 8; y < 12; y += 1) board[y][1] = "red";
    const result = resolvePuyoChains(board);
    expect(result.cleared).toBe(8);
    expect(result.chains).toBe(1);
  });
});
