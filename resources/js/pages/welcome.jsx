import { LanguageSwitcher } from '@/components/language-switcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Briefcase,
    Building2,
    Calendar,
    CheckSquare,
    ChevronDown,
    Coffee,
    Database,
    Edit,
    FileText,
    Handshake,
    Heart,
    LayoutDashboard,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    Settings,
    Shield,
    Sparkles,
    UserCheck,
    UserPlus,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Welcome() {
    const { t, i18n } = useTranslation();
    const [activeSection, setActiveSection] = useState('');
    const [openFaq, setOpenFaq] = useState(null);

    // Handle RTL for Arabic
    useEffect(() => {
        if (i18n.language === 'ar') {
            document.documentElement.setAttribute('dir', 'rtl');
            document.documentElement.setAttribute('lang', 'ar');
        } else {
            document.documentElement.setAttribute('dir', 'ltr');
            document.documentElement.setAttribute('lang', i18n.language);
        }
    }, [i18n.language]);

    useEffect(() => {
        const handleScroll = () => {
            const sections = [
                'hero',
                'manage',
                'dashboard',
                'services',
                'community',
                'how-it-works',
                'access',
                'login-setup',
                'meet-partner',
                'for-client',
                'for-staff',
                'faq',
            ];
            const scrollPosition = window.scrollY + 100;

            for (const section of sections) {
                const element = document.getElementById(section);
                if (element) {
                    const { offsetTop, offsetHeight } = element;
                    if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
                        setActiveSection(section);
                        break;
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            const offset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth',
            });
        }
    };

    const faqItems = [
        {
            question: t('welcome.faq1Question'),
            answer: t('welcome.faq1Answer'),
        },
        {
            question: t('welcome.faq2Question'),
            answer: t('welcome.faq2Answer'),
        },
        {
            question: t('welcome.faq3Question'),
            answer: t('welcome.faq3Answer'),
        },
        {
            question: t('welcome.faq4Question'),
            answer: t('welcome.faq4Answer'),
        },
    ];

    return (
        <>
            <Head title={t('welcome.title')} />

            {/* Navigation Bar */}
            <nav className="fixed top-0 right-0 left-0 z-50 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/95">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src="/images/czm_Logo.png" alt="CZM Logo" className="h-10 w-auto object-contain" />
                            <span className="font-bold text-[#076725] dark:text-green-400">CZM</span>
                        </div>
                        <div className="hidden items-center gap-1 overflow-x-auto md:flex">
                            <button
                                onClick={() => scrollToSection('hero')}
                                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                    activeSection === 'hero'
                                        ? 'bg-[#90080b] text-white'
                                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                                }`}
                            >
                                {t('welcome.navHome')}
                            </button>
                            <button
                                onClick={() => scrollToSection('services')}
                                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                    activeSection === 'services'
                                        ? 'bg-[#90080b] text-white'
                                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                                }`}
                            >
                                {t('welcome.navServices')}
                            </button>
                            <button
                                onClick={() => scrollToSection('how-it-works')}
                                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                    activeSection === 'how-it-works'
                                        ? 'bg-[#90080b] text-white'
                                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                                }`}
                            >
                                {t('welcome.navHowItWorks')}
                            </button>
                            <button
                                onClick={() => scrollToSection('for-client')}
                                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                    activeSection === 'for-client' || activeSection === 'for-staff'
                                        ? 'bg-[#90080b] text-white'
                                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                                }`}
                            >
                                {t('welcome.navForWho')}
                            </button>
                            <button
                                onClick={() => scrollToSection('faq')}
                                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                    activeSection === 'faq'
                                        ? 'bg-[#90080b] text-white'
                                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                                }`}
                            >
                                {t('welcome.navFaq')}
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <LanguageSwitcher />
                            <Link href={route('login')}>
                                <Button variant="outline" size="sm">
                                    {t('welcome.login')}
                                </Button>
                            </Link>
                            <Link href={route('register')}>
                                <Button size="sm" className="bg-[#90080b] text-white hover:bg-[#90080b]/90">
                                    {t('welcome.signUp')}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="pt-16">
                
                {/* Hero Section */}
                <section
                    id="hero"
                    className="relative flex min-h-screen justify-center bg-green-800 md:justify-center welcome-layout-bg p-4 pt-40 sm:pt-48 md:items-center md:pt-56 lg:pt-64"
                >
                    {/* Overlay for better text readability - responsive opacity */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/40 md:from-black/40 md:via-black/20 md:to-black/50"></div>
                    
                    {/* Content Container - positioned below "Bienvenu" text on background image */}
                    <div className="absolute z-10  w-full bottom-[20vh] md:bottom-30   max-w-6xl px-4 text-center sm:px-6">
                        {/* Logo - responsive sizing */}
                        {/* <div className="mb-4 flex justify-center sm:mb-0 md:mb-0 ">
                            <div className="rounded-full border-4 border-white bg-white/95 p-3 shadow-2xl backdrop-blur-sm sm:p-4 md:p-6">
                                <img src="/images/czm_Logo.png" alt="CZM Logo" className="h-16 w-auto object-contain sm:h-20 md:h-28 lg:h-32" />
                            </div>
                        </div> */}
                        
                        {/* Main Title - responsive with color highlights (positioned below "Bienvenu" on background) */}
                        <h1 className="mb-2 text-2xl font-bold text-white drop-shadow-lg sm:mb-0 sm:text-3xl md:mb-0 md:text-4xl lg:text-5xl xl:text-6xl">
                            <span className="text-[#076725] drop-shadow-md">{t('common.centreZawajMaroc')}</span>
                        </h1>
                        
                        {/* Tagline - responsive sizing */}
                        <p className="mb-2 text-base font-semibold text-white drop-shadow-md sm:mb-3 sm:text-lg md:text-xl lg:text-2xl xl:text-3xl">
                            <span className="text-[#90080b] drop-shadow-md">{t('welcome.tagline')}</span>
                        </p>
                        
                        {/* Mission Statement - responsive text */}
                        <p className="mx-auto mb-4 max-w-2xl text-sm font-semibold text-white drop-shadow-md sm:mb-6 sm:text-base md:mb-8 md:text-lg lg:text-xl xl:text-2xl">
                            {t('welcome.mission')}
                        </p>
                        
                        {/* Action Buttons - responsive sizing and spacing */}
                        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                            <Link href={route('login')} className="w-full sm:w-auto">
                                <Button
                                    size="lg"
                                    className="h-11 w-full bg-[#90080b] text-sm font-semibold text-white shadow-xl transition-all duration-300 hover:bg-[#90080b]/90 hover:shadow-2xl sm:h-12 sm:text-base md:h-14 md:w-56 md:text-lg"
                                >
                                    {t('welcome.login')}
                                </Button>
                            </Link>
                            <Link href={route('register')} className="w-full sm:w-auto">
                                <Button
                                    size="lg"
                                    className="h-11 w-full border-2 border-white bg-white/10 text-sm font-semibold text-white backdrop-blur-sm shadow-xl transition-all duration-300 hover:bg-white hover:text-[#076725] hover:shadow-2xl sm:h-12 sm:text-base md:h-14 md:w-56 md:text-lg"
                                >
                                    {t('welcome.signUp')}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>

                 {/* Services Showcase */}
                 <section id="services" className="bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 py-20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-12 text-center">
                            <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">{t('welcome.servicesShowcase')}</h2>
                            <p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">{t('welcome.servicesSubtitle')}</p>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            {/* Matchmaking */}
                            <Card className="overflow-hidden p-0 gap-0  rounded-2xl border-0 bg-white shadow-xl transition-transform hover:scale-105 dark:bg-gray-800">
                                <div className="flex justify-center">
                                    <div className="h-40 w-full overflow-hidden    shadow-xl ring-2 ring-gray-200 dark:ring-gray-700">
                                        <img src="/images/matchmaking_personalise.jpeg" alt="Matchmaking" className="h-full w-full object-cover" />
                                    </div>
                                </div>
                                <div className="bg-[#90080b] px-4 py-3 text-center">
                                    <CardTitle className="mb-1 text-xs font-bold uppercase leading-tight text-white">{t('welcome.matchmaking')}</CardTitle>
                                    <p className="text-xs font-semibold text-white/95" dir="rtl">{t('welcome.matchmakingArabic')}</p>
                                </div>
                                <CardContent className="min-h-[140px] bg-white p-4 dark:bg-gray-800">
                                    <p className="mb-3 text-xs leading-relaxed text-gray-700 dark:text-gray-300">{t('welcome.matchmakingDesc')}</p>
                                    <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400" dir="rtl">{t('welcome.matchmakingDescArabic')}</p>
                                </CardContent>
                            </Card>

                            {/* Coaching */}
                            <Card className="overflow-hidden p-0 gap-0 rounded-2xl border-0 bg-white shadow-xl transition-transform hover:scale-105 dark:bg-gray-800">
                                <div className="flex justify-center">
                                    <div className="h-40 w-full overflow-hidden shadow-xl ring-2 ring-gray-200 dark:ring-gray-700">
                                        <img src="/images/coaching_matrimonial.jpeg" alt="Coaching Matrimonial" className="h-full w-full object-cover" />
                                    </div>
                                </div>
                                <div className="bg-[#076725] px-4 py-3 text-center">
                                    <CardTitle className="mb-1 text-xs font-bold uppercase leading-tight text-white">{t('welcome.coaching')}</CardTitle>
                                    <p className="text-xs font-semibold text-white/95" dir="rtl">{t('welcome.coachingArabic')}</p>
                                </div>
                                <CardContent className="min-h-[140px] bg-white p-4 dark:bg-gray-800">
                                    <p className="mb-3 text-xs leading-relaxed text-gray-700 dark:text-gray-300">{t('welcome.coachingDesc')}</p>
                                    <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400" dir="rtl">{t('welcome.coachingDescArabic')}</p>
                                </CardContent>
                            </Card>

                            {/* Counseling */}
                            <Card className="overflow-hidden p-0 gap-0 rounded-2xl border-0 bg-white shadow-xl transition-transform hover:scale-105 dark:bg-gray-800">
                                <div className="flex justify-center">
                                    <div className="h-40 w-full overflow-hidden shadow-xl ring-2 ring-gray-200 dark:ring-gray-700">
                                        <img src="/images/conseil_conjugal.jpeg" alt="Conseil Conjugal" className="h-full w-full object-cover" />
                                    </div>
                                </div>
                                <div className="bg-[#90080b] px-4 py-3 text-center">
                                    <CardTitle className="mb-1 text-xs font-bold uppercase leading-tight text-white">{t('welcome.counseling')}</CardTitle>
                                    <p className="text-xs font-semibold text-white/95" dir="rtl">{t('welcome.counselingArabic')}</p>
                                </div>
                                <CardContent className="min-h-[140px] bg-white p-4 dark:bg-gray-800">
                                    <p className="mb-3 text-xs leading-relaxed text-gray-700 dark:text-gray-300">{t('welcome.counselingDesc')}</p>
                                    <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400" dir="rtl">{t('welcome.counselingDescArabic')}</p>
                                </CardContent>
                            </Card>

                            {/* Etiquette */}
                            <Card className="overflow-hidden p-0 gap-0 rounded-2xl border-0 bg-white shadow-xl transition-transform hover:scale-105 dark:bg-gray-800">
                                <div className="flex justify-center">
                                    <div className="h-40 w-full overflow-hidden shadow-xl ring-2 ring-gray-200 dark:ring-gray-700">
                                        <img src="/images/protocole.jpeg" alt="Étiquette de Protocole" className="h-full w-full object-cover" />
                                    </div>
                                </div>
                                <div className="bg-[#076725] px-4 py-3 text-center">
                                    <CardTitle className="mb-1 text-xs font-bold uppercase leading-tight text-white">{t('welcome.etiquette')}</CardTitle>
                                    <p className="text-xs font-semibold text-white/95" dir="rtl">{t('welcome.etiquetteArabic')}</p>
                                </div>
                                <CardContent className="min-h-[140px] bg-white p-4 dark:bg-gray-800">
                                    <p className="mb-3 text-xs leading-relaxed text-gray-700 dark:text-gray-300">{t('welcome.etiquetteDesc')}</p>
                                    <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400" dir="rtl">{t('welcome.etiquetteDescArabic')}</p>
                                </CardContent>
                            </Card>

                            {/* Legal */}
                            <Card className="overflow-hidden p-0 gap-0 rounded-2xl border-0 bg-white shadow-xl transition-transform hover:scale-105 dark:bg-gray-800">
                                <div className="flex justify-center">
                                    <div className="h-40 w-full overflow-hidden shadow-xl ring-2 ring-gray-200 dark:ring-gray-700">
                                        <img src="/images/conseil_juridique.jpeg" alt="Conseil Juridique" className="h-full w-full object-cover" />
                                    </div>
                                </div>
                                <div className="bg-[#076725] px-4 py-3 text-center">
                                    <CardTitle className="mb-1 text-xs font-bold uppercase leading-tight text-white">{t('welcome.legal')}</CardTitle>
                                    <p className="text-xs font-semibold text-white/95" dir="rtl">{t('welcome.legalArabic')}</p>
                                </div>
                                <CardContent className="min-h-[140px] bg-white p-4 dark:bg-gray-800">
                                    <p className="mb-3 text-xs leading-relaxed text-gray-700 dark:text-gray-300">{t('welcome.legalDesc')}</p>
                                    <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400" dir="rtl">{t('welcome.legalDescArabic')}</p>
                                </CardContent>
                            </Card>

                            {/* Wedding Prep */}
                            <Card className="overflow-hidden p-0 gap-0 rounded-2xl border-0 bg-white shadow-xl transition-transform hover:scale-105 dark:bg-gray-800">
                                <div className="flex justify-center">
                                    <div className="h-40 w-full overflow-hidden shadow-xl ring-2 ring-gray-200 dark:ring-gray-700">
                                        <img src="/images/marriage.jpg" alt="Préparation Mariage CZM" className="h-full w-full object-cover" />
                                    </div>
                                </div>
                                <div className="bg-[#90080b] px-4 py-3 text-center">
                                    <CardTitle className="mb-1 text-xs font-bold uppercase leading-tight text-white">{t('welcome.weddingPrep')}</CardTitle>
                                </div>
                                <CardContent className="min-h-[140px] bg-white p-4 dark:bg-gray-800">
                                    <p className="mb-3 text-xs leading-relaxed text-gray-700 dark:text-gray-300">{t('welcome.weddingPrepDesc')}</p>
                                </CardContent>
                            </Card>

                            {/* Psycho-Emotional Support */}
                            <Card className="overflow-hidden p-0 gap-0 rounded-2xl border-0 bg-white shadow-xl transition-transform hover:scale-105 dark:bg-gray-800">
                                <div className="flex justify-center">
                                    <div className="h-40 w-full overflow-hidden shadow-xl ring-2 ring-gray-200 dark:ring-gray-700">
                                        <img src="/images/conseil_conjugal.jpeg" alt="Accompagnement Psycho-Émotionnel" className="h-full w-full object-cover" />
                                    </div>
                                </div>
                                <div className="bg-[#076725] px-4 py-3 text-center">
                                    <CardTitle className="mb-1 text-xs font-bold uppercase leading-tight text-white">{t('welcome.psychoEmotional')}</CardTitle>
                                    <p className="text-xs font-semibold text-white/95" dir="rtl">{t('welcome.psychoEmotionalArabic')}</p>
                                </div>
                                <CardContent className="min-h-[140px] bg-white p-4 dark:bg-gray-800">
                                    <p className="mb-3 text-xs leading-relaxed text-gray-700 dark:text-gray-300">{t('welcome.psychoEmotionalDesc')}</p>
                                    <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400" dir="rtl">{t('welcome.psychoEmotionalDescArabic')}</p>
                                </CardContent>
                            </Card>

                            {/* Post-Marriage Follow-up */}
                            <Card className="overflow-hidden p-0 gap-0 rounded-2xl border-0 bg-white shadow-xl transition-transform hover:scale-105 dark:bg-gray-800">
                                <div className="flex justify-center">
                                    <div className="h-40 w-full overflow-hidden shadow-xl ring-2 ring-gray-200 dark:ring-gray-700">
                                        <img src="/images/suivie_postmarriage.jpeg" alt="Suivi Postmariage" className="h-full w-full object-cover" />
                                    </div>
                                </div>
                                <div className="bg-[#90080b] px-4 py-3 text-center">
                                    <CardTitle className="mb-1 text-xs font-bold uppercase leading-tight text-white">{t('welcome.postMarriage')}</CardTitle>
                                    <p className="text-xs font-semibold text-white/95" dir="rtl">{t('welcome.postMarriageArabic')}</p>
                                </div>
                                <CardContent className="min-h-[140px] bg-white p-4 dark:bg-gray-800">
                                    <p className="mb-3 text-xs leading-relaxed text-gray-700 dark:text-gray-300">{t('welcome.postMarriageDesc')}</p>
                                    <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400" dir="rtl">{t('welcome.postMarriageDescArabic')}</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Manage Clients & Staff Seamlessly */}
                <section id="manage" className="bg-white py-20 dark:bg-gray-900">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-12 text-center">
                            <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">{t('welcome.manageClientsStaff')}</h2>
                            <p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">{t('welcome.everythingInOnePlace')}</p>
                        </div>
                        <div className="grid gap-8 md:grid-cols-3">
                            <Card className="border-2 border-[#90080b]/20 dark:border-red-500/30">
                                <CardHeader>
                                    <UserCheck className="mb-4 h-12 w-12 text-[#90080b] dark:text-red-400" />
                                    <CardTitle>{t('welcome.clientManagement')}</CardTitle>
                                    <CardDescription>{t('welcome.clientManagementDesc')}</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="border-2 border-[#076725]/20 dark:border-green-500/30">
                                <CardHeader>
                                    <Users className="mb-4 h-12 w-12 text-[#076725] dark:text-green-400" />
                                    <CardTitle>{t('welcome.staffManagement')}</CardTitle>
                                    <CardDescription>{t('welcome.staffManagementDesc')}</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="border-2 border-amber-500/20 dark:border-amber-500/30">
                                <CardHeader>
                                    <Building2 className="mb-4 h-12 w-12 text-amber-600 dark:text-amber-400" />
                                    <CardTitle>{t('welcome.agencyManagement')}</CardTitle>
                                    <CardDescription>{t('welcome.agencyManagementDesc')}</CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
                    </div>
                </section>
                

                {/* Personal Dashboard */}
                <section id="dashboard" className="bg-gradient-to-br from-red-50/50 to-green-50/50 py-20 dark:from-gray-800 dark:to-gray-900">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-12 text-center">
                            <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">{t('welcome.personalDashboard')}</h2>
                            <p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">{t('welcome.everythingInOnePlace')}</p>
                        </div>
                        <Card className="border-2 border-[#90080b]/20 shadow-xl dark:border-red-500/30">
                            <CardContent className="p-8">
                                <div className="grid gap-8 md:grid-cols-2">
                                    <div>
                                        <LayoutDashboard className="mb-6 h-16 w-16 text-[#90080b] dark:text-red-400" />
                                        <h3 className="mb-4 text-2xl font-bold">{t('welcome.yourCentralHub')}</h3>
                                        <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                                            <li className="flex items-start gap-2">
                                                <ArrowRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#076725] dark:text-green-400" />
                                                <span>{t('welcome.viewProfile')}</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <ArrowRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#076725] dark:text-green-400" />
                                                <span>{t('welcome.trackMatches')}</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <ArrowRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#076725] dark:text-green-400" />
                                                <span>{t('welcome.manageAppointments')}</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <ArrowRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#076725] dark:text-green-400" />
                                                <span>{t('welcome.accessSubscription')}</span>
                                            </li>
                                        </ul>
                                    </div>
       <div>
                                        <Shield className="mb-6 h-16 w-16 text-[#076725] dark:text-green-400" />
                                        <h3 className="mb-4 text-2xl font-bold">{t('welcome.securePrivate')}</h3>
                                        <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                                            <li className="flex items-start gap-2">
                                                <ArrowRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#90080b] dark:text-red-400" />
                                                <span>{t('welcome.encryption')}</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <ArrowRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#90080b] dark:text-red-400" />
                                                <span>{t('welcome.privacyControls')}</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <ArrowRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#90080b] dark:text-red-400" />
                                                <span>{t('welcome.securePayments')}</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <ArrowRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#90080b] dark:text-red-400" />
                                                <span>{t('welcome.securityUpdates')}</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

               

                {/* Our Process */}
                <section id="how-it-works" className="bg-white py-20 dark:bg-gray-900">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-12 text-center">
                            <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">{t('welcome.howItWorks')}</h2>
                            <p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">{t('welcome.ourProcessSubtitle')}</p>
                        </div>
                        <div className="grid gap-8 md:grid-cols-3">
                            {/* Step 1 */}
                            <div className="text-center">
                                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#90080b]">
                                    <Edit className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">{t('welcome.processStep1')}</h3>
                                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{t('welcome.processStep1Desc')}</p>
                            </div>

                            {/* Step 2 */}
                            <div className="text-center">
                                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#90080b]">
                                    <CheckSquare className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">{t('welcome.processStep2')}</h3>
                                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{t('welcome.processStep2Desc')}</p>
                            </div>

                            {/* Step 3 */}
                            <div className="text-center">
                                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#90080b]">
                                    <UserPlus className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">{t('welcome.processStep3')}</h3>
                                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{t('welcome.processStep3Desc')}</p>
                            </div>
                        </div>

                        {/* Horizontal Line Separator */}
                        <div className="my-8 border-t border-gray-200 dark:border-gray-700"></div>

                        <div className="grid gap-8 md:grid-cols-3">
                            {/* Step 4 */}
                            <div className="text-center">
                                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#90080b]">
                                    <Database className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">{t('welcome.processStep4')}</h3>
                                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{t('welcome.processStep4Desc')}</p>
                            </div>

                            {/* Step 5 */}
                            <div className="text-center">
                                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#90080b]">
                                    <Handshake className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">{t('welcome.processStep5')}</h3>
                                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{t('welcome.processStep5Desc')}</p>
                            </div>

                            {/* Step 6 */}
                            <div className="text-center">
                                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#90080b]">
                                    <Coffee className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">{t('welcome.processStep6')}</h3>
                                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{t('welcome.howItWorksSubtitle')}</p>
                            </div>
                        </div>
                    </div>
                </section>

         
                {/* Receive Your Access */}
                <section id="access" className="bg-gradient-to-br from-red-50/50 to-green-50/50 py-20 dark:from-gray-800 dark:to-gray-900">
                    <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
                        <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">{t('welcome.receiveAccess')}</h2>
                        <p className="mb-8 text-xl text-gray-600 dark:text-gray-300">{t('welcome.receiveAccessSubtitle')}</p>
                        <Card className="border-2 border-[#90080b]/20 shadow-xl dark:border-red-500/30">
                            <CardContent className="p-8">
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="rounded-full bg-[#90080b] p-3 text-white">
                                            <UserCheck className="h-6 w-6" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="mb-2 text-xl font-bold">{t('welcome.accountApproval')}</h3>
                                            <p className="text-gray-600 dark:text-gray-300">{t('welcome.accountApprovalDesc')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="rounded-full bg-[#076725] p-3 text-white">
                                            <Mail className="h-6 w-6" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="mb-2 text-xl font-bold">{t('welcome.emailNotification')}</h3>
                                            <p className="text-gray-600 dark:text-gray-300">{t('welcome.emailNotificationDesc')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="rounded-full bg-amber-600 p-3 text-white">
                                            <Settings className="h-6 w-6" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="mb-2 text-xl font-bold">{t('welcome.completeProfile')}</h3>
                                            <p className="text-gray-600 dark:text-gray-300">{t('welcome.completeProfileDesc')}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Log In & Set Up */}
                <section id="login-setup" className="bg-white py-20 dark:bg-gray-900">
                    <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
                        <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">{t('welcome.loginSetup')}</h2>
                        <p className="mb-8 text-xl text-gray-600 dark:text-gray-300">{t('welcome.loginSetupSubtitle')}</p>
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="border-2 border-[#90080b]/20 dark:border-red-500/30">
                                <CardHeader>
                                    <CardTitle>{t('welcome.alreadyHaveAccount')}</CardTitle>
                                    <CardDescription>{t('welcome.alreadyHaveAccountDesc')}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Link href={route('login')} className="w-full">
                                        <Button className="w-full bg-[#90080b] text-white hover:bg-[#90080b]/90">{t('welcome.login')}</Button>
                                    </Link>
                                </CardContent>
                            </Card>
                            <Card className="border-2 border-[#076725]/20 dark:border-green-500/30">
                                <CardHeader>
                                    <CardTitle>{t('welcome.newToCZM')}</CardTitle>
                                    <CardDescription>{t('welcome.newToCZMDesc')}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Link href={route('register')} className="w-full">
                                        <Button className="w-full bg-[#076725] text-white hover:bg-[#076725]/90">{t('welcome.signUp')}</Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Meet Your Partner */}
                <section id="meet-partner" className="bg-gradient-to-br from-green-50/50 to-red-50/50 py-20 dark:from-gray-800 dark:to-gray-900">
                    <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
                        <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">{t('welcome.meetPartner')}</h2>
                        <p className="mb-8 text-xl text-gray-600 dark:text-gray-300">{t('welcome.meetPartnerSubtitle')}</p>
                        <Card className="border-2 border-[#90080b]/20 shadow-xl dark:border-red-500/30">
                            <CardContent className="p-8">
                                <Heart className="mx-auto mb-6 h-16 w-16 text-[#90080b] dark:text-red-400" />
                                <p className="mb-6 text-lg text-gray-600 dark:text-gray-300">{t('welcome.meetPartnerDesc')}</p>
                                <div className="flex flex-col justify-center gap-4 sm:flex-row">
                                    <Link href={route('register')}>
                                        <Button size="lg" className="bg-[#90080b] text-white hover:bg-[#90080b]/90">
                                            {t('welcome.startJourney')}
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* For Client */}
                <section id="for-client" className="bg-white py-20 dark:bg-gray-900">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-12 text-center">
                            <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">{t('welcome.forClient')}</h2>
                            <p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">{t('welcome.forClientSubtitle')}</p>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <Card className="border-2 border-[#90080b]/20 dark:border-red-500/30">
                                <CardHeader>
                                    <UserCheck className="mb-4 h-10 w-10 text-[#90080b] dark:text-red-400" />
                                    <CardTitle>{t('welcome.profileManagement')}</CardTitle>
                                    <CardDescription>{t('welcome.profileManagementDesc')}</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="border-2 border-[#076725]/20 dark:border-green-500/30">
                                <CardHeader>
                                    <Heart className="mb-4 h-10 w-10 text-[#076725] dark:text-green-400" />
                                    <CardTitle>{t('welcome.viewProposals')}</CardTitle>
                                    <CardDescription>{t('welcome.viewProposalsDesc')}</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="border-2 border-amber-500/20 dark:border-amber-500/30">
                                <CardHeader>
                                    <Calendar className="mb-4 h-10 w-10 text-amber-600 dark:text-amber-400" />
                                    <CardTitle>{t('welcome.scheduleAppointments')}</CardTitle>
                                    <CardDescription>{t('welcome.scheduleAppointmentsDesc')}</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="border-2 border-blue-500/20 dark:border-blue-500/30">
                                <CardHeader>
                                    <Users className="mb-4 h-10 w-10 text-blue-600 dark:text-blue-400" />
                                    <CardTitle>{t('welcome.chooseMatchmaker')}</CardTitle>
                                    <CardDescription>{t('welcome.chooseMatchmakerDesc')}</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="border-2 border-purple-500/20 dark:border-purple-500/30">
                                <CardHeader>
                                    <FileText className="mb-4 h-10 w-10 text-purple-600 dark:text-purple-400" />
                                    <CardTitle>{t('welcome.manageSubscription')}</CardTitle>
                                    <CardDescription>{t('welcome.manageSubscriptionDesc')}</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="border-2 border-pink-500/20 dark:border-pink-500/30">
                                <CardHeader>
                                    <Briefcase className="mb-4 h-10 w-10 text-pink-600 dark:text-pink-400" />
                                    <CardTitle>{t('welcome.viewOrders')}</CardTitle>
                                    <CardDescription>{t('welcome.viewOrdersDesc')}</CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* For Staff */}
                <section id="for-staff" className="bg-gradient-to-br from-red-50/50 to-green-50/50 py-20 dark:from-gray-800 dark:to-gray-900">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-12 text-center">
                            <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">{t('welcome.forStaff')}</h2>
                            <p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">{t('welcome.forStaffSubtitle')}</p>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <Card className="border-2 border-[#90080b]/20 dark:border-red-500/30">
                                <CardHeader>
                                    <Users className="mb-4 h-10 w-10 text-[#90080b] dark:text-red-400" />
                                    <CardTitle>{t('welcome.manageProspects')}</CardTitle>
                                    <CardDescription>{t('welcome.manageProspectsDesc')}</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="border-2 border-[#076725]/20 dark:border-green-500/30">
                                <CardHeader>
                                    <UserCheck className="mb-4 h-10 w-10 text-[#076725] dark:text-green-400" />
                                    <CardTitle>{t('welcome.clientProfiles')}</CardTitle>
                                    <CardDescription>{t('welcome.clientProfilesDesc')}</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="border-2 border-amber-500/20 dark:border-amber-500/30">
                                <CardHeader>
                                    <Heart className="mb-4 h-10 w-10 text-amber-600 dark:text-amber-400" />
                                    <CardTitle>{t('welcome.createProposals')}</CardTitle>
                                    <CardDescription>{t('welcome.createProposalsDesc')}</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="border-2 border-blue-500/20 dark:border-blue-500/30">
                                <CardHeader>
                                    <Building2 className="mb-4 h-10 w-10 text-blue-600 dark:text-blue-400" />
                                    <CardTitle>{t('welcome.agencyManagementTitle')}</CardTitle>
                                    <CardDescription>{t('welcome.agencyManagementTitleDesc')}</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="border-2 border-purple-500/20 dark:border-purple-500/30">
                                <CardHeader>
                                    <LayoutDashboard className="mb-4 h-10 w-10 text-purple-600 dark:text-purple-400" />
                                    <CardTitle>{t('welcome.statisticsReports')}</CardTitle>
                                    <CardDescription>{t('welcome.statisticsReportsDesc')}</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="border-2 border-pink-500/20 dark:border-pink-500/30">
                                <CardHeader>
                                    <Settings className="mb-4 h-10 w-10 text-pink-600 dark:text-pink-400" />
                                    <CardTitle>{t('welcome.adminTools')}</CardTitle>
                                    <CardDescription>{t('welcome.adminToolsDesc')}</CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Frequently Asked Questions */}
                <section id="faq" className="bg-white py-20 dark:bg-gray-900">
                    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-12 text-center">
                            <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">{t('welcome.faq')}</h2>
                            <p className="text-xl text-gray-600 dark:text-gray-300">{t('welcome.faqSubtitle')}</p>
                        </div>
                        <div className="space-y-4">
                            {faqItems.map((faq, index) => (
                                <Collapsible
                                    key={index}
                                    open={openFaq === `faq-${index}`}
                                    onOpenChange={(open) => setOpenFaq(open ? `faq-${index}` : null)}
                                >
                                    <Card className="border-2 border-gray-200 dark:border-gray-700">
                                        <CollapsibleTrigger className="w-full">
                                            <CardHeader className="flex cursor-pointer flex-row items-center justify-between transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <CardTitle className="pr-4 text-left">{faq.question}</CardTitle>
                                                <ChevronDown
                                                    className={`h-5 w-5 text-gray-500 transition-transform ${
                                                        openFaq === `faq-${index}` ? 'rotate-180 transform' : ''
                                                    }`}
                                                />
                                            </CardHeader>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <CardContent className="pt-0">
                                                <p className="text-gray-600 dark:text-gray-300">{faq.answer}</p>
                                            </CardContent>
                                        </CollapsibleContent>
                                    </Card>
                                </Collapsible>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-gray-900 py-12 text-white">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-8 grid gap-8 md:grid-cols-3">
                            <div>
                                <div className="mb-4 flex items-center gap-3">
                                    <img src="/images/czm_Logo.png" alt="CZM Logo" className="h-10 w-auto object-contain" />
                                    <span className="text-lg font-bold">Centre Zawaj Maroc</span>
                                </div>
                                <p className="text-gray-400">1er Centre Matrimonial au Maroc</p>
                            </div>
                            <div>
                                <h3 className="mb-4 font-bold">{t('welcome.footerContact')}</h3>
                                <div className="space-y-2 text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4" />
                                        <span>+212 6 98 98 96 97</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4" />
                                        <span>contact@czm.ma</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        <span>2MARS Casablanca, Maroc</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 className="mb-4 font-bold">{t('welcome.footerQuickLinks')}</h3>
                                <div className="space-y-2">
                                    <Link href={route('login')} className="block text-gray-400 transition-colors hover:text-white">
                                        {t('welcome.login')}
                                    </Link>
                                    <Link href={route('register')} className="block text-gray-400 transition-colors hover:text-white">
                                        {t('welcome.signUp')}
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
                            <p>
                                © {new Date().getFullYear()} {t('common.centreZawajMaroc')} - {t('welcome.footerRights')}
                            </p>
                        </div>
                    </div>
                </footer>
       </div>
        </>
    );
}
