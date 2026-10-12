// src/App.jsx
import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Login from './components/Login';
import Dashboard from './components/Dashboard';

// ✅ ProtectedRoute App ke BAHAR hai.
// Pehle ye App ke andar tha, is wajah se har render par naya component banta tha
// aur poora Dashboard dobara mount hota tha (isi se "pura refresh" lagta tha).
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('darkMode');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      localStorage.setItem('darkMode', JSON.stringify(!prev));
      return !prev;
    });
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
        {/* Login */}
        <Route
          path="/"
          element={
            localStorage.getItem('token')
              ? <Navigate to="/dashboard" replace />
              : <Login />
          }
        />

        {/* ✅ Sab pages ke liye EK hi Dashboard route.
            URL badalne par Dashboard remount nahi hoga, sirf activeMenu badlega.
            Admin-only check (/product-record) ab Dashboard.jsx ke andar hai. */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;