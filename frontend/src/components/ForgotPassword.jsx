// src/components/ForgotPassword.jsx
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { FiMail, FiKey, FiCheckCircle, FiArrowLeft, FiLock } from 'react-icons/fi';
import api from '../services/api';

const ForgotPassword = ({ onBack }) => {
  const [resetEmail, setResetEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await api.post('/forgot-password', {
        email: resetEmail
      });
      
      if (response.data.success) {
        setResetToken(response.data.token);
        setOtpSent(true);
        toast.success(response.data.message || `OTP sent to ${resetEmail}`);
      } else {
        toast.error(response.data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      const message = error.response?.data?.message || 'Email not found or server error';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    
    if (!otpCode) {
      toast.error('Please enter OTP');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      // First verify OTP
      const verifyResponse = await api.post('/verify-otp', {
        email: resetEmail,
        otp: otpCode
      });
      
      if (!verifyResponse.data.success) {
        toast.error(verifyResponse.data.message || 'Invalid OTP');
        setLoading(false);
        return;
      }
      
      const token = verifyResponse.data.token;
      
      // Then reset password
      const resetResponse = await api.post('/reset-password', {
        email: resetEmail,
        token: token,
        password: newPassword,
        password_confirmation: confirmPassword
      });
      
      if (resetResponse.data.success) {
        toast.success(resetResponse.data.message || 'Password reset successful! Please login');
        onBack();
      } else {
        toast.error(resetResponse.data.message || 'Reset failed');
      }
    } catch (error) {
      console.error('Reset error:', error);
      const message = error.response?.data?.message || 'Reset failed. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden">
          <div className="w-full">
            <img src="/logo.jpg" alt="Logo" className="w-full h-32 object-cover" />
          </div>

          <div className="p-6">
            {!otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-5">
                <div className="text-center mb-4">
                  <FiKey className="w-12 h-12 text-red-500 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-gray-800">Reset Password</h3>
                  <p className="text-sm text-gray-500 mt-1">Enter your email to receive OTP</p>
                </div>

                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 text-white font-semibold py-3 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    'Send OTP'
                  )}
                </button>

                <button
                  type="button"
                  onClick={onBack}
                  className="w-full text-gray-600 hover:text-gray-800 text-sm py-2 transition flex items-center justify-center gap-1"
                >
                  <FiArrowLeft /> Back to Login
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndReset} className="space-y-5">
                <div className="text-center mb-4">
                  <FiKey className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-gray-800">Verify & Reset</h3>
                  <p className="text-sm text-gray-500 mt-1">Enter OTP and new password</p>
                </div>

                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Enter OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition text-center text-2xl tracking-widest"
                    required
                  />
                </div>

                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition"
                    required
                  />
                </div>

                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 text-white font-semibold py-3 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Resetting...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle /> Reset Password
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="w-full text-gray-600 hover:text-gray-800 text-sm py-2 transition"
                >
                  ← Back to Email
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;