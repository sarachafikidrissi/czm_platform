<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture - {{ $bill->bill_number }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, Helvetica, sans-serif;
            color: #000000;
            background: #FFFFFF;
            padding: 40px 50px;
            font-size: 14px;
            line-height: 1.6;
        }
        .receipt-header {
            margin-bottom: 30px;
            overflow: hidden;
            width: 100%;
        }
        .receipt-header:after {
            content: "";
            display: table;
            clear: both;
        }
        .receipt-title {
            float: left;
            font-size: 32px;
            font-weight: bold;
            color: #000000;
        }
        .logo-container {
            float: right;
            text-align: right;
        }
        /* .logo-container {
            text-align: right;
        } */
        .logo {
            width: 150px;
            height: auto;
            max-height: 150px;
        }
        .invoice-details {
            margin-bottom: 30px;
        }
        .invoice-detail-row {
            margin-bottom: 8px;
            font-size: 14px;
            line-height: 1.8;
        }
        .invoice-detail-label {
            font-weight: bold;
            color: #000000;
        }
        .invoice-detail-value {
            color: #000000;
        }
        .billing-info {
            margin-bottom: 50px;
            margin-top: 20px;
            overflow: hidden;
        }
        .sender-info, .recipient-info {
            width: 45%;
            float: left;
            margin-right: 5%;
        }
        .recipient-info {
            margin-right: 0;
            float: right;
        }
        .info-title {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 12px;
            color: #000000;
            float: left;
            width: 30%;
        }
        .info-content {
            font-size: 14px;
            color: #000000;
            line-height: 1.8;
            float: left;
            width: 65%;
            margin-left: 5%;
        }
        .sender-info:after, .recipient-info:after {
            content: "";
            display: table;
            clear: both;
        }
        .info-content p {
            margin-bottom: 4px;
        }
        .payment-summary {
            margin: 40px 0;
            font-size: 20px;
            font-weight: bold;
            color: #000000;
            text-align: center;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .items-table thead th {
            text-align: left;
            font-weight: bold;
            font-size: 14px;
            color: #000000;
            padding-bottom: 8px;
            border-bottom: 1px solid #d0d0d0;
            padding-top: 20px;
        }
        .items-table thead th.text-right {
            text-align: right;
        }
        .items-table tbody td {
            padding: 12px 0;
            font-size: 14px;
            color: #000000;
            border-bottom: 1px solid #f0f0f0;
        }
        .items-table tbody td.text-right {
            text-align: right;
        }
        .totals {
            margin-top: 20px;
            margin-bottom: 50px;
            text-align: right;
        }
        .total-row {
            padding: 8px 0;
            font-size: 14px;
            color: #000000;
            border-bottom: 1px solid #f0f0f0;
            text-align: right;
            overflow: hidden;
        }
        .total-label {
            display: inline-block;
            margin-right: 20px;
        }
        .total-value {
            display: inline-block;
        }
        .total-row.amount-paid {
            font-weight: bold;
            font-size: 16px;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #d0d0d0;
            border-bottom: none;
        }
        .total-label {
            color: #000000;
            display: inline-block;
            margin-right: 20px;
        }
        .total-value {
            color: #000000;
            font-weight: inherit;
            min-width: 100px;
            text-align: right;
            display: inline-block;
        }
        .payment-history {
            margin-top: 50px;
            margin-bottom: 40px;
        }
        .payment-history-title {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 20px;
            color: #000000;
        }
        .payment-table {
            width: 100%;
            border-collapse: collapse;
        }
        .payment-table thead th {
            text-align: left;
            font-weight: bold;
            font-size: 14px;
            color: #000000;
            padding-bottom: 8px;
            border-bottom: 1px solid #d0d0d0;
        }
        .payment-table thead th.text-right {
            text-align: right;
        }
        .payment-table tbody td {
            padding: 12px 0;
            font-size: 14px;
            color: #000000;
            border-bottom: 1px solid #f0f0f0;
        }
        .payment-table tbody td.text-right {
            text-align: right;
        }
        .additional-info {
            margin-top: 40px;
            margin-bottom: 30px;
            font-size: 14px;
            color: #000000;
        }
        .additional-info p {
            margin-bottom: 6px;
        }
        .footer-text {
            margin-top: 40px;
            font-size: 12px;
            color: #666666;
            line-height: 1.8;
        }
        .page-number {
            text-align: right;
            font-size: 12px;
            color: #666666;
            margin-top: 30px;
        }
        .pdf-footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            clear: both;
        }
        .footer-content {
            width: 100%;
            margin-bottom: 20px;
            font-size: 11px;
            line-height: 1.6;
            overflow: hidden;
        }
        .footer-content:after {
            content: "";
            display: table;
            clear: both;
        }
        .footer-left {
            float: left;
            width: 48%;
        }
        .footer-right {
            float: right;
            width: 48%;
        }
        .footer-company-name {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 8px;
            color: #000000;
        }
        .footer-address {
            color: #000000;
            margin-bottom: 4px;
        }
        .footer-registration {
            color: #000000;
            margin-top: 8px;
        }
        .footer-registration div {
            margin-bottom: 2px;
        }
        .footer-contact-title {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 8px;
            color: #000000;
        }
        .footer-contact-info {
            color: #000000;
            margin-bottom: 4px;
        }
        .footer-contact-info a {
            color: #0066cc;
            text-decoration: none;
        }
        .footer-thank-you {
            background-color: #28a745;
            color: #ffffff;
            text-align: center;
            padding: 15px 0;
            font-weight: bold;
            font-size: 14px;
            letter-spacing: 1px;
            margin-top: 20px;
        }
        .pack-name {
            font-weight: bold;
            color: #000000;
        }
    </style>
