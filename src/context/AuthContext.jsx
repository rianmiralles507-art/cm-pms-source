import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

const ROLE_LABELS = {
  admin: 'Administrator',
  finance_officer: 'Finance Officer',
  approver: 'Approver',
  encoder: 'Encoder',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('cmpms_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('cmpms_token', res.data.token);
      localStorage.setItem('cmpms_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to log in. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cmpms_token');
    localStorage.removeItem('cmpms_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error, roleLabel: user ? ROLE_LABELS[user.role] : '' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { ROLE_LABELS };
