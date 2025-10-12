<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Votre facture - Centre Zawaj Maroc</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
            color: #333;
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
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
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
            color: #1f2937;
            margin-bottom: 20px;
        }
        .bill-info {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
        }
        .bill-number {
            font-size: 20px;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 10px;
        }
        .bill-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            font-size: 14px;
        }
        .detail-item {
            display: flex;
            justify-content: space-between;
        }
        .detail-label {
            font-weight: bold;
            color: #374151;
        }
        .pack-advantages {
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
        }
        .advantages-title {
            font-size: 16px;
            font-weight: bold;
            color: #92400e;
            margin-bottom: 15px;
            text-align: center;
        }
        .advantages-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .advantages-list li {
            padding: 8px 0;
            color: #78350f;
            position: relative;
            padding-left: 25px;
        }
        .advantages-list li::before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #10b981;
            font-weight: bold;
        }
        .amount-section {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin-bottom: 25px;
        }
        .amount-label {
            font-size: 14px;
            color: #0369a1;
            margin-bottom: 5px;
        }
        .amount-value {
            font-size: 28px;
            font-weight: bold;
            color: #0c4a6e;
        }
        .payment-reminder {
            background: #fef2f2;
            border: 1px solid #f87171;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin-bottom: 25px;
        }
        .payment-reminder h3 {
            color: #dc2626;
            margin: 0 0 10px 0;
            font-size: 16px;
        }
        .payment-reminder p {
            color: #991b1b;
            margin: 0;
            font-size: 14px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #10b981, #059669);
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
            background: #f8fafc;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
        }
        .contact-info {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <img src="{{ asset('images/CENTRE-ZAWAJ-PNG-LOGO.png') }}" alt="CZM Logo" class="logo">
            <div class="company-name">Centre Zawaj Maroc</div>
            <div class="company-tagline">Service de mariage et accompagnement matrimonial</div>
        </div>

        <!-- Content -->
        <div class="content">
            <div class="greeting">
                Bonjour {{ $bill->user->name }},
            </div>

            <p>Nous vous remercions pour votre confiance en Centre Zawaj Maroc. Votre facture est prête et vous trouverez le PDF en pièce jointe.</p>

            <!-- Bill Information -->
            <div class="bill-info">
                <div class="bill-number">Facture N° {{ $bill->bill_number }}</div>
                <div class="bill-details">
                    <div class="detail-item">
                        <span class="detail-label">Numéro de commande:</span>
                        <span>{{ $bill->order_number }}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Date d'échéance:</span>
                        <span>{{ \Carbon\Carbon::parse($bill->due_date)->format('d/m/Y') }}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Pack choisi:</span>
                        <span>{{ $bill->pack_name }}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Mode de paiement:</span>
                        <span>{{ $bill->payment_method }}</span>
                    </div>
                </div>
            </div>

            <!-- Pack Advantages -->
            @if($bill->pack_advantages && count($bill->pack_advantages) > 0)
            <div class="pack-advantages">
                <div class="advantages-title">🎁 Avantages inclus dans votre pack</div>
                <ul class="advantages-list">
                    @foreach($bill->pack_advantages as $advantage)
                    <li>{{ $advantage }}</li>
                    @endforeach
                </ul>
            </div>
            @endif

            <!-- Amount Section -->
            <div class="amount-section">
                <div class="amount-label">Montant total à payer</div>
                <div class="amount-value">{{ number_format($bill->total_amount, 2) }} {{ $bill->currency }}</div>
            </div>

            <!-- Payment Reminder -->
            <div class="payment-reminder">
                <h3>⏰ Paiement en attente</h3>
                <p>Veuillez effectuer le paiement avant le {{ \Carbon\Carbon::parse($bill->due_date)->format('d/m/Y') }} pour activer votre pack matrimonial et commencer votre parcours vers le mariage.</p>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center;">
                <a href="{{ route('mes-commandes') }}" class="cta-button">
                    Voir mes commandes
                </a>
            </div>

            <p>Si vous avez des questions concernant cette facture, n'hésitez pas à contacter votre matchmaker ou notre équipe de support.</p>

            <p>Cordialement,<br>
            <strong>L'équipe Centre Zawaj Maroc</strong></p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div>Centre Zawaj Maroc - Service de mariage et accompagnement matrimonial</div>
            <div class="contact-info">
                <strong>Votre matchmaker:</strong> {{ $bill->matchmaker->name }}<br>
                <strong>Email:</strong> {{ $bill->matchmaker->email }}<br>
                <strong>Téléphone:</strong> {{ $bill->matchmaker->phone ?? 'Non disponible' }}
            </div>
        </div>
    </div>
</body>
</html>
