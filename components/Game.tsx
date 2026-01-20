'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { generateProblem, Problem } from '@/lib/game-engine';
import { MathFraction } from './MathFraction';
import { supabase } from '@/lib/supabase';

type Mode = 'easy' | 'normal' | 'hard';

export default function Game() {
    const [gameState, setGameState] = useState<'start' | 'playing' | 'result'>('start');
    const [mode, setMode] = useState<Mode>('normal');
    const [currentQuest, setCurrentQuest] = useState(1);
    const totalQuests = 10;
    const [timer, setTimer] = useState(0);
    const [problem, setProblem] = useState<Problem | null>(null);
    const [currentStep, setCurrentStep] = useState<'a' | 'p' | 'q'>('a');
    const [inputVal, setInputVal] = useState('');
    const [startTime, setStartTime] = useState(0);
    const [isWrong, setIsWrong] = useState(false);
    const [bestTimes, setBestTimes] = useState<Record<string, { time: number, name: string }>>({});
    const [topScores, setTopScores] = useState<any[]>([]);
    const [handleName, setHandleName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isNewRecord, setIsNewRecord] = useState(false);

    // Load best scores
    const loadRankings = async (targetMode: Mode) => {
        const { data, error } = await supabase
            .from('scores')
            .select('*')
            .eq('mode', targetMode)
            .order('time', { ascending: true })
            .limit(10);

        if (data) {
            setTopScores(data);
        }
    };

    useEffect(() => {
        if (gameState === 'start') {
            loadRankings(mode);
        }
    }, [gameState, mode]);

    const startNewGame = (selectedMode: Mode) => {
        setMode(selectedMode);
        setGameState('playing');
        setCurrentQuest(1);
        setTimer(0);
        setStartTime(Date.now());
        const firstProblem = generateProblem(selectedMode);
        setProblem(firstProblem);
        setCurrentStep(selectedMode === 'easy' ? 'p' : 'a');
        setInputVal('');
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (gameState === 'playing') {
            interval = setInterval(() => {
                setTimer((Date.now() - startTime) / 1000);
            }, 10);
        }
        return () => clearInterval(interval);
    }, [gameState, startTime]);

    const handleInput = (val: string) => {
        if (val === 'back') {
            setInputVal(prev => prev.slice(0, -1));
        } else if (inputVal.length < 8) {
            setInputVal(prev => prev + val);
        }
    };

    const normalize = (val: string) => {
        if (!val.includes('/')) return val;
        const [n, d] = val.split('/').map(Number);
        if (isNaN(n) || isNaN(d) || d === 0) return val;
        // Basic gcd reduction for matching
        const common = (a: number, b: number): number => b === 0 ? a : common(b, a % b);
        const g = Math.abs(common(n, d));
        const rn = n / g;
        const rd = d / g;
        return rd === 1 ? String(rn) : `${rn}/${rd}`;
    };

    const submitAnswer = useCallback(() => {
        if (!problem) return;
        const normInput = normalize(inputVal);
        const correct = problem[currentStep];

        if (normInput === correct) {
            if (currentStep === 'a') {
                setCurrentStep('p');
                setInputVal('');
            } else if (currentStep === 'p') {
                setCurrentStep('q');
                setInputVal('');
            } else {
                if (currentQuest >= totalQuests) {
                    finishGame();
                } else {
                    setCurrentQuest(prev => prev + 1);
                    setProblem(generateProblem(mode));
                    setCurrentStep(mode === 'easy' ? 'p' : 'a');
                    setInputVal('');
                }
            }
        } else {
            setIsWrong(true);
            setTimeout(() => setIsWrong(false), 400);
            if (navigator.vibrate) navigator.vibrate(50);
        }
    }, [problem, currentStep, inputVal, currentQuest, mode]);

    const finishGame = async () => {
        setGameState('result');
        const finalTime = timer;

        // Fetch current rankings to check if new record
        const { data } = await supabase
            .from('scores')
            .select('time')
            .eq('mode', mode)
            .order('time', { ascending: true })
            .limit(10);

        const isBetterThanTop10 = !data || data.length < 10 || finalTime < data[data.length - 1].time;
        setIsNewRecord(isBetterThanTop10);

        if (isBetterThanTop10) {
            confetti({
                particleCount: 200,
                spread: 100,
                origin: { y: 0.6 },
                colors: ['#6366f1', '#06b6d4', '#fb923c', '#ffffff']
            });
        }

        // Refresh top scores for the result screen
        loadRankings(mode);
    };

    const saveScore = async () => {
        setIsSaving(true);
        const { error } = await supabase.from('scores').insert([
            { mode, time: timer, handle_name: handleName || 'Anonymous' }
        ]);
        if (!error) {
            setGameState('start');
        }
        setIsSaving(false);
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameState !== 'playing') return;
            if (e.key >= '0' && e.key <= '9') handleInput(e.key);
            if (e.key === '-' || e.key === '/') handleInput(e.key);
            if (e.key === 'Backspace') handleInput('back');
            if (e.key === 'Enter') submitAnswer();
            if (e.key === 'Escape') setInputVal('');
            if (e.key === 'Tab') {
                e.preventDefault();
                const steps: ('a' | 'p' | 'q')[] = mode === 'easy' ? ['p', 'q'] : ['a', 'p', 'q'];
                const idx = steps.indexOf(currentStep);
                setCurrentStep(steps[(idx + 1) % steps.length]);
                setInputVal('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, currentStep, mode, submitAnswer]);

    return (
        <div className="max-w-4xl mx-auto w-full px-4 py-8 min-h-screen flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
                {gameState === 'start' && (
                    <motion.div
                        key="start"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="text-center space-y-8"
                    >
                        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 drop-shadow-sm">
                            QUADRATIC<br />SHOOTER
                        </h1>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {(['easy', 'normal', 'hard'] as Mode[]).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => startNewGame(m)}
                                    className="glass-card p-6 group hover:scale-105 transition-all duration-300 border-opacity-20 hover:border-opacity-100"
                                >
                                    <div className={`mode-badge mode-${m} mb-2`}>{m}</div>
                                    <div className="text-2xl font-bold uppercase tracking-widest">Start</div>
                                </button>
                            ))}
                        </div>

                        <div className="glass-card p-6 text-left max-w-xl mx-auto text-sm text-slate-400 leading-relaxed border-white/5">
                            <h3 className="text-indigo-400 font-bold mb-2">遊び方</h3>
                            <p className="mb-2">与えられた式 <code className="text-slate-200">y = ax² + bx + c</code> を、平方完成の形 <code className="text-slate-200">y = a(x + p)² + q</code> に変形してください。</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>空欄を選択して数値を入力（キーボード入力対応）</li>
                                <li>分数は「分子/分母」の形式で入力（例：1/2, -3/2）</li>
                                <li><strong>Enter</strong>で SHOOT!（解答送信）</li>
                                <li><strong>Tab</strong>で入力欄を移動（a → p → q）</li>
                            </ul>
                        </div>
                    </motion.div>
                )}

                {gameState === 'playing' && problem && (
                    <motion.div
                        key="playing"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full space-y-6"
                    >
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <span className={`mode-badge mode-${mode} mr-3`}>{mode}</span>
                                <span className="text-slate-400 font-bold">Quest {currentQuest}/10</span>
                            </div>
                            <div className="text-4xl font-mono font-black text-cyan-400 tabular-nums">
                                {timer.toFixed(2)}<span className="text-lg ml-1">s</span>
                            </div>
                        </div>

                        <div className={`glass-card p-8 md:p-12 text-center transition-all duration-200 ${isWrong ? 'border-red-500 shadow-[0_0_30px_rgba(244,63,94,0.3)]' : 'border-white/10'}`}>
                            <div className="text-3xl md:text-5xl font-black mb-10 flex items-center justify-center flex-wrap gap-x-2">
                                <span className="text-slate-500">y =</span>
                                {problem.displayA !== '1' && (
                                    <>
                                        {problem.displayA === '-1' ? '−' : <MathFraction value={problem.displayA} />}
                                    </>
                                )}
                                <span className="text-slate-500">x²</span>
                                {problem.b !== '0' && (
                                    <>
                                        <span className="text-slate-400 mx-1">{problem.b.startsWith('-') ? '−' : '+'}</span>
                                        {Math.abs(Number(problem.b.split('/')[0])) === 1 && !problem.b.includes('/') ? '' : <MathFraction value={problem.b.replace('-', '')} />}
                                        <span className="text-slate-500">x</span>
                                    </>
                                )}
                                {problem.c !== '0' && (
                                    <>
                                        <span className="text-slate-400 mx-1">{problem.c.startsWith('-') ? '−' : '+'}</span>
                                        <MathFraction value={problem.c.replace('-', '')} />
                                    </>
                                )}
                            </div>

                            <div className="flex items-center justify-center gap-2 md:gap-4 text-2xl md:text-4xl font-black">
                                <span className="text-slate-500">y =</span>
                                <div
                                    onClick={() => mode !== 'easy' && setCurrentStep('a')}
                                    className={`min-w-[70px] h-[90px] flex items-center justify-center rounded-2xl border-2 transition-all cursor-pointer ${currentStep === 'a' ? 'bg-indigo-500/20 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'border-slate-800 bg-slate-900/40 opacity-70'}`}
                                >
                                    <MathFraction value={currentStep === 'a' ? (inputVal || '?') : problem.a} />
                                </div>
                                <span className="text-slate-500">(x +</span>
                                <div
                                    onClick={() => setCurrentStep('p')}
                                    className={`min-w-[70px] h-[90px] flex items-center justify-center rounded-2xl border-2 transition-all cursor-pointer ${currentStep === 'p' ? 'bg-indigo-500/20 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'border-slate-800 bg-slate-900/40 opacity-70'}`}
                                >
                                    <MathFraction value={currentStep === 'p' ? (inputVal || '?') : (currentStep === 'a' ? '?' : problem.p)} />
                                </div>
                                <span className="text-slate-500">)² +</span>
                                <div
                                    onClick={() => setCurrentStep('q')}
                                    className={`min-w-[70px] h-[90px] flex items-center justify-center rounded-2xl border-2 transition-all cursor-pointer ${currentStep === 'q' ? 'bg-indigo-500/20 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'border-slate-800 bg-slate-900/40 opacity-70'}`}
                                >
                                    <MathFraction value={currentStep === 'q' ? (inputVal || '?') : (currentStep === 'a' || currentStep === 'p' ? '?' : problem.q)} />
                                </div>
                            </div>
                        </div>

                        {/* Touch Controls */}
                        <div className="grid grid-cols-4 gap-3">
                            {['7', '8', '9', 'back', '4', '5', '6', '/', '1', '2', '3', '-', 'Clear', '0', 'Enter'].map((key) => {
                                if (key === 'Enter') return (
                                    <button key={key} onClick={submitAnswer} className="col-span-2 btn-premium text-xl">SHOOT!</button>
                                );
                                if (key === 'Clear') return (
                                    <button key={key} onClick={() => setInputVal('')} className="glass-card text-sm font-bold opacity-60">ESC</button>
                                );
                                if (key === 'back') return (
                                    <button key={key} onClick={() => handleInput('back')} className="glass-card text-xl flex items-center justify-center">⌫</button>
                                );
                                return (
                                    <button key={key} onClick={() => handleInput(key)} className="glass-card h-16 text-xl font-bold hover:bg-white/5 active:scale-95 transition-all">{key}</button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {gameState === 'result' && (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-4xl mx-auto flex flex-col lg:flex-row gap-8 items-start justify-center"
                    >
                        <div className="glass-card p-10 space-y-4 w-full lg:w-1/2 text-center">
                            {isNewRecord && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="text-orange-400 font-black italic text-2xl mb-2 animate-bounce"
                                >
                                    NEW RECORD!!
                                </motion.div>
                            )}
                            <h2 className="text-indigo-400 font-black tracking-widest uppercase mb-2">Mission Complete</h2>
                            <div className="text-6xl font-mono font-black">{timer.toFixed(2)}s</div>

                            <div className="pt-6 space-y-4">
                                <input
                                    type="text"
                                    placeholder="ハンドルネーム（5文字以内）"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-center text-lg outline-none focus:border-indigo-500 transition-all font-bold"
                                    value={handleName}
                                    onChange={(e) => setHandleName(e.target.value.slice(0, 5))}
                                    maxLength={5}
                                />
                                <button
                                    onClick={saveScore}
                                    disabled={isSaving}
                                    className="w-full btn-premium py-4"
                                >
                                    {isSaving ? '送信中...' : '記録を保存してタイトルへ'}
                                </button>
                                <button
                                    onClick={() => setGameState('start')}
                                    className="w-full text-slate-500 font-bold hover:text-slate-300 transition-colors"
                                >
                                    保存せずに戻る
                                </button>
                            </div>
                        </div>

                        <div className="glass-card p-8 w-full lg:w-1/2">
                            <h3 className="text-xl font-bold mb-6 flex justify-between items-center">
                                <span>🏆 TOP RANKING - {mode.toUpperCase()}</span>
                            </h3>
                            <div className="space-y-3">
                                {topScores.map((s, i) => (
                                    <div key={i} className={`flex justify-between items-center p-3 rounded-xl border ${s.time === timer ? 'bg-indigo-500/10 border-indigo-500/50 shadow-lg' : 'bg-white/5 border-transparent'}`}>
                                        <div className="flex items-center gap-4">
                                            <span className={`w-6 text-sm font-black ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-slate-600'}`}>
                                                #{i + 1}
                                            </span>
                                            <span className="font-bold">{s.handle_name}</span>
                                        </div>
                                        <span className="font-mono font-black text-cyan-400 tabular-nums">{s.time.toFixed(2)}s</span>
                                    </div>
                                ))}
                                {topScores.length === 0 && <div className="text-slate-500 text-center py-4">No records yet. Be the first!</div>}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
