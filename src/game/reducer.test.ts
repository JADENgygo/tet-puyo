import { describe, expect, it } from "vitest";
import { randomPuyoPair } from "./puyo";
import { createInitialGameState, type GameState, gameReducer } from "./reducer";
import { randomTetromino } from "./tetris";

const replacements = () => ({
  tetNext: randomTetromino(() => 0),
  puyoNext: randomPuyoPair(() => 0),
});

describe("game reducer", () => {
  it("drops both pieces on the same tick", () => {
    const state: GameState = { ...createInitialGameState(), started: true };
    const next = gameReducer(state, { type: "TICK", ...replacements() });
    expect(next.tetPiece.y).toBe(state.tetPiece.y + 1);
    expect(next.puyoPair.y).toBe(state.puyoPair.y + 1);
  });

  it("moves only the selected side", () => {
    const state: GameState = { ...createInitialGameState(), started: true };
    const next = gameReducer(state, { type: "MOVE", dx: -1 });
    expect(next.puyoPair.x).toBe(state.puyoPair.x - 1);
    expect(next.tetPiece.x).toBe(state.tetPiece.x);
  });

  it("starts with a fresh state after game over", () => {
    const state: GameState = {
      ...createInitialGameState(),
      started: true,
      gameOver: true,
      score: { tet: 500, puyo: 400 },
    };
    const initialState = createInitialGameState();
    const next = gameReducer(state, {
      type: "ROTATE_OR_START",
      initialState,
    });
    expect(next.started).toBe(true);
    expect(next.gameOver).toBe(false);
    expect(next.score).toEqual({ tet: 0, puyo: 0 });
  });
});
