import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, ScanSearch, Fingerprint } from 'lucide-react';
import PokemonDatabase from './PokemonDatabase';
import ItemDatabase from './ItemDatabase';
import { sfx } from './SoundEngine';

export default function PokedexHub() {
    const [isBooting, setIsBooting] = useState(true);
    const [activeTab, setActiveTab] = useState('pokemon');

    useEffect(() => {
        sfx.playBoot();
        // Simulate Pokedex Boot Sequence
        const timer = setTimeout(() => {
            setIsBooting(false);
        }, 3500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <AnimatePresence mode="wait">
                {isBooting ? (
                    <PokedexBootScreen key="boot" />
                ) : (
                    <motion.div
                        key="content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '1400px', margin: '0 auto', gap: '2rem' }}
                    >
                        {/* Pokedex Header & Tabs */}
                        <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--primary)', borderTopWidth: '4px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '50px', height: '50px', background: 'radial-gradient(circle at 30% 30%, #60a5fa, #1d4ed8)', borderRadius: '50%', border: '3px solid #e2e8f0', boxShadow: '0 0 20px rgba(96, 165, 250, 0.6)' }} />
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <div style={{ width: '15px', height: '15px', background: '#ef4444', borderRadius: '50%', border: '1px solid #7f1d1d' }} />
                                    <div style={{ width: '15px', height: '15px', background: '#eab308', borderRadius: '50%', border: '1px solid #713f12' }} />
                                    <div style={{ width: '15px', height: '15px', background: '#22c55e', borderRadius: '50%', border: '1px solid #14532d' }} />
                                </div>
                            </div>

                            <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', color: 'white', letterSpacing: '4px', textTransform: 'uppercase', fontSize: '1.8rem' }}>
                                NATIONAL POKÉDEX
                            </h2>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => { sfx.playClick(); setActiveTab('pokemon'); }}
                                    onMouseEnter={() => sfx.playHover()}
                                    style={{
                                        background: activeTab === 'pokemon' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--primary)',
                                        color: activeTab === 'pokemon' ? 'white' : 'var(--text-muted)',
                                        padding: '0.6rem 1.2rem',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontFamily: 'var(--font-heading)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        transition: 'all 0.2s',
                                        boxShadow: activeTab === 'pokemon' ? '0 0 15px rgba(99, 102, 241, 0.5)' : 'none'
                                    }}
                                >
                                    <ScanSearch size={18} /> Pokémon
                                </button>
                                <button
                                    onClick={() => { sfx.playClick(); setActiveTab('items'); }}
                                    onMouseEnter={() => sfx.playHover()}
                                    style={{
                                        background: activeTab === 'items' ? 'var(--warning)' : 'rgba(255,255,255,0.05)',
                                        border: `1px solid ${activeTab === 'items' ? 'var(--warning)' : 'var(--primary)'}`,
                                        color: activeTab === 'items' ? '#1e293b' : 'var(--text-muted)',
                                        padding: '0.6rem 1.2rem',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontFamily: 'var(--font-heading)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        transition: 'all 0.2s',
                                        fontWeight: activeTab === 'items' ? 'bold' : 'normal',
                                        boxShadow: activeTab === 'items' ? '0 0 15px rgba(245, 158, 11, 0.5)' : 'none'
                                    }}
                                >
                                    <Database size={18} /> Items
                                </button>
                            </div>
                        </div>

                        {/* Database Viewers container */}
                        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <AnimatePresence mode="wait">
                                {activeTab === 'pokemon' ? (
                                    <motion.div key="db-pokemon" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }} style={{ height: '100%', width: '100%' }}>
                                        <PokemonDatabase insideHub={true} />
                                    </motion.div>
                                ) : (
                                    <motion.div key="db-items" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }} style={{ height: '100%', width: '100%' }}>
                                        <ItemDatabase insideHub={true} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function PokedexBootScreen() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
            style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                borderRadius: '16px',
                border: '2px solid var(--primary)',
                boxShadow: '0 0 40px rgba(99, 102, 241, 0.2)',
                overflow: 'hidden'
            }}
        >
            {/* Tech grid background */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)',
                backgroundSize: '30px 30px',
                zIndex: 0
            }} />

            <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
                <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #38bdf8, #0369a1)', border: '4px solid #f8fafc', boxShadow: '0 0 50px rgba(56, 189, 248, 0.8), inset 0 -10px 20px rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        style={{ width: '40px', height: '40px', background: '#bae6fd', borderRadius: '50%', filter: 'blur(4px)' }}
                    />
                </motion.div>

                <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Fingerprint size={28} color="var(--primary)" />
                        <h2 style={{ margin: 0, color: 'white', fontFamily: 'var(--font-heading)', letterSpacing: '6px' }}>RETRIEVING RECORDS</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#6ee7b7', textAlign: 'left', background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(110, 231, 183, 0.2)' }}>
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>&gt; Authenticating Silph Co. Credentials...</motion.span>
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>&gt; Accessing Global PokeAPI Server...</motion.span>
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>&gt; Downloading Sprite Geometry...</motion.span>
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}>&gt; Decrypting Item Meta-Data...</motion.span>
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.9 }}>&gt; SYSTEM READY.</motion.span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
