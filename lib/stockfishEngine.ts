'use client';

export interface EngineEvaluation {
  /** Centipawn score, always normalized to White's perspective (positive = good for White). */
  cp: number | null;
  /** Mate-in-N, always normalized to White's perspective (positive = White mates). */
  mate: number | null;
  bestMove: string | null;
  depth: number;
}

type PendingResolve = (evaluation: EngineEvaluation) => void;

/**
 * Thin wrapper around the Stockfish Web Worker (files served from
 * /public/stockfish/) speaking the UCI protocol directly. Kept as a
 * singleton so the whole app shares one engine instance instead of
 * spinning up a new WASM worker per evaluation.
 */
class StockfishEngine {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private pending: PendingResolve | null = null;
  private latestInfo: { cp: number | null; mate: number | null; depth: number; turnIsWhite: boolean } = {
    cp: null,
    mate: null,
    depth: 0,
    turnIsWhite: true,
  };

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;

    const supportsWasm =
      typeof WebAssembly === 'object' &&
      WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));

    this.worker = new Worker(supportsWasm ? '/stockfish/stockfish.wasm.js' : '/stockfish/stockfish.js');
    this.worker.addEventListener('message', (e: MessageEvent<string>) => this.handleMessage(e.data));
    return this.worker;
  }

  private handleMessage(line: string) {
    if (line === 'uciok' || line === 'readyok') return; // handled via one-shot listeners below

    if (line.startsWith('info') && line.includes('score')) {
      const depthMatch = line.match(/\bdepth (\d+)/);
      const cpMatch = line.match(/score cp (-?\d+)/);
      const mateMatch = line.match(/score mate (-?\d+)/);
      if (depthMatch) this.latestInfo.depth = parseInt(depthMatch[1], 10);
      if (cpMatch) {
        this.latestInfo.cp = parseInt(cpMatch[1], 10);
        this.latestInfo.mate = null;
      } else if (mateMatch) {
        this.latestInfo.mate = parseInt(mateMatch[1], 10);
        this.latestInfo.cp = null;
      }
      return;
    }

    if (line.startsWith('bestmove')) {
      const bestMove = line.split(' ')[1] ?? null;
      const sign = this.latestInfo.turnIsWhite ? 1 : -1;
      const result: EngineEvaluation = {
        cp: this.latestInfo.cp != null ? this.latestInfo.cp * sign : null,
        mate: this.latestInfo.mate != null ? this.latestInfo.mate * sign : null,
        bestMove: bestMove === '(none)' ? null : bestMove,
        depth: this.latestInfo.depth,
      };
      this.pending?.(result);
      this.pending = null;
    }
  }

  private async waitFor(predicate: (line: string) => boolean): Promise<void> {
    const worker = this.ensureWorker();
    return new Promise((resolve) => {
      const listener = (e: MessageEvent<string>) => {
        if (predicate(e.data)) {
          worker.removeEventListener('message', listener);
          resolve();
        }
      };
      worker.addEventListener('message', listener);
    });
  }

  private async init(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      const worker = this.ensureWorker();
      const uciOk = this.waitFor((line) => line === 'uciok');
      worker.postMessage('uci');
      await uciOk;

      const readyOk = this.waitFor((line) => line === 'readyok');
      worker.postMessage('isready');
      await readyOk;
    })();
    return this.ready;
  }

  /**
   * Evaluates a position (by FEN) to a given search depth. Returns cp/mate
   * scores normalized to White's perspective regardless of whose turn it is,
   * so callers can compare evaluations across plies without re-flipping signs.
   */
  async evaluate(fen: string, depth = 14): Promise<EngineEvaluation> {
    await this.init();
    const worker = this.ensureWorker();

    // Wait for any in-flight evaluation to finish - the engine can only
    // search one position at a time.
    while (this.pending) {
      await new Promise((r) => setTimeout(r, 20));
    }

    this.latestInfo = { cp: null, mate: null, depth: 0, turnIsWhite: fen.split(' ')[1] !== 'b' };

    return new Promise((resolve) => {
      this.pending = resolve;
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go depth ${depth}`);
    });
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
    this.pending = null;
  }
}

// Single shared instance for the whole app.
let sharedEngine: StockfishEngine | null = null;

export function getStockfishEngine(): StockfishEngine {
  if (!sharedEngine) sharedEngine = new StockfishEngine();
  return sharedEngine;
}
