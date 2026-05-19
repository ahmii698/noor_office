// src/components/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiLogIn } from 'react-icons/fi';
import ForgotPassword from './ForgotPassword';

const Login = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Demo users storage - koi bhi email/password save karne ke liye
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('users');
    if (saved) return JSON.parse(saved);
    return [
      { email: 'admin@noorani.com', password: '123456', name: 'Admin' }
    ];
  });

  const handleLogin = (e) => {
    e.preventDefault();
    
    // Agar email aur password dono fill hai toh login de do (kuch bhi ho)
    if (credentials.email && credentials.password) {
      // Check if user exists in our records
      let user = users.find(u => u.email === credentials.email);
      
      if (!user) {
        // Agar user nahi hai toh new user bana do
        user = { 
          email: credentials.email, 
          password: credentials.password, 
          name: credentials.email.split('@')[0] 
        };
        const updatedUsers = [...users, user];
        setUsers(updatedUsers);
        localStorage.setItem('users', JSON.stringify(updatedUsers));
      } else {
        // User exists but password mismatch? Update karo
        if (user.password !== credentials.password) {
          const updatedUsers = users.map(u => 
            u.email === credentials.email 
              ? { ...u, password: credentials.password }
              : u
          );
          setUsers(updatedUsers);
          localStorage.setItem('users', JSON.stringify(updatedUsers));
        }
      }
      
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('user', JSON.stringify({ 
        name: user.name || credentials.email.split('@')[0], 
        email: credentials.email 
      }));
      toast.success('Login Successful!');
      navigate('/dashboard');
    } else {
      toast.error('Please enter email and password');
    }
  };

  // Update users from ForgotPassword component
  const updateUsers = (updatedUsers) => {
    setUsers(updatedUsers);
    localStorage.setItem('users', JSON.stringify(updatedUsers));
  };

  if (showForgotPassword) {
    return (
      <ForgotPassword 
        onBack={() => setShowForgotPassword(false)} 
        users={users}
        updateUsers={updateUsers}
      />
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: "url('/bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-500">
          {/* Modal Header - Logo */}
          <div className="w-full">
            <img 
              src="/logo.jpg" 
              alt="Noorani Logo" 
              className="w-full h-32 object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<div class="text-center py-8 text-6xl">❄️</div>';
              }}
            />
          </div>

          {/* Login Form */}
          <div className="p-6">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={credentials.email}
                  onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent outline-none transition"
                  required
                />
              </div>
              
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  placeholder="Password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent outline-none transition"
                  required
                />
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white font-semibold py-3 rounded-lg transition duration-300 flex items-center justify-center gap-2"
              >
                <FiLogIn className="w-5 h-5" />
                Login to Dashboard
              </button>
              
              <div className="text-center text-sm text-gray-500">
                <p>Enter any email and password to login</p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;