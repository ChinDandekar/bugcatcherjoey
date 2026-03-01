import React, { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import { sfx } from './SoundEngine';

export default function Home({ onStart, initialTeam }) {
    const [team, setTeam] = useState(initialTeam || [
        { name: "Magikarp", item: "None", moves: ["Splash", "-", "-", "-"], new_nature: "Hardy" },
        { name: "Metapod", item: "None", moves: ["Harden", "-", "-", "-"], new_nature: "Hardy" },
        { name: "Unown", item: "None", moves: ["Hidden Power", "-", "-", "-"], new_nature: "Hardy" },
        { name: "-", item: "None", moves: ["-", "-", "-", "-"], new_nature: "Hardy" },
        { name: "-", item: "None", moves: ["-", "-", "-", "-"], new_nature: "Hardy" },
        { name: "-", item: "None", moves: ["-", "-", "-", "-"], new_nature: "Hardy" }
    ]);
    const [pokemonList, setPokemonList] = useState([]);
    const [itemList, setItemList] = useState([]);
    const [natureList, setNatureList] = useState([]);
    const [movesBySlot, setMovesBySlot] = useState({});

    useEffect(() => {
        // Fetch all pokemon names
        fetch('https://pokeapi.co/api/v2/pokemon?limit=1000')
            .then(res => res.json())
            .then(data => {
                const names = data.results.map(p => p.name.charAt(0).toUpperCase() + p.name.slice(1));
                setPokemonList(names.sort());
            })
            .catch(err => console.error("Error fetching Pokemon list", err));

        // Fetch all item names
        fetch('https://pokeapi.co/api/v2/item?limit=2000')
            .then(res => res.json())
            .then(data => {
                const items = data.results.map(i => i.name.split('-').map(str => str.charAt(0).toUpperCase() + str.slice(1)).join(' '));
                setItemList(items.sort());
            })
            .catch(err => console.error("Error fetching Item list", err));

        // Fetch Natures
        fetch('https://pokeapi.co/api/v2/nature?limit=50')
            .then(res => res.json())
            .then(data => {
                const natures = data.results.map(n => n.name.charAt(0).toUpperCase() + n.name.slice(1));
                setNatureList(natures.sort());
            })
            .catch(err => console.error("Error fetching Nature list", err));
    }, []);

    const fetchMoves = async (pokemonName, slotIndex) => {
        if (!pokemonName || pokemonName === '-') return;
        try {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName.toLowerCase()}`);
            if (!res.ok) return;
            const data = await res.json();
            const moves = data.moves.map(m => {
                return m.move.name.split('-').map(str => str.charAt(0).toUpperCase() + str.slice(1)).join(' ');
            });
            setMovesBySlot(prev => ({ ...prev, [slotIndex]: moves.sort() }));
        } catch (e) {
            console.error(e);
        }
    };

    // Fetch moves for initial mocked team
    useEffect(() => {
        team.forEach((p, idx) => {
            if (p.name) fetchMoves(p.name, idx);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleUpdate = (index, field, value) => {
        const newTeam = [...team];
        newTeam[index] = { ...newTeam[index], [field]: value };
        setTeam(newTeam);

        if (field === 'name') {
            fetchMoves(value, index);
            // Reset moves when pokemon changes
            newTeam[index].moves = ['-', '-', '-', '-'];
            setTeam(newTeam);
        }
    };

    const handleMoveUpdate = (pokemonIndex, moveIndex, value) => {
        const newTeam = [...team];
        const newMoves = [...newTeam[pokemonIndex].moves];
        newMoves[moveIndex] = value;
        newTeam[pokemonIndex] = { ...newTeam[pokemonIndex], moves: newMoves };
        setTeam(newTeam);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '3rem', padding: '2rem 0' }}>

            <div style={{ textAlign: 'center' }}>
                <h1 className="text-gradient" style={{ fontSize: '4rem', marginBottom: '1rem', textTransform: 'uppercase' }}>
                    Meta Optimizer
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto', fontFamily: 'var(--font-heading)' }}>
                    Configure your starting stress-test lineup. The AI will strategically reconstruct this team to counter &gt;60% of current top tier threats.
                </p>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: '1200px' }}>
                {team.map((pokemon, index) => (
                    <div key={index} className="glass-panel" style={{ flex: '1', minWidth: '320px', maxWidth: '350px', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', textAlign: 'center' }}>
                            SLOT 0{index + 1}
                        </h3>

                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', minHeight: '120px', alignItems: 'flex-end' }}>
                            {pokemon.name && pokemon.name !== '-' && (
                                <img
                                    src={`https://play.pokemonshowdown.com/sprites/ani/${pokemon.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.gif`}
                                    alt={pokemon.name}
                                    style={{ maxHeight: '100px', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))' }}
                                    onError={(e) => { e.target.src = 'https://play.pokemonshowdown.com/sprites/ani/substitute.gif'; }}
                                />
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pokémon Species</label>
                                <select
                                    value={pokemon.name}
                                    onChange={(e) => { sfx.playClick(); handleUpdate(index, 'name', e.target.value); }}
                                    style={{
                                        background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', padding: '0.8rem', color: 'var(--text-main)', borderRadius: '8px', fontFamily: 'var(--font-body)', fontSize: '1rem', width: '100%', outline: 'none'
                                    }}
                                >
                                    <option value="-">-- Select Pokemon --</option>
                                    {pokemonList.map(p => <option key={p} value={p}>{p}</option>)}
                                    {/* Fallback for mocked ones if not loaded yet */}
                                    {!pokemonList.includes(pokemon.name) && pokemon.name !== '-' && <option value={pokemon.name}>{pokemon.name}</option>}
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Held Item</label>
                                <select
                                    value={pokemon.item}
                                    onChange={(e) => { sfx.playClick(); handleUpdate(index, 'item', e.target.value); }}
                                    style={{ background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', padding: '0.8rem', color: 'var(--text-main)', borderRadius: '8px', width: '100%', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '1rem' }}
                                >
                                    <option value="None">None</option>
                                    {itemList.map(i => <option key={i} value={i}>{i}</option>)}
                                    {/* Fallback for mocked ones if not loaded yet */}
                                    {!itemList.includes(pokemon.item) && pokemon.item !== 'None' && <option value={pokemon.item}>{pokemon.item}</option>}
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nature</label>
                                <select
                                    value={pokemon.new_nature}
                                    onChange={(e) => { sfx.playClick(); handleUpdate(index, 'new_nature', e.target.value); }}
                                    style={{ background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', padding: '0.8rem', color: 'var(--text-main)', borderRadius: '8px', width: '100%', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '1rem' }}
                                >
                                    <option value="Hardy">Hardy (Neutral)</option>
                                    {natureList.map(n => <option key={n} value={n}>{n}</option>)}
                                    {!natureList.includes(pokemon.new_nature) && pokemon.new_nature !== 'Hardy' && <option value={pokemon.new_nature}>{pokemon.new_nature}</option>}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                {[0, 1, 2, 3].map(moveIdx => (
                                    <div key={moveIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Move {moveIdx + 1}</label>
                                        <select
                                            value={pokemon.moves[moveIdx]}
                                            onChange={(e) => { sfx.playClick(); handleMoveUpdate(index, moveIdx, e.target.value); }}
                                            style={{ background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', padding: '0.6rem', color: 'var(--text-main)', borderRadius: '8px', width: '100%', outline: 'none', fontSize: '0.85rem' }}
                                        >
                                            <option value="-">-</option>
                                            {movesBySlot[index] && movesBySlot[index].map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                            {/* Fallback for mocked moves */}
                                            {pokemon.moves[moveIdx] !== '-' && (!movesBySlot[index] || !movesBySlot[index].includes(pokemon.moves[moveIdx])) && (
                                                <option value={pokemon.moves[moveIdx]}>{pokemon.moves[moveIdx]}</option>
                                            )}
                                        </select>
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>
                ))}
            </div>

            <button
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2rem' }}
                onClick={() => { sfx.playClick(); sfx.playBattleMusic(); onStart(team); }}
                onMouseEnter={() => sfx.playHover()}
            >
                <Play size={20} /> INITIATE SIMULATION
            </button>

        </div>
    );
}
