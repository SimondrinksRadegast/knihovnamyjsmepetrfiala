import React, { useState } from 'react';
import type { Book, UserRole, BookStatus } from '../types';
import { Plus, Edit2, Trash2, Save, X, Search, QrCode, Sparkles, BookOpen, RefreshCw, ExternalLink, CheckCircle2 } from 'lucide-react';
import { fetchNewestCoverResultFromKnihovny, fetchBookDetailsFromKnihovny, getReliableCoverUrl } from '../services/knihovnyCover';

const CURRENT_YEAR = new Date().getFullYear();

interface AdminPanelProps {
  books: Book[];
  userRole: UserRole;
  onAddBook: (book: Omit<Book, 'id' | 'addedDate'>) => void;
  onEditBook: (book: Book) => void;
  onDeleteBook: (bookId: string) => void;
  onSelectBookForQR: (book: Book) => void;
  onResetData?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  books,
  userRole,
  onAddBook,
  onEditBook,
  onDeleteBook,
  onSelectBookForQR,
  onResetData,
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
  const [year, setYear] = useState(CURRENT_YEAR);
  const [publisher, setPublisher] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<BookStatus>('Dostupná');
  const [location, setLocation] = useState('Regál A1 - Polička 1');
  const [coverImage, setCoverImage] = useState('');
  const [isFetchingCover, setIsFetchingCover] = useState(false);
  const [coverNote, setCoverNote] = useState<string | null>(null);

