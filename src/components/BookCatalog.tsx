import React from 'react';
import type { Book, UserRole } from '../types';
import { BookOpen, MapPin, Tag, CheckCircle, Clock, AlertTriangle, QrCode, ArrowRight, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface BookCatalogProps {
  books: Book[];
  searchQuery: string;
  userRole: UserRole;
  onSelectBookForQR?: (book: Book) => void;
  onQuickToggleStatus?: (bookId: string, currentStatus: Book['status']) => void;
}

export const BookCatalog: React.FC<BookCatalogProps> = ({
  books,
  searchQuery,
  userRole,
  onSelectBookForQR,
  onQuickToggleStatus,
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('Vše');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('Vše');
  const [activeBook, setActiveBook] = React.useState<Book | null>(null);

  // Extract unique categories
  const categories = React.useMemo(() => {
    const cats = Array.from(new Set(books.map((b) => b.category)));
    return ['Vše', ...cats];
  }, [books]);

  // Filter books based on search query, category, and status
  const filteredBooks = React.useMemo(() => {
    return books.filter((book) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.isbn.toLowerCase().includes(q) ||
        book.code.toLowerCase().includes(q) ||
        book.description.toLowerCase().includes(q);

      const matchesCategory = selectedCategory === 'Vše' || book.category === selectedCategory;
      const matchesStatus = selectedStatus === 'Vše' || book.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [books, searchQuery, selectedCategory, selectedStatus]);

  const getStatusBadge = (status: Book['status']) => {
    switch (status) {
      case 'Dostupná':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle size={13} className="text-emerald-600" /> Dostupná
          </span>
        );
      case 'Vypůjčená':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={13} className="text-amber-600" /> Vypůjčená
          </span>
        );
      case 'V restralizaci':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <AlertTriangle size={13} className="text-purple-600" /> V restaurování
          </span>
        );
      case 'Ztracená':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <X size={13} className="text-rose-600" /> Ztracená
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Category and Status Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mr-1">Kategorie:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Stav:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Vše">Všechny stavy</option>
              <option value="Dostupná">Dostupná</option>
              <option value="Vypůjčená">Vypůjčená</option>
              <option value="V restralizaci">V restaurování</option>
              <option value="Ztracená">Ztracená</option>
            </select>
          </div>
        </div>
      </div>

      {/* Catalog Grid */}
      {filteredBooks.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="inline-flex p-4 bg-slate-100 text-slate-400 rounded-full mb-2">
            <BookOpen size={36} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Žádné knihy nenalezeny</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Pro zadaná kritéria vyhledávání nebo filtru nebyly v knihovním katalogu nalezeny žádné odpovídající tituly.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group"
            >
              <div className="p-5 flex gap-4 flex-1">
                {/* Book Cover or Placeholder */}
                <div className="w-24 h-36 bg-slate-100 rounded-xl overflow-hidden shrink-0 shadow-inner border border-slate-200 relative group-hover:scale-105 transition-transform duration-200">
                  {book.coverImage ? (
                    <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <BookOpen size={32} />
                    </div>
                  )}
                </div>

                {/* Book Main Info */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="mb-2">{getStatusBadge(book.status)}</div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-xs font-medium text-slate-600 mt-0.5">{book.author}</p>

                  <div className="mt-auto pt-3 space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Tag size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{book.category} ({book.year})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate font-medium text-slate-700">{book.location}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded text-[11px]">
                  {book.code}
                </span>

                <button
                  onClick={() => setActiveBook(book)}
                  className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                >
                  Detail knihy <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Book Detail Drawer / Modal */}
      {activeBook && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-100 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div>
                <div className="mb-2">{getStatusBadge(activeBook.status)}</div>
                <h2 className="text-2xl font-extrabold text-slate-900">{activeBook.title}</h2>
                <p className="text-sm font-medium text-slate-600">{activeBook.author}</p>
              </div>
              <button
                onClick={() => setActiveBook(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Book Image & QR Tag */}
                <div className="space-y-4 text-center">
                  <div className="w-full aspect-[2/3] bg-slate-100 rounded-xl overflow-hidden shadow-sm border border-slate-200">
                    {activeBook.coverImage ? (
                      <img src={activeBook.coverImage} alt={activeBook.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <BookOpen size={48} />
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-col items-center">
                    <p className="text-[10px] font-bold text-slate-600 uppercase mb-2">QR Identifikátor</p>
                    <QRCodeSVG value={`LIB:${activeBook.code}:${activeBook.isbn}`} size={100} />
                    <p className="text-[11px] font-mono text-slate-600 mt-2">{activeBook.code}</p>
                  </div>
                </div>

                {/* Information Metadata */}
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Anotace & Popis</h4>
                    <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {activeBook.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-600 font-medium">ISBN Kód</p>
                      <p className="font-mono font-semibold text-slate-800">{activeBook.isbn}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-600 font-medium">Kategorie</p>
                      <p className="font-semibold text-slate-800">{activeBook.category}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-600 font-medium">Rok & Nakladatelství</p>
                      <p className="font-semibold text-slate-800">{activeBook.publisher} ({activeBook.year})</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-600 font-medium">Umístění v knihovně</p>
                      <p className="font-semibold text-blue-700">{activeBook.location}</p>
                    </div>
                  </div>

                  {activeBook.borrowedBy && (
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                      <div>
                        <span className="font-bold">Aktuálně vypůjčeno čtenářem: </span>
                        <span>{activeBook.borrowedBy}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions for Staff/Leader */}
                  <div className="pt-2 flex flex-wrap gap-2">
                    {userRole === 'vedouci' && onSelectBookForQR && (
                      <button
                        onClick={() => {
                          onSelectBookForQR(activeBook);
                          setActiveBook(null);
                        }}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition"
                      >
                        <QrCode size={15} /> Přejít na tisk QR štítku
                      </button>
                    )}

                    {(userRole === 'vedouci' || userRole === 'zamestnanec') && onQuickToggleStatus && (
                      <button
                        onClick={() => {
                          const nextStatus: Book['status'] =
                            activeBook.status === 'Dostupná'
                              ? 'Vypůjčená'
                              : activeBook.status === 'Vypůjčená'
                              ? 'Dostupná'
                              : 'Dostupná';
                          onQuickToggleStatus(activeBook.id, nextStatus);
                          setActiveBook((prev) => (prev ? { ...prev, status: nextStatus } : null));
                        }}
                        className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-semibold transition"
                      >
                        Změnit stav na: {activeBook.status === 'Dostupná' ? 'Vypůjčená' : 'Dostupná'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
