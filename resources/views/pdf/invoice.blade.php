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
        @page {
            margin: 0;
            size: A4;
        }
        * {
            page-break-inside: avoid;
        }
        table {
            page-break-inside: avoid;
        }
        tr {
            page-break-inside: avoid;
        }
        body {
            font-family: Arial, Helvetica, sans-serif;
            color: #000000;
            background: #FFFFFF;
            padding: 15px 25px;
            font-size: 10px;
            line-height: 1.3;
        }
        .header-table {
            width: 100%;
            margin-bottom: 10px;
        }
        .header-table td {
            vertical-align: top;
        }
        .receipt-title {
            font-size: 50px;
            font-weight: bold;
            color: #0f5c21;
            padding-top: 50px;
        }
        .logo-container {
            text-align: right;
            width: 200px;
            height: 200px;
        }
        .logo {
            width: 200px;
            height: 200px;
            /* max-height: 80px; */
            object-fit: cover;
        }
        .company-info-table {
            width: 100%;
            margin-bottom: 10px;
            border-collapse: collapse;
        }
        .company-info-table td {
            padding: 5px 0;
            font-size: 11px;
            vertical-align: top;
        }
        .section-title {
            font-weight: bold;
            font-size: 11px;
            color: #000000;
            width: 150px;
        }
        .invoice-details-table {
            width: 100%;
            margin-bottom: 10px;
            border-collapse: collapse;
        }
        .invoice-details-table td {
            padding: 4px 8px;
            font-size: 11px;
            border: 1px solid #d0d0d0;
        }
        .invoice-details-table .label {
            font-weight: bold;
            background-color: #f5f5f5;
            width: 140px;
        }
        .invoice-details-table .value {
            background-color: #ffffff;
        }
        .items-table {
            width: 100%;
            margin-bottom: 8px;
            border-collapse: collapse;
            font-size: 9px;
        }
        .items-table th {
            background-color: #f5f5f5;
            padding: 6px 4px;
            text-align: left;
            font-weight: bold;
            font-size: 10px;
            border: 1px solid #d0d0d0;
        }
        .items-table th.text-center {
            text-align: center;
        }
        .items-table th.text-right {
            text-align: right;
        }
        .items-table td {
            padding: 6px 4px;
            font-size: 10px;
            border: 1px solid #d0d0d0;
        }
        .items-table td.text-center {
            text-align: center;
        }
        .items-table td.text-right {
            text-align: right;
        }
        .payment-modes-table {
            width: 100%;
            margin-bottom: 8px;
            border-collapse: collapse;
        }
        .payment-modes-table td {
            padding: 4px 8px;
            font-size: 10px;
        }
        .totals-table {
            width: 100%;
            margin-bottom: 8px;
            border-collapse: collapse;
        }
        .totals-table td {
            padding: 6px 8px;
            font-size: 11px;
            border: 1px solid #d0d0d0;
        }
        .totals-table .label {
            font-weight: bold;
            text-align: right;
            width: 70%;
        }
        .totals-table .value {
            text-align: right;
            font-weight: bold;
        }
        .totals-table .total-ttc {
            background-color: #d4edda;
            color: #000000;
            font-weight: bold;
            font-size: 12px;
        }
        .invoice-summary {
            margin-bottom: 10px;
            font-size: 9px;
            line-height: 1.4;
            padding: 6px;
            background-color: #f9f9f9;
            border: 1px solid #d0d0d0;
        }
        .stamp-section {
            margin-bottom: 10px;
            text-align: center;
            font-size: 9px;
        }
        .stamp-box {
            display: inline-block;
            border: 2px solid #0066cc;
            padding: 8px;
            text-align: center;
            min-width: 180px;
        }
        .stamp-company {
            font-weight: bold;
            font-size: 11px;
            margin-bottom: 5px;
        }
        .stamp-address {
            font-size: 9px;
            margin-bottom: 3px;
        }
        .stamp-phone {
            font-size: 9px;
        }
        .footer-table {
            width: 100%;
            margin-bottom: 10px;
            border-collapse: collapse;
        }
        .footer-table td {
            padding: 4px 0;
            font-size: 9px;
            vertical-align: top;
        }
        .footer-left {
            width: 50%;
        }
        .footer-right {
            width: 50%;
            text-align: right;
        }
        .footer-company-name {
            font-weight: bold;
            font-size: 10px;
            margin-bottom: 3px;
        }
        .footer-registration {
            font-size: 9px;
            margin-top: 5px;
        }
        .footer-contact-title {
            font-weight: bold;
            font-size: 10px;
            margin-bottom: 3px;
        }
        .footer-contact-info {
            font-size: 9px;
        }
        .footer-contact-info a {
            color: #0066cc;
            text-decoration: underline;
        }
        .footer-thank-you {
            background-color: #28a745;
            color: #ffffff;
            text-align: center;
            padding: 6px 0;
            font-weight: bold;
            font-size: 10px;
            letter-spacing: 1px;
            margin-top: 8px;
        }
        .pack-name {
            font-weight: bold;
        }
        .empty-row {
            background-color: #f9f9f9;
        }
    </style>
