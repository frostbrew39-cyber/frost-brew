import { useState } from 'react';

export function MenuManagement({ items, onUpdateItems }: { items: any[], onUpdateItems: (items: any[]) => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '', category: 'Burgers', price: '', img: ''
  });

  const handleDelete = (id: number) => {
    onUpdateItems(items.filter(item => item.id !== id));
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({ name: item.name, category: item.category, price: item.price.toString(), img: item.img });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ name: '', category: 'Burgers', price: '', img: '' });
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({...formData, img: event.target?.result as string});
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (editingItem) {
      onUpdateItems(items.map(item => item.id === editingItem.id ? { ...item, ...formData, price: Number(formData.price) } : item));
    } else {
      const newItem = { id: Date.now(), ...formData, price: Number(formData.price) };
      onUpdateItems([...items, newItem]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}>Menu Management</h2>
        <button className="rgb-button" onClick={handleAdd} style={{ padding: '8px 16px', fontSize: '14px', width: 'auto' }}>+ Add Menu Item</button>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form className="glass-panel" onSubmit={handleSubmit} style={{ width: 'min(400px, 92vw)', padding: 'clamp(16px, 4vw, 32px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0 }}>{editingItem ? 'Edit Item' : 'New Menu Item'}</h3>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Name</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Category</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }}>
                <option>Burgers</option>
                <option>Sides</option>
                <option>Drinks</option>
                <option>Coffee</option>
                <option>Ice Cream</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Price (Rs)</label>
              <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Image Upload</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: '8px', outline: 'none' }} />
              {formData.img && <img src={formData.img} alt="Preview" style={{ width: '80px', height: '80px', marginTop: '12px', borderRadius: '8px', objectFit: 'cover' }} />}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button type="button" onClick={() => setIsModalOpen(false)} className="rgb-button" style={{ flex: 1, padding: '12px' }}>Cancel</button>
              <button type="submit" className="rgb-button filled" style={{ flex: 1, padding: '12px' }}>Save</button>
            </div>
          </form>
        </div>
      )}

      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
            <th style={{ padding: '12px 0' }}>Preview</th>
            <th style={{ padding: '12px 0' }}>Name</th>
            <th style={{ padding: '12px 0' }}>Category</th>
            <th style={{ padding: '12px 0' }}>Price</th>
            <th style={{ padding: '12px 0', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ padding: '12px 0' }}>
                <img src={item.img} alt="" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} />
              </td>
              <td style={{ padding: '16px 0', fontWeight: 600 }}>{item.name}</td>
              <td style={{ padding: '16px 0' }}>
                <span className="category-pill" style={{ padding: '4px 12px', fontSize: '12px' }}>{item.category}</span>
              </td>
              <td style={{ padding: '16px 0', color: 'var(--accent-blue)', fontWeight: 'bold' }}>Rs {item.price}</td>
              <td style={{ padding: '16px 0', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center', height: '100%' }}>
                <button onClick={() => handleEdit(item)} style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => handleDelete(item.id)} style={{ background: 'transparent', border: '1px solid var(--accent-pink)', color: 'var(--accent-pink)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
