<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Vos identifiants de compte</title>
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
        <h2>Votre compte a été créé</h2>
    </div>
    
    <div class="content">
        <p>Bonjour {{ $name }},</p>
        
        <p>Votre compte a été créé avec succès. Voici vos identifiants de connexion :</p>
        
        <div class="credentials">
            <h3>Identifiants de connexion</h3>
            <p><strong>Email:</strong> {{ $email }}</p>
            <p><strong>Mot de passe:</strong> {{ $password }}</p>
        </div>
        
        <p>Veuillez vous connecter en utilisant ces identifiants et changer votre mot de passe pour des raisons de sécurité.</p>
        
        <a href="{{ url('/login') }}" class="button">Se connecter à votre compte</a>
        
        <p>Si vous avez des questions, veuillez contacter votre agence.</p>
        
        <p>Cordialement,<br>
        Centre Zawaj Maroc</p>
    </div>
</body>
</html>

