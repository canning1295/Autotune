import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeDB } from './utils/localDatabase';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('No root element found');
}
const root = ReactDOM.createRoot(rootElement);

// Initialize IndexedDB & then register the service worker and render the app
initializeDB()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch((error) => {
    console.error('Failed to initialize IndexedDB:', error);
  })
  .finally(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js') // the file in /public
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((error) => {
          console.log('SW registration failed: ', error);
        });
    }

    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });