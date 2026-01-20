'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

export default function AdminPage() {
    const [scores, setScores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchScores() {
            const { data, error } = await supabase
                .from('scores')
                .select('*')
                .order('created_at', { ascending: false });

            if (data) setScores(data);
            setLoading(false);
        }
        fetchScores();
    }, []);

    const deleteScore = async (id: number) => {
        if (!confirm('本当に削除しますか？')) return;
        const { error } = await supabase.from('scores').delete().eq('id', id);
        if (!error) {
            setScores(prev => prev.filter(s => s.id !== id));
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                ADMIN DASHBOARD
            </h1>

            <div className="glass-card overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase">Timestamp</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase">Mode</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase">Time</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase">Handle Name</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scores.map((score) => (
                            <tr key={score.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="p-4 font-mono text-sm text-slate-300">
                                    {new Date(score.created_at).toLocaleString()}
                                </td>
                                <td className="p-4">
                                    <span className={`mode-badge mode-${score.mode}`}>{score.mode}</span>
                                </td>
                                <td className="p-4 font-black">{score.time.toFixed(2)}s</td>
                                <td className="p-4 font-bold text-cyan-400">{score.handle_name}</td>
                                <td className="p-4 text-right">
                                    <button
                                        onClick={() => deleteScore(score.id)}
                                        className="text-rose-500 hover:text-rose-400 font-bold text-sm"
                                    >
                                        DELETE
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loading && <div className="p-10 text-center text-slate-500">Loading records...</div>}
                {!loading && scores.length === 0 && <div className="p-10 text-center text-slate-500">No records found.</div>}
            </div>
        </div>
    );
}
