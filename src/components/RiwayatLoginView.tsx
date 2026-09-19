import React, { useState, useEffect } from 'react';
import { RiwayatLoginMahasiswa, UserRole } from '../types.ts';
import * as XLSX from 'xlsx';
import {
  History,
  Calendar,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Globe,
  Monitor,
} from 'lucide-react';

interface RiwayatLoginViewProps {
  userRole: UserRole;
}

export const RiwayatLoginView: React.FC<RiwayatLoginViewProps> = ({ userRole }) => {
  const [logs, setLogs] = useState<RiwayatLoginMahasiswa[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Range state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activePreset, setActivePreset] = useState<string>('all');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [kelasFilter, setKelasFilter] = useState('all');

  // Presets helper
  const handleSetPreset = (preset: 'today' | '7days' | '30days' | 'all') => {
    setActivePreset(preset);
    const now = new Date();

    if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === '30days') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (kelasFilter !== 'all') params.append('kelas', kelasFilter);

      const res = await fetch(`/api/riwayat-login?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch riwayat login:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [startDate, endDate, statusFilter, kelasFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setStatusFilter('all');
    setKelasFilter('all');
    setActivePreset('all');
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = logs.map((l, index) => ({
      No: index + 1,
      NPM: l.npm,
      'Nama Mahasiswa': l.nama,
      'Kelas Reguler': l.kelas,
      'Kelas Pembekalan': l.nama_kelas_pembekalan,
      'Sesi Pembekalan': l.nama_sesi,
      'Waktu Login': new Date(l.waktu_login).toLocaleString('id-ID'),
      'Waktu Logout': l.waktu_logout ? new Date(l.waktu_logout).toLocaleString('id-ID') : 'Masih Online',
      'Durasi (Menit)': l.durasi_menit || '-',
      'IP Address': l.ip_address,
      Status: l.status.toUpperCase(),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RiwayatLogin');
    XLSX.writeFile(wb, `riwayat_akses_mahasiswa_${startDate || 'all'}_sd_${endDate || 'all'}.xlsx`);
  };

  // Unique kelas for filter
  const uniqueKelas = Array.from(new Set(logs.map((l) => l.kelas))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Riwayat & Log Akses Login Mahasiswa
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EEF0FD] text-[#525FE1]">
              {logs.length} Log Tercatat
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pantau riwayat login detail mahasiswa berdasarkan rentang waktu tertentu, sesi pembekalan, dan status sesi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="refresh-logs-btn"
            onClick={fetchLogs}
            className="p-2.5 text-slate-600 hover:text-[#525FE1] hover:bg-[#EEF0FD] rounded-xl border border-slate-200 transition cursor-pointer"
            title="Segarkan data log"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="export-riwayat-excel-btn"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor Riwayat (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Filter Card: Rentang Waktu Tertentu */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
            Rentang Waktu:
          </span>
          <button
            id="preset-all-btn"
            onClick={() => handleSetPreset('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activePreset === 'all'
                ? 'bg-[#525FE1] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Waktu
          </button>
          <button
            id="preset-today-btn"
            onClick={() => handleSetPreset('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activePreset === 'today'
                ? 'bg-[#525FE1] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hari Ini
          </button>
          <button
            id="preset-7days-btn"
            onClick={() => handleSetPreset('7days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activePreset === '7days'
                ? 'bg-[#525FE1] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            7 Hari Terakhir
          </button>
          <button
            id="preset-30days-btn"
            onClick={() => handleSetPreset('30days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activePreset === '30days'
                ? 'bg-[#525FE1] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            30 Hari Terakhir
          </button>
        </div>

        {/* Date Inputs & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* Dari Tanggal */}
          <div className="lg:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1" htmlFor="filter-start-date">
              Dari Tanggal (Mulai)
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="filter-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset('custom');
                }}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#525FE1] focus:outline-none bg-white"
              />
            </div>
          </div>

          {/* Sampai Tanggal */}
          <div className="lg:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1" htmlFor="filter-end-date">
              Sampai Tanggal (Selesai)
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="filter-end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset('custom');
                }}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#525FE1] focus:outline-none bg-white"
              />
            </div>
          </div>

          {/* Search text */}
          <div className="lg:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1" htmlFor="search-log-input">
              Pencarian NPM / Nama / Kelas
            </label>
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="search-log-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik lalu tekan Enter..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#525FE1] focus:outline-none"
              />
            </form>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1" htmlFor="filter-status-log">
              Status Akses
            </label>
            <select
              id="filter-status-log"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#525FE1] bg-white text-slate-700"
            >
              <option value="all">Semua Status</option>
              <option value="login">Masih Login (Online)</option>
              <option value="logout">Sudah Logout</option>
            </select>
          </div>

          {/* Reset */}
          <div className="lg:col-span-1">
            <button
              type="button"
              id="reset-filter-btn"
              onClick={handleResetFilter}
              className="w-full py-2 px-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer text-center"
              title="Reset semua filter"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table Logs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">NPM</th>
                <th className="py-3 px-4">Nama Mahasiswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Kelas Pembekalan</th>
                <th className="py-3 px-4">Sesi Terkait</th>
                <th className="py-3 px-4">Waktu Login</th>
                <th className="py-3 px-4">Waktu Logout</th>
                <th className="py-3 px-4">Durasi</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#525FE1]" />
                    Memuat riwayat log akses...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Tidak ada log aktivitas yang cocok dengan rentang waktu atau filter pencarian.
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-center font-medium text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{log.npm}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{log.nama}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                        {log.kelas}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{log.nama_kelas_pembekalan}</td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-semibold text-[#525FE1] bg-[#EEF0FD] px-2 py-0.5 rounded-md">
                        {log.nama_sesi}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-mono text-[11px]">
                      {new Date(log.waktu_login).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {log.waktu_logout ? (
                        new Date(log.waktu_logout).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      ) : (
                        <span className="text-emerald-600 font-bold">Sedang Aktif</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-semibold">
                      {log.durasi_menit ? `${log.durasi_menit} mnt` : '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {log.ip_address}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {log.status === 'login' || !log.waktu_logout ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Logout
                        </span>
                      )}
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
            Ditemukan <strong>{logs.length}</strong> catatan akses log
          </span>
          <span className="text-[11px]">
            {startDate || endDate
              ? `Rentang: ${startDate || 'Awal'} s/d ${endDate || 'Sekarang'}`
              : 'Menampilkan seluruh rentang riwayat'}
          </span>
        </div>
      </div>
    </div>
  );
};
