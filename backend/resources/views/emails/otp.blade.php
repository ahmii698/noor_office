<!DOCTYPE html>
<html>
<head>
    <title>Password Reset OTP</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 500px;
            margin: 50px auto;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 30px;
            text-align: center;
        }
        .otp-code {
            font-size: 48px;
            font-weight: bold;
            color: #ef4444;
            letter-spacing: 10px;
            background: #fef2f2;
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
            font-family: monospace;
        }
        .message {
            color: #333;
            line-height: 1.6;
            margin: 20px 0;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #e5e7eb;
        }
        .button {
            background: #ef4444;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            display: inline-block;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>❄️ NOORANI CAR AC & AUTOS</h1>
            <p>Password Reset Request</p>
        </div>
        
        <div class="content">
            <h2>Hello {{ $name ?? 'User' }}!</h2>
            <p class="message">We received a request to reset your password. Use the following OTP code to complete the process:</p>
            
            <div class="otp-code">{{ $otp }}</div>
            
            <p class="message">This OTP is valid for <strong>30 minutes</strong>. If you didn't request this, please ignore this email.</p>
            
            <p class="message">For security reasons, never share this OTP with anyone.</p>
        </div>
        
        <div class="footer">
            <p>&copy; 2024 Noorani Car AC & Autos. All rights reserved.</p>
            <p>123 Main Street, City | Phone: +92 300 1234567</p>
            <p>This is an automated email, please do not reply.</p>
        </div>
    </div>
</body>
</html>