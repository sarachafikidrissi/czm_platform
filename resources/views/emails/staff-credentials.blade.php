<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Staff Account Credentials</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #722323;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .credentials {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #722323;
        }
        .button {
            display: inline-block;
            background-color: #722323;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Centre Zawaj Maroc</h1>
        <h2>Staff Account Created</h2>
    </div>
    
    <div class="content">
        <p>Hello {{ $name }},</p>
        
        <p>Your staff account has been created successfully. Below are your login credentials:</p>
        
        <div class="credentials">
            <h3>Login Credentials</h3>
            <p><strong>Email:</strong> {{ $email }}</p>
            <p><strong>Password:</strong> {{ $password }}</p>
            <p><strong>Role:</strong> {{ ucfirst($role) }}</p>
        </div>
        
        <p>Please log in using these credentials and change your password for security purposes.</p>
        
        <a href="{{ url('/login') }}" class="button">Login to Your Account</a>
        
        <p>If you have any questions, please contact the administrator.</p>
        
        <p>Best regards,<br>
        Centre Zawaj Maroc Team</p>
    </div>
</body>
</html>
