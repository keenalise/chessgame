import type {
  Board,
  CastlingRights,
  GameState,
  MoveRecord,
  Piece,
  PieceColor,
  PieceKind,
  Pos,
  Square,
} from './chessTypes';
import { otherColor, pieceColor, pieceKind } from './chessTypes';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export function createInitialBoard(): Board {
  const board: Board = Array.from({ length: 8 }, () => Array<Square>(8).fill(null));
  const backRank: PieceKind[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

  for (let col = 0; col < 8; col++) {
    board[0][col] = `black_${backRank[col]}` as Piece;
    board[1][col] = 'black_pawn';
    board[6][col] = 'white_pawn';
    board[7][col] = `white_${backRank[col]}` as Piece;
  }
  return board;
}

export function createInitialState(): GameState {
  return {
    board: createInitialBoard(),
    turn: 'white',
    castling: {
      white: { kingside: true, queenside: true },
      black: { kingside: true, queenside: true },
    },
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
  };
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

function cloneCastling(rights: CastlingRights): CastlingRights {
  return {
    white: { ...rights.white },
    black: { ...rights.black },
  };
}

// ---------------------------------------------------------------------------
// Basic movement rules (pseudo-legal - does not check for leaving own king in check)
// ---------------------------------------------------------------------------

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function isPathClear(board: Board, from: Pos, to: Pos): boolean {
  const stepRow = from.row === to.row ? 0 : to.row > from.row ? 1 : -1;
  const stepCol = from.col === to.col ? 0 : to.col > from.col ? 1 : -1;

  let row = from.row + stepRow;
  let col = from.col + stepCol;
  while (row !== to.row || col !== to.col) {
    if (board[row][col] !== null) return false;
    row += stepRow;
    col += stepCol;
  }
  return true;
}

/**
 * Pseudo-legal move check: does this piece move according to its own
 * movement rules? Ignores whether it leaves the mover's own king in check
 * (that filtering happens in getLegalMoves / isMoveLegal below).
 */
export function isPseudoLegalMove(state: GameState, from: Pos, to: Pos): boolean {
  const piece = state.board[from.row][from.col];
  if (!piece) return false;
  if (from.row === to.row && from.col === to.col) return false;

  const destination = state.board[to.row][to.col];
  if (destination && pieceColor(destination) === state.turn) return false;

  const kind = pieceKind(piece);
  const color = pieceColor(piece);

  if (kind === 'king' && Math.abs(from.col - to.col) === 2 && from.row === to.row) {
    const side = to.col > from.col ? 'kingside' : 'queenside';
    return canCastle(state, color, side);
  }

  switch (kind) {
    case 'pawn': {
      const direction = color === 'white' ? -1 : 1;
      const startRow = color === 'white' ? 6 : 1;

      if (from.col === to.col && !destination) {
        if (to.row === from.row + direction) return true;
        if (from.row === startRow && to.row === from.row + 2 * direction) {
          return !state.board[from.row + direction][from.col];
        }
        return false;
      }
      if (Math.abs(from.col - to.col) === 1 && to.row === from.row + direction) {
        if (destination && pieceColor(destination) !== color) return true;
        if (
          state.enPassantTarget &&
          to.row === state.enPassantTarget.row &&
          to.col === state.enPassantTarget.col
        ) {
          return true;
        }
      }
      return false;
    }
    case 'king':
      return Math.abs(from.row - to.row) <= 1 && Math.abs(from.col - to.col) <= 1;
    case 'rook':
      return (from.row === to.row || from.col === to.col) && isPathClear(state.board, from, to);
    case 'knight': {
      const rowDiff = Math.abs(from.row - to.row);
      const colDiff = Math.abs(from.col - to.col);
      return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
    }
    case 'bishop':
      return Math.abs(from.row - to.row) === Math.abs(from.col - to.col) && isPathClear(state.board, from, to);
    case 'queen':
      return (
        (from.row === to.row || from.col === to.col || Math.abs(from.row - to.row) === Math.abs(from.col - to.col)) &&
        isPathClear(state.board, from, to)
      );
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Check / checkmate / stalemate detection
// ---------------------------------------------------------------------------

export function findKing(board: Board, color: PieceColor): Pos | null {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece === `${color}_king`) return { row, col };
    }
  }
  return null;
}

/** Is `color`'s king currently attacked, given this board? */
export function isInCheck(board: Board, color: PieceColor): boolean {
  const king = findKing(board, color);
  if (!king) return false;
  const attacker = otherColor(color);

  // Reuse pseudo-legal movement rules from the attacker's perspective by
  // building a throwaway state with the attacker to move.
  const probeState: GameState = {
    board,
    turn: attacker,
    castling: { white: { kingside: false, queenside: false }, black: { kingside: false, queenside: false } },
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
  };

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || pieceColor(piece) !== attacker) continue;
      if (isPseudoLegalMove(probeState, { row, col }, king)) return true;
    }
  }
  return false;
}

