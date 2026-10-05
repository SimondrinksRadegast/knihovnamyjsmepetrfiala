export type UserRole = 'vedouci' | 'zamestnanec' | 'verejnost';

export type BookStatus = 'Dostupná' | 'Vypůjčená' | 'V restralizaci' | 'Ztracená';

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  code: string; // Interní kód knihy
  category: string;
  year: number;
  publisher: string;
  description: string;
  status: BookStatus;
  location: string; // Umístění např. "Regál A2 - Polička 3"
  coverImage?: string;
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
