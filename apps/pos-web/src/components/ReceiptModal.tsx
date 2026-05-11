import { useState } from 'react';

export function ReceiptModal({ order, onClose }: { order: any, onClose: () => void }) {
  const [selectedPrints, setSelectedPrints] = useState<string[]>(["TOKEN", "CUSTOMER"]);
  const taxRate = Number(localStorage.getItem('zenpos_taxRate') || 10) / 100;

  const togglePrint = (type: string, isChecked: boolean) => {
    if (isChecked) setSelectedPrints([...selectedPrints, type]);
    else setSelectedPrints(selectedPrints.filter(t => t !== type));
  };
  
  if (!order) return null;

  const handlePrint = () => {
    document.body.classList.add("printing-receipt");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-receipt"), 500);
  };

  const renderReceiptBody = (type: "CUSTOMER" | "KITCHEN" | "COUNTER" | "DELIVERY" | "TOKEN") => (
    <div style={{ marginBottom: '0' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>FROST & BREW</h2>
        {type !== "KITCHEN" && type !== "TOKEN" && (
          <>
            <p style={{ margin: '4px 0', fontSize: '12px' }}>Branch: Main St. Branch</p>
            <p style={{ margin: '4px 0', fontSize: '12px' }}>Phone: +92 300 1234567</p>
          </>
        )}
        <p style={{ margin: '4px 0', fontSize: '12px' }}>Date: {new Date().toLocaleString()}</p>
        {type === "TOKEN" ? (
          <p style={{ margin: '8px 0', fontSize: '24px', fontWeight: 'bold', border: '2px solid #000', padding: '8px' }}>
            TOKEN: {order.orderNo}
          </p>
        ) : (
          <p style={{ margin: '8px 0', fontSize: '14px', fontWeight: 'bold', border: '1px solid #000', padding: '4px' }}>
             {type} RECEIPT
          </p>
        )}
      </div>

      <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '8px 0', marginBottom: '16px', fontSize: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Order No:</span> <strong style={{ fontSize: type === "KITCHEN" ? '18px' : '14px' }}>{order.orderNo}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Type:</span> <strong>{order.channel}</strong>
        </div>
        {type !== "KITCHEN" && type !== "TOKEN" && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Payment:</span> <strong>{order.paymentMethod || "CASH"}</strong>
          </div>
        )}
        {type === "COUNTER" && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Staff:</span> <strong>{order.placedByStaffName || "Cashier"}</strong>
          </div>
        )}
        {(type === "DELIVERY" || type === "CUSTOMER") && order.customerName && (
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dotted #000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Customer:</span> <strong>{order.customerName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Phone:</span> <strong>{order.customerPhone}</strong>
            </div>
            {(type === "DELIVERY" || type === "CUSTOMER") && (
              <div style={{ marginTop: '4px' }}>
                <span>Address:</span> <strong style={{ display: 'block', textAlign: 'right' }}>{order.customerAddress || "N/A"}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      <table style={{ width: '100%', fontSize: '14px', marginBottom: '16px' }}>
        <thead>
          <tr style={{ borderBottom: '1px dashed #000' }}>
            <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Qty</th>
            <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Item</th>
            {(type !== "KITCHEN" && type !== "TOKEN") && <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Amt</th>}
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item: any, i: number) => (
            <tr key={i}>
              <td style={{ paddingTop: '4px', verticalAlign: 'top' }}>{item.quantity}</td>
              <td style={{ paddingTop: '4px', fontWeight: type === "KITCHEN" ? 'bold' : 'normal' }}>
                 {item.itemName || `Item #${item.menuItemId}`}
                 {item.note && <div style={{ fontSize: '10px', paddingLeft: '8px' }}>* {item.note}</div>}
              </td>
              {(type !== "KITCHEN" && type !== "TOKEN") && (
                <td style={{ paddingTop: '4px', textAlign: 'right', verticalAlign: 'top' }}>Rs {(item.unitPrice || 0) * item.quantity}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {(type !== "KITCHEN" && type !== "TOKEN") && (
        <>
          <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <span>Rs {order.items?.reduce((sum: number, i: any) => sum + ((i.unitPrice || 0) * i.quantity), 0) || 0}</span>
          </div>
          <div style={{ fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
            <span>FBR Tax ({taxRate * 100}%):</span>
            <span>Rs {Math.round(order.items?.reduce((sum: number, i: any) => sum + ((i.unitPrice || 0) * i.quantity), 0) * taxRate || 0)}</span>
          </div>
          <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', fontSize: '16px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
            <span>GRAND TOTAL:</span>
            <span>Rs {Math.round(order.items?.reduce((sum: number, i: any) => sum + ((i.unitPrice || 0) * i.quantity), 0) * (1 + taxRate) || 0)}</span>
          </div>
        </>
      )}

      {type === "KITCHEN" && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
           <p style={{ margin: 0, fontSize: '10px' }}>|| ||| | ||| || || | |</p>
           <p style={{ margin: 0, fontSize: '10px' }}>{order.orderNo}</p>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px' }}>
        <p style={{ margin: '4px 0' }}>Thank you for visiting!</p>
        <p style={{ margin: '4px 0' }}>Powered by ZenPOS Pro</p>
      </div>
      
    </div>
  );

  return (
    <div className="receipt-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="thermal-receipt" style={{ width: '320px', padding: '24px 16px', background: '#fff', color: '#000', fontFamily: '"Courier New", Courier, monospace', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* NO-PRINT CONTROLS */}
        <div className="no-print" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
             <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
               <input type="checkbox" checked={selectedPrints.includes("TOKEN")} onChange={e => togglePrint("TOKEN", e.target.checked)} /> Token
             </label>
             <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
               <input type="checkbox" checked={selectedPrints.includes("CUSTOMER")} onChange={e => togglePrint("CUSTOMER", e.target.checked)} /> Customer (Invoice)
             </label>
             <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
               <input type="checkbox" checked={selectedPrints.includes("KITCHEN")} onChange={e => togglePrint("KITCHEN", e.target.checked)} /> Kitchen
             </label>
             <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
               <input type="checkbox" checked={selectedPrints.includes("DELIVERY")} onChange={e => togglePrint("DELIVERY", e.target.checked)} /> Delivery
             </label>
          </div>
          <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '8px' }}>
             <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                <input type="checkbox" checked={selectedPrints.length === 4} onChange={e => e.target.checked ? setSelectedPrints(["TOKEN", "CUSTOMER", "KITCHEN", "DELIVERY"]) : setSelectedPrints([])} style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                SELECT ALL RECEIPTS
             </label>
          </div>
        </div>

        {/* PRINTABLE AREA */}
        {selectedPrints.length > 0 ? (
          <>
            {selectedPrints.map((type, index) => (
              <div key={type}>
                {renderReceiptBody(type as any)}
                {index < selectedPrints.length - 1 && <div style={{ borderBottom: '2px dashed #000', margin: '24px 0', paddingBottom: '24px' }}></div>}
              </div>
            ))}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: '#999' }}>No receipts selected</div>
        )}

        <div className="no-print" style={{ marginTop: '32px', display: 'flex', gap: '8px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: '#ccc', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Close</button>
          <button onClick={handlePrint} style={{ flex: 1, padding: '12px', background: '#000', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Print</button>
        </div>
      </div>
    </div>
  );
}
