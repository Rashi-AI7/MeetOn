import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';

// NOTE: App.js uses <Routes> but never wraps them in <BrowserRouter>.
// BrowserRouter must live here (or in App.js) — we put it here to keep
// App.js clean. Do NOT add another BrowserRouter inside App.js.

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>
);
