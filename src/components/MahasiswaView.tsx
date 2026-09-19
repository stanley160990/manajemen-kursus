import React, { useState, useEffect, useRef } from 'react';
import { Mahasiswa, KelasPembekalan, UserRole } from '../types.ts';
import * as XLSX from 'xlsx';
import {
  Users,
  Plus,
  Search,
  Upload,
  Download,
  FileSpreadsheet,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  FileUp,
  Filter,
  RefreshCw,
  Lock,
} from 'lucide-react';

interface MahasiswaViewProps {
  userRole: UserRole;
  refreshTrigger?: number;
}

export const MahasiswaView: React.FC<MahasiswaViewProps> = ({ userRole }) => {
  const [mahasiswaList, setMahasiswaList] = useState<Mahasiswa[]>([]);
  const [kelasList, setKelasList] = useState<KelasPembekalan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelasReguler, setFilterKelasReguler] = useState('all');
  const [filterKelasPembekalan, setFilterKelasPembekalan] = useState('all');

  // Form Modal State (Tambah / Ubah)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formNpm, setFormNpm] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formKelas, setFormKelas] = useState('');
  const [formKelasPembekalanId, setFormKelasPembekalanId] = useState<number>(1);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [deleteCandidate, setDeleteCandidate] = useState<Mahasiswa | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Upload XLSX Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = userRole === 'admin';

  // Load Data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resMhs, resKelas] = await Promise.all([
        fetch('/api/mahasiswa'),
        fetch('/api/referensi-kelas'),
      ]);

      const dataMhs = await resMhs.json();
      const dataKelas = await resKelas.json();

      if (dataMhs.success) setMahasiswaList(dataMhs.data || []);
      if (dataKelas.success) {
        setKelasList(dataKelas.data || []);
        if (dataKelas.data && dataKelas.data.length > 0 && !editingId) {
          setFormKelasPembekalanId(dataKelas.data[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter logic
  const uniqueKelasReguler = Array.from(new Set(mahasiswaList.map((m) => m.kelas))).filter(Boolean);

  const filteredMahasiswa = mahasiswaList.filter((m) => {
    const matchSearch =
      m.npm.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.kelas.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.nama_kelas_pembekalan && m.nama_kelas_pembekalan.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchKelas = filterKelasReguler === 'all' || m.kelas === filterKelasReguler;
    const matchPembekalan =
      filterKelasPembekalan === 'all' || String(m.kelas_pembekalan_id) === filterKelasPembekalan;

    return matchSearch && matchKelas && matchPembekalan;
  });

  // Open Modal Add
  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormNpm('');
    setFormNama('');
    setFormKelas('');
    if (kelasList.length > 0) setFormKelasPembekalanId(kelasList[0].id);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Modal Edit
  const handleOpenEditModal = (m: Mahasiswa) => {
    setEditingId(m.id);
    setFormNpm(m.npm);
    setFormNama(m.nama);
    setFormKelas(m.kelas);
    setFormKelasPembekalanId(m.kelas_pembekalan_id);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Submit Add / Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setFormSubmitting(true);
    setFormError(null);

    const payload = {
      npm: formNpm.trim(),
      nama: formNama.trim(),
      kelas: formKelas.trim().toUpperCase(),
      kelas_pembekalan_id: formKelasPembekalanId,
    };

    try {
      const url = editingId ? `/api/mahasiswa/${editingId}` : '/api/mahasiswa';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan data mahasiswa');
      }

      setIsModalOpen(false);
      setSuccessMessage(editingId ? 'Data mahasiswa berhasil diperbarui!' : 'Mahasiswa baru berhasil ditambahkan!');
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!deleteCandidate || !isAdmin) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/mahasiswa/${deleteCandidate.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': userRole,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menghapus mahasiswa');
      }

      setDeleteCandidate(null);
      setSuccessMessage(`Mahasiswa ${deleteCandidate.nama} berhasil dihapus.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Handle File Selection for Excel Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processExcelFile(file);
  };

  const processExcelFile = (file: File) => {
    setUploadFile(file);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setPreviewRows(data);
      } catch (err) {
        alert('Gagal membaca file Excel. Pastikan format file adalah .xlsx atau .xls.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Submit Excel Upload
  const handleUploadSubmit = async () => {
    if (!previewRows || previewRows.length === 0 || !isAdmin) return;

    setUploadLoading(true);
    setUploadResult(null);

    try {
      const res = await fetch('/api/mahasiswa/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole,
        },
        body: JSON.stringify({ items: previewRows }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengunggah data');
      }

      setUploadResult(data);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  // Export current list to Excel
  const handleExportExcel = () => {
    if (filteredMahasiswa.length === 0) {
      alert('Tidak ada data mahasiswa untuk diekspor.');
      return;
    }

    const selectedKelasObj = kelasList.find((k) => String(k.id) === filterKelasPembekalan);
    const sheetTitle = selectedKelasObj ? selectedKelasObj.nama_kelas.substring(0, 31) : 'DaftarMahasiswa';

    const exportData = filteredMahasiswa.map((m, index) => ({
      No: index + 1,
      NPM: m.npm,
      'Nama Mahasiswa': m.nama,
      'Kelas Reguler': m.kelas,
      'Kelas Pembekalan': m.nama_kelas_pembekalan || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 36 },
      { wch: 16 },
      { wch: 38 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);

    const filePrefix = selectedKelasObj
      ? `mahasiswa_${selectedKelasObj.nama_kelas.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`
      : 'daftar_seluruh_mahasiswa_pembekalan';

    XLSX.writeFile(wb, `${filePrefix}_${Date.now()}.xlsx`);
    setSuccessMessage(`Data Excel ${filteredMahasiswa.length} mahasiswa berhasil diunduh!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Manajemen Data Mahasiswa</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EEF0FD] text-[#525FE1]">
              {mahasiswaList.length} Mahasiswa
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kelola data identitas mahasiswa, kelas reguler, serta penempatan kelas pembekalan.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh */}
          <button
            id="refresh-mahasiswa-btn"
            onClick={fetchData}
            className="p-2.5 text-slate-600 hover:text-[#525FE1] hover:bg-[#EEF0FD] rounded-xl border border-slate-200 transition cursor-pointer"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Download Sample Template */}
          <a
            id="download-template-link"
            href="/api/mahasiswa/template-xlsx"
            download="template_data_mahasiswa.xlsx"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition"
            title="Download Template Format Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Template Excel</span>
          </a>

          {/* Export to Excel */}
          <button
            id="export-excel-btn"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer"
            title="Ekspor ke Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor (.xlsx)</span>
          </button>

          {/* Upload XLSX (Admin Only) */}
          {isAdmin ? (
            <button
              id="upload-xlsx-btn"
              onClick={() => {
                setUploadFile(null);
                setPreviewRows([]);
                setUploadResult(null);
                setIsUploadModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload XLSX</span>
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-xl cursor-not-allowed"
              title="Akses terbatas untuk Administrator"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Upload XLSX</span>
            </div>
          )}

          {/* Tambah Mahasiswa (Admin Only) */}
          {isAdmin ? (
            <button
              id="add-mahasiswa-btn"
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#525FE1] hover:bg-[#434ecb] rounded-xl shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Mahasiswa</span>
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-xl cursor-not-allowed"
              title="Akses terbatas untuk Administrator"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Tambah (Admin)</span>
            </div>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search and Filters Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            id="search-mahasiswa-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari NPM, Nama, atau Kelas..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#525FE1] focus:border-transparent"
          />
        </div>

        <div className="md:col-span-3">
          <select
            id="filter-kelas-reguler"
            value={filterKelasReguler}
            onChange={(e) => setFilterKelasReguler(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#525FE1] bg-white text-slate-700"
          >
            <option value="all">Semua Kelas Reguler</option>
            {uniqueKelasReguler.map((k) => (
              <option key={k} value={k}>
                Kelas {k}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4">
          <select
            id="filter-kelas-pembekalan"
            value={filterKelasPembekalan}
            onChange={(e) => setFilterKelasPembekalan(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#525FE1] bg-white text-slate-700"
          >
            <option value="all">Semua Kelas Pembekalan</option>
            {kelasList.map((k) => (
              <option key={k.id} value={String(k.id)}>
                {k.nama_kelas}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Asisten Read-Only Notice */}
      {!isAdmin && (
        <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Mode Asisten:</strong> Anda sedang melihat data dalam mode baca (Read-Only). Fitur tambah, edit, hapus, dan import XLSX hanya dapat dilakukan oleh akun Administrator.
          </span>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">NPM</th>
                <th className="py-3 px-4">Nama Mahasiswa</th>
                <th className="py-3 px-4">Kelas Reguler</th>
                <th className="py-3 px-4">Kelas Pembekalan Terdaftar</th>
                <th className="py-3 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#525FE1]" />
                    Memuat data mahasiswa...
                  </td>
                </tr>
              ) : filteredMahasiswa.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Tidak ada data mahasiswa yang cocok dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredMahasiswa.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-center font-medium text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{m.npm}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{m.nama}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                        {m.kelas}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EEF0FD] text-[#525FE1] font-semibold text-[11px] border border-[#D0D5FA]">
                        {m.nama_kelas_pembekalan || 'Belum Terdaftar'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isAdmin ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            id={`edit-mhs-${m.id}`}
                            onClick={() => handleOpenEditModal(m)}
                            className="p-1.5 text-slate-600 hover:text-[#525FE1] hover:bg-[#EEF0FD] rounded-lg transition cursor-pointer"
                            title="Ubah data"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`delete-mhs-${m.id}`}
                            onClick={() => setDeleteCandidate(m)}
                            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Hapus data"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Lihat Saja</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3.5 bg-slate-50/60 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Menampilkan <strong>{filteredMahasiswa.length}</strong> dari <strong>{mahasiswaList.length}</strong> mahasiswa
          </span>
          <span className="text-[11px]">Tersimpan di Database PostgreSQL</span>
        </div>
      </div>

      {/* MODAL TAMBAH / UBAH MAHASISWA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 bg-[#525FE1] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingId ? 'Ubah Data Mahasiswa' : 'Tambah Mahasiswa Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="mhs-npm">
                  NPM (Nomor Pokok Mahasiswa) <span className="text-red-500">*</span>
                </label>
                <input
                  id="mhs-npm"
                  type="text"
                  required
                  value={formNpm}
                  onChange={(e) => setFormNpm(e.target.value)}
                  placeholder="Contoh: 50421001"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#525FE1] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="mhs-nama">
                  Nama Lengkap Mahasiswa <span className="text-red-500">*</span>
                </label>
                <input
                  id="mhs-nama"
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: Aditya Pratama Putra"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#525FE1] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="mhs-kelas">
                  Kelas Reguler <span className="text-red-500">*</span>
                </label>
                <input
                  id="mhs-kelas"
                  type="text"
                  required
                  value={formKelas}
                  onChange={(e) => setFormKelas(e.target.value)}
                  placeholder="Contoh: 4IA01, 3KA02"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#525FE1] focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="mhs-pembekalan">
                  Pilihan Kelas Pembekalan (Referensi) <span className="text-red-500">*</span>
                </label>
                <select
                  id="mhs-pembekalan"
                  value={formKelasPembekalanId}
                  onChange={(e) => setFormKelasPembekalanId(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#525FE1] focus:outline-none bg-white text-slate-800"
                >
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama_kelas} (Kuota: {k.kuota || 40})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Data kelas pembekalan disinkronkan dari Modul Manajemen Referensi.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="save-mahasiswa-btn"
                  disabled={formSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#525FE1] hover:bg-[#434ecb] rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Mahasiswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Hapus Data Mahasiswa?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Apakah Anda yakin ingin menghapus mahasiswa <strong>{deleteCandidate.nama}</strong> ({deleteCandidate.npm})? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                id="confirm-delete-btn"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UPLOAD XLSX */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Upload Data Mahasiswa (.xlsx)</h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-white/80 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#525FE1] rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50 hover:bg-[#EEF0FD]/30"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileUp className="w-10 h-10 text-[#525FE1] mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">
                  {uploadFile ? uploadFile.name : 'Klik untuk memilih file Excel (.xlsx / .xls)'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Format kolom wajib: <strong>NPM</strong>, <strong>Nama</strong>, <strong>Kelas</strong>, dan <strong>Kelas Pembekalan</strong> (opsional).
                </p>
              </div>

              {/* Upload Result message */}
              {uploadResult && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-medium ${
                    uploadResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  <p className="font-bold">{uploadResult.message}</p>
                  {uploadResult.details?.errors && uploadResult.details.errors.length > 0 && (
                    <ul className="list-disc pl-4 mt-2 space-y-1 text-[11px] text-red-700">
                      {uploadResult.details.errors.slice(0, 5).map((e: string, i: number) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Preview Table */}
              {previewRows.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">
                      Pratinjau Data ({previewRows.length} baris terdeteksi):
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Hanya 5 baris pertama ditampilkan
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2">NPM</th>
                          <th className="p-2">Nama</th>
                          <th className="p-2">Kelas</th>
                          <th className="p-2">Kelas Pembekalan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewRows.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            <td className="p-2 font-mono">{row.NPM || row.npm || '-'}</td>
                            <td className="p-2 font-medium">{row.Nama || row.nama || '-'}</td>
                            <td className="p-2">{row.Kelas || row.kelas || '-'}</td>
                            <td className="p-2">{row['Kelas Pembekalan'] || row.kelas_pembekalan || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <a
                href="/api/mahasiswa/template-xlsx"
                download="template_data_mahasiswa.xlsx"
                className="text-xs text-[#525FE1] hover:underline font-semibold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Download format contoh
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  id="process-upload-btn"
                  onClick={handleUploadSubmit}
                  disabled={previewRows.length === 0 || uploadLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#525FE1] hover:bg-[#434ecb] rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {uploadLoading ? 'Memproses ke PostgreSQL...' : `Impor ${previewRows.length} Mahasiswa`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
