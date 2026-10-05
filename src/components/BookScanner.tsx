import React, { useState } from 'react';
import type { Book } from '../types';
import { ScanLine, Search, QrCode, BookCheck, CheckCircle, RefreshCw, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface BookScannerProps {
  books: Book[];
  onUpdateBookStatus: (bookId: string, newStatus: Book['status']) => void;
}

export const BookScanner: React.FC<BookScannerProps> = ({ books, onUpdateBookStatus }) => {
  const [scanInput, setScanInput] = useState('');
  const [scanMode, setScanMode] = useState<'all' | 'isbn' | 'code' | 'text'>('all');
  const [matchedBooks, setMatchedBooks] = useState<Book[]>([]);
  const [isSimulatingCamera, setIsSimulatingCamera] = useState(false);
  const [lastScannedResult, setLastScannedResult] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const handleSearch = (query: string) => {
    setScanInput(query);
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) {
      setMatchedBooks([]);
      return;
    }

    const results = books.filter((book) => {
      if (scanMode === 'isbn') {
        return book.isbn.toLowerCase().replace(/[- ]/g, '').includes(cleanQuery.replace(/[- ]/g, ''));
      }
      if (scanMode === 'code') {
        return book.code.toLowerCase().includes(cleanQuery);
      }
      if (scanMode === 'text') {
        return book.title.toLowerCase().includes(cleanQuery) || book.author.toLowerCase().includes(cleanQuery);
      }
      // 'all' mode
      return (
        book.title.toLowerCase().includes(cleanQuery) ||
        book.author.toLowerCase().includes(cleanQuery) ||
        book.isbn.toLowerCase().replace(/[- ]/g, '').includes(cleanQuery.replace(/[- ]/g, '')) ||
        book.code.toLowerCase().includes(cleanQuery) ||
        book.description.toLowerCase().includes(cleanQuery)
      );
    });

    setMatchedBooks(results);
  };

  const handleSimulateScan = (book: Book) => {
    setIsSimulatingCamera(true);
    setLastScannedResult(null);

    setTimeout(() => {
      setIsSimulatingCamera(false);
      setScanInput(book.code);
      setMatchedBooks([book]);
      setLastScannedResult(`Naskenován QR kód: ${book.code} (${book.title})`);
    }, 1200);
  };

  const handleQuickReturn = (book: Book) => {
    const nextStatus: Book['status'] = book.status === 'Vypůjčená' ? 'Dostupná' : 'Vypůjčená';
    onUpdateBookStatus(book.id, nextStatus);
    setActionSuccessMessage(
      `Kniha "${book.title}" byla úspěšně změněna na stav: ${nextStatus === 'Dostupná' ? 'Vráceno / Dostupná' : 'Vypůjčená'}`
    );
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Intro Section */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles size={16} /> Inteligentní Rozpoznávání & Katalogizace
          </div>
          <h2 className="text-2xl font-extrabold">Rozpoznání Knihy & QR Skener</h2>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Vyhledejte knihu podle libovolného parametru (text, název, ISBN, kód), nebo použijte simulátor optického QR skeneru pro okamžité vrácení či vypůjčení.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
          <ScanLine size={32} className="text-blue-400 animate-pulse" />
          <div className="text-xs">
            <p className="font-bold text-slate-200">Kamera & QR Optika</p>
            <p className="text-slate-400">Příprava skenování...</p>
          </div>
        </div>
      </div>

      {actionSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="text-emerald-600 shrink-0" size={20} />
          <span className="font-medium">{actionSuccessMessage}</span>
        </div>
      )}

      {/* Main Scanner Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Search & Scan Modes */}
        <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Search size={18} className="text-blue-600" /> Vyhledávání & Rozpoznání
            </h3>

            {/* Mode selection */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                onClick={() => {
                  setScanMode('all');
                  if (scanInput) handleSearch(scanInput);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  scanMode === 'all' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Vše
              </button>
              <button
                onClick={() => {
                  setScanMode('isbn');
                  if (scanInput) handleSearch(scanInput);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  scanMode === 'isbn' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ISBN
              </button>
              <button
                onClick={() => {
                  setScanMode('code');
                  if (scanInput) handleSearch(scanInput);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  scanMode === 'code' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kód
              </button>
              <button
                onClick={() => {
                  setScanMode('text');
                  if (scanInput) handleSearch(scanInput);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  scanMode === 'text' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Text / Název
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={scanInput}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={
                scanMode === 'isbn'
                  ? 'Zadejte nebo naskenujte ISBN (např. 978-80-7390-348-1)...'
                  : scanMode === 'code'
                  ? 'Zadejte nebo naskenujte kód knihy (např. LIB-BOZ-001)...'
                  : scanMode === 'text'
                  ? 'Zadejte název knihy nebo autora (např. Babička)...'
                  : 'Napište jakýkoliv údaj, kód, ISBN nebo název knihy...'
              }
              className="w-full bg-slate-50 text-slate-800 pl-4 pr-10 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium transition"
            />
            {scanInput && (
              <button
                onClick={() => {
                  setScanInput('');
                  setMatchedBooks([]);
                  setLastScannedResult(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick simulation buttons for existing books */}
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase mb-2">Simulace okamžitého naskenování QR štítku:</p>
            <div className="flex flex-wrap gap-2">
              {books.slice(0, 4).map((book) => (
                <button
                  key={book.id}
                  onClick={() => handleSimulateScan(book)}
                  disabled={isSimulatingCamera}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 rounded-lg text-xs font-mono transition flex items-center gap-1.5"
                >
                  <QrCode size={13} />
                  <span>{book.code}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Simulated Camera Box */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>

          {isSimulatingCamera ? (
            <div className="space-y-3 z-10 py-6">
              <RefreshCw size={40} className="text-blue-400 animate-spin mx-auto" />
              <p className="text-sm font-bold text-blue-200">Probíhá analýza QR kódu a rozpoznání...</p>
              <p className="text-xs text-slate-400">Načítání údajů z databáze knihovny</p>
            </div>
          ) : (
            <div className="space-y-3 z-10 py-4">
              <div className="w-20 h-20 border-2 border-dashed border-blue-500/60 rounded-2xl flex items-center justify-center mx-auto bg-blue-500/10">
                <ScanLine size={36} className="text-blue-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-100">Kamera pro skenování QR</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Naměřte kameru zařízení na printed QR štítek na hřbetu knížky.
                </p>
              </div>
            </div>
          )}

          {lastScannedResult && !isSimulatingCamera && (
            <div className="mt-2 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 p-2 rounded-lg z-10 font-mono">
              {lastScannedResult}
            </div>
          )}
        </div>
      </div>

      {/* Recognition Results List */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-base">
            Nalezené & Rozpoznané Knihy ({matchedBooks.length})
          </h3>
          {scanInput && (
            <span className="text-xs text-slate-600">
              Dotaz: <span className="font-semibold text-slate-700">"{scanInput}"</span>
            </span>
          )}
        </div>

        {matchedBooks.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-sm">
            {scanInput
              ? 'Pro zadaný požadavek nebyly nalezeny žádné odpovídající knihy.'
              : 'Zadejte dotaz výše nebo naskenujte QR kód pro zobrazení výsledků rozpoznání.'}
          </div>
        ) : (
          <div className="space-y-3">
            {matchedBooks.map((book) => (
              <div
                key={book.id}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-16 bg-slate-200 rounded-lg overflow-hidden shrink-0 border border-slate-300">
                    {book.coverImage ? (
                      <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <BookCheck size={20} />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">{book.title}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          book.status === 'Dostupná'
                            ? 'bg-emerald-100 text-emerald-800'
                            : book.status === 'Vypůjčená'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {book.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-medium">{book.author} • {book.category}</p>

                    <div className="flex items-center gap-4 text-xs font-mono text-slate-600 mt-1">
                      <span>ISBN: {book.isbn}</span>
                      <span>Kód: {book.code}</span>
                      <span className="font-sans text-blue-700 font-semibold">{book.location}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Return Action Button */}
                <div className="shrink-0 flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
                  <QRCodeSVG value={`LIB:${book.code}:${book.isbn}`} size={42} />

                  <button
                    onClick={() => handleQuickReturn(book)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm ${
                      book.status === 'Vypůjčená'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    <BookCheck size={16} />
                    <span>{book.status === 'Vypůjčená' ? 'Provést Vrácení Knihy' : 'Označit jako Vypůjčenou'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
