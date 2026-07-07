import { useState, useEffect } from 'react';
import { api } from '../api/db';
import GlassCard from '../components/shared/GlassCard';
import DataTable from '../components/shared/DataTable';
import Badge from '../components/shared/Badge';

export default function Inventory() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    (async () => setProducts(await api.get('products') || []))();
  }, []);

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
          headers={['Product Name & Type', 'Stock Room Quantity', 'Storefront Stock', 'Stock Room Rack(s)', 'Unit Cost', 'Selling Price']}
          rows={products.map((p) => {
            const isLow = p.storefrontQty < p.threshold;
            const stockRoomUnit = p.unit === 'rolls/meters' ? 'meters' : 'pcs';
            const storefrontUnit = p.unit === 'rolls/meters' ? 'pcs (pre-cut)' : 'pcs';
            return (
              <>
                <td>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.category}</div>
                </td>
                <td><strong>{p.stockRoomQty}</strong> <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{stockRoomUnit}</span></td>
                <td>
                  <strong>{p.storefrontQty}</strong> <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{storefrontUnit}</span>
                  <div style={{ marginTop: '0.25rem' }}>
                    {isLow ? <Badge variant="danger">Low Stock</Badge> : <Badge variant="success">OK</Badge>}
                  </div>
                </td>
                <td>{p.racks.map((r) => <Badge key={r}>{r}</Badge>)}</td>
                <td>&#x20B1;{p.cost.toFixed(2)}</td>
                <td>&#x20B1;{p.price.toFixed(2)}</td>
              </>
            );
          })}
          emptyMessage="No products found."
        />
      </GlassCard>
    </section>
  );
}
