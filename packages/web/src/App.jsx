import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { AILandingPage } from './pages/AILandingPage';
import { AIChatPage } from './pages/AIChatPage';
import { CLIPage } from './pages/CLIPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { SettingsPage } from './pages/SettingsPage';
import api from './lib/axios';

const THEMES = {
  emerald: '#10b981',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  amber: '#f59e0b',
  red: '#ef4444',
  teal: '#14b8a6'
};

function App() {
  useEffect(() => {
    // Load global UI preferences
    const tokens = JSON.parse(localStorage.getItem('mcode_tokens') || '{}');
    if (tokens.access) {
      api.get('/api/v1/settings', { timeout: 5000 })
      .then(res => {
        const d = res.data;
        if (d.settings?.accentColor && THEMES[d.settings.accentColor]) {
          document.documentElement.style.setProperty('--theme-accent', THEMES[d.settings.accentColor]);
        }
      })
      .catch(console.error);
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/ai" element={<AILandingPage />} />
        <Route path="/ai/chat" element={<AIChatPage />} />
        <Route path="/cli" element={<CLIPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
