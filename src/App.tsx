import { useEffect, useRef, useState } from "react";
import {
  emptyPuyoBoard,
  isValidPuyo,
  lockPuyo,
  movePuyo,
  type PuyoBoard,
  type PuyoPair,
  paintPuyo,
  randomPuyoPair,
  resolvePuyoChains,
  rotatePuyo,
} from "./game/puyo";
import {
  clearTetrisLines,
  emptyTetrisBoard,
  isValidTetris,
  lockTetromino,
  moveTetromino,
  paintTetris,
  randomTetromino,
  rotateTetromino,
  type TetrisBoard,
  type Tetromino,
} from "./game/tetris";

type Side = "tet" | "puyo";
type Theme = "light" | "dark";
type GameAction =
  | "left"
  | "right"
  | "down"
  | "rotate"
  | "tet"
  | "puyo"
  | "confirm";

const TETRIS_STYLE: Record<Tetromino["kind"], string> = {
  i: "bg-[#2ecbd3] shadow-[inset_0_0_0_3px_#67e3e8]",
  o: "bg-[#f5c842] shadow-[inset_0_0_0_3px_#ffe177]",
  t: "bg-[#a45ce6] shadow-[inset_0_0_0_3px_#c58af3]",
  s: "bg-[#65c86c] shadow-[inset_0_0_0_3px_#92e198]",
  z: "bg-[#ee5470] shadow-[inset_0_0_0_3px_#f6899d]",
  j: "bg-[#4c78dc] shadow-[inset_0_0_0_3px_#7ea1ee]",
  l: "bg-[#ed923e] shadow-[inset_0_0_0_3px_#f6b36e]",
};

const PUYO_STYLE: Record<Exclude<PuyoPair["colors"][number], "">, string> = {
  red: "bg-linear-to-br from-[#ff9aaa] via-[#f46b83] to-[#d94361]",
  blue: "bg-linear-to-br from-[#9ac5ff] via-[#659eea] to-[#3d72c8]",
  yellow: "bg-linear-to-br from-[#fff2a3] via-[#f6d55f] to-[#e4aa2f]",
  green: "bg-linear-to-br from-[#a9edac] via-[#72cf78] to-[#49a952]",
  purple: "bg-linear-to-br from-[#ddb1f5] via-[#b87ae0] to-[#8d52ba]",
};

const CELL_STYLE = "block size-full border border-white/5";
const PUYO_STYLE_BASE =
  "relative block rounded-[48%_52%_46%_54%/52%_45%_55%_48%] shadow-[inset_2px_3px_3px_rgb(255_255_255_/_38%),inset_-3px_-4px_4px_rgb(65_48_92_/_14%),0_4px_7px_rgb(32_26_55_/_24%)] transition-transform before:absolute before:top-[12%] before:left-[17%] before:size-[27%] before:rounded-full before:bg-white/45 before:blur-[1px] before:content-[''] after:absolute after:font-rounded after:text-[11px] after:font-extrabold after:tracking-[-1px] after:text-[#302945] after:drop-shadow-[0_1px_0_rgb(255_255_255_/_35%)] after:content-['•ᴗ•']";
const DROP_INTERVAL = 700;

