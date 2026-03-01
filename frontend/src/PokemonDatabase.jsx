import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Activity, Swords, Shield, Zap } from 'lucide-react';
import { sfx } from './SoundEngine';

export default function PokemonDatabase({ insideHub = false }) {
    const [pokemonList, setPokemonList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedPokemon, setSelectedPokemon] = useState(null);
    const [pokemonDetails, setPokemonDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    useEffect(() => {
        fetch('https://pokeapi.co/api/v2/pokemon?limit=500')
            .then(res => res.json())
            .then(data => {
                setPokemonList(data.results);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching Pokemon database", err);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        if (!selectedPokemon) {
            setPokemonDetails(null);
            return;
        }

        setDetailsLoading(true);
        fetch(`https://pokeapi.co/api/v2/pokemon/${selectedPokemon}`)
            .then(res => res.json())
            .then(data => {
                // Fetch species for flavor text
                return fetch(data.species.url).then(res => res.json()).then(speciesData => {
                    const flavorTextEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'en');
                    return {
                        ...data,
                        flavorText: flavorTextEntry ? flavorTextEntry.flavor_text.replace(/\f/g, ' ') : 'No description available.',
                    };
                });
            })
            .then(fullData => {
                // Fetch type effectiveness data for matchups
                const typePromises = fullData.types.map(t => fetch(t.type.url).then(res => res.json()));
                return Promise.all(typePromises).then(typesData => {
                    const matchups = calculateMatchups(typesData);
                    setPokemonDetails({ ...fullData, matchups });
                    setDetailsLoading(false);
                });
            })
            .catch(err => {
                console.error("Error fetching Pokemon details", err);
                setDetailsLoading(false);
            });
    }, [selectedPokemon]);

    const filteredPokemon = pokemonList.filter(p => p.name.includes(searchTerm.toLowerCase()));

    // Helper logic to process PokeAPI damage relations into a unified multiplier map
    const calculateMatchups = (typesData) => {
        const multipliers = {};

        typesData.forEach(typeData => {
            const damageRelations = typeData.damage_relations;

            damageRelations.double_damage_from.forEach(t => { multipliers[t.name] = (multipliers[t.name] || 1) * 2; });
            damageRelations.half_damage_from.forEach(t => { multipliers[t.name] = (multipliers[t.name] || 1) * 0.5; });
            damageRelations.no_damage_from.forEach(t => { multipliers[t.name] = 0; });
        });

        // Group by multiplier (4x, 2x, 0.5x, 0.25x, 0x)
        const grouped = { 4: [], 2: [], 0.5: [], 0.25: [], 0: [] };
        Object.entries(multipliers).forEach(([type, value]) => {
            if (grouped[value]) grouped[value].push(type);
        });

        return grouped;
    };

    const typeColors = {
        normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C', grass: '#7AC74C', ice: '#96D9D6',
        fighting: '#C22E28', poison: '#A33EA1', ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
        rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746', steel: '#B7B7CE', fairy: '#D685AD'
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: insideHub ? '0 1rem 1rem' : '0 2rem 3rem', height: insideHub ? '100%' : 'auto', overflowY: insideHub ? 'auto' : 'visible' }}>

            {!insideHub && (
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <h2 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '1rem', textTransform: 'uppercase' }}>
                        Pokémon Database
                    </h2>
                </div>
            )}

            <div style={{ textAlign: 'center', marginTop: insideHub ? '1rem' : '0' }}>

                <div style={{ position: 'relative', maxWidth: '500px', margin: '0 auto' }}>
                    <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                            padding: '1rem 1rem 1rem 3rem',
                            color: 'white',
                            borderRadius: '25px',
                            fontFamily: 'var(--font-body)',
                            fontSize: '1.1rem',
                            width: '100%',
                            outline: 'none',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                        }}
                    />
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '1.2rem', padding: '4rem 0' }}>
                    <Zap size={48} className="spin" style={{ color: 'var(--warning)', margin: '0 auto 1rem', display: 'block' }} />
                    Loading Database...
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem', width: '100%' }}>
                    {filteredPokemon.map((p, idx) => (
                        <motion.div
                            key={p.name}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: (idx % 20) * 0.05 }}
                            className="glass-panel"
                            onClick={() => { sfx.playClick(); setSelectedPokemon(p.name); }}
                            style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                        >
                            <img
                                src={`https://play.pokemonshowdown.com/sprites/ani/${p.name.replace(/[^a-z0-9]/g, '')}.gif`}
                                alt={p.name}
                                style={{ maxHeight: '60px', minHeight: '60px', objectFit: 'contain', filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.2))' }}
                                onError={(e) => { e.target.src = 'https://play.pokemonshowdown.com/sprites/ani/substitute.gif'; }}
                            />
                            <h4 style={{ color: 'white', textTransform: 'capitalize', marginTop: '1rem', fontSize: '1.1rem' }}>{p.name}</h4>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            {createPortal(
                <AnimatePresence>
                    {selectedPokemon && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                background: 'var(--overlay-bg)', backdropFilter: 'blur(10px)',
                                zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
                            }}
                            onClick={() => setSelectedPokemon(null)}
                        >
                            <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 50, opacity: 0 }}
                                style={{
                                    width: '100%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto',
                                    position: 'relative', background: 'var(--bg-dark)', border: '1px solid var(--primary)',
                                    borderRadius: '20px', padding: '2rem', boxShadow: '0 8px 32px 0 var(--glass-glow)'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => setSelectedPokemon(null)}
                                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                >
                                    <X size={32} />
                                </button>

                                {detailsLoading || !pokemonDetails ? (
                                    <div style={{ textAlign: 'center', color: 'var(--primary)', padding: '4rem 0' }}>Analyzing Data...</div>
                                ) : (
                                    <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>

                                        {/* Left Column: Image & Type */}
                                        <div style={{ flex: '1', minWidth: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', textAlign: 'center' }}>
                                            <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '50%', border: '4px solid var(--primary)' }}>
                                                <img
                                                    src={`https://play.pokemonshowdown.com/sprites/ani/${pokemonDetails.name.replace(/[^a-z0-9]/g, '')}.gif`}
                                                    alt={pokemonDetails.name}
                                                    style={{ transform: 'scale(1.5)', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))' }}
                                                    onError={(e) => { e.target.src = 'https://play.pokemonshowdown.com/sprites/ani/substitute.gif'; }}
                                                />
                                            </div>

                                            <h2 style={{ fontSize: '3rem', textTransform: 'capitalize', color: 'var(--text-main)', margin: 0 }}>{pokemonDetails.name}</h2>

                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                {pokemonDetails.types.map(t => (
                                                    <span key={t.type.name} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '0.4rem 1.5rem', borderRadius: '20px', textTransform: 'uppercase', fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                                                        {t.type.name}
                                                    </span>
                                                ))}
                                            </div>

                                            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontStyle: 'italic', lineHeight: '1.5', marginTop: '1rem', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px' }}>
                                                "{pokemonDetails.flavorText}"
                                            </p>
                                        </div>

                                        {/* Right Column: Stats & Moves */}
                                        <div style={{ flex: '2', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                                            <div>
                                                <h3 style={{ color: 'var(--warning)', marginBottom: '1rem', borderBottom: '1px solid rgba(251, 191, 36, 0.3)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Activity size={20} /> BASE STATS
                                                </h3>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                                    {pokemonDetails.stats.map(s => (
                                                        <div key={s.stat.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                            <span style={{ width: '120px', textTransform: 'uppercase', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.stat.name.replace('-', ' ')}</span>
                                                            <div style={{ flex: 1, height: '12px', background: 'rgba(0,0,0,0.5)', borderRadius: '6px', overflow: 'hidden' }}>
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${Math.min(100, (s.base_stat / 255) * 100)}%` }}
                                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                                    style={{ height: '100%', background: s.base_stat >= 100 ? 'var(--success)' : s.base_stat >= 60 ? 'var(--warning)' : 'var(--danger)', borderRadius: '6px' }}
                                                                />
                                                            </div>
                                                            <span style={{ width: '40px', textAlign: 'right', fontWeight: 'bold', color: 'var(--text-main)' }}>{s.base_stat}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', borderBottom: '1px solid rgba(129, 140, 248, 0.3)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Shield size={20} /> TYPE MATCHUPS
                                                </h3>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    {[
                                                        { label: '4x Weakness', value: 4, color: '#ef4444' },
                                                        { label: '2x Weakness', value: 2, color: '#f87171' },
                                                        { label: 'Immunities', value: 0, color: '#9ca3af' },
                                                        { label: 'Resistances (0.5x)', value: 0.5, color: '#34d399' },
                                                        { label: 'Resistances (0.25x)', value: 0.25, color: '#10b981' }
                                                    ].map(group => {
                                                        const types = pokemonDetails.matchups[group.value];
                                                        if (!types || types.length === 0) return null;
                                                        return (
                                                            <div key={group.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                                                <span style={{ width: '130px', fontSize: '0.85rem', color: group.color, paddingTop: '0.2rem' }}>{group.label}</span>
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', flex: 1 }}>
                                                                    {types.map(t => (
                                                                        <span key={t} style={{ background: typeColors[t] || 'var(--glass-bg)', padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', color: 'white', textTransform: 'uppercase', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                                                                            {t}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div>
                                                <h3 style={{ color: '#a78bfa', marginBottom: '1rem', borderBottom: '1px solid rgba(167, 139, 250, 0.3)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Swords size={20} /> NOTABLE MOVEPOOL
                                                </h3>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    {pokemonDetails.moves.slice(0, 20).map(m => ( // Limit to 20 for display
                                                        <span key={m.move.name} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', color: '#e2e8f0', textTransform: 'capitalize' }}>
                                                            {m.move.name.replace('-', ' ')}
                                                        </span>
                                                    ))}
                                                    {pokemonDetails.moves.length > 20 && (
                                                        <span style={{ background: 'transparent', padding: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                            +{pokemonDetails.moves.length - 20} more...
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                        </div>

                                    </div>
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
