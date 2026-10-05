import React, { useState } from 'react';
import type { UserRole, User } from '../types';
import { X, LogIn, UserPlus, Shield, UserCheck, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
  currentRole: UserRole;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, currentRole }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole === 'verejnost' ? 'zamestnanec' : currentRole);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isRegistering && !name)) {
      setError('Vyplňte prosím všechna povinná pole.');
      return;
    }

    const newUser: User = {
      id: 'u-' + Date.now(),
      name: isRegistering ? name : (email.split('@')[0] || 'Knihovník'),
      email,
      role: selectedRole,
    };

    onLogin(newUser);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-xl">
              {isRegistering ? <UserPlus size={28} /> : <LogIn size={28} />}
            </div>
            <div>
              <h3 className="text-xl font-bold">
                {isRegistering ? 'Vytvoření účtu' : 'Přihlášení do systému'}
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                {isRegistering ? 'Registrace zaměstnance či vedoucího' : 'Vstup do interního katalogizačního systému'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm flex items-center gap-2 border border-amber-200">
              <AlertCircle size={18} className="text-amber-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isRegistering && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Celé jméno</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jan Novák"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">E-mailová adresa</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="knihovnik@knihovna.cz"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Heslo</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Role v systému</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setSelectedRole('zamestnanec')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-2 transition ${
                  selectedRole === 'zamestnanec'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <UserCheck size={16} /> Zaměstnanec
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('vedouci')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-2 transition ${
                  selectedRole === 'vedouci'
                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Shield size={16} /> Vedoucí
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition text-sm"
          >
            {isRegistering ? 'Vytvořit účet' : 'Přihlásit se'}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              {isRegistering ? 'Již máte účet? Přihlaste se' : 'Nemáte účet? Registrujte se'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
