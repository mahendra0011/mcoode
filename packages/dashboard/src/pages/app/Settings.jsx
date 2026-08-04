import { useState } from 'react';
import { api } from '../../api/client.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Input, Label } from '../../components/ui/input.jsx';

export function Settings() {
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [password, setPassword] = useState({ current: '', next: '' });
  const [msg, setMsg] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await api.patch('/auth/me', profile);
      setMsg('profile saved');
    } catch (err) {
      setMsg(err.response?.data?.error?.message || err.message);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/auth/change-password', {
        currentPassword: password.current,
        newPassword: password.next
      });
      setMsg('password changed — re-sign in if prompted');
      setPassword({ current: '', next: '' });
    } catch (err) {
      setMsg(err.response?.data?.error?.message || err.message);
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="font-mono text-xl font-semibold text-white">Settings</h1>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-sm">Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="p-email">Email</Label>
              <Input id="p-email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            </div>
            <Button type="submit">Save profile</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-sm">Change password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <Label htmlFor="pw-current">Current password</Label>
              <Input id="pw-current" type="password" value={password.current} onChange={(e) => setPassword({ ...password, current: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pw-next">New password</Label>
              <Input id="pw-next" type="password" value={password.next} onChange={(e) => setPassword({ ...password, next: e.target.value })} />
            </div>
            <Button type="submit">Change password</Button>
          </form>
        </CardContent>
      </Card>

      {msg && <p className="mt-4 font-mono text-xs text-mcode-green">{msg}</p>}
    </div>
  );
}
