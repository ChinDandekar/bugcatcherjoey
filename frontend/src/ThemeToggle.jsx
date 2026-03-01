import React from 'react';
import { useTheme } from './ThemeProvider';
import { Palette } from 'lucide-react';

export default function ThemeToggle() {
    const { theme, changeTheme } = useTheme();

    const themes = [
        { id: 'red', color: '#ef4444', label: 'Rotom Red' },
        { id: 'violet', color: '#a855f7', label: 'Rotom Violet' },
        { id: 'midnight', color: '#818cf8', label: 'Rotom Midnight' },
        { id: 'pokeball', color: 'pokeball', label: 'Classic Pokeball' }
    ];

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '25px', border: '1px solid var(--glass-border)' }}>
            <Palette size={16} color="var(--text-muted)" />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                {themes.map(t => (
                    <button
                        key={t.id}
                        onClick={() => changeTheme(t.id)}
                        title={t.label}
                        style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: t.id === 'pokeball' ? 'linear-gradient(to bottom, #ef4444 50%, #ffffff 50%)' : t.color,
                            border: theme === t.id ? '2px solid var(--primary)' : '2px solid transparent',
                            cursor: 'pointer',
                            boxShadow: theme === t.id ? `0 0 10px ${t.id === 'pokeball' ? 'var(--primary)' : t.color}` : 'none',
                            transition: 'all 0.2s ease',
                            opacity: theme === t.id ? 1 : 0.6,
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {t.id === 'pokeball' && (
                            <>
                                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', background: '#000', transform: 'translateY(-50%)' }} />
                                <div style={{ position: 'absolute', top: '50%', left: '50%', width: '8px', height: '8px', background: '#fff', border: '2px solid #000', borderRadius: '50%', transform: 'translate(-50%, -50%)' }} />
                            </>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
