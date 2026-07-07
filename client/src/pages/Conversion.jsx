import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api } from '../api/db';
import GlassCard from '../components/shared/GlassCard';
import DataTable from '../components/shared/DataTable';
import Button from '../components/shared/Button';

export default function Conversion() {
  const { role } = useOutletContext();

  const [products, setProducts] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [selectedProd, setSelectedProd] = useState('');
  const [meters, setMeters] = useState('');
  const [cutLength, setCutLength] = useState('1.09361');
  const [actual, setActual] = useState('');

  const rollProducts = products.filter((p) => p.unit === 'rolls/meters');

  useEffect(() => {
    (async () => {
      setProducts(await api.get('products') || []);
      setConversions(await api.get('conversions') || []);
    })();
  }, []);

  const estimated = (() => {
    const m = parseFloat(meters);
    const cl = parseFloat(cutLength);
    if (!selectedProd || isNaN(m) || m <= 0 || isNaN(cl) || cl <= 0) return 0;
    return Math.floor((m * 1.09361) / cl);
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === selectedProd);
    if (!prod) return;
    const m = parseFloat(meters);
    const cl = parseFloat(cutLength);
    const act = parseInt(actual);
    const est = estimated;

    if (!selectedProd || isNaN(m) || m <= 0 || isNaN(cl) || cl <= 0 || isNaN(act) || act < 0) {
      Swal.fire({ icon: 'warning', title: 'Please fill all details with valid positive parameters.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#f3f4f6' });
      return;
    }
    if (prod.stockRoomQty < m) {
      Swal.fire({ icon: 'error', title: 'Insufficient roll meters in stock room (' + prod.stockRoomQty + 'm available).', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#f3f4f6' });
      return;
    }

    const rate = est > 0 ? (act / est) * 100 : 100;
    prod.stockRoomQty -= m;
    prod.storefrontQty += act;
    const convs = [...conversions];
    convs.unshift({
      id: 'CONV-' + (100 + convs.length + 1),
      date: new Date().toISOString(),
      productId: prod.id, productName: prod.name,
      metersDeducted: m, estimatedRolls: est,
      actualRolls: act, conversionRate: rate,
      operator: role === 'admin' ? 'Administrator' : role === 'staff' ? 'Stock Room Staff' : 'Store Front Staff',
    });

    await api.set('products', products);
    await api.set('conversions', convs);
    setProducts([...products]);
    setConversions(convs);
    Swal.fire({ icon: 'success', title: 'Roll stock conversion completed successfully!', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
    setMeters('');
    setActual('');
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
            Pre-cut Roll Conversion Calculator (Yards to Meters)
          </h2>

          <div style={{ borderLeft: '3px solid var(--info)', background: 'rgba(6,182,212,0.04)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.4, color: 'var(--text-muted)' }}>
              <strong>Note:</strong> Bulk product rolls are measured and purchased in Meters. Storefront pre-cut rolls are sold and measured in Yards. The system estimates output rolls based on <code>1 Meter = 1.09361 Yards</code>.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Select Roll Product in Stock Room</label>
              <select value={selectedProd} onChange={(e) => setSelectedProd(e.target.value)}>
                <option value="">-- Select Roll Product --</option>
                {rollProducts.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (Stock Room: {p.stockRoomQty} meters)</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Length to Cut (Meters)</label>
                <input type="number" step="0.1" value={meters} onChange={(e) => setMeters(e.target.value)} placeholder="e.g. 5" />
              </div>
              <div className="form-group">
                <label>Pre-cut Target Length (Yards)</label>
                <input type="number" step="0.1" value={cutLength} onChange={(e) => setCutLength(e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Estimated Rolls Output (Yards)</label>
                <input type="number" readOnly value={estimated} style={{ background: 'rgba(255,255,255,0.02)', fontWeight: 600, color: 'var(--info)' }} />
              </div>
              <div className="form-group">
                <label>Actual Pre-cut Rolls Produced</label>
                <input type="number" value={actual} onChange={(e) => setActual(e.target.value)} placeholder="Actual rolls produced" required />
              </div>
            </div>

            <Button type="submit" variant="success" className="w-full" style={{ marginTop: '0.5rem' }}>
              Record Conversion & Stock to Storefront
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
            headers={['Date', 'Product', 'Cut Length', 'Est Output', 'Act Output', 'Rate', 'Staff']}
            rows={conversions.map((c) => (
              <>
                <td>{new Date(c.date).toLocaleDateString()}</td>
                <td><strong>{c.productName}</strong></td>
                <td>{c.metersDeducted}m</td>
                <td>{c.estimatedRolls} rolls</td>
                <td>{c.actualRolls} rolls</td>
                <td><strong>{c.conversionRate.toFixed(1)}%</strong></td>
                <td>{c.operator}</td>
              </>
            ))}
            emptyMessage="No roll conversions recorded."
          />
        </GlassCard>
      </div>
    </section>
  );
}
