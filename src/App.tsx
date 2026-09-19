import React, { useState, useEffect } from 'react';
import { User } from './types.ts';
import { LoginView } from './components/LoginView.tsx';
import { Navbar } from './components/Navbar.tsx';
import { NavTabs, ActiveTab } from './components/NavTabs.tsx';
import { MahasiswaView } from './components/MahasiswaView.tsx';
import { ReferensiKelasView } from './components/ReferensiKelasView.tsx';
import { LiveMonitoringView } from './components/LiveMonitoringView.tsx';
import { RiwayatLoginView } from './components/RiwayatLoginView.tsx';
import { TugasMahasiswaView } from './components/TugasMahasiswaView.tsx';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('mahasiswa');
  const [liveActiveCount, setLiveActiveCount] = useState<number>(0);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Load session from localStorage on initial render
  useEffect(() => {
    const savedUser = localStorage.getItem('portal_user');
    const savedToken = localStorage.getItem('portal_token');
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch (e) {
        localStorage.removeItem('portal_user');
        localStorage.removeItem('portal_token');
      }
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: User, authToken: string) => {
    setUser(loggedInUser);
    setToken(authToken);
    localStorage.setItem('portal_user', JSON.stringify(loggedInUser));
    localStorage.setItem('portal_token', authToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('portal_user');
    localStorage.removeItem('portal_token');
  };

  // If not logged in, enforce the login page constraint:
  // "halaman utamanya adalah halaman login, setiap akses harus didahului dengan login."
  if (!user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
      />

      {/* Navigation Tabs */}
      <NavTabs
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        activeStudentCount={liveActiveCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'mahasiswa' && (
          <MahasiswaView
            userRole={user.role}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === 'referensi' && (
          <ReferensiKelasView
            userRole={user.role}
            onRefreshTrigger={() => setRefreshTrigger((prev) => prev + 1)}
          />
        )}

        {activeTab === 'live_monitoring' && (
          <LiveMonitoringView
            userRole={user.role}
            onActiveCountChange={setLiveActiveCount}
          />
        )}

        {activeTab === 'tugas_mahasiswa' && (
          <TugasMahasiswaView userRole={user.role} />
        )}

        {activeTab === 'riwayat_login' && (
          <RiwayatLoginView userRole={user.role} />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200/80 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Sistem Monitoring & Presensi Pembekalan Mahasiswa</span>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] text-slate-500 font-medium">Universitas Gunadarma</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            User Aktif: <strong className="text-slate-700">{user.nama}</strong> ({user.role === 'admin' ? 'Hak Akses Penuh' : 'Mode Lihat Saja'})
          </p>
        </div>
      </footer>
    </div>
  );
}
