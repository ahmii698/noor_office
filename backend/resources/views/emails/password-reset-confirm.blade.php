<!DOCTYPE html>
<html>
<head>
    <title>Password Changed Successfully</title>
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
        .content {
            padding: 30px;
            text-align: center;
        }
        .success-icon {
            font-size: 64px;
            color: #22c55e;
            margin-bottom: 20px;
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
            <p>Password Changed Successfully</p>
        </div>
        
        <div class="content">
            <div class="success-icon">✓</div>
            <h2>Hello {{ $name ?? 'User' }}!</h2>
            <p class="message">Your password has been successfully changed.</p>
            <p class="message">If you did not make this change, please contact us immediately.</p>
            <p class="message">You can now login with your new password.</p>
            
            <a href="{{ url('/') }}" class="button">Login to Dashboard</a>
        </div>
        
        <div class="footer">
            <p>&copy; 2024 Noorani Car AC & Autos. All rights reserved.</p>
            <p>123 Main Street, City | Phone: +92 300 1234567</p>
        </div>
    </div>
</body>
</html>