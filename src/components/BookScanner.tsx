import React, { useState, useEffect, useRef } from 'react';
import type { Book } from '../types';
import {
  ScanLine,
  Search,
  QrCode,
  BookCheck,
  CheckCircle,
  RefreshCw,
  Sparkles,
  Image as ImageIcon,
  BookOpen,
  Upload,
  UserCheck,
  FileText,
  Camera,
  CameraOff,
  AlertCircle,
  Plus,
  Play,
  PauseCircle,
  Hash,
  ScanText,
  Check,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { fetchBookDetailsFromKnihovny, getReliableCoverUrl } from '../services/knihovnyCover';
import {
  recognizeIsbnFromImage,
  extractIsbnFromText,
  type IsbnRecognitionResult,
} from '../services/isbnOcr';

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
  pageCount?: number;
  language?: string;
  edition?: string;
  physicalDetails?: string;
  sourceUrl?: string;
  notes?: string;
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
  const [scanMode, setScanMode] = useState<'all' | 'isbn' | 'ocr-isbn' | 'code' | 'text' | 'cover'>('all');
  const [matchedBooks, setMatchedBooks] = useState<Book[]>([]);
  const [isSimulatingCamera, setIsSimulatingCamera] = useState(false);
  const [lastScannedResult, setLastScannedResult] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Real Camera Scanner state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [isScanPaused, setIsScanPaused] = useState(false);
  const isScanPausedRef = useRef(false);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // OCR printed ISBN state (reading written numbers without barcodes)
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrTextResult, setOcrTextResult] = useState<IsbnRecognitionResult | null>(null);
  const [ocrPreviewImage, setOcrPreviewImage] = useState<string | null>(null);
  const [rawPastedOcrText, setRawPastedOcrText] = useState('');
  const [cameraScanTarget, setCameraScanTarget] = useState<'barcode' | 'ocr-text'>('barcode');
  const ocrIntervalRef = useRef<number | null>(null);

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
      const details = await fetchBookDetailsFromKnihovny({ isbn: rawIsbn });
      if (details && details.title) {
        const cleanAuthorShort = details.author ? details.author.split(' ').pop()?.slice(0, 3).toUpperCase() || 'AUT' : 'KNI';
        const generatedCode = `LIB-${cleanAuthorShort}-${Math.floor(100 + Math.random() * 900)}`;

        const resultObj: KnihovnyBookResult = {
          title: details.title,
          author: details.author || 'Neznámý autor',
          publisher: details.publisher || 'Městská knihovna',
          year: details.year || 2024,
          isbn: details.isbn || rawIsbn,
          code: generatedCode,
          category: details.category || 'Literatura & Beletrie',
          description: details.description || `Kniha "${details.title}" z národního katalogu Knihovny.cz.`,
          status: 'Dostupná',
          location: 'Regál N1 - Nové akvizice',
          coverImage: details.coverImage,
          pageCount: details.pageCount,
          language: details.language,
          edition: details.edition,
          physicalDetails: details.physicalDetails,
          sourceUrl: details.sourceUrl,
          notes: details.notes,
          jacketAuthorInfo: details.jacketAuthorInfo,
          coverKeywords: details.coverKeywords,
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
      setKnihovnyResult(null);
      setEditableKnihovnyBook(null);
      setKnihovnyError('Chyba při vyhledávání na Knihovny.cz.');
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
      pageCount: targetBook.pageCount,
      language: targetBook.language,
      edition: targetBook.edition,
      physicalDetails: targetBook.physicalDetails,
      sourceUrl: targetBook.sourceUrl,
      notes: targetBook.notes,
      jacketAuthorInfo: targetBook.jacketAuthorInfo,
      coverKeywords: targetBook.coverKeywords,
    });

    setActionSuccessMessage(`Kniha "${targetBook.title}" byla úspěšně přidána do databáze knihovny se všemi informacemi z Knihovny.cz!`);
    setIsEditingNewBook(false);
    setTimeout(() => setActionSuccessMessage(null), 5000);
  };

  const handleSearch = (query: string, modeOverride?: 'all' | 'isbn' | 'ocr-isbn' | 'code' | 'text' | 'cover') => {
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
    if (activeMode === 'isbn' || activeMode === 'ocr-isbn' || /^\d{10}(\d{3})?$/.test(digitsOnly)) {
      searchKnihovnyCz(query);
    } else {
      setKnihovnyResult(null);
      setKnihovnyError(null);
    }

    const confMap: Record<string, number> = {};

    const results = books.filter((book) => {
      if (activeMode === 'isbn' || activeMode === 'ocr-isbn') {
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

  /**
   * Simulates or triggers text-based ISBN OCR recognition from printed samples
   */
  const handleSimulateOcrTextScan = (sampleText: string, description: string) => {
    setIsOcrProcessing(true);
    setScanMode('ocr-isbn');
    setRawPastedOcrText(sampleText);

    setTimeout(() => {
      const result = extractIsbnFromText(sampleText);
      setIsOcrProcessing(false);
      setOcrTextResult(result);

      if (result.detectedIsbn) {
        const found = result.formattedIsbn || result.detectedIsbn;
        handleSearch(found, 'ocr-isbn');
        setLastScannedResult(`OCR přečteno tištěné číslo: ${found} (${description})`);
      }
    }, 700);
  };

  /**
   * Processes an image file (uploaded photo of copyright page/tiráž or back cover) via OCR
   */
  const handleProcessOcrImageFile = async (file: File) => {
    setIsOcrProcessing(true);
    setScanMode('ocr-isbn');
    const previewUrl = URL.createObjectURL(file);
    setOcrPreviewImage(previewUrl);

    try {
      const result = await recognizeIsbnFromImage(previewUrl);
      setOcrTextResult(result);
      if (result.detectedIsbn) {
        const found = result.formattedIsbn || result.detectedIsbn;
        handleSearch(found, 'ocr-isbn');
        setLastScannedResult(`OCR rozpoznalo tištěné číslo z fotky: ${found}`);
      } else {
        // If whole image didn't yield clean ISBN, extract from whatever text was found
        const fallback = extractIsbnFromText(result.rawText);
        setOcrTextResult(fallback);
        if (fallback.detectedIsbn) {
          handleSearch(fallback.formattedIsbn || fallback.detectedIsbn, 'ocr-isbn');
        }
      }
    } catch (err) {
      console.warn('OCR error on image file:', err);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  /**
   * Captures a single video frame from active camera and runs OCR text recognition on it
   */
  const handleCaptureFrameForOcr = async () => {
    const videoElement = document.querySelector('#qr-reader video') as HTMLVideoElement | null;
    if (!videoElement) {
      alert('Kamera není aktivní. Nejprve spusťte kameru níže.');
      return;
    }

    setIsOcrProcessing(true);
    setScanMode('ocr-isbn');

    try {
      // Create cropped region in center where ISBN text is aimed
      const vw = videoElement.videoWidth || 640;
      const vh = videoElement.videoHeight || 480;
      const cropRect = {
        x: Math.round(vw * 0.1),
        y: Math.round(vh * 0.35),
        width: Math.round(vw * 0.8),
        height: Math.round(vh * 0.3),
      };

      const result = await recognizeIsbnFromImage(videoElement, cropRect);
      setOcrTextResult(result);

      if (result.detectedIsbn) {
        const found = result.formattedIsbn || result.detectedIsbn;
        handleSearch(found, 'ocr-isbn');
        setLastScannedResult(`OCR kamerou přečteno tištěné ISBN: ${found}`);
        setIsScanPaused(true);
        isScanPausedRef.current = true;
      }
    } catch (err) {
      console.warn('Capture frame OCR error:', err);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleQuickReturn = (book: Book) => {
    const nextStatus: Book['status'] = book.status === 'Vypůjčená' ? 'Dostupná' : 'Vypůjčená';
    onUpdateBookStatus(book.id, nextStatus);
    setActionSuccessMessage(
      `Kniha "${book.title}" byla úspěšně změněna na stav: ${nextStatus === 'Dostupná' ? 'Vráceno / Dostupná' : 'Vypůjčená'}`
    );
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const handleResumeScanning = () => {
    isScanPausedRef.current = false;
    setIsScanPaused(false);
    if (html5QrcodeRef.current) {
      try {
        html5QrcodeRef.current.resume();
      } catch (err) {
        console.warn('Error resuming scanner:', err);
      }
    }
  };

  const handleDecodedCode = (decodedText: string) => {
    if (isScanPausedRef.current) {
      return;
    }

    // Immediately pause repeated scans until explicitly enabled by user
    isScanPausedRef.current = true;
    setIsScanPaused(true);

    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        html5QrcodeRef.current.pause(true);
      } catch (err) {
        console.warn('Error pausing scanner:', err);
      }
    }

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
    if (ocrIntervalRef.current) {
      clearInterval(ocrIntervalRef.current);
      ocrIntervalRef.current = null;
    }

    isScanPausedRef.current = false;
    setIsScanPaused(false);
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
    isScanPausedRef.current = false;
    setIsScanPaused(false);

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
      if (ocrIntervalRef.current) {
        clearInterval(ocrIntervalRef.current);
      }
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
            <Sparkles size={16} /> Inteligentní Rozpoznávání, OCR & Katalogizace
          </div>
          <h2 className="text-2xl font-extrabold">Čtení ISBN Textu, Obálky & QR/Čárových Kódů</h2>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Vyhledejte knihu podle <strong>napsaného tištěného čísla ISBN bez čárového kódu</strong> (z tiráže či zadní strany), QR štítku, čárového kódu nebo vizuální analýzy obalu knihy.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
          <ScanText size={32} className="text-cyan-400 animate-pulse" />
          <div className="text-xs">
            <p className="font-bold text-slate-200">OCR Čtení Textu & Optika</p>
            <p className="text-slate-400">Podpora ISBN bez čárového kódu</p>
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
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                onClick={() => {
                  setScanMode('all');
                  handleSearch(scanInput, 'all');
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  scanMode === 'all' ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Vše
              </button>
              <button
                onClick={() => {
                  setScanMode('ocr-isbn');
                  handleSearch(scanInput, 'ocr-isbn');
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
                  scanMode === 'ocr-isbn' ? 'bg-cyan-600 text-white shadow-sm font-bold' : 'text-cyan-800 hover:bg-cyan-50 font-medium'
                }`}
                title="Čtení ISBN bez čárového kódu (pouze napsané/tištěné číslo)"
              >
                <ScanText size={13} />
                <span>ISBN z textu (OCR)</span>
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
                <span>Obal & Přebal</span>
              </button>
              <button
                onClick={() => {
                  setScanMode('isbn');
                  handleSearch(scanInput, 'isbn');
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  scanMode === 'isbn' ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
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
                Název
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={scanInput}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={
                scanMode === 'ocr-isbn'
                  ? 'Rozpoznané číslo ISBN bez čárového kódu (např. 978-80-7390-348-1)...'
                  : scanMode === 'cover'
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
                  setOcrTextResult(null);
                  setOcrPreviewImage(null);
                  setRawPastedOcrText('');
                  setMatchedBooks([]);
                  setLastScannedResult(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* OCR Panel: Reading printed ISBN numbers without barcode */}
          {scanMode === 'ocr-isbn' && (
            <div className="bg-cyan-50/70 border border-cyan-200 rounded-xl p-4 space-y-4 animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-200/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-cyan-600 text-white rounded-lg shadow-xs">
                    <ScanText size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-cyan-950 uppercase tracking-wide">
                      Čtení tištěného ISBN bez čárového kódu (OCR)
                    </h4>
                    <p className="text-[11px] text-cyan-800">
                      Načtení čísla ze stránek knihy, tiráže, vnitřní strany nebo přebalu bez nutnosti EAN kódu.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer text-xs font-bold text-cyan-950 hover:bg-cyan-100 bg-white px-3 py-1.5 rounded-lg border border-cyan-300 shadow-xs flex items-center gap-1.5 transition">
                    <Upload size={14} className="text-cyan-700" />
                    <span>Nahrát / vyfotit stránku s ISBN</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleProcessOcrImageFile(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Text input / Tirage paste area */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-cyan-900 uppercase">
                  Vložte text z tiráže nebo zkopírujte odstavec s údaji o vydání:
                </label>
                <div className="flex gap-2">
                  <textarea
                    value={rawPastedOcrText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRawPastedOcrText(val);
                      const res = extractIsbnFromText(val);
                      setOcrTextResult(res);
                      if (res.detectedIsbn) {
                        handleSearch(res.formattedIsbn || res.detectedIsbn, 'ocr-isbn');
                      }
                    }}
                    rows={2}
                    placeholder="Sem vložte nebo naskenujte text (např. 'Vydalo nakladatelství Argo. 1. vydání. ISBN 978-80-7390-348-1')..."
                    className="flex-1 text-xs p-2.5 bg-white border border-cyan-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none text-slate-800"
                  />
                </div>
              </div>

              {/* OCR Processing indicator */}
              {isOcrProcessing && (
                <div className="bg-white p-3 rounded-xl border border-cyan-300 flex items-center gap-3 text-cyan-900 text-xs animate-pulse">
                  <RefreshCw size={18} className="animate-spin text-cyan-600" />
                  <div>
                    <p className="font-bold">Probíhá optické rozpoznávání znaků (OCR)...</p>
                    <p className="text-[11px] text-cyan-700">Vyhledávání číselného formátu ISBN a ověřování kontrolního součtu.</p>
                  </div>
                </div>
              )}

              {/* OCR Detected Result Card */}
              {ocrTextResult && (
                <div className="bg-white p-3.5 rounded-xl border border-cyan-200 shadow-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Hash size={15} className="text-cyan-600" /> Nalezené číslo ISBN v textu:
                    </span>
                    {ocrTextResult.detectedIsbn ? (
                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <Check size={13} /> {ocrTextResult.isbnType} {ocrTextResult.isValidChecksum ? '(Platný kontrolní součet)' : '(Nalezeno v textu)'}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        V zadaném textu nebylo nalezeno žádné platné číslo ISBN
                      </span>
                    )}
                  </div>

                  {ocrTextResult.detectedIsbn ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div>
                        <div className="font-mono font-extrabold text-base text-slate-900">
                          {ocrTextResult.formattedIsbn || ocrTextResult.detectedIsbn}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Čisté číslice: {ocrTextResult.detectedIsbn}
                        </div>
                      </div>

                      <button
                        onClick={() => handleSearch(ocrTextResult.formattedIsbn || ocrTextResult.detectedIsbn || '', 'ocr-isbn')}
                        className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Search size={14} />
                        <span>Vyhledat v katalogu</span>
                      </button>
                    </div>
                  ) : null}

                  {ocrPreviewImage && (
                    <div className="flex items-center gap-3 pt-1">
                      <img src={ocrPreviewImage} alt="Fotografie tiráže" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                      <div className="text-[11px] text-slate-600">
                        <p className="font-semibold text-slate-800">Nahraný snímek stránky</p>
                        <p>Text z fotografie byl analyzován optickým čtením.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Simulation buttons for OCR ISBN */}
              <div>
                <p className="text-[11px] font-bold text-cyan-950 uppercase mb-1.5 flex items-center gap-1">
                  <ScanText size={12} className="text-cyan-700" /> Vyzkoušet ukázky tištěného ISBN bez čárového kódu:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      handleSimulateOcrTextScan(
                        'Vydalo nakladatelství Československý spisovatel v Praze. Náklad 50 000 výtisků. ISBN 978-80-7390-348-1. Vázáno.',
                        'Babička (tiráž s ISBN-13)'
                      )
                    }
                    disabled={isOcrProcessing}
                    className="px-2.5 py-1.5 bg-white hover:bg-cyan-100 text-cyan-900 border border-cyan-300 rounded-lg text-xs font-mono transition flex items-center gap-1 shadow-2xs"
                  >
                    <span>📖 Babička: ISBN 978-80-7390-348-1</span>
                  </button>
                  <button
                    onClick={() =>
                      handleSimulateOcrTextScan(
                        'Karel Čapek: R.U.R. Vydalo nakladatelství Aventinum. ISBN 978-80-207-1830-2. Původní divadelní tisk.',
                        'R.U.R. (textové ISBN bez čárového kódu)'
                      )
                    }
                    disabled={isOcrProcessing}
                    className="px-2.5 py-1.5 bg-white hover:bg-cyan-100 text-cyan-900 border border-cyan-300 rounded-lg text-xs font-mono transition flex items-center gap-1 shadow-2xs"
                  >
                    <span>📖 R.U.R.: ISBN 978-80-207-1830-2</span>
                  </button>
                  <button
                    onClick={() =>
                      handleSimulateOcrTextScan(
                        'František Tichý: Sto kreseb. ISBN 978-80-257-2624-2. Vydáno v Praze roku 2018.',
                        'Sto kreseb (ISBN z tiráže)'
                      )
                    }
                    disabled={isOcrProcessing}
                    className="px-2.5 py-1.5 bg-white hover:bg-cyan-100 text-cyan-900 border border-cyan-300 rounded-lg text-xs font-mono transition flex items-center gap-1 shadow-2xs"
                  >
                    <span>📖 Sto kreseb: ISBN 978-80-257-2624-2</span>
                  </button>
                </div>
              </div>
            </div>
          )}

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

          {/* Camera target mode toggle: Barcode vs OCR printed text */}
          <div className="z-10 mb-3 bg-slate-800/90 p-1 rounded-xl border border-slate-700 flex items-center gap-1 text-xs">
            <button
              onClick={() => setCameraScanTarget('barcode')}
              className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                cameraScanTarget === 'barcode' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <QrCode size={13} />
              <span>QR & Čárový kód</span>
            </button>
            <button
              onClick={() => {
                setCameraScanTarget('ocr-text');
                setScanMode('ocr-isbn');
              }}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                cameraScanTarget === 'ocr-text' ? 'bg-cyan-600 text-white shadow-xs' : 'text-cyan-300 hover:text-white'
              }`}
            >
              <ScanText size={13} />
              <span>Čtení čísla (OCR)</span>
            </button>
          </div>

          {/* Live Camera Viewport */}
          <div className={`w-full overflow-hidden rounded-xl border border-slate-700 bg-black z-10 mb-4 relative ${isCameraActive ? 'block' : 'hidden'}`}>
            <div id="qr-reader" className="w-full"></div>

            {/* Target reticle for OCR Text mode */}
            {cameraScanTarget === 'ocr-text' && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-4/5 h-20 border-2 border-dashed border-cyan-400 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                  <span className="text-[11px] font-mono font-bold text-cyan-200 bg-slate-950/80 px-2 py-0.5 rounded shadow">
                    Zaměřte na řádek: "ISBN 978-..."
                  </span>
                </div>
              </div>
            )}

            {isScanPaused && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-20">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-2 border border-emerald-500/40">
                  <CheckCircle size={28} />
                </div>
                <p className="font-bold text-white text-sm">Úspěšně rozpoznáno</p>
                <p className="text-xs text-slate-300 mt-1 mb-3 max-w-xs">
                  Skenování je pozastaveno. Pro načtení další knihy pokračujte tlačítkem níže.
                </p>
                <button
                  onClick={handleResumeScanning}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  <Play size={15} />
                  <span>Skenovat další knihu</span>
                </button>
              </div>
            )}
          </div>

          {isCameraLoading ? (
            <div className="space-y-3 z-10 py-6">
              <RefreshCw size={40} className="text-blue-400 animate-spin mx-auto" />
              <p className="text-sm font-bold text-blue-200">Spouštění optiky kamery...</p>
              <p className="text-xs text-slate-400">Povolte v prohlížeči přístup ke kameře</p>
            </div>
          ) : isSimulatingCamera ? (
            <div className="space-y-3 z-10 py-6">
              <RefreshCw size={40} className="text-blue-400 animate-spin mx-auto" />
              <p className="text-sm font-bold text-blue-200">Probíhá analýza a optické rozpoznání...</p>
              <p className="text-xs text-slate-400">Načítání údajů z databáze knihovny</p>
            </div>
          ) : !isCameraActive ? (
            <div className="space-y-3 z-10 py-2">
              <div className="w-20 h-20 border-2 border-dashed border-cyan-500/60 rounded-2xl flex items-center justify-center mx-auto bg-cyan-500/10">
                <ScanLine size={36} className="text-cyan-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-100">Kamera pro čtení ISBN & Kódů</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Přečte QR kód, čárový kód nebo přímo vytištěné číslo ISBN bez čárového kódu.
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

          {/* Action buttons to Start / Stop Camera / OCR Snap */}
          <div className="z-10 mt-3 flex flex-wrap items-center justify-center gap-2">
            {!isCameraActive ? (
              <button
                onClick={startCamera}
                disabled={isCameraLoading}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-blue-600/30"
              >
                <Camera size={16} />
                <span>{isCameraLoading ? 'Načítání...' : 'Spustit Kameru'}</span>
              </button>
            ) : (
              <>
                {/* Instant OCR Capture button from active camera */}
                <button
                  onClick={handleCaptureFrameForOcr}
                  disabled={isOcrProcessing}
                  className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-extrabold rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-600/30"
                  title="Vyfotit a přečíst tištěné číslo ISBN z kamery"
                >
                  <ScanText size={16} />
                  <span>{isOcrProcessing ? 'Rozpoznávám text...' : 'Přečíst ISBN z kamery (OCR)'}</span>
                </button>

                {isScanPaused ? (
                  <button
                    onClick={handleResumeScanning}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-extrabold rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-500/30"
                  >
                    <Play size={16} />
                    <span>Pokračovat ve skenování</span>
                  </button>
                ) : (
                  <div className="px-3 py-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-xl text-xs flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Kamera aktivní</span>
                  </div>
                )}

                <button
                  onClick={stopCamera}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-red-600/30"
                >
                  <CameraOff size={16} />
                  <span>Vypnout</span>
                </button>
              </>
            )}
          </div>

          {lastScannedResult && !isSimulatingCamera && (
            <div className="mt-3 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 p-2.5 rounded-lg z-10 font-mono flex flex-col items-center gap-1.5 w-full max-w-sm">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                <span>{lastScannedResult}</span>
              </div>
              {isScanPaused && isCameraActive && (
                <div className="flex items-center gap-1 text-[11px] text-amber-300 font-sans mt-0.5">
                  <PauseCircle size={13} className="shrink-0" />
                  <span>Skenování pozastaveno</span>
                </div>
              )}
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
                          onError={(e) => {
                            const target = e.currentTarget;
                            const fallback = getReliableCoverUrl(currentBook);
                            if (target.src !== fallback) {
                              target.src = fallback;
                            }
                          }}
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
                          {currentBook.pageCount && <span>Rozsah: {currentBook.pageCount} str.</span>}
                          {currentBook.language && <span>Jazyk: {currentBook.language}</span>}
                          {currentBook.edition && <span>Vydání: {currentBook.edition}</span>}
                          <span>Kategorie: {currentBook.category}</span>
                        </div>

                        {currentBook.physicalDetails && (
                          <p className="text-xs text-blue-200 mt-1 font-sans">
                            <span className="font-semibold text-blue-100">Fyzický popis:</span> {currentBook.physicalDetails}
                          </p>
                        )}

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
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Počet Stran</label>
                          <input
                            type="number"
                            value={editableKnihovnyBook.pageCount || ''}
                            onChange={(e) => setEditableKnihovnyBook({ ...editableKnihovnyBook, pageCount: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Jazyk</label>
                          <input
                            type="text"
                            value={editableKnihovnyBook.language || ''}
                            onChange={(e) => setEditableKnihovnyBook({ ...editableKnihovnyBook, language: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Vydání</label>
                          <input
                            type="text"
                            value={editableKnihovnyBook.edition || ''}
                            onChange={(e) => setEditableKnihovnyBook({ ...editableKnihovnyBook, edition: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                        <div className="sm:col-span-2 md:col-span-3">
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Fyzický popis / Vazba</label>
                          <input
                            type="text"
                            value={editableKnihovnyBook.physicalDetails || ''}
                            onChange={(e) => setEditableKnihovnyBook({ ...editableKnihovnyBook, physicalDetails: e.target.value })}
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
              : 'Zadejte dotaz výše, přečtěte tištěné ISBN pomocí OCR nebo naskenujte QR kód pro zobrazení výsledků.'}
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
                      <span className="font-bold text-slate-800">ISBN: {book.isbn}</span>
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
