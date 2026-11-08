export type UserRole = 'vedouci' | 'zamestnanec' | 'verejnost';

export type BookStatus = 'Dostupná' | 'Vypůjčená' | 'V restralizaci' | 'Ztracená';

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string; // Může obsahovat číslo ISBN nebo "Bez ISBN" pro tituly bez přiděleného ISBN
  hasNoIsbn?: boolean; // Příznak, že kniha nemá přiděleno ISBN (např. staré tisky před r. 1970/1989, samizdaty, brožury)
  noIsbnReason?: string; // Důvod absence ISBN (např. "Vydáno před zavedením ISBN", "Bibliofilie", "Samizdat")
  code: string; // Interní kód knihy
  category: string;
  year: number;
  publisher: string;
  description: string;
  status: BookStatus;
  location: string; // Umístění např. "Regál A2 - Polička 3"
  coverImage?: string;
  jacketAuthorInfo?: string; // Informace o autorovi na přebalu knihy (medailonek, biografie)
  coverKeywords?: string[]; // Klíčová slova vizuálního obalu
  pageCount?: number; // Počet stran / rozsah z Knihovny.cz
  language?: string; // Jazyk vydání (např. Čeština)
  edition?: string; // Vydání (např. 1. vydání)
  physicalDetails?: string; // Fyzický popis vazby a rozměrů z Knihovny.cz
  sourceUrl?: string; // Odkaz na záznam v Knihovny.cz
  notes?: string; // Poznámky z fondu Knihovny.cz
  addedDate: string;
  borrowedBy?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export type ViewTab = 'katalog' | 'rozpoznani' | 'sprava' | 'qr-generator';
