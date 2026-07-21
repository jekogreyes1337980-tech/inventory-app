import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import { api } from '../api/db';
import GlassCard from '../components/shared/GlassCard';
import DataTable from '../components/shared/DataTable';
import Button from '../components/shared/Button';
import Badge from '../components/shared/Badge';
import Modal from '../components/shared/Modal';

const ROLE_OPTIONS = ['admin', 'staff', 'storefront'];
const ROLE_LABELS = { admin: 'Administrator', staff: 'Stock Room', storefront: 'Store Front' };
const EMPTY_FORM = { username: '', password: '', role: 'staff' };

export default function Users() {
  const { role, user } = useOutletContext();
  const [users, setUsers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const loadUsers = async () => {
    try {
      const data = await api.getUsers(user?.username);
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  useEffect(() => {
    if (role === 'admin' && user?.username) loadUsers();
  }, [role, user?.username]);

  const isEditing = !!editing;

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ username: u.username, password: '', role: u.role });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.username.trim()) {
      Swal.fire({ icon: 'warning', title: 'Username is required.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#f3f4f6' });
      return;
    }

    try {
      if (isEditing) {
        const data = { username: form.username.trim(), role: form.role };
        if (form.password) data.password = form.password;
        await api.updateUser(editing.id, data, user?.username);
        Swal.fire({ icon: 'success', title: 'User updated.', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
      } else {
        if (!form.password) {
          Swal.fire({ icon: 'warning', title: 'Password is required.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#f3f4f6' });
          return;
        }
        await api.createUser(form.username.trim(), form.password, form.role, user?.username);
        Swal.fire({ icon: 'success', title: 'User created.', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
      }
      setModalOpen(false);
      loadUsers();
    } catch (err) {
      Swal.fire({ icon: 'error', title: err.error || 'Operation failed.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#f3f4f6' });
    }
  };

  const handleDelete = (u) => {
    if (u.username === user?.username) {
      Swal.fire({ icon: 'warning', title: 'You cannot delete your own account.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#f3f4f6' });
      return;
    }
    Swal.fire({
      title: 'Delete User?',
      text: `Remove "${u.username}" (${u.role})? This cannot be undone.`,
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
        try {
          await api.deleteUser(u.id, user?.username);
          loadUsers();
          Swal.fire({ icon: 'success', title: 'User deleted.', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0f172a', color: '#f3f4f6' });
        } catch (err) {
          Swal.fire({ icon: 'error', title: err.error || 'Failed to delete.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#f3f4f6' });
        }
      }
    });
  };

  const roleBadge = (r) => {
    const map = {
      admin: { variant: 'indigo', label: ROLE_LABELS.admin },
      staff: { variant: 'success', label: ROLE_LABELS.staff },
      storefront: { variant: 'info', label: ROLE_LABELS.storefront },
    };
    const cfg = map[r] || { variant: 'muted', label: r };
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  return (
    <section className="tab-panel active">
      <GlassCard>
        <div className="d-flex justify-between align-center" style={{ marginBottom: '1.25rem' }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            User Accounts
          </h2>
          <Button variant="primary" size="sm" onClick={openAdd}>+ Create User</Button>
        </div>

        <DataTable
          headers={['Username', 'Role', 'Actions']}
          rows={users.map((u) => (
            <>
              <td><strong>{u.username}</strong></td>
              <td>{roleBadge(u.role)}</td>
              <td>
                <div className="d-flex gap-1">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(u)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(u)}>Delete</Button>
                </div>
              </td>
            </>
          ))}
          emptyMessage="No users found."
        />
      </GlassCard>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? 'Edit User' : 'Create User'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="success" onClick={handleSave}>{isEditing ? 'Save Changes' : 'Create User'}</Button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSave}>
          <div className="form-group">
            <label>Username *</label>
            <input
              type="text" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="e.g. jdelacruz" required
            />
          </div>
          <div className="form-group">
            <label>Password {isEditing ? '(leave blank to keep current)' : '*'}</label>
            <input
              type="password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={isEditing ? 'New password' : 'Password'}
              required={!isEditing}
            />
          </div>
          <div className="form-group">
            <label>Role *</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </section>
  );
}