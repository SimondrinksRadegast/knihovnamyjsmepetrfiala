import React from 'react';
import type { UserRole, ViewTab, User } from '../types';
import { BookOpen, ScanLine, Settings, QrCode, LogIn, LogOut, Shield, UserCheck, Eye, Search } from 'lucide-react';

interface HeaderProps {
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  currentUser,
  onOpenAuth,
  onLogout,
  searchQuery,
  setSearchQuery,
}) => {
  return (
    <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-lg border-b border-slate-800">
      {/* Top Banner / Role Switcher for Demo & Quick Actions */}
      <div className="bg-slate-950/80 px-4 py-1.5 border-b border-slate-800/60 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Systém Knihovna v1.0 • Aktivní režim:</span>
          <span className="font-semibold text-slate-200 uppercase tracking-wide">
            {userRole === 'vedouci' && '👑 Vedoucí knihovník'}
            {userRole === 'zamestnanec' && '💼 Zaměstnanec / Knihovník'}
            {userRole === 'verejnost' && '👤 Veřejnost / Čtenář'}
          </span>
        </div>

        {/* Quick Role Toggle Bar for easy testing */}
        <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
          <span className="text-slate-400 text-[10px] uppercase font-bold mr-1">Rychlé Přepnutí Role:</span>
          <button
            onClick={() => setUserRole('verejnost')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center gap-1 ${
              userRole === 'verejnost' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye size={12} /> Veřejnost
          </button>
          <button
            onClick={() => setUserRole('zamestnanec')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center gap-1 ${
              userRole === 'zamestnanec' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck size={12} /> Zaměstnanec
          </button>
          <button
            onClick={() => setUserRole('vedouci')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center gap-1 ${
              userRole === 'vedouci' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield size={12} /> Vedoucí
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('katalog')}>
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2.5 rounded-xl text-white shadow-md shadow-blue-500/20">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Knihovní Systém
            </h1>
            <p className="text-xs text-slate-400">Katalogizace, QR kódy a rozpoznávání knih</p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md mx-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hledat podle názvu, autora, ISBN nebo kódu..."
              className="w-full bg-slate-800/80 text-slate-100 text-sm pl-9 pr-4 py-2 rounded-xl border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400 transition"
            />
          </div>
        </div>

        {/* User Auth Info */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2 bg-slate-800/90 pl-3 pr-2 py-1.5 rounded-xl border border-slate-700">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-100 leading-tight">{currentUser.name}</p>
                <p className="text-[10px] text-blue-400 uppercase font-semibold">{currentUser.role}</p>
              </div>
              <button
                onClick={onLogout}
                title="Odhlásit se"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 rounded-lg transition"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-medium text-sm transition shadow-sm"
            >
              <LogIn size={16} />
              <span>Přihlásit / Registrovat</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 border-t border-slate-800/80 overflow-x-auto">
        <button
          onClick={() => setActiveTab('katalog')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'katalog'
              ? 'border-blue-500 text-blue-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <BookOpen size={18} />
          <span>Katalog knih</span>
        </button>

        <button
          onClick={() => setActiveTab('rozpoznani')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'rozpoznani'
              ? 'border-blue-500 text-blue-400 bg-slate-800/40'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <ScanLine size={18} />
          <span>Rozpoznávání & Skener</span>
        </button>

        {(userRole === 'vedouci' || userRole === 'zamestnanec') && (
          <button
            onClick={() => setActiveTab('sprava')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'sprava'
                ? 'border-blue-500 text-blue-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Settings size={18} />
            <span>Správa databáze</span>
            {userRole === 'vedouci' && (
              <span className="bg-purple-500/20 text-purple-300 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border border-purple-500/30">
                Vedoucí
              </span>
            )}
          </button>
        )}

        {userRole === 'vedouci' && (
          <button
            onClick={() => setActiveTab('qr-generator')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'qr-generator'
                ? 'border-blue-500 text-blue-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <QrCode size={18} />
            <span>Generátor QR kódů</span>
            <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border border-amber-500/30">
              Tisk
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
