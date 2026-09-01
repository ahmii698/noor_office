import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import EstimatedBill from './components/EstimatedBill';
import BatteryPage from './components/BatteryPage';
import EstimateRecords from './components/EstimateRecords';

// ✅ NEW IMPORTS - Battery Overview & Charts
import BatteryOverview from './components/BatteryOverview';
import BatteryCharts from './components/BatteryCharts';

// ✅ NEW IMPORT - Old Batteries
import OldBatteries from './components/OldBatteries';

// ✅ NEW IMPORTS - Car Pages
import CarPurchase from './components/CarPurchase';
import CarSell from './components/CarSell';
import CarRecords from './components/CarRecords';

function App() {
  const getDarkMode = () => {
    const saved = localStorage.getItem('darkMode');

    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return false;
      }
    }

    return false;
  };

  const getUserFromStorage = () => {
    const user = localStorage.getItem('user');

    if (user) {
      try {
        return JSON.parse(user);
      } catch {
        return null;
      }
    }

    return null;
  };

  const [darkMode, setDarkMode] = useState(getDarkMode);

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('token');
  });

  const [userRole, setUserRole] = useState(() => {
    const user = getUserFromStorage();
    return user?.role || null;
  });

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem(
      'darkMode',
      JSON.stringify(!darkMode)
    );
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = getUserFromStorage();

    console.log('====================');
    console.log('APP MOUNTED');
    console.log('TOKEN:', token);
    console.log('USER:', user);
    console.log('====================');

    setIsAuthenticated(!!token);

    if (user) {
      setUserRole(user.role);
    }
  }, []);

  const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');

    console.log(
      'ProtectedRoute Token:',
      token
    );

    if (!token) {
      return <Navigate to="/" replace />;
    }

    return children;
  };

  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: darkMode
              ? '#1f2937'
              : '#fff',
            color: darkMode
              ? '#fff'
              : '#333',
          },
        }}
      />

      <Routes>

        {/* Login */}
        <Route
          path="/"
          element={
            localStorage.getItem('token')
              ? (
                  <Navigate
                    to="/dashboard"
                    replace
                  />
                )
              : (
                  <Login />
                )
          }
        />

        {/* ✅ ALL ROUTES GO THROUGH DASHBOARD */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/records"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-expenses"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-charts"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-credit"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-reminders"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reminders"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/discarded"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/estimate"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        {/* Estimate Records */}
        <Route
          path="/estimate-records"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        {/* Battery Page - Direct (Existing) */}
        <Route
          path="/battery"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        {/* Battery Overview */}
        <Route
          path="/battery-overview"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        {/* Battery Charts */}
        <Route
          path="/battery-charts"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        {/* Old Batteries History */}
        <Route
          path="/old-batteries"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        {/* ✅ NEW: Car Purchase */}
        <Route
          path="/car-purchase"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        {/* ✅ NEW: Car Sell */}
        <Route
          path="/car-sell"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        {/* ✅ NEW: Car Records */}
        <Route
          path="/car-records"
          element={
            <ProtectedRoute>
              <Dashboard
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
              />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route
          path="*"
          element={
            localStorage.getItem('token')
              ? (
                  <Navigate
                    to="/dashboard"
                    replace
                  />
                )
              : (
                  <Navigate
                    to="/"
                    replace
                  />
                )
          }
        />

      </Routes>
    </Router>
  );
}

export default App;