export type VideoManual = {
  slug: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  videoUrl?: string;
  thumbnail?: string;
  steps: string[];
};

export const videoManuals: VideoManual[] = [
  {
    slug: 'hlavne-menu-zedpera',
    title: '1. Hlavné menu Zedpera',
    description:
      'Animovaný manuál ukazuje vstup do systému Zedpera, hlavné menu, dashboard, výber modulu a základný spôsob práce so systémom.',
    category: 'Základy',
    duration: '5 min',
    videoUrl: '',
    thumbnail: '',
    steps: [
      'Otvorte webovú aplikáciu Zedpera a prihláste sa do svojho účtu.',
      'Po prihlásení sa zobrazí hlavný dashboard systému.',
      'V hornej alebo bočnej navigácii si pozrite hlavné sekcie ako Menu, Profil, AI Chat, Moje práce, Zdroje, Balíčky a Videonávody.',
      'Skontrolujte, či máte vybranú správnu prácu alebo profil práce, s ktorým chcete pracovať.',
      'Kliknite na požadovaný AI modul, napríklad AI školiteľ, Audit kvality, Obhajoba, Preklad, Analýza dát alebo Emaily.',
      'Po výbere modulu si prečítajte stručný popis modulu a jeho účel.',
      'Do vstupného poľa vložte text, otázku alebo zadanie, ktoré chcete spracovať.',
      'Ak je to potrebné, priložte súbor, napríklad Word, PDF, Excel, CSV alebo textový dokument.',
      'Kliknite na hlavné akčné tlačidlo na spustenie spracovania.',
      'Počkajte, kým AI spracuje vstup a pripraví výstup.',
      'Skontrolujte výsledok, prečítajte si odporúčania alebo návrhy od AI.',
      'Podľa potreby výsledok exportujte do Wordu, PDF, Excelu alebo ďalších dostupných formátov.',
      'Ak chcete pokračovať v inej časti systému, vráťte sa späť do dashboardu a vyberte ďalší modul.',
    ],
  },
];