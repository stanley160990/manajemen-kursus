import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TugasMahasiswa, KelasPembekalan, UserRole } from '../types.ts';
import {
  CheckCircle2,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Sparkles,
  X,
  FileCheck2,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface TugasMahasiswaViewProps {
  userRole: UserRole;
}

export const TugasMahasiswaView: React.FC<TugasMahasiswaViewProps> = ({ userRole }) => {
  const [tugasList, setTugasList] = useState<TugasMahasiswa[]>([]);
  const [kelasList, setKelasList] = useState<KelasPembekalan[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedKelasId, setSelectedKelasId] = useState<string>('all');
  const [selectedSesi, setSelectedSesi] = useState<string>('all');
  const [selectedKelasReguler, setSelectedKelasReguler] = useState<string>('all');

  // Auto-refresh timer
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isSimulating, setIsSimulating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch Kelas Referensi for filter dropdown
  useEffect(() => {
    fetch('/api/referensi-kelas')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setKelasList(data.data || []);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Data Mahasiswa yang Sudah Mengumpulkan Tugas
  const fetchTugas = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedKelasId !== 'all') params.append('kelas_pembekalan_id', selectedKelasId);
        if (selectedSesi !== 'all') params.append('nama_sesi', selectedSesi);
        if (selectedKelasReguler !== 'all') params.append('kelas_reguler', selectedKelasReguler);
        if (search.trim()) params.append('search', search.trim());

        const res = await fetch(`/api/monitoring/tugas?${params.toString()}`);
        const result = await res.json();

        if (result.success) {
          // Hanya mahasiswa yang sudah mengumpulkan tugas saja
          const dataSubmittedOnly = (result.data || []).filter(
            (t: TugasMahasiswa) => t.status !== 'belum_mengumpulkan' && !!t.waktu_pengumpulan
          );
          setTugasList(dataSubmittedOnly);
          setLastRefreshed(new Date());
        }
      } catch (err: any) {
        console.error('Error fetching data tugas:', err);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [selectedKelasId, selectedSesi, selectedKelasReguler, search]
  );

  useEffect(() => {
    fetchTugas(true);
  }, [fetchTugas]);

  // Handle Auto-refresh interval
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchTugas(false);
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, fetchTugas]);

  // Distinct regular classes for filter
  const regularClassOptions = useMemo(() => {
    const setClasses = new Set<string>();
    tugasList.forEach((t) => {
      if (t.kelas) setClasses.add(t.kelas);
    });
    return Array.from(setClasses).sort();
  }, [tugasList]);

  // Distinct sessions for selected class or all
  const availableSesi = useMemo(() => {
    if (selectedKelasId !== 'all') {
      const activeClass = kelasList.find((k) => k.id === parseInt(selectedKelasId, 10));
      return activeClass?.sesi_list || [];
    }
    const allSesiMap = new Map<string, string>();
    kelasList.forEach((k) => {
      (k.sesi_list || []).forEach((s) => {
        allSesiMap.set(s.nama_sesi, s.nama_sesi);
      });
    });
    return Array.from(allSesiMap.values()).map((name, idx) => ({
      id: idx + 1,
      nama_sesi: name,
      hari: '',
      jam_mulai: '',
      jam_selesai: '',
    }));
  }, [selectedKelasId, kelasList]);

  // Ekspor Excel (.xlsx) hanya: No, NPM, Nama, Kelas, Sesi
  const handleExportExcel = () => {
    if (tugasList.length === 0) {
      alert('Tidak ada data pengumpulan tugas untuk diekspor.');
      return;
    }

    const exportRows = tugasList.map((t, index) => ({
      No: index + 1,
      NPM: t.npm,
      'Nama Mahasiswa': t.nama,
      Kelas: t.kelas,
      Sesi: t.nama_sesi,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 32 },
      { wch: 14 },
      { wch: 45 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PengumpulanTugas');
    XLSX.writeFile(wb, `daftar_pengumpulan_tugas_${Date.now()}.xlsx`);

    setToastMessage(`File Excel (${tugasList.length} data pengumpulan) berhasil diunduh!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Simulasi Ingest Pengumpulan Tugas dari Sistem Eksternal
  const handleSimulateExternalIngest = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/monitoring/tugas/simulate', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(`Simulasi Pengumpulan: Mahasiswa ${data.data?.npm} (${data.data?.nama}) berhasil mengumpulkan tugas.`);
        setTimeout(() => setToastMessage(null), 4000);
        fetchTugas(false);
      } else {
        alert(data.error || 'Gagal simulasi data');
      }
    } catch (err: any) {
      alert(err.message || 'Error saat simulasi pengumpulan tugas');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Daftar Mahasiswa Mengumpulkan Tugas
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Sudah Mengumpulkan
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Menampilkan daftar mahasiswa yang telah mengumpulkan tugas per sesi pembekalan (NPM, Nama Mahasiswa, Kelas, dan Sesi).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="simulate-task-submission-btn"
            onClick={handleSimulateExternalIngest}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-[#525FE1] bg-slate-50 hover:bg-[#EEF0FD] border border-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
            title="Simulasi mahasiswa mengumpulkan tugas dari sistem eksternal"
          >
            <Sparkles className={`w-3.5 h-3.5 text-amber-500 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Memproses...' : 'Simulasi Pengumpulan'}</span>
          </button>

          <button
            id="export-tugas-excel-btn"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-300/80 rounded-xl transition cursor-pointer shadow-2xs"
            title="Unduh daftar pengumpulan tugas dalam format Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Unduh Excel</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-tugas-input"
              type="text"
              placeholder="Cari NPM, Nama, Kelas, Sesi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#525FE1]/20 focus:border-[#525FE1] transition"
            />
          </div>

          {/* Filter Kelas Pembekalan */}
          <div>
            <select
              id="filter-tugas-kelas"
              value={selectedKelasId}
              onChange={(e) => {
                setSelectedKelasId(e.target.value);
                setSelectedSesi('all');
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#525FE1]/20 focus:border-[#525FE1] transition"
            >
              <option value="all">Semua Kelas Pembekalan</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama_kelas}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Sesi */}
          <div>
            <select
              id="filter-tugas-sesi"
              value={selectedSesi}
              onChange={(e) => setSelectedSesi(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#525FE1]/20 focus:border-[#525FE1] transition"
            >
              <option value="all">Semua Sesi Pembekalan</option>
              {availableSesi.map((s) => (
                <option key={s.id} value={s.nama_sesi}>
                  {s.nama_sesi}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Kelas Reguler */}
          <div>
            <select
              id="filter-tugas-kelas-reguler"
              value={selectedKelasReguler}
              onChange={(e) => setSelectedKelasReguler(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#525FE1]/20 focus:border-[#525FE1] transition"
            >
              <option value="all">Semua Kelas Reguler</option>
              {regularClassOptions.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sub-bar: Auto-refresh & refresh trigger */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Sinkronisasi Otomatis:</span>
            <div className="flex items-center gap-1">
              {[
                { val: 0, label: 'Mati' },
                { val: 10, label: '10 dtk' },
                { val: 30, label: '30 dtk' },
              ].map((item) => (
                <button
                  key={item.val}
                  onClick={() => setAutoRefreshInterval(item.val)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                    autoRefreshInterval === item.val
                      ? 'bg-[#525FE1] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-[11px] text-slate-400">
              Pembaruan: {lastRefreshed.toLocaleTimeString('id-ID')}
            </span>
            <button
              id="refresh-tugas-btn"
              onClick={() => fetchTugas(true)}
              className="flex items-center gap-1 text-slate-600 hover:text-[#525FE1] transition cursor-pointer"
              title="Refresh Data Tugas"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table Container - Strictly: No, NPM, Nama, Kelas, Sesi */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 w-14 text-center">No</th>
                <th className="px-4 py-3.5 w-36">NPM</th>
                <th className="px-4 py-3.5">Nama Mahasiswa</th>
                <th className="px-4 py-3.5 w-32">Kelas</th>
                <th className="px-4 py-3.5">Sesi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#525FE1]" />
                      <span className="text-xs">Memuat daftar mahasiswa yang sudah mengumpulkan tugas...</span>
                    </div>
                  </td>
                </tr>
              ) : tugasList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <FileCheck2 className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700">Tidak ada pengumpulan tugas ditemukan</p>
                      <p className="text-xs max-w-sm text-center">
                        Belum ada data mahasiswa yang mengumpulkan tugas sesuai kriteria filter saat ini.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                tugasList.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition">
                    {/* No */}
                    <td className="px-4 py-3 text-center font-medium text-slate-400">
                      {idx + 1}
                    </td>

                    {/* NPM */}
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-slate-800 tracking-wide text-xs">
                        {t.npm}
                      </span>
                    </td>

                    {/* Nama Mahasiswa */}
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900">
                        {t.nama}
                      </span>
                    </td>

                    {/* Kelas */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {t.kelas}
                      </span>
                    </td>

                    {/* Sesi */}
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">
                        {t.nama_sesi}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Menampilkan <strong className="text-slate-700">{tugasList.length}</strong> mahasiswa yang sudah mengumpulkan tugas
          </div>
          <div className="text-[11px] text-slate-400">
            Daftar pengumpulan tugas persesi (NPM, Nama, Kelas, Sesi)
          </div>
        </div>
      </div>
    </div>
  );
};
