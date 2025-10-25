import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker for PWA capabilities
if ('serviceWorker' in navigator) {
  // Register the service worker immediately as the script loads.
  // This avoids race conditions in specific sandboxed environments where waiting for
  // 'load' or 'DOMContentLoaded' can result in an invalid document state.
  const swUrl = `${window.location.origin}/service-worker.js`;
  navigator.serviceWorker.register(swUrl)
    .then(registration => {
      console.log('Service Worker registered with scope:', registration.scope);
    })
    .catch(error => {
      console.error('Service Worker registration failed:', error);
    });
}
