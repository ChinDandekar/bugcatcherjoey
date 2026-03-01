import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Trophy, RefreshCcw, ArrowRight, ClipboardCopy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { sfx } from './SoundEngine';

export default function Results({ initialTeam }) {
    const navigate = useNavigate();
    const location = useLocation();

    const finalTeam = location.state?.finalTeam;
    const cycles = location.state?.cycles || [];
    const lastCycle = cycles.length > 0 ? cycles[cycles.length - 1] : { num: 10, coverage: 100 };
    const [copied, setCopied] = React.useState(false);

    if (!initialTeam || !finalTeam) {
        navigate('/');
        return null;
    }

    const handleRestart = () => {
        sfx.playHover();
        navigate('/');
    };

    const handleViewCycles = () => {
        sfx.playClick();
        navigate('/cycles', { state: { cycles, finalTeam } });
    };

    const exportToPokepaste = () => {
        let paste = "";
        finalTeam.forEach(p => {
            if (!p.name || p.name === '-' || p.name === '[EMPTY_SLOT]') return;

            let block = `${p.name}`;
            if (p.item && p.item !== 'None') block += ` @ ${p.item}`;
            block += '\n';

            if (p.new_ability) block += `Ability: ${p.new_ability}\n`;

            if (p.new_evs && Object.keys(p.new_evs).length > 0) {
                const evParts = [];
                // standard showdown order: HP / Atk / Def / SpA / SpD / Spe
                const statMap = { 'hp': 'HP', 'atk': 'Atk', 'def': 'Def', 'spa': 'SpA', 'spd': 'SpD', 'spe': 'Spe' };
                for (const stat of Object.keys(statMap)) {
                    if (p.new_evs[stat] > 0) {
                        evParts.push(`${p.new_evs[stat]} ${statMap[stat]}`);
                    }
                }
                if (evParts.length > 0) block += `EVs: ${evParts.join(' / ')}\n`;
            }

            if (p.new_nature && p.new_nature !== 'Hardy') {
                block += `${p.new_nature} Nature\n`;
            }

            if (p.moves) {
                p.moves.forEach(m => {
                    if (m && m !== '-') block += `- ${m}\n`;
                });
            }

            paste += block + '\n';
        });

        navigator.clipboard.writeText(paste.trim()).then(() => {
            setCopied(true);
            sfx.playClick();
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1rem' }}>

            <div style={{ textAlign: 'center' }}>
                <h2 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Trophy size={42} color="var(--warning)" />
                    OPTIMIZATION COMPLETE
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>
                    Target coverage limit achieved in {lastCycle.num} cycles with {lastCycle.coverage}% threat mitigation.
                </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'nowrap' }}>
                {/* Original Team */}
                <div style={{ flex: '1 1 45%', minWidth: '350px', maxWidth: '600px' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)', textAlign: 'center', opacity: 0.7, fontSize: '1.2rem' }}>ORIGINAL STRESS TEST</h3>
                    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', opacity: 0.7, filter: 'grayscale(50%)' }}>
                        {initialTeam.map((p, idx) => (
                            <div key={idx} style={{ padding: '0.8rem 1.2rem', background: 'var(--glass-bg)', borderRadius: '12px', display: 'flex', gap: '1rem', alignItems: 'center', border: '1px solid var(--glass-border)' }}>
                                <div style={{ minWidth: '70px', display: 'flex', justifyContent: 'center' }}>
                                    <img
                                        src={`https://play.pokemonshowdown.com/sprites/ani/${p.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.gif`}
                                        alt={p.name}
                                        style={{ maxHeight: '60px', opacity: 0.8 }}
                                        onError={(e) => { e.target.src = 'https://play.pokemonshowdown.com/sprites/ani/substitute.gif'; }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ color: 'var(--text-main)', fontSize: '1.2rem', margin: 0 }}>{p.name}</h4>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--danger)' }}>Cov: 0%</span>
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '180px' }}>
                                    <div style={{ color: 'var(--warning)', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.item} | {p.new_nature}</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0.2rem', textAlign: 'left' }}>
                                        {p.moves && p.moves.map((m, i) => <span key={i} style={{ background: 'var(--bg-dark)', padding: '2px 6px', borderRadius: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem', color: 'var(--text-muted)' }} title={m}>{m}</span>)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Arrow Divider */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', padding: '0 1rem' }}>
                    <motion.div animate={{ x: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                        <ArrowRight size={48} />
                    </motion.div>
                </div>

                {/* Final Optimized Team */}
                <div style={{ flex: '1 1 45%', minWidth: '350px', maxWidth: '600px' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--success)', textAlign: 'center', fontSize: '1.2rem' }}>FINAL OPTIMIZED ROSTER</h3>
                    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', border: '1px solid var(--success)', boxShadow: '0 0 30px rgba(52, 211, 153, 0.1)' }}>
                        {finalTeam.map((p, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.15 }}
                                style={{ padding: '0.8rem 1.2rem', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '12px', display: 'flex', gap: '1rem', alignItems: 'center', borderLeft: '4px solid var(--success)' }}
                            >
                                <div style={{ minWidth: '70px', display: 'flex', justifyContent: 'center' }}>
                                    <img
                                        src={`https://play.pokemonshowdown.com/sprites/ani/${p.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.gif`}
                                        alt={p.name}
                                        style={{ maxHeight: '60px', filter: 'drop-shadow(0 0 5px rgba(52, 211, 153, 0.4))' }}
                                        onError={(e) => { e.target.src = 'https://play.pokemonshowdown.com/sprites/ani/substitute.gif'; }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ color: 'var(--text-main)', fontSize: '1.2rem', margin: 0 }}>{p.name}</h4>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--success)' }}>META COUNTERED</span>
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '0.9rem', color: 'var(--text-main)', maxWidth: '180px' }}>
                                    <div style={{ color: 'var(--warning)', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.item} | {p.new_nature}</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0.2rem', textAlign: 'left' }}>
                                        {p.moves && p.moves.map((m, i) => <span key={i} style={{ background: 'rgba(129, 140, 248, 0.2)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem' }} title={m}>{m}</span>)}
                                    </div>
                                    {p.new_evs && Object.entries(p.new_evs).filter(([k, v]) => v > 0).length > 0 && (
                                        <div style={{ marginTop: '0.4rem', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            {Object.entries(p.new_evs).filter(([k, v]) => v > 0).map(([k, v]) => (
                                                <span key={k} style={{ background: 'var(--success)', color: 'var(--bg-dark)', padding: '1px 4px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase' }}>{k}:{v}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', gap: '1.5rem' }}>
                <button
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', boxShadow: 'none' }}
                    onClick={handleRestart}
                    onMouseEnter={() => sfx.playHover()}
                >
                    <RefreshCcw size={20} /> RUN NEW SIMULATION
                </button>
                <button
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: copied ? 'var(--success)' : 'var(--bg-dark)', color: copied ? '#000' : 'var(--text-main)', border: '1px solid var(--glass-border)', boxShadow: 'none' }}
                    onClick={exportToPokepaste}
                    onMouseEnter={() => sfx.playHover()}
                >
                    {copied ? <Check size={20} /> : <ClipboardCopy size={20} />}
                    {copied ? 'COPIED TO CLIPBOARD' : 'EXPORT TO SHOWDOWN'}
                </button>
                <button
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onClick={handleViewCycles}
                    onMouseEnter={() => sfx.playHover()}
                >
                    VIEW DETAILED CYCLES <ArrowRight size={20} />
                </button>
            </div>

        </div>
    );
}