</head>
<body>
    <!-- Header: Title and Logo -->
    <table class="header-table">
        <tr>
            <td>
                <div class="receipt-title">Facture</div>
            </td>
            <td class="logo-container">
                @php
                    $logoPath = public_path('images/czm_Logo.png');
                @endphp
                @if(file_exists($logoPath))
                <img src="{{ $logoPath }}" alt="CZM Logo" class="logo">
                @endif
            </td>
        </tr>
    </table>

    <!-- Service Provider Information -->
    <table class="company-info-table">
        <tr>
            <td class="section-title">PRESTATEUR DE SERVICE</td>
            <td>
                <strong>ZCM CONSULTING S.A.R.L AU</strong><br>
                59 BD EMILE ZOLA 1 ERE ETAGE BUREAU N°2 CASABLANCA<br>
                CASABLANCA
            </td>
        </tr>
    </table>

    <!-- Client Information -->
    <table class="company-info-table">
        <tr>
            <td class="section-title">Client</td>
            <td>
                <strong>{{ strtoupper($bill->user->name) }}</strong><br>
                @if($bill->profile && $bill->profile->cin)
                @php
                    try {
                        $decryptedCin = \Illuminate\Support\Facades\Crypt::decryptString($bill->profile->cin);
                    } catch (\Exception $e) {
                        $decryptedCin = null;
                    }
                @endphp
                @if($decryptedCin)
                CNI N° {{ $decryptedCin }}<br>
                @endif
                @endif
                Client N° {{ str_pad($bill->user->id, 5, '0', STR_PAD_LEFT) }}
            </td>
        </tr>
    </table>

    <!-- Invoice Details Table -->
    @php
        // Format bill number to match image format (FAC093/2025)
        $billNumberParts = explode('-', $bill->bill_number);
        $formattedBillNumber = $bill->bill_number;
        if (count($billNumberParts) >= 3) {
            $year = $billNumberParts[1] ?? date('Y');
            $sequence = $billNumberParts[2] ?? '001';
            $formattedBillNumber = 'FAC' . str_pad($sequence, 3, '0', STR_PAD_LEFT) . '/' . $year;
        }
    @endphp
    <table class="invoice-details-table">
        <tr>
            <td class="label">Date de facturation</td>
            {{-- <td class="value">{{ \Carbon\Carbon::parse($bill->bill_date)->format('d/m/Y') }}</td> --}}
            <td class="label">Numéro de la facture</td>
            <td class="label">Échéance</td>
            <td class="label">Mode de paiement</td>
            <td class="label">Ref de Reglement</td>
            <td class="label"></td>
            <td class="value"></td>
        </tr>
        <tr>
            <td class="value">{{ \Carbon\Carbon::parse($bill->bill_date)->format('d/m/Y') }}</td>
            <td class="value">{{ $formattedBillNumber }}</td>
            <td class="value">{{ \Carbon\Carbon::parse($bill->due_date)->format('d/m/Y') }}</td>
            <td class="value">{{ strtoupper($bill->payment_method ?? 'ESP') }}</td>
            <td class="value">{{ $bill->status === 'paid' ? ($formattedBillNumber ?? '-') : '-' }}</td>



        </tr>
    </table>

    <!-- Items Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 35%;">Description</th>
                <th class="text-center" style="width: 8%;">Quantité</th>
                <th class="text-center" style="width: 10%;">Unité</th>
                <th class="text-right" style="width: 12%;">Prix unitaire HT</th>
                <th class="text-center" style="width: 8%;">% TVA</th>
                <th class="text-right" style="width: 12%;">Total TVA</th>
                <th class="text-right" style="width: 15%;">Total TTC</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><span class="pack-name">{{ strtoupper($bill->pack_name) }}</span></td>
                <td class="text-center">1</td>
                <td class="text-center">-</td>
                <td class="text-right">{{ number_format($bill->amount, 2, ',', ' ') }} MAD</td>
                <td class="text-center">{{ number_format($bill->tax_rate, 0) }}%</td>
                <td class="text-right">{{ number_format($bill->tax_amount, 2, ',', ' ') }} MAD</td>
                <td class="text-right">{{ number_format($bill->total_amount, 2, ',', ' ') }} MAD</td>
            </tr>
            <tr class="empty-row">
                <td>-</td>
                <td class="text-center">-</td>
                <td class="text-center">-</td>
                <td class="text-right">-</td>
                <td class="text-center">{{ number_format($bill->tax_rate, 0) }}%</td>
                <td class="text-right">- MAD</td>
                <td class="text-right">- MAD</td>
            </tr>
        </tbody>
    </table>

    <!-- Payment Modes -->
    <table class="payment-modes-table">
        <tr>
            <td><strong>LES MODES DE PAIEMENT ACCEPTES:</strong></td>
        </tr>
        <tr>
            <td>ESP/CARTE BANCAIRE</td>
            <td>CHEQUE/VIREMENT</td>
            <td>EFFET</td>
        </tr>
    </table>

    <!-- Totals Table -->
    <table class="totals-table">
        <tr>
            <td class="label">Total HT</td>
            <td class="value">{{ number_format($bill->amount, 2, ',', ' ') }}</td>
        </tr>
        <tr>
            <td class="label">Total TVA</td>
            <td class="value">{{ number_format($bill->tax_amount, 2, ',', ' ') }}</td>
        </tr>
        <tr>
            <td class="label total-ttc">Total TTC</td>
            <td class="value total-ttc">{{ number_format($bill->total_amount, 2, ',', ' ') }}</td>
        </tr>
    </table>

    <!-- Invoice Summary Statement -->
    <div class="invoice-summary">
        <strong>ARRETEE A LA PRESENTE FACTURE A LA SOMME TTC DE:</strong> 
        @php
            // Convert number to words in French
            $amount = (int)$bill->total_amount;
            $amountInWords = '';
            try {
                if (extension_loaded('intl')) {
                    $numberFormatter = new NumberFormatter('fr_FR', NumberFormatter::SPELLOUT);
                    $amountInWords = ucfirst($numberFormatter->format($amount));
                } else {
                    $amountInWords = $amount . ' dirhams';
                }
            } catch (Exception $e) {
                $amountInWords = $amount . ' dirhams';
            }
        @endphp
        {{ $amountInWords }}
        @if($bill->pack_advantages && count($bill->pack_advantages) > 0)
        / offre spéciale
        @endif
        / Avance {{ strtolower($bill->pack_name) }} {{ number_format($bill->total_amount, 0, ',', ' ') }}dhs
        / Mode de paiement : {{ strtolower($bill->payment_method ?? 'esp') }}
    </div>

    <!-- Stamp & Signature -->
    <div class="stamp-section">
        <div class="stamp-box">
            <div class="stamp-company">ZCM CONSULTING S.A.R.L AU</div>
            <div class="stamp-address">59, Bd Emile Zola, 1er Etage Bureau n° 2 - Casablanca</div>
            <div class="stamp-phone">Tél. 1: 07 02 75 84 70</div>
            <div class="stamp-phone">Tél. 2: 07 14 57 06 37</div>
            <div style="margin-top: 10px; height: 25px;">
                <div style="font-size: 8px; margin-top: 15px;">CACHET & SIGNATURE</div>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <table class="footer-table">
        <tr>
            <td class="footer-left">
                <div class="footer-company-name">ZCM CONSULTING S.A.R.L AU</div>
                <div>59 BD EMILE ZOLA 1 ERE ETAGE BUREAU N°2 CASABLANCA, CASABLANCA</div>
                <div class="footer-registration">
                    <div>RC: 553857</div>
                    <div>IF: 52623880</div>
                    <div>ICE: 003132958000051</div>
                    <div>Patente: 32501891</div>
                </div>
            </td>
            <td class="footer-right">
                <div class="footer-contact-title">Coordonnées</div>
                <div class="footer-contact-info">Téléphone: 0698989697</div>
                <div class="footer-contact-info">E-mail: contact@czm.ma</div>
                <div class="footer-contact-info"><a href="https://czm.ma">www.Czm.ma</a></div>
            </td>
        </tr>
    </table>

    <!-- Thank You Footer -->
    <div class="footer-thank-you">
        MERCI DE VOTRE CONFIANCE
    </div>
</body>
</html>
