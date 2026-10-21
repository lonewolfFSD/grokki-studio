import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { SmoothCursor } from "@/components/ui/smooth-cursor";

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <SmoothCursor />
      <App />
    </React.StrictMode>
  );
}
