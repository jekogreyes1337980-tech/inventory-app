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
  { title: 'Process Closed', desc: 'Inventory updated with received items.', handledKey: null },
];

export default function StockIn() {
  const { role, user } = useOutletContext();

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplyOrders, setSupplyOrders] = useState([]);
  const [racks, setRacks] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');

  // Draft item builder state
  const [draftItems, setDraftItems] = useState([{ itemName: '', quantity: '', unitPrice: '' }]);

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
    if (status === 'Ordered' || status === 'For Staff Confirmation') return 1;
    if (status === 'Staff Checked') return 2;
    if (status.startsWith('Closed')) return 3;
    return 0;
  };

  const addDraftRow = () => {
    setDraftItems([...draftItems, { itemName: '', quantity: '', unitPrice: '' }]);
  };

  const removeDraftRow = (idx) => {
    if (draftItems.length <= 1) return;
    setDraftItems(draftItems.filter((_, i) => i !== idx));
  };

  const updateDraftRow = (idx, field, value) => {
    const updated = [...draftItems];
    updated[idx][field] = value;
    setDraftItems(updated);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    const supplierName = e.target.supplierName.value;
    const supplierContact = e.target.supplierContact.value;
    const supplierPhone = e.target.supplierPhone.value;
    const supplierEmail = e.target.supplierEmail.value;
    const supplierAddress = e.target.supplierAddress.value;

    let supplier = supplierName;
    const parts = [];
    if (supplierContact) parts.push(`Contact: ${supplierContact}`);
    if (supplierPhone) parts.push(`Phone: ${supplierPhone}`);
    if (supplierEmail) parts.push(`Email: ${supplierEmail}`);
    if (supplierAddress) parts.push(`Address: ${supplierAddress}`);
    if (parts.length > 0) supplier += ` (${parts.join(', ')})`;
    const validItems = draftItems.filter(
      (item) => item.itemName.trim() && parseInt(item.quantity) > 0 && parseFloat(item.unitPrice) >= 0
    );

    if (validItems.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Please add at least one item with a valid name, quantity, and unit price.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#f3f4f6' });
      return;
    }

    const orders = [...supplyOrders];
    const orderId = 'SO-' + (1000 + orders.length + 1);
    orders.unshift({
      id: orderId,
      supplier,
      dateCreated: new Date().toISOString(),
      status: 'Draft',
      items: validItems.map((item) => ({
        itemName: item.itemName.trim(),
        orderedQty: parseInt(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        receivedQty: null,
        rackLocation: null,
      })),
      handledBy: { draftedBy: user?.username },
    });
    await api.set('supplyOrders', orders);
    setSupplyOrders(orders);
    setSelectedOrderId(orderId);
    setDraftItems([{ itemName: '', quantity: '', unitPrice: '' }]);
    Swal.fire({ icon: 'success', title: `Supply Order ${orderId} created as Draft!`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
  };

  const handleForward = async (orderId) => {
    const orders = supplyOrders.map((o) => {
      if (o.id === orderId) o.status = 'For Staff Confirmation';
      return o;
    });
    await api.set('supplyOrders', orders);
    setSupplyOrders(orders);
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
      const qtyInput = document.getElementById('rec-qty-' + item.itemName.replace(/\s+/g, '-'));
      const rackSelect = document.getElementById('rec-rack-' + item.itemName.replace(/\s+/g, '-'));
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
    notifs.unshift({ id: 'notif-' + Date.now(), title: 'Delivery Logs Ready for Check', message: 'Received items logged for ' + orderId + '. Confirmed by ' + user?.username + '.', timestamp: new Date().toISOString(), role: 'admin', read: false });
    await api.set('notifications', notifs);
    Swal.fire({ icon: 'success', title: 'Deliveries recorded by ' + user?.username + '. Forwarded to Admin.', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
  };

  const handleClose = async (orderId) => {
    const orders = supplyOrders.map((o) => ({ ...o }));
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    order.status = 'Closed';

    const updatedProducts = [...products];

    for (const item of order.items) {
      const received = item.receivedQty || item.orderedQty;
      const existing = updatedProducts.find(
        (p) => p.name.toLowerCase() === item.itemName.toLowerCase()
      );
      if (existing) {
        existing.stockRoomQty += received;
        if (item.rackLocation && !existing.racks.includes(item.rackLocation)) {
          existing.racks.push(item.rackLocation);
        }
      } else {
        updatedProducts.push({
          id: 'prod-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          name: item.itemName,
          category: 'General',
          unit: 'pcs',
          stockRoomQty: received,
          storefrontQty: 0,
          threshold: 5,
          racks: item.rackLocation ? [item.rackLocation] : [],
          cost: item.unitPrice || 0,
          price: 0,
          rollLengthMeters: 0,
          convertedStock: 0,
        });
      }
    }

    await api.set('supplyOrders', orders);
    await api.set('products', updatedProducts);
    setSupplyOrders(orders);
    setProducts(updatedProducts);
    Swal.fire({ icon: 'success', title: 'Supply Order closed. New items added to inventory.', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
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
            const prod = products.find((p) => p.name.toLowerCase() === item.itemName.toLowerCase());
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
      if (selected.status === 'For Staff Confirmation') {
        return (
          <div>
            <h4>Record Delivered Stocks ({roleLabel})</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Input actual counts received and choose storage racks:</p>
            <div style={{ marginBottom: '1.25rem' }}>
              {selected.items.map((item) => (
                <div key={item.itemName} className="input-grid-item">
                  <span className="input-grid-name">{item.itemName} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Ordered: {item.orderedQty})</span></span>
                  <input type="number" id={'rec-qty-' + item.itemName.replace(/\s+/g, '-')} defaultValue={item.orderedQty} min="0" className="input-grid-qty" placeholder="Rec Qty" />
                  <select id={'rec-rack-' + item.itemName.replace(/\s+/g, '-')} className="input-grid-rack">
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
        return <div style={{ color: 'var(--text-muted)' }}>Deliveries recorded{confirmedBy && <> by <strong style={{ color: 'var(--success)' }}>{confirmedBy}</strong></>}. Awaiting administrator closure...</div>;
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
              <label>Order Items</label>
              <div style={{ marginBottom: '0.75rem' }}>
                {draftItems.map((item, idx) => (
                  <div key={idx} className="input-grid-item" style={{ marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
                      <input
                        type="text"
                        placeholder="Item name"
                        value={item.itemName}
                        onChange={(e) => updateDraftRow(idx, 'itemName', e.target.value)}
                        style={{ flex: 2, minWidth: '120px' }}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateDraftRow(idx, 'quantity', e.target.value)}
                        min="1"
                        style={{ flex: 1, minWidth: '60px' }}
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Unit Price"
                        value={item.unitPrice}
                        onChange={(e) => updateDraftRow(idx, 'unitPrice', e.target.value)}
                        min="0"
                        style={{ flex: 1, minWidth: '80px' }}
                        required
                      />
                      {draftItems.length > 1 && (
                        <button type="button" onClick={() => removeDraftRow(idx)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.25rem' }}>&times;</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={addDraftRow} style={{ marginBottom: '0.75rem' }}>
                + Add Another Item
              </Button>
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
                  activeLabel={selected.status === 'Closed' ? 'Closed. Inventory updated.' : undefined}
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
                        <td><strong>{item.itemName}</strong></td>
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