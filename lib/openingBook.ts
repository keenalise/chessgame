/**
 * A compact opening "book" used only to tag moves as Book in the Game Review
 * (the same way chess.com shows a Book icon while a game is still following
 * known theory). It is deliberately small - a handful of mainlines per common
 * first move - not a full ECO database. The moment a game leaves every line
 * below, book tagging stops, which is exactly the behaviour we want.
 *
 * Lines are written in THIS project's own SAN style (see formatNotation in
 * chessEngine.ts): castling is "O-O"/"O-O-O", captures use "x", and there is
 * no move-number prefix and no piece disambiguation (the engine never emits
 * "Nbd2"-style disambiguators, so neither do these lines).
 */
const BOOK_LINES: string[] = [
  // --- 1.e4 e5 ---
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6', // Italian
  'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O', // Italian, two knights
  'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O', // Ruy Lopez, closed
  'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O', // Ruy Lopez, exchange
  'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4', // Berlin
  'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5', // Petrov
  'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nc3 Bb4', // Scotch
  'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4', // Four Knights
  'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7', // Philidor
  'e4 e5 Nc3 Nf6 f4 d5', // Vienna
  'e4 e5 f4 exf4 Nf3 g5', // King's Gambit accepted

  // --- 1.e4 c5 (Sicilian) ---
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', // Najdorf
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6', // Dragon
  'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5', // Sveshnikov
  'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6', // Accelerated Dragon
  'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6', // Taimanov
  'e4 c5 Nf3 Nc6 Bb5 g6', // Rossolimo
  'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6', // Alapin
  'e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7', // Closed Sicilian

  // --- 1.e4 e6 (French) ---
  'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7', // Classical
  'e4 e6 d4 d5 Nc3 Bb4', // Winawer
  'e4 e6 d4 d5 Nd2 Nf6', // Tarrasch
  'e4 e6 d4 d5 e5 c5 c3 Nc6', // Advance

  // --- 1.e4 c6 (Caro-Kann) ---
  'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5', // Classical
  'e4 c6 d4 d5 e5 Bf5', // Advance
  'e4 c6 d4 d5 exd5 cxd5', // Exchange

  // --- other 1.e4 ---
  'e4 d5 exd5 Qxd5 Nc3 Qa5', // Scandinavian
  'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7', // Pirc, Austrian
  'e4 g6 d4 Bg7 Nc3 d6', // Modern
  'e4 Nf6 e5 Nd5 d4 d6', // Alekhine

  // --- 1.d4 d5 ---
  'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7', // QGD
  'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5', // QGD Exchange
  'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6', // QGA
  'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4', // Slav
  'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6', // Semi-Slav
  'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5', // London

  // --- 1.d4 Nf6 ---
  'd4 Nf6 c4 e6 Nc3 Bb4', // Nimzo-Indian
  'd4 Nf6 c4 e6 Nf3 b6', // Queen's Indian
  'd4 Nf6 c4 e6 Nf3 Bb4', // Bogo-Indian
  'd4 Nf6 c4 e6 g3 d5', // Catalan
  'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6', // King's Indian
  'd4 Nf6 c4 g6 Nc3 d5', // Grunfeld
  'd4 Nf6 c4 c5 d5 e6', // Benoni
  'd4 Nf6 Bf4 g6 e3 Bg7', // London vs Indian

  // --- 1.c4 / 1.Nf3 ---
  'c4 e5 Nc3 Nf6 Nf3 Nc6', // English
  'c4 c5 Nc3 Nc6 g3 g6', // Symmetrical English
  'c4 Nf6 Nc3 e6 Nf3 d5', // English
  'Nf3 d5 d4 Nf6 c4 e6', // Reti -> QGD
  'Nf3 Nf6 c4 g6 Nc3 Bg7', // Reti/KID setup
  'Nf3 d5 c4 d4', // Reti
];

// Every prefix of every line, so a game is "in book" for ply p whenever its
// first p+1 moves exactly begin one of the lines above. Built once at load.
const BOOK_PREFIXES: Set<string> = (() => {
  const set = new Set<string>();
  for (const line of BOOK_LINES) {
    const sans = line.split(' ');
    for (let i = 0; i < sans.length; i++) {
      set.add(sans.slice(0, i + 1).join(' '));
    }
  }
  return set;
})();

/** Longest book line length (in plies) - games past this are never in book. */
const MAX_BOOK_PLY = Math.max(...BOOK_LINES.map((l) => l.split(' ').length));

/**
 * True if the move at `ply` (0-indexed) is still following book, given the
 * full game's SAN notations in order. A move is book only if every move up to
 * and including it forms the start of a known line.
 */
export function isBookMove(sanNotations: string[], ply: number): boolean {
  if (ply >= MAX_BOOK_PLY) return false;
  // Strip check/mate markers so "d4" matches whether or not it gave check; the
  // book lines themselves are written without them.
  const key = sanNotations
    .slice(0, ply + 1)
    .map((s) => s.replace(/[+#]/g, ''))
    .join(' ');
  return BOOK_PREFIXES.has(key);
}
