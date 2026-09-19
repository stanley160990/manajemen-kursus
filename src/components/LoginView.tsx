import React, { useState } from 'react';
import { User, UserRole } from '../types.ts';
import { LogIn, Shield, UserCheck, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('asisten');
      setPassword('asisten123');
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Gagal masuk ke sistem');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-100 via-[#EEF0FD]/30 to-slate-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Header Visual with Brand Color #525FE1 */}
        <div className="bg-[#525FE1] px-8 py-7 text-white relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 text-white font-bold text-xl shadow-sm">
              P
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Portal Pembekalan</h1>
              <p className="text-xs text-white/80 font-medium">Sistem Monitoring & Presensi Mahasiswa</p>
            </div>
          </div>
          <p className="text-xs text-white/70 mt-2 leading-relaxed">
            Silakan masuk untuk mengakses modul manajemen data, referensi kelas, dan monitoring sesi hari ini.
          </p>
        </div>

        {/* Quick Role Selection Tabs */}
        <div className="p-6 sm:p-8">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Pilih Peran Akun Pengguna:
          </label>
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              type="button"
              id="role-admin-btn"
              onClick={() => handleSelectRole('admin')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all ${
                selectedRole === 'admin'
                  ? 'bg-[#EEF0FD] border-[#525FE1] text-[#525FE1] shadow-sm ring-1 ring-[#525FE1]'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>User Admin</span>
            </button>

            <button
              type="button"
              id="role-asisten-btn"
              onClick={() => handleSelectRole('asisten')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all ${
                selectedRole === 'asisten'
                  ? 'bg-[#EEF0FD] border-[#525FE1] text-[#525FE1] shadow-sm ring-1 ring-[#525FE1]'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>User Asisten</span>
            </button>
          </div>

          {/* Role Access Information Box */}
          <div className="mb-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
            <KeyRound className="w-4 h-4 text-[#525FE1] shrink-0 mt-0.5" />
            <div>
              {selectedRole === 'admin' ? (
                <span>
                  <strong className="text-slate-800">Izin Admin:</strong> Akses penuh untuk menambah, mengubah, menghapus data mahasiswa, upload XLSX, serta konfigurasi referensi kelas dan sesi.
                </span>
              ) : (
                <span>
                  <strong className="text-slate-800">Izin Asisten:</strong> Akses lihat saja (Read-Only). Dapat memantau live login dan riwayat tanpa izin mengubah/menghapus data.
                </span>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#525FE1] focus:border-transparent transition"
                placeholder="Masukkan username (admin / asisten)"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="password">
                  Kata Sandi
                </label>
                <span className="text-[11px] text-slate-400">
                  Default: {selectedRole === 'admin' ? 'admin123' : 'asisten123'}
                </span>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#525FE1] focus:border-transparent transition"
                placeholder="Masukkan kata sandi"
              />
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#525FE1] hover:bg-[#434ecb] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <span>Memproses Verifikasi...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk sebagai {selectedRole === 'admin' ? 'Admin' : 'Asisten'}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Switch Helper */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Sistem Berbasis PostgreSQL</span>
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Siap Digunakan
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
