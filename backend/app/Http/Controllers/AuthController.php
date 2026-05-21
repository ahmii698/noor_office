<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        try {
            // Log login attempt
            Log::info('Login attempt', ['email' => $request->email]);
            
            $request->validate([
                'email' => 'required|email',
                'password' => 'required'
            ]);

            $user = User::where('email', $request->email)->first();

            if (!$user) {
                Log::warning('Login failed: User not found', ['email' => $request->email]);
                return response()->json([
                    'success' => false,
                    'message' => 'Account not found. Please check your email address.'
                ], 401);
            }

            // Check password - supports both bcrypt and plain text
            $passwordValid = false;
            
            // If password is already hashed (starts with $2y$)
            if (str_starts_with($user->password, '$2y$')) {
                $passwordValid = Hash::check($request->password, $user->password);
            } else {
                // Plain text password (from manual insert)
                $passwordValid = ($user->password === $request->password);
                
                // Update to hashed password for next time
                if ($passwordValid) {
                    $user->password = Hash::make($request->password);
                    $user->save();
                    Log::info('Password hashed for user', ['email' => $request->email]);
                }
            }

            if (!$passwordValid) {
                Log::warning('Login failed: Invalid password', ['email' => $request->email]);
                return response()->json([
                    'success' => false,
                    'message' => 'Wrong password! Please try again.'
                ], 401);
            }

            // Delete old tokens
            try {
                $user->tokens()->delete();
            } catch (\Exception $e) {
                // Token table might not exist, continue anyway
                Log::warning('Could not delete tokens: ' . $e->getMessage());
            }
            
            // Create new token
            $token = $user->createToken('auth_token')->plainTextToken;

            Log::info('Login successful', ['email' => $request->email, 'user_id' => $user->id]);

            return response()->json([
                'success' => true,
                'message' => 'Login successful! Welcome back.',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role
                ],
                'token' => $token
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide valid email and password.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Login error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Server error. Please try again later.'
            ], 500);
        }
    }

    public function logout(Request $request)
    {
        try {
            if ($request->user()) {
                $request->user()->currentAccessToken()->delete();
            }
            return response()->json([
                'success' => true,
                'message' => 'Logged out successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Logout failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function forgotPassword(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email'
            ]);
            
            $user = User::where('email', $request->email)->first();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Email not found. Please check your email address.'
                ], 404);
            }

            $otp = rand(100000, 999999);
            $token = Str::random(60);

            // Delete old reset requests
            PasswordReset::where('email', $request->email)->delete();
            
            // Create new reset request
            PasswordReset::create([
                'email' => $request->email,
                'token' => $token,
                'otp' => $otp,
                'expires_at' => now()->addMinutes(30)
            ]);

            // In production, send email here
            return response()->json([
                'success' => true,
                'message' => 'OTP sent successfully to your email.',
                'otp' => $otp, // Remove in production
                'token' => $token
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to send OTP. Please try again.'
            ], 500);
        }
    }

    public function verifyOtp(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'otp' => 'required|string|size:6'
            ]);

            $reset = PasswordReset::where('email', $request->email)
                ->where('otp', $request->otp)
                ->where('expires_at', '>', now())
                ->first();

            if (!$reset) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid or expired OTP. Please request a new one.'
                ], 400);
            }

            return response()->json([
                'success' => true,
                'message' => 'OTP verified successfully.',
                'token' => $reset->token
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'OTP verification failed. Please try again.'
            ], 500);
        }
    }

    public function resetPassword(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'token' => 'required|string',
                'password' => 'required|min:4|confirmed'
            ]);

            $reset = PasswordReset::where('email', $request->email)
                ->where('token', $request->token)
                ->where('expires_at', '>', now())
                ->first();

            if (!$reset) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid or expired token. Please request a new password reset.'
                ], 400);
            }

            $user = User::where('email', $request->email)->first();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found.'
                ], 404);
            }

            // Update password with bcrypt hash
            $user->password = Hash::make($request->password);
            $user->save();

            // Delete all reset requests for this email
            PasswordReset::where('email', $request->email)->delete();
            
            // Delete all user tokens (force re-login)
            try {
                $user->tokens()->delete();
            } catch (\Exception $e) {
                // Token table might not exist
            }

            return response()->json([
                'success' => true,
                'message' => 'Password reset successful! Please login with your new password.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Password reset failed. Please try again.'
            ], 500);
        }
    }
    
    // Get authenticated user
    public function me(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated. Please login again.'
                ], 401);
            }
            
            return response()->json([
                'success' => true,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get user information.'
            ], 500);
        }
    }
}