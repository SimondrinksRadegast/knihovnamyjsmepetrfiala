import React, { useState } from 'react';
import type { Book, UserRole, BookStatus } from '../types';
import { Plus, Edit2, Trash2, Save, X, Search, QrCode, Sparkles, BookOpen, RefreshCw } from 'lucide-react';
import { fetchNewestCoverResultFromKnihovny } from '../services/knihovnyCover';

interface AdminPanelProps {
  books: Book[];
  userRole: UserRole;
  onAddBook: (book: Omit<Book, 'id' | 'addedDate'>) => void;
  onEditBook: (book: Book) => void;
  onDeleteBook: (bookId: string) => void;
  onSelectBookForQR: (book: Book) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  books,
  userRole,
  onAddBook,
  onEditBook,
  onDeleteBook,
  onSelectBookForQR,
}) => {
  const isLeader = userRole === 'vedouci';
  const [filterQuery, setFilterQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Česká klasika');
  const [year, setYear] = useState(new Date().getFullYear());
  const [publisher, setPublisher] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<BookStatus>('Dostupná');
  const [location, setLocation] = useState('Regál A1 - Polička 1');
  const [coverImage, setCoverImage] = useState('');
  const [isFetchingCover, setIsFetchingCover] = useState(false);
  const [coverNote, setCoverNote] = useState<string | null>(null);

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setIsbn('');
    setCode('');
    setCategory('Česká klasika');
    setYear(new Date().getFullYear());
    setPublisher('');
    setDescription('');
    setStatus('Dostupná');
    setLocation('Regál A1 - Polička 1');
    setCoverImage('');
    setCoverNote(null);
    setIsFetchingCover(false);
    setEditingBookId(null);
    setIsFormOpen(false);
  };

  const handleStartEdit = (book: Book) => {
    setEditingBookId(book.id);
    setTitle(book.title);
    setAuthor(book.author);
    setIsbn(book.isbn);
    setCode(book.code);
    setCategory(book.category);
    setYear(book.year);
    setPublisher(book.publisher);
    setDescription(book.description);
    setStatus(book.status);
    setLocation(book.location);
    setCoverImage(book.coverImage || '');
    setCoverNote(null);
    setIsFormOpen(true);
  };

  const handleFetchKnihovnyCover = async () => {
    if (!title && !isbn) {
      alert('Pro vyhledání přebalu z Knihovny.cz zadejte nejprve Název nebo ISBN knihy.');
      return;
    }
    setIsFetchingCover(true);
    setCoverNote(null);
    try {
      const res = await fetchNewestCoverResultFromKnihovny({ title, author, isbn });
      if (res && res.url) {
        setCoverImage(res.url);
        setCoverNote(res.sourceNote || 'Přebal načten z Knihovny.cz (Nejnovější dostupné vydání)');
      } else {
        setCoverNote('Přebal na Knihovny.cz nebyl nalezen.');
      }
    } catch {
      setCoverNote('Nepodařilo se načíst přebal z Knihovny.cz.');
    } finally {
      setIsFetchingCover(false);
    }
  };

  const handleStartAdd = () => {
    resetForm();
    setCode(`LIB-AUTO-${Math.floor(100 + Math.random() * 900)}`);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !isbn || !code) {
      alert('Vyplňte prosím Název, Autora, ISBN a Kód knihy.');
      return;
    }

    let finalCoverImage = coverImage;
    if (!finalCoverImage) {
      setIsFetchingCover(true);
      try {
        const res = await fetchNewestCoverResultFromKnihovny({ title, author, isbn });
        if (res && res.url) {
          finalCoverImage = res.url;
        }
      } catch {
        // ignore fallback errors
      } finally {
        setIsFetchingCover(false);
      }
    }

    if (editingBookId) {
      const existing = books.find((b) => b.id === editingBookId);
      if (existing) {
        onEditBook({
          ...existing,
          title,
          author,
          isbn,
          code,
          category,
          year: Number(year),
          publisher,
          description,
          status,
          location,
          coverImage: finalCoverImage,
        });
      }
    } else {
      onAddBook({
        title,
        author,
        isbn,
        code,
        category,
        year: Number(year),
        publisher,
        description,
        status,
        location,
        coverImage: finalCoverImage,
      });
    }

    resetForm();
  };

  const filteredBooks = books.filter(
    (b) =>
      b.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(filterQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(filterQuery.toLowerCase()) ||
      b.isbn.includes(filterQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                isLeader ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
              }`}
            >
              {isLeader ? '👑 Centrální vedení (Vedoucí)' : '💼 Správa databáze (Zaměstnanec)'}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Správa knih & Katalogizace</h2>
          <p className="text-xs text-slate-500 mt-1">
            {isLeader
              ? 'Jakožto vedoucí máte plnou kontrolu nad databází: přidávání, úprava popisů, mazání i správa QR kódů.'
              : 'Jako zaměstnanec můžete upravovat stavy knih a spravovat detaily titulu.'}
          </p>
        </div>

        <button
          onClick={handleStartAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition shadow-sm flex items-center gap-2 shrink-0"
        >
          <Plus size={18} />
          <span>Přidat novou knihu</span>
        </button>
      </div>

      {/* Add / Edit Form Drawer/Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {editingBookId ? <Edit2 size={18} className="text-blue-600" /> : <Plus size={18} className="text-blue-600" />}
                <span>{editingBookId ? 'Úprava záznamu knihy' : 'Přidání nové knihy do databáze'}</span>
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Název knihy *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Babička"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Autor *</label>
                  <input
                    type="text"
                    required
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Božena Němcová"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">ISBN kód *</label>
                  <input
                    type="text"
                    required
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    placeholder="978-80-7390-348-1"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Interní kód (QR ID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="LIB-BOZ-001"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Kategorie</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Česká klasika"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Rok vydání</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nakladatelství</label>
                  <input
                    type="text"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    placeholder="Albatros"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Umístění v knihovně
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Regál A1 - Polička 2"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Stav dostupnosti</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as BookStatus)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Dostupná">Dostupná</option>
                    <option value="Vypůjčená">Vypůjčená</option>
                    <option value="V restralizaci">V restaurování</option>
                    <option value="Ztracená">Ztracená</option>
                  </select>
                </div>

                <div className="md:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                      Přebal knihy (Z Knihovny.cz / URL)
                    </label>
                    <button
                      type="button"
                      onClick={handleFetchKnihovnyCover}
                      disabled={isFetchingCover}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      {isFetchingCover ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <Sparkles size={13} className="text-amber-300" />
                      )}
                      <span>Vyhledat nejnovější přebal na Knihovny.cz</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-16 bg-white rounded-lg border border-slate-200 overflow-hidden shrink-0 shadow-sm flex items-center justify-center text-slate-300">
                      {coverImage ? (
                        <img src={coverImage} alt="Přebal knihy" className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen size={20} />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={coverImage}
                        onChange={(e) => setCoverImage(e.target.value)}
                        placeholder="https://... (nebo použijte vyhledání výše)"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                      {coverNote && (
                        <p className="text-[11px] text-indigo-700 font-semibold flex items-center gap-1">
                          <Sparkles size={11} className="text-indigo-500" /> {coverNote}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Anotace / Popisek</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailní popis knižního titulu..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Save size={16} />
                  <span>{editingBookId ? 'Uložit změny' : 'Přidat do databáze'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Database Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Rychlý filtr tabulky..."
              className="w-full bg-slate-50 text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-xs text-slate-600 font-medium">Celkem záznamů: {filteredBooks.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 uppercase text-[11px] font-bold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Přebal</th>
                <th className="py-3 px-4">Kód & ISBN</th>
                <th className="py-3 px-4">Kniha / Autor</th>
                <th className="py-3 px-4">Kategorie</th>
                <th className="py-3 px-4">Umístění</th>
                <th className="py-3 px-4">Stav</th>
                <th className="py-3 px-4 text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredBooks.map((book) => (
                <tr key={book.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="w-10 h-14 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                      {book.coverImage ? (
                        <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen size={16} className="text-slate-300" />
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-mono font-bold text-slate-800">{book.code}</div>
                    <div className="text-[10px] text-slate-600 font-mono">{book.isbn}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 text-sm">{book.title}</div>
                    <div className="text-slate-600">{book.author} ({book.year})</div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">{book.category}</td>

                  <td className="py-3 px-4 whitespace-nowrap text-blue-700 font-semibold">{book.location}</td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        book.status === 'Dostupná'
                          ? 'bg-emerald-100 text-emerald-800'
                          : book.status === 'Vypůjčená'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {book.status}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {isLeader && (
                        <button
                          onClick={() => onSelectBookForQR(book)}
                          title="Vygenerovat QR štítek"
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        >
                          <QrCode size={16} />
                        </button>
                      )}

                      <button
                        onClick={() => handleStartEdit(book)}
                        title="Upravit záznam"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit2 size={16} />
                      </button>

                      {isLeader ? (
                        <button
                          onClick={() => {
                            if (confirm(`Opravdu chcete odstranit knihu "${book.title}" z databáze?`)) {
                              onDeleteBook(book.id);
                            }
                          }}
                          title="Odstranit knihu (Pouze Vedoucí)"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <span
                          title="Odebírání z databáze smí provádět pouze Vedoucí"
                          className="p-1.5 text-slate-300 cursor-not-allowed"
                        >
                          <Trash2 size={16} />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