const preferredTheme = (): Theme => {
  const saved = localStorage.getItem("furufuru-theme");
  if (saved === "light" || saved === "dark") return saved;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

function MiniTetris({ piece }: { piece: Tetromino }) {
  const xs = piece.cells.map(([x]) => x);
  const ys = piece.cells.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = (Math.max(...xs) - minX + 1) * 16;
  const height = (Math.max(...ys) - minY + 1) * 16;
  return (
    <div className="relative size-16">
      {piece.cells.map(([x, y]) => (
        <i
          key={`${x}-${y}`}
          className={`absolute size-4 border border-white/5 ${TETRIS_STYLE[piece.kind]}`}
          style={{
            left: (64 - width) / 2 + (x - minX) * 16,
            top: (64 - height) / 2 + (y - minY) * 16,
          }}
        />
      ))}
    </div>
  );
}

function MiniPuyo({ pair }: { pair: PuyoPair }) {
  return (
    <div className="flex h-[70px] flex-col justify-center">
      <i
        className={`${PUYO_STYLE_BASE} size-[30px] after:top-0.5 after:left-[7px] ${PUYO_STYLE[pair.colors[1] as Exclude<PuyoPair["colors"][number], "">]}`}
      />
      <i
        className={`${PUYO_STYLE_BASE} size-[30px] after:top-0.5 after:left-[7px] ${PUYO_STYLE[pair.colors[0] as Exclude<PuyoPair["colors"][number], "">]}`}
      />
    </div>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-grid h-6 min-w-[25px] place-items-center rounded-md border border-b-[3px] border-[var(--line)] bg-[var(--surface)] px-1.5 font-game text-[10px] font-semibold text-[var(--ink)]">
      {children}
    </kbd>
  );
}

function PadKey({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-grid h-6 min-w-6 place-items-center rounded-full border border-[#655a88] bg-[#39334f] px-1.5 font-game text-[9px] font-bold text-white shadow-[inset_0_2px_0_rgb(255_255_255_/_18%)]">
      {children}
    </span>
  );
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(preferredTheme);
  const [active, setActive] = useState<Side>("puyo");
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [tetBoard, setTetBoard] = useState<TetrisBoard>(emptyTetrisBoard);
  const [tetPiece, setTetPiece] = useState<Tetromino>(randomTetromino);
  const [tetNext, setTetNext] = useState<Tetromino>(randomTetromino);
  const [puyoBoard, setPuyoBoard] = useState<PuyoBoard>(emptyPuyoBoard);
  const [puyoPair, setPuyoPair] = useState<PuyoPair>(randomPuyoPair);
  const [puyoNext, setPuyoNext] = useState<PuyoPair>(randomPuyoPair);
  const [score, setScore] = useState({ tet: 0, puyo: 0 });
  const stateRef = useRef({ started, gameOver, active });
  stateRef.current = { started, gameOver, active };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "light" ? "#fff8ee" : "#171522");
    document
      .querySelector('meta[name="color-scheme"]')
      ?.setAttribute("content", theme);
    localStorage.setItem("furufuru-theme", theme);
  }, [theme]);

  function reset() {
    setTetBoard(emptyTetrisBoard());
    setTetPiece(randomTetromino());
    setTetNext(randomTetromino());
    setPuyoBoard(emptyPuyoBoard());
    setPuyoPair(randomPuyoPair());
    setPuyoNext(randomPuyoPair());
    setScore({ tet: 0, puyo: 0 });
    setActive("puyo");
    setStarted(false);
    setGameOver(false);
  }

  function spawnTet(board: TetrisBoard) {
    const incoming = { ...tetNext, cells: [...tetNext.cells], x: 3, y: 0 };
    setTetPiece(incoming);
    setTetNext(randomTetromino());
    if (!isValidTetris(board, incoming)) setGameOver(true);
  }

  function dropTet() {
    if (!started || gameOver) return;
    const moved = moveTetromino(tetPiece, 0, 1);
    if (isValidTetris(tetBoard, moved)) setTetPiece(moved);
    else {
      const result = clearTetrisLines(lockTetromino(tetBoard, tetPiece));
      setTetBoard(result.board);
      setScore((value) => ({
        ...value,
        tet: value.tet + result.cleared * 100,
      }));
      spawnTet(result.board);
    }
  }

  function spawnPuyo(board: PuyoBoard) {
    const incoming = {
      ...puyoNext,
      colors: [...puyoNext.colors] as PuyoPair["colors"],
      x: 2,
      y: 1,
      rotation: 0,
    };
    setPuyoPair(incoming);
    setPuyoNext(randomPuyoPair());
    if (!isValidPuyo(board, incoming)) setGameOver(true);
  }

  function dropPuyo() {
    if (!started || gameOver) return;
    const moved = movePuyo(puyoPair, 0, 1);
    if (isValidPuyo(puyoBoard, moved)) setPuyoPair(moved);
    else {
      const result = resolvePuyoChains(lockPuyo(puyoBoard, puyoPair));
      setPuyoBoard(result.board);
      setScore((value) => ({
        ...value,
        puyo: value.puyo + result.cleared * 10 * Math.max(result.chains, 1),
      }));
      spawnPuyo(result.board);
    }
  }

  function action(command: GameAction) {
    if (command === "tet" || command === "puyo") return setActive(command);
    if (
      (command === "confirm" || command === "rotate") &&
      (!started || gameOver)
    ) {
      if (gameOver) reset();
      setStarted(true);
      return;
    }
    if (!started || gameOver) return;
    if (active === "tet") {
      if (command === "down") return dropTet();
      const candidate =
        command === "rotate"
          ? rotateTetromino(tetPiece)
          : moveTetromino(tetPiece, command === "left" ? -1 : 1, 0);
      if (isValidTetris(tetBoard, candidate)) setTetPiece(candidate);
    } else {
      if (command === "down") return dropPuyo();
      let candidate =
        command === "rotate"
          ? rotatePuyo(puyoPair)
          : movePuyo(puyoPair, command === "left" ? -1 : 1, 0);
      if (command === "rotate" && !isValidPuyo(puyoBoard, candidate)) {
        const kicked = movePuyo(
          candidate,
          candidate.rotation === 1 ? -1 : 1,
          0,
        );
        if (isValidPuyo(puyoBoard, kicked)) candidate = kicked;
      }
      if (isValidPuyo(puyoBoard, candidate)) setPuyoPair(candidate);
    }
  }

  const actionRef = useRef(action);
  actionRef.current = action;
  const dropTetRef = useRef(dropTet);
  const dropPuyoRef = useRef(dropPuyo);
  dropTetRef.current = dropTet;
  dropPuyoRef.current = dropPuyo;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const map: Record<string, GameAction> = {
        a: "left",
        d: "right",
        s: "down",
        " ": "rotate",
        ArrowLeft: "puyo",
        ArrowRight: "tet",
        Enter: "confirm",
      };
      const command = map[event.key];
      if (command) {
        event.preventDefault();
        if (event.repeat && command !== "down") return;
        actionRef.current(command);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    const dropTimer = window.setInterval(() => {
      dropTetRef.current();
      dropPuyoRef.current();
    }, DROP_INTERVAL);
    return () => clearInterval(dropTimer);
  }, [gameOver, started]);

  useEffect(() => {
    let frame = 0;
    let previous = new Set<string>();
    let nextDownRepeat = 0;
    const poll = (timestamp: number) => {
      const pad = navigator.getGamepads?.()[0];
      if (pad) {
        const pressed = new Set<string>();
        const axisX = pad.axes[0] ?? 0;
        const axisY = pad.axes[1] ?? 0;
        if (axisX < -0.55 || pad.buttons[14]?.pressed) pressed.add("left");
        if (axisX > 0.55 || pad.buttons[15]?.pressed) pressed.add("right");
        if (axisY > 0.55 || pad.buttons[13]?.pressed) pressed.add("down");
        if (pad.buttons[0]?.pressed)
          pressed.add(
            stateRef.current.started && !stateRef.current.gameOver
              ? "rotate"
              : "confirm",
          );
        if (pad.buttons[4]?.pressed) pressed.add("puyo");
        if (pad.buttons[5]?.pressed) pressed.add("tet");
        for (const key of pressed) {
          if (!previous.has(key)) {
            actionRef.current(key as GameAction);
            if (key === "down") nextDownRepeat = timestamp + 220;
          } else if (key === "down" && timestamp >= nextDownRepeat) {
            actionRef.current("down");
            nextDownRepeat = timestamp + 70;
          }
        }
        if (!pressed.has("down")) nextDownRepeat = 0;
        previous = pressed;
      }
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, []);

  const shownTet = paintTetris(tetBoard, tetPiece);
  const shownPuyo = paintPuyo(puyoBoard, puyoPair);

  return (
    <>
      <div className="hidden min-h-screen flex-col items-center justify-center gap-5 p-[30px] text-center font-rounded max-md:flex [@media(pointer:coarse)_and_(max-width:1024px)]:flex">
        <strong className="text-[38px]">ぷトリよ</strong>
        <span className="leading-[1.8] text-[var(--muted)]">
          このゲームはPC専用です。
          <br />
          キーボードまたはコントローラーで遊んでね。
        </span>
      </div>
      <div className="grid min-h-screen grid-rows-[78px_1fr_96px] max-md:hidden [@media(pointer:coarse)_and_(max-width:1024px)]:hidden [@media(max-height:760px)_and_(min-width:768px)]:grid-rows-[58px_1fr_76px]">
        <header className="relative flex items-center border-b border-[var(--line)] px-[42px] [@media(max-height:760px)_and_(min-width:768px)]:px-7">
          <h1 className="absolute left-1/2 m-0 flex -translate-x-1/2 items-center gap-0.5 font-rounded text-[32px] font-extrabold tracking-[.06em] drop-shadow-[0_3px_0_rgb(46_41_66_/_12%)]">
            <span className="-rotate-6 text-[#ee5470]">ぷ</span>
            <span className="rotate-3 text-[#6657e8]">ト</span>
            <span className="-rotate-3 text-[#45bcd0]">リ</span>
            <span className="rotate-6 text-[#f0ad35]">よ</span>
          </h1>
          <nav className="ml-auto flex items-center gap-3.5">
            <button
              className="grid size-[42px] cursor-pointer place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-xl transition hover:-translate-y-0.5 hover:shadow-lg"
              type="button"
              aria-label={`${theme === "light" ? "ダーク" : "ライト"}モードに切り替え`}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? "☾" : "☀"}
            </button>
            <a
              className="grid size-[42px] place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-xl no-underline transition hover:-translate-y-0.5 hover:shadow-lg"
              href="https://x.com/JADENgygo"
              target="_blank"
              rel="noreferrer"
              aria-label="JADENgygoのX"
            >
              𝕏
            </a>
          </nav>
        </header>
        <main className="relative grid grid-cols-[334px_96px_334px] items-center justify-center gap-4 overflow-hidden px-6 py-8 before:pointer-events-none before:absolute before:top-[12%] before:-left-[110px] before:size-[280px] before:rounded-full before:bg-tet before:opacity-10 before:blur-[3px] before:content-[''] after:pointer-events-none after:absolute after:right-[-90px] after:bottom-[5%] after:size-[280px] after:rounded-full after:bg-puyo after:opacity-10 after:blur-[3px] after:content-[''] [@media(max-height:760px)_and_(min-width:768px)]:scale-[.87] [@media(max-height:760px)_and_(min-width:768px)]:p-[15px]">
          <section
            className={`order-3 justify-self-center transition ${active === "tet" ? "" : "scale-[.985] opacity-[.83] saturate-[.7]"}`}
            aria-label="テトリス風パズル"
          >
            <div className="mb-[9px] flex items-baseline justify-between tracking-[.12em]">
              <span className="font-rounded text-xl font-bold">トリ</span>
              <b className="text-sm text-[var(--muted)]">
                {score.tet.toString().padStart(6, "0")}
              </b>
            </div>
            <div
              className={`grid grid-cols-[repeat(10,32px)] grid-rows-[repeat(18,32px)] overflow-hidden rounded-[13px] border-[7px] border-[var(--surface)] bg-[#25223a] shadow-[var(--shadow)] outline-2 ${active === "tet" ? "outline-tet" : "outline-[var(--line)]"}`}
            >
              {shownTet.flatMap((row, y) =>
                row.map((cell, x) => (
                  <i
                    key={`${x}-${y}`}
                    className={
                      cell ? `${CELL_STYLE} ${TETRIS_STYLE[cell]}` : CELL_STYLE
                    }
                  />
                )),
              )}
            </div>
          </section>
          <aside className="order-2 flex flex-col items-center gap-[17px] self-center">
            <div className="flex min-h-[108px] w-[100px] flex-col items-center justify-center gap-2 rounded-[18px] border border-[var(--line)] bg-[var(--surface)] shadow-lg">
              <MiniPuyo pair={puyoNext} />
              <small className="text-[10px] tracking-[.2em] text-[var(--muted)]">
                NEXT
              </small>
            </div>
            <div className="flex min-h-[108px] w-[100px] flex-col items-center justify-center gap-2 rounded-[18px] border border-[var(--line)] bg-[var(--surface)] shadow-lg">
              <small className="text-[10px] tracking-[.2em] text-[var(--muted)]">
                NEXT
              </small>
              <MiniTetris piece={{ ...tetNext, x: 0, y: 0 }} />
            </div>
          </aside>
          <section
            className={`order-1 justify-self-center transition ${active === "puyo" ? "" : "scale-[.985] opacity-[.83] saturate-[.7]"}`}
            aria-label="ぷよぷよ風パズル"
          >
            <div className="mb-[9px] flex items-baseline justify-between tracking-[.12em]">
              <span className="font-rounded text-xl font-bold">ぷよ</span>
              <b className="text-sm text-[var(--muted)]">
                {score.puyo.toString().padStart(6, "0")}
              </b>
            </div>
            <div
              className={`grid h-[590px] w-[334px] grid-cols-6 grid-rows-12 place-items-center overflow-hidden rounded-[13px] border-[7px] border-[var(--surface)] bg-[#25223a] shadow-[var(--shadow)] outline-2 ${active === "puyo" ? "outline-puyo" : "outline-[var(--line)]"}`}
            >
              {shownPuyo.flatMap((row, y) =>
                row.map((cell, x) => (
                  <i
                    key={`${x}-${y}`}
                    className={
                      cell
                        ? `${PUYO_STYLE_BASE} size-[46px] after:top-2 after:left-[15px] ${PUYO_STYLE[cell]}`
                        : "size-[46px] rounded-full border border-dashed border-white/5"
                    }
                  />
                )),
              )}
            </div>
          </section>
          {(!started || gameOver) && (
            <div className="absolute inset-0 z-5 grid place-items-center bg-[#fff8eeb0] backdrop-blur-[5px] [[data-theme=dark]_&]:bg-[#171522bd]">
              <div className="min-w-[380px] rounded-[26px] border border-[var(--line)] bg-[var(--surface)] px-12 pt-[34px] pb-[39px] text-center shadow-[var(--shadow)]">
                <h2 className="mt-2 mb-[5px] text-[34px] tracking-[.13em]">
                  {gameOver ? "GAME OVER" : "READY?"}
                </h2>
                <p className="mt-0 mb-[23px] font-rounded text-[13px] text-[var(--muted)]">
                  {gameOver
                    ? `TOTAL SCORE  ${score.tet + score.puyo}`
                    : "ふたつのパズルを、ひとつのリズムで。"}
                </p>
                <button
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border-0 bg-[var(--ink)] px-[23px] py-[13px] font-bold text-[var(--page)]"
                  type="button"
                  onClick={() => action("confirm")}
                >
                  <Key>SPACE</Key>
                  <span className="text-[10px] opacity-60">/</span>
                  <PadKey>A</PadKey>
                  {gameOver ? "もう一度" : "ゲームスタート"}
                </button>
              </div>
            </div>
          )}
        </main>
        <footer className="flex items-center justify-center border-t border-[var(--line)] px-[42px] [@media(max-height:760px)_and_(min-width:768px)]:px-7">
          <div className="flex flex-col items-center gap-2 text-[11px] text-[var(--muted)]">
            <div className="flex gap-[22px]">
              <span className="flex items-center gap-1">
                <Key>A</Key>
                <Key>D</Key> 移動
              </span>
              <span className="flex items-center gap-1">
                <Key>S</Key> 落下
              </span>
              <span className="flex items-center gap-1">
                <Key>SPACE</Key> 回転 / 決定
              </span>
              <span className="flex items-center gap-1">
                <Key>←</Key>
                <Key>→</Key> 画面選択
              </span>
            </div>
            <div className="flex gap-[22px]">
              <span className="flex items-center gap-1">
                <PadKey>STICK</PadKey>
                <PadKey>十字</PadKey> 移動
              </span>
              <span className="flex items-center gap-1">
                <PadKey>↓</PadKey> 落下
              </span>
              <span className="flex items-center gap-1">
                <PadKey>A</PadKey> 回転 / 決定
              </span>
              <span className="flex items-center gap-1">
                <PadKey>LB</PadKey>
                <PadKey>RB</PadKey> 画面選択
              </span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
