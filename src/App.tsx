import { useState } from 'react';
import type { Book, UserRole, ViewTab, User } from './types';
import { INITIAL_BOOKS } from './mockData';
import { Header } from './components/Header';
import { BookCatalog } from './components/BookCatalog';
import { BookScanner } from './components/BookScanner';
import { AdminPanel } from './components/AdminPanel';
import { QRCodeGenerator } from './components/QRCodeGenerator';
import { AuthModal } from './components/AuthModal';

export function App() {
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [activeTab, setActiveTab] = useState<ViewTab>('katalog');
  const [userRole, setUserRole] = useState<UserRole>('vedouci'); // Default to leader to showcase full capabilities
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: 'u-admin',
    name: 'Jan Vedoucí',
    email: 'vedouci@knihovna.cz',
    role: 'vedouci',
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookForQR, setSelectedBookForQR] = useState<Book | null>(null);

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

  // Database Mutations
  const handleAddBook = (newBookData: Omit<Book, 'id' | 'addedDate'>) => {
    const newBook: Book = {
      ...newBookData,
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
          <BookScanner books={books} onUpdateBookStatus={handleUpdateBookStatus} />
        )}

        {activeTab === 'sprava' && (userRole === 'vedouci' || userRole === 'zamestnanec') && (
          <AdminPanel
            books={books}
            userRole={userRole}
            onAddBook={handleAddBook}
            onEditBook={handleEditBook}
            onDeleteBook={handleDeleteBook}
            onSelectBookForQR={handleSelectBookForQR}
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
            Knihovní Kataloční & Rozpoznávací Systém © {new Date().getFullYear()}
          </p>
          <p className="text-slate-500">
            Aplikace pro správu knih, OCR/rozpoznávání, generování QR štítků a evidenci zaměstnanců
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
