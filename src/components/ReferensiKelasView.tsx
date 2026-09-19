import React, { useState, useEffect } from 'react';
import { KelasPembekalan, SesiPembekalan, Mahasiswa, UserRole } from '../types.ts';
import {
  CalendarDays,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Clock,
  MapPin,
  User as UserIcon,
  Users,
  AlertCircle,
  CheckCircle2,
  X,
  Lock,
  Layers,
  ChevronDown,
  ChevronUp,
  FileDown,
  FileSpreadsheet,
} from 'lucide-react';
import { exportJadwalPerKelasPDF, exportJadwalSemuaKelasPDF } from '../utils/pdfGenerator.ts';
import { exportJadwalPerKelasExcel, exportSemuaKelasExcel } from '../utils/excelGenerator.ts';

interface ReferensiKelasViewProps {
  userRole: UserRole;
  onRefreshTrigger?: () => void;
}

const HARI_OPTIONS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function getDayNameFromDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  const dayIndex = d.getDay();
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return dayNames[dayIndex] || '';
}

export const ReferensiKelasView: React.FC<ReferensiKelasViewProps> = ({ userRole, onRefreshTrigger }) => {
  const [kelasList, setKelasList] = useState<KelasPembekalan[]>([]);
  const [mahasiswaList, setMahasiswaList] = useState<Mahasiswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Expanded card IDs
  const [expandedIds, setExpandedIds] = useState<number[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formNamaKelas, setFormNamaKelas] = useState('');
  const [formDeskripsi, setFormDeskripsi] = useState('');
  const [formKuota, setFormKuota] = useState<number>(40);
  const [formSesiList, setFormSesiList] = useState<
    Array<{
      nama_sesi: string;
      tanggal?: string;
      hari: string;
      jam_mulai: string;
      jam_selesai: string;
      ruangan: string;
      instruktur: string;
      asisten: string[];
    }>
  >([]);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal
  const [deleteCandidate, setDeleteCandidate] = useState<KelasPembekalan | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = userRole === 'admin';

  const fetchReferensi = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resKelas, resMhs] = await Promise.all([
        fetch('/api/referensi-kelas'),
        fetch('/api/mahasiswa'),
      ]);
      const dataKelas = await resKelas.json();
      const dataMhs = await resMhs.json();

      if (dataKelas.success) {
        setKelasList(dataKelas.data || []);
        // Expand all by default
        setExpandedIds((dataKelas.data || []).map((k: KelasPembekalan) => k.id));
      } else {
        throw new Error(dataKelas.error);
      }

      if (dataMhs.success) {
        setMahasiswaList(dataMhs.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat referensi kelas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferensi();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Open modal Add
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormNamaKelas('');
    setFormDeskripsi('');
    setFormKuota(40);
    const todayStr = new Date().toISOString().split('T')[0];
    const derivedDay = getDayNameFromDate(todayStr) || 'Senin';
    setFormSesiList([
      {
        nama_sesi: 'Sesi 1: Materi Pengantar',
        tanggal: todayStr,
        hari: derivedDay,
        jam_mulai: '08:00',
        jam_selesai: '10:00',
        ruangan: 'Lab Komputer 1',
        instruktur: 'Instruktur Lab',
        asisten: [],
      },
    ]);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal Edit
  const handleOpenEdit = (k: KelasPembekalan) => {
    setEditingId(k.id);
    setFormNamaKelas(k.nama_kelas);
    setFormDeskripsi(k.deskripsi || '');
    setFormKuota(k.kuota || 40);
    setFormSesiList(
      (k.sesi_list || []).map((s) => ({
        nama_sesi: s.nama_sesi,
        tanggal: s.tanggal || '',
        hari: s.hari,
        jam_mulai: s.jam_mulai,
        jam_selesai: s.jam_selesai,
        ruangan: s.ruangan || '',
        instruktur: s.instruktur || '',
        asisten: Array.isArray(s.asisten) ? [...s.asisten] : [],
      }))
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  // Dynamic Session builder helpers
  const handleAddSesiRow = () => {
    const nextIndex = formSesiList.length + 1;
    setFormSesiList([
      ...formSesiList,
      {
        nama_sesi: `Sesi ${nextIndex}: Materi Lanjutan`,
        tanggal: '',
        hari: 'Rabu',
        jam_mulai: '10:00',
        jam_selesai: '12:00',
        ruangan: 'Lab Komputer 2',
        instruktur: '',
        asisten: [],
      },
    ]);
  };

  const handleRemoveSesiRow = (index: number) => {
    setFormSesiList(formSesiList.filter((_, i) => i !== index));
  };

  const handleUpdateSesiRow = (index: number, field: string, value: string) => {
    const updated = [...formSesiList];
    if (field === 'tanggal') {
      const derivedDay = getDayNameFromDate(value);
      updated[index] = {
        ...updated[index],
        tanggal: value,
        ...(derivedDay ? { hari: derivedDay } : {}),
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setFormSesiList(updated);
  };

  // Asisten helpers per sesi (Maksimal 4 asisten, bisa dikosongkan)
  const handleAddAsisten = (sesiIndex: number) => {
    const current = formSesiList[sesiIndex].asisten || [];
    if (current.length >= 4) return;
    const updated = [...formSesiList];
    updated[sesiIndex] = {
      ...updated[sesiIndex],
      asisten: [...current, ''],
    };
    setFormSesiList(updated);
  };

  const handleRemoveAsisten = (sesiIndex: number, asistenIndex: number) => {
    const updated = [...formSesiList];
    const current = updated[sesiIndex].asisten || [];
    updated[sesiIndex] = {
      ...updated[sesiIndex],
      asisten: current.filter((_, idx) => idx !== asistenIndex),
    };
    setFormSesiList(updated);
  };

  const handleUpdateAsisten = (sesiIndex: number, asistenIndex: number, value: string) => {
    const updated = [...formSesiList];
    const current = [...(updated[sesiIndex].asisten || [])];
    current[asistenIndex] = value;
    updated[sesiIndex] = {
      ...updated[sesiIndex],
      asisten: current,
    };
    setFormSesiList(updated);
  };

  // Submit Add / Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    if (!formNamaKelas.trim()) {
      setFormError('Nama Kelas Pembekalan wajib diisi.');
      return;
    }

    if (formSesiList.length === 0) {
      setFormError('Minimal harus ada 1 sesi pembekalan yang dikonfigurasi.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    const payload = {
      nama_kelas: formNamaKelas.trim(),
      deskripsi: formDeskripsi.trim(),
      kuota: formKuota,
      sesi_list: formSesiList.map((s) => ({
        ...s,
        asisten: (s.asisten || []).map((a) => a.trim()).filter(Boolean).slice(0, 4),
      })),
    };

    try {
      const url = editingId ? `/api/referensi-kelas/${editingId}` : '/api/referensi-kelas';
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
        throw new Error(data.error || 'Gagal menyimpan data');
      }

      setIsModalOpen(false);
      setSuccessMessage(editingId ? 'Referensi kelas & jadwal berhasil diperbarui!' : 'Kelas pembekalan baru berhasil dibuat!');
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchReferensi();
      if (onRefreshTrigger) onRefreshTrigger();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete
  const handleConfirmDelete = async () => {
    if (!deleteCandidate || !isAdmin) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/referensi-kelas/${deleteCandidate.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': userRole,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menghapus kelas');
      }

      setDeleteCandidate(null);
      setSuccessMessage(`Kelas pembekalan ${deleteCandidate.nama_kelas} berhasil dihapus.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchReferensi();
      if (onRefreshTrigger) onRefreshTrigger();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Manajemen Data Referensi Kelas & Jadwal Sesi
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EEF0FD] text-[#525FE1]">
              {kelasList.length} Kelas Pembekalan
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi nama kelas dan jadwal sesi dinamis setiap harinya. Referensi ini otomatis muncul pada pilihan pendaftaran mahasiswa.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Download Excel Seluruh Kelas */}
          <button
            id="download-all-jadwal-excel-btn"
            onClick={() => {
              if (kelasList.length === 0) {
                alert('Belum ada data kelas pembekalan untuk diekspor ke Excel.');
                return;
              }
              exportSemuaKelasExcel(kelasList, mahasiswaList);
              setSuccessMessage('File Excel (.xlsx) Seluruh Kelas & Jadwal Pembekalan berhasil diunduh!');
              setTimeout(() => setSuccessMessage(null), 3500);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-300/80 rounded-xl transition cursor-pointer shadow-2xs"
            title="Unduh File Excel (.xlsx) Seluruh Kelas & Jadwal Pembekalan"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Unduh Excel Seluruh Jadwal</span>
          </button>

          {/* Download PDF Seluruh Kelas */}
          <button
            id="download-all-jadwal-pdf-btn"
            onClick={() => {
              if (kelasList.length === 0) {
                alert('Belum ada data kelas pembekalan untuk diunduh.');
                return;
              }
              exportJadwalSemuaKelasPDF(kelasList);
              setSuccessMessage('PDF Jadwal Keseluruhan Pembekalan berhasil diunduh.');
              setTimeout(() => setSuccessMessage(null), 3500);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-[#525FE1] bg-slate-50 hover:bg-[#EEF0FD] border border-slate-200 rounded-xl transition cursor-pointer shadow-2xs"
            title="Unduh PDF Jadwal Keseluruhan Pembekalan"
          >
            <FileDown className="w-4 h-4 text-[#525FE1]" />
            <span>Unduh PDF Seluruh Jadwal</span>
          </button>

          {isAdmin ? (
            <button
              id="add-referensi-btn"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#525FE1] hover:bg-[#434ecb] rounded-xl shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kelas & Sesi Baru</span>
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-xl cursor-not-allowed"
              title="Akses terbatas untuk Administrator"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Tambah Kelas (Admin)</span>
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

      {/* Role Notice */}
      {!isAdmin && (
        <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Mode Asisten:</strong> Anda dapat melihat seluruh daftar referensi kelas dan konfigurasi jadwal sesi. Penambahan atau perubahan jadwal hanya dapat dilakukan oleh Admin.
          </span>
        </div>
      )}

      {/* Cards List */}
      <div className="grid grid-cols-1 gap-4">
        {kelasList.map((k) => {
          const isExpanded = expandedIds.includes(k.id);
          const sesiList = k.sesi_list || [];

          return (
            <div
              key={k.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all"
            >
              {/* Card Header */}
              <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EEF0FD] text-[#525FE1] flex items-center justify-center shrink-0 mt-0.5">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">{k.nama_kelas}</h3>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700">
                        Kuota: {k.kuota || 40} Mahasiswa
                      </span>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-[#EEF0FD] text-[#525FE1]">
                        Terisi: {k.jumlah_mahasiswa || 0} Mahasiswa
                      </span>
                    </div>
                    {k.deskripsi && (
                      <p className="text-xs text-slate-500 mt-1 max-w-2xl">{k.deskripsi}</p>
                    )}
                  </div>
                </div>

                {/* Actions & Accordion Toggle */}
                <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
                  {/* Export Excel Per Kelas */}
                  <button
                    id={`download-excel-kelas-${k.id}`}
                    onClick={() => {
                      exportJadwalPerKelasExcel(k, mahasiswaList);
                      setSuccessMessage(`File Excel (.xlsx) kelas "${k.nama_kelas}" berhasil diunduh (Jadwal, Tim Asisten & Mahasiswa).`);
                      setTimeout(() => setSuccessMessage(null), 3500);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100/90 rounded-xl border border-emerald-300/80 transition cursor-pointer shadow-2xs"
                    title={`Unduh Data Excel (.xlsx) untuk kelas ${k.nama_kelas}`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Excel Kelas</span>
                  </button>

                  {/* Export PDF Per Kelas */}
                  <button
                    id={`download-pdf-kelas-${k.id}`}
                    onClick={() => {
                      exportJadwalPerKelasPDF(k);
                      setSuccessMessage(`PDF Jadwal kelas "${k.nama_kelas}" berhasil diunduh.`);
                      setTimeout(() => setSuccessMessage(null), 3500);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-[#525FE1] hover:bg-[#EEF0FD] rounded-xl border border-slate-200 transition cursor-pointer shadow-2xs"
                    title={`Unduh Jadwal PDF untuk kelas ${k.nama_kelas}`}
                  >
                    <FileDown className="w-3.5 h-3.5 text-[#525FE1]" />
                    <span>PDF Jadwal</span>
                  </button>

                  {isAdmin && (
                    <>
                      <button
                        id={`edit-ref-${k.id}`}
                        onClick={() => handleOpenEdit(k)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-[#525FE1] hover:bg-[#EEF0FD] rounded-xl border border-slate-200 transition cursor-pointer"
                        title="Ubah Kelas & Sesi"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        id={`delete-ref-${k.id}`}
                        onClick={() => setDeleteCandidate(k)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition cursor-pointer"
                        title="Hapus Kelas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => toggleExpand(k.id)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    title={isExpanded ? 'Tutup Rincian Sesi' : 'Buka Rincian Sesi'}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Sessions Details */}
              {isExpanded && (
                <div className="p-5 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-[#525FE1]" />
                      Jadwal Sesi Pembekalan Fleksibel ({sesiList.length} Sesi Terkonfigurasi)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Waktu & hari dapat dikonfigurasi secara dinamis oleh Admin
                    </span>
                  </div>

                  {sesiList.length === 0 ? (
                    <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                      Belum ada sesi yang dikonfigurasi untuk kelas ini.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {sesiList.map((sesi, sIdx) => (
                        <div
                          key={sesi.id || sIdx}
                          className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:border-[#D0D5FA] transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-xs text-slate-900 line-clamp-1">
                                {sesi.nama_sesi}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EEF0FD] text-[#525FE1]">
                                {sesi.hari}
                              </span>
                            </div>

                            <div className="space-y-1.5 text-[11px] text-slate-600 mt-2">
                              {sesi.tanggal && (
                                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                                  <Calendar className="w-3.5 h-3.5 text-[#525FE1]" />
                                  <span>{formatDisplayDate(sesi.tanggal)}</span>
                                </div>
                              )}

                              <div className="flex items-center gap-1.5 font-medium">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>
                                  {sesi.jam_mulai} - {sesi.jam_selesai} WIB
                                </span>
                              </div>

                              {sesi.ruangan && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{sesi.ruangan}</span>
                                </div>
                              )}

                              {sesi.instruktur && (
                                <div className="flex items-center gap-1.5">
                                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="line-clamp-1">{sesi.instruktur}</span>
                                </div>
                              )}
                            </div>

                            {/* Tim Asisten Sesi (Maksimal 4, Bisa Dikosongkan) */}
                            <div className="mt-2.5 pt-2 border-t border-slate-100">
                              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600 mb-1">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3 text-[#525FE1]" />
                                  Tim Asisten
                                </span>
                                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold">
                                  {(sesi.asisten || []).length}/4
                                </span>
                              </div>
                              {sesi.asisten && sesi.asisten.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {sesi.asisten.map((as, aIdx) => (
                                    <span
                                      key={aIdx}
                                      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[#EEF0FD] text-[#525FE1] border border-[#D0D5FA]/60"
                                    >
                                      {as}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10.5px] text-slate-400 italic">
                                  Asisten: (Dikosongkan)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL TAMBAH / UBAH KELAS & SESI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-3xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-[#525FE1] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingId ? 'Ubah Konfigurasi Kelas & Sesi' : 'Tambah Referensi Kelas Pembekalan Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Data Utama Kelas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="ref-nama-kelas">
                    Nama Kelas Pembekalan <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="ref-nama-kelas"
                    type="text"
                    required
                    value={formNamaKelas}
                    onChange={(e) => setFormNamaKelas(e.target.value)}
                    placeholder="Contoh: Web Development & Cloud Computing"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#525FE1] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="ref-kuota">
                    Kuota Mahasiswa
                  </label>
                  <input
                    id="ref-kuota"
                    type="number"
                    min={1}
                    max={200}
                    value={formKuota}
                    onChange={(e) => setFormKuota(parseInt(e.target.value, 10) || 40)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#525FE1] focus:outline-none"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="ref-deskripsi">
                    Deskripsi / Silabus Singkat
                  </label>
                  <textarea
                    id="ref-deskripsi"
                    rows={2}
                    value={formDeskripsi}
                    onChange={(e) => setFormDeskripsi(e.target.value)}
                    placeholder="Deskripsi materi pembekalan, tujuan pembelajaran..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#525FE1] focus:outline-none"
                  />
                </div>
              </div>

              {/* Dynamic Sesi List */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Konfigurasi Sesi Setiap Hari (Fleksibel & Dinamis)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Tentukan hari sesi, rentang waktu jam mulai/selesai, ruangan, serta instruktur.
                    </p>
                  </div>
                  <button
                    type="button"
                    id="add-sesi-row-btn"
                    onClick={handleAddSesiRow}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#525FE1] bg-[#EEF0FD] hover:bg-[#D0D5FA] rounded-xl transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah Baris Sesi</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formSesiList.map((sesi, index) => (
                    <div
                      key={index}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 relative space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">
                          Sesi #{index + 1}
                        </span>
                        {formSesiList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSesiRow(index)}
                            className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 text-xs">
                        <div className="md:col-span-4">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Nama Sesi <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={sesi.nama_sesi}
                            onChange={(e) => handleUpdateSesiRow(index, 'nama_sesi', e.target.value)}
                            placeholder="Misal: Sesi 1: REST API"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#525FE1]" />
                            <span>Tanggal</span>
                          </label>
                          <input
                            type="date"
                            value={sesi.tanggal || ''}
                            onChange={(e) => handleUpdateSesiRow(index, 'tanggal', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Hari
                          </label>
                          <select
                            value={sesi.hari}
                            onChange={(e) => handleUpdateSesiRow(index, 'hari', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800"
                          >
                            {HARI_OPTIONS.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Ruangan / Lab
                          </label>
                          <input
                            type="text"
                            value={sesi.ruangan}
                            onChange={(e) => handleUpdateSesiRow(index, 'ruangan', e.target.value)}
                            placeholder="Lab 1"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Jam Mulai (WIB)
                          </label>
                          <input
                            type="time"
                            required
                            value={sesi.jam_mulai}
                            onChange={(e) => handleUpdateSesiRow(index, 'jam_mulai', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Jam Selesai (WIB)
                          </label>
                          <input
                            type="time"
                            required
                            value={sesi.jam_selesai}
                            onChange={(e) => handleUpdateSesiRow(index, 'jam_selesai', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                          />
                        </div>

                        <div className="md:col-span-6">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Instruktur / Pemateri (Opsional)
                          </label>
                          <input
                            type="text"
                            value={sesi.instruktur}
                            onChange={(e) => handleUpdateSesiRow(index, 'instruktur', e.target.value)}
                            placeholder="Nama Dosen / Instruktur Laboratorium"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                          />
                        </div>

                        {/* Asisten Sesi (Maksimal 4 Asisten, Bisa Dikosongkan) */}
                        <div className="md:col-span-12 bg-white p-3 rounded-xl border border-slate-200 mt-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-[#525FE1]" />
                              <span className="text-[11px] font-bold text-slate-800">
                                Asisten Sesi ({sesi.asisten?.length || 0}/4)
                              </span>
                              <span className="text-[10.5px] text-slate-400">
                                — Maks. 4 orang, bisa dikosongkan
                              </span>
                            </div>
                            {(sesi.asisten?.length || 0) < 4 && (
                              <button
                                type="button"
                                onClick={() => handleAddAsisten(index)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#525FE1] bg-[#EEF0FD] hover:bg-[#D0D5FA] rounded-lg transition cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Tambah Asisten</span>
                              </button>
                            )}
                          </div>

                          {(!sesi.asisten || sesi.asisten.length === 0) ? (
                            <p className="text-[11px] text-slate-400 italic py-1">
                              Belum ada asisten ditugaskan untuk sesi ini (opsional / bisa dikosongkan).
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {sesi.asisten.map((as, aIdx) => (
                                <div
                                  key={aIdx}
                                  className="flex items-center gap-1.5 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200"
                                >
                                  <span className="text-[10px] font-bold text-slate-500 w-4 text-center shrink-0">
                                    #{aIdx + 1}
                                  </span>
                                  <input
                                    type="text"
                                    value={as}
                                    onChange={(e) => handleUpdateAsisten(index, aIdx, e.target.value)}
                                    placeholder={`Nama Asisten ${aIdx + 1} (misal: Rian H.)`}
                                    className="w-full text-xs px-2 py-1 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#525FE1]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAsisten(index, aIdx)}
                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition shrink-0 cursor-pointer"
                                    title="Hapus asisten ini"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="save-referensi-btn"
                  disabled={formSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#525FE1] hover:bg-[#434ecb] rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Buat Kelas & Sesi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DELETE */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Hapus Referensi Kelas?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Apakah Anda yakin ingin menghapus kelas <strong>{deleteCandidate.nama_kelas}</strong> beserta seluruh jadwal sesinya?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                id="confirm-delete-ref-btn"
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
    </div>
  );
};
