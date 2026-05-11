import { useState } from 'react';

export function FBRTaxPage() {
  const [fbrData, setFbrData] = useState({
    posId: localStorage.getItem('fbr_posId') !== null ? localStorage.getItem('fbr_posId')! : '100124',
    ntn: localStorage.getItem('fbr_ntn') !== null ? localStorage.getItem('fbr_ntn')! : '3214567-8',
    status: 'Connected'
  });
  const [showSaved, setShowSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('fbr_posId', fbrData.posId);
    localStorage.setItem('fbr_ntn', fbrData.ntn);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  const handlePrint = () => {
    document.body.classList.add("printing-report");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-report"), 500);
  };

  return (
    <div className="printable-report glass-panel" style={{ padding: '32px', maxWidth: '800px' }}>
      <h2 style={{ margin: 0, marginBottom: '24px' }}>FBR Tax Integration</h2>
      
      {showSaved && (
        <div style={{
          position: 'absolute', top: '20px', right: '20px',
          background: 'var(--accent-green)', color: '#000',
          padding: '12px 24px', borderRadius: '12px',
          fontWeight: 'bold', zIndex: 100,
          boxShadow: '0 0 20px var(--accent-green)',
          animation: 'fadeInOut 3s forwards'
        }}>
           ✅ FBR Settings Saved
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ padding: '24px', background: 'var(--bg-card)' }}>
          <h3 style={{ margin: 0, marginBottom: '16px', color: 'var(--text-muted)' }}>Status</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 10px var(--accent-green)' }}></span>
            <span style={{ fontSize: '24px', fontWeight: 700 }}>{fbrData.status}</span>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', background: 'var(--bg-card)' }}>
          <h3 style={{ margin: 0, marginBottom: '16px', color: 'var(--text-muted)' }}>Generated Invoices</h3>
          <span style={{ fontSize: '24px', fontWeight: 700 }}>1,245 Today</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '8px' }}>FBR POS ID</label>
          <input type="text" value={fbrData.posId} onChange={(e) => setFbrData({...fbrData, posId: e.target.value})} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', outline: 'none' }} />
        </div>
        
        <div>
          <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '8px' }}>NTN Number</label>
          <input type="text" value={fbrData.ntn} onChange={(e) => setFbrData({...fbrData, ntn: e.target.value})} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', outline: 'none' }} />
        </div>

        <div className="no-print" style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
          <button onClick={handleSave} className="rgb-button" style={{ flex: 1, background: showSaved ? 'var(--accent-green)' : '', color: showSaved ? '#000' : '' }}>
            {showSaved ? "Configuration Saved!" : "Save Configuration"}
          </button>
          <button onClick={handlePrint} className="rgb-button filled" style={{ flex: 1 }}>Generate Tax Report (PDF)</button>
        </div>
      </div>
    </div>
  );
}
