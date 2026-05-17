/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import { motion, AnimatePresence } from 'motion/react';
import { PIECE_SYMBOLS, GameState, AIResponse } from './types.ts';
import { cn } from './lib/utils.ts';
import { Terminal, RotateCcw, ChevronRight, Activity, Cpu } from 'lucide-react';

export default function App() {
  const [game, setGame] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [aiCommentary, setAiCommentary] = useState<string>("MONO INITIALIZED. Awaiting move.");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const gameState: GameState = useMemo(() => ({
    fen: game.fen(),
    turn: game.turn(),
    isCheck: game.inCheck(),
    isGameOver: game.isGameOver(),
    winner: game.isCheckmate() ? (game.turn() === 'w' ? 'b' : 'w') : (game.isDraw() ? 'draw' : null),
    history: game.history()
  }), [game]);

  const addToLog = (msg: string) => {
    setLog(prev => [msg, ...prev].slice(0, 10));
  };

  const makeMove = useCallback((move: string | { from: string; to: string; promotion?: string }) => {
    try {
      const result = game.move(move);
      if (result) {
        setGame(new Chess(game.fen()));
        addToLog(`${result.color === 'w' ? 'WHITE' : 'BLACK'} : ${result.san}`);
        setSelectedSquare(null);
        return true;
      }
    } catch (e) {
      console.warn("Invalid move attempted");
    }
    return false;
  }, [game]);

  const handleAiTurn = useCallback(async () => {
    if (gameState.isGameOver || gameState.turn === 'w') return;

    setIsAiThinking(true);
    try {
      const response = await fetch('/api/chess/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fen: game.fen(),
          history: game.history()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI failed to respond");
      }

      setAiCommentary(data.commentary.toUpperCase());
      
      // Delay slightly for dramatic effect
      setTimeout(() => {
        makeMove(data.move);
        setIsAiThinking(false);
      }, 600);

    } catch (error: any) {
      console.error(error);
      setIsAiThinking(false);
      setAiCommentary(`ERROR: ${error.message}`);
      // Fallback to random move if AI fails
      const moves = game.moves();
      if (moves.length > 0) {
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        makeMove(randomMove);
      }
    }
  }, [game, gameState.isGameOver, gameState.turn, makeMove]);

  useEffect(() => {
    if (gameState.turn === 'b' && !gameState.isGameOver) {
      handleAiTurn();
    }
  }, [gameState.turn, gameState.isGameOver, handleAiTurn]);

  const onSquareClick = (square: Square) => {
    if (gameState.isGameOver || isAiThinking) return;

    const piece = game.get(square);

    // Initial Selection
    if (!selectedSquare) {
      if (piece && piece.color === 'w') {
        setSelectedSquare(square);
      }
      return;
    }

    // Changing selection
    if (piece && piece.color === 'w') {
      setSelectedSquare(square);
      return;
    }

    // Attempting Move
    const moveSuccessful = makeMove({
      from: selectedSquare,
      to: square,
      promotion: 'q' // Simplification for now
    });

    if (!moveSuccessful) {
      setSelectedSquare(null);
    }
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setSelectedSquare(null);
    setAiCommentary("SYSTEM RESET. Awaiting move.");
    setLog([]);
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center p-4 md:p-10 font-sans">
      {/* Header */}
      <header className="relative w-full max-w-5xl flex justify-between items-end mb-10 border-b border-border pb-4">
        <div>
          <h1 className="font-serif text-4xl tracking-widest uppercase font-light">
            Mono <span className="italic opacity-50 font-serif lowercase text-2xl relative -top-1 px-1">//</span> Chess
          </h1>
          <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-accent mt-1">
            Grandmaster AI Analysis Series
          </p>
        </div>
        <div className="text-right flex flex-col">
          <div className="font-sans text-[10px] uppercase tracking-widest opacity-40 mb-1">
            Session ID
          </div>
          <div className="font-serif text-lg tracking-tighter opacity-80 uppercase">
            #MONO-{new Date().getFullYear()}-{game.history().length}
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-col lg:flex-row gap-12 w-full max-w-5xl items-start">
        {/* Chessboard Section */}
        <div className="flex flex-col items-center relative group">
          <div className="relative p-[12px] bg-surface border border-border shadow-2xl">
            {/* Coordinates */}
            <div className="absolute -left-7 top-0 bottom-0 flex flex-col justify-around text-[10px] font-sans opacity-30 select-none py-10">
              {[8, 7, 6, 5, 4, 3, 2, 1].map(n => <span key={n}>{n}</span>)}
            </div>
            <div className="absolute left-0 right-0 -bottom-8 flex justify-around text-[10px] font-sans opacity-30 select-none px-10">
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(l => <span key={l}>{l}</span>)}
            </div>

            <div className="chess-grid w-full aspect-square w-[320px] sm:w-[500px] lg:w-[600px] border border-border">
              {Array.from({ length: 64 }).map((_, i) => {
                const row = Math.floor(i / 8);
                const col = i % 8;
                const square = `${String.fromCharCode(97 + col)}${8 - row}` as Square;
                const isSelected = selectedSquare === square;
                const piece = game.get(square);
                
                return (
                  <div
                    key={square}
                    onClick={() => onSquareClick(square)}
                    className={cn(
                      "square",
                      (row + col) % 2 === 0 ? "square-white" : "square-black",
                      isSelected && "box-shadow-inset ring-inset shadow-[inset_0_0_0_4px_#C4A484]"
                    )}
                  >
                    <AnimatePresence mode="popLayout">
                      {piece && (
                        <motion.div
                          key={`${piece.type}-${piece.color}-${square}`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                          className={cn(
                            "text-4xl sm:text-6xl select-none flex items-center justify-center w-full h-full p-2",
                            piece.color === 'w' ? "text-[#121212]" : "text-[#E2E2E2]"
                          )}
                        >
                          {PIECE_SYMBOLS[piece.color === 'w' ? piece.type.toUpperCase() : piece.type]}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Section */}
        <aside className="flex flex-col flex-1 w-full gap-8">
          {/* Status Panel */}
          <div className="bg-surface p-6 rounded-sm border border-border shadow-xl">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-accent flex items-center justify-center font-serif italic text-xl">M</div>
                <div>
                  <div className="font-sans text-[12px] font-bold tracking-wide uppercase">Mono (Gemini)</div>
                  <div className="font-sans text-[10px] opacity-40 uppercase tracking-widest italic">{isAiThinking ? 'Evaluating...' : 'Waiting'}</div>
                </div>
              </div>
              <div className={cn("font-serif text-3xl font-light tracking-widest", gameState.turn === 'b' ? "text-accent animate-pulse" : "opacity-40")}>
                {gameState.turn === 'b' ? 'ACTIVE' : '00:00'}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E2E2E2] text-bg flex items-center justify-center font-serif italic text-xl font-bold">U</div>
                <div>
                  <div className="font-sans text-[12px] font-bold tracking-wide uppercase">Player</div>
                  <div className="font-sans text-[10px] opacity-40 uppercase tracking-widest">White</div>
                </div>
              </div>
              <div className={cn("font-serif text-3xl font-light tracking-widest", gameState.turn === 'w' ? "text-accent animate-pulse" : "opacity-40")}>
                {gameState.turn === 'w' ? 'ACTIVE' : '00:00'}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Commentary Area */}
            <div className="border-l border-accent pl-4 py-1 italic opacity-80 min-h-[3rem]">
              <p className="font-serif text-lg leading-tight font-light tracking-wide text-ink">
                {isAiThinking ? "The engine evaluates standard lines..." : `${aiCommentary}`}
              </p>
            </div>

            {/* Move History Grid */}
            <div className="move-log-container flex-1 pl-4 border-l border-border min-h-[200px]">
              <h3 className="font-sans text-[10px] uppercase tracking-[0.2em] mb-4 opacity-40">Move History</h3>
              <div className="grid grid-cols-3 gap-y-2 font-sans text-sm">
                {game.history({ verbose: true }).reduce((acc: any[], move, i) => {
                  if (i % 2 === 0) {
                    acc.push([`${Math.floor(i / 2) + 1}.`, move.san]);
                  } else {
                    acc[acc.length - 1].push(move.san);
                  }
                  return acc;
                }, []).map((row, i) => (
                  <React.Fragment key={i}>
                    <div className="opacity-20">{row[0].padStart(2, '0')}</div>
                    <div className="font-medium tracking-tight">{row[1]}</div>
                    <div className="font-medium opacity-60 tracking-tight">{row[2] || ''}</div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-auto flex gap-2 pt-4">
            <button
              onClick={resetGame}
              className="flex-1 py-3 border border-border font-sans text-[10px] uppercase tracking-widest hover:bg-ink hover:text-bg transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Simulation
            </button>
            <button
               className="flex-1 py-3 border border-border/40 font-sans text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
            >
              Export PGN
            </button>
          </div>
        </aside>
      </main>

      <footer className="mt-auto pt-12 flex justify-between w-full max-w-5xl items-center text-[9px] font-sans uppercase tracking-[0.3em] opacity-30">
        <div>Engine: Mono v2 // Deep Analysis Core</div>
        <div>Latency: Optimal // Connection Secured</div>
      </footer>
    </div>
  );
}
