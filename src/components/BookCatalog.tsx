import React from 'react';
import type { Book, UserRole, BookStatus } from '../types';
import { BookOpen, MapPin, Tag, CheckCircle, Clock, AlertTriangle, QrCode, ArrowRight, X, Edit3, Save, ExternalLink, Sparkles, BookMarked } from 'lucide-react';
import { getReliableCoverUrl } from '../services/knihovnyCover';
import { QRCodeSVG } from 'qrcode.react';

interface BookCatalogProps {
  books: Book[];
  searchQuery: string;
  userRole: UserRole;
  onEditBook?: (updatedBook: Book) => void;
  onSelectBookForQR?: (book: Book) => void;
  onQuickToggleStatus?: (bookId: string, currentStatus: Book['status']) => void;
}

export const BookCatalog: React.FC<BookCatalogProps> = ({
  books,
  searchQuery,
  userRole,
  onEditBook,
  onSelectBookForQR,
  onQuickToggleStatus,
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('Vše');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('Vše');
  const [activeBookId, setActiveBookId] = React.useState<string | null>(null);

  // Manual inline edit state in detail modal
  const [isEditingInModal, setIsEditingInModal] = React.useState(false);
  const [editFormData, setEditFormData] = React.useState<Book | null>(null);

  // Derive activeBook directly from books to avoid useEffect setState lint issues
  const activeBook = React.useMemo(() => {
    if (!activeBookId) return null;
    return books.find((b) => b.id === activeBookId) || null;
  }, [books, activeBookId]);

  const handleStartModalEdit = () => {
    if (activeBook) {
      setEditFormData({ ...activeBook });
      setIsEditingInModal(true);
    }
  };

  const handleCancelModalEdit = () => {
    setIsEditingInModal(false);
    setEditFormData(null);
  };

  const handleSaveModalEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData || !onEditBook) return;

    onEditBook(editFormData);
    setIsEditingInModal(false);
    setEditFormData(null);
  };

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
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        const fallback = getReliableCoverUrl(book);
                        if (target.src !== fallback) {
                          target.src = fallback;
                        }
                      }}
                    />
                  ) : (
                    <img
                      src={getReliableCoverUrl(book)}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
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
                  onClick={() => setActiveBookId(book.id)}
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-slate-100 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div className="flex-1 mr-4">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusBadge(activeBook.status)}
                  <span className="text-[11px] font-mono bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded">
                    {activeBook.code}
                  </span>
                  {activeBook.sourceUrl && (
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles size={11} className="text-blue-600" /> Knihovny.cz
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">{activeBook.title}</h2>
                <p className="text-sm font-medium text-slate-600">{activeBook.author}</p>
              </div>

              <div className="flex items-center gap-2">
                {(userRole === 'vedouci' || userRole === 'zamestnanec') && !isEditingInModal && onEditBook && (
                  <button
                    onClick={handleStartModalEdit}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    title="Ručně upravit informace o knize"
                  >
                    <Edit3 size={14} />
                    <span>Změnit info ručně</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setActiveBookId(null);
                    setIsEditingInModal(false);
                    setEditFormData(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {isEditingInModal && editFormData ? (
                /* Inline Manual Edit Form inside Modal */
                <form onSubmit={handleSaveModalEdit} className="space-y-4">
                  <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl flex items-center justify-between text-xs text-blue-900">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Edit3 size={14} className="text-blue-600" /> Ruční úprava informací o knize
                    </span>
                    <span className="text-[11px] text-blue-700 font-medium">Změny se ihned uloží do databáze</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Název titulu *</label>
                      <input
                        type="text"
                        required
                        value={editFormData.title}
                        onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Autor *</label>
                      <input
                        type="text"
                        required
                        value={editFormData.author}
                        onChange={(e) => setEditFormData({ ...editFormData, author: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase">ISBN</label>
                        <label className="text-[10px] text-amber-800 flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(editFormData.hasNoIsbn || editFormData.isbn === 'Bez ISBN')}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setEditFormData({
                                ...editFormData,
                                hasNoIsbn: checked,
                                isbn: checked ? 'Bez ISBN' : '',
                              });
                            }}
                            className="rounded h-3 w-3 text-amber-600"
                          />
                          <span>Bez ISBN</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={editFormData.isbn}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          isbn: e.target.value,
                          hasNoIsbn: e.target.value === 'Bez ISBN',
                        })}
                        placeholder="978-80-... nebo Bez ISBN"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Interní Kód</label>
                      <input
                        type="text"
                        value={editFormData.code}
                        onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Kategorie</label>
                      <input
                        type="text"
                        value={editFormData.category}
                        onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Rok vydání</label>
                      <input
                        type="number"
                        value={editFormData.year}
                        onChange={(e) => setEditFormData({ ...editFormData, year: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Nakladatelství</label>
                      <input
                        type="text"
                        value={editFormData.publisher}
                        onChange={(e) => setEditFormData({ ...editFormData, publisher: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Počet stran</label>
                      <input
                        type="number"
                        value={editFormData.pageCount || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, pageCount: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Jazyk</label>
                      <input
                        type="text"
                        value={editFormData.language || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, language: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Vydání</label>
                      <input
                        type="text"
                        value={editFormData.edition || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, edition: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Stav dostupnosti</label>
                      <select
                        value={editFormData.status}
                        onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as BookStatus })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Dostupná">Dostupná</option>
                        <option value="Vypůjčená">Vypůjčená</option>
                        <option value="V restralizaci">V restaurování</option>
                        <option value="Ztracená">Ztracená</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Umístění v knihovně</label>
                      <input
                        type="text"
                        value={editFormData.location}
                        onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="sm:col-span-2 md:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Fyzický popis & vazba</label>
                      <input
                        type="text"
                        value={editFormData.physicalDetails || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, physicalDetails: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="sm:col-span-2 md:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">URL přebalu (obálky)</label>
                      <input
                        type="text"
                        value={editFormData.coverImage || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, coverImage: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="sm:col-span-2 md:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Odkaz Knihovny.cz</label>
                      <input
                        type="text"
                        value={editFormData.sourceUrl || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, sourceUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Anotace & Popis</label>
                    <textarea
                      rows={3}
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Poznámky k fondu Knihovny.cz</label>
                    <textarea
                      rows={2}
                      value={editFormData.notes || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleCancelModalEdit}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                      Zrušit
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Save size={15} />
                      <span>Uložit upravené informace</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Regular View Mode */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Book Image & QR Tag */}
                  <div className="space-y-4 text-center">
                    <div className="w-full aspect-[2/3] bg-slate-100 rounded-xl overflow-hidden shadow-sm border border-slate-200">
                      {activeBook.coverImage ? (
                        <img
                          src={activeBook.coverImage}
                          alt={activeBook.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget;
                            const fallback = getReliableCoverUrl(activeBook);
                            if (target.src !== fallback) {
                              target.src = fallback;
                            }
                          }}
                        />
                      ) : (
                        <img
                          src={getReliableCoverUrl(activeBook)}
                          alt={activeBook.title}
                          className="w-full h-full object-cover"
                        />
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
                      <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        {activeBook.description}
                      </p>
                    </div>

                    {/* Basic info grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-600 font-medium">ISBN Kód</p>
                        {activeBook.hasNoIsbn || !activeBook.isbn || activeBook.isbn.toLowerCase() === 'bez isbn' ? (
                          <div className="mt-0.5">
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 inline-block font-sans">
                              Bez ISBN
                            </span>
                            {activeBook.noIsbnReason && (
                              <p className="text-[11px] text-slate-500 font-sans mt-0.5">{activeBook.noIsbnReason}</p>
                            )}
                          </div>
                        ) : (
                          <p className="font-mono font-semibold text-slate-800">{activeBook.isbn}</p>
                        )}
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

                    {/* Extended Knihovny.cz Info Box */}
                    <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/70 p-4 rounded-xl border border-indigo-100 space-y-2.5 text-xs text-slate-700">
                      <div className="flex items-center justify-between border-b border-indigo-100/80 pb-2">
                        <span className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                          <BookMarked size={15} className="text-indigo-600" />
                          <span>Informace z národní databáze Knihovny.cz</span>
                        </span>
                        {activeBook.sourceUrl && (
                          <a
                            href={activeBook.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-700 hover:text-indigo-950 font-bold flex items-center gap-1 hover:underline"
                          >
                            <span>Zobrazit na Knihovny.cz</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-indigo-900/60 block">Počet stran</span>
                          <span className="font-semibold text-slate-800">
                            {activeBook.pageCount ? `${activeBook.pageCount} stran` : 'Neuvedeno'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-indigo-900/60 block">Jazyk</span>
                          <span className="font-semibold text-slate-800">{activeBook.language || 'Čeština'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-indigo-900/60 block">Vydání</span>
                          <span className="font-semibold text-slate-800">{activeBook.edition || '1. vydání'}</span>
                        </div>
                      </div>

                      {activeBook.physicalDetails && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-indigo-900/60 block">Fyzický popis & vazba</span>
                          <span className="font-medium text-slate-800">{activeBook.physicalDetails}</span>
                        </div>
                      )}

                      {activeBook.notes && (
                        <div className="pt-1">
                          <span className="text-[10px] uppercase font-bold text-indigo-900/60 block">Poznámky k fondu</span>
                          <span className="italic text-slate-600">{activeBook.notes}</span>
                        </div>
                      )}

                      {activeBook.jacketAuthorInfo && (
                        <div className="pt-1">
                          <span className="text-[10px] uppercase font-bold text-indigo-900/60 block">O autorovi na přebalu</span>
                          <span className="text-slate-700">{activeBook.jacketAuthorInfo}</span>
                        </div>
                      )}
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
                      {(userRole === 'vedouci' || userRole === 'zamestnanec') && onEditBook && (
                        <button
                          onClick={handleStartModalEdit}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                        >
                          <Edit3 size={15} /> Upravit informace ručně
                        </button>
                      )}

                      {userRole === 'vedouci' && onSelectBookForQR && (
                        <button
                          onClick={() => {
                            onSelectBookForQR(activeBook);
                            setActiveBookId(null);
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
                          }}
                          className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-semibold transition"
                        >
                          Změnit stav na: {activeBook.status === 'Dostupná' ? 'Vypůjčená' : 'Dostupná'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
