import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import Home from './Home';
import Simulation from './Simulation';
import Results from './Results';
import CyclesView from './CyclesView';
import PokedexHub from './PokedexHub';
import LoadingScreen from './LoadingScreen';
import { ThemeProvider } from './ThemeProvider';
import ThemeToggle from './ThemeToggle';
import { AnimatePresence } from 'framer-motion';
import { sfx } from './SoundEngine';

function App() {
    const [initialTeam, setInitialTeam] = useState(null);
    const [appLoaded, setAppLoaded] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleStartSimulation = (team) => {
        setInitialTeam(team);
        navigate('/simulation');
    };

    const showNav = !location.pathname.includes('/simulation');

    // Global Audio Router
    useEffect(() => {
        if (location.pathname === '/results') {
            // Give Simulation component a tick to unmount and stop BGM
            setTimeout(() => sfx.playVictoryFanfare(), 100);
        }

        if (location.pathname !== '/simulation') {
            sfx.stopBattleMusic();
        }
    }, [location.pathname]);

    return (
        <ThemeProvider>
            <AnimatePresence mode="wait">
                {!appLoaded ? (
                    <LoadingScreen key="loader" onComplete={() => setAppLoaded(true)} />
                ) : (
                    <div key="app-content" className="app-container animate-fade-in" style={{ paddingTop: showNav ? '0' : '2rem', height: '100%' }}>
                        {showNav && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem', marginTop: '1rem' }}>
                                <nav style={{ display: 'flex', gap: '2.5rem' }}>
                                    <Link to="/" onClick={() => sfx.playHover()} style={{ color: location.pathname === '/' ? 'var(--primary)' : 'var(--text-muted)', textDecoration: 'none', fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '1px' }}>DASHBOARD</Link>
                                    <Link to="/pokedex" onClick={() => sfx.playHover()} style={{ color: location.pathname === '/pokedex' ? 'var(--primary)' : 'var(--text-muted)', textDecoration: 'none', fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '1px' }}>POKÉDEX</Link>
                                </nav>
                                <div style={{ position: 'absolute', right: '0' }}>
                                    <ThemeToggle />
                                </div>
                            </div>
                        )}
                        <Routes>
                            <Route path="/" element={<Home onStart={handleStartSimulation} initialTeam={initialTeam} />} />
                            <Route path="/simulation" element={<Simulation initialTeam={initialTeam} />} />
                            <Route path="/results" element={<Results initialTeam={initialTeam} />} />
                            <Route path="/cycles" element={<CyclesView />} />
                            <Route path="/pokedex" element={<PokedexHub />} />
                        </Routes>
                    </div>
                )}
            </AnimatePresence>
        </ThemeProvider>
    );
}

export default App;
