<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required'
            ]);

            $user = User::where('email', $request->email)->first();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Account not found'
                ], 401);
            }

            if (!Hash::check($request->password, $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Wrong password!'
                ], 401);
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'Login successful',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role
                ],
                'token' => $token
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Login failed'
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
                    'message' => 'Email not found'
                ], 404);
            }

            $otp = rand(100000, 999999);
            $token = Str::random(60);

            // Delete old reset requests
            DB::table('password_resets')->where('email', $request->email)->delete();
            
            // Create new reset request
            DB::table('password_resets')->insert([
                'email' => $request->email,
                'token' => $token,
                'otp' => $otp,
                'expires_at' => now()->addMinutes(30),
                'created_at' => now()
            ]);

            // Send email with OTP
            $this->sendOtpEmail($request->email, $user->name, $otp);

            return response()->json([
                'success' => true,
                'message' => 'OTP sent successfully to your email',
                'token' => $token
            ]);
            
        } catch (\Exception $e) {
            Log::error('Forgot password error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to send OTP: ' . $e->getMessage()
            ], 500);
        }
    }

    private function sendOtpEmail($email, $name, $otp)
    {
        try {
            $html = "
            <html>
            <head><title>Password Reset OTP</title></head>
            <body style='font-family: Arial, sans-serif;'>
                <div style='max-width: 500px; margin: 0 auto; padding: 20px;'>
                    <div style='background: #ef4444; color: white; padding: 20px; text-align: center;'>
                        <h2>❄️ NOORANI CAR AC & AUTOS</h2>
                    </div>
                    <div style='padding: 20px; text-align: center;'>
                        <h3>Hello " . $name . ",</h3>
                        <p>You requested to reset your password. Use the following OTP code:</p>
                        <div style='font-size: 32px; font-weight: bold; color: #ef4444; letter-spacing: 5px; margin: 20px 0;'>
                            " . $otp . "
                        </div>
                        <p>This OTP is valid for 30 minutes.</p>
                        <p>If you didn't request this, please ignore this email.</p>
                    </div>
                    <div style='text-align: center; padding: 20px; color: #666; font-size: 12px;'>
                        <p>Noorani Car AC & Autos | Professional Auto Care Service</p>
                    </div>
                </div>
            </body>
            </html>
            ";

            Mail::html($html, function ($message) use ($email) {
                $message->to($email)
                        ->subject('Password Reset OTP - Noorani Car AC');
            });
            
            Log::info('OTP email sent to: ' . $email);
        } catch (\Exception $e) {
            Log::error('Mail send failed: ' . $e->getMessage());
        }
    }

    public function verifyOtp(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'otp' => 'required|string|size:6'
            ]);

            $reset = DB::table('password_resets')
                ->where('email', $request->email)
                ->where('otp', $request->otp)
                ->where('expires_at', '>', now())
                ->first();

            if (!$reset) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid or expired OTP'
                ], 400);
            }

            return response()->json([
                'success' => true,
                'message' => 'OTP verified successfully',
                'token' => $reset->token
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'OTP verification failed'
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

            $reset = DB::table('password_resets')
                ->where('email', $request->email)
                ->where('token', $request->token)
                ->where('expires_at', '>', now())
                ->first();

            if (!$reset) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid or expired token'
                ], 400);
            }

            $user = User::where('email', $request->email)->first();
            $user->password = Hash::make($request->password);
            $user->save();

            DB::table('password_resets')->where('email', $request->email)->delete();
            $user->tokens()->delete();

            return response()->json([
                'success' => true,
                'message' => 'Password reset successful! Please login.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Password reset failed'
            ], 500);
        }
    }
}