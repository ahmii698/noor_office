import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiLogIn } from 'react-icons/fi';
import ForgotPassword from './ForgotPassword';
import api from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!credentials.email || !credentials.password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/login', {
        email: credentials.email,
        password: credentials.password,
      });

      const data = response.data;

      console.log('📥 Login Response:', data);
      console.log('📥 Token:', data?.token);

      if (data && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('isLoggedIn', 'true');

        console.log('✅ Token saved:', localStorage.getItem('token'));
        console.log('✅ User saved:', localStorage.getItem('user'));

        toast.success(data.message || 'Login Successful!');

        // ✅ FIX: window.location.href use karo
        setTimeout(() => {
          if (data.user?.role === 'employee') {
            window.location.href = '/billing';
          } else {
            window.location.href = '/dashboard';
          }
        }, 300);

      } else {
        console.log('❌ Token missing');
        toast.error(data?.message || 'Login failed');
      }

    } catch (error) {
      console.error('❌ Login Error:', error);
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <ForgotPassword
        onBack={() => setShowForgotPassword(false)}
      />
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/car.jfif')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden">
          <div className="w-full">
            <img
              src="/logo.jpg"
              alt="Noorani Logo"
              className="w-full h-32 object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>

          <div className="p-6">
            <form
              onSubmit={handleLogin}
              className="space-y-5"
            >
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />

                <input
                  type="email"
                  placeholder="Email Address"
                  value={credentials.email}
                  onChange={(e) =>
                    setCredentials({
                      ...credentials,
                      email: e.target.value,
                    })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  required
                />
              </div>

              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />

                <input
                  type="password"
                  placeholder="Password"
                  value={credentials.password}
                  onChange={(e) =>
                    setCredentials({
                      ...credentials,
                      password: e.target.value,
                    })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() =>
                    setShowForgotPassword(true)
                  }
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Logging in...
                  </>
                ) : (
                  <>
                    <FiLogIn />
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