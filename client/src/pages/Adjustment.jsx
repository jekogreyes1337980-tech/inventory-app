import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/db';
import { useToast } from '../components/shared/Toast';
import GlassCard from '../components/shared/GlassCard';
import DataTable from '../components/shared/DataTable';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import Modal from '../components/shared/Modal';

const ROLE_LABELS = { admin: 'Administrator', staff: 'Stock Room Staff', storefront: 'Store Front Staff' };

export default function Adjustment() {
  const { role } = useOutletContext();
  const showToast = useToast();
  const [products, setProducts] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [racks, setRacks] = useState([]);
  const [fulfillAdj, setFulfillAdj] = useState(null);
  const [fulfillRack, setFulfillRack] = useState('');

  useEffect(() => {
    (async () => {
      setProducts(await api.get('products') || []);
      setAdjustments(await api.get('adjustments') || []);
      setRacks(await api.get('racks') || []);
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const prodId = e.target.product.value;
    const type = e.target.type.value;
    const qty = parseInt(e.target.qty.value);
    if (!prodId || isNaN(qty) || qty <= 0) { showToast('Please enter a valid product and quantity.', 'warning'); return; }
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const adjs = [...adjustments];
    const adjId = 'ADJ-' + (1000 + adjs.length + 1);
    adjs.unshift({ id: adjId, date: new Date().toISOString(), type, productId: prodId, productName: prod.name, quantity: qty, status: 'Requested' });
    await api.set('adjustments', adjs);
    setAdjustments(adjs);
    const notifs = await api.get('notifications') || [];
    notifs.unshift({ id: 'notif-' + Date.now(), title: 'Inventory Adjustment ' + type + ' Requested', message: 'Fulfill: ' + (type === 'In' ? 'Put in' : 'Get out') + ' ' + qty + ' units of ' + prod.name + ' in Stock Room.', timestamp: new Date().toISOString(), role: 'staff', read: false });
    await api.set('notifications', notifs);
    showToast('Adjustment Request ' + adjId + ' logged.', 'success');
    e.target.reset();
  };

  const openFulfill = (adj) => {
    setFulfillAdj(adj);
    setFulfillRack('');
  };

  const fulfill = async () => {
    if (!fulfillRack) { showToast('No rack location selected.', 'warning'); return; }
    const adjs = adjustments.map((a) => {
      if (a.id === fulfillAdj.id) {
        const prod = products.find((p) => p.id === a.productId);
        if (prod) {
          if (a.type === 'In') {
            prod.stockRoomQty += a.quantity;
            if (!prod.racks.includes(fulfillRack)) prod.racks.push(fulfillRack);
          } else {
            if (prod.stockRoomQty < a.quantity) {
              showToast('Warning: Insufficient stock room quantity. Adjusting using remaining ' + prod.stockRoomQty + ' items.', 'warning');
              a.quantity = prod.stockRoomQty;
            }
            prod.stockRoomQty -= a.quantity;
          }
        }
        a.status = 'Completed';
        a.rackFlipped = fulfillRack;
      }
      return a;
    });
    await api.set('adjustments', adjs);
    await api.set('products', products);
    setAdjustments(adjs);
    const notifs = await api.get('notifications') || [];
    notifs.unshift({ id: 'notif-' + Date.now(), title: 'Adjustment Task Processed', message: 'Completed ' + (fulfillAdj.type === 'In' ? 'Store In' : 'Stock Out') + ' of ' + fulfillAdj.quantity + ' ' + fulfillAdj.productName + ' via ' + fulfillRack + '.', timestamp: new Date().toISOString(), role: 'admin', read: false });
    await api.set('notifications', notifs);
    setFulfillAdj(null);
    showToast('Adjustment completed.', 'success');
  };

  const adjProd = fulfillAdj ? products.find((p) => p.id === fulfillAdj.productId) : null;
  const rackList = fulfillAdj?.type === 'In' ? racks : (adjProd?.racks || []);

  return (
    <section className="tab-panel active">
      <div className="grid-2">
        <GlassCard style={{ display: role === 'admin' ? '' : 'none' }} data-role-only={role === 'admin' ? '' : 'none'}>
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Trigger Stock Adjustments (Admin)
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Select Product to Adjust</label>
              <select name="product" required>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (Stock Room: {p.stockRoomQty}, Storefront: {p.storefrontQty})</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Adjustment Action</label>
                <select name="type">
                  <option value="Out">Stock Out (Admin Needs Items)</option>
                  <option value="In">Stock In (Admin Adds Items)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input type="number" name="qty" placeholder="e.g. 5" min="1" required />
              </div>
            </div>
            <Button type="submit" className="w-full">Request Stockroom Fulfillment</Button>
          </form>
        </GlassCard>

        {role !== 'admin' && (
          <GlassCard>
            <h2 className="card-title">Internal Racks Fulfillments</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              As {ROLE_LABELS[role]}, view requested internal adjustments from the table. Run stock room extraction (for Stock Out requests) or shelve incoming items on designated racks (for Stock In requests).
            </p>
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Badge variant="success">Fulfillment Role Active</Badge>
            </div>
          </GlassCard>
        )}

        <GlassCard>
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            Adjustment Operations log
          </h2>
          <DataTable
            headers={['Adj ID', 'Date', 'Type', 'Product', 'Qty', 'Status', 'Action']}
            rows={adjustments.map((a) => (
              <>
                <td><strong>{a.id}</strong></td>
                <td>{new Date(a.date).toLocaleDateString()}</td>
                <td>{a.type === 'In' ? <Badge variant="success">Stock In</Badge> : <Badge variant="danger">Stock Out</Badge>}</td>
                <td>{a.productName}</td>
                <td>{a.quantity}</td>
                <td>{a.status === 'Requested' ? <Badge variant="warning">Awaiting Storage</Badge> : <Badge variant="success">Completed</Badge>}</td>
                <td>{a.status === 'Requested' ? (role === 'staff' ? <Button variant="primary" size="sm" onClick={() => openFulfill(a)}>Process Action</Button> : <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Awaiting Stock Room</span>) : '-'}</td>
              </>
            ))}
            emptyMessage="No stock adjustments recorded."
          />
        </GlassCard>
      </div>

      <Modal
        isOpen={!!fulfillAdj}
        onClose={() => setFulfillAdj(null)}
        title="Verify Stock Adjustment Action"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFulfillAdj(null)}>Cancel</Button>
            <Button variant="success" onClick={fulfill}>Execute Action & Close</Button>
          </>
        }
      >
        <div style={{ marginBottom: '1.25rem', fontSize: '0.95rem' }}>
          <p>Task Type: <strong>{fulfillAdj?.type === 'In' ? 'Stock In (Shelving)' : 'Stock Out (Retrieval)'}</strong></p>
          <p>Product: <strong>{fulfillAdj?.productName}</strong></p>
          <p>Target Qty: <strong>{fulfillAdj?.quantity}</strong> units</p>
        </div>
        <div className="form-group">
          <label>{fulfillAdj?.type === 'In' ? 'Choose Destination Rack:' : 'Select Rack to Pull From:'}</label>
          <select value={fulfillRack} onChange={(e) => setFulfillRack(e.target.value)} className="mt-2" style={{ marginTop: '0.5rem' }}>
            <option value="">-- Select Rack --</option>
            {rackList.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </Modal>
    </section>
  );
}
