import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Zap, Package } from 'lucide-react';
import { sfx } from './SoundEngine';

export default function ItemDatabase({ insideHub = false }) {
    const [itemList, setItemList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [itemDetails, setItemDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    useEffect(() => {
        fetch('https://pokeapi.co/api/v2/item?limit=500')
            .then(res => res.json())
            .then(data => {
                setItemList(data.results);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching Item database", err);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        if (!selectedItem) {
            setItemDetails(null);
            return;
        }

        setDetailsLoading(true);
        fetch(`https://pokeapi.co/api/v2/item/${selectedItem}`)
            .then(res => res.json())
            .then(data => {
                // Extract English flavor text
                const flavorEntry = data.flavor_text_entries.find(entry => entry.language.name === 'en');
                // Extract English effect entry
                const effectEntry = data.effect_entries.find(entry => entry.language.name === 'en');

                setItemDetails({
                    ...data,
                    flavorText: flavorEntry ? flavorEntry.text.replace(/\f/g, ' ') : 'No description available.',
                    effect: effectEntry ? effectEntry.effect.replace(/\f/g, ' ') : 'No competitive effect listed.',
                    shortEffect: effectEntry ? effectEntry.short_effect : ''
                });
                setDetailsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching Item details", err);
                setDetailsLoading(false);
            });
    }, [selectedItem]);

    const filteredItems = itemList.filter(i => i.name.includes(searchTerm.toLowerCase().replace(/ /g, '-')));

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: insideHub ? '0 1rem 1rem' : '0 2rem 3rem', height: insideHub ? '100%' : 'auto', overflowY: insideHub ? 'auto' : 'visible' }}>

            {!insideHub && (
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <h2 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '1rem', textTransform: 'uppercase' }}>
                        Item Database
                    </h2>
                </div>
            )}

            <div style={{ textAlign: 'center', marginTop: insideHub ? '1rem' : '0' }}>

                <div style={{ position: 'relative', maxWidth: '500px', margin: '0 auto' }}>
                    <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search for an item..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '1rem 1rem 1rem 3rem', color: 'white', borderRadius: '25px', fontFamily: 'var(--font-body)', fontSize: '1.1rem', width: '100%', outline: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                        }}
                    />
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '1.2rem', padding: '4rem 0' }}>
                    <Zap size={48} className="spin" style={{ color: 'var(--warning)', margin: '0 auto 1rem', display: 'block' }} />
                    Loading Catalog...
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem', width: '100%' }}>
                    {filteredItems.map((item, idx) => (
                        <motion.div
                            key={item.name}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: (idx % 20) * 0.05 }}
                            className="glass-panel"
                            onClick={() => { sfx.playClick(); setSelectedItem(item.name); }}
                            style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '1rem' }}
                        >
                            <div style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)' }}>
                                <img
                                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${item.name}.png`}
                                    alt={item.name}
                                    style={{ width: '40px', height: '40px', imageRendering: 'pixelated' }}
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                                />
                                <Package size={32} color="var(--primary)" style={{ display: 'none' }} />
                            </div>
                            <h4 style={{ color: 'white', textTransform: 'capitalize', fontSize: '1.1rem', textAlign: 'center' }}>
                                {item.name.replace(/-/g, ' ')}
                            </h4>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            {createPortal(
                <AnimatePresence>
                    {selectedItem && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--overlay-bg)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
                            onClick={() => setSelectedItem(null)}
                        >
                            <motion.div
                                initial={{ y: 50, opacity: 0, scale: 0.95 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                exit={{ y: 50, opacity: 0, scale: 0.95 }}
                                style={{
                                    width: '100%', maxWidth: '600px', position: 'relative',
                                    background: 'var(--bg-dark)', border: '1px solid var(--warning)',
                                    borderRadius: '20px', padding: '2rem', boxShadow: '0 8px 32px 0 var(--glass-glow)',
                                    maxHeight: '90vh', overflowY: 'auto'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                >
                                    <X size={32} />
                                </button>

                                {detailsLoading || !itemDetails ? (
                                    <div style={{ textAlign: 'center', color: 'var(--warning)', padding: '4rem 0' }}>Deciphering Item...</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center', textAlign: 'center', padding: '1rem' }}>

                                        <div style={{ width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '25%', border: '2px dashed var(--warning)', transform: 'rotate(10deg)' }}>
                                            {itemDetails.sprites && itemDetails.sprites.default ? (
                                                <img src={itemDetails.sprites.default} alt={itemDetails.name} style={{ width: '80px', height: '80px', imageRendering: 'pixelated', transform: 'rotate(-10deg)', filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.5))' }} />
                                            ) : (
                                                <Package size={64} color="var(--warning)" style={{ transform: 'rotate(-10deg)' }} />
                                            )}
                                        </div>

                                        <div>
                                            <h2 style={{ fontSize: '2.5rem', textTransform: 'capitalize', color: 'var(--text-main)', margin: '0 0 0.5rem' }}>
                                                {itemDetails.name.replace(/-/g, ' ')}
                                            </h2>
                                            <span style={{ background: 'var(--glass-bg)', padding: '0.4rem 1.5rem', borderRadius: '20px', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                Cost: ¥{itemDetails.cost}
                                            </span>
                                        </div>

                                        <div style={{ width: '100%', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            <div>
                                                <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)', letterSpacing: '2px', fontSize: '0.9rem' }}>COMPETITIVE EFFECT</h4>
                                                <p style={{ color: 'var(--text-main)', fontSize: '1.1rem', lineHeight: '1.6' }}>
                                                    {itemDetails.effect}
                                                </p>
                                            </div>

                                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px' }}>
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontStyle: 'italic' }}>
                                                    "{itemDetails.flavorText}"
                                                </p>
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
