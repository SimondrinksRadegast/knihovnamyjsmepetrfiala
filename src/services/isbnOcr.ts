/**
 * Utility for recognizing, extracting and validating printed ISBN text without barcodes.
 * Supports both ISBN-10 and ISBN-13 with standard checksum algorithms,
 * hyphenated or raw numbers, and OCR via Shape Detection API (TextDetector)
 * or Tesseract.js fallback.
 */

import { createWorker } from 'tesseract.js';

export interface IsbnRecognitionResult {
  rawText: string;
  detectedIsbn: string | null;
  isbnType: 'ISBN-10' | 'ISBN-13' | null;
  isValidChecksum: boolean;
  formattedIsbn: string | null;
  confidence?: number;
}

/**
 * Validates ISBN-10 checksum (mod 11 algorithm).
 */
export function isValidIsbn10(isbnStr: string): boolean {
  const clean = isbnStr.replace(/[^0-9Xx]/g, '');
  if (clean.length !== 10) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += (10 - i) * parseInt(clean[i], 10);
  }
  const lastChar = clean[9].toUpperCase();
  const checkDigit = lastChar === 'X' ? 10 : parseInt(lastChar, 10);
  sum += checkDigit;

  return sum % 11 === 0;
}

/**
 * Validates ISBN-13 checksum (EAN-13 mod 10 algorithm with alternating weights 1 and 3).
 */
