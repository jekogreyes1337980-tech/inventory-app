import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api } from '../api/db';
import GlassCard from '../components/shared/GlassCard';
import MetricCard from '../components/shared/MetricCard';
import DataTable from '../components/shared/DataTable';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';

function Ico({ path, viewBox = '0 0 24 24' }) {
  return (
    <svg width="24" height="24" viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: path }} />
  );
}

export default function Dashboard() {
  const { role } = useOutletContext();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [supplyOrders, setSupplyOrders] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [clientOrders, setClientOrders] = useState([]);

  useEffect(() => {
    (async () => {
      setProducts(await api.get('products') || []);
      setSupplyOrders(await api.get('supplyOrders') || []);
      setConversions(await api.get('conversions') || []);
      setAdjustments(await api.get('adjustments') || []);
      setClientOrders(await api.get('clientOrders') || []);
    })();
  }, []);

  const lowStocks = products.filter((p) => p.storefrontQty < p.threshold);
  const activeSupplies = supplyOrders.filter((so) => so.status !== 'Closed' && so.status !== 'Closed (Refunded)');

  const badgeClass = (status) => {
    if (status === 'For Staff Confirmation') return 'warning';
    if (status === 'Staff Checked') return 'info';
    if (status.includes('Reviewed')) return 'danger';
    return 'indigo';
  };

  const confirmNav = (path, title, text) => {
    Swal.fire({
      title,
      text,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Proceed',
      cancelButtonText: 'Stay',
      background: '#0f172a',
      color: '#f3f4f6',
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#6b7280',
    }).then((r) => { if (r.isConfirmed) navigate(path); });
  };

  const renderAlerts = () => {
    if (role === 'admin') {
      const checkingCount = supplyOrders.filter((so) => so.status === 'Staff Checked').length;
      return (
        <>
          {checkingCount > 0 && (
            <GlassCard className="discrepancy-card d-flex align-center justify-between">
              <div>
                <h4 style={{ color: 'var(--danger)' }}>Verify Received Deliveries</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  There are {checkingCount} supply order deliveries marked completed by Stock Staff waiting for discrepancy checks.
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={() => confirmNav('/stock-in', 'Verify Deliveries', `You have ${checkingCount} deliveries to verify. Proceed to Stock In?`)}>Go to Verify</Button>
            </GlassCard>
          )}
          {lowStocks.length > 0 && (
            <GlassCard className="d-flex align-center justify-between" style={{ borderColor: 'var(--warning-glow)' }}>
              <div>
                <h4 style={{ color: 'var(--warning)' }}>Low Store Front Stock Warning</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {lowStocks.length} storefront items are running below threshold levels. Request Stock Room to bring stock out.
                </p>
              </div>
              <Button variant="warning" size="sm" onClick={() => confirmNav('/stock-out-sf', 'Restock Storefront', `${lowStocks.length} items need restock. Proceed to Stock Out?`)}>Request Restock</Button>
            </GlassCard>
          )}
        </>
      );
    }
    if (role === 'staff') {
      const confirmationCount = supplyOrders.filter((so) =>
        so.status === 'For Staff Confirmation' || so.status === 'Reviewed Discrepancy (Correction)'
      ).length;
      const pendingAdj = adjustments.filter((a) => a.status === 'Requested').length;
      return (
        <>
          {confirmationCount > 0 && (
            <GlassCard className="d-flex align-center justify-between" style={{ borderColor: 'var(--primary-glow)' }}>
              <div>
                <h4 style={{ color: 'var(--primary)' }}>Deliveries to Confirm</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  You have {confirmationCount} supply orders pending delivery verification and rack storage.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => confirmNav('/stock-in', 'Log Deliveries', `${confirmationCount} orders pending. Proceed to Stock In?`)}>Log Deliveries</Button>
            </GlassCard>
          )}
          {pendingAdj > 0 && (
            <GlassCard className="d-flex align-center justify-between" style={{ borderColor: 'var(--info-glow)' }}>
              <div>
                <h4 style={{ color: 'var(--info)' }}>Inventory Adjustment Requests</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Admin has requested {pendingAdj} stock collections / storages.
                </p>
              </div>
              <Button variant="info" size="sm" onClick={() => confirmNav('/adjustment', 'View Adjustments', `${pendingAdj} pending adjustments. Proceed to Adjustments?`)}>View Adjustments</Button>
            </GlassCard>
          )}
        </>
      );
    }
    if (role === 'storefront') {
      const pendingChecks = clientOrders.filter((co) => co.status === 'Pending Store Front Check');
      return (
        <>
          {pendingChecks.length > 0 && (
            <GlassCard className="d-flex align-center justify-between" style={{ borderColor: 'var(--success-glow)' }}>
              <div>
                <h4 style={{ color: 'var(--success)' }}>Verification of Big Client Orders</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  There are {pendingChecks.length} orders set aside by Stock Room Staff waiting for final completeness verification.
                </p>
              </div>
              <Button variant="success" size="sm" onClick={() => confirmNav('/stock-out-client', 'Inspect Orders', `${pendingChecks.length} orders to verify. Proceed to Client Orders?`)}>Inspect Orders</Button>
            </GlassCard>
          )}
        </>
      );
    }
    return null;
  };

  return (
    <section className="tab-panel active">
      <div className="grid-3">
        <MetricCard
          iconVariant="rose"
          icon={<Ico path='<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>' />}
          title="Low Storefront Stocks"
          value={lowStocks.length}
        />
        <MetricCard
          iconVariant="indigo"
          icon={<Ico path='<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>' />}
          title="Active Supply Orders"
          value={activeSupplies.length}
        />
        <MetricCard
          iconVariant="teal"
          icon={<Ico path='<circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="9.8" y1="8.2" x2="20" y2="18.4"></line>' />}
          title="Conversions Logged"
          value={conversions.length}
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontFamily: 'var(--font-title)', marginBottom: '1rem' }}>Action Center Alerts</h3>
        <div id="dashboard-role-alerts">
          {renderAlerts() || <div className="no-data">No immediate actions required for your current role.</div>}
        </div>
      </div>

      <GlassCard>
        <h2 className="card-title">
          <Ico path='<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>' />
          Active Supply Shipments Tracker
        </h2>
        <DataTable
          headers={['Order ID', 'Supplier', 'Date Placed', 'Fulfillment Status', 'Action']}
          rows={activeSupplies.map((so) => (
            <>
              <td><strong>{so.id}</strong></td>
              <td>{so.supplier}</td>
              <td>{new Date(so.dateCreated).toLocaleDateString()}</td>
              <td><Badge variant={badgeClass(so.status)}>{so.status}</Badge></td>
              <td><Button variant="secondary" size="sm" onClick={() => { navigate('/stock-in'); setTimeout(() => window.dispatchEvent(new CustomEvent('select-supply-order', { detail: so.id })), 100); }}>View Flow</Button></td>
            </>
          ))}
          emptyMessage="No active supply orders."
        />
      </GlassCard>
    </section>
  );
}