function wouldBeInCheckAfterMove(state: GameState, from: Pos, to: Pos): boolean {
  const board = cloneBoard(state.board);
  const piece = board[from.row][from.col];
  // Simulate en passant capture removal for accurate check testing.
  if (
    piece &&
    pieceKind(piece) === 'pawn' &&
    from.col !== to.col &&
    !board[to.row][to.col] &&
    state.enPassantTarget &&
    to.row === state.enPassantTarget.row &&
    to.col === state.enPassantTarget.col
  ) {
    const capturedRow = pieceColor(piece) === 'white' ? to.row + 1 : to.row - 1;
    board[capturedRow][to.col] = null;
  }
  board[to.row][to.col] = piece;
  board[from.row][from.col] = null;
  return isInCheck(board, state.turn);
}

/** Fully legal move: obeys piece movement rules AND does not leave own king in check. */
export function isMoveLegal(state: GameState, from: Pos, to: Pos): boolean {
  const piece = state.board[from.row][from.col];
  if (!piece || pieceColor(piece) !== state.turn) return false;
  if (!isPseudoLegalMove(state, from, to)) return false;
  return !wouldBeInCheckAfterMove(state, from, to);
}

export function getLegalDestinations(state: GameState, from: Pos): Pos[] {
  const piece = state.board[from.row][from.col];
  if (!piece || pieceColor(piece) !== state.turn) return [];
  const dests: Pos[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (isMoveLegal(state, from, { row, col })) dests.push({ row, col });
    }
  }
  return dests;
}

export function hasAnyLegalMove(state: GameState, color: PieceColor): boolean {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = state.board[row][col];
      if (!piece || pieceColor(piece) !== color) continue;
      if (getLegalDestinations({ ...state, turn: color }, { row, col }).length > 0) return true;
    }
  }
  return false;
}

export function isCheckmate(state: GameState, color: PieceColor): boolean {
  return isInCheck(state.board, color) && !hasAnyLegalMove(state, color);
}

export function isStalemate(state: GameState, color: PieceColor): boolean {
  return !isInCheck(state.board, color) && !hasAnyLegalMove(state, color);
}

export function isFiftyMoveRule(state: GameState): boolean {
  return state.halfmoveClock >= 100; // 100 half-moves = 50 full moves
}

// ---------------------------------------------------------------------------
// Castling
// ---------------------------------------------------------------------------

export function canCastle(state: GameState, color: PieceColor, side: 'kingside' | 'queenside'): boolean {
  if (!state.castling[color][side]) return false;

  const row = color === 'white' ? 7 : 0;
  const kingCol = 4;

  if (isInCheck(state.board, color)) return false;

  if (side === 'kingside') {
    if (state.board[row][5] || state.board[row][6]) return false;
    if (squareAttackedBy(state.board, { row, col: 5 }, otherColor(color))) return false;
    if (squareAttackedBy(state.board, { row, col: 6 }, otherColor(color))) return false;
  } else {
    if (state.board[row][1] || state.board[row][2] || state.board[row][3]) return false;
    if (squareAttackedBy(state.board, { row, col: 3 }, otherColor(color))) return false;
    if (squareAttackedBy(state.board, { row, col: 2 }, otherColor(color))) return false;
  }
  return state.board[row][kingCol] === `${color}_king`;
}

function squareAttackedBy(board: Board, square: Pos, byColor: PieceColor): boolean {
  const probeState: GameState = {
    board,
    turn: byColor,
    castling: { white: { kingside: false, queenside: false }, black: { kingside: false, queenside: false } },
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
  };
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || pieceColor(piece) !== byColor) continue;
      if (isPseudoLegalMove(probeState, { row, col }, square)) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Applying a move (produces a brand-new GameState - no mutation)
// ---------------------------------------------------------------------------

export interface ApplyMoveOptions {
  promotion?: PieceKind; // required when a pawn reaches the back rank
}

export interface ApplyMoveResult {
  state: GameState;
  move: MoveRecord;
}

