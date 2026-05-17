import { Chess, Square } from 'chess.js';

export interface GameState {
  fen: string;
  turn: 'w' | 'b';
  isCheck: boolean;
  isGameOver: boolean;
  winner: 'w' | 'b' | 'draw' | null;
  history: string[];
}

export interface AIResponse {
  move: string;
  commentary: string;
}

export const PIECE_SYMBOLS: Record<string, string> = {
  'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
  'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
};

export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
