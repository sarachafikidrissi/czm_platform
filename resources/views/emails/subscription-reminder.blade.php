<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rappel d'abonnement - Centre Zawaj Maroc</title>
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
        .reminder-info {
            background: #ffffff;
            border: 2px solid #10b981;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
            text-align: center;
        }
        .reminder-info.expired {
            border-color: #dc2626;
        }
        .reminder-title {
            font-size: 20px;
            font-weight: bold;
            color: #000000;
            margin-bottom: 15px;
        }
        .days-remaining {
            font-size: 36px;
            font-weight: bold;
            color: #10b981;
            margin: 10px 0;
        }
        .days-remaining.expired {
            color: #dc2626;
        }
        .expiration-date {
            font-size: 16px;
            color: #000000;
            margin-top: 10px;
        }
        .subscription-details {
            background: #ffffff;
            border: 2px solid #10b981;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
        }
        .detail-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #000000;
            font-size: 14px;
        }
        .detail-item:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: bold;
            color: #000000;
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
        .contact-info {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #000000;
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
                Bonjour {{ $subscription->user->name }},
            </div>

            <p>Nous tenons à vous rappeler que votre abonnement au pack matrimonial arrive à expiration prochainement.</p>

            <!-- Reminder Info -->
            <div class="reminder-info {{ $daysRemaining <= 0 ? 'expired' : '' }}">
                <div class="reminder-title">⏰ Rappel d'abonnement</div>
                @if($daysRemaining > 0)
                    <div class="days-remaining">{{ $daysRemaining }} {{ $daysRemaining == 1 ? 'jour restant' : 'jours restants' }}</div>
                @else
                    <div class="days-remaining expired">Votre abonnement a expiré</div>
                @endif
                <div class="expiration-date">
                    Date d'expiration: {{ \Carbon\Carbon::parse($subscription->subscription_end)->format('d/m/Y') }}
                </div>
            </div>

            <!-- Subscription Details -->
            <div class="subscription-details">
                <div class="detail-item">
                    <span class="detail-label">Pack:</span>
                    <span>{{ $subscription->matrimonialPack->name }}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Date de début:</span>
                    <span>{{ \Carbon\Carbon::parse($subscription->subscription_start)->format('d/m/Y') }}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Date de fin:</span>
                    <span>{{ \Carbon\Carbon::parse($subscription->subscription_end)->format('d/m/Y') }}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Durée:</span>
                    <span>{{ $subscription->duration_months }} mois</span>
                </div>
            </div>

            @if($daysRemaining > 0)
                <p>Nous vous encourageons à renouveler votre abonnement pour continuer à bénéficier de nos services de qualité et de votre accompagnement personnalisé.</p>
            @else
                <p><strong>Votre abonnement a expiré.</strong> Pour continuer à bénéficier de nos services, veuillez renouveler votre abonnement.</p>
            @endif

            <!-- CTA Button -->
            <div style="text-align: center;">
                <a href="{{ route('user.subscription') }}" class="cta-button">
                    Voir mon abonnement
                </a>
            </div>

            <p>Si vous avez des questions concernant votre abonnement, n'hésitez pas à contacter votre matchmaker ou notre équipe de support.</p>

            <p>Cordialement,<br>
            <strong>L'équipe Centre Zawaj Maroc</strong></p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div>Centre Zawaj Maroc - Service de mariage et accompagnement matrimonial</div>
            @if($subscription->assignedMatchmaker)
            <div class="contact-info">
                <strong>Votre matchmaker:</strong> {{ $subscription->assignedMatchmaker->name }}<br>
                <strong>Email:</strong> {{ $subscription->assignedMatchmaker->email }}<br>
                <strong>Téléphone:</strong> {{ $subscription->assignedMatchmaker->phone ?? 'Non disponible' }}
            </div>
            @endif
        </div>
    </div>
</body>
</html>