  // Knihovny.cz extended attributes state
  const [pageCount, setPageCount] = useState<number | undefined>(undefined);
  const [language, setLanguage] = useState('Čeština');
  const [edition, setEdition] = useState('');
  const [physicalDetails, setPhysicalDetails] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [jacketAuthorInfo, setJacketAuthorInfo] = useState('');
  const [isFetchingKnihovnyAll, setIsFetchingKnihovnyAll] = useState(false);
  const [knihovnySuccessNote, setKnihovnySuccessNote] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setIsbn('');
    setCode('');
    setCategory('Česká klasika');
    setYear(CURRENT_YEAR);
    setPublisher('');
    setDescription('');
    setStatus('Dostupná');
    setLocation('Regál A1 - Polička 1');
    setCoverImage('');
    setCoverNote(null);
    setPageCount(undefined);
    setLanguage('Čeština');
    setEdition('');
    setPhysicalDetails('');
    setSourceUrl('');
    setNotes('');
    setJacketAuthorInfo('');
    setIsFetchingCover(false);
    setIsFetchingKnihovnyAll(false);
    setKnihovnySuccessNote(null);
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
    setPageCount(book.pageCount);
    setLanguage(book.language || 'Čeština');
    setEdition(book.edition || '');
    setPhysicalDetails(book.physicalDetails || '');
    setSourceUrl(book.sourceUrl || '');
    setNotes(book.notes || '');
    setJacketAuthorInfo(book.jacketAuthorInfo || '');
    setKnihovnySuccessNote(null);
    setIsFormOpen(true);
  };

  const handleFetchAllFromKnihovny = async () => {
    if (!isbn && !title) {
      alert('Zadejte prosím nejprve ISBN nebo Název knihy pro načtení informací z Knihovny.cz.');
      return;
    }

    setIsFetchingKnihovnyAll(true);
    setKnihovnySuccessNote(null);
    try {
      const details = await fetchBookDetailsFromKnihovny({ title, author, isbn });
      if (details) {
        if (details.title && (!title || title === 'Nová kniha')) setTitle(details.title);
        if (details.author && (!author || author === 'Neznámý autor')) setAuthor(details.author);
        if (details.isbn && !isbn) setIsbn(details.isbn);
        if (details.publisher) setPublisher(details.publisher);
        if (details.year) setYear(details.year);
        if (details.category) setCategory(details.category);
        if (details.description) setDescription(details.description);
        if (details.coverImage) setCoverImage(details.coverImage);
        if (details.pageCount) setPageCount(details.pageCount);
        if (details.language) setLanguage(details.language);
        if (details.edition) setEdition(details.edition);
        if (details.physicalDetails) setPhysicalDetails(details.physicalDetails);
        if (details.sourceUrl) setSourceUrl(details.sourceUrl);
        if (details.notes) setNotes(details.notes);
        if (details.jacketAuthorInfo) setJacketAuthorInfo(details.jacketAuthorInfo);

        setKnihovnySuccessNote(`Informace byly úspěšně načteny (${details.sourceNote || 'Knihovny.cz'}). Všechna pole můžete nyní ručně upravit.`);
      } else {
        alert('Pro zadané údaje nebyly na Knihovny.cz nalezeny žádné podrobnosti.');
      }
    } catch {
      alert('Nepodařilo se připojit k databázi Knihovny.cz.');
    } finally {
      setIsFetchingKnihovnyAll(false);
    }
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
        const fallbackUrl = getReliableCoverUrl({ title, author, isbn, year });
        setCoverImage(fallbackUrl);
        setCoverNote('Přebal vytvořen z fondu Knihovny.cz');
      }
    } catch {
      const fallbackUrl = getReliableCoverUrl({ title, author, isbn, year });
      setCoverImage(fallbackUrl);
      setCoverNote('Přebal vytvořen z fondu Knihovny.cz');
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
    let finalPublisher = publisher;
    let finalYear = Number(year);
    let finalCategory = category;
    let finalDescription = description;
    let finalPageCount = pageCount;
    let finalLanguage = language;
    let finalEdition = edition;
    let finalPhysicalDetails = physicalDetails;
    let finalSourceUrl = sourceUrl;
    let finalNotes = notes;
    let finalJacketAuthorInfo = jacketAuthorInfo;

    // If adding a new book and some Knihovny.cz fields are empty, auto-fetch from Knihovny.cz
    if (!editingBookId && (!finalCoverImage || !finalPageCount || !finalSourceUrl || !finalPhysicalDetails)) {
      try {
        const details = await fetchBookDetailsFromKnihovny({ title, author, isbn });
        if (details) {
          if (!finalCoverImage && details.coverImage) finalCoverImage = details.coverImage;
          if (!finalPublisher && details.publisher) finalPublisher = details.publisher;
          if ((!finalYear || finalYear === CURRENT_YEAR) && details.year) finalYear = details.year;
          if (!finalDescription && details.description) finalDescription = details.description;
          if (!finalCategory && details.category) finalCategory = details.category;
          if (!finalPageCount && details.pageCount) finalPageCount = details.pageCount;
          if (!finalLanguage && details.language) finalLanguage = details.language;
          if (!finalEdition && details.edition) finalEdition = details.edition;
          if (!finalPhysicalDetails && details.physicalDetails) finalPhysicalDetails = details.physicalDetails;
          if (!finalSourceUrl && details.sourceUrl) finalSourceUrl = details.sourceUrl;
          if (!finalNotes && details.notes) finalNotes = details.notes;
          if (!finalJacketAuthorInfo && details.jacketAuthorInfo) finalJacketAuthorInfo = details.jacketAuthorInfo;
        }
      } catch {
        // Continue with user provided inputs
      }
    }

    if (!finalCoverImage) {
      finalCoverImage = getReliableCoverUrl({ title, author, isbn, year: finalYear });
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
          category: finalCategory,
          year: finalYear,
          publisher: finalPublisher,
          description: finalDescription,
          status,
          location,
          coverImage: finalCoverImage,
          pageCount: finalPageCount,
          language: finalLanguage,
          edition: finalEdition,
          physicalDetails: finalPhysicalDetails,
          sourceUrl: finalSourceUrl,
          notes: finalNotes,
          jacketAuthorInfo: finalJacketAuthorInfo,
        });
        setNotificationMsg(`Kniha "${title}" byla úspěšně upravena.`);
      }
    } else {
      onAddBook({
        title,
        author,
        isbn,
        code,
        category: finalCategory,
        year: finalYear,
        publisher: finalPublisher,
        description: finalDescription,
        status,
        location,
        coverImage: finalCoverImage,
        pageCount: finalPageCount,
        language: finalLanguage,
        edition: finalEdition,
        physicalDetails: finalPhysicalDetails,
        sourceUrl: finalSourceUrl,
        notes: finalNotes,
        jacketAuthorInfo: finalJacketAuthorInfo,
      });
      setNotificationMsg(`Kniha "${title}" byla přidána do databáze s informacemi z Knihovny.cz.`);
    }

    setTimeout(() => setNotificationMsg(null), 5000);
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
      {notificationMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
          <span className="font-medium">{notificationMsg}</span>
        </div>
      )}

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

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {onResetData && (
            <button
              onClick={onResetData}
              title="Obnovit výchozí vzorovou databázi"
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl font-medium text-xs transition border border-slate-300 flex items-center gap-1.5"
            >
              <RefreshCw size={15} />
              <span>Obnovit výchozí data</span>
            </button>
          )}
          <button
            onClick={handleStartAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition shadow-sm flex items-center gap-2"
          >
            <Plus size={18} />
            <span>Přidat novou knihu</span>
          </button>
        </div>
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
              {/* Knihovny.cz auto fetch banner */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3.5 rounded-xl border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-bold text-blue-900 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-blue-600" /> Automatické doplnění z Knihovny.cz
                  </span>
                  <p className="text-slate-600 mt-0.5">
                    Zadejte ISBN nebo název a jedním kliknutím načtěte veškeré údaje, popis i přebal z národní databáze.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleFetchAllFromKnihovny}
                  disabled={isFetchingKnihovnyAll}
                  className="shrink-0 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {isFetchingKnihovnyAll ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <BookOpen size={13} />
                  )}
                  <span>{isFetchingKnihovnyAll ? 'Načítám...' : 'Načíst vše z Knihovny.cz'}</span>
                </button>
              </div>

              {knihovnySuccessNote && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>{knihovnySuccessNote}</span>
                </div>
              )}

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

                {/* Knihovny.cz Extended Fields */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Počet stran (Knihovny.cz)</label>
                  <input
                    type="number"
                    value={pageCount !== undefined ? pageCount : ''}
                    onChange={(e) => setPageCount(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Např. 352"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Jazyk publikace</label>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="Čeština"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Vydání</label>
                  <input
                    type="text"
                    value={edition}
                    onChange={(e) => setEdition(e.target.value)}
                    placeholder="1. vydání"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Fyzický popis / Vazba</label>
                  <input
                    type="text"
                    value={physicalDetails}
                    onChange={(e) => setPhysicalDetails(e.target.value)}
                    placeholder="Vázaná vazba s přebalem, 20 cm"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Odkaz na záznam Knihovny.cz</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      placeholder="https://www.knihovny.cz/Search/Results?..."
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {sourceUrl && (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 border border-slate-200 shrink-0"
                      >
                        <ExternalLink size={13} />
                        <span>Otevřít</span>
                      </a>
                    )}
                  </div>
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
                        <img
                          src={coverImage}
                          alt="Přebal knihy"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget;
                            const fallback = getReliableCoverUrl({ title, author, isbn, year });
                            if (target.src !== fallback) {
                              target.src = fallback;
                            }
                          }}
                        />
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
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Anotace / Popisek (Knihovny.cz)</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailní popis knižního titulu..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Poznámky k fondu / exempláři (Knihovny.cz)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Interní poznámka k exempláři z fondu Knihovny.cz..."
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
                    {(book.pageCount || book.language || book.sourceUrl) && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        {book.pageCount && <span>{book.pageCount} str.</span>}
                        {book.language && <span>• {book.language}</span>}
                        {book.sourceUrl && (
                          <a
                            href={book.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-0.5"
                          >
                            <span>Knihovny.cz</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    )}
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
