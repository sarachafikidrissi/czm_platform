<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nouvelle réponse à votre commentaire - Centre Zawaj Maroc</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            color: #000000;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg,#059669, #076725);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .logo {
            width: 80px;
            height: auto;
            margin-bottom: 15px;
        }
        .company-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .company-tagline {
            font-size: 14px;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .greeting {
            font-size: 18px;
            color: #000000;
            margin-bottom: 20px;
        }
        .comment-box {
            background: #f9fafb;
            border: 2px solid #10b981;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .comment-header {
            font-weight: bold;
            color: #000000;
            margin-bottom: 10px;
            font-size: 16px;
        }
        .comment-content {
            color: #000000;
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 10px;
        }
        .comment-author {
            color: #6b7280;
            font-size: 12px;
            margin-top: 10px;
        }
        .reply-box {
            background: #ffffff;
            border-left: 4px solid #10b981;
            padding: 15px;
            margin: 15px 0;
        }
        .cta-button {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0;
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .footer {
            background: #ffffff;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #000000;
            border-top: 2px solid #10b981;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <img src="{{ asset('images/czm_Logo.png') }}" alt="CZM Logo" class="logo">
            <div class="company-name">Centre Zawaj Maroc</div>
            <div class="company-tagline">Service de mariage et accompagnement matrimonial</div>
        </div>

        <!-- Content -->
        <div class="content">
            <div class="greeting">
                Bonjour {{ $parentComment->user->name }},
            </div>

            <p>{{ $replier->name }} a répondu à votre commentaire.</p>

            <!-- Your Original Comment -->
            <div class="comment-box">
                <div class="comment-header">Votre commentaire:</div>
                <div class="comment-content">{{ $parentComment->content }}</div>
            </div>

            <!-- Reply -->
            <div class="reply-box">
                <div class="comment-header">Réponse de {{ $replier->name }}:</div>
                <div class="comment-content">{{ $reply->content }}</div>
                <div class="comment-author">
                    {{ \Carbon\Carbon::parse($reply->created_at)->format('d/m/Y à H:i') }}
                </div>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center;">
                <a href="{{ route('posts.index') }}" class="cta-button">
                    Voir la discussion
                </a>
            </div>

            <p>Cordialement,<br>
            <strong>L'équipe Centre Zawaj Maroc</strong></p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div>Centre Zawaj Maroc - Service de mariage et accompagnement matrimonial</div>
        </div>
    </div>
</body>
</html>

