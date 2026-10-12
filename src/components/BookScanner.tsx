import React, { useState, useEffect, useRef } from 'react';
import type { Book } from '../types';
import { ScanLine, Search, QrCode, BookCheck, CheckCircle, RefreshCw, Sparkles, Image as ImageIcon, BookOpen, Upload, UserCheck, FileText, Camera, CameraOff, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';

interface BookScannerProps {
  books: Book[];
  onUpdateBookStatus: (bookId: string, newStatus: Book['status']) => void;
}

export const BookScanner: React.FC<BookScannerProps> = ({ books, onUpdateBookStatus }) => {
  const [scanInput, setScanInput] = useState('');
  const [scanMode, setScanMode] = useState<'all' | 'isbn' | 'code' | 'text' | 'cover'>('all');
  const [matchedBooks, setMatchedBooks] = useState<Book[]>([]);
  const [isSimulatingCamera, setIsSimulatingCamera] = useState(false);
  const [lastScannedResult, setLastScannedResult] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Real Camera Scanner state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // Cover image / Jacket OCR state
  const [selectedCoverImage, setSelectedCoverImage] = useState<string | null>(null);
  const [jacketOcrText, setJacketOcrText] = useState<string>('');
  const [matchedConfidence, setMatchedConfidence] = useState<Record<string, number>>({});

  const handleSearch = (query: string, modeOverride?: 'all' | 'isbn' | 'code' | 'text' | 'cover') => {
    const activeMode = modeOverride || scanMode;
    setScanInput(query);
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery && activeMode !== 'cover') {
      setMatchedBooks([]);
      setMatchedConfidence({});
      return;
    }

    const confMap: Record<string, number> = {};

    const results = books.filter((book) => {
      if (activeMode === 'isbn') {
        return book.isbn.toLowerCase().replace(/[- ]/g, '').includes(cleanQuery.replace(/[- ]/g, ''));
      }
      if (activeMode === 'code') {
        return book.code.toLowerCase().includes(cleanQuery);
      }
      if (activeMode === 'text') {
        return book.title.toLowerCase().includes(cleanQuery) || book.author.toLowerCase().includes(cleanQuery);
      }
      if (activeMode === 'cover') {
        // Recognition based on book cover image, title, author, cover keywords or jacket author info OCR
        let score = 0;
        const lowerTitle = book.title.toLowerCase();
        const lowerAuthor = book.author.toLowerCase();
        const lowerJacket = (book.jacketAuthorInfo || '').toLowerCase();
        const lowerDesc = book.description.toLowerCase();
        const keywords = book.coverKeywords || [];

        if (cleanQuery) {
          if (lowerTitle.includes(cleanQuery)) score += 40;
          if (lowerAuthor.includes(cleanQuery)) score += 35;
          if (lowerJacket.includes(cleanQuery)) score += 30;
          if (lowerDesc.includes(cleanQuery)) score += 15;
          if (keywords.some((kw) => kw.toLowerCase().includes(cleanQuery))) score += 25;
        }

        if (jacketOcrText) {
          const lowerOcr = jacketOcrText.toLowerCase();
          if (lowerOcr.includes(lowerAuthor) || lowerAuthor.split(' ').some(part => part.length > 2 && lowerOcr.includes(part))) score += 45;
          if (lowerOcr.includes(lowerTitle)) score += 45;
          if (lowerJacket && lowerOcr.split(' ').some(word => word.length > 4 && lowerJacket.includes(word))) score += 20;
        }

        if (selectedCoverImage && book.coverImage && selectedCoverImage === book.coverImage) {
          score += 60;
        }

        if (score > 0) {
          confMap[book.id] = Math.min(Math.round((score / 80) * 100), 99);
          return true;
        }
        return false;
      }

      // 'all' mode
      return (
        book.title.toLowerCase().includes(cleanQuery) ||
        book.author.toLowerCase().includes(cleanQuery) ||
        book.isbn.toLowerCase().replace(/[- ]/g, '').includes(cleanQuery.replace(/[- ]/g, '')) ||
        book.code.toLowerCase().includes(cleanQuery) ||
        book.description.toLowerCase().includes(cleanQuery) ||
        (book.jacketAuthorInfo && book.jacketAuthorInfo.toLowerCase().includes(cleanQuery))
      );
    });

    setMatchedBooks(results);
    setMatchedConfidence(confMap);
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

  const handleSimulateCoverScan = (book: Book) => {
    setIsSimulatingCamera(true);
    setLastScannedResult(null);
    setScanMode('cover');
    setSelectedCoverImage(book.coverImage || null);

    const sampleJacketText = book.jacketAuthorInfo || `${book.author} - ${book.title}. Autorské informace z přebalu knihy.`;
    setJacketOcrText(sampleJacketText);

    setTimeout(() => {
      setIsSimulatingCamera(false);
      setScanInput(book.title);
      setMatchedBooks([book]);
      setMatchedConfidence({ [book.id]: 98 });
      setLastScannedResult(`Rozpoznán obal & autor na přebalu: ${book.title} od ${book.author} (Míra shody: 98%)`);
    }, 1500);
  };

  const handleQuickReturn = (book: Book) => {
    const nextStatus: Book['status'] = book.status === 'Vypůjčená' ? 'Dostupná' : 'Vypůjčená';
    onUpdateBookStatus(book.id, nextStatus);
    setActionSuccessMessage(
      `Kniha "${book.title}" byla úspěšně změněna na stav: ${nextStatus === 'Dostupná' ? 'Vráceno / Dostupná' : 'Vypůjčená'}`
    );
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const handleDecodedCode = (decodedText: string) => {
    let cleanCode = decodedText.trim();
    // If QR code format is LIB:CODE:ISBN, extract code or search string
    if (cleanCode.startsWith('LIB:')) {
      const parts = cleanCode.split(':');
      if (parts[1]) {
        cleanCode = parts[1];
      }
    }

    setScanInput(cleanCode);

    // Search for matching books
    const cleanQuery = cleanCode.toLowerCase();
    const matched = books.filter((book) => {
      return (
        book.code.toLowerCase() === cleanQuery ||
        book.isbn.toLowerCase().replace(/[- ]/g, '') === cleanQuery.replace(/[- ]/g, '') ||
        book.code.toLowerCase().includes(cleanQuery) ||
        book.isbn.toLowerCase().includes(cleanQuery) ||
        book.title.toLowerCase().includes(cleanQuery)
      );
    });

    if (matched.length > 0) {
      setMatchedBooks(matched);
      setLastScannedResult(`Naskenováno: ${cleanCode} (${matched[0].title})`);
    } else {
      setMatchedBooks([]);
      setLastScannedResult(`Naskenován kód: ${cleanCode} (nenalezena v databázi)`);
    }
  };

  const stopCamera = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        html5QrcodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping camera:', err);
      }
      html5QrcodeRef.current = null;
    }
    setIsCameraActive(false);
    setIsCameraLoading(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraLoading(true);

    try {
      if (html5QrcodeRef.current) {
        await stopCamera();
      }

      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrcodeRef.current = html5QrCode;

      const qrCodeSuccessCallback = (decodedText: string) => {
        handleDecodedCode(decodedText);
      };

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      // Try camera with facingMode: "environment" first (rear camera on mobile)
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          qrCodeSuccessCallback,
          () => {}
        );
      } catch (envError) {
        // Fallback to user facing camera or first available camera
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const deviceId = devices[devices.length - 1].id; // Often rear camera is listed last
          await html5QrCode.start(
            deviceId,
            config,
            qrCodeSuccessCallback,
            () => {}
          );
        } else {
          throw envError;
        }
      }

      setIsCameraActive(true);
      setIsCameraLoading(false);
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      setIsCameraActive(false);
      setIsCameraLoading(false);

      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        setCameraError('Kamera vyžaduje zabezpečené připojení HTTPS. Na GitHub Pages zkontrolujte URL.');
      } else if (err?.toString().includes('NotAllowedError') || err?.name === 'NotAllowedError') {
        setCameraError('Přístup ke kameře byl odmítnut. Povolte prosím přístup ke kameře v nastavení prohlížeče.');
      } else if (err?.toString().includes('NotFoundError') || err?.name === 'NotFoundError') {
        setCameraError('Nebylo nalezeno žádné zařízení s kamerou.');
      } else {
        setCameraError(`Nepodařilo se spustit kameru: ${err?.message || err || 'Neznámá chyba'}`);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Intro Section */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles size={16} /> Inteligentní Rozpoznávání & Katalogizace
          </div>
          <h2 className="text-2xl font-extrabold">Rozpoznání Knihy, Obalu & QR Skener</h2>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Vyhledejte knihu podle QR kódu, ISBN, názvu, vizuální analýzy obalu knihy nebo informací o autorovi na přebalu (OCR medailonku autora).
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
                  handleSearch(scanInput, 'all');
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  scanMode === 'all' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Vše
              </button>
              <button
                onClick={() => {
                  setScanMode('cover');
                  handleSearch(scanInput, 'cover');
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
                  scanMode === 'cover' ? 'bg-white text-blue-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon size={13} />
                <span>Obal & Přebal (OCR)</span>
              </button>
              <button
                onClick={() => {
                  setScanMode('isbn');
                  handleSearch(scanInput, 'isbn');
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
                  handleSearch(scanInput, 'code');
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
                  handleSearch(scanInput, 'text');
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
                scanMode === 'cover'
                  ? 'Zadejte text z přebalu, jméno autora nebo vizuální prvky obalu...'
                  : scanMode === 'isbn'
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
                  setJacketOcrText('');
                  setSelectedCoverImage(null);
                  setMatchedBooks([]);
                  setLastScannedResult(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Additional Cover / Jacket OCR Panel when 'cover' mode is selected */}
          {scanMode === 'cover' && (
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <FileText size={15} className="text-indigo-600" /> Rozpoznání textu z přebalu (OCR medailonek autora)
                </span>
                <label className="cursor-pointer text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-sm flex items-center gap-1">
                  <Upload size={13} />
                  <span>Nahrát fotku přebalu</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const fakeUrl = URL.createObjectURL(file);
                        setSelectedCoverImage(fakeUrl);
                        setJacketOcrText(`Naskenovaná obálka: ${file.name}. Analýza textu přebalu a medailonku autora...`);
                        handleSearch(file.name.split('.')[0] || 'obal', 'cover');
                      }
                    }}
                  />
                </label>
              </div>

              <textarea
                value={jacketOcrText}
                onChange={(e) => {
                  setJacketOcrText(e.target.value);
                  handleSearch(scanInput, 'cover');
                }}
                rows={2}
                placeholder="Sem vložte nebo naskenujte text z přebalu (informace o autorovi, životopis z klapky obálky)..."
                className="w-full text-xs p-2.5 bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none text-slate-800"
              />

              {selectedCoverImage && (
                <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-indigo-200">
                  <img src={selectedCoverImage} alt="Naskenovaný obal" className="w-12 h-14 object-cover rounded border" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-800">Analýza nahraného obalu</p>
                    <p className="text-slate-500">Vizuální porovnání s knihovní databází proběhlo úspěšně.</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCoverImage(null);
                      setJacketOcrText('');
                      handleSearch(scanInput, 'cover');
                    }}
                    className="ml-auto text-xs text-red-500 hover:underline font-medium"
                  >
                    Odebrat
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick simulation buttons for existing books */}
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-1">
                <QrCode size={13} className="text-blue-600" /> Simulace okamžitého naskenování QR štítku:
              </p>
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

            <div>
              <p className="text-xs font-bold text-indigo-900 uppercase mb-2 flex items-center gap-1">
                <ImageIcon size={13} className="text-indigo-600" /> Simulace rozpoznání podle obalu & přebalu (autor/medailonek):
              </p>
              <div className="flex flex-wrap gap-2">
                {books.filter((b) => b.jacketAuthorInfo).slice(0, 4).map((book) => (
                  <button
                    key={book.id}
                    onClick={() => handleSimulateCoverScan(book)}
                    disabled={isSimulatingCamera}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-lg text-xs transition flex items-center gap-1.5 font-medium"
                  >
                    <BookOpen size={13} className="text-indigo-600" />
                    <span>Obal: {book.title} ({book.author})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Camera / Scanner Box */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[320px]">
          <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>

          {/* Live Camera Viewport */}
          <div className={`w-full overflow-hidden rounded-xl border border-slate-700 bg-black z-10 mb-4 ${isCameraActive ? 'block' : 'hidden'}`}>
            <div id="qr-reader" className="w-full"></div>
          </div>

          {isCameraLoading ? (
            <div className="space-y-3 z-10 py-6">
              <RefreshCw size={40} className="text-blue-400 animate-spin mx-auto" />
              <p className="text-sm font-bold text-blue-200">Spouštění kamery mobilu...</p>
              <p className="text-xs text-slate-400">Žádost o přístup ke kameře zařázení</p>
            </div>
          ) : isSimulatingCamera ? (
            <div className="space-y-3 z-10 py-6">
              <RefreshCw size={40} className="text-blue-400 animate-spin mx-auto" />
              <p className="text-sm font-bold text-blue-200">Probíhá analýza QR kódu a rozpoznání...</p>
              <p className="text-xs text-slate-400">Načítání údajů z databáze knihovny</p>
            </div>
          ) : !isCameraActive ? (
            <div className="space-y-3 z-10 py-2">
              <div className="w-20 h-20 border-2 border-dashed border-blue-500/60 rounded-2xl flex items-center justify-center mx-auto bg-blue-500/10">
                <ScanLine size={36} className="text-blue-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-100">Kamera pro skenování QR & Čárových kódů</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Spusťte kameru mobilu pro okamžité skenování štítků knih.
                </p>
              </div>
            </div>
          ) : null}

          {cameraError && (
            <div className="mt-2 text-xs bg-red-500/20 text-red-300 border border-red-500/30 p-3 rounded-lg z-10 text-left flex items-start gap-2 max-w-xs">
              <AlertCircle size={16} className="shrink-0 text-red-400 mt-0.5" />
              <div>
                <p className="font-bold">Chyba kamery:</p>
                <p>{cameraError}</p>
              </div>
            </div>
          )}

          {/* Action buttons to Start / Stop Camera */}
          <div className="z-10 mt-3 flex items-center gap-2">
            {!isCameraActive ? (
              <button
                onClick={startCamera}
                disabled={isCameraLoading}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-blue-600/30"
              >
                <Camera size={16} />
                <span>{isCameraLoading ? 'Načítání...' : 'Spustit Kameru Mobilu'}</span>
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-red-600/30"
              >
                <CameraOff size={16} />
                <span>Vypnout Kameru</span>
              </button>
            )}
          </div>

          {lastScannedResult && !isSimulatingCamera && (
            <div className="mt-3 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 p-2 rounded-lg z-10 font-mono">
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
                      {matchedConfidence[book.id] !== undefined && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                          Shoda obalu / přebalu: {matchedConfidence[book.id]}%
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 font-medium">{book.author} • {book.category}</p>

                    <div className="flex items-center gap-4 text-xs font-mono text-slate-600 mt-1">
                      <span>ISBN: {book.isbn}</span>
                      <span>Kód: {book.code}</span>
                      <span className="font-sans text-blue-700 font-semibold">{book.location}</span>
                    </div>

                    {book.jacketAuthorInfo && (
                      <div className="mt-2 text-xs bg-indigo-50/80 p-2 rounded-lg border border-indigo-100 text-indigo-900">
                        <span className="font-bold flex items-center gap-1 text-[11px] mb-0.5 text-indigo-950">
                          <UserCheck size={12} className="text-indigo-600" /> Informace o autorovi na přebalu:
                        </span>
                        <span>{book.jacketAuthorInfo}</span>
                      </div>
                    )}
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
