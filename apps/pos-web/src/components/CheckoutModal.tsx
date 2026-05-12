import { useState } from "react";
import { apiUrl } from "../config";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (paymentDetails: any) => void;
}

export function CheckoutModal({ isOpen, onClose, total, onConfirm }: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountGiven, setAmountGiven] = useState<number | "">("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerData, setCustomerData] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [customerMode, setCustomerMode] = useState<"SEARCH" | "NEW">("SEARCH");

  if (!isOpen) return null;

  const change = amountGiven !== "" ? Number(amountGiven) - total : 0;
  const isSufficient = amountGiven !== "" && Number(amountGiven) >= total;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="glass-panel" style={{ width: 'min(500px, 92vw)', padding: 'clamp(16px, 4vw, 32px)' }}>
        <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '28px' }}>Checkout</h2>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '20px' }}>
          <span>Total Due:</span>
          <span className="gradient-text" style={{ fontWeight: 700 }}>Rs {total}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {['CASH', 'CARD', 'WALLET', 'KHATA'].map(method => (
            <button
              key={method}
              className={`category-pill ${paymentMethod === method ? 'active' : ''}`}
              onClick={() => setPaymentMethod(method)}
            >
              {method}
            </button>
          ))}
        </div>

        {paymentMethod === 'CASH' && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Amount Given (Rs):</label>
            <input 
              type="number"
              value={amountGiven}
              onChange={(e) => setAmountGiven(e.target.value ? Number(e.target.value) : "")}
              style={{
                width: '100%', padding: '16px', borderRadius: '12px',
                background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)',
                color: 'white', fontSize: '18px', outline: 'none'
              }}
              autoFocus
            />
            {amountGiven !== "" && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', color: isSufficient ? '#00ff66' : '#ff007f' }}>
                <span>Change to return:</span>
                <span style={{ fontWeight: 700 }}>Rs {Math.max(0, change)}</span>
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid var(--border-glass)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
             <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-main)' }}>Customer Information (Optional)</h3>
             {customerMode === 'SEARCH' ? (
                <button onClick={() => { setCustomerMode('NEW'); setCustomerData(null); setSearchResults([]); setSearchQuery(""); }} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '14px' }}>+ New Customer</button>
             ) : (
                <button onClick={() => { setCustomerMode('SEARCH'); setCustomerName(""); setCustomerPhone(""); setCustomerAddress(""); }} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '14px' }}>Search Existing</button>
             )}
          </div>

          {customerMode === "SEARCH" && !customerData && (
            <div style={{ position: 'relative' }}>
              <input 
                type="text"
                placeholder="Search by Phone or Name..."
                value={searchQuery}
                onChange={async (e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  
                  if (val.length >= 3) {
                    setIsSearching(true);
                    try {
                       const token = localStorage.getItem('zenpos_token');
                       const res = await fetch(`${apiUrl("/customers")}?query=${val}`, { 
                         headers: { "Authorization": `Bearer ${token}` } 
                       });
                       const data = await res.json();
                       setSearchResults(data || []);
                    } catch(e) {
                       setSearchResults([]);
                    } finally {
                       setIsSearching(false);
                    }
                  } else {
                    setSearchResults([]);
                  }
                }}
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px',
                  background: 'var(--bg-dark)', border: '1px solid var(--border-glass)',
                  color: 'white', outline: 'none'
                }}
              />
              {isSearching && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Searching...</div>}
              
              {searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a24', border: '1px solid var(--border-glass)', borderRadius: '8px', marginTop: '4px', zIndex: 10, maxHeight: '150px', overflowY: 'auto' }}>
                   {searchResults.map(c => (
                     <div key={c.id} onClick={() => {
                        setCustomerData(c);
                        setCustomerName(c.fullName);
                        setCustomerPhone(c.phone);
                        setCustomerAddress(c.address || "");
                        setSearchResults([]);
                        setSearchQuery("");
                     }} style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                       <div style={{ fontWeight: 'bold' }}>{c.fullName}</div>
                       <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.phone}</div>
                     </div>
                   ))}
                </div>
              )}
            </div>
          )}

          {customerMode === "NEW" && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               <input 
                  type="text" placeholder="Full Name" value={customerName} onChange={e => setCustomerName(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: 'white', outline: 'none' }}
               />
               <input 
                  type="text" placeholder="Phone Number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: 'white', outline: 'none' }}
               />
               <input 
                  type="text" placeholder="Delivery Address (Street, City, Zone)" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: 'white', outline: 'none' }}
               />
             </div>
          )}

          {customerData && customerMode === "SEARCH" && (
            <div style={{ background: 'rgba(0,240,255,0.05)', border: '1px solid rgba(0,240,255,0.2)', padding: '12px', borderRadius: '8px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '16px' }}>{customerData.fullName}</strong>
                  <button onClick={() => { setCustomerData(null); setCustomerName(""); setCustomerPhone(""); setCustomerAddress(""); }} style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', cursor: 'pointer', fontSize: '12px' }}>Remove</button>
               </div>
               <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>{customerData.phone}</div>
               <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                 <span style={{ color: 'var(--accent-blue)' }}>★ {customerData.loyaltyPoints} Points</span>
                 {customerData.khataBalance > 0 && (
                   <span style={{ color: 'var(--accent-pink)' }}>Khata Due: Rs {customerData.khataBalance}</span>
                 )}
               </div>
            </div>
          )}

          {paymentMethod === 'KHATA' && !customerData && !customerName && (
             <p style={{ color: 'var(--accent-pink)', marginTop: '8px', fontSize: '14px' }}>
               * Customer required for Khata.
             </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
          <button 
            onClick={onClose}
            className="rgb-button" 
            style={{ flex: 1, padding: '16px' }}
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              const finalCustomerId = customerData ? customerData.id : undefined;
              const amt = amountGiven !== "" ? Number(amountGiven) : undefined;
              const chg = paymentMethod === "CASH" && amt !== undefined ? Math.max(0, amt - total) : undefined;
              onConfirm({ 
                method: paymentMethod === "WALLET" ? "MOBILE_WALLET" : paymentMethod,
                amount: total, 
                customerId: finalCustomerId, 
                customerName,
                customerPhone,
                customerAddress,
                amountGiven: paymentMethod === "CASH" ? amt : undefined,
                changeReturned: paymentMethod === "CASH" ? chg : undefined
              });
              setSearchQuery("");
              setCustomerPhone("");
              setCustomerName("");
              setCustomerAddress("");
              setCustomerData(null);
              setSearchResults([]);
              setCustomerMode("SEARCH");
            }}
            disabled={paymentMethod === 'CASH' && !isSufficient}
            className="rgb-button filled" 
            style={{ flex: 1, padding: '16px', opacity: (paymentMethod === 'CASH' && !isSufficient) ? 0.5 : 1 }}
          >
            Confirm Payment
          </button>
        </div>
      </div>
    </div>
  );
}
