import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

const translations: Record<string, Record<string, string>> = {
  fr: {
    login: 'Se connecter',
    email: 'Email',
    password: 'Mot de passe',
    dashboard: 'Tableau de bord',
    scanner: 'Scanner QR',
    clients: 'Clients',
    offers: 'Offres',
    settings: 'Reglages',
    logout: 'Se deconnecter',
    save: 'Sauvegarder',
    cancel: 'Annuler',
    delete: 'Supprimer',
    add: 'Ajouter',
    edit: 'Modifier',
    search: 'Rechercher un client...',
    noClients: 'Aucun client',
    noOffers: 'Aucune offre',
    points: 'Points',
    visits: 'visites',
    totalEarned: 'Total gagne',
    newThisWeek: 'Nouveaux (7j)',
    revenue: 'Revenus ($)',
    pending: 'Echanges en attente',
    approved: 'Echanges approuves',
    distributed: 'Points distribues',
    rewards: 'Recompenses',
    vipTiers: 'Niveaux VIP',
    staff: 'Employes',
    audit: 'Audit employes',
    commerce: 'Commerce',
    pointsPerDollar: 'Points par dollar',
    referralBonus: 'Bonus parrainage',
    visitBonus: 'Bonus visite',
    scanQR: 'Scannez le QR du client',
    batchMode: 'Batch',
    amount: 'Montant',
    manualPoints: 'Ou points manuels',
    addPoints: 'Ajouter les points',
    success: 'Succes',
    error: 'Erreur',
    history: 'Historique',
    notes: 'Notes internes',
    noNotes: 'Aucune note',
    newOffer: 'Nouvelle offre',
    newReward: 'Nouvelle recompense',
    darkMode: 'Mode sombre',
    language: 'Langue',
    biometric: 'Face ID / Touch ID',
    exportCSV: 'Exporter CSV',
    report: 'Rapport mensuel',
    name: 'Nom',
    phone: 'Telephone',
    address: 'Adresse',
    photo: 'Photo (optionnel)',
    choosePhoto: 'Choisir une photo',
    pointsRequired: 'Points requis',
    title: 'Titre',
    description: 'Description',
    usageLimit: "Limite d'utilisations (optionnel)",
    createOffer: "Creer l'offre",
    loyalty: 'Gestion de programme de fidelite',
    sendSMS: 'Envoyer SMS',
    confirmLogout: 'Etes-vous sur?',
    welcome: 'Bienvenue',
    onboard1Title: 'Gerez vos clients',
    onboard1Desc: 'Ajoutez des points, scannez des QR codes et suivez vos clients fidelement.',
    onboard2Title: 'Analysez vos stats',
    onboard2Desc: 'Graphiques, alertes anti-fraude et rapports PDF pour garder le controle.',
    onboard3Title: 'Offres et recompenses',
    onboard3Desc: 'Creez des promos, gerez les recompenses et fidelisez vos clients.',
    getStarted: 'Commencer',
    next: 'Suivant',
    skip: 'Passer',
  },
  en: {
    login: 'Sign in',
    email: 'Email',
    password: 'Password',
    dashboard: 'Dashboard',
    scanner: 'QR Scanner',
    clients: 'Clients',
    offers: 'Offers',
    settings: 'Settings',
    logout: 'Sign out',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    add: 'Add',
    edit: 'Edit',
    search: 'Search a client...',
    noClients: 'No clients',
    noOffers: 'No offers',
    points: 'Points',
    visits: 'visits',
    totalEarned: 'Total earned',
    newThisWeek: 'New (7d)',
    revenue: 'Revenue ($)',
    pending: 'Pending redemptions',
    approved: 'Approved redemptions',
    distributed: 'Points distributed',
    rewards: 'Rewards',
    vipTiers: 'VIP Tiers',
    staff: 'Staff',
    audit: 'Staff audit',
    commerce: 'Business',
    pointsPerDollar: 'Points per dollar',
    referralBonus: 'Referral bonus',
    visitBonus: 'Visit bonus',
    scanQR: 'Scan client QR code',
    batchMode: 'Batch',
    amount: 'Amount',
    manualPoints: 'Or manual points',
    addPoints: 'Add points',
    success: 'Success',
    error: 'Error',
    history: 'History',
    notes: 'Internal notes',
    noNotes: 'No notes',
    newOffer: 'New offer',
    newReward: 'New reward',
    darkMode: 'Dark mode',
    language: 'Language',
    biometric: 'Face ID / Touch ID',
    exportCSV: 'Export CSV',
    report: 'Monthly report',
    name: 'Name',
    phone: 'Phone',
    address: 'Address',
    photo: 'Photo (optional)',
    choosePhoto: 'Choose a photo',
    pointsRequired: 'Points required',
    title: 'Title',
    description: 'Description',
    usageLimit: 'Usage limit (optional)',
    createOffer: 'Create offer',
    loyalty: 'Loyalty program management',
    sendSMS: 'Send SMS',
    confirmLogout: 'Are you sure?',
    welcome: 'Welcome',
    onboard1Title: 'Manage your clients',
    onboard1Desc: 'Add points, scan QR codes and track your loyal customers.',
    onboard2Title: 'Analyze your stats',
    onboard2Desc: 'Charts, fraud alerts and PDF reports to stay in control.',
    onboard3Title: 'Offers and rewards',
    onboard3Desc: 'Create promos, manage rewards and build customer loyalty.',
    getStarted: 'Get started',
    next: 'Next',
    skip: 'Skip',
  },
};

interface I18nContextType {
  t: (key: string) => string;
  lang: string;
  setLang: (lang: string) => void;
}

const I18nContext = createContext<I18nContextType>({
  t: (key) => key,
  lang: 'fr',
  setLang: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState('fr');

  useEffect(() => {
    SecureStore.getItemAsync('lang').then(v => {
      if (v === 'en') setLangState('en');
    });
  }, []);

  const setLang = (l: string) => {
    setLangState(l);
    SecureStore.setItemAsync('lang', l);
  };

  const t = (key: string) => translations[lang]?.[key] || translations.fr[key] || key;

  return (
    <I18nContext.Provider value={{ t, lang, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
