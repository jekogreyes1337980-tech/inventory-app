import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api } from '../api/db';
import GlassCard from '../components/shared/GlassCard';
import DataTable from '../components/shared/DataTable';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import Modal from '../components/shared/Modal';

export default function StockOutSF() {
  const { role } = useOutletContext();

  const [products, setProducts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [fulfillReq, setFulfillReq] = useState(null);
  const [selectedRack, setSelectedRack] = useState('');

  useEffect(() => {
    (async () => {
      setProducts(await api.get('products') || []);
      setRequests(await api.get('storefrontRequests') || []);
    })();
  }, []);

  const lowProducts = products.filter((p) => p.storefrontQty < p.threshold);

  const requestRestock = async (prodId) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const reqQty = prod.threshold * 2;
    const reqs = [...requests];
    const reqId = 'SF-REQ-' + (100 + reqs.length + 1);
    reqs.unshift({ id: reqId, productId: prodId, productName: prod.name, quantity: reqQty, dateCreated: new Date().toISOString(), status: 'Pending' });
    await api.set('storefrontRequests', reqs);
    setRequests(reqs);
    const notifs = await api.get('notifications') || [];
    notifs.unshift({ id: 'notif-' + Date.now(), title: 'Storefront Stock Replenish Requested', message: 'Bring out ' + reqQty + ' units of ' + prod.name + ' from Rack locations to storefront.', timestamp: new Date().toISOString(), role: 'staff', read: false });
    await api.set('notifications', notifs);
    Swal.fire({ icon: 'success', title: 'Restock request sent.', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
  };

  const handleManualRequest = async (e) => {
    e.preventDefault();
    const prodId = e.target.product.value;
    const qty = parseInt(e.target.qty.value);
    if (!prodId || isNaN(qty) || qty <= 0) { Swal.fire({ icon: 'warning', title: 'Please enter a valid product and quantity.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#f3f4f6' }); return; }
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const reqs = [...requests];
    const reqId = 'SF-REQ-' + (100 + reqs.length + 1);
    reqs.unshift({ id: reqId, productId: prodId, productName: prod.name, quantity: qty, dateCreated: new Date().toISOString(), status: 'Pending' });
    await api.set('storefrontRequests', reqs);
    setRequests(reqs);
    const notifs = await api.get('notifications') || [];
    notifs.unshift({ id: 'notif-' + Date.now(), title: 'Fulfillment Requested', message: 'Move ' + qty + ' units of ' + prod.name + ' from racks to storefront.', timestamp: new Date().toISOString(), role: 'staff', read: false });
    await api.set('notifications', notifs);
    Swal.fire({ icon: 'success', title: 'Request created.', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
    e.target.reset();
  };

  const openFulfill = (req) => {
    setFulfillReq(req);
    setSelectedRack('');
  };

  const submitFulfillment = async () => {
    if (!selectedRack) { Swal.fire({ icon: 'warning', title: 'Please select a rack source.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#f3f4f6' }); return; }
    const reqs = requests.map((r) => {
      if (r.id === fulfillReq.id) {
        const prod = products.find((p) => p.id === r.productId);
        if (prod) {
          if (prod.stockRoomQty < r.quantity) {
            Swal.fire({ icon: 'warning', title: 'Warning: Insufficient stock room quantity. Moving remaining ' + prod.stockRoomQty + ' items instead.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#f3f4f6' });
            r.quantity = prod.stockRoomQty;
          }
          prod.stockRoomQty -= r.quantity;
          prod.storefrontQty += r.quantity;
        }
        r.status = 'Completed';
        r.rackSource = selectedRack;
      }
      return r;
    });
    await api.set('storefrontRequests', reqs);
    await api.set('products', products);
    setRequests(reqs);
    const notifs = await api.get('notifications') || [];
    const req = fulfillReq;
    notifs.unshift({ id: 'notif-' + Date.now(), title: 'Storefront Stock Filled', message: 'Delivered ' + req.quantity + ' of ' + req.productName + ' from ' + selectedRack + ' to storefront shelves.', timestamp: new Date().toISOString(), role: 'admin', read: false });
    await api.set('notifications', notifs);
    setFulfillReq(null);
    Swal.fire({ icon: 'success', title: 'Stock out completed.', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
  };

  const prodForFulfill = fulfillReq ? products.find((p) => p.id === fulfillReq.productId) : null;

  return (
    <section className="tab-panel active">
      <div className="grid-2">
        <GlassCard style={{ display: role === 'admin' || role === 'storefront' ? '' : 'none' }} data-role-only={role === 'admin' || role === 'storefront' ? '' : 'none'}>
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Low Storefront Replenish Requests
          </h2>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.75rem', color: 'var(--warning)' }}>Storefront Low Stock Alerts</h4>
            <div id="sf-low-stock-warnings">
              {lowProducts.length === 0 ? (
                <div className="no-data">All storefront stock levels are healthy!</div>
              ) : (
                lowProducts.map((p) => (
                  <div key={p.id} className="list-item" style={{ borderColor: 'var(--danger-glow)' }}>
                    <div className="list-item-meta">
                      <span className="list-item-title">{p.name}</span>
                      <span className="list-item-subtitle" style={{ color: 'var(--danger)' }}>Storefront Stock: {p.storefrontQty} / Min: {p.threshold}</span>
                    </div>
                    <Button variant="warning" size="sm" onClick={() => requestRestock(p.id)}>Request Restock</Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 style={{ marginBottom: '0.75rem' }}>Manual Movement Request</h4>
            <form onSubmit={handleManualRequest}>
              <div className="form-group">
                <label>Select Inventory Product</label>
                <select name="product" required>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (Stock Room: {p.stockRoomQty}, Storefront: {p.storefrontQty})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Quantity to Move Out</label>
                <input type="number" name="qty" placeholder="e.g. 10" min="1" required />
              </div>
              <Button type="submit" className="w-full">Submit Movement Request</Button>
            </form>
          </div>
        </GlassCard>

        {role !== 'admin' && role !== 'storefront' && (
          <GlassCard>
            <h2 className="card-title">Storefront Stock Movement</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              As Stock Room Staff, look at the movement tracker panel to verify requested store fronts items, extract them from stock room racks, and record completion of the stock out.
            </p>
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Badge variant="success">Fulfillment Role Active</Badge>
            </div>
          </GlassCard>
        )}

        <GlassCard>
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="17" y1="21" x2="17" y2="3"></line>
              <polyline points="20 18 17 21 14 18"></polyline>
              <line x1="7" y1="3" x2="7" y2="21"></line>
              <polyline points="10 6 7 3 4 6"></polyline>
            </svg>
            Movement & Shelving Log
          </h2>
          <DataTable
            headers={['Req ID', 'Product', 'Qty', 'Requested Date', 'Status', 'Action']}
            rows={requests.map((r) => (
              <>
                <td><strong>{r.id}</strong></td>
                <td>{r.productName}</td>
                <td>{r.quantity}</td>
                <td>{new Date(r.dateCreated).toLocaleDateString()}</td>
                <td>{r.status === 'Pending' ? <Badge variant="warning">Pending Fulfillment</Badge> : <Badge variant="success">Completed</Badge>}</td>
                <td>{r.status === 'Pending' ? (role === 'staff' ? <Button variant="primary" size="sm" onClick={() => openFulfill(r)}>Fulfill Movement</Button> : <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Awaiting Stock Room Staff</span>) : '-'}</td>
              </>
            ))}
            emptyMessage="No stock movement requests."
          />
        </GlassCard>
      </div>

      <Modal
        isOpen={!!fulfillReq}
        onClose={() => setFulfillReq(null)}
        title="Record Stock Out Movement"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFulfillReq(null)}>Cancel</Button>
            <Button variant="success" onClick={submitFulfillment}>Shelve & Close Stock Out</Button>
          </>
        }
      >
        <div style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>
          <p>Product: <strong>{fulfillReq?.productName}</strong></p>
          <p>Quantity to Move: <strong>{fulfillReq?.quantity}</strong> units</p>
        </div>
        <div className="form-group">
          <label>Select Rack Location to Extract Items From:</label>
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {prodForFulfill ? (
              prodForFulfill.racks.length === 0 ? (
                <Badge variant="danger">No defined racks in database</Badge>
              ) : (
                prodForFulfill.racks.map((rack, idx) => (
                  <div key={rack} style={{ marginBottom: '0.5rem' }}>
                    <input type="radio" id={'sf-rack-' + idx} name="sf-fulfill-rack" value={rack}
                      checked={selectedRack === rack} onChange={() => setSelectedRack(rack)} />
                    <label htmlFor={'sf-rack-' + idx} style={{ color: 'var(--text-main)', fontWeight: 500, cursor: 'pointer', marginLeft: '0.5rem' }}>
                      {rack} (Stock Room Availability: {prodForFulfill.stockRoomQty})
                    </label>
                  </div>
                ))
              )
            ) : <Badge variant="danger">Product not found</Badge>}
          </div>
        </div>
      </Modal>
    </section>
  );
}