/**
 * Applies a legal move and returns the resulting state plus a move record.
 * Throws if the move is not legal - callers should check isMoveLegal first
 * (the UI layer does this before ever calling applyMove).
 */
export function applyMove(state: GameState, from: Pos, to: Pos, options: ApplyMoveOptions = {}): ApplyMoveResult {
  if (!isMoveLegal(state, from, to)) {
    throw new Error(`Illegal move: ${JSON.stringify(from)} -> ${JSON.stringify(to)}`);
  }

  const board = cloneBoard(state.board);
  const piece = board[from.row][from.col] as Piece;
  const color = pieceColor(piece);
  const kind = pieceKind(piece);
  const destinationPiece = board[to.row][to.col];

  let isEnPassant = false;
  let capturedPiece: Square = destinationPiece;
  let isCapture = destinationPiece !== null;
  let isCastleSide: 'kingside' | 'queenside' | null = null;
  let promotion: PieceKind | null = null;

  // En passant capture
  if (
    kind === 'pawn' &&
    from.col !== to.col &&
    !destinationPiece &&
    state.enPassantTarget &&
    to.row === state.enPassantTarget.row &&
    to.col === state.enPassantTarget.col
  ) {
    isEnPassant = true;
    isCapture = true;
    const capturedRow = color === 'white' ? to.row + 1 : to.row - 1;
    capturedPiece = board[capturedRow][to.col];
    board[capturedRow][to.col] = null;
  }

  // Castling - move the rook too
  if (kind === 'king' && Math.abs(from.col - to.col) === 2) {
    isCastleSide = to.col > from.col ? 'kingside' : 'queenside';
    const row = from.row;
    if (isCastleSide === 'kingside') {
      board[row][5] = board[row][7];
      board[row][7] = null;
    } else {
      board[row][3] = board[row][0];
      board[row][0] = null;
    }
  }

  // Move the piece
  board[to.row][to.col] = piece;
  board[from.row][from.col] = null;

  // Promotion
  if (kind === 'pawn' && (to.row === 0 || to.row === 7)) {
    promotion = options.promotion ?? 'queen';
    board[to.row][to.col] = `${color}_${promotion}` as Piece;
  }

  // New en passant target: only set right after a two-square pawn push
  let enPassantTarget: Pos | null = null;
  if (kind === 'pawn' && Math.abs(to.row - from.row) === 2) {
    enPassantTarget = { row: (from.row + to.row) / 2, col: from.col };
  }

  // Castling rights updates
  const castling = cloneCastling(state.castling);
  if (kind === 'king') {
    castling[color].kingside = false;
    castling[color].queenside = false;
  }
  if (kind === 'rook') {
    if (color === 'white' && from.row === 7 && from.col === 0) castling.white.queenside = false;
    if (color === 'white' && from.row === 7 && from.col === 7) castling.white.kingside = false;
    if (color === 'black' && from.row === 0 && from.col === 0) castling.black.queenside = false;
    if (color === 'black' && from.row === 0 && from.col === 7) castling.black.kingside = false;
  }
  // A captured rook also loses castling rights for its side.
  if (capturedPiece && pieceKind(capturedPiece) === 'rook') {
    if (to.row === 7 && to.col === 0) castling.white.queenside = false;
    if (to.row === 7 && to.col === 7) castling.white.kingside = false;
    if (to.row === 0 && to.col === 0) castling.black.queenside = false;
    if (to.row === 0 && to.col === 7) castling.black.kingside = false;
  }

  const halfmoveClock = kind === 'pawn' || isCapture ? 0 : state.halfmoveClock + 1;
  const nextTurn = otherColor(color);
  const fullmoveNumber = color === 'black' ? state.fullmoveNumber + 1 : state.fullmoveNumber;

  const nextState: GameState = {
    board,
    turn: nextTurn,
    castling,
    enPassantTarget,
    halfmoveClock,
    fullmoveNumber,
  };

  const isCheck = isInCheck(nextState.board, nextTurn);
  const isMate = isCheck && isCheckmate(nextState, nextTurn);

  const move: MoveRecord = {
    piece,
    from,
    to,
    capturedPiece,
    isCapture,
    isCastle: isCastleSide,
    isEnPassant,
    promotion,
    notation: formatNotation(piece, from, to, isCapture, isCastleSide, promotion, isCheck, isMate),
    isCheck,
    isCheckmate: isMate,
  };

  return { state: nextState, move };
}

