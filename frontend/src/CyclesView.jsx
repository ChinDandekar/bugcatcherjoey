import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Box, ShieldAlert, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sfx } from './SoundEngine';

export default function CyclesView() {
    const navigate = useNavigate();
    const location = useLocation();
    const cycles = location.state?.cycles || [];
    const finalTeam = location.state?.finalTeam;
    const [selectedCycle, setSelectedCycle] = useState(null);

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                <button
                    onClick={() => navigate('/results', { state: { cycles, finalTeam } })}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}
                >
                    <ArrowLeft size={24} /> BACK TO RESULTS
                </button>
                <h2 className="text-gradient" style={{ fontSize: '2rem', margin: 0 }}>DETAILED CYCLE LOG</h2>
            </div>

            {cycles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                    <h3>NO SIMULATION DATA FOUND</h3>
                    <p>Please run a simulation from the Home menu to view cycles.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {cycles.map((cycle, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.01, boxShadow: '0 0 20px rgba(129, 140, 248, 0.2)' }}
                            onClick={() => {
                                sfx.playClick();
                                setSelectedCycle(cycle);
                            }}
                            className="glass-panel"
                            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', cursor: 'pointer' }}
                        >
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ color: 'var(--primary)', fontSize: '1.8rem', margin: 0 }}>CYCLE 0{cycle.num}</h3>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Coverage: {cycle.coverage}% / {cycle.goal}%</span>
                                    {cycle.changes && cycle.changes.length > 0 && (
                                        <div style={{ background: cycle.changes[0].replace_with ? 'rgba(248, 113, 113, 0.2)' : 'rgba(129, 140, 248, 0.2)', color: cycle.changes[0].replace_with ? 'var(--danger)' : 'var(--primary)', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                                            {cycle.changes[0].replace_with ? 'REPLACEMENT' : 'MODIFICATION'}
                                        </div>
                                    )}
                                </div>

                                {/* AI Log Area */}
                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', borderLeft: `4px solid ${cycle.changes && cycle.changes.some(c => c.replace_with) ? 'var(--danger)' : 'var(--primary)'}`, width: '60%' }}>
                                    <p style={{ color: '#e2e8f0', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '1rem' }}>
                                        " {cycle.log.replace('🧠 AI LOGIC: ', '')} "
                                    </p>
                                    {cycle.changes && cycle.changes.length > 0 && (
                                        <div style={{ color: 'var(--success)', fontSize: '0.95rem', fontWeight: 'bold' }}>
                                            ↳ ACTION: {cycle.changes[0].replace_with ? `Replaced ${cycle.changes[0].name} with ${cycle.changes[0].replace_with}` : `Adjusted ${cycle.changes[0].name}`}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Modal Overlay */}
            {createPortal(
                <AnimatePresence>
                    {selectedCycle && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--overlay-bg)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
                            onClick={() => setSelectedCycle(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className="glass-panel"
                                style={{ width: '100%', maxWidth: '1000px', maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                                    <h3 style={{ color: 'var(--primary)', fontSize: '1.8rem', margin: 0 }}>CYCLE 0{selectedCycle.num} BATTLE REPORTS</h3>
                                    <button onClick={() => { sfx.playClick(); setSelectedCycle(null); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                        <X size={28} />
                                    </button>
                                </div>

                                {selectedCycle.battles && selectedCycle.battles.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                                        {selectedCycle.battles.map((battle, bIdx) => (
                                            <div key={bIdx} style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--glass-border)', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                                                    <img src={`https://play.pokemonshowdown.com/sprites/ani/${battle.attacker.toLowerCase().replace(/[^a-z0-9]/g, '')}.gif`} alt={battle.attacker} style={{ maxHeight: '60px' }} onError={(e) => { e.target.src = 'https://play.pokemonshowdown.com/sprites/ani/substitute.gif'; }} />
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{battle.attacker}</div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Attacker</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 1rem' }}>
                                                    <ShieldAlert size={20} color={battle.result.includes('OHKO') ? 'var(--success)' : 'var(--danger)'} style={{ marginBottom: '0.5rem' }} />
                                                    <span style={{ fontSize: '0.75rem', color: battle.result.includes('OHKO') ? 'var(--success)' : 'var(--warning)', fontWeight: 'bold', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                                        {battle.result.substring(0, 20)}{battle.result.length > 20 ? '...' : ''}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{battle.defender}</div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target</div>
                                                    </div>
                                                    <img src={`https://play.pokemonshowdown.com/sprites/ani/${battle.defender.toLowerCase().replace(/[^a-z0-9]/g, '')}.gif`} alt={battle.defender} style={{ maxHeight: '60px' }} onError={(e) => { e.target.src = 'https://play.pokemonshowdown.com/sprites/ani/substitute.gif'; }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No battle data available for this cycle.</p>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

        </div>
    );
}
