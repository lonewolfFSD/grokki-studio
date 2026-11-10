import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/outfit';
import '@fontsource-variable/geist';
import { App } from './App';
import './index.css';

console.log('[MAIN.TSX] Starting React mount...');
const rootEl = document.getElementById('root');
if (rootEl) {
  try {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('[MAIN.TSX] React render called successfully.');
  } catch (err) {
    console.error('[MAIN.TSX MOUNT CRASH]', err);
  }
} else {
  console.error('[MAIN.TSX] #root element not found!');
}
