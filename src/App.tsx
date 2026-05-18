/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback, MouseEvent, TouchEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Bomb, Play, RotateCcw, Trophy, Timer } from 'lucide-react';
import { GameObject, GameObjectType, GameState } from './types.ts';
import { GAME_CONSTANTS } from './constants.ts';

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    multiplier: 1,
    multiplierTimeRemaining: 0,
    isGameOver: false,
    gameStarted: false,
    level: 1,
  });

  const [objects, setObjects] = useState<GameObject[]>([]);
  const [playerX, setPlayerX] = useState(0);
  const targetPlayerX = useRef(0);
  const lastTimeRef = useRef<number>(0);
  const requestRef = useRef<number>(null);
  const lastSpawnTime = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const spawnObject = useCallback((width: number, level: number) => {
    const levelConfig = GAME_CONSTANTS.LEVELS[level - 1];
    const rand = Math.random();
    
    let type = GameObjectType.STAR;
    if (rand < levelConfig.doubleChance) {
      type = GameObjectType.DOUBLE_BOMB;
    } else if (rand < levelConfig.doubleChance + levelConfig.penaltyChance) {
      type = GameObjectType.PENALTY_BOMB;
    }

    const newObject: GameObject = {
      id: Math.random().toString(36).substring(7),
      type,
      x: Math.random() * (width - GAME_CONSTANTS.ITEM_SIZE),
      y: -GAME_CONSTANTS.ITEM_SIZE,
      speed: (Math.random() * 2 + GAME_CONSTANTS.GRAVITY) * levelConfig.speedMult * 60, // Speed per second
      size: GAME_CONSTANTS.ITEM_SIZE,
    };
    setObjects((prev) => [...prev, newObject]);
  }, []);

  const startGame = () => {
    const startX = containerRef.current ? containerRef.current.clientWidth / 2 - GAME_CONSTANTS.PLAYER_SIZE / 2 : 0;
    setGameState({
      score: 0,
      multiplier: 1,
      multiplierTimeRemaining: 0,
      isGameOver: false,
      gameStarted: true,
      level: 1,
    });
    setObjects([]);
    setPlayerX(startX);
    targetPlayerX.current = startX;
    lastTimeRef.current = performance.now();
    lastSpawnTime.current = performance.now();
  };

  const update = useCallback((time: number) => {
    if (!gameState.gameStarted || gameState.isGameOver) return;

    if (!lastTimeRef.current) {
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    const dt = (time - lastTimeRef.current) / 1000; // Delta in seconds
    lastTimeRef.current = time;
    
    // Smoothly interpolate player position (Lerp)
    setPlayerX(prevX => {
      const lerpFactor = 0.25; // Lower = smoother/slower follow
      return prevX + (targetPlayerX.current - prevX) * lerpFactor;
    });

    // Spawn objects
    if (time - lastSpawnTime.current > GAME_CONSTANTS.SPAWN_INTERVAL) {
      if (containerRef.current) {
        spawnObject(containerRef.current.clientWidth, gameState.level);
      }
      lastSpawnTime.current = time;
    }

    // Update objects
    setObjects((prev) => {
      const updated = prev
        .map((obj) => ({ ...obj, y: obj.y + obj.speed * dt }))
        .filter((obj) => obj.y < (containerRef.current?.clientHeight || 0) + 100);

      const remaining: GameObject[] = [];
      let scoreChange = 0;
      let activatedDouble = false;

      const playerY = (containerRef.current?.clientHeight || 0) - GAME_CONSTANTS.PLAYER_SIZE - 20;

      for (const obj of updated) {
        const hitX = obj.x + obj.size / 2 > playerX && obj.x + obj.size / 2 < playerX + GAME_CONSTANTS.PLAYER_SIZE;
        const hitY = obj.y + obj.size / 2 > playerY && obj.y + obj.size / 2 < playerY + GAME_CONSTANTS.PLAYER_SIZE;

        if (hitX && hitY) {
          if (obj.type === GameObjectType.STAR) {
            scoreChange += 10 * gameState.multiplier;
          } else if (obj.type === GameObjectType.DOUBLE_BOMB) {
            activatedDouble = true;
          } else if (obj.type === GameObjectType.PENALTY_BOMB) {
            scoreChange -= 50;
          }
        } else {
          remaining.push(obj);
        }
      }

      if (scoreChange !== 0 || activatedDouble) {
        setGameState((gs) => {
          const newScore = Math.max(0, gs.score + scoreChange);
          let newLevel = gs.level;
          for (let i = GAME_CONSTANTS.LEVELS.length - 1; i >= 0; i--) {
            if (newScore >= GAME_CONSTANTS.LEVELS[i].minScore) {
              newLevel = i + 1;
              break;
            }
          }
          return {
            ...gs,
            score: newScore,
            level: newLevel,
            multiplier: activatedDouble ? 2 : gs.multiplier,
            multiplierTimeRemaining: activatedDouble ? GAME_CONSTANTS.MULTIPLIER_DURATION : gs.multiplierTimeRemaining,
          };
        });
      }

      return remaining;
    });

    // Update multiplier timer
    setGameState((gs) => {
      if (gs.multiplierTimeRemaining > 0) {
        const nextTime = Math.max(0, gs.multiplierTimeRemaining - dt);
        return {
          ...gs,
          multiplierTimeRemaining: nextTime,
          multiplier: nextTime > 0 ? 2 : 1,
        };
      }
      return gs;
    });

    requestRef.current = requestAnimationFrame(update);
  }, [gameState.gameStarted, gameState.isGameOver, gameState.multiplier, gameState.level, playerX, spawnObject]);

  useEffect(() => {
    if (gameState.gameStarted && !gameState.isGameOver) {
      lastTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(update);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState.gameStarted, gameState.isGameOver, update]);

  // Mouse move handler
  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    const target = containerRef.current;
    if (!target) return;
    
    const rect = target.getBoundingClientRect();
    let clientX = 0;
    if ('touches' in e) {
      clientX = (e as TouchEvent).touches[0].clientX;
    } else {
      clientX = (e as MouseEvent).clientX;
    }
    
    let x = clientX - rect.left - GAME_CONSTANTS.PLAYER_SIZE / 2;
    x = Math.max(0, Math.min(x, rect.width - GAME_CONSTANTS.PLAYER_SIZE));
    targetPlayerX.current = x;
  };

  return (
    <div 
      className="relative w-full h-screen overflow-hidden cursor-crosshair select-none"
      style={{ 
        backgroundColor: GAME_CONSTANTS.COLORS.BACKGROUND,
        fontFamily: "'Inter', sans-serif"
      }}
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
    >
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${GAME_CONSTANTS.COLORS.DOUBLE_BOMB}44 0%, transparent 60%)`,
            filter: 'blur(60px)'
          }}
        />
      </div>

      {/* Play Area - Now holding the Ref for precise alignment */}
      <div 
        ref={containerRef}
        className="relative w-full h-full max-w-2xl mx-auto border-x border-white/5 bg-white/[0.02]"
      >
        
        {/* Falling Objects */}
        {objects.map((obj) => (
          <motion.div
            key={obj.id}
            className="absolute flex items-center justify-center"
            style={{
              left: obj.x,
              top: obj.y,
              width: obj.size,
              height: obj.size,
            }}
          >
            {obj.type === GameObjectType.STAR ? (
              <Star className="text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" size={obj.size} />
            ) : obj.type === GameObjectType.DOUBLE_BOMB ? (
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
              >
                <Bomb className="text-orange-500 fill-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.8)]" size={obj.size} />
              </motion.div>
            ) : (
              <motion.div
                animate={{ rotate: [0, 90, 180, 270, 360] }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              >
                <Bomb className="text-red-500 fill-red-800 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" size={obj.size} />
              </motion.div>
            )}
          </motion.div>
        ))}

        {/* Player */}
        <div
          className="absolute bottom-10 flex items-center justify-center pointer-events-none"
          style={{
            left: playerX,
            width: GAME_CONSTANTS.PLAYER_SIZE,
            height: GAME_CONSTANTS.PLAYER_SIZE,
            transform: `rotate(${(targetPlayerX.current - playerX) * 0.4}deg)`, // Dynamic tilt
            transition: 'transform 0.1s ease-out'
          }}
        >
          <div className="relative group">
             {/* Glow Effect */}
            <AnimatePresence mode="wait">
              {gameState.multiplier > 1 && (
                <motion.div 
                  key="double-glow"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1.5 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 bg-orange-500/30 rounded-full blur-xl"
                />
              )}
            </AnimatePresence>
            
            <div className={`w-full h-full rounded-2xl border-4 flex items-center justify-center bg-white/10 backdrop-blur-sm transition-all duration-300 ${gameState.multiplier > 1 ? 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)]' : 'border-white/20'}`}>
              <div className="w-8 h-8 rounded-full border-4 border-white/30" />
            </div>
          </div>
        </div>

        {/* HUD */}
        <div className="absolute top-8 left-0 right-0 px-8 flex justify-between items-start pointer-events-none">
          <div className="flex gap-8">
            <div className="space-y-1">
              <div className="text-white/40 text-[10px] font-mono uppercase tracking-[0.2em]">Score</div>
              <div className="text-4xl font-black text-white tracking-tight">{gameState.score}</div>
            </div>
            <div className="space-y-1">
              <div className="text-white/40 text-[10px] font-mono uppercase tracking-[0.2em]">Level</div>
              <div className="text-4xl font-black text-white/90 tracking-tight">
                0{gameState.level}
                <span className="text-[10px] ml-2 font-mono text-white/30 block">
                  {GAME_CONSTANTS.LEVELS[gameState.level - 1].label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
             <AnimatePresence>
              {gameState.multiplier > 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 bg-orange-500 text-black px-4 py-2 rounded-full font-bold shadow-lg"
                >
                  <Timer size={18} className="animate-pulse" />
                  <span className="text-sm font-mono">{gameState.multiplierTimeRemaining.toFixed(1)}s</span>
                  <span className="bg-black/20 px-2 py-0.5 rounded text-xs">x2 ACTIVE</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {!gameState.gameStarted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <div className="text-center space-y-8 max-w-sm px-6">
              <motion.div
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="space-y-4"
              >
                <div className="flex justify-center gap-4 mb-4">
                  <div className="p-4 rounded-3xl bg-white/5 border border-white/10 relative">
                    <Star className="text-yellow-400" size={32} />
                    <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] font-bold px-1 rounded">+10</span>
                  </div>
                  <div className="p-4 rounded-3xl bg-white/5 border border-white/10 relative">
                    <Bomb className="text-orange-500" size={32} />
                    <span className="absolute -top-2 -right-2 bg-orange-500 text-black text-[10px] font-bold px-1 rounded">x2</span>
                  </div>
                  <div className="p-4 rounded-3xl bg-white/5 border border-white/10 relative">
                    <Bomb className="text-red-500" size={32} />
                    <span className="absolute -top-2 -right-2 bg-red-500 text-black text-[10px] font-bold px-1 rounded">-50</span>
                  </div>
                </div>
                <h1 className="text-5xl font-extrabold text-white tracking-tighter italic">NEON<br/><span className="text-orange-500 font-black not-italic">COLLECTOR</span></h1>
                <p className="text-white/50 text-xs leading-relaxed uppercase tracking-widest">
                  Catch stars. Avoid Red Bombs. <br/>
                  Find Orange Bombs for Multiplier. <br/>
                  Reach Score targets to Level Up.
                </p>
              </motion.div>
              
              <button
                onClick={startGame}
                className="group relative w-full py-4 bg-white text-black font-bold rounded-2xl overflow-hidden active:scale-95 transition-transform"
              >
                <div className="absolute inset-0 bg-orange-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Play size={20} fill="currentColor" />
                  INITIATE SYSTEM
                </span>
              </button>
            </div>
          </motion.div>
        )}

        {gameState.isGameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
          >
             <div className="text-center space-y-8">
              <div className="space-y-2">
                <Trophy size={64} className="mx-auto text-yellow-500 mb-4" />
                <h2 className="text-white/60 uppercase tracking-widest text-xs font-bold">Mission Complete</h2>
                <div className="text-7xl font-black text-white">{gameState.score}</div>
              </div>
              
              <button
                onClick={startGame}
                className="flex items-center gap-2 mx-auto px-8 py-4 bg-orange-500 text-black font-bold rounded-2xl hover:bg-orange-400 transition-colors active:scale-95 transition-transform"
              >
                <RotateCcw size={20} />
                RETRY
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative Blur */}
      <div className="fixed bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </div>
  );
}
