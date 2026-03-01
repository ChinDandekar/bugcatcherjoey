import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function useTheme() {
    return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
    // Default to midnight theme if none saved
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('pokedex-theme') || 'midnight';
    });

    useEffect(() => {
        // Update the root data attribute to apply CSS variables from index.css
        document.documentElement.setAttribute('data-theme', theme);
        // Persist choice
        localStorage.setItem('pokedex-theme', theme);
    }, [theme]);

    const changeTheme = (newTheme) => {
        setTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, changeTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
