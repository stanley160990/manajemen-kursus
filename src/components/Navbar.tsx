import React, { useState, useEffect } from 'react';
import { User } from '../types.ts';
import { LogOut, Shield, UserCheck, Clock, Calendar } from 'lucide-react';

interface NavbarProps {
  user: User;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

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
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#EEF0FD] text-[#525FE1] border border-[#D0D5FA]">
                  PostgreSQL
                </span>
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
  );
};
