import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing.jsx';
import { Docs } from './pages/Docs.jsx';
import { Commands } from './pages/Commands.jsx';
import { Plugins } from './pages/Plugins.jsx';
import { Changelog } from './pages/Changelog.jsx';
import { AuthPage } from './pages/AuthPage.jsx';
import { AppShell } from './pages/app/AppShell.jsx';
import { Sessions } from './pages/app/Sessions.jsx';
import { SessionDetail } from './pages/app/SessionDetail.jsx';
import { Agents } from './pages/app/Agents.jsx';
import { Watch } from './pages/app/Watch.jsx';
import { Usage } from './pages/app/Usage.jsx';
import { Settings } from './pages/app/Settings.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/commands" element={<Commands />} />
        <Route path="/plugins" element={<Plugins />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Sessions />} />
          <Route path="sessions/:id" element={<SessionDetail />} />
          <Route path="agents" element={<Agents />} />
          <Route path="watch" element={<Watch />} />
          <Route path="usage" element={<Usage />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