// ---------------------------------------------------------------------------
// Notation + FEN
// ---------------------------------------------------------------------------

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function squareName(pos: Pos): string {
  return `${FILES[pos.col]}${8 - pos.row}`;
}

function formatNotation(
  piece: Piece,
  from: Pos,
  to: Pos,
  isCapture: boolean,
  castle: 'kingside' | 'queenside' | null,
  promotion: PieceKind | null,
  isCheck: boolean,
  isCheckmate: boolean
): string {
  if (castle) {
    const base = castle === 'kingside' ? 'O-O' : 'O-O-O';
    return base + (isCheckmate ? '#' : isCheck ? '+' : '');
  }

  const kind = pieceKind(piece);
  const pieceLetter: Record<PieceKind, string> = {
    pawn: '',
    knight: 'N',
    bishop: 'B',
    rook: 'R',
    queen: 'Q',
    king: 'K',
  };

  let notation = '';
  if (kind === 'pawn') {
    if (isCapture) notation += `${FILES[from.col]}x`;
    notation += squareName(to);
    if (promotion && promotion !== 'queen') notation += `=${pieceLetter[promotion].toUpperCase() || 'Q'}`;
    else if (promotion) notation += `=Q`;
  } else {
    notation += pieceLetter[kind] + (isCapture ? 'x' : '') + squareName(to);
  }

  if (isCheckmate) notation += '#';
  else if (isCheck) notation += '+';

  return notation;
}

/** Convert a piece to its single FEN letter (uppercase = white, lowercase = black). */
function pieceToFENChar(piece: Piece): string {
  const letters: Record<PieceKind, string> = {
    pawn: 'p',
    rook: 'r',
    knight: 'n',
    bishop: 'b',
    queen: 'q',
    king: 'k',
  };
  const letter = letters[pieceKind(piece)];
  return pieceColor(piece) === 'white' ? letter.toUpperCase() : letter;
}

export function generateFEN(state: GameState): string {
  let fen = '';
  for (let row = 0; row < 8; row++) {
    let emptyCount = 0;
    for (let col = 0; col < 8; col++) {
      const piece = state.board[row][col];
      if (!piece) {
        emptyCount++;
        continue;
      }
      if (emptyCount > 0) {
        fen += emptyCount;
        emptyCount = 0;
      }
      fen += pieceToFENChar(piece);
    }
    if (emptyCount > 0) fen += emptyCount;
    if (row < 7) fen += '/';
  }

  fen += ` ${state.turn === 'white' ? 'w' : 'b'} `;

  let castlingStr = '';
  if (state.castling.white.kingside) castlingStr += 'K';
  if (state.castling.white.queenside) castlingStr += 'Q';
  if (state.castling.black.kingside) castlingStr += 'k';
  if (state.castling.black.queenside) castlingStr += 'q';
  fen += castlingStr || '-';

  fen += ' ';
  fen += state.enPassantTarget ? squareName(state.enPassantTarget) : '-';

  fen += ` ${state.halfmoveClock} ${state.fullmoveNumber}`;

  return fen;
}

const FEN_LETTER_TO_KIND: Record<string, PieceKind> = {
  p: 'pawn',
  r: 'rook',
  n: 'knight',
  b: 'bishop',
  q: 'queen',
  k: 'king',
};

/** Parses a FEN string into a GameState. Used for puzzle positions (Lichess daily/random puzzles). */
export function parseFEN(fen: string): GameState {
  const [boardPart, turnPart, castlingPart, epPart, halfmovePart, fullmovePart] = fen.trim().split(/\s+/);

  const board: Board = Array.from({ length: 8 }, () => Array<Square>(8).fill(null));
  const rows = boardPart.split('/');
  for (let row = 0; row < 8; row++) {
    let col = 0;
    for (const ch of rows[row]) {
      if (/\d/.test(ch)) {
        col += parseInt(ch, 10);
        continue;
      }
      const kind = FEN_LETTER_TO_KIND[ch.toLowerCase()];
      const color: PieceColor = ch === ch.toUpperCase() ? 'white' : 'black';
      board[row][col] = `${color}_${kind}` as Piece;
      col++;
    }
  }

  const castling: CastlingRights = {
    white: { kingside: castlingPart.includes('K'), queenside: castlingPart.includes('Q') },
    black: { kingside: castlingPart.includes('k'), queenside: castlingPart.includes('q') },
  };

  let enPassantTarget: Pos | null = null;
  if (epPart && epPart !== '-') {
    const col = FILES.indexOf(epPart[0]);
    const row = 8 - parseInt(epPart[1], 10);
    enPassantTarget = { row, col };
  }

  return {
    board,
    turn: turnPart === 'b' ? 'black' : 'white',
    castling,
    enPassantTarget,
    halfmoveClock: halfmovePart ? parseInt(halfmovePart, 10) : 0,
    fullmoveNumber: fullmovePart ? parseInt(fullmovePart, 10) : 1,
  };
}