</head>
<body>
    <!-- Receipt Header: Title and Logo -->
    <div class="receipt-header">
        <div class="receipt-title">Facture</div>
        <div class="logo-container">
            @php
                $logoPath = public_path('images/czm_Logo.png');
            @endphp
            @if(file_exists($logoPath))
            <img src="{{ $logoPath }}" alt="CZM Logo" class="logo">
            @endif
        </div>
    </div>

    <!-- Invoice Details -->
    <div class="invoice-details">
        <div class="invoice-detail-row">
            <span class="invoice-detail-label">Numéro de facture:</span>
            <span class="invoice-detail-value"> {{ $bill->bill_number }}</span>
        </div>
        <div class="invoice-detail-row">
            <span class="invoice-detail-label">Date:</span>
            <span class="invoice-detail-value"> {{ \Carbon\Carbon::parse($bill->bill_date)->format('d F Y') }}</span>
        </div>
        @if($bill->status === 'paid')
        <div class="invoice-detail-row">
            <span class="invoice-detail-label">Date de paiement:</span>
            <span class="invoice-detail-value"> {{ \Carbon\Carbon::parse($bill->updated_at)->format('d F Y') }}</span>
        </div>
        @endif
    </div>

    <!-- Billing Information -->
    <div class="billing-info">
        <div class="sender-info">
            <div class="info-title">Centre Zawaj Maroc</div>
            <div class="info-content">
                <p>Service de mariage et accompagnement matrimonial</p>
                @if($bill->matchmaker)
                <p>{{ $bill->matchmaker->name }}</p>
                <p>{{ $bill->matchmaker->email }}</p>
                @if($bill->matchmaker->phone)
                <p>{{ $bill->matchmaker->phone }}</p>
                @endif
                @endif
            </div>
        </div>
        <div class="recipient-info">
            <div class="info-title">Facturer à</div>
            <div class="info-content">
                <p>{{ $bill->user->name }}</p>
                @if($bill->user->email)
                <p>{{ $bill->user->email }}</p>
                @endif
                @if($bill->user->phone)
                <p>{{ $bill->user->phone }}</p>
                @endif
                @if($bill->user->city)
                <p>{{ $bill->user->city }}{{ $bill->user->country ? ', ' . $bill->user->country : '' }}</p>
                @endif
            </div>
        </div>
    </div>

    <!-- Payment Summary -->
    @if($bill->status === 'paid')
    <div class="payment-summary">
        {{ number_format($bill->total_amount, 2) }} {{ $bill->currency }} payé le {{ \Carbon\Carbon::parse($bill->updated_at)->format('d F Y') }}
    </div>
    @else
    <div class="payment-summary">
        {{ number_format($bill->total_amount, 2) }} {{ $bill->currency }} à payer avant le {{ \Carbon\Carbon::parse($bill->due_date)->format('d F Y') }}
    </div>
    @endif

    <!-- Items Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th>Description</th>
                <th class="text-right">Qté</th>
                <th class="text-right">Prix unitaire</th>
                <th class="text-right">Montant</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    <span class="pack-name">{{ $bill->pack_name }}</span>
                </td>
                <td class="text-right">1</td>
                <td class="text-right">{{ number_format($bill->amount, 2) }} {{ $bill->currency }}</td>
                <td class="text-right">{{ number_format($bill->amount, 2) }} {{ $bill->currency }}</td>
            </tr>
        </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
        <div class="total-row">
            <span class="total-label">Sous-total</span>
            <span class="total-value">{{ number_format($bill->amount, 2) }} {{ $bill->currency }}</span>
        </div>
        <div class="total-row">
            <span class="total-label">TVA ({{ number_format($bill->tax_rate, 0) }}%)</span>
            <span class="total-value">{{ number_format($bill->tax_amount, 2) }} {{ $bill->currency }}</span>
        </div>
        <div class="total-row">
            <span class="total-label">Total</span>
            <span class="total-value">{{ number_format($bill->total_amount, 2) }} {{ $bill->currency }}</span>
        </div>
        @if($bill->status === 'paid')
        <div class="total-row amount-paid">
            <span class="total-label">Montant payé</span>
            <span class="total-value">{{ number_format($bill->total_amount, 2) }} {{ $bill->currency }}</span>
        </div>
        @else
        <div class="total-row amount-paid">
            <span class="total-label">Montant dû</span>
            <span class="total-value">{{ number_format($bill->total_amount, 2) }} {{ $bill->currency }}</span>
        </div>
        @endif
    </div>

    <!-- Payment History -->
    <div class="payment-history">
        <div class="payment-history-title">Historique de paiement</div>
        <table class="payment-table">
            <thead>
                <tr>
                    <th>Mode de paiement</th>
                    <th class="text-right">Date</th>
                    <th class="text-right">Montant payé</th>
                    <th class="text-right">Numéro de facture</th>
                </tr>
            </thead>
            <tbody>
                @if($bill->status === 'paid')
                <tr>
                    <td>{{ $bill->payment_method }}</td>
                    <td class="text-right">{{ \Carbon\Carbon::parse($bill->updated_at)->format('d F Y') }}</td>
                    <td class="text-right">{{ number_format($bill->total_amount, 2) }} {{ $bill->currency }}</td>
                    <td class="text-right">{{ $bill->bill_number }}</td>
                </tr>
                @else
                <tr>
                    <td>{{ $bill->payment_method }}</td>
                    <td class="text-right">-</td>
                    <td class="text-right">0,00 {{ $bill->currency }}</td>
                    <td class="text-right">{{ $bill->bill_number }}</td>
                </tr>
                @endif
            </tbody>
        </table>
    </div>

    <!-- Additional Information -->
    @if($bill->pack_advantages && count($bill->pack_advantages) > 0)
    <div class="additional-info">
        <p><strong>Avantages inclus:</strong></p>
        @foreach($bill->pack_advantages as $advantage)
        <p>{{ $advantage }}</p>
        @endforeach
    </div>
    @endif

    <!-- Footer Text -->
    <div class="footer-text">
        @if($bill->matchmaker)
        <p>Votre matchmaker: {{ $bill->matchmaker->name }} - {{ $bill->matchmaker->email }}</p>
        @endif
        @if($bill->notes)
        <p>Notes: {{ $bill->notes }}</p>
        @endif
    </div>

    <!-- PDF Footer -->
    <div class="pdf-footer">
        <div class="footer-content">
            <div class="footer-left">
                <div class="footer-company-name">ZCM CONSULTING S.A.R.L AU</div>
                <div class="footer-address">59 BD EMILE ZOLA 1 ERE ETAGE BUREAU N°2 CASABLANCA</div>
                <div class="footer-address">CASABLANCA</div>
                <div class="footer-registration">
                    <div>RC: 553857</div>
                    <div>IF: 52623880</div>
                    <div>ICE: 003132958000051</div>
                    <div>Patente: 32501891</div>
                </div>
            </div>
            <div class="footer-right">
                <div class="footer-contact-title">Coordonnées</div>
                <div class="footer-contact-info">Téléphone: 0698989697</div>
                <div class="footer-contact-info">E-mail: contact@czm.ma</div>
                <div class="footer-contact-info"><a href="https://czm.ma">www.Czm.ma</a></div>
            </div>
        </div>
        <div class="footer-thank-you">
            MERCI DE VOTRE CONFIANCE
        </div>
    </div>

    <!-- Page Number -->
    <div class="page-number">
        Page 1 sur 1
    </div>
</body>
</html>
