export type PieceColor = 'white' | 'black';
export type PieceKind = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
export type Piece = `${PieceColor}_${PieceKind}`;
export type Square = Piece | null;
/** 8x8 board. board[0] is rank 8 (Black's back rank), board[7] is rank 1. */
export type Board = Square[][];

export interface Pos {
  row: number;
  col: number;
}

export interface CastlingRights {
  white: { kingside: boolean; queenside: boolean };
  black: { kingside: boolean; queenside: boolean };
}

export interface GameState {
  board: Board;
  turn: PieceColor;
  castling: CastlingRights;
  enPassantTarget: Pos | null;
  halfmoveClock: number;
  fullmoveNumber: number;
}

export interface MoveRecord {
  piece: Piece;
  from: Pos;
  to: Pos;
  capturedPiece: Square;
  isCapture: boolean;
  isCastle: 'kingside' | 'queenside' | null;
  isEnPassant: boolean;
  promotion: PieceKind | null;
  notation: string;
  isCheck: boolean;
  isCheckmate: boolean;
}

/** A GameState plus the move that produced it, and the previous state (for undo). */
export interface HistoryEntry {
  state: GameState;
  move: MoveRecord | null; // null for the initial position
}

export function otherColor(color: PieceColor): PieceColor {
  return color === 'white' ? 'black' : 'white';
}

export function pieceColor(piece: Piece): PieceColor {
  return piece.startsWith('white') ? 'white' : 'black';
}

export function pieceKind(piece: Piece): PieceKind {
  return piece.split('_')[1] as PieceKind;
}

export const PIECE_SYMBOLS: Record<Piece, string> = {
  white_pawn: '♙',
  white_rook: '♖',
  white_knight: '♘',
  white_bishop: '♗',
  white_queen: '♕',
  white_king: '♔',
  black_pawn: '♟',
  black_rook: '♜',
  black_knight: '♞',
  black_bishop: '♝',
  black_queen: '♛',
  black_king: '♚',
};

// Lichess open-source piece image set - no API key required.
const PIECE_SET = 'merida';
const PIECE_BASE_URL = `https://lichess1.org/assets/piece/${PIECE_SET}`;
const PIECE_FILE: Record<Piece, string> = {
  white_king: 'wK',
  white_queen: 'wQ',
  white_rook: 'wR',
  white_bishop: 'wB',
  white_knight: 'wN',
  white_pawn: 'wP',
  black_king: 'bK',
  black_queen: 'bQ',
  black_rook: 'bR',
  black_bishop: 'bB',
  black_knight: 'bN',
  black_pawn: 'bP',
};

export function pieceImageUrl(piece: Piece): string {
  return `${PIECE_BASE_URL}/${PIECE_FILE[piece]}.svg`;
}
