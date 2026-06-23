// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
// ❌ Removed: import ReminderChecker from './components/ReminderChecker';

function App() {
  const [darkMode, setDarkMode] = React.useState(false);

  return (
    <Router>
      <Toaster position="top-right" />
      {/* ❌ Removed: <ReminderChecker darkMode={darkMode} /> */}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;