import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('civicfix_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifySession() {
      const token = localStorage.getItem('civicfix_token');
      if (token) {
        try {
          const profile = await api.get('/auth/me');
          setUser(profile);
          localStorage.setItem('civicfix_user', JSON.stringify(profile));
        } catch {
          setUser(null);
          localStorage.removeItem('civicfix_token');
          localStorage.removeItem('civicfix_user');
        }
      }
      setLoading(false);
    }
    verifySession();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('civicfix_token', res.access_token);
    localStorage.setItem('civicfix_user', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('civicfix_token');
    localStorage.removeItem('civicfix_user');
    setUser(null);
  };

  const switchDemoUser = async (email, password = "Password123!") => {
    return login(email, password);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    switchDemoUser,
    isAdmin: user?.role === 'ADMIN',
    isStaff: user?.role === 'STAFF',
    isCitizen: user?.role === 'CITIZEN' || !user
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
