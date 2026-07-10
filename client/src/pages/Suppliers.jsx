import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api } from '../api/db';
import GlassCard from '../components/shared/GlassCard';
import DataTable from '../components/shared/DataTable';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import Modal from '../components/shared/Modal';

const EMPTY_FORM = { name: '', contactPerson: '', phone: '', email: '', address: '' };

export default function Suppliers() {
  const { role } = useOutletContext();
  const [suppliers, setSuppliers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    (async () => setSuppliers(await api.get('suppliers') || []))();
  }, []);

  const isEditing = !!editing;

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEdit = (supplier) => {
    setEditing(supplier);
    setForm({
      name: supplier.name || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      Swal.fire({ icon: 'warning', title: 'Supplier name is required.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#f3f4f6' });
      return;
    }

    let updated;
    if (isEditing) {
      updated = suppliers.map((s) =>
        s.id === editing.id ? { ...s, ...form, name: form.name.trim() } : s
      );
    } else {
      const newId = 'sup-' + (Date.now()) + '-' + Math.random().toString(36).slice(2, 6);
      updated = [{ id: newId, ...form, name: form.name.trim() }, ...suppliers];
    }

    await api.set('suppliers', updated);
    setSuppliers(updated);
    setModalOpen(false);
    Swal.fire({
      icon: 'success',
      title: isEditing ? 'Supplier updated.' : 'Supplier added.',
      toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
      background: '#0f172a', color: '#f3f4f6',
    });
  };

  const handleDelete = (supplier) => {
    Swal.fire({
      title: 'Delete Supplier?',
      text: `Remove "${supplier.name}" from the supplier list?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      background: '#0f172a',
      color: '#f3f4f6',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
    }).then(async (result) => {
      if (result.isConfirmed) {
        const updated = suppliers.filter((s) => s.id !== supplier.id);
        await api.set('suppliers', updated);
        setSuppliers(updated);
        Swal.fire({
          icon: 'success', title: 'Supplier deleted.', toast: true,
          position: 'top-end', showConfirmButton: false, timer: 2000,
          background: '#0f172a', color: '#f3f4f6',
        });
      }
    });
  };

  return (
    <section className="tab-panel active">
      <div className="grid-2">
        <GlassCard>
          <div className="d-flex justify-between align-center" style={{ marginBottom: '1.25rem' }}>
            <h2 className="card-title" style={{ marginBottom: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
              Supplier Management
            </h2>
            {role === 'admin' && (
              <Button variant="primary" size="sm" onClick={openAdd}>+ Add Supplier</Button>
            )}
          </div>

          <DataTable
            headers={['Name', 'Contact Person', 'Phone', 'Email', 'Address', 'Actions']}
            rows={suppliers.map((s) => (
              <>
                <td><strong>{s.name}</strong></td>
                <td>{s.contactPerson || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                <td>{s.phone || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                <td>{s.email || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                <td>{s.address || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                <td>
                  {role === 'admin' && (
                    <div className="d-flex gap-1">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(s)}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(s)}>Delete</Button>
                    </div>
                  )}
                </td>
              </>
            ))}
            emptyMessage="No suppliers registered."
          />
        </GlassCard>

        {role !== 'admin' && (
          <GlassCard>
            <h2 className="card-title">Suppliers Directory</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              View the list of registered suppliers. Only Administrators can add, edit, or remove suppliers.
            </p>
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Badge variant="indigo">Read Only</Badge>
            </div>
          </GlassCard>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? 'Edit Supplier' : 'Add New Supplier'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="success" onClick={handleSave}>{isEditing ? 'Save Changes' : 'Add Supplier'}</Button>
          </>
        }
      >
        <form id="supplier-form" onSubmit={handleSave}>
          <div className="form-group">
            <label>Supplier Name *</label>
            <input
              type="text" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. PaperCo Distributors" required
            />
          </div>
          <div className="form-group">
            <label>Contact Person</label>
            <input
              type="text" value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              placeholder="e.g. Juan Dela Cruz"
            />
          </div>
          <div className="form-row" style={{ gap: '0.75rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Phone</label>
              <input
                type="text" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="e.g. (02) 1234 5678"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Email</label>
              <input
                type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="e.g. sales@paperco.com"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Address</label>
            <input
              type="text" value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="e.g. 123 Commerce St, Manila"
            />
          </div>
        </form>
      </Modal>
    </section>
  );
}
