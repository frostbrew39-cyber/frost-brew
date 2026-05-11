import { useState, useEffect } from 'react';
import { apiUrl } from "../config";

export function LoginScreen({ onLoginSuccess }: { onLoginSuccess: (token: string, user: any) => void }) {
  const [loginType, setLoginType] = useState<"ADMIN" | "STAFF">("STAFF");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [authData, setAuthData] = useState<{ token: string, user: any } | null>(null);
  const restaurantName = localStorage.getItem('zenpos_branchName') || "FROST & BREW";

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }
    setIsAuthenticating(true);
    try {
      const res = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Invalid credentials");
      } else {
        const role = data.user.role;
        if (loginType === "ADMIN" && role !== "MASTER_ADMIN" && role !== "ADMIN") {
          setError("Access Denied. You are not an Admin.");
          setIsAuthenticating(false);
          return;
        }
        if (loginType === "STAFF" && (role === "MASTER_ADMIN" || role === "ADMIN")) {
          setError("Admins must use the Admin Login portal.");
          setIsAuthenticating(false);
          return;
        }

        setAuthData(data);
        setShowAnimation(true);
        // Wait for cinematic animation to finish before proceeding
        setTimeout(() => {
          onLoginSuccess(data.token, data.user);
        }, 3000);
      }
    } catch (err) {
      setError("Server connection failed");
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (showAnimation) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: '#050100', // Very dark red/black
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
        overflow: 'hidden',
        color: '#ffcca1'
      }}>
        {/* Fire particles CSS injected directly */}
        <style>{`
          @keyframes fireFadeIn {
            0% { opacity: 0; transform: scale(0.8) translateY(50px); filter: blur(10px); }
            40% { opacity: 1; transform: scale(1.1) translateY(-10px); filter: blur(0px); text-shadow: 0 0 20px #ff3300, 0 0 40px #ff6600, 0 0 60px #ff9900; }
            100% { opacity: 1; transform: scale(1) translateY(0); text-shadow: 0 0 10px #ff3300, 0 0 20px #ff6600; }
          }
          @keyframes emberFloat {
            0% { transform: translateY(100vh) translateX(0) scale(1); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateY(-10vh) translateX(calc(100px - 200px * var(--r))) scale(0.5); opacity: 0; }
          }
          .ember {
            position: absolute;
            background: #ff6600;
            border-radius: 50%;
            filter: blur(2px);
            animation: emberFloat var(--d) linear infinite;
          }
        `}</style>
        
        {/* Embers */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="ember" style={{
             left: `${Math.random() * 100}%`,
             width: `${Math.random() * 8 + 4}px`,
             height: `${Math.random() * 8 + 4}px`,
             '--r': Math.random(),
             '--d': `${Math.random() * 2 + 1.5}s`
          } as React.CSSProperties} />
        ))}

        <div style={{ animation: 'fireFadeIn 2.5s ease-out forwards', textAlign: 'center', position: 'relative', zIndex: 10 }}>
          <h1 style={{ fontSize: '72px', margin: 0, fontFamily: 'serif', letterSpacing: '8px', textTransform: 'uppercase', color: '#fff', borderBottom: '2px solid #ff3300', paddingBottom: '16px' }}>
            {restaurantName.toUpperCase()}
          </h1>
          <p style={{ fontSize: '24px', letterSpacing: '4px', marginTop: '16px', color: '#ff9900' }}>
            WELCOME, {authData?.user?.fullName?.toUpperCase() || "WARRIOR"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, #1a0b12 0%, #050204 100%)',
      color: '#fff',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div className="glass-panel" style={{ width: 'min(400px, 92vw)', padding: 'clamp(20px, 5vw, 40px)', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(20, 5, 5, 0.4)', border: '1px solid rgba(255, 50, 50, 0.2)', boxShadow: '0 0 40px rgba(255,50,50,0.1)' }}>
        
        <h2 style={{ margin: 0, marginBottom: '8px', fontSize: '24px', color: '#ff9966', letterSpacing: '2px' }}>FROST & BREW</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Secure System Login</p>

        <div style={{ display: 'flex', gap: '8px', width: '100%', marginBottom: '32px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px' }}>
          <button 
            type="button"
            onClick={() => { setLoginType("STAFF"); setError(""); setUsername(""); setPassword(""); }}
            style={{ flex: 1, padding: '12px', border: 'none', background: loginType === "STAFF" ? 'rgba(255,255,255,0.1)' : 'transparent', color: loginType === "STAFF" ? '#fff' : 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }}
          >
            Staff Portal
          </button>
          <button 
            type="button"
            onClick={() => { setLoginType("ADMIN"); setError(""); setUsername(""); setPassword(""); }}
            style={{ flex: 1, padding: '12px', border: 'none', background: loginType === "ADMIN" ? 'rgba(255,51,0,0.2)' : 'transparent', color: loginType === "ADMIN" ? '#ff6633' : 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }}
          >
            Admin Portal
          </button>
        </div>

        {error && <div style={{ color: '#ff3333', marginBottom: '16px', fontSize: '14px', background: 'rgba(255,0,0,0.1)', padding: '8px 16px', borderRadius: '8px', width: '100%', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="e.g. admin"
              style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }} 
            />
          </div>
          
          <button type="submit" disabled={!username || !password || isAuthenticating} style={{
            padding: '16px 0', fontSize: '16px', fontWeight: 'bold', marginTop: '16px',
            background: (username && password) ? 'linear-gradient(135deg, #ff3300, #ff9900)' : 'rgba(255,255,255,0.05)', 
            border: 'none', color: '#fff', borderRadius: '12px', cursor: (username && password) ? 'pointer' : 'not-allowed',
            opacity: (username && password) ? 1 : 0.5
          }}>
            {isAuthenticating ? 'AUTHENTICATING...' : 'SECURE LOGIN'}
          </button>
        </form>

        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
           {loginType === "ADMIN" ? "Admin: admin / 123" : "Staff: cashier / 123"}
        </div>
      </div>
    </div>
  );
}
