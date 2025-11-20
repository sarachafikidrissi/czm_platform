<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>403 - Accès Refusé</title>
    <link rel="icon" type="image/png" href="/images/czm_Logo.png">
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />
    <style>
        @font-face {
            font-family: 'Nunito-Regular';
            src: url('/fonts/Nunito/static/Nunito-Bold.ttf');
            font-weight: normal;
            font-style: normal;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Nunito-Regular', 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
            /* background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%); */
            /* min-height: 100vh; */
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: #12131a;
        }
        
        .error-container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 1.5rem;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            /* max-width: 600px; */
            width: 100%;
            padding: 3rem 2.5rem;
            text-align: center;
            border: 2px solid #e5e5e5;
        }
        
        .error-icon {
            width: 120px;
            height: 120px;
            margin: 0 auto 2rem;
            position: relative;
        }
        
        .error-icon-circle {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: linear-gradient(135deg, #ff343a 0%, #890505 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 30px rgba(255, 52, 58, 0.3);
            animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
                box-shadow: 0 10px 30px rgba(255, 52, 58, 0.3);
            }
            50% {
                transform: scale(1.05);
                box-shadow: 0 15px 40px rgba(255, 52, 58, 0.4);
            }
        }
        
        .error-icon svg {
            width: 60px;
            height: 60px;
            color: white;
        }
        
        .error-code {
            font-size: 4rem;
            font-weight: bold;
            color: #ff343a;
            margin-bottom: 1rem;
            text-shadow: 2px 2px 4px rgba(255, 52, 58, 0.2);
        }
        
        .error-title {
            font-size: 1.75rem;
            font-weight: 600;
            color: #12131a;
            margin-bottom: 1rem;
        }
        
        .error-message {
            font-size: 1.125rem;
            color: #666666;
            margin-bottom: 2rem;
            line-height: 1.6;
            padding: 1.5rem;
            background: linear-gradient(135deg, rgba(255, 52, 58, 0.05) 0%, rgba(255, 52, 58, 0.02) 100%);
            border-radius: 0.75rem;
            border-left: 4px solid #ff343a;
        }
        
        .error-message strong {
            color: #ff343a;
            font-weight: 600;
        }
        
        .action-buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 0.875rem 2rem;
            border-radius: 0.625rem;
            font-size: 1rem;
            font-weight: 600;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
            font-family: inherit;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #096725 0%, #086020 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(9, 103, 37, 0.3);
        }
        
        .btn-primary:hover {
            background: linear-gradient(135deg, #086020 0%, #07501a 100%);
            box-shadow: 0 6px 20px rgba(9, 103, 37, 0.4);
            transform: translateY(-2px);
        }
        
        .btn-secondary {
            background: white;
            color: #096725;
            border: 2px solid #096725;
        }
        
        .btn-secondary:hover {
            background: #f5f5f5;
            transform: translateY(-2px);
        }
        
        .logo-container {
            margin-bottom: 2rem;
        }
        
        .logo-container img {
            height: 60px;
            width: auto;
        }
        
        .status-indicator {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: rgba(255, 52, 58, 0.1);
            border-radius: 2rem;
            color: #ff343a;
            font-size: 0.875rem;
            font-weight: 600;
            margin-top: 1rem;
        }
        
        .status-indicator::before {
            content: '';
            width: 8px;
            height: 8px;
            background: #ff343a;
            border-radius: 50%;
            animation: blink 1.5s ease-in-out infinite;
        }
        
        @keyframes blink {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.3;
            }
        }
        
        @media (max-width: 640px) {
            .error-container {
                padding: 2rem 1.5rem;
            }
            
            .error-code {
                font-size: 3rem;
            }
            
            .error-title {
                font-size: 1.5rem;
            }
            
            .error-message {
                font-size: 1rem;
                padding: 1rem;
            }
            
            .action-buttons {
                flex-direction: column;
            }
            
            .btn {
                width: 100%;
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="logo-container">
            <img src="/images/czm_Logo.png" alt="CZM Logo">
        </div>
        
        <div class="error-icon">
            <div class="error-icon-circle">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
        </div>
        
        <div class="error-code">403</div>
        
        <h1 class="error-title">Accès Refusé</h1>
        
        <div class="error-message">
            @if(isset($exception) && $exception->getMessage() === 'Your account is not validated yet.')
                <strong>Votre compte n'est pas encore validé.</strong>
                <br><br>
                Veuillez patienter pendant que notre équipe examine votre demande. Vous recevrez une notification une fois votre compte validé.
            @else
                <strong>Vous n'avez pas l'autorisation d'accéder à cette ressource.</strong>
                <br><br>
                Si vous pensez qu'il s'agit d'une erreur, veuillez contacter l'administrateur.
            @endif
        </div>
        
        <div class="status-indicator">
            Compte en attente de validation
        </div>
        
        <div class="action-buttons">
            <a href="{{ route('dashboard') }}" class="btn btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Retour au Tableau de Bord
            </a>
            <a href="{{ route('logout') }}" class="btn btn-secondary" onclick="event.preventDefault(); document.getElementById('logout-form').submit();">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Se Déconnecter
            </a>
        </div>
        
        <form id="logout-form" action="{{ route('logout') }}" method="POST" style="display: none;">
            @csrf
        </form>
    </div>
</body>
</html>

