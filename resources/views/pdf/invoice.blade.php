<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture - {{ $bill->bill_number }}</title>
    <style>
        body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            background: white;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
        }
        .company-info {
            flex: 1;
        }
        .company-logo {
            width: 120px;
            height: auto;
            margin-bottom: 10px;
        }
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 5px;
        }
        .company-description {
            color: #6b7280;
            font-size: 14px;
        }
        .invoice-info {
            text-align: right;
        }
        .invoice-title {
            font-size: 20px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 5px;
        }
        .invoice-number {
            color: #6b7280;
            font-size: 14px;
        }
        .details-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        .billing-details, .order-details {
            flex: 1;
            margin-right: 20px;
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
        }
        .detail-item {
            margin-bottom: 5px;
            font-size: 14px;
        }
        .detail-label {
            font-weight: bold;
            color: #374151;
        }
        .pack-advantages {
            margin-bottom: 30px;
        }
        .advantages-title {
            font-size: 16px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 15px;
            text-align: center;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 10px;
            border-radius: 8px;
        }
        .advantages-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 10px;
            margin-bottom: 20px;
        }
        .advantage-item {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px;
            font-size: 14px;
            color: #475569;
            position: relative;
            padding-left: 30px;
        }
        .advantage-item::before {
            content: "•";
            position: absolute;
            left: 10px;
            color: #10b981;
            font-weight: bold;
            font-size: 16px;
            font-family: Arial, sans-serif;
        }
        .order-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            background: white;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .order-table th {
            background: #f8fafc;
            color: #374151;
            font-weight: bold;
            padding: 12px;
            text-align: left;
            border: 1px solid #e5e7eb;
        }
        .order-table td {
            padding: 12px;
            border: 1px solid #e5e7eb;
            font-size: 14px;
        }
        .order-table .text-center {
            text-align: center;
        }
        .order-table .text-right {
            text-align: right;
        }
        .pack-icon {
            width: 20px;
            height: 20px;
            margin-right: 8px;
            vertical-align: middle;
        }
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
        }
        .totals-table {
            width: 300px;
        }
        .totals-table .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .totals-table .total-row.final {
            font-weight: bold;
            font-size: 16px;
            border-top: 2px solid #3b82f6;
            padding-top: 10px;
            margin-top: 10px;
            color: #3b82f6;
        }
        .footer {
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            color: #6b7280;
        }
        .footer .generated-date {
            display: flex;
            align-items: center;
        }
        .footer .generated-date::before {
            content: "";
        }
        .payment-reminder {
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            text-align: center;
        }
        .payment-reminder h3 {
            color: #92400e;
            margin: 0 0 10px 0;
            font-size: 16px;
        }
        .payment-reminder h3::before {
            content: "";
        }
        .payment-reminder p {
            color: #78350f;
            margin: 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="company-info">
            <img src="{{ public_path('images/CENTRE-ZAWAJ-PNG-LOGO.png') }}" alt="CZM Logo" class="company-logo">
            <div class="company-name">Centre Zawaj Maroc</div>
            <div class="company-description">Service de mariage et accompagnement matrimonial</div>
        </div>
        <div class="invoice-info">
            <div class="invoice-title">FACTURE</div>
            <div class="invoice-number">N° {{ $bill->bill_number }}</div>
        </div>
    </div>

    <!-- Payment Reminder -->
    <div class="payment-reminder">
        <h3>Paiement en attente</h3>
        <p>Veuillez effectuer le paiement avant la date d'échéance pour activer votre pack matrimonial</p>
    </div>

    <!-- Details Section -->
    <div class="details-section">
        <div class="billing-details">
            <div class="section-title">Détails de facturation</div>
            <div class="detail-item">
                <span class="detail-label">Nom:</span> {{ $bill->user->name }}
            </div>
            <div class="detail-item">
                <span class="detail-label">Email:</span> {{ $bill->user->email }}
            </div>
            <div class="detail-item">
                <span class="detail-label">Téléphone:</span> {{ $bill->user->phone }}
            </div>
            <div class="detail-item">
                <span class="detail-label">Ville:</span> {{ $bill->user->city }}
            </div>
            <div class="detail-item">
                <span class="detail-label">Pays:</span> {{ $bill->user->country }}
            </div>
        </div>
        <div class="order-details">
            <div class="section-title">Informations de la commande</div>
            <div class="detail-item">
                <span class="detail-label">Numéro de commande:</span> {{ $bill->order_number }}
            </div>
            <div class="detail-item">
                <span class="detail-label">Date:</span> {{ \Carbon\Carbon::parse($bill->bill_date)->format('d/m/Y') }}
            </div>
            <div class="detail-item">
                <span class="detail-label">Date d'échéance:</span> {{ \Carbon\Carbon::parse($bill->due_date)->format('d/m/Y') }}
            </div>
            <div class="detail-item">
                <span class="detail-label">Mode de paiement:</span> {{ $bill->payment_method }}
            </div>
            <div class="detail-item">
                <span class="detail-label">Pack choisi:</span> {{ $bill->pack_name }}
            </div>
            <div class="detail-item">
                <span class="detail-label">Matchmaker:</span> {{ $bill->matchmaker->name }}
            </div>
            <div class="detail-item">
                <span class="detail-label">Email matchmaker:</span> {{ $bill->matchmaker->email }}
            </div>
        </div>
    </div>

    <!-- Pack Advantages -->
    @if($bill->pack_advantages && count($bill->pack_advantages) > 0)
    <div class="pack-advantages">
        <div class="advantages-title">AVANTAGES INCLUS DANS VOTRE PACK</div>
        <div class="advantages-grid">
            @foreach($bill->pack_advantages as $advantage)
            <div class="advantage-item">{{ $advantage }}</div>
            @endforeach
        </div>
    </div>
    @endif

    <!-- Order Details Table -->
    <table class="order-table">
        <thead>
            <tr>
                <th>Description</th>
                <th class="text-center">Quantité</th>
                <th class="text-right">Prix unitaire</th>
                <th class="text-right">Montant</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    <span style="color: #3b82f6; font-weight: bold;">{{ $bill->pack_name }}</span>
                </td>
                <td class="text-center">1</td>
                <td class="text-right">{{ number_format($bill->amount, 2) }} {{ $bill->currency }}</td>
                <td class="text-right">{{ number_format($bill->amount, 2) }} {{ $bill->currency }}</td>
            </tr>
        </tbody>
    </table>

    <!-- Totals -->
    <div class="totals-section">
        <div class="totals-table">
            <div class="total-row">
                <span>Sous-total:</span>
                <span>{{ number_format($bill->amount, 2) }} {{ $bill->currency }}</span>
            </div>
            <div class="total-row">
                <span>TVA ({{ $bill->tax_rate }}%):</span>
                <span>{{ number_format($bill->tax_amount, 2) }} {{ $bill->currency }}</span>
            </div>
            <div class="total-row final">
                <span>Total TTC:</span>
                <span>{{ number_format($bill->total_amount, 2) }} {{ $bill->currency }}</span>
            </div>
            <div class="total-row final">
                <span>Montant dû:</span>
                <span>{{ number_format($bill->total_amount, 2) }} {{ $bill->currency }}</span>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <div class="generated-date">
            Document généré le {{ \Carbon\Carbon::now()->format('d/m/Y à H:i') }}
        </div>
        <div>
            Centre Zawaj Maroc - Service de mariage et accompagnement matrimonial
        </div>
    </div>
</body>
</html>
