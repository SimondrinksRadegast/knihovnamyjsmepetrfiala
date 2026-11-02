import type { Book, User, UserRole } from '../types';
import { INITIAL_BOOKS } from '../mockData';

const STORAGE_KEYS = {
  BOOKS: 'knihovna_books_v1',
  USER: 'knihovna_current_user_v1',
  ROLE: 'knihovna_user_role_v1',
};

const DEFAULT_USER: User = {
  id: 'u-admin',
  name: 'Jan Vedoucí',
  email: 'vedouci@knihovna.cz',
  role: 'vedouci',
};

/**
 * Loads books from localStorage. Falls back to INITIAL_BOOKS if not set or invalid.
 */
export function loadBooks(): Book[] {
  if (typeof window === 'undefined') return INITIAL_BOOKS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.BOOKS);
    if (!raw) {
      return INITIAL_BOOKS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_BOOKS;
  } catch (error) {
    console.warn('Failed to load books from localStorage, fallback to default:', error);
    return INITIAL_BOOKS;
  }
}

/**
 * Saves books array to localStorage.
 */
export function saveBooks(books: Book[]): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
  } catch (error) {
    console.error('Failed to save books to localStorage:', error);
  }
}

/**
 * Resets books in localStorage to default INITIAL_BOOKS and returns them.
 */
export function resetBooks(): Book[] {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.BOOKS);
    } catch (error) {
      console.warn('Failed to remove books from localStorage:', error);
    }
  }
  return INITIAL_BOOKS;
}

/**
 * Loads stored user from localStorage or returns default admin user.
 */
export function loadStoredUser(): User | null {
  if (typeof window === 'undefined') return DEFAULT_USER;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.USER);
    if (raw === null) return DEFAULT_USER;
    if (raw === 'null') return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Failed to load user from localStorage:', error);
    return DEFAULT_USER;
  }
}

/**
 * Saves current user to localStorage.
 */
export function saveStoredUser(user: User | null): void {
  if (typeof window === 'undefined') return;

  try {
    if (user === null) {
      window.localStorage.setItem(STORAGE_KEYS.USER, 'null');
    } else {
      window.localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
  } catch (error) {
    console.error('Failed to save user to localStorage:', error);
  }
}

/**
 * Loads stored user role from localStorage.
 */
export function loadStoredRole(): UserRole {
  if (typeof window === 'undefined') return 'vedouci';

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.ROLE);
    if (raw === 'vedouci' || raw === 'zamestnanec' || raw === 'verejnost') {
      return raw;
    }
    return 'vedouci';
  } catch {
    return 'vedouci';
  }
}

/**
 * Saves user role to localStorage.
 */
export function saveStoredRole(role: UserRole): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEYS.ROLE, role);
  } catch (error) {
    console.error('Failed to save role to localStorage:', error);
  }
}
