import React from 'react';
import { Users, CalendarDays, Activity, History, FileCheck } from 'lucide-react';

export type ActiveTab = 'mahasiswa' | 'referensi' | 'live_monitoring' | 'riwayat_login' | 'tugas_mahasiswa';

interface NavTabsProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  activeStudentCount?: number;
}

export const NavTabs: React.FC<NavTabsProps> = ({
  activeTab,
  onChangeTab,
  activeStudentCount = 0,
}) => {
  const tabs = [
    {
      id: 'mahasiswa' as ActiveTab,
      label: 'Data Mahasiswa',
      icon: Users,
      desc: 'NPM, Kelas & Pembekalan',
    },
    {
      id: 'referensi' as ActiveTab,
      label: 'Referensi & Jadwal Sesi',
      icon: CalendarDays,
      desc: 'Kelas & Konfigurasi Sesi Fleksibel',
    },
    {
      id: 'live_monitoring' as ActiveTab,
      label: 'Live Monitoring',
      icon: Activity,
      desc: 'Sesi Aktif Hari Ini',
      badge: activeStudentCount > 0 ? `${activeStudentCount} Online` : undefined,
      isPulse: activeStudentCount > 0,
    },
    {
      id: 'tugas_mahasiswa' as ActiveTab,
      label: 'Pengumpulan Tugas',
      icon: FileCheck,
      desc: 'Mahasiswa Sudah Mengumpulkan (NPM, Nama, Kelas, Sesi)',
    },
    {
      id: 'riwayat_login' as ActiveTab,
      label: 'Riwayat Akses Login',
      icon: History,
      desc: 'Log Detail Berdasarkan Rentang Waktu',
    },
  ];

  return (
    <div className="w-full bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto py-2.5 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => onChangeTab(tab.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#525FE1] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  {tab.isPulse && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </div>

                <span>{tab.label}</span>

                {tab.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
