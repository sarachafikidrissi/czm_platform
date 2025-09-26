import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    [key: string]: unknown;
}
// New Profile interface
export interface Profile {
    id?: number;
    user_id: number;
    current_step: number;
    is_completed: boolean;
    completed_at?: string | null;
    
    // Step 1: Personal Information
    nom?: string | null;
    prenom?: string | null;
    date_naissance?: string | null;
    niveau_etudes?: string | null;
    situation_professionnelle?: string | null;
    secteur?: string | null;
    revenu?: string | null;
    religion?: string | null;
    
    // Step 2: Additional Information
    etat_matrimonial?: string | null;
    logement?: string | null;
    taille?: number | null;
    poids?: number | null;
    etat_sante?: string | null;
    fumeur?: string | null;
    buveur?: string | null;
    sport?: string | null;
    motorise?: string | null;
    loisirs?: string | null;
    
    // Step 3: Partner Preferences
    age_minimum?: number | null;
    situation_matrimoniale_recherche?: string | null;
    pays_recherche?: string | null;
    villes_recherche?: string[] | null;
    niveau_etudes_recherche?: string | null;
    statut_emploi_recherche?: string | null;
    revenu_minimum?: string | null;
    religion_recherche?: string | null;
    
    // Step 4: Profile Picture
    profile_picture_path?: string | null;
    profile_picture_disk?: string | null;
    
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown; // Allow additional properties
}
export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    profile?: Profile;
    [key: string]: unknown; // This allows for additional properties...
}

