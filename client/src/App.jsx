import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LockProvider } from './context/LockContext';
import ProtectedLayout from './components/layout/ProtectedLayout';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import StockIn from './pages/StockIn';
import StockOutSF from './pages/StockOutSF';
import StockOutClient from './pages/StockOutClient';
import Conversion from './pages/Conversion';
import Adjustment from './pages/Adjustment';

export default function App() {
  return (
    <AuthProvider>
      <LockProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/stock-in" element={<StockIn />} />
            <Route path="/stock-out-sf" element={<StockOutSF />} />
            <Route path="/stock-out-client" element={<StockOutClient />} />
            <Route path="/conversion" element={<Conversion />} />
            <Route path="/adjustment" element={<Adjustment />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </LockProvider>
    </AuthProvider>
  );
}
