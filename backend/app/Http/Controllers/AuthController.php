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
    // ✅ LOGIN
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
                    'role' => $user->role,
                    'is_admin' => $user->isAdmin(),
                ],
                'token' => $token
            ]);
        } catch (\Exception $e) {
            Log::error('Login error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Login failed: ' . $e->getMessage()
            ], 500);
        }
    }

    // ✅ GET CURRENT USER
    public function me(Request $request)
    {
        try {
            $user = $request->user();
            return response()->json([
                'success' => true,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'is_admin' => $user->isAdmin(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get user data'
            ], 500);
        }
    }

    // ✅ LOGOUT
    public function logout(Request $request)
    {
        try {
            $request->user()->currentAccessToken()->delete();
            return response()->json([
                'success' => true,
                'message' => 'Logged out successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Logout failed'
            ], 500);
        }
    }

    // ✅ FORGOT PASSWORD - Send OTP
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

            DB::table('password_resets')->where('email', $request->email)->delete();
            
            DB::table('password_resets')->insert([
                'email' => $request->email,
                'token' => $token,
                'otp' => $otp,
                'expires_at' => now()->addMinutes(30),
                'created_at' => now()
            ]);

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

    // ✅ SEND OTP EMAIL
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

    // ✅ VERIFY OTP
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

    // ✅ RESET PASSWORD
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

    // ✅ ==================== USER MANAGEMENT (ADMIN ONLY) ====================

    // ✅ GET ALL USERS
    public function getUsers(Request $request)
    {
        try {
            // Check if user is admin
            if (!$request->user()->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized - Admin only'
                ], 403);
            }

            $users = User::select('id', 'name', 'email', 'role', 'created_at', 'updated_at')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $users
            ]);
        } catch (\Exception $e) {
            Log::error('Get users error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch users'
            ], 500);
        }
    }

    // ✅ CREATE NEW USER (Admin only)
    public function createUser(Request $request)
    {
        try {
            // Check if user is admin
            if (!$request->user()->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized - Admin only'
                ], 403);
            }

            $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|min:6',
                'role' => 'required|in:admin,employee'
            ]);

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role' => $request->role,
            ]);

            Log::info('New user created: ' . $user->email . ' by admin: ' . $request->user()->email);

            return response()->json([
                'success' => true,
                'message' => 'User created successfully',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ]
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Create user error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create user: ' . $e->getMessage()
            ], 500);
        }
    }

    // ✅ UPDATE USER (Admin only)
    public function updateUser(Request $request, $id)
    {
        try {
            // Check if user is admin
            if (!$request->user()->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized - Admin only'
                ], 403);
            }

            $user = User::findOrFail($id);

            $request->validate([
                'name' => 'sometimes|string|max:255',
                'email' => 'sometimes|email|unique:users,email,' . $id,
                'password' => 'sometimes|min:6',
                'role' => 'sometimes|in:admin,employee'
            ]);

            if ($request->has('name')) {
                $user->name = $request->name;
            }
            if ($request->has('email')) {
                $user->email = $request->email;
            }
            if ($request->has('password') && !empty($request->password)) {
                $user->password = Hash::make($request->password);
            }
            if ($request->has('role')) {
                $user->role = $request->role;
            }
            $user->save();

            Log::info('User updated: ' . $user->email . ' by admin: ' . $request->user()->email);

            return response()->json([
                'success' => true,
                'message' => 'User updated successfully',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ]
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'User not found'
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Update user error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update user: ' . $e->getMessage()
            ], 500);
        }
    }

    // ✅ DELETE USER (Admin only)
    public function deleteUser(Request $request, $id)
    {
        try {
            // Check if user is admin
            if (!$request->user()->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized - Admin only'
                ], 403);
            }

            $user = User::findOrFail($id);

           
            if ($user->id === $request->user()->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'You cannot delete your own account'
                ], 400);
            }

            $userEmail = $user->email;
            $user->delete();

            Log::info('User deleted: ' . $userEmail . ' by admin: ' . $request->user()->email);

            return response()->json([
                'success' => true,
                'message' => 'User deleted successfully'
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'User not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Delete user error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete user: ' . $e->getMessage()
            ], 500);
        }
    }
}