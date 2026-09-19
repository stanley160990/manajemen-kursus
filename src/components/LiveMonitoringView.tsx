import React, { useState, useEffect } from 'react';
import { LiveActiveMahasiswa, SesiPembekalan, UserRole } from '../types.ts';
import {
  Activity,
  Radio,
  Clock,
  RefreshCw,
  Send,
  Monitor,
  Laptop,
  CheckCircle,
  PlayCircle,
  Calendar,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';

interface LiveMonitoringViewProps {
  userRole: UserRole;
  onActiveCountChange?: (count: number) => void;
}

export const LiveMonitoringView: React.FC<LiveMonitoringViewProps> = ({
  userRole,
  onActiveCountChange,
}) => {
  const [activeList, setActiveList] = useState<LiveActiveMahasiswa[]>([]);
  const [todaySessions, setTodaySessions] = useState<SesiPembekalan[]>([]);
  const [todayDayName, setTodayDayName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Simulation Modal for testing external ingest
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [simNpm, setSimNpm] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<string | null>(null);

  const fetchLiveMonitoring = async () => {
    try {
      const res = await fetch('/api/monitoring/live');
      const data = await res.json();
      if (data.success) {
        setActiveList(data.activeList || []);
        setTodaySessions(data.todaySessions || []);
        setTodayDayName(data.todayDayName || '');
        setLastRefreshed(new Date());
        if (onActiveCountChange) {
          onActiveCountChange(data.activeList?.length || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch live monitoring:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveMonitoring();
  }, []);

  // Auto refresh interval (every 5s)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLiveMonitoring();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Trigger External System simulation
  const handleSimulateLogin = async (action: 'login' | 'logout') => {
    setSimulating(true);
    setSimResult(null);
    try {
      const res = await fetch('/api/monitoring/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, npm: simNpm || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setSimResult(data.message);
        fetchLiveMonitoring();
      } else {
        setSimResult(`Gagal: ${data.error}`);
      }
    } catch (err: any) {
      setSimResult(`Error: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Live Monitoring Mahasiswa Aktif
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {activeList.length} Sedang Online
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Menampilkan daftar mahasiswa yang sedang aktif login khusus <strong>sesi pada hari ini ({todayDayName})</strong>. Data terintegrasi otomatis dari sistem eksternal.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Auto Refresh Toggle */}
          <button
            id="toggle-autorefresh-btn"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse text-emerald-600' : ''}`} />
            <span>Auto-Refresh: {autoRefresh ? 'Aktif (5s)' : 'Nonaktif'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            id="refresh-live-btn"
            onClick={fetchLiveMonitoring}
            className="p-2 text-slate-600 hover:text-[#525FE1] hover:bg-[#EEF0FD] rounded-xl border border-slate-200 transition cursor-pointer"
            title="Segarkan data sekarang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Simulate External Ingest */}
          <button
            id="simulate-ingest-btn"
            onClick={() => {
              setSimResult(null);
              setIsSimulateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#525FE1] hover:bg-[#434ecb] rounded-xl shadow-xs transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Uji Ingest Eksternal</span>
          </button>
        </div>
      </div>

      {/* Today Sessions Highlight Banner */}
      <div className="bg-[#EEF0FD]/60 border border-[#D0D5FA] rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#525FE1]" />
            <h3 className="text-xs font-bold text-[#525FE1] uppercase tracking-wider">
              Jadwal Sesi Pembekalan Hari Ini ({todayFormatted})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Pembaruan terakhir: {lastRefreshed.toLocaleTimeString('id-ID')} WIB
          </span>
        </div>

        {todaySessions.length === 0 ? (
          <div className="bg-white/80 p-3 rounded-xl text-xs text-slate-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Tidak ada sesi pembekalan yang dijadwalkan secara reguler pada hari <strong>{todayDayName}</strong> di tabel referensi. Monitoring tetap mencatat mahasiswa yang login hari ini.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {todaySessions.map((sesi) => (
              <div
                key={sesi.id}
                className="bg-white p-3 rounded-xl border border-[#D0D5FA]/60 shadow-xs flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 line-clamp-1">{sesi.nama_sesi}</p>
                  <p className="text-[11px] text-slate-500">{sesi.ruangan || 'Lab Komputer'}</p>
                  {sesi.asisten && sesi.asisten.length > 0 && (
                    <p className="text-[10px] text-[#525FE1] line-clamp-1 mt-0.5">
                      Ast: {sesi.asisten.join(', ')}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-[#525FE1] bg-[#EEF0FD] px-2 py-0.5 rounded-md">
                    {sesi.jam_mulai} - {sesi.jam_selesai}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-[#525FE1]" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Daftar Mahasiswa yang Sedang Aktif Login (Hari Ini)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Sumber Data: Endpoint Ingest Sistem Eksternal & Presensi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">NPM</th>
                <th className="py-3 px-4">Nama Mahasiswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Kelas Pembekalan</th>
                <th className="py-3 px-4">Sesi Hari Ini</th>
                <th className="py-3 px-4">Waktu Login</th>
                <th className="py-3 px-4">Durasi Aktif</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#525FE1]" />
                    Memuat data login aktif hari ini...
                  </td>
                </tr>
              ) : activeList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <Radio className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">Belum ada mahasiswa yang aktif login pada sesi hari ini.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Klik tombol <strong>"Uji Ingest Eksternal"</strong> di atas untuk mencoba simulasi masuk mahasiswa dari sistem lain.
                    </p>
                  </td>
                </tr>
              ) : (
                activeList.map((mhs, idx) => (
                  <tr key={mhs.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 text-center font-medium text-slate-400">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{mhs.npm}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{mhs.nama}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                        {mhs.kelas}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {mhs.nama_kelas_pembekalan}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-semibold text-[#525FE1] bg-[#EEF0FD] px-2 py-0.5 rounded-md">
                        {mhs.nama_sesi}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">
                      {new Date(mhs.waktu_login).toLocaleTimeString('id-ID')} WIB
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {mhs.durasi_menit} menit
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                      {mhs.ip_address}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Aktif Online
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Total Mahasiswa Aktif Hari Ini: <strong>{activeList.length}</strong>
          </span>
          <span className="text-[11px]">
            Hanya menampilkan mahasiswa yang aktif pada sesi hari ini ({todayDayName})
          </span>
        </div>
      </div>

      {/* SIMULATE MODAL (Untuk Pengujian Input Sistem Lain) */}
      {isSimulateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-[#525FE1]" />
                <h3 className="text-sm font-bold text-slate-900">Uji Kirim Ingest Sistem Eksternal</h3>
              </div>
              <button
                onClick={() => setIsSimulateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Fitur ini menyimulasikan sistem lain (misalnya aplikasi laboratorium, gate presensi, atau portal ujian) yang mengirim HTTP POST event login mahasiswa ke backend.
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NPM Mahasiswa (Kosongkan untuk memilih acak)
                </label>
                <input
                  type="text"
                  value={simNpm}
                  onChange={(e) => setSimNpm(e.target.value)}
                  placeholder="Contoh: 50421001"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#525FE1] focus:outline-none"
                />
              </div>

              {simResult && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{simResult}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleSimulateLogin('login')}
                disabled={simulating}
                className="py-2.5 px-3 rounded-xl bg-[#525FE1] hover:bg-[#434ecb] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Kirim Event Login</span>
              </button>

              <button
                type="button"
                onClick={() => handleSimulateLogin('logout')}
                disabled={simulating}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <span>Kirim Event Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
