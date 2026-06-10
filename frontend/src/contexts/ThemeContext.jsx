import React, { createContext, useContext, useState, useEffect } from "react";

export const ThemeContext = createContext({ dark: true, toggle: () => {} });

export const ThemeProvider = ({ children }) => {
    const [dark, setDark] = useState(() => {
        const stored = localStorage.getItem("meeton-theme");
        if (stored) return stored === "dark";
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    });

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
        localStorage.setItem("meeton-theme", dark ? "dark" : "light");
    }, [dark]);

    const toggle = () => setDark(v => !v);

    return (
        <ThemeContext.Provider value={{ dark, toggle }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);