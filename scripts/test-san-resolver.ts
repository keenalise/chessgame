import { applyMove, createInitialState, resolveSANMove, generateFEN } from '../lib/chessEngine';

let failures = 0;

function replayAndCheck(label: string, sanMoves: string[], expectedFinalFEN?: string) {
  let state = createInitialState();
  for (let i = 0; i < sanMoves.length; i++) {
    const san = sanMoves[i];
    const resolved = resolveSANMove(state, san);
    if (!resolved) {
      console.log(`❌ [${label}] Could not resolve move #${i} ("${san}")`);
      console.log('   FEN at failure:', generateFEN(state));
      failures++;
      return;
    }
    try {
      state = applyMove(state, resolved.from, resolved.to, { promotion: resolved.promotion }).state;
    } catch (err) {
      console.log(`❌ [${label}] applyMove threw on move #${i} ("${san}"):`, (err as Error).message);
      failures++;
      return;
    }
  }
  const finalFEN = generateFEN(state);
  if (expectedFinalFEN && !finalFEN.startsWith(expectedFinalFEN)) {
    console.log(`❌ [${label}] Final position mismatch.`);
    console.log('   Expected prefix:', expectedFinalFEN);
    console.log('   Got:            ', finalFEN);
    failures++;
    return;
  }
  console.log(`✅ [${label}] All ${sanMoves.length} moves resolved correctly. FEN: ${finalFEN}`);
}

// 1. Basic development + kingside castling both sides (Ruy Lopez opening).
replayAndCheck(
  'Ruy Lopez + castling',
  'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O'.split(' ')
);

// 2. Queenside castling.
replayAndCheck(
  'Queenside castling',
  'd4 d5 Nc3 Nf6 Bf4 Nc6 Qd2 e6 O-O-O'.split(' ')
);

// 3. Knight disambiguation by file (two knights can both reach e4).
replayAndCheck(
  'Knight file disambiguation',
  'Nc3 e5 Nf3 Nc6 Ng5 h6 Nce4'.split(' ')
);

// 4. Rook disambiguation by file after both rooks connect on the back rank.
replayAndCheck(
  'Rook file disambiguation',
  'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d6 Nc3 Nc6 Bd2 Bd7 Qc1 Qc8 Rb1 Rb8'.split(' ')
);

// 5. Pawn captures + en passant + promotion.
replayAndCheck(
  'Captures, en passant, promotion',
  'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bg4 Be2 e6 O-O Bxf3 Bxf3'.split(' ')
);

if (failures > 0) {
  console.log(`\n${failures} test(s) FAILED.`);
  process.exit(1);
} else {
  console.log('\nAll tests passed.');
}