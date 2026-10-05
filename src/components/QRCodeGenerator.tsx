import React, { useState } from 'react';
import type { Book } from '../types';
import { QrCode, Printer, Check, Copy, Library } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeGeneratorProps {
  books: Book[];
  selectedBook: Book | null;
  onSelectBook: (book: Book | null) => void;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  books,
  selectedBook,
  onSelectBook,
}) => {
  const activeBook = selectedBook || books[0];
  const [libraryName, setLibraryName] = useState('Městská Knihovna');
  const [copied, setCopied] = useState(false);

  const qrPayload = activeBook ? `LIB:${activeBook.code}:${activeBook.isbn}` : '';

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = () => {
    if (activeBook) {
      navigator.clipboard.writeText(activeBook.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Non-printable UI Controls */}
      <div className="print:hidden space-y-6">
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 rounded-2xl border border-amber-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wider mb-1">
              <QrCode size={16} /> Funkce pro vedoucího
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Generátor QR štítků pro tisk</h2>
            <p className="text-xs text-slate-600 mt-1">
              Vytvořte formátovaný tiskový štítek s QR kódem a označením. Tento štítek si můžete vytisknout, vystřihnout a nalepit přímo na hřbet či obálku knihy.
            </p>
          </div>

          <button
            onClick={handlePrint}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2 shrink-0"
          >
            <Printer size={18} />
            <span>Vytisknout štítek</span>
          </button>
        </div>

        {/* Book Selector & Label Customizer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Vyberte knihu z databáze</label>
            <select
              value={activeBook?.id || ''}
              onChange={(e) => {
                const b = books.find((x) => x.id === e.target.value);
                if (b) onSelectBook(b);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} — {b.code} ({b.isbn})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Název Knihovny na štítku</label>
            <input
              type="text"
              value={libraryName}
              onChange={(e) => setLibraryName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Printable Sticker Tag Layout Area */}
      {activeBook && (
        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider print:hidden">
            Náhled tiskového štítku knihy (Sticker Tag):
          </p>

          <div className="flex justify-center">
            {/* The actual label card that will be printed */}
            <div className="bg-white border-2 border-slate-900 p-5 rounded-2xl shadow-lg w-80 text-center space-y-3 print:shadow-none print:m-0 print:p-4 print:border-2 print:border-black">
              {/* Header */}
              <div className="border-b border-slate-200 pb-2 flex items-center justify-center gap-1.5 text-slate-800">
                <Library size={16} className="text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wide">{libraryName}</span>
              </div>

              {/* Title & Author */}
              <div>
                <h3 className="font-extrabold text-slate-900 text-base leading-snug">{activeBook.title}</h3>
                <p className="text-xs font-semibold text-slate-600">{activeBook.author}</p>
              </div>

              {/* QR Code Graphic */}
              <div className="p-3 bg-slate-50 rounded-xl inline-block border border-slate-200/80 my-1">
                <QRCodeSVG value={qrPayload} size={140} level="H" />
              </div>

              {/* Codes & Location */}
              <div className="space-y-1 text-xs font-mono pt-1">
                <div className="font-bold text-slate-900 bg-slate-100 py-1 px-2 rounded border border-slate-200">
                  {activeBook.code}
                </div>
                <div className="text-[11px] text-slate-600">ISBN: {activeBook.isbn}</div>
                <div className="text-[11px] font-sans text-blue-700 font-semibold pt-1">
                  {activeBook.location}
                </div>
              </div>
            </div>
          </div>

          <div className="text-center print:hidden">
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? 'Kód zkopírován!' : 'Kopírovat kód knihy'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
