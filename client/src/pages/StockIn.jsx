import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api } from '../api/db';
import GlassCard from '../components/shared/GlassCard';
import DataTable from '../components/shared/DataTable';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import Timeline from '../components/shared/Timeline';

const ROLE_LABELS = { admin: 'Administrator', staff: 'Stock Room Staff', storefront: 'Store Front Staff' };

const SUPPLY_STEPS = [
  { title: 'Order Drafted', desc: 'Admin initialized the supply order.', handledKey: null },
  { title: 'Forwarded to Staff', desc: 'Order forwarded to confirm delivery.', handledKey: null },
  { title: 'Delivered & Racked', desc: 'Staff inputted quantities & rack positions.', handledKey: 'confirmedBy' },
  { title: 'Discrepancy Check', desc: 'Admin verified counts vs ordered amounts.', handledKey: null },
  { title: 'Process Closed', desc: 'Inventory updated. Discrepancies resolved.', handledKey: null },
];

export default function StockIn() {
  const { role, user } = useOutletContext();

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplyOrders, setSupplyOrders] = useState([]);
  const [racks, setRacks] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');

  const load = useCallback(async () => {
    setProducts(await api.get('products') || []);
    setSuppliers(await api.get('suppliers') || []);
    setSupplyOrders(await api.get('supplyOrders') || []);
    setRacks(await api.get('racks') || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = (e) => setSelectedOrderId(e.detail);
    window.addEventListener('select-supply-order', handler);
    return () => window.removeEventListener('select-supply-order', handler);
  }, []);

  const selected = supplyOrders.find((o) => o.id === selectedOrderId);

  const activeStepIdx = (status) => {
    if (status === 'Draft') return 0;
    if (status === 'Ordered' || status === 'For Staff Confirmation' || status.includes('Correction')) return 1;
    if (status === 'Staff Checked') return 2;
    if (status === 'Reviewed Discrepancy') return 3;
    if (status.startsWith('Closed')) return 4;
    return 0;
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    const form = e.target;
    
    const supplierName = form.supplierName.value;
    const supplierContact = form.supplierContact.value;
    const supplierPhone = form.supplierPhone.value;
    const supplierEmail = form.supplierEmail.value;
    const supplierAddress = form.supplierAddress.value;
    
    let supplier = supplierName;
    const parts = [];
    if (supplierContact) parts.push(`Contact: ${supplierContact}`);
    if (supplierPhone) parts.push(`Phone: ${supplierPhone}`);
    if (supplierEmail) parts.push(`Email: ${supplierEmail}`);
    if (supplierAddress) parts.push(`Address: ${supplierAddress}`);
    if (parts.length > 0) supplier += ` (${parts.join(', ')})`;
    
    const selectedItems = [];
    products.forEach((p) => {
      const chk = form[`chk-${p.id}`];
      const qtyInput = form[`qty-${p.id}`];
      const priceInput = form[`price-${p.id}`];
      if (chk?.checked && qtyInput) {
        const qty = parseInt(qtyInput.value);
        const price = priceInput ? parseFloat(priceInput.value) : 0;
        if (!isNaN(qty) && qty > 0) selectedItems.push({ productId: p.id, productName: p.name, orderedQty: qty, receivedQty: null, rackLocation: null, unitPrice: isNaN(price) ? 0 : price });
      }
    });
    if (selectedItems.length === 0) { Swal.fire({ icon: 'warning', title: 'Please select at least one product with a valid quantity.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#f3f4f6' }); return; }

    const orders = [...supplyOrders];
    const orderId = 'SO-' + (1000 + orders.length + 1);
    orders.unshift({ id: orderId, supplier, dateCreated: new Date().toISOString(), status: 'Draft', items: selectedItems, handledBy: { draftedBy: user?.username } });
    await api.set('supplyOrders', orders);
    setSupplyOrders(orders);
    setSelectedOrderId(orderId);
    Swal.fire({ icon: 'success', title: 'Supply Order ' + orderId + ' created as Draft!', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
  };

  const handleForward = async (orderId) => {
    const orders = supplyOrders.map((o) => {
      if (o.id === orderId) o.status = 'For Staff Confirmation';
      return o;
    });
    await api.set('supplyOrders', orders);
    setSupplyOrders(orders);
    // push notification
    const notifs = await api.get('notifications') || [];
    notifs.unshift({ id: 'notif-' + Date.now(), title: 'New Supply Delivery Expected', message: 'Verify delivery contents for ' + orderId, timestamp: new Date().toISOString(), role: 'staff', read: false });
    await api.set('notifications', notifs);
    Swal.fire({ icon: 'success', title: 'Order forwarded to Staff.', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
  };

  const handleStaffSubmit = async (orderId) => {
    const orders = supplyOrders.map((o) => o.id === orderId ? { ...o } : o);
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    for (const item of order.items) {
      const qtyInput = document.getElementById('rec-qty-' + item.productId);
      const rackSelect = document.getElementById('rec-rack-' + item.productId);
      if (qtyInput && rackSelect) {
        const recQty = parseInt(qtyInput.value);
        if (isNaN(recQty) || recQty < 0) { Swal.fire({ icon: 'warning', title: 'Please enter a valid received quantity.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#f3f4f6' }); return; }
        item.receivedQty = recQty;
        item.rackLocation = rackSelect.value;
      }
    }
    order.status = 'Staff Checked';
    if (!order.handledBy) order.handledBy = {};
    order.handledBy.confirmedBy = user?.username;
    await api.set('supplyOrders', orders);
    setSupplyOrders(orders);

    const notifs = await api.get('notifications') || [];
    notifs.unshift({ id: 'notif-' + Date.now(), title: 'Delivery Logs Ready for Check', message: 'Verification required on received items for ' + orderId + '. Confirmed by ' + user?.username + '.', timestamp: new Date().toISOString(), role: 'admin', read: false });
    await api.set('notifications', notifs);
    Swal.fire({ icon: 'success', title: 'Deliveries recorded by ' + user?.username + '. Forwarded to Admin.', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
  };

  const handleClose = async (orderId) => {
    const orders = supplyOrders.map((o) => {
      if (o.id === orderId) {
        o.status = 'Closed';
        // Update product stock
        o.items.forEach((item) => {
          const prod = products.find((p) => p.id === item.productId);
          if (prod) {
            prod.stockRoomQty += item.receivedQty;
            if (item.rackLocation && !prod.racks.includes(item.rackLocation)) prod.racks.push(item.rackLocation);
          }
        });
      }
      return o;
    });
    await api.set('supplyOrders', orders);
    await api.set('products', products);
    setSupplyOrders(orders);
    Swal.fire({ icon: 'success', title: 'Supply Order closed. Inventory updated.', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
  };

  const handleReviewDiscrepancy = async (orderId) => {
    const orders = supplyOrders.map((o) => { if (o.id === orderId) o.status = 'Reviewed Discrepancy'; return o; });
    await api.set('supplyOrders', orders);
    setSupplyOrders(orders);
  };

  const handleSettleRefund = async (orderId) => {
    const orders = supplyOrders.map((o) => {
      if (o.id === orderId) {
        o.status = 'Closed (Refunded)';
        // No items are added to inventory for full refund
      }
      return o;
    });
    await api.set('supplyOrders', orders);
    setSupplyOrders(orders);
    Swal.fire({ icon: 'success', title: 'Order finalized. Discrepancy tagged as REFUNDED.', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
  };

  const handleSettleCorrection = async (orderId) => {
    const orders = supplyOrders.map((o) => {
      if (o.id === orderId) {
        o.items.forEach((item) => {
          if (item.receivedQty && item.receivedQty > 0) {
            const prod = products.find((p) => p.id === item.productId);
            if (prod) {
              prod.stockRoomQty += item.receivedQty;
              if (item.rackLocation && !prod.racks.includes(item.rackLocation)) prod.racks.push(item.rackLocation);
            }
          }
          item.orderedQty = Math.max(0, item.orderedQty - (item.receivedQty || 0));
          item.receivedQty = null;
        });
        o.items = o.items.filter(item => item.orderedQty > 0);
        o.status = 'Reviewed Discrepancy (Correction)';
      }
      return o;
    });
    await api.set('supplyOrders', orders);
    await api.set('products', products);
    setSupplyOrders(orders);
    const notifs = await api.get('notifications') || [];
    notifs.unshift({ id: 'notif-' + Date.now(), title: 'Missing Shipment Incoming', message: 'Supplier corrections for ' + orderId + ' will arrive next shipment.', timestamp: new Date().toISOString(), role: 'staff', read: false });
    await api.set('notifications', notifs);
    Swal.fire({ icon: 'success', title: 'Partial received. Remaining items await next shipment.', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
  };

  const renderActions = () => {
    if (!selected) return null;

    if (role === 'admin') {
      if (selected.status === 'Draft') {
        return (
          <div>
            <h4>Admin Options</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Forward this order to the Stock Room Staff for product validation upon arrival.</p>
            <Button onClick={() => handleForward(selected.id)}>Forward to Stock Room Staff</Button>
          </div>
        );
      }
      if (selected.status === 'Staff Checked') {
        const discrepancies = selected.items.filter((item) => item.orderedQty !== item.receivedQty);
        return (
          <div>
            <h4>Verification Check (Administrator)</h4>
            {discrepancies.length > 0 ? (
              <GlassCard className="discrepancy-card" style={{ marginBottom: '1rem', padding: '1rem' }}>
                <h5 style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Discrepancies Detected!</h5>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Stock staff records show a mismatch on {discrepancies.length} products.</p>
              </GlassCard>
            ) : (
              <GlassCard style={{ marginBottom: '1rem', padding: '1rem', borderColor: 'var(--success-glow)' }}>
                <h5 style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Quantities Match Perfect</h5>
              </GlassCard>
            )}
            <div className="d-flex gap-2">
              <Button variant="success" onClick={() => handleClose(selected.id)}>Close Stock {discrepancies.length > 0 ? '(Accept Anyway)' : 'In'}</Button>
              {discrepancies.length > 0 && <Button variant="danger" onClick={() => handleReviewDiscrepancy(selected.id)}>Resolve Discrepancy</Button>}
            </div>
          </div>
        );
      }
      if (selected.status === 'Reviewed Discrepancy') {
        return (
          <div>
            <h4>Discrepancy Review Panel</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Select supplier settlement action:</p>
            <div className="d-flex gap-2">
              <Button variant="warning" onClick={() => handleSettleRefund(selected.id)}>Supplier Refunded Order</Button>
              <Button variant="primary" onClick={() => handleSettleCorrection(selected.id)}>Partial Receive & Await Correction</Button>
            </div>
          </div>
        );
      }
      if (selected.status.startsWith('Closed')) {
        return <div style={{ color: 'var(--text-muted)' }}>This stock-in process is fully complete and closed.</div>;
      }
      return <div style={{ color: 'var(--text-muted)' }}>Awaiting confirmation inputs from Stock Room Staff...</div>;
    }

    if (role === 'staff' || role === 'storefront') {
      const roleLabel = role === 'staff' ? 'Stock Room Staff' : 'Store Front Staff';
      if (selected.status === 'For Staff Confirmation' || selected.status === 'Reviewed Discrepancy (Correction)') {
        return (
          <div>
            <h4>Record Delivered Stocks ({roleLabel})</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Input actual counts received and choose storage racks:</p>
            <div style={{ marginBottom: '1.25rem' }}>
              {selected.items.map((item) => (
                <div key={item.productId} className="input-grid-item">
                  <span className="input-grid-name">{item.productName} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Ordered: {item.orderedQty})</span></span>
                  <input type="number" id={'rec-qty-' + item.productId} defaultValue={item.orderedQty} min="0" className="input-grid-qty" placeholder="Rec Qty" />
                  <select id={'rec-rack-' + item.productId} className="input-grid-rack">
                    {racks.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <Button variant="success" onClick={() => handleStaffSubmit(selected.id)}>Forward to Admin for Checking</Button>
          </div>
        );
      }
      if (selected.status === 'Staff Checked') {
        const confirmedBy = (selected.handledBy || {}).confirmedBy;
        return <div style={{ color: 'var(--text-muted)' }}>Deliveries recorded{confirmedBy && <> by <strong style={{ color: 'var(--success)' }}>{confirmedBy}</strong></>}. Awaiting administrator discrepancy check...</div>;
      }
      return <div style={{ color: 'var(--text-muted)' }}>This order does not currently require action.</div>;
    }
  };

  return (
    <section className="tab-panel active">
      <div className="grid-2">
        <GlassCard data-role-only={role === 'admin' ? '' : 'none'} style={{ display: role === 'admin' ? '' : 'none' }}>
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Draft New Supply Order (Admin)
          </h2>
          <form onSubmit={handleCreateOrder}>
            <div className="form-group">
              <label>Supplier Details</label>
              <div className="form-row" style={{ marginBottom: '0.5rem' }}>
                <input type="text" name="supplierName" placeholder="Supplier Name" required style={{ flex: 1 }} />
                <input type="text" name="supplierContact" placeholder="Contact Person (Optional)" style={{ flex: 1 }} />
              </div>
              <div className="form-row" style={{ marginBottom: '0.5rem' }}>
                <input type="text" name="supplierPhone" placeholder="Phone Number (Optional)" style={{ flex: 1 }} />
                <input type="text" name="supplierEmail" placeholder="Email Address (Optional)" style={{ flex: 1 }} />
              </div>
              <input type="text" name="supplierAddress" placeholder="Physical Address (Optional)" style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label>Select Items, Quantities & Prices</label>
              <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {products.map((p) => {
                  const unitText = p.unit === 'rolls/meters' ? 'meters' : 'pcs';
                  return (
                    <div key={p.id} className="input-grid-item" style={{ gridTemplateColumns: 'auto 1fr 80px 100px' }}>
                      <input type="checkbox" id={'chk-' + p.id} name={'chk-' + p.id} value={p.id} onChange={(e) => {
                        const q = document.getElementById('qty-' + p.id);
                        const price = document.getElementById('price-' + p.id);
                        if (q && price) { 
                          q.disabled = !e.target.checked; 
                          price.disabled = !e.target.checked; 
                          if (e.target.checked) { q.value = 10; q.focus(); } else { q.value = ''; price.value = ''; } 
                        }
                      }} />
                      <label htmlFor={'chk-' + p.id} className="input-grid-name" style={{ fontSize: '0.85rem' }}>{p.name} ({unitText})</label>
                      <input type="number" id={'qty-' + p.id} name={'qty-' + p.id} placeholder="Qty" min="1" disabled className="input-grid-qty" />
                      <input type="number" id={'price-' + p.id} name={'price-' + p.id} placeholder="Price ($)" min="0" step="0.01" disabled className="input-grid-qty" />
                    </div>
                  );
                })}
              </div>
            </div>
            <Button type="submit" className="w-full">Create Supply Order Draft</Button>
          </form>
        </GlassCard>

        {role !== 'admin' && (
          <GlassCard>
            <h2 className="card-title">Stock In Workflow</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Supply Order forms are drafted and verified by the Administrator role. As {ROLE_LABELS[role]}, your task is to verify delivered items and store them on designated racks once the order is forwarded to you.
            </p>
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Badge variant="indigo">Role Restricted View</Badge>
            </div>
          </GlassCard>
        )}

        <GlassCard>
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Verify & Track Deliveries
          </h2>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Choose Supply Order:</label>
            <select value={selectedOrderId} onChange={(e) => setSelectedOrderId(e.target.value)}>
              <option value="">-- Choose a Supply Order --</option>
              {supplyOrders.map((so) => (
                <option key={so.id} value={so.id}>{so.id} [{so.supplier}] - Status: {so.status}</option>
              ))}
            </select>
          </div>

          {selected && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Flow Timeline</h4>
                <Timeline
                  steps={SUPPLY_STEPS}
                  activeStep={activeStepIdx(selected.status)}
                  discrepancy={selected.status.includes('Discrepancy')}
                  activeLabel={selected.status === 'Closed (Refunded)' ? 'Discrepancies tagged as REFUNDED.' : selected.status === 'Closed' ? 'Closed. Stock levels updated.' : undefined}
                  handledBy={selected.handledBy || {}}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.75rem' }}>Delivery Items Log</h4>
                <DataTable
                  headers={role === 'admin' ? ['Item', 'Ordered', 'Unit Price', 'Received', 'Rack Location', 'Match Status'] : ['Item', 'Ordered', 'Received', 'Rack Location', 'Match Status']}
                  rows={selected.items.map((item) => {
                    const isDiscrepancy = selected.status !== 'Draft' && selected.status !== 'Ordered' && selected.status !== 'For Staff Confirmation' && item.receivedQty !== item.orderedQty;
                    return (
                      <>
                        <td><strong>{item.productName}</strong></td>
                        <td>{item.orderedQty}</td>
                        {role === 'admin' && <td>{item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '-'}</td>}
                        <td>{item.receivedQty !== null ? item.receivedQty : '-'}</td>
                        <td><Badge>{item.rackLocation || '-'}</Badge></td>
                        <td>{isDiscrepancy ? <span className="discrepancy-badge">Discrepancy</span> : (item.receivedQty !== null ? <Badge variant="success">Match</Badge> : <Badge variant="muted">Pending</Badge>)}</td>
                      </>
                    );
                  })}
                />
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
