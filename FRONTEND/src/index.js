import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Tailwind CSS를 위해 필요할 수 있습니다
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);