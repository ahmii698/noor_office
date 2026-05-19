// src/components/ForgotPassword.jsx
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { FiMail, FiKey, FiCheckCircle, FiArrowLeft, FiLock } from 'react-icons/fi';

const ForgotPassword = ({ onBack, users, updateUsers }) => {
  const [resetEmail, setResetEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);

  // Generate random 6-digit OTP
  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Send OTP
  const handleSendOTP = (e) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }
    
    const userExists = users.find(u => u.email === resetEmail);
    if (!userExists) {
      toast.error('No account found with this email');
      return;
    }
    
    const otp = generateOTP();
    setGeneratedOtp(otp);
    setOtpSent(true);
    
    toast.success(`Demo OTP: ${otp}`, { duration: 10000 });
    toast.success(`OTP sent to ${resetEmail}`, { duration: 3000 });
  };

  // Verify OTP
  const handleVerifyOTP = (e) => {
    e.preventDefault();
    
    if (!otpCode) {
      toast.error('Please enter OTP');
      return;
    }
    
    if (otpCode === generatedOtp) {
      toast.success('OTP verified successfully!');
      setShowResetForm(true);
    } else {
      toast.error('Invalid OTP. Please try again.');
    }
  };

  // Reset Password
  const handleResetPassword = (e) => {
    e.preventDefault();
    
    if (!newPassword) {
      toast.error('Please enter new password');
      return;
    }
    
    if (newPassword.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    // Update user password
    const updatedUsers = users.map(user => 
      user.email === resetEmail 
        ? { ...user, password: newPassword }
        : user
    );
    
    updateUsers(updatedUsers);
    
    toast.success('Password reset successfully! Please login with new password');
    
    // Go back to login
    onBack();
  };

  // Reset all states
  const resetForm = () => {
    setOtpSent(false);
    setShowResetForm(false);
    setResetEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setGeneratedOtp('');
    onBack();
  };

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

          {/* Forgot Password Body */}
          <div className="p-6">
            {/* Step 1: Enter Email */}
            {!otpSent && !showResetForm && (
              <form onSubmit={handleSendOTP} className="space-y-5">
                <div className="text-center mb-4">
                  <FiKey className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-gray-800">Reset Password</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Enter your email address to receive OTP
                  </p>
                </div>

                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition duration-300 flex items-center justify-center gap-2"
                >
                  <FiKey className="w-5 h-5" />
                  Send OTP
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full text-gray-600 hover:text-gray-800 text-sm py-2 transition flex items-center justify-center gap-1"
                >
                  <FiArrowLeft className="w-4 h-4" /> Back to Login
                </button>
              </form>
            )}

            {/* Step 2: Verify OTP */}
            {otpSent && !showResetForm && (
              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div className="text-center mb-4">
                  <FiKey className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-gray-800">Verify OTP</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Enter the 6-digit OTP sent to {resetEmail}
                  </p>
                </div>

                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Enter OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-center text-2xl tracking-widest"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 rounded-lg transition duration-300 flex items-center justify-center gap-2"
                >
                  <FiCheckCircle className="w-5 h-5" />
                  Verify OTP
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full text-gray-600 hover:text-gray-800 text-sm py-2 transition flex items-center justify-center gap-1"
                >
                  <FiArrowLeft className="w-4 h-4" /> Back to Login
                </button>
              </form>
            )}

            {/* Step 3: Reset Password */}
            {showResetForm && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="text-center mb-4">
                  <FiCheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-gray-800">Create New Password</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Enter your new password for {resetEmail}
                  </p>
                </div>

                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>

                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 rounded-lg transition duration-300 flex items-center justify-center gap-2"
                >
                  <FiCheckCircle className="w-5 h-5" />
                  Reset Password
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full text-gray-600 hover:text-gray-800 text-sm py-2 transition flex items-center justify-center gap-1"
                >
                  <FiArrowLeft className="w-4 h-4" /> Back to Login
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