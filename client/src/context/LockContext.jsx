/**
 * LockContext — ensures only one staff user can write at a time.
 *
 * Usage:
 *   const { acquireLock, releaseLock, lockStatus, isLockedByOther, lockedBy } = useLock();
 *
 *   // Before any mutation:
 *   const ok = await acquireLock();
 *   if (!ok) return; // blocked — show handled by the hook automatically
 *
 *   // After mutation completes:
 *   await releaseLock();
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../api/db';
import { socket } from '../api/socket';
import { useAuth } from './AuthContext';
import Swal from 'sweetalert2';

const LockContext = createContext(null);

export function LockProvider({ children }) {
  const { user } = useAuth();
  const [lockInfo, setLockInfo] = useState(null); // { locked, lockedBy, since }
  const heartbeatRef = useRef(null);

  // Use WebSocket for real-time lock updates instead of polling
  useEffect(() => {
    // Initial fetch
    api.lockStatus().then(setLockInfo).catch(() => {});

    // Listen for live updates
    const handleLockUpdated = (data) => {
      setLockInfo(data);
    };

    socket.on('lock_updated', handleLockUpdated);
    return () => socket.off('lock_updated', handleLockUpdated);
  }, []);

  // Heartbeat — renews our lock every 10s while we hold it
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) return;
    heartbeatRef.current = setInterval(async () => {
      if (user?.username) await api.renewLock(user.username, socket.id);
    }, 10000);
  }, [user]);

  const stopHeartbeat = useCallback(() => {
    clearInterval(heartbeatRef.current);
    heartbeatRef.current = null;
  }, []);

  /**
   * Try to acquire the lock.
   * Returns true if successful, false if blocked.
   * Automatically shows a Swal alert when blocked.
   */
  const acquireLock = useCallback(async () => {
    if (!user?.username) return true; // admin/storefront — no lock needed
    // Only 'staff' roles need the lock
    if (user.role !== 'staff') return true;

    try {
      const result = await api.acquireLock(user.username, socket.id);
      if (result.success) {
        startHeartbeat();
        setLockInfo({ locked: true, lockedBy: user.username });
        return true;
      } else {
        const sinceStr = result.since
          ? new Date(result.since).toLocaleTimeString()
          : '—';
        Swal.fire({
          icon: 'warning',
          title: 'System Locked',
          html: `<b>${result.lockedBy}</b> is currently making changes.<br/><small style="color:#94a3b8">Active since ${sinceStr}. Please wait for them to finish.</small>`,
          background: '#0f172a',
          color: '#f3f4f6',
          confirmButtonColor: '#6366f1',
        });
        return false;
      }
    } catch {
      return true; // fail open — don't block if server is unreachable
    }
  }, [user, startHeartbeat]);

  /**
   * Release the lock after mutation is complete.
   */
  const releaseLock = useCallback(async () => {
    if (!user?.username || user.role !== 'staff') return;
    stopHeartbeat();
    try {
      await api.releaseLock(user.username);
      setLockInfo({ locked: false });
    } catch { /* ignore */ }
  }, [user, stopHeartbeat]);

  const isLockedByOther =
    lockInfo?.locked && lockInfo.lockedBy !== user?.username;
  const lockedBy = lockInfo?.lockedBy || null;

  return (
    <LockContext.Provider value={{ acquireLock, releaseLock, lockInfo, isLockedByOther, lockedBy }}>
      {/* Persistent top banner when another user holds the lock */}
      {isLockedByOther && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'linear-gradient(90deg, #b45309, #92400e)',
          color: '#fef3c7', padding: '0.45rem 1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <strong>{lockedBy}</strong>&nbsp;is currently making changes — writes are temporarily locked.
        </div>
      )}
      {children}
    </LockContext.Provider>
  );
}

export function useLock() {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock must be used within LockProvider');
  return ctx;
}
