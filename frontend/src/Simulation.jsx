import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Zap, Box, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sfx } from './SoundEngine';

export default function Simulation({ initialTeam }) {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [simulationData, setSimulationData] = useState({ cycles: [] });
    const scrollRef = useRef(null);

    useEffect(() => {
        if (!initialTeam) {
            navigate('/');
            return;
        }

        const runSimulation = async () => {
            try {
                const response = await fetch('https://bugcatcherjoey1996--pokemon-ai-optimizer-fastapi-app-dev.modal.run/simulate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ team: initialTeam })
                });

                if (!response.body) throw new Error("ReadableStream not supported.");

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';
                let accumulatedCycles = [];

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.substring(6));
                                if (data.status === 'COMPLETE') {
                                    sfx.stopBattleMusic();
                                    navigate('/results', { state: { finalTeam: data.finalTeam, cycles: accumulatedCycles } });
                                } else {
                                    accumulatedCycles.push(data);
                                    setSimulationData({ cycles: [...accumulatedCycles] });
                                    setCurrentStep(accumulatedCycles.length);
                                }
                            } catch (e) {
                                console.error("Parse error:", e);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Stream Error:", err);
            }
        };

        runSimulation();
    }, [initialTeam, navigate]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [currentStep]);

    const cycle = currentStep > 0 ? simulationData.cycles[currentStep - 1] : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '80vh', gap: '2rem' }}>

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <h2 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                    OPTIMIZATION IN PROGRESS
                </h2>
                {!cycle ? (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', color: 'var(--text-muted)' }}>
                        <span style={{ fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>CONTACTING METAGAME BRAIN...</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', color: 'var(--text-muted)' }}>
                        <span style={{ fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>
                            CYCLE {cycle.num}/10
                        </span>
                        <span style={{ fontSize: '1.2rem', fontFamily: 'var(--font-heading)', color: 'var(--success)' }}>
                            COVERAGE: {cycle.coverage}% / {cycle.goal}%
                        </span>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '2rem', flex: 1, overflow: 'hidden' }}>

                {/* Battle Visualizer Panel */}
                <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    <h3 style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', color: 'var(--text-muted)' }}>
                        <Zap size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem', color: 'var(--warning)' }} />
                        LIVE CALCULATIONS
                    </h3>

                    {cycle && cycle.battles && cycle.battles.length > 0 && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.2 }}
                                transition={{ duration: 0.4 }}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', width: '100%' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', width: '100%', minHeight: '180px' }}>
                                    <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ height: '100px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '1rem' }}>
                                            <img
                                                src={`https://play.pokemonshowdown.com/sprites/ani/${cycle.battles[0].attacker.toLowerCase().replace(/[^a-z0-9]/g, '')}.gif`}
                                                alt={cycle.battles[0].attacker}
                                                style={{ maxHeight: '100px', filter: 'drop-shadow(0 0 10px rgba(129, 140, 248, 0.4))', transform: 'scaleX(-1)' }}
                                                onError={(e) => { e.target.src = 'https://play.pokemonshowdown.com/sprites/ani/substitute.gif'; }}
                                            />
                                        </div>
                                        <h4 style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>{cycle.battles[0].attacker}</h4>
                                    </div>

                                    <motion.div
                                        animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                                        transition={{ rotate: { repeat: Infinity, duration: 4, ease: "linear" }, scale: { repeat: Infinity, duration: 1 } }}
                                        style={{ color: 'var(--warning)', marginTop: '-2rem' }}
                                    >
                                        <ShieldAlert size={48} />
                                    </motion.div>

                                    <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ height: '100px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '1rem' }}>
                                            <img
                                                src={`https://play.pokemonshowdown.com/sprites/ani/${cycle.battles[0].defender.toLowerCase().replace(/[^a-z0-9]/g, '')}.gif`}
                                                alt={cycle.battles[0].defender}
                                                style={{ maxHeight: '100px', filter: 'drop-shadow(0 0 10px rgba(248, 113, 113, 0.4))' }}
                                                onError={(e) => { e.target.src = 'https://play.pokemonshowdown.com/sprites/ani/substitute.gif'; }}
                                            />
                                        </div>
                                        <h4 style={{ fontSize: '1.5rem', color: 'var(--danger)' }}>{cycle.battles[0].defender}</h4>
                                    </div>
                                </div>

                                <div style={{ background: 'var(--glass-bg)', padding: '1rem 2rem', borderRadius: '30px', border: '1px solid var(--glass-border)' }}>
                                    <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', letterSpacing: '1px', color: 'var(--text-main)' }}>
                                        RESULT: <span style={{ color: cycle.battles[0].result.includes('OHKO') ? 'var(--success)' : 'var(--warning)' }}>{cycle.battles[0].result}</span>
                                    </p>
                                </div>

                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>

                {/* AI Brain Log Panel */}
                <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BrainCircuit size={20} /> AI STRATEGIST LOG
                    </h3>

                    <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '1rem' }}>
                        {simulationData.cycles.map((hist, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                style={{ background: 'var(--glass-bg)', padding: '1rem', borderRadius: '12px', borderLeft: `3px solid ${hist.changes.some(c => c.replace_with) ? 'var(--danger)' : 'var(--primary)'}` }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CYCLE {hist.num}</span>
                                    <span style={{ fontSize: '0.8rem', color: hist.changes.some(c => c.replace_with) ? 'var(--danger)' : 'var(--primary)', fontWeight: 'bold' }}>STRATEGY CHANGE</span>
                                </div>
                                <p style={{ fontSize: '0.95rem', lineHeight: '1.5', color: 'var(--text-main)', marginBottom: '0.5rem' }}>{hist.log.replace('🧠 AI LOGIC: ', '')}</p>

                                {hist.changes.map((c, i) => (
                                    <div key={i} style={{ background: 'rgba(52, 211, 153, 0.1)', color: 'var(--success)', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.9rem', display: 'inline-block', marginBottom: '0.2rem' }}>
                                        {c.replace_with ? `Replaced ${c.name} with ${c.replace_with}` : `Adjusted ${c.name}`}
                                    </div>
                                ))}
                            </motion.div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
