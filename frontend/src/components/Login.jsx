// src/components/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiLogIn } from 'react-icons/fi';
import ForgotPassword from './ForgotPassword';
import api from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Prevent browser autofill popup
    e.stopPropagation();
    
    if (!credentials.email || !credentials.password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    
    try {
      const response = await api.post('/login', {
        email: credentials.email,
        password: credentials.password
      });
      
      if (response.data.success && response.data.token) {
        // Save token and user data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('isLoggedIn', 'true');
        
        toast.success(response.data.message || 'Login Successful!');
        
        // ✅ Role-based redirect
        const userRole = response.data.user?.role;
        if (userRole === 'employee') {
          navigate('/billing');
        } else {
          navigate('/dashboard');
        }
      } else {
        toast.error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle different error cases
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message;
        
        if (status === 401) {
          if (message === 'Account not found. Please check your email address.') {
            toast.error('Account not found. Please check your email address.');
          } else if (message === 'Wrong password! Please try again.') {
            toast.error('Wrong password! Please try again.');
          } else if (message === 'Invalid password') {
            toast.error('Wrong password! Please try again.');
          } else {
            toast.error('Invalid email or password. Please try again.');
          }
        } else if (status === 422) {
          toast.error('Please enter valid email and password.');
        } else if (status === 500) {
          toast.error('Server error. Please try again later.');
        } else {
          toast.error(message || 'Login failed. Please try again.');
        }
      } else if (error.request) {
        toast.error('Cannot connect to server. Please make sure backend is running on port 8000');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: "url('/car.jfif')",
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
            <form 
              onSubmit={handleLogin} 
              className="space-y-5" 
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            >
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={credentials.email}
                  onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                />
              </div>
              
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition"
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-red-600 hover:text-red-800 hover:underline transition"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 rounded-lg transition duration-300 flex items-center justify-center gap-2 ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Logging in...
                  </>
                ) : (
                  <>
                    <FiLogIn className="w-5 h-5" />
                    Login to Dashboard
                  </>
                )}
              </button>
              
              <div className="text-center text-sm text-gray-500">
                <p>Demo: admin@noorani.com / 123456</p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;