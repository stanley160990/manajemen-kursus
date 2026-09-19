import React, { useState, useEffect } from 'react';
import { User } from '../types.ts';
import { LogOut, Shield, UserCheck, Clock, Calendar, Database, AlertCircle, CheckCircle2 } from 'lucide-react';

interface NavbarProps {
  user: User;
  onLogout: () => void;
}

interface DbStatus {
  isPostgresConnected: boolean;
  mode: string;
  host?: string;
  port?: number;
  database?: string;
  lastError?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);

  useEffect(() => {
    const fetchDbStatus = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          if (data && data.database) {
            setDbStatus(data.database);
          }
        }
      } catch {
        // silent
      }
    };

    fetchDbStatus();
    const dbInterval = setInterval(fetchDbStatus, 8000);
    return () => clearInterval(dbInterval);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Database Warning Banner if Disconnected / Fallback */}
      {dbStatus && !dbStatus.isPostgresConnected && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-medium flex flex-wrap items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-100 shrink-0" />
            <span>
              <strong>Peringatan Database:</strong> PostgreSQL belum terhubung ({dbStatus.lastError || 'koneksi ditolak'}). Aplikasi saat ini berjalan dalam <em>mode memori sementara</em>, sehingga perubahan belum tersimpan permanen di database PostgreSQL server.
            </span>
          </div>
          <span className="text-[11px] bg-amber-700/60 px-2.5 py-0.5 rounded font-mono text-amber-100 border border-amber-400/40">
            Periksa PGHOST=db di docker-compose.yml
          </span>
        </div>
      )}

      <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#525FE1] flex items-center justify-center text-white font-black text-lg shadow-sm">
                P
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">
                    Portal Pembekalan
                  </span>
                  {dbStatus?.isPostgresConnected ? (
                    <span
                      id="db-badge-connected"
                      className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                      title={`Terhubung ke PostgreSQL (${dbStatus.host}:${dbStatus.port || 5432}/${dbStatus.database})`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      PostgreSQL: Live
                    </span>
                  ) : (
                    <span
                      id="db-badge-fallback"
                      className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300"
                      title={dbStatus?.lastError ? `Gagal terhubung: ${dbStatus.lastError}` : 'PostgreSQL terputus. Mode memori aktif.'}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      PostgreSQL: Terputus
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 hidden md:block">
                  Manajemen Mahasiswa & Live Monitoring Sesi
                </p>
              </div>
            </div>

          {/* Center: Live Date & Clock */}
          <div className="hidden lg:flex items-center gap-4 py-1.5 px-3.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-[#525FE1]" />
              <span>{currentDate}</span>
            </div>
            <div className="w-px h-3.5 bg-slate-300" />
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 tabular-nums">
              <Clock className="w-3.5 h-3.5 text-[#525FE1]" />
              <span>{currentTime} WIB</span>
            </div>
          </div>

          {/* Right: User Role & Actions */}
          <div className="flex items-center gap-3">
            {/* Role Badge */}
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">{user.nama}</p>
                <p className="text-[11px] text-slate-500">@{user.username}</p>
              </div>

              {user.role === 'admin' ? (
                <div
                  id="user-badge-admin"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#EEF0FD] text-[#525FE1] border border-[#D0D5FA]"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </div>
              ) : (
                <div
                  id="user-badge-asisten"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200"
                  title="User Asisten: Mode Baca Saja"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Asisten (Lihat Saja)</span>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              id="logout-btn"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 hover:border-red-200 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
    </>
  );
};
