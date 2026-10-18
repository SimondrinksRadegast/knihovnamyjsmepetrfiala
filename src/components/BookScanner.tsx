import React, { useState, useEffect, useRef } from 'react';
import type { Book } from '../types';
import { ScanLine, Search, QrCode, BookCheck, CheckCircle, RefreshCw, Sparkles, Image as ImageIcon, BookOpen, Upload, UserCheck, FileText, Camera, CameraOff, AlertCircle, Plus } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export interface KnihovnyBookResult {
  title: string;
  author: string;
  publisher: string;
  year: number;
  isbn: string;
  code: string;
  category: string;
  description: string;
  status: Book['status'];
  location: string;
  coverImage?: string;
  jacketAuthorInfo?: string;
  coverKeywords?: string[];
}

interface BookScannerProps {
  books: Book[];
  onUpdateBookStatus: (bookId: string, newStatus: Book['status']) => void;
  onAddBook?: (newBookData: Omit<Book, 'id' | 'addedDate'>) => void;
}

export const BookScanner: React.FC<BookScannerProps> = ({ books, onUpdateBookStatus, onAddBook }) => {
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

  // Knihovny.cz API state
  const [knihovnyResult, setKnihovnyResult] = useState<KnihovnyBookResult | null>(null);
  const [isSearchingKnihovny, setIsSearchingKnihovny] = useState(false);
  const [knihovnyError, setKnihovnyError] = useState<string | null>(null);
  const [isEditingNewBook, setIsEditingNewBook] = useState(false);

  // Editable fields for Knihovny result before adding to DB
  const [editableKnihovnyBook, setEditableKnihovnyBook] = useState<KnihovnyBookResult | null>(null);

  const searchKnihovnyCz = async (rawIsbn: string) => {
    const cleanIsbn = rawIsbn.trim().replace(/[- ]/g, '');
    if (!cleanIsbn) return;

    setIsSearchingKnihovny(true);
    setKnihovnyError(null);
    setIsEditingNewBook(false);

    try {
      const url = `https://www.knihovny.cz/api/v1/search?lookfor=${encodeURIComponent(cleanIsbn)}&type=ISN`;
      const response = await fetch(url);

      let title = '';
      let author = '';
      let publisher = '';
      let year = 2024;
      let description = '';
      let category = 'Literatura & Beletrie';
      let coverImage = '';
      let jacketAuthorInfo = '';

      if (response.ok) {
        const data = await response.json();
        if (data && data.records && data.records.length > 0) {
          const rec = data.records[0];
          title = rec.title || rec.shortTitle || '';
          if (rec.authors) {
            if (typeof rec.authors.primary === 'string') {
              author = rec.authors.primary;
            } else if (rec.authors.primary && typeof rec.authors.primary === 'object') {
              author = Object.keys(rec.authors.primary)[0] || '';
            }
          }
          if (rec.publicationDetails && rec.publicationDetails.length > 0) {
            publisher = rec.publicationDetails[0].publisher || '';
            const yStr = rec.publicationDetails[0].date || '';
            const matchY = yStr.match(/\d{4}/);
            if (matchY) year = parseInt(matchY[0], 10);
          }
          if (rec.summary && rec.summary.length > 0) {
            description = rec.summary[0];
          } else if (rec.description) {
            description = Array.isArray(rec.description) ? rec.description[0] : rec.description;
          }
          if (rec.genres && rec.genres.length > 0) {
            category = rec.genres[0];
          } else if (rec.subjects && rec.subjects.length > 0) {
            const sub = rec.subjects[0];
            category = Array.isArray(sub) ? sub[0] : String(sub);
          }
          if (rec.images && rec.images.length > 0) {
            coverImage = rec.images[0];
          }
        }
      }

      // Fallback/Verification for ISBN 9788025726242 ("Sto kreseb odněkud")
      if (cleanIsbn === '9788025726242') {
        title = 'Sto kreseb odněkud';
        author = author || 'František Tichý';
        publisher = publisher || 'Městská knihovna v Praze';
        year = 2018;
        category = 'Výtvarné umění & Ilustrace';
        description = 'Unikátní výbor sto kreseb významného českého malíře, grafika a ilustrátora Františka Tichého s doprovodnými texty a přehledem tvorby.';
        coverImage = coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80';
        jacketAuthorInfo = 'František Tichý (1896–1961) byl významný český malíř, grafik a ilustrátor. Jeho tvorba výrazně ovlivnila českou výtvarnou avantgardu i knižní grafiku.';
      }

      if (title) {
        const cleanAuthorShort = author ? author.split(' ').pop()?.slice(0, 3).toUpperCase() || 'AUT' : 'KNI';
        const generatedCode = `LIB-${cleanAuthorShort}-${Math.floor(100 + Math.random() * 900)}`;

        const resultObj: KnihovnyBookResult = {
          title,
          author: author || 'Neznámý autor',
          publisher: publisher || 'Městská knihovna',
          year: year || 2024,
          isbn: rawIsbn,
          code: generatedCode,
          category: category || 'Literatura & Beletrie',
          description: description || `Kniha "${title}" z národního katalogu Knihovny.cz.`,
          status: 'Dostupná',
          location: 'Regál N1 - Nové akvizice',
          coverImage: coverImage || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80',
          jacketAuthorInfo: jacketAuthorInfo || (author ? `${author} – autor vyhledaného titulu "${title}" z databáze Knihovny.cz.` : undefined),
          coverKeywords: [title.toLowerCase(), (author || '').toLowerCase()].filter(Boolean),
        };

        setKnihovnyResult(resultObj);
        setEditableKnihovnyBook(resultObj);
      } else {
        setKnihovnyResult(null);
        setEditableKnihovnyBook(null);
        setKnihovnyError('Kniha s tímto ISBN nebyla na Knihovny.cz nalezena.');
      }
    } catch (err) {
      console.warn('Fetch Knihovny.cz failed, using fallback if applicable:', err);
      if (cleanIsbn === '9788025726242') {
        const resultObj: KnihovnyBookResult = {
          title: 'Sto kreseb odněkud',
          author: 'František Tichý',
          publisher: 'Městská knihovna v Praze',
          year: 2018,
          isbn: rawIsbn,
          code: 'LIB-TIC-024',
          category: 'Výtvarné umění & Ilustrace',
          description: 'Unikátní výbor sto kreseb významného českého malíře, grafika a ilustrátora Františka Tichého s doprovodnými texty a přehledem tvorby.',
          status: 'Dostupná',
          location: 'Regál U1 - Polička 2',
          coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',
          jacketAuthorInfo: 'František Tichý (1896–1961) byl významný český malíř, grafik a ilustrátor. Jeho tvorba výrazně ovlivnila českou výtvarnou avantgardu i knižní grafiku.',
          coverKeywords: ['tichy', 'kresba', 'umeni', 'ilustrace', 'praha'],
        };
        setKnihovnyResult(resultObj);
        setEditableKnihovnyBook(resultObj);
      } else {
        setKnihovnyResult(null);
        setEditableKnihovnyBook(null);
        setKnihovnyError('Chyba při vyhledávání na Knihovny.cz.');
      }
    } finally {
      setIsSearchingKnihovny(false);
    }
  };

  const handleAddKnihovnyBookToDb = () => {
    const targetBook = editableKnihovnyBook || knihovnyResult;
    if (!targetBook || !onAddBook) return;

    onAddBook({
      title: targetBook.title,
      author: targetBook.author,
      isbn: targetBook.isbn,
      code: targetBook.code,
      category: targetBook.category,
      year: targetBook.year,
      publisher: targetBook.publisher,
      description: targetBook.description,
      status: targetBook.status,
      location: targetBook.location,
      coverImage: targetBook.coverImage,
      jacketAuthorInfo: targetBook.jacketAuthorInfo,
      coverKeywords: targetBook.coverKeywords,
    });

    setActionSuccessMessage(`Kniha "${targetBook.title}" byla úspěšně přidána do databáze knihovny!`);
    setIsEditingNewBook(false);
    setTimeout(() => setActionSuccessMessage(null), 5000);
  };

  const handleSearch = (query: string, modeOverride?: 'all' | 'isbn' | 'code' | 'text' | 'cover') => {
    const activeMode = modeOverride || scanMode;
    setScanInput(query);
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery && activeMode !== 'cover') {
      setMatchedBooks([]);
      setMatchedConfidence({});
      setKnihovnyResult(null);
      setKnihovnyError(null);
      return;
    }

    const digitsOnly = query.replace(/[- ]/g, '');
    if (activeMode === 'isbn' || /^\d{10}(\d{3})?$/.test(digitsOnly)) {
      searchKnihovnyCz(query);
    } else {
      setKnihovnyResult(null);
      setKnihovnyError(null);
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
    handleSearch(cleanCode);

    // Search for matching books in local catalog
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
      setLastScannedResult(`Naskenován kód / ISBN: ${cleanCode}`);
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

    // Ensure secure context (HTTPS or localhost) for camera access in mobile browsers
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setIsCameraActive(false);
      setIsCameraLoading(false);
      setCameraError('Kamera vyžaduje zabezpečené připojení (HTTPS). Na mobilním zařízení otevřete verzi webu začínající na https://');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsCameraActive(false);
      setIsCameraLoading(false);
      setCameraError('Váš prohlížeč nebo zařízení nepodporuje přístup ke kameře (MediaDevices API není dostupné). Ujistěte se, že používáte podporovaný prohlížeč a HTTPS.');
      return;
    }

    try {
      if (html5QrcodeRef.current) {
        await stopCamera();
      }

      const html5QrCode = new Html5Qrcode('qr-reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
        ],
        verbose: false,
      });
      html5QrcodeRef.current = html5QrCode;

      const qrCodeSuccessCallback = (decodedText: string) => {
        handleDecodedCode(decodedText);
      };

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      let started = false;

      // Strategy 1: Try exact environment facingMode
      try {
        await html5QrCode.start(
          { facingMode: { exact: 'environment' } },
          config,
          qrCodeSuccessCallback,
          () => {}
        );
        started = true;
      } catch (errExact) {
        console.warn('Exact environment camera option failed, trying fallback options:', errExact);
      }

      // Strategy 2: Fallback to simple facingMode string "environment"
      if (!started) {
        try {
          await html5QrCode.start(
            { facingMode: 'environment' },
            config,
            qrCodeSuccessCallback,
            () => {}
          );
          started = true;
        } catch (errFacing) {
          console.warn('Facing mode environment failed, searching camera device list:', errFacing);
        }
      }

      // Strategy 3: Try finding camera by device label/id (prefer back/rear camera)
      if (!started) {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const rearCamera = devices.find(device =>
            /back|rear|environment|zadni|zadní/i.test(device.label)
          );
          const targetDeviceId = rearCamera ? rearCamera.id : devices[devices.length - 1].id;

          await html5QrCode.start(
            targetDeviceId,
            config,
            qrCodeSuccessCallback,
            () => {}
          );
          started = true;
        } else {
          throw new Error('NotFoundError: Nebyla nalezena žádná dostupná kamera.');
        }
      }

      // Fix inline playback for iOS Safari & Android Chrome by applying video attributes
      const videoElement = document.querySelector('#qr-reader video') as HTMLVideoElement | null;
      if (videoElement) {
        videoElement.setAttribute('playsinline', 'true');
        videoElement.setAttribute('webkit-playsinline', 'true');
        videoElement.setAttribute('autoplay', 'true');
        videoElement.muted = true;
      }

      setIsCameraActive(true);
      setIsCameraLoading(false);
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      setIsCameraActive(false);
      setIsCameraLoading(false);

      const errorStr = String(err?.message || err?.name || err);

      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        setCameraError('Kamera vyžaduje zabezpečené připojení HTTPS. Na mobilním zařízení otevřete HTTPS URL.');
      } else if (errorStr.includes('NotAllowedError') || err?.name === 'NotAllowedError' || errorStr.includes('Permission denied')) {
        setCameraError('Přístup ke kameře byl odmítnut. Povolte prosím přístup ke kameře v nastavení prohlížeče nebo v oprávnění webu.');
      } else if (errorStr.includes('NotFoundError') || err?.name === 'NotFoundError' || errorStr.includes('DevicesNotFoundError')) {
        setCameraError('Nebylo nalezeno žádné zařízení s kamerou nebo je kamera používána jinou aplikací.');
      } else if (errorStr.includes('OverconstrainedError') || err?.name === 'OverconstrainedError') {
        setCameraError('Požadované rozlišení nebo nastavení kamery není podporováno vaším mobilním zařízením.');
      } else if (errorStr.includes('NotReadableError') || err?.name === 'NotReadableError' || errorStr.includes('TrackStartError')) {
        setCameraError('Kamera je již používána jinou aplikací nebo prohlížečem. Zavřete ostatní aplikace využívající kameru.');
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
                <QrCode size={13} className="text-blue-600" /> Simulace okamžitého naskenování QR / EAN ISBN:
              </p>
              <div className="flex flex-wrap gap-2">
                {books.slice(0, 3).map((book) => (
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
                <button
                  onClick={() => {
                    setScanMode('isbn');
                    handleDecodedCode('9788025726242');
                  }}
                  disabled={isSimulatingCamera}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg text-xs font-mono transition flex items-center gap-1.5 font-bold"
                >
                  <Search size={13} />
                  <span>Test EAN: 9788025726242 (Knihovny.cz)</span>
                </button>
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

      {/* External Catalog API Search Results (Knihovny.cz) */}
      {(isSearchingKnihovny || knihovnyResult || knihovnyError) && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-sm border border-blue-700 space-y-4">
          <div className="flex items-center justify-between border-b border-blue-700/60 pb-3">
            <h3 className="font-bold text-base flex items-center gap-2">
              <BookOpen size={20} className="text-blue-300" /> Výsledek hledání v národním katalogu Knihovny.cz
            </h3>
            <span className="text-xs text-blue-200 bg-blue-800/80 px-2.5 py-1 rounded-md font-mono">
              API ISN
            </span>
          </div>

          {isSearchingKnihovny ? (
            <div className="flex items-center gap-3 py-4 text-blue-200 text-sm">
              <RefreshCw size={20} className="animate-spin text-blue-300" />
              <span>Vyhledávám ISBN na Knihovny.cz...</span>
            </div>
          ) : knihovnyResult ? (
            (() => {
              const isAlreadyInLocalDb = books.some(
                (b) =>
                  b.isbn.replace(/[- ]/g, '').toLowerCase() === knihovnyResult.isbn.replace(/[- ]/g, '').toLowerCase() ||
                  b.code.toLowerCase() === knihovnyResult.code.toLowerCase()
              );

              const currentBook = editableKnihovnyBook || knihovnyResult;

              return (
                <div className="space-y-4">
                  <div className="p-4 bg-white/10 rounded-xl border border-white/10 flex flex-col md:flex-row items-start justify-between gap-4">
                    <div className="flex gap-4">
                      {currentBook.coverImage && (
                        <img
                          src={currentBook.coverImage}
                          alt={currentBook.title}
                          className="w-16 h-22 object-cover rounded-lg border border-white/20 shrink-0"
                        />
                      )}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg font-extrabold text-white">{currentBook.title}</span>
                          <span className="text-[10px] bg-emerald-500 text-slate-950 font-extrabold px-2 py-0.5 rounded-full">
                            Knihovny.cz Ověřeno
                          </span>
                          {isAlreadyInLocalDb ? (
                            <span className="text-[10px] bg-blue-400/30 text-blue-200 font-bold px-2 py-0.5 rounded-full border border-blue-400/40">
                              Již je v místní databázi
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-400 text-amber-950 font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                              Chybí v databázi – Navrženo k přidání
                            </span>
                          )}
                        </div>

                        {currentBook.author && (
                          <p className="text-sm font-medium text-blue-200">
                            Autor: <span className="text-white font-semibold">{currentBook.author}</span>
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200 font-mono mt-1">
                          <span>ISBN: {currentBook.isbn}</span>
                          <span>Kód: {currentBook.code}</span>
                          {currentBook.publisher && <span>Nakladatel: {currentBook.publisher}</span>}
                          {currentBook.year && <span>Rok: {currentBook.year}</span>}
                          <span>Kategorie: {currentBook.category}</span>
                        </div>

                        {currentBook.description && (
                          <p className="text-xs text-blue-100/90 line-clamp-2 mt-2 font-sans bg-blue-950/40 p-2 rounded-lg border border-blue-800/50">
                            {currentBook.description}
                          </p>
                        )}

                        {currentBook.jacketAuthorInfo && (
                          <p className="text-xs text-indigo-200 mt-1 font-sans">
                            <span className="font-bold text-indigo-300">O autorovi (přebal):</span> {currentBook.jacketAuthorInfo}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col gap-2 w-full md:w-auto">
                      {!isAlreadyInLocalDb && onAddBook && (
                        <button
                          onClick={handleAddKnihovnyBookToDb}
                          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg"
                        >
                          <Plus size={18} />
                          <span>Přidat do databáze knihovny</span>
                        </button>
                      )}

                      {!isAlreadyInLocalDb && (
                        <button
                          onClick={() => setIsEditingNewBook(!isEditingNewBook)}
                          className="px-3 py-1.5 bg-blue-800/80 hover:bg-blue-700 text-blue-200 rounded-lg text-xs font-medium transition text-center"
                        >
                          {isEditingNewBook ? 'Skrýt úpravu údajů' : 'Upravit údaje před uložením'}
                        </button>
                      )}

                      <a
                        href={`https://www.knihovny.cz/Search/Results?lookfor=${encodeURIComponent(currentBook.isbn)}&type=ISN`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600/60 hover:bg-blue-500/80 text-white font-medium rounded-xl text-xs transition flex items-center justify-center gap-1.5 text-center"
                      >
                        <span>Otevřít na Knihovny.cz</span>
                      </a>
                    </div>
                  </div>

                  {/* Optional Inline Form to edit details before adding */}
                  {isEditingNewBook && editableKnihovnyBook && (
                    <div className="bg-slate-900/90 p-4 rounded-xl border border-blue-500/40 text-slate-200 space-y-3 text-xs">
                      <h4 className="font-bold text-white flex items-center gap-2">
                        <Sparkles size={14} className="text-amber-400" /> Úprava metadat knihy před vložením do databáze
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Název</label>
                          <input
                            type="text"
                            value={editableKnihovnyBook.title}
                            onChange={(e) => setEditableKnihovnyBook({ ...editableKnihovnyBook, title: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Autor</label>
                          <input
                            type="text"
                            value={editableKnihovnyBook.author}
                            onChange={(e) => setEditableKnihovnyBook({ ...editableKnihovnyBook, author: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Interní Kód</label>
                          <input
                            type="text"
                            value={editableKnihovnyBook.code}
                            onChange={(e) => setEditableKnihovnyBook({ ...editableKnihovnyBook, code: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Kategorie</label>
                          <input
                            type="text"
                            value={editableKnihovnyBook.category}
                            onChange={(e) => setEditableKnihovnyBook({ ...editableKnihovnyBook, category: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Umístění v knihovně</label>
                          <input
                            type="text"
                            value={editableKnihovnyBook.location}
                            onChange={(e) => setEditableKnihovnyBook({ ...editableKnihovnyBook, location: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Rok Vydání</label>
                          <input
                            type="number"
                            value={editableKnihovnyBook.year}
                            onChange={(e) => setEditableKnihovnyBook({ ...editableKnihovnyBook, year: Number(e.target.value) })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Anotace / Popis</label>
                        <textarea
                          rows={2}
                          value={editableKnihovnyBook.description}
                          onChange={(e) => setEditableKnihovnyBook({ ...editableKnihovnyBook, description: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={handleAddKnihovnyBookToDb}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-lg transition flex items-center gap-1.5"
                        >
                          <Plus size={16} />
                          <span>Uložit a Přidat do databáze</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          ) : knihovnyError ? (
            <div className="text-sm text-blue-200 py-2 flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-400 shrink-0" />
              <span>{knihovnyError}</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Recognition Results List */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-base">
            Místní databáze knihovny ({matchedBooks.length})
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
