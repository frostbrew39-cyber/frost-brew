import { useState } from 'react';
import { apiUrl } from "../config";

export function SettingsPage() {
  const [settings, setSettings] = useState({
    branchName: localStorage.getItem('zenpos_branchName') || "Frost & Brew Main",
    phone: localStorage.getItem('zenpos_phone') || "+92 300 1234567",
    taxRate: Number(localStorage.getItem('zenpos_taxRate') || 10),
    myPassword: ""
  });

  const handleSave = async () => {
    localStorage.setItem('zenpos_branchName', settings.branchName);
    localStorage.setItem('zenpos_phone', settings.phone);
    localStorage.setItem('zenpos_taxRate', settings.taxRate.toString());
    window.dispatchEvent(new Event('settings_updated'));
    
    if (settings.myPassword && settings.myPassword.length >= 3) {
      try {
        const tokenData = await fetch(apiUrl("/auth/me"), {
           headers: { "Authorization": `Bearer ${localStorage.getItem('zenpos_token')}` }
        }).then(r => r.json());
        
        if (tokenData && tokenData.sub) {
           await fetch(apiUrl(`/staff/${tokenData.sub}`), {
             method: "PUT",
             headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem('zenpos_token')}` },
             body: JSON.stringify({ password: settings.myPassword })
           });
           setSettings({...settings, myPassword: ""});
        }
      } catch(e) {
        console.error("Failed to update password", e);
      }
    }
    
    alert("Settings saved successfully!");
  };
  return (
    <div className="glass-panel" style={{ padding: '32px', maxWidth: '600px' }}>
      <h2 style={{ margin: 0, marginBottom: '24px' }}>System Settings</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '8px' }}>Branch Name</label>
          <input type="text" value={settings.branchName} onChange={e => setSettings({...settings, branchName: e.target.value})} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', outline: 'none' }} />
        </div>
        
        <div>
          <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '8px' }}>Contact Phone</label>
          <input type="text" value={settings.phone} onChange={e => setSettings({...settings, phone: e.target.value})} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', outline: 'none' }} />
        </div>

        <div>
          <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '8px' }}>Tax Rate (%)</label>
          <input type="number" value={settings.taxRate} onChange={e => setSettings({...settings, taxRate: Number(e.target.value)})} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', outline: 'none' }} />
        </div>

        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }}>
          <h3 style={{ margin: 0, marginBottom: '16px' }}>Account Security</h3>
          <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '8px' }}>Update My Password (Leave blank to keep current)</label>
          <input type="password" minLength={3} placeholder="Enter new password" value={settings.myPassword} onChange={e => setSettings({...settings, myPassword: e.target.value})} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', outline: 'none' }} />
        </div>

        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }}>
          <h3 style={{ margin: 0, marginBottom: '16px' }}>Theme Options</h3>
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '8px' }}>Primary Accent</label>
              <input 
                type="color" 
                defaultValue="#00f0ff"
                onChange={(e) => document.documentElement.style.setProperty('--accent-blue', e.target.value)}
                style={{ width: '100%', height: '50px', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border-glass)', borderRadius: '8px' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '8px' }}>Secondary Accent</label>
              <input 
                type="color" 
                defaultValue="#ff007f"
                onChange={(e) => document.documentElement.style.setProperty('--accent-pink', e.target.value)}
                style={{ width: '100%', height: '50px', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border-glass)', borderRadius: '8px' }}
              />
            </div>
          </div>
        </div>

        <button onClick={handleSave} className="rgb-button" style={{ marginTop: '24px', padding: '16px', fontSize: '16px' }}>Save Changes</button>
      </div>
    </div>
  );
}
