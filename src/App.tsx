import { useState, useEffect } from 'react';
import type { Book, UserRole, ViewTab, User } from './types';
import { Header } from './components/Header';
import { BookCatalog } from './components/BookCatalog';
import { BookScanner } from './components/BookScanner';
import { AdminPanel } from './components/AdminPanel';
import { QRCodeGenerator } from './components/QRCodeGenerator';
import { AuthModal } from './components/AuthModal';
import { fetchNewestCoverFromKnihovny } from './services/knihovnyCover';
import {
  loadBooks,
  saveBooks,
  resetBooks,
  loadStoredUser,
  saveStoredUser,
  loadStoredRole,
  saveStoredRole,
} from './services/storage';

const CURRENT_YEAR = new Date().getFullYear();

export function App() {
  const [books, setBooks] = useState<Book[]>(loadBooks);
  const [activeTab, setActiveTab] = useState<ViewTab>('katalog');
  const [userRole, setUserRole] = useState<UserRole>(loadStoredRole);
  const [currentUser, setCurrentUser] = useState<User | null>(loadStoredUser);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookForQR, setSelectedBookForQR] = useState<Book | null>(null);

  // Persist books on every change
  useEffect(() => {
    saveBooks(books);
  }, [books]);

  // Persist current user on change
  useEffect(() => {
    saveStoredUser(currentUser);
  }, [currentUser]);

  // Persist user role on change
  useEffect(() => {
    saveStoredRole(userRole);
  }, [userRole]);

  // Sync current user role if changed from quick toggle bar
  const handleSetRole = (role: UserRole) => {
    setUserRole(role);
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        role,
      });
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setUserRole(user.role);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserRole('verejnost');
  };

  const handleResetData = () => {
    if (window.confirm('Opravdu chcete obnovit výchozí vzorová data knihovny? Vaše změny budou přepsány.')) {
      const defaultBooks = resetBooks();
      setBooks(defaultBooks);
    }
  };

  // Database Mutations
  const handleAddBook = async (newBookData: Omit<Book, 'id' | 'addedDate'>) => {
    let coverImage = newBookData.coverImage;
    if (!coverImage) {
      try {
        const fetchedCover = await fetchNewestCoverFromKnihovny({
          title: newBookData.title,
          author: newBookData.author,
          isbn: newBookData.isbn,
        });
        if (fetchedCover) {
          coverImage = fetchedCover;
        }
      } catch {
        // proceed if cover fetch fails
      }
    }

    const newBook: Book = {
      ...newBookData,
      coverImage: coverImage || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80',
      id: 'b-' + Date.now(),
      addedDate: new Date().toISOString().split('T')[0],
    };
    setBooks((prev) => [newBook, ...prev]);
  };

  const handleEditBook = (updatedBook: Book) => {
    setBooks((prev) => prev.map((b) => (b.id === updatedBook.id ? updatedBook : b)));
  };

  const handleDeleteBook = (bookId: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
  };

  const handleUpdateBookStatus = (bookId: string, newStatus: Book['status']) => {
    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, status: newStatus } : b))
    );
  };

  const handleSelectBookForQR = (book: Book) => {
    setSelectedBookForQR(book);
    setActiveTab('qr-generator');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={handleSetRole}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'katalog' && (
          <BookCatalog
            books={books}
            searchQuery={searchQuery}
            userRole={userRole}
            onSelectBookForQR={handleSelectBookForQR}
            onQuickToggleStatus={handleUpdateBookStatus}
          />
        )}

        {activeTab === 'rozpoznani' && (
          <BookScanner
            books={books}
            onUpdateBookStatus={handleUpdateBookStatus}
            onAddBook={handleAddBook}
          />
        )}

        {activeTab === 'sprava' && (userRole === 'vedouci' || userRole === 'zamestnanec') && (
          <AdminPanel
            books={books}
            userRole={userRole}
            onAddBook={handleAddBook}
            onEditBook={handleEditBook}
            onDeleteBook={handleDeleteBook}
            onSelectBookForQR={handleSelectBookForQR}
            onResetData={handleResetData}
          />
        )}

        {activeTab === 'qr-generator' && userRole === 'vedouci' && (
          <QRCodeGenerator
            books={books}
            selectedBook={selectedBookForQR}
            onSelectBook={setSelectedBookForQR}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 border-t border-slate-800 print:hidden">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="font-semibold text-slate-300">
            Knihovní Kataloční & Rozpoznávací Systém © {CURRENT_YEAR}
          </p>
          <p className="text-slate-500">
            Aplikace pro správu knih, OCR/rozpoznávání, generování QR štítků a evidenci zaměstnanců • Data se automaticky ukládají
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={handleLogin}
        currentRole={userRole}
      />
    </div>
  );
}

export default App;
