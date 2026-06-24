// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('token');
  });

  const [userRole, setUserRole] = useState(() => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user)?.role : null;
  });

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('darkMode', JSON.stringify(!darkMode));
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    setIsAuthenticated(!!token);
    if (user) {
      setUserRole(JSON.parse(user)?.role);
    }
  }, []);

  const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    if (!token) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  // ✅ Get redirect path based on role
  const getDefaultPath = () => {
    const user = localStorage.getItem('user');
    const role = user ? JSON.parse(user)?.role : null;
    
    if (role === 'employee') {
      return '/billing';
    }
    return '/dashboard';
  };

  return (
    <Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: darkMode ? '#1f2937' : '#fff',
            color: darkMode ? '#fff' : '#333',
          },
        }}
      />
      <Routes>
        {/* Public Route - Login */}
        <Route path="/" element={<Login />} />
        
        {/* ✅ ALL Protected Routes - Dashboard handles everything */}
        <Route path="/*" element={
          <ProtectedRoute>
            <Dashboard darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;