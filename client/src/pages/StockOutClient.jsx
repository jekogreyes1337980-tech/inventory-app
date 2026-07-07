import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api } from '../api/db';
import GlassCard from '../components/shared/GlassCard';
import DataTable from '../components/shared/DataTable';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import Timeline from '../components/shared/Timeline';

const CLIENT_STEPS = [
  { title: 'Order Logged', desc: 'Order details recorded by Admin / Staff.' },
  { title: 'Collected & Set Aside', desc: 'Stock room staff retrieved products and set them in front of the stock room.' },
  { title: 'Store Front Verified', desc: 'Store front staff checked accuracy of order products.' },
  { title: 'Completed & Dispatched', desc: 'Client picked up the order. Hand-off complete.' },
];

export default function StockOutClient() {
  const { role } = useOutletContext();

  const [products, setProducts] = useState([]);
  const [clientOrders, setClientOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');

  useEffect(() => {
    (async () => {
      setProducts(await api.get('products') || []);
      setClientOrders(await api.get('clientOrders') || []);
    })();
  }, []);

  const selected = clientOrders.find((o) => o.id === selectedOrderId);

  const activeStepIdx = (status) => {
    if (status === 'Pending Staff Collection') return 0;
    if (status === 'Pending Store Front Check') return 1;
    if (status === 'Ready for Delivery/Pick-up') return 2;
    if (status === 'Closed') return 3;
    return 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const clientName = e.target.clientName.value;
    const items = [];
    products.forEach((p) => {
      const chk = e.target['chk-' + p.id];
      const qtyInput = e.target['qty-' + p.id];
      if (chk?.checked && qtyInput) {
        const qty = parseInt(qtyInput.value);
        if (!isNaN(qty) && qty > 0) items.push({ productId: p.id, productName: p.name, orderedQty: qty, collectedQty: null, rackSource: null });
      }
    });
    if (!clientName || items.length === 0) { Swal.fire({ icon: 'warning', title: 'Please enter client details and select products.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#f3f4f6' }); return; }

    const orders = [...clientOrders];
    const orderId = 'CO-' + (5000 + orders.length + 1);
    orders.unshift({ id: orderId, clientName, dateCreated: new Date().toISOString(), status: 'Pending Staff Collection', items });
    await api.set('clientOrders', orders);
    setClientOrders(orders);
    setSelectedOrderId(orderId);
    const notifs = await api.get('notifications') || [];
    notifs.unshift({ id: 'notif-' + Date.now(), title: 'New Big Client Order', message: 'Retrieve and record ' + items.length + ' products for client ' + clientName + '.', timestamp: new Date().toISOString(), role: 'staff', read: false });
    await api.set('notifications', notifs);
    Swal.fire({ icon: 'success', title: 'Client Order ' + orderId + ' logged.', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
  };

  const handleStaffCollect = async () => {
    if (!selected) return;
    const orders = clientOrders.map((o) => o.id === selected.id ? { ...o } : o);
    const order = orders.find((o) => o.id === selected.id);
    for (const item of order.items) {
      const qtyInput = document.getElementById('col-qty-' + item.productId);
      const rackSelect = document.getElementById('col-rack-' + item.productId);
      if (qtyInput && rackSelect) {
        const colQty = parseInt(qtyInput.value);
        if (isNaN(colQty) || colQty < 0) { Swal.fire({ icon: 'warning', title: 'Please enter a valid collection count.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#f3f4f6' }); return; }
        item.collectedQty = colQty;
        item.rackSource = rackSelect.value;
      }
    }
    order.status = 'Pending Store Front Check';
    await api.set('clientOrders', orders);
    setClientOrders(orders);
    const notifs = await api.get('notifications') || [];
    notifs.unshift({ id: 'notif-' + Date.now(), title: 'Client Order Set Aside', message: 'Items for ' + order.clientName + ' (Order ' + selected.id + ') are set in front. Store Staff please verify.', timestamp: new Date().toISOString(), role: 'storefront', read: false });
    await api.set('notifications', notifs);
    Swal.fire({ icon: 'success', title: 'Products collected and set aside.', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
  };

  const handleVerify = async () => {
    if (!selected) return;
    const orders = clientOrders.map((o) => { if (o.id === selected.id) o.status = 'Ready for Delivery/Pick-up'; return o; });
    await api.set('clientOrders', orders);
    setClientOrders(orders);
    const notifs = await api.get('notifications') || [];
    notifs.unshift({ id: 'notif-' + Date.now(), title: 'Client Order Verification Cleared', message: 'Order ' + selected.id + ' for ' + selected.clientName + ' has been verified complete.', timestamp: new Date().toISOString(), role: 'admin', read: false });
    await api.set('notifications', notifs);
    Swal.fire({ icon: 'success', title: 'Store front verification completed. Ready for delivery.', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
  };

  const handleDispatch = async () => {
    if (!selected) return;
    const orders = clientOrders.map((o) => {
      if (o.id === selected.id) {
        o.status = 'Closed';
        o.items.forEach((item) => {
          const prod = products.find((p) => p.id === item.productId);
          if (prod) prod.stockRoomQty = Math.max(0, prod.stockRoomQty - item.collectedQty);
        });
      }
      return o;
    });
    await api.set('clientOrders', orders);
    await api.set('products', products);
    setClientOrders(orders);
    Swal.fire({ icon: 'success', title: 'Client Order delivered. Inventory stock room counts updated.', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
  };

  const renderActions = () => {
    if (!selected) return null;
    if (selected.status === 'Pending Staff Collection') {
      if (role === 'staff') {
        return (
          <div>
            <h4>Collect Products (Stock Room Staff)</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Collect counts from racks and set them in front of the stock room:</p>
            <div style={{ marginBottom: '1.25rem' }}>
              {selected.items.map((item) => {
                const prod = products.find((p) => p.id === item.productId);
                const racks = prod ? prod.racks : [];
                return (
                  <div key={item.productId} className="input-grid-item">
                    <span className="input-grid-name">{item.productName} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Ordered: {item.orderedQty})</span></span>
                    <input type="number" id={'col-qty-' + item.productId} defaultValue={item.orderedQty} min="0" className="input-grid-qty" placeholder="Col Qty" />
                    <select id={'col-rack-' + item.productId} className="input-grid-rack">
                      {racks.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
            <Button variant="primary" onClick={handleStaffCollect}>Set Aside & Notify Store Front</Button>
          </div>
        );
      }
      return <div style={{ color: 'var(--text-muted)' }}>Awaiting Stock Room Staff to collect and set items aside...</div>;
    }
    if (selected.status === 'Pending Store Front Check') {
      if (role === 'storefront') {
        return (
          <div>
            <h4>Verify Client Order (Store Front Staff)</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Inspect order layout. Confirm items set aside are complete and correct.</p>
            <Button variant="success" onClick={handleVerify}>Verify Complete & Ready for Delivery</Button>
          </div>
        );
      }
      return <div style={{ color: 'var(--text-muted)' }}>Awaiting Store Front Staff to inspect and verify set aside products...</div>;
    }
    if (selected.status === 'Ready for Delivery/Pick-up') {
      if (role === 'admin' || role === 'staff') {
        return (
          <div>
            <h4>Final Pick-up & Dispatch</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Client has arrived to collect. Confirm delivery hand-off.</p>
            <Button variant="success" onClick={handleDispatch}>Log Client Pick-up (Close Workflow)</Button>
          </div>
        );
      }
      return <div style={{ color: 'var(--text-muted)' }}>Ready for Pick-up. Client hand-off must be completed by Admin/Stock Staff.</div>;
    }
    if (selected.status === 'Closed') {
      return <div style={{ color: 'var(--success)' }}>This client order is dispatched and closed.</div>;
    }
    return null;
  };

  return (
    <section className="tab-panel active">
      <div className="grid-2">
        <GlassCard style={{ display: role === 'admin' || role === 'staff' ? '' : 'none' }}>
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
            Record Big Client Order
          </h2>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Client / Corporation Name</label>
              <input type="text" name="clientName" placeholder="e.g. National Bookstore Corp." required />
            </div>
            <div className="form-group">
              <label>Select Items & Quantities to Purchase</label>
              <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {products.map((p) => (
                  <div key={p.id} className="input-grid-item">
                    <input type="checkbox" id={'chk-client-' + p.id} name={'chk-' + p.id} value={p.id} onChange={(e) => {
                      const q = document.getElementById('qty-client-' + p.id);
                      if (q) { q.disabled = !e.target.checked; if (e.target.checked) { q.value = 5; q.focus(); } else q.value = ''; }
                    }} />
                    <label htmlFor={'chk-client-' + p.id} className="input-grid-name">{p.name} (Stock Room: {p.stockRoomQty})</label>
                    <input type="number" id={'qty-client-' + p.id} name={'qty-' + p.id} placeholder="Qty" min="1" disabled className="input-grid-qty" />
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full">Log Order & Notify Stock Room</Button>
          </form>
        </GlassCard>

        {role === 'storefront' && (
          <GlassCard>
            <h2 className="card-title">Big Client Dispatch</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              As Store Front Staff, you check items collected by the Stock Room Staff to ensure the order is correct and complete before delivery or pick-up.
            </p>
          </GlassCard>
        )}

        <GlassCard>
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            </svg>
            Fulfillment Handoff Tracker
          </h2>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Select Client Order:</label>
            <select value={selectedOrderId} onChange={(e) => setSelectedOrderId(e.target.value)}>
              <option value="">-- Choose a Client Order --</option>
              {clientOrders.map((co) => (
                <option key={co.id} value={co.id}>{co.id} [{co.clientName}] - Status: {co.status}</option>
              ))}
            </select>
          </div>

          {selected && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.75rem' }}>Item Quantities & Sources</h4>
                <DataTable
                  headers={['Item', 'Ordered', 'Collected', 'Rack Source']}
                  rows={selected.items.map((item) => (
                    <>
                      <td><strong>{item.productName}</strong></td>
                      <td>{item.orderedQty}</td>
                      <td>{item.collectedQty !== null ? item.collectedQty : '-'}</td>
                      <td><Badge>{item.rackSource || '-'}</Badge></td>
                    </>
                  ))}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Order Lifecycle Timeline</h4>
                <Timeline steps={CLIENT_STEPS} activeStep={activeStepIdx(selected.status)} />
              </div>

              <GlassCard style={{ margin: 0, background: 'rgba(255,255,255,0.02)' }}>
                {renderActions()}
              </GlassCard>
            </div>
          )}
        </GlassCard>
      </div>
    </section>
  );
}
