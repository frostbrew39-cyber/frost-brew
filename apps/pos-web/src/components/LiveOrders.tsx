import { useState } from "react";
import { OrderTimerBadge } from "./OrderTimerBadge";

const CANCELLATION_REASONS = [
  "Customer changed mind",
  "Long wait time",
  "Payment issue",
  "Item out of stock",
  "Technical error",
  "Kitchen too busy",
  "Rider unavailable (Delivery)",
  "Wrong address entered",
  "Customer not responding",
  "Other"
];

export function LiveOrders({ orders, onCancelOrder, onFailOrder, onReprintOrder }: { orders: any[], onCancelOrder: (id: number, reason: string) => void, onFailOrder: (id: number, reason: string) => void, onReprintOrder: (order: any) => void }) {
  const [tab, setTab] = useState<"LIVE" | "HISTORY">("LIVE");
  const [reasonModal, setReasonModal] = useState<{ isOpen: boolean, orderId: number, type: 'CANCEL' | 'FAIL' }>({ isOpen: false, orderId: 0, type: 'CANCEL' });
  const [selectedReason, setSelectedReason] = useState(CANCELLATION_REASONS[0]);
  const [otherReason, setOtherReason] = useState("");
  const [filter, setFilter] = useState<"ALL" | "SUCCESSFUL" | "CANCELLED">("ALL");
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const [startDate, setStartDate] = useState(sevenDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const taxRate = Number(localStorage.getItem('zenpos_taxRate') || 10) / 100;

  const pendingOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'READY' || o.status === 'OUT_FOR_DELIVERY');
  const historyOrders = orders.filter(o => o.status === 'COMPLETED' || o.status === 'CANCELLED').sort((a,b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());

  const displayHistory = historyOrders.filter(o => {
     const isCancelled = o.status === "CANCELLED";
     if (filter === "SUCCESSFUL" && isCancelled) return false;
     if (filter === "CANCELLED" && !isCancelled) return false;
     
     const placedDate = new Date(o.placedAt).toISOString().split('T')[0];
     if (placedDate < startDate || placedDate > endDate) return false;
     
     return true;
  });

  const exportCSV = () => {
    let csv = `Order No,Date,Channel,Status,Reason,Total Amount (Rs)\n`;
    displayHistory.forEach((o: any) => {
      const amount = Math.round(o.items?.reduce((s:number, i:any) => s + (i.unitPrice * i.quantity), 0) * (1 + (o.taxRate ?? taxRate)) || 0);
      csv += `${o.orderNo},"${new Date(o.placedAt).toLocaleString()}",${o.channel},${o.status === "CANCELLED" ? 'CANCELLED' : o.status === "FAILED_DELIVERY" ? 'FAILED' : 'SUCCESSFUL'},"${o.cancellationReason || ''}",${amount}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Order_Logs_${startDate}_to_${endDate}.csv`;
    a.click();
  };

  const handlePrint = () => {
     document.body.classList.add("printing-formal-report");
     window.print();
     setTimeout(() => document.body.classList.remove("printing-formal-report"), 500);
  };

  return (
    <div className="glass-panel printable-report" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}>
      <div className="formal-print-only" style={{ display: 'none', background: '#fff', color: '#000', padding: '40px', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '2px solid #000', paddingBottom: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '28px' }}>FROST & BREW</h1>
          <p style={{ margin: '4px 0' }}>Order History & Cancellation Logs</p>
          <p style={{ margin: '4px 0', fontSize: '14px', color: '#555' }}>Period: {startDate} to {endDate}</p>
        </div>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ padding: '8px', border: '1px solid #ccc' }}>Order No</th>
              <th style={{ padding: '8px', border: '1px solid #ccc' }}>Date</th>
              <th style={{ padding: '8px', border: '1px solid #ccc' }}>Channel</th>
              <th style={{ padding: '8px', border: '1px solid #ccc' }}>Status</th>
              <th style={{ padding: '8px', border: '1px solid #ccc' }}>Reason</th>
              <th style={{ padding: '8px', border: '1px solid #ccc' }}>Total (Rs)</th>
            </tr>
          </thead>
          <tbody>
            {displayHistory.map((o: any) => (
              <tr key={o.id}>
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>{o.orderNo}</td>
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>{new Date(o.placedAt).toLocaleString()}</td>
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>{o.channel}</td>
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>{o.status === "CANCELLED" ? "CANCELLED" : o.status === "FAILED_DELIVERY" ? "FAILED" : "SUCCESSFUL"}</td>
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>{o.cancellationReason || "-"}</td>
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>Rs {Math.round(o.items?.reduce((s:number, i:any) => s + (i.unitPrice * i.quantity), 0) * (1 + (o.taxRate ?? taxRate)) || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="no-print" style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', alignItems: 'center' }}>
         <button onClick={() => setTab("LIVE")} className={`rgb-button ${tab === "LIVE" ? "filled" : ""}`}>Live Operations</button>
         <button onClick={() => setTab("HISTORY")} className={`rgb-button ${tab === "HISTORY" ? "filled" : ""}`}>Order History & Cancellation Logs</button>
         <button onClick={() => window.location.reload()} className="rgb-button" style={{ marginLeft: 'auto', fontSize: '12px', padding: '8px 16px', border: '1px solid var(--border-glass)' }}>🔄 Refresh Dashboard</button>
      </div>

      {tab === "LIVE" && (
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {pendingOrders.map(o => (
            <div key={o.id} className="glass-panel" style={{ padding: '16px', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '18px' }}>{o.orderNo}</div>
                  <span style={{ 
                    fontSize: '10px', 
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    background: o.status === 'READY' ? 'var(--accent-green)' : o.status === 'PREPARING' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)',
                    color: (o.status === 'READY' || o.status === 'PREPARING') ? '#000' : '#fff',
                    fontWeight: 700
                  }}>
                    {o.status}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>{o.channel} | Items: {o.items?.length || 0}</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setReasonModal({ isOpen: true, orderId: o.id, type: 'CANCEL' });
                    }}
                    style={{ background: 'var(--accent-pink)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', zIndex: 9999, position: 'relative' }}>
                    CANCEL ORDER
                  </button>
                  {o.channel === "DELIVERY" && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setReasonModal({ isOpen: true, orderId: o.id, type: 'FAIL' });
                      }}
                      style={{ background: 'transparent', border: '2px solid var(--accent-pink)', color: 'var(--accent-pink)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', zIndex: 9999, position: 'relative' }}>
                      MARK FAILED
                    </button>
                  )}
                </div>
              </div>
              <OrderTimerBadge placedAt={o.placedAt} status={o.status} />
            </div>
          ))}
          {pendingOrders.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No live orders right now.</p>}
        </div>
      )}

      {tab === "HISTORY" && (
        <div className="no-print" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
             <button onClick={() => setFilter("ALL")} style={{ padding: '6px 16px', borderRadius: '16px', border: '1px solid var(--border-glass)', cursor: 'pointer', background: filter === "ALL" ? 'var(--text-main)' : 'transparent', color: filter === "ALL" ? '#000' : 'var(--text-main)' }}>All Logs</button>
             <button onClick={() => setFilter("SUCCESSFUL")} style={{ padding: '6px 16px', borderRadius: '16px', border: '1px solid var(--border-glass)', cursor: 'pointer', background: filter === "SUCCESSFUL" ? 'var(--accent-green)' : 'transparent', color: filter === "SUCCESSFUL" ? '#000' : 'var(--text-main)' }}>Successful Only</button>
             <button onClick={() => setFilter("CANCELLED")} style={{ padding: '6px 16px', borderRadius: '16px', border: '1px solid var(--border-glass)', cursor: 'pointer', background: filter === "CANCELLED" ? 'var(--accent-pink)' : 'transparent', color: filter === "CANCELLED" ? '#000' : 'var(--text-main)' }}>Cancelled Only</button>
             
             <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
               <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }} />
               <span style={{ color: 'var(--text-muted)' }}>to</span>
               <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }} />
               
               <button onClick={exportCSV} className="rgb-button" style={{ padding: '6px 12px', fontSize: '12px', background: 'transparent' }}>CSV</button>
               <button onClick={handlePrint} className="rgb-button filled" style={{ padding: '6px 12px', fontSize: '12px' }}>Print Report</button>
             </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 8px', position: 'sticky', top: 0, background: 'var(--bg-main)' }}>Order No</th>
                <th style={{ padding: '12px 8px', position: 'sticky', top: 0, background: 'var(--bg-main)' }}>Date</th>
                <th style={{ padding: '12px 8px', position: 'sticky', top: 0, background: 'var(--bg-main)' }}>Items</th>
                <th style={{ padding: '12px 8px', position: 'sticky', top: 0, background: 'var(--bg-main)' }}>Channel</th>
                <th style={{ padding: '12px 8px', position: 'sticky', top: 0, background: 'var(--bg-main)' }}>Status</th>
                <th style={{ padding: '12px 8px', position: 'sticky', top: 0, background: 'var(--bg-main)' }}>Total Amount</th>
                <th style={{ padding: '12px 8px', position: 'sticky', top: 0, background: 'var(--bg-main)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayHistory.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                   <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{o.orderNo}</td>
                   <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{new Date(o.placedAt).toLocaleString()}</td>
                   <td style={{ padding: '12px 8px', maxWidth: '300px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {o.items?.map((i:any, idx:number) => (
                           <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                             {i.quantity}x {i.itemName || `Item ${i.menuItemId}`}
                           </span>
                        ))}
                      </div>
                   </td>
                   <td style={{ padding: '12px 8px' }}>{o.channel}</td>
                   <td style={{ padding: '12px 8px' }}>
                      {o.status === "CANCELLED" ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: 'var(--accent-pink)', fontWeight: 'bold', padding: '4px 8px', background: 'rgba(255,0,127,0.1)', borderRadius: '4px', textAlign: 'center' }}>CANCELLED</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Reason: {o.cancellationReason || "N/A"}</span>
                        </div>
                      ) : o.status === "FAILED_DELIVERY" ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: 'var(--accent-pink)', fontWeight: 'bold', padding: '4px 8px', background: 'rgba(255,0,127,0.1)', borderRadius: '4px', border: '1px solid var(--accent-pink)', textAlign: 'center' }}>FAILED</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Reason: {o.cancellationReason || "N/A"}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--accent-green)', fontWeight: 'bold', padding: '4px 8px', background: 'rgba(0,255,102,0.1)', borderRadius: '4px' }}>SUCCESSFUL</span>
                      )}
                   </td>
                   <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>
                     Rs {Math.round(o.items?.reduce((s:number, i:any) => s + (i.unitPrice * i.quantity), 0) * (1 + (o.taxRate ?? taxRate)) || 0).toLocaleString()}
                   </td>
                   <td style={{ padding: '12px 8px' }}>
                      {o.status !== "CANCELLED" && o.status !== "FAILED_DELIVERY" && (
                        <button onClick={() => onReprintOrder(o)} style={{ background: 'transparent', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                          Reprint
                        </button>
                      )}
                   </td>
                </tr>
              ))}
              {displayHistory.length === 0 && (
                 <tr><td colSpan={7} style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>No logs match your filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      )}
      {reasonModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: 'min(400px, 92vw)', padding: 'clamp(16px, 4vw, 32px)', background: 'var(--bg-card)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '20px' }}>
              {reasonModal.type === 'CANCEL' ? 'Cancel Order' : 'Mark Delivery Failed'}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '14px' }}>Please select a reason:</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {CANCELLATION_REASONS.map(r => (
                <button 
                  key={r}
                  onClick={() => setSelectedReason(r)}
                  style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-glass)', 
                    background: selectedReason === r ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                    color: selectedReason === r ? '#000' : '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontWeight: selectedReason === r ? 'bold' : 'normal',
                    fontSize: '14px'
                  }}
                >
                  {r}
                </button>
              ))}
            </div>

            {selectedReason === "Other" && (
              <textarea 
                placeholder="Enter custom reason..."
                value={otherReason}
                onChange={e => setOtherReason(e.target.value)}
                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', marginBottom: '24px', minHeight: '80px', outline: 'none' }}
              />
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setReasonModal({ ...reasonModal, isOpen: false })}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'transparent', color: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  const finalReason = selectedReason === "Other" ? otherReason : selectedReason;
                  if (reasonModal.type === 'CANCEL') {
                    onCancelOrder(reasonModal.orderId, finalReason);
                  } else {
                    onFailOrder(reasonModal.orderId, finalReason);
                  }
                  setReasonModal({ ...reasonModal, isOpen: false });
                  setOtherReason("");
                }}
                disabled={selectedReason === "Other" && !otherReason.trim()}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: 'var(--accent-pink)', color: '#fff', cursor: 'pointer', fontWeight: 'bold', opacity: (selectedReason === "Other" && !otherReason.trim()) ? 0.5 : 1 }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