const SAN_PIECE_LETTERS: Record<string, PieceKind> = {
  K: 'king',
  Q: 'queen',
  R: 'rook',
  B: 'bishop',
  N: 'knight',
};

/**
 * Resolves a SAN move string (e.g. "Nf3", "exd5", "O-O", "e8=Q+") against the
 * current position by finding the one legal move that matches piece kind,
 * destination square, and any disambiguation - rather than reimplementing a
 * second move engine just to replay puzzle PGNs.
 */
export function resolveSANMove(
  state: GameState,
  sanRaw: string
): { from: Pos; to: Pos; promotion?: PieceKind } | null {
  const san = sanRaw.replace(/[+#!?]+$/g, '');

  if (san === 'O-O' || san === 'O-O-O') {
    const row = state.turn === 'white' ? 7 : 0;
    const toCol = san === 'O-O' ? 6 : 2;
    return { from: { row, col: 4 }, to: { row, col: toCol } };
  }

  let promotion: PieceKind | undefined;
  let body = san;
  const promoMatch = body.match(/=([QRBN])$/);
  if (promoMatch) {
    promotion = SAN_PIECE_LETTERS[promoMatch[1]];
    body = body.slice(0, -promoMatch[0].length);
  }

  const isPieceMove = /^[KQRBN]/.test(body);
  const kind: PieceKind = isPieceMove ? SAN_PIECE_LETTERS[body[0]] : 'pawn';
  const rest = isPieceMove ? body.slice(1) : body;

  const destMatch = rest.match(/([a-h][1-8])$/);
  if (!destMatch) return null;
  const destSquare = destMatch[1];
  const toCol = FILES.indexOf(destSquare[0]);
  const toRow = 8 - parseInt(destSquare[1], 10);
  const to: Pos = { row: toRow, col: toCol };

  const disambiguator = rest.slice(0, rest.length - destSquare.length).replace('x', '');
  const fileHint = /[a-h]/.test(disambiguator) ? disambiguator.match(/[a-h]/)?.[0] : undefined;
  const rankHint = /[1-8]/.test(disambiguator) ? disambiguator.match(/[1-8]/)?.[0] : undefined;

  const candidates: Pos[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = state.board[row][col];
      if (!piece || pieceColor(piece) !== state.turn || pieceKind(piece) !== kind) continue;
      if (fileHint && FILES[col] !== fileHint) continue;
      if (rankHint && String(8 - row) !== rankHint) continue;
      if (isMoveLegal(state, { row, col }, to)) candidates.push({ row, col });
    }
  }

  if (candidates.length !== 1) return null;
  return { from: candidates[0], to, promotion };
}

/**
 * A position key for repetition detection: board + turn + castling rights +
 * en-passant target, deliberately excluding the halfmove/fullmove counters
 * (which always differ move-to-move and would defeat the whole point).
 */
export function positionKey(state: GameState): string {
  const boardKey = state.board.map((row) => row.map((sq) => sq ?? '.').join('')).join('/');
  const castling = state.castling;
  const castlingKey =
    (castling.white.kingside ? 'K' : '') +
    (castling.white.queenside ? 'Q' : '') +
    (castling.black.kingside ? 'k' : '') +
    (castling.black.queenside ? 'q' : '');
  const epKey = state.enPassantTarget ? `${state.enPassantTarget.row},${state.enPassantTarget.col}` : '-';
  return `${boardKey}|${state.turn}|${castlingKey || '-'}|${epKey}`;
}

/** UCI-style move string, e.g. "e2e4" or "e7e8q" for promotion. */
export function moveToUCI(move: MoveRecord): string {
  const promoLetter: Record<PieceKind, string> = {
    pawn: '',
    knight: 'n',
    bishop: 'b',
    rook: 'r',
    queen: 'q',
    king: '',
  };
  const promo = move.promotion ? promoLetter[move.promotion] : '';
  return `${squareName(move.from)}${squareName(move.to)}${promo}`;
}
