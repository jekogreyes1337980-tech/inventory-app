import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/db';
import { socket } from '../api/socket';
import GlassCard from '../components/shared/GlassCard';
import DataTable from '../components/shared/DataTable';
import Badge from '../components/shared/Badge';

export default function Inventory() {
  const [products, setProducts] = useState([]);

  const loadProducts = useCallback(async () => {
    setProducts(await api.get('products') || []);
  }, []);

  useEffect(() => {
    loadProducts();
    
    const handleUpdate = (key) => {
      if (key === 'products') loadProducts();
    };

    socket.on('data_updated', handleUpdate);
    socket.on('data_reset', loadProducts);

    return () => {
      socket.off('data_updated', handleUpdate);
      socket.off('data_reset', loadProducts);
    };
  }, [loadProducts]);

  return (
    <section className="tab-panel active">
      <GlassCard>
        <div className="d-flex justify-between align-center" style={{ marginBottom: '1.25rem' }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
            Current Product Inventory & Rack Positions
          </h2>
        </div>

        <DataTable
          headers={['Product Name', 'Total Stock', 'Converted Stock', 'Available Stock', 'Stock Room Rack(s)']}
          rows={products.map((p) => {
            const available = p.stockRoomQty - (p.convertedStock || 0);
            const isLow = p.storefrontQty < p.threshold;
            const unitLabel = p.unit === 'rolls/meters' ? 'meters' : 'pcs';
            return (
              <>
                <td>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.category}</div>
                </td>
                <td><strong>{p.stockRoomQty}</strong> <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{unitLabel}</span></td>
                <td><strong style={{ color: 'var(--warning)' }}>{p.convertedStock || 0}</strong> <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{unitLabel}</span></td>
                <td>
                  <strong style={{ color: available > 0 ? 'var(--success)' : 'var(--danger)' }}>{available}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}> {unitLabel}</span>
                  <div style={{ marginTop: '0.25rem' }}>
                    {p.storefrontQty < p.threshold ? <Badge variant="danger">Low Stock</Badge> : <Badge variant="success">OK</Badge>}
                  </div>
                </td>
                <td>{p.racks.map((r) => <Badge key={r}>{r}</Badge>)}</td>
              </>
            );
          })}
          emptyMessage="No products found."
        />
      </GlassCard>
    </section>
  );
}
