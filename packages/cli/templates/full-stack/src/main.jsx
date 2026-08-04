import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

function App() {
  const [message, setMessage] = useState('...');

  useEffect(() => {
    fetch('/api/hello')
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage('API not reachable — is the server running?'));
  }, []);

  return (
    <main>
      <h1>full-stack-starter</h1>
      <p>Scaffolded by mcode. <code>npm run dev</code> starts API + Vite together.</p>
      <p className="api">API says: {message}</p>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
