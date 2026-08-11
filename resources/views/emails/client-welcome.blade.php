<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenue parmi nos clients - Centre Zawaj Maroc</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #f8fafc;
            color: #1f2937;
            font-family: Arial, sans-serif;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            overflow: hidden;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08);
        }
        .header {
            padding: 30px;
            color: #ffffff;
            text-align: center;
            background: linear-gradient(135deg, #059669, #076725);
        }
        .logo {
            width: 80px;
            height: auto;
            margin-bottom: 15px;
        }
        .content {
            padding: 30px;
            line-height: 1.6;
        }
        .summary {
            padding: 20px;
            margin: 24px 0;
            border: 2px solid #10b981;
            border-radius: 8px;
            background: #f0fdf4;
        }
        .summary strong {
            color: #047857;
        }
        .contact {
            padding: 20px;
            margin-top: 24px;
            border-radius: 8px;
            background: #f8fafc;
        }
        .footer {
            padding: 20px;
            color: #4b5563;
            text-align: center;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="{{ asset('images/czm_Logo.png') }}" alt="CZM Logo" class="logo">
            <h1>Bienvenue parmi nos clients</h1>
            <div>Centre Zawaj Maroc</div>
        </div>

        <div class="content">
            <p>Bonjour {{ $user->name }},</p>

            <p>
                Nous vous confirmons que votre paiement a bien été enregistré et que votre
                accompagnement matrimonial est désormais actif.
            </p>

            <div class="summary">
                <div><strong>Pack activé :</strong> {{ $bill?->pack_name ?? 'Abonnement' }}</div>
                <div><strong>Statut :</strong> Client actif</div>
            </div>

            <p>
                {{ count($paidBills) > 1
                    ? 'Vos factures acquittées sont jointes à cet email au format PDF.'
                    : 'Votre facture acquittée est jointe à cet email au format PDF.' }}
            </p>

            @if($matchmaker)
                <div class="contact">
                    <strong>Votre matchmaker</strong><br>
                    {{ $matchmaker->name }}<br>
                    Email : {{ $matchmaker->email }}<br>
                    Téléphone : {{ $matchmaker->phone ?? 'Non disponible' }}
                </div>
            @endif

            <p>
                Votre matchmaker reste à votre disposition pour vous accompagner durant
                toutes les étapes de votre parcours.
            </p>

            <p>
                Cordialement,<br>
                <strong>L'équipe Centre Zawaj Maroc</strong>
            </p>
        </div>

        <div class="footer">
            Centre Zawaj Maroc — Service de mariage et accompagnement matrimonial
        </div>
    </div>
</body>
</html>