export function isValidIsbn13(isbnStr: string): boolean {
  const clean = isbnStr.replace(/[^0-9]/g, '');
  if (clean.length !== 13) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(clean[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(clean[12], 10);
}

/**
 * Formats clean ISBN digits into a standard human-readable format.
 */
export function formatIsbn(cleanDigits: string): string {
  const clean = cleanDigits.replace(/[^0-9Xx]/g, '');
  if (clean.length === 13) {
    // E.g. 978-80-7390-348-1 or 978-80-XXXX-XXX-X
    return `${clean.slice(0, 3)}-${clean.slice(3, 5)}-${clean.slice(5, 9)}-${clean.slice(9, 12)}-${clean.slice(12)}`;
  }
  if (clean.length === 10) {
    // E.g. 80-207-1830-5
    return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5, 9)}-${clean.slice(9)}`;
  }
  return clean;
}

/**
 * Normalizes text to handle common OCR substitutions in ISBNs:
 * e.g. uppercase 'O' -> '0', 'l'/'I' -> '1', 'B' -> '8' if between digits, etc.
 */
export function normalizeOcrText(raw: string): string {
  return raw
    .replace(/[—–]/g, '-')
    .replace(/(\d)[oO](\d)/g, '$10$2')
    .replace(/(\d)[lI](\d)/g, '$11$2');
}

/**
 * Extracts and validates ISBN from arbitrary unstructured text.
 * Finds occurrences like:
 * - "ISBN 978-80-7390-348-1"
 * - "ISBN: 978 80 207 1830 2"
 * - "ISBN-13: 9788073903481"
 * - "ISBN 80-207-1830-5"
 * - raw numbers with valid ISBN checksum or 10/13 digits
 */
export function extractIsbnFromText(text: string): IsbnRecognitionResult {
  if (!text) {
    return {
      rawText: '',
      detectedIsbn: null,
      isbnType: null,
      isValidChecksum: false,
      formattedIsbn: null,
    };
  }

  const cleanText = normalizeOcrText(text);

  // 1. First, search for explicit ISBN markers in the text (e.g. "ISBN", "ISBN-13", "ISBN 10")
  const explicitRegex = /(?:ISBN(?:-?1[03])?[:\s\t]*)\s*([0-9Xx\s-]{10,25})/gi;
  let match: RegExpExecArray | null;

  while ((match = explicitRegex.exec(cleanText)) !== null) {
    const rawCandidate = match[1];
    const candidateDigits = rawCandidate.replace(/[^0-9Xx]/g, '');

    // Check if 13 digits
    if (candidateDigits.length >= 13) {
      const isbn13Candidate = candidateDigits.slice(0, 13);
      const valid = isValidIsbn13(isbn13Candidate);
      return {
        rawText: text,
        detectedIsbn: isbn13Candidate,
        isbnType: 'ISBN-13',
        isValidChecksum: valid,
        formattedIsbn: formatIsbn(isbn13Candidate),
      };
    }

    // Check if 10 digits
    if (candidateDigits.length >= 10) {
      const isbn10Candidate = candidateDigits.slice(0, 10);
      const valid = isValidIsbn10(isbn10Candidate);
      return {
        rawText: text,
        detectedIsbn: isbn10Candidate,
        isbnType: 'ISBN-10',
        isValidChecksum: valid,
        formattedIsbn: formatIsbn(isbn10Candidate),
      };
    }
  }

  // 2. Scan all sequences of numbers, dashes and spaces
  // Find potential 13-digit sequences (978... or 979...) with valid checksum first
  const isbn13Anywhere = /(?:97[89][\s-]?)?(?:[0-9][\s-]?){9,12}[0-9]/g;
  const potential13Matches = cleanText.match(isbn13Anywhere) || [];
  for (const m of potential13Matches) {
    const digits = m.replace(/[^0-9]/g, '');
    if (digits.length === 13 && (digits.startsWith('978') || digits.startsWith('979'))) {
      if (isValidIsbn13(digits)) {
        return {
          rawText: text,
          detectedIsbn: digits,
          isbnType: 'ISBN-13',
          isValidChecksum: true,
          formattedIsbn: formatIsbn(digits),
        };
      }
    }
  }

  // 3. Find potential 10-digit sequences with valid checksum
  const potential10Regex = /\b[0-9][0-9Xx\s-]{8,15}[0-9Xx]\b/g;
  const potential10Matches = cleanText.match(potential10Regex) || [];
  for (const m of potential10Matches) {
    const digits = m.replace(/[^0-9Xx]/g, '');
    if (digits.length === 10) {
      if (isValidIsbn10(digits)) {
        return {
          rawText: text,
          detectedIsbn: digits,
          isbnType: 'ISBN-10',
          isValidChecksum: true,
          formattedIsbn: formatIsbn(digits),
        };
      }
    }
  }

  // 4. If any 13-digit sequence starting with 978 or 979 exists (even if checksum failed due to 1 digit OCR noise)
  for (const m of potential13Matches) {
    const digits = m.replace(/[^0-9]/g, '');
    if (digits.length === 13 && (digits.startsWith('978') || digits.startsWith('979'))) {
      return {
        rawText: text,
        detectedIsbn: digits,
        isbnType: 'ISBN-13',
        isValidChecksum: false,
        formattedIsbn: formatIsbn(digits),
      };
    }
  }

  return {
    rawText: text,
    detectedIsbn: null,
    isbnType: null,
    isValidChecksum: false,
    formattedIsbn: null,
  };
}

let cachedWorker: any = null;

/**
 * Gets or initializes a singleton Tesseract worker configured for digits, dashes and uppercase letters.
 */
async function getTesseractWorker() {
  if (cachedWorker) {
    return cachedWorker;
  }

  const worker = await createWorker('eng', 1, {
    logger: () => {},
  });

  // Whitelist characters to speed up recognition and drastically increase accuracy for ISBN lines
  await worker.setParameters({
    tessedit_char_whitelist: '0123456789- ISBNXx:\n',
  });

  cachedWorker = worker;
  return worker;
}

/**
 * Pre-processes an image element or canvas for OCR:
 * - Converts to grayscale
 * - Boosts contrast and binarizes for clean text edges
 */
export function preprocessCanvasForOcr(
  source: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
  cropRect?: { x: number; y: number; width: number; height: number }
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const sx = cropRect ? cropRect.x : 0;
  const sy = cropRect ? cropRect.y : 0;
  const sw = cropRect ? cropRect.width : (source instanceof HTMLVideoElement ? source.videoWidth : source.width);
  const sh = cropRect ? cropRect.height : (source instanceof HTMLVideoElement ? source.videoHeight : source.height);

  canvas.width = sw;
  canvas.height = sh;

  // Draw cropped / full source
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);

  // Apply Grayscale and Contrast Filter
  try {
    const imgData = ctx.getImageData(0, 0, sw, sh);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Perceptual grayscale
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      // High contrast adjustment
      const factor = (259 * (128 + 255)) / (255 * (259 - 128));
      const contrasted = factor * (gray - 128) + 128;
      const finalVal = contrasted > 140 ? 255 : contrasted < 90 ? 0 : contrasted;

      data[i] = finalVal;
      data[i + 1] = finalVal;
      data[i + 2] = finalVal;
    }

    ctx.putImageData(imgData, 0, 0);
  } catch {
    // If CORS or tainted canvas, return unmodified canvas
  }

  return canvas;
}

/**
 * Recognizes text and extracts ISBN from an image, canvas or video frame.
 * Tries the modern native TextDetector API if available in browser,
 * otherwise utilizes the optimized Tesseract.js engine.
 */
export async function recognizeIsbnFromImage(
  imageSource: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | string,
  cropRect?: { x: number; y: number; width: number; height: number }
): Promise<IsbnRecognitionResult> {
  let recognizedText = '';
  let confidence: number | undefined;

  // 1. Try modern native browser Shape Detection API (TextDetector) if available
  if (typeof window !== 'undefined' && 'TextDetector' in window) {
    try {
      const TextDetectorClass = (window as any).TextDetector;
      const textDetector = new TextDetectorClass();

      let targetElement: any = imageSource;
      if (typeof imageSource === 'string') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageSource;
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
        });
        targetElement = img;
      }

      if (cropRect && (targetElement instanceof HTMLImageElement || targetElement instanceof HTMLVideoElement || targetElement instanceof HTMLCanvasElement)) {
        targetElement = preprocessCanvasForOcr(targetElement, cropRect);
      }

      const detectedBlocks = await textDetector.detect(targetElement);
      if (detectedBlocks && detectedBlocks.length > 0) {
        recognizedText = detectedBlocks.map((b: any) => b.rawValue).join(' ');
        const result = extractIsbnFromText(recognizedText);
        if (result.detectedIsbn) {
          return {
            ...result,
            confidence: 95,
          };
        }
      }
    } catch {
      // Native detector unavailable or failed, fallback to Tesseract.js
    }
  }

  // 2. Tesseract.js OCR Recognition
  try {
    const worker = await getTesseractWorker();

    let processedSource: any = imageSource;
    if (imageSource instanceof HTMLImageElement || imageSource instanceof HTMLVideoElement || imageSource instanceof HTMLCanvasElement) {
      processedSource = preprocessCanvasForOcr(imageSource, cropRect);
    }

    const { data } = await worker.recognize(processedSource);
    recognizedText = data.text || '';
    confidence = data.confidence;
  } catch (err) {
    console.warn('Tesseract OCR error:', err);
  }

  const extracted = extractIsbnFromText(recognizedText);
  return {
    ...extracted,
    confidence,
  };
}
