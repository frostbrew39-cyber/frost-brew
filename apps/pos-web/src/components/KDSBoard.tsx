import { OrderTimerBadge } from "./OrderTimerBadge";

interface KDSBoardProps {
  orders: any[];
  onUpdateStatus: (id: number, status: string) => void;
}

export function KDSBoard({ orders, onUpdateStatus }: KDSBoardProps) {
  const pending = orders.filter(o => o.status === 'PENDING');
  const preparing = orders.filter(o => o.status === 'PREPARING');
  const ready = orders.filter(o => o.status === 'READY');

  const Column = ({ title, items, nextStatus, color }: any) => (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.4)', padding: '24px' }}>
      <h3 style={{ margin: 0, borderBottom: `2px solid ${color}`, paddingBottom: '12px' }}>{title} ({items.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
        {items.map((o: any) => (
          <div key={o.id} className="glass-panel" style={{ padding: '16px', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontWeight: 700, fontSize: '18px' }}>{o.orderNo}</span>
              <OrderTimerBadge placedAt={o.placedAt} status={o.status} />
            </div>
            <div style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>{o.channel}</div>
            {nextStatus && (
              <button 
                className="rgb-button" 
                style={{ padding: '8px 16px', fontSize: '14px', width: '100%', borderColor: color }}
                onClick={() => onUpdateStatus(o.id, nextStatus)}
              >
                Move to {nextStatus}
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>No orders</div>}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: '24px', height: '100%' }}>
      <Column title="New / Pending" items={pending} nextStatus="PREPARING" color="var(--accent-pink)" />
      <Column title="Preparing" items={preparing} nextStatus="READY" color="var(--accent-blue)" />
      <Column title="Ready for Pickup" items={ready} nextStatus="COMPLETED" color="var(--accent-green)" />
    </div>
  );
}
