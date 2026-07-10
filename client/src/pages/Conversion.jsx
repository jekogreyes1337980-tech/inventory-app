import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api } from '../api/db';
import { socket } from '../api/socket';
import GlassCard from '../components/shared/GlassCard';
import DataTable from '../components/shared/DataTable';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';

export default function Conversion() {
  const { role, user } = useOutletContext();

  const [products, setProducts] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [selectedProd, setSelectedProd] = useState('');
  const [convertQty, setConvertQty] = useState('');

  const load = useCallback(async () => {
    setProducts(await api.get('products') || []);
    setConversions(await api.get('conversions') || []);
  }, []);

  useEffect(() => {
    load();
    const handleUpdate = () => load();
    socket.on('data_updated', handleUpdate);
    socket.on('data_reset', handleUpdate);
    return () => {
      socket.off('data_updated', handleUpdate);
      socket.off('data_reset', handleUpdate);
    };
  }, [load]);

  const selectedProduct = products.find((p) => p.id === selectedProd);

  const availableStock = selectedProduct
    ? selectedProduct.stockRoomQty - (selectedProduct.convertedStock || 0)
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = parseInt(convertQty);

    if (!selectedProd || isNaN(qty) || qty <= 0) {
      Swal.fire({ icon: 'warning', title: 'Please select a product and enter a valid quantity.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#f3f4f6' });
      return;
    }

    if (qty > availableStock) {
      Swal.fire({ icon: 'error', title: `Insufficient available stock. Only ${availableStock} units available for conversion.`, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#f3f4f6' });
      return;
    }

    const prod = products.find((p) => p.id === selectedProd);
    prod.convertedStock = (prod.convertedStock || 0) + qty;

    const convs = [...conversions];
    convs.unshift({
      id: 'CONV-' + (100 + convs.length + 1),
      date: new Date().toISOString(),
      productId: prod.id,
      productName: prod.name,
      quantity: qty,
      operator: user?.username || (role === 'admin' ? 'Administrator' : role === 'staff' ? 'Stock Room Staff' : 'Store Front Staff'),
    });

    await api.set('products', products);
    await api.set('conversions', convs);
    setProducts([...products]);
    setConversions(convs);
    Swal.fire({ icon: 'success', title: `${qty} units of ${prod.name} marked as converted.`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
    setConvertQty('');
  };

  return (
    <section className="tab-panel active">
      <div className="grid-2">
        <GlassCard>
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="6" y1="3" x2="6" y2="15"></line>
              <circle cx="18" cy="6" r="3"></circle>
              <circle cx="6" cy="18" r="3"></circle>
              <path d="M18 9a9 9 0 0 1-9 9"></path>
            </svg>
            Mark Stock as Converted
          </h2>

          <div style={{ borderLeft: '3px solid var(--info)', background: 'rgba(6,182,212,0.04)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.4, color: 'var(--text-muted)' }}>
              Select an inventory item and specify how many units to mark as converted. Converting stock tracks usage without reducing the total stock count. Available stock is calculated as <strong>Total Stock minus Converted Stock</strong>.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Select Inventory Item</label>
              <select value={selectedProd} onChange={(e) => { setSelectedProd(e.target.value); setConvertQty(''); }}>
                <option value="">-- Select Item --</option>
                {products.map((p) => {
                  const avail = p.stockRoomQty - (p.convertedStock || 0);
                  const unitLabel = p.unit === 'rolls/meters' ? 'meters' : 'pcs';
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} — Total: {p.stockRoomQty} {unitLabel}, Available: {avail} {unitLabel}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedProduct && (
              <div className="form-row" style={{ gap: '1rem', marginBottom: '1rem' }}>
                <GlassCard style={{ flex: 1, padding: '0.75rem', textAlign: 'center', margin: 0, background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Stock</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{selectedProduct.stockRoomQty}</div>
                </GlassCard>
                <GlassCard style={{ flex: 1, padding: '0.75rem', textAlign: 'center', margin: 0, background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Converted</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{selectedProduct.convertedStock || 0}</div>
                </GlassCard>
                <GlassCard style={{ flex: 1, padding: '0.75rem', textAlign: 'center', margin: 0, background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: availableStock > 0 ? 'var(--success)' : 'var(--danger)' }}>{availableStock}</div>
                </GlassCard>
              </div>
            )}

            <div className="form-group">
              <label>Quantity to Convert</label>
              <input
                type="number"
                value={convertQty}
                onChange={(e) => setConvertQty(e.target.value)}
                placeholder="e.g. 5"
                min="1"
                max={availableStock || 1}
                required
              />
            </div>

            <Button type="submit" variant="success" className="w-full" style={{ marginTop: '0.5rem' }}>
              Record Conversion
            </Button>
          </form>
        </GlassCard>

        <GlassCard>
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
            </svg>
            Conversion Logs
          </h2>
          <DataTable
            headers={['Date', 'Product', 'Qty Converted', 'Converted By']}
            rows={conversions.map((c) => (
              <>
                <td>{new Date(c.date).toLocaleDateString()}</td>
                <td><strong>{c.productName}</strong></td>
                <td>{c.quantity} units</td>
                <td><Badge variant="info">{c.operator}</Badge></td>
              </>
            ))}
            emptyMessage="No conversions recorded."
          />
        </GlassCard>
      </div>
    </section>
  );
}