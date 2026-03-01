import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap } from 'lucide-react';

export default function LoadingScreen({ onComplete }) {
    useEffect(() => {
        // Simulate a network boot-up sequence
        const timer = setTimeout(() => {
            onComplete();
        }, 2800);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'var(--bg-dark)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            overflow: 'hidden'
        }}>
            {/* Grid overlay */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                zIndex: 0,
                opacity: 0.5
            }} />

            <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                    {/* Outer Pulse Rings */}
                    <motion.div
                        animate={{ scale: [1, 1.5, 2], opacity: [0.8, 0.3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                        style={{ position: 'absolute', inset: 0, border: '2px solid var(--primary)', borderRadius: '50%' }}
                    />
                    <motion.div
                        animate={{ scale: [1, 1.5, 2], opacity: [0.8, 0.3, 0] }}
                        transition={{ duration: 1.5, delay: 0.5, repeat: Infinity, ease: "easeOut" }}
                        style={{ position: 'absolute', inset: 0, border: '2px solid var(--warning)', borderRadius: '50%' }}
                    />

                    {/* Core Orbital */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        style={{ width: '100px', height: '100px', border: '4px dashed var(--primary)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(5px)' }}
                    >
                        {/* Inner Flash */}
                        <motion.div
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                        >
                            <Zap size={40} color="var(--warning)" />
                        </motion.div>
                    </motion.div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                >
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch' }}>
                        <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-main)', letterSpacing: '8px', marginRight: '-8px', fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <Activity size={24} color="var(--primary)" />
                            INITIATING SYSTEM
                        </h2>

                        <div style={{ width: '100%', height: '4px', background: 'var(--glass-border)', borderRadius: '2px', overflow: 'hidden' }}>
                            <motion.div
                                initial={{ width: '0%' }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 2.2, ease: "easeInOut", delay: 0.2 }}
                                style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--warning))' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: '1rem', height: '20px', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <motion.span
                            animate={{ opacity: [1, 1, 0, 0] }}
                            transition={{ duration: 2.8, times: [0, 0.4, 0.41, 1] }}
                        >
                            Establishing connection to PokeAPI servers...
                        </motion.span>
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0, 1, 1] }}
                            transition={{ duration: 2.8, times: [0, 0.4, 0.41, 1] }}
                            style={{ position: 'absolute', transform: 'translateX(-100%)' }}
                        >
                            Loading Meta Dependencies...
                        </motion.span>
                    </div>

                </motion.div>
            </div>
        </div>
    );
}
