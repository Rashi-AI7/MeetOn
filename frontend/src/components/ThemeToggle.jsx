import React from "react";
import { Tooltip, IconButton } from "@mui/material";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useTheme } from "../contexts/ThemeContext";

export default function ThemeToggle() {
    const { dark, toggle } = useTheme();
    return (
        <Tooltip title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            <IconButton onClick={toggle} aria-label="Toggle theme"
                sx={{ color: "var(--text-secondary)" }}>
                {dark ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
        </Tooltip>
    );
}