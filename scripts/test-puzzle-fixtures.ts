import { Chess } from 'chess.js';

/**
 * Regression test for the puzzle-loading logic in hooks/useLichessPuzzle.ts.
 *
 * Both fixtures below are REAL recorded Lichess API responses, not
 * hand-constructed data:
 *
 * - "berserk fixture" is a VCR test cassette from lichess-org/berserk (the
 *   official Python client), recorded from an actual call to
 *   /api/puzzle/next.
 * - "tHj5w puzzle" is from a public GitHub issue where someone pasted the
 *   raw response of /api/puzzle/tHj5w.
 *
 * This exists because a previous version of the replay logic used
 * `initialPly` as a direct move count, which is off by one - Lichess's
 * `initialPly` identifies a ply position (0-indexed), not a count of plies
 * already played, so reaching the puzzle's actual position requires
 * replaying `initialPly + 1` SAN tokens. Both fixtures below fail if that
 * off-by-one regresses.
 */

function uciToChessJsMove(uci: string) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined };
}

let failures = 0;

function testFixture(label: string, pgn: string, initialPly: number, solution: string[]) {
  const sanMoves = pgn.trim().split(/\s+/).filter(Boolean);
  const chess = new Chess();

  const pliesToReplay = initialPly + 1;
  for (let i = 0; i < pliesToReplay; i++) {
    const san = sanMoves[i];
    if (!san) {
      console.log(`❌ [${label}] ran out of PGN moves at index ${i}`);
      failures++;
      return;
    }
    if (!chess.move(san)) {
      console.log(`❌ [${label}] replay failed at move #${i} ("${san}")`);
      failures++;
      return;
    }
  }

  try {
    chess.move(uciToChessJsMove(solution[0]));
    console.log(`✅ [${label}] replayed ${pliesToReplay} moves, setup move "${solution[0]}" applied correctly.`);
  } catch (err) {
    console.log(`❌ [${label}] setup move "${solution[0]}" failed:`, (err as Error).message);
    failures++;
  }
}

testFixture(
  'berserk fixture (real /api/puzzle/next recording)',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 e5 d5 Bb5 Ne4 Nxd4 Bd7 Bxc6 bxc6 O-O Bc5 f3 Ng5 f4 Ne4 Be3 Rb8 f5 Rxb2 e6 Bc8 Qg4 O-O Kh1 fxe6 Nxc6 Qd6 Nd4 exf5 Qh5 f4 Bg1 c6 c4 Ba6 Nf5 Qf6 Bxc5 Nxc5 Rxf4 Bxc4 Nc3 Rbb8 Rc1 Nd3 Rcf1 Nxf4 Rxf4 Qxc3 Ne7+ Kh8 Ng6+ Kg8',
  59,
  ['g6e7', 'g8h8', 'h5h7', 'h8h7', 'f4h4']
);

testFixture(
  'tHj5w puzzle (real /api/puzzle/tHj5w recording)',
  'e4 g6 Nf3 Bg7 d4 e6 c3 Ne7 Bd3 O-O Be3 f5 e5 Nbc6 Qd2 Nd5 Bg5 Qe8 Na3 Qf7 Bh6 f4 Bxg7 Qxg7 O-O Nce7 Nc4 Nf5 Qc2 b5 Bxf5 Rxf5 Ncd2 g5 h3 Bb7 Ne4 h6 Nh2 h5 a3 Rc8 b3 Qe7 c4 Nb6 Nf6+ Rxf6 exf6 Qxf6 Qd3 bxc4 bxc4 Ba6 Rfc1 d5 Nf3 Bxc4 Qd2 c5 Ne5 cxd4 Qxd4 f3 Nxf3 Qxd4 Nxd4 Kf7 Re1 Re8 Nf3 Kf6 a4 a5 Nd4 e5 Nc6 Kf5 Nxa5 Ra8 Nxc4 Nxc4 Red1 Ra5 f3 Nb2 Rd2 Nc4 Re2 Kf4 Kf2 h4 Rd1 d4 Re4+ Kf5 g3 hxg3+ Kxg3 Rxa4 Rc1 Nd2 Re2 Ra2 Rd1 Nf1+ Kf2 Rxe2+ Kxe2 Ne3 Rh1 Kf4 h4 g4 fxg4 Nxg4 h5 d3+ Ke1 e4 h6 Ke3 h7 d2+ Kd1',
  124,
  ['e3d3', 'h1h3', 'e4e3', 'h3f3', 'g4f2', 'f3f2', 'e3f2', 'h7h8q', 'f2f1q']
);

if (failures > 0) {
  console.log(`\n${failures} test(s) FAILED.`);
  process.exit(1);
} else {
  console.log('\nAll puzzle-fixture tests passed.');
}