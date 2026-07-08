import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api } from '../api/db';
import GlassCard from '../components/shared/GlassCard';
import DataTable from '../components/shared/DataTable';
import Button from '../components/shared/Button';

const UNIT_RATES = {
  'Meters': 1,
  'Yards': 1.09361,
  'Feet': 3.28084,
  'Inches': 39.3701,
  'Centimeters': 100,
};

export default function Conversion() {
  const { role } = useOutletContext();

  const [products, setProducts] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [selectedProd, setSelectedProd] = useState('');
  const [inputUnit, setInputUnit] = useState('Meters');
  const [inputAmount, setInputAmount] = useState('');
  const [targetUnit, setTargetUnit] = useState('Yards');
  const [cutLength, setCutLength] = useState('1');
  const [actual, setActual] = useState('');

  const rollProducts = products.filter((p) => p.unit === 'rolls/meters');

  useEffect(() => {
    (async () => {
      setProducts(await api.get('products') || []);
      setConversions(await api.get('conversions') || []);
    })();
  }, []);

  const estimated = (() => {
    const inputQty = parseFloat(inputAmount);
    const cl = parseFloat(cutLength);
    if (!selectedProd || isNaN(inputQty) || inputQty <= 0 || isNaN(cl) || cl <= 0) return 0;
    
    // Convert input amount to target unit
    const inputToMeters = inputQty / UNIT_RATES[inputUnit];
    const targetAmount = inputToMeters * UNIT_RATES[targetUnit];
    return Math.floor(targetAmount / cl);
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === selectedProd);
    if (!prod) return;
    const inputQty = parseFloat(inputAmount);
    const cl = parseFloat(cutLength);
    const act = parseInt(actual);
    const est = estimated;

    if (!selectedProd || isNaN(inputQty) || inputQty <= 0 || isNaN(cl) || cl <= 0 || isNaN(act) || act < 0) {
      Swal.fire({ icon: 'warning', title: 'Please fill all details with valid positive parameters.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#f3f4f6' });
      return;
    }

    const deductedMeters = inputQty / UNIT_RATES[inputUnit];

    if (prod.stockRoomQty < deductedMeters) {
      Swal.fire({ icon: 'error', title: 'Insufficient roll meters in stock room (' + prod.stockRoomQty.toFixed(2) + 'm available).', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#f3f4f6' });
      return;
    }

    const rate = est > 0 ? (act / est) * 100 : 100;
    prod.stockRoomQty -= deductedMeters;
    prod.storefrontQty += act;
    const convs = [...conversions];
    convs.unshift({
      id: 'CONV-' + (100 + convs.length + 1),
      date: new Date().toISOString(),
      productId: prod.id, productName: prod.name,
      inputAmount: inputQty, inputUnit: inputUnit, 
      targetUnit: targetUnit, cutLength: cl,
      metersDeducted: deductedMeters, estimatedRolls: est,
      actualRolls: act, conversionRate: rate,
      operator: role === 'admin' ? 'Administrator' : role === 'staff' ? 'Stock Room Staff' : 'Store Front Staff',
    });

    await api.set('products', products);
    await api.set('conversions', convs);
    setProducts([...products]);
    setConversions(convs);
    Swal.fire({ icon: 'success', title: 'Roll stock conversion completed successfully!', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
    setInputAmount('');
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
              <strong>Note:</strong> Bulk product rolls are globally measured in <strong>Meters</strong> in the Stock Room. Storefront pre-cut rolls are sold by counts. This tool converts your extracted lengths back to Meters to properly deduct from the Stock Room.
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
                <label>Input Unit (From Stock Room)</label>
                <select value={inputUnit} onChange={(e) => setInputUnit(e.target.value)}>
                  {Object.keys(UNIT_RATES).map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Extracted Length</label>
                <input type="number" step="0.01" value={inputAmount} onChange={(e) => setInputAmount(e.target.value)} placeholder="e.g. 5" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Target Pre-cut Unit</label>
                <select value={targetUnit} onChange={(e) => setTargetUnit(e.target.value)}>
                  {Object.keys(UNIT_RATES).map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Length per Roll</label>
                <input type="number" step="0.01" value={cutLength} onChange={(e) => setCutLength(e.target.value)} placeholder="e.g. 1.0" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Estimated Rolls Output</label>
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
            headers={['Date', 'Product', 'Extraction', 'Target/Roll', 'Est Output', 'Act Output', 'Rate', 'Staff']}
            rows={conversions.map((c) => (
              <>
                <td>{new Date(c.date).toLocaleDateString()}</td>
                <td><strong>{c.productName}</strong></td>
                <td>{c.inputAmount ? `${c.inputAmount} ${c.inputUnit}` : `${c.metersDeducted} Meters`}</td>
                <td>{c.cutLength ? `${c.cutLength} ${c.targetUnit}` : '-'}</td>
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
