import * as XLSX from 'xlsx';
import { KelasPembekalan, Mahasiswa } from '../types.ts';

/**
 * Format tanggal dalam Bahasa Indonesia
 */
function getFormattedDateTime(): string {
  const date = new Date();
  return (
    date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB'
  );
}

/**
 * Ekspor Data Excel untuk SATU Kelas Pembekalan Spesifik
 * Berisi Sheet Jadwal Sesi (lengkap dengan instruktur & tim asisten maks 4),
 * Sheet Daftar Mahasiswa Terdaftar, dan Sheet Informasi Ringkasan Kelas.
 */
export function exportJadwalPerKelasExcel(kelas: KelasPembekalan, mahasiswaList?: Mahasiswa[]) {
  const wb = XLSX.utils.book_new();
  const sesiList = kelas.sesi_list || [];

  // Filter mahasiswa yang terdaftar pada kelas pembekalan ini jika ada
  const enrolledMahasiswa = mahasiswaList
    ? mahasiswaList.filter((m) => m.kelas_pembekalan_id === kelas.id)
    : [];

  // -------------------------------------------------------------
  // Sheet 1: Jadwal Sesi Pembekalan
  // -------------------------------------------------------------
  const sesiRows = sesiList.map((s, idx) => {
    const asistenArr = Array.isArray(s.asisten) ? s.asisten : [];
    return {
      'No': idx + 1,
      'Nama Kelas Pembekalan': kelas.nama_kelas,
      'Nama Sesi Pembekalan': s.nama_sesi,
      'Tanggal': s.tanggal || '-',
      'Hari': s.hari,
      'Jam Mulai': s.jam_mulai,
      'Jam Selesai': s.jam_selesai,
      'Waktu Pelaksanaan': `${s.jam_mulai} - ${s.jam_selesai} WIB`,
      'Ruangan / Lab': s.ruangan || 'Lab Komputer',
      'Instruktur / Pemateri': s.instruktur || '-',
      'Tim Asisten (Maks. 4)': asistenArr.length > 0 ? asistenArr.join(', ') : '(Dikosongkan)',
      'Asisten 1': asistenArr[0] || '-',
      'Asisten 2': asistenArr[1] || '-',
      'Asisten 3': asistenArr[2] || '-',
      'Asisten 4': asistenArr[3] || '-',
      'Total Asisten': asistenArr.length > 0 ? `${asistenArr.length} Orang` : '0 (Dikosongkan)',
    };
  });

  const wsSesi = XLSX.utils.json_to_sheet(
    sesiRows.length > 0
      ? sesiRows
      : [
          {
            'No': 1,
            'Nama Kelas Pembekalan': kelas.nama_kelas,
            'Nama Sesi Pembekalan': 'Belum ada sesi dikonfigurasi',
            'Tanggal': '-',
            'Hari': '-',
            'Jam Mulai': '-',
            'Jam Selesai': '-',
            'Waktu Pelaksanaan': '-',
            'Ruangan / Lab': '-',
            'Instruktur / Pemateri': '-',
            'Tim Asisten (Maks. 4)': '-',
            'Asisten 1': '-',
            'Asisten 2': '-',
            'Asisten 3': '-',
            'Asisten 4': '-',
            'Total Asisten': '-',
          },
        ]
  );

  // Lebar kolom rapi
  wsSesi['!cols'] = [
    { wch: 6 },  // No
    { wch: 36 }, // Nama Kelas
    { wch: 28 }, // Nama Sesi
    { wch: 14 }, // Hari
    { wch: 12 }, // Jam Mulai
    { wch: 12 }, // Jam Selesai
    { wch: 22 }, // Waktu Pelaksanaan
    { wch: 20 }, // Ruangan
    { wch: 30 }, // Instruktur
    { wch: 38 }, // Tim Asisten
    { wch: 20 }, // Asisten 1
    { wch: 20 }, // Asisten 2
    { wch: 20 }, // Asisten 3
    { wch: 20 }, // Asisten 4
    { wch: 18 }, // Total Asisten
  ];

  XLSX.utils.book_append_sheet(wb, wsSesi, 'Jadwal Sesi Pembekalan');

  // -------------------------------------------------------------
  // Sheet 2: Daftar Mahasiswa Terdaftar
  // -------------------------------------------------------------
  const mhsRows = enrolledMahasiswa.map((m, idx) => ({
    'No': idx + 1,
    'NPM': m.npm,
    'Nama Lengkap Mahasiswa': m.nama,
    'Kelas Reguler': m.kelas,
    'Kelas Pembekalan': kelas.nama_kelas,
    'Status': 'Terdaftar Aktif',
  }));

  const wsMhs = XLSX.utils.json_to_sheet(
    mhsRows.length > 0
      ? mhsRows
      : [
          {
            'No': '-',
            'NPM': '-',
            'Nama Lengkap Mahasiswa': 'Belum ada data mahasiswa terdaftar di kelas ini',
            'Kelas Reguler': '-',
            'Kelas Pembekalan': kelas.nama_kelas,
            'Status': `Kuota: ${kelas.kuota || 40} Mahasiswa`,
          },
        ]
  );

  wsMhs['!cols'] = [
    { wch: 6 },  // No
    { wch: 16 }, // NPM
    { wch: 36 }, // Nama Lengkap
    { wch: 16 }, // Kelas Reguler
    { wch: 36 }, // Kelas Pembekalan
    { wch: 24 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, wsMhs, 'Daftar Mahasiswa');

  // -------------------------------------------------------------
  // Sheet 3: Ringkasan Informasi Kelas
  // -------------------------------------------------------------
  const ringkasanData = [
    { 'Parameter': 'Nama Kelas Pembekalan', 'Keterangan': kelas.nama_kelas },
    { 'Parameter': 'Deskripsi Materi', 'Keterangan': kelas.deskripsi || '-' },
    { 'Parameter': 'Kuota Maksimal', 'Keterangan': `${kelas.kuota || 40} Mahasiswa` },
    { 'Parameter': 'Jumlah Mahasiswa Terdaftar', 'Keterangan': `${enrolledMahasiswa.length || kelas.jumlah_mahasiswa || 0} Mahasiswa` },
    {
      'Parameter': 'Sisa Kuota Tersedia',
      'Keterangan': `${Math.max(0, (kelas.kuota || 40) - (enrolledMahasiswa.length || kelas.jumlah_mahasiswa || 0))} Mahasiswa`,
    },
    { 'Parameter': 'Jumlah Sesi Terjadwal', 'Keterangan': `${sesiList.length} Sesi` },
    { 'Parameter': 'Waktu Pengunduhan Data', 'Keterangan': getFormattedDateTime() },
  ];

  const wsRingkasan = XLSX.utils.json_to_sheet(ringkasanData);
  wsRingkasan['!cols'] = [{ wch: 30 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsRingkasan, 'Informasi Kelas');

  // Generate & trigger download
  const cleanName = kelas.nama_kelas.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const filename = `jadwal_kelas_${cleanName}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Ekspor Data Excel untuk SELURUH Kelas Pembekalan
 * Berisi Sheet Ringkasan Semua Kelas, Sheet Jadwal Seluruh Sesi, dan Sheet Seluruh Mahasiswa.
 */
export function exportSemuaKelasExcel(kelasList: KelasPembekalan[], mahasiswaList?: Mahasiswa[]) {
  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // Sheet 1: Ringkasan Seluruh Kelas Pembekalan
  // -------------------------------------------------------------
  const summaryRows = kelasList.map((k, idx) => {
    const totalSesi = (k.sesi_list || []).length;
    const enrolledCount = mahasiswaList
      ? mahasiswaList.filter((m) => m.kelas_pembekalan_id === k.id).length
      : k.jumlah_mahasiswa || 0;
    const kuota = k.kuota || 40;
    const sisa = Math.max(0, kuota - enrolledCount);

    return {
      'No': idx + 1,
      'Nama Kelas Pembekalan': k.nama_kelas,
      'Deskripsi': k.deskripsi || '-',
      'Kuota Maksimal': kuota,
      'Mahasiswa Terdaftar': enrolledCount,
      'Sisa Kuota': sisa,
      'Persentase Terisi': `${Math.round((enrolledCount / kuota) * 100)}%`,
      'Jumlah Sesi': totalSesi,
      'Status': enrolledCount >= kuota ? 'KUOTA PENUH' : 'TERSEDIA',
    };
  });

  const wsSummary = XLSX.utils.json_to_sheet(
    summaryRows.length > 0
      ? summaryRows
      : [
          {
            'No': 1,
            'Nama Kelas Pembekalan': 'Belum ada data kelas',
            'Deskripsi': '-',
            'Kuota Maksimal': 0,
            'Mahasiswa Terdaftar': 0,
            'Sisa Kuota': 0,
            'Persentase Terisi': '0%',
            'Jumlah Sesi': 0,
            'Status': '-',
          },
        ]
  );

  wsSummary['!cols'] = [
    { wch: 6 },  // No
    { wch: 38 }, // Nama Kelas
    { wch: 34 }, // Deskripsi
    { wch: 16 }, // Kuota
    { wch: 22 }, // Mahasiswa Terdaftar
    { wch: 14 }, // Sisa Kuota
    { wch: 18 }, // Persentase
    { wch: 14 }, // Jumlah Sesi
    { wch: 16 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Kelas');

  // -------------------------------------------------------------
  // Sheet 2: Seluruh Jadwal Sesi Pembekalan
  // -------------------------------------------------------------
  const allSesiRows: any[] = [];
  let sesiCounter = 1;

  kelasList.forEach((k) => {
    const sList = k.sesi_list || [];
    if (sList.length === 0) {
      allSesiRows.push({
        'No': sesiCounter++,
        'Kelas Pembekalan': k.nama_kelas,
        'Nama Sesi': 'Belum ada sesi diatur',
        'Tanggal': '-',
        'Hari': '-',
        'Jam Mulai': '-',
        'Jam Selesai': '-',
        'Waktu Pelaksanaan': '-',
        'Ruangan / Lab': '-',
        'Instruktur': '-',
        'Tim Asisten (Maks. 4)': '-',
        'Asisten 1': '-',
        'Asisten 2': '-',
        'Asisten 3': '-',
        'Asisten 4': '-',
        'Total Asisten': '-',
      });
    } else {
      sList.forEach((s) => {
        const asistenArr = Array.isArray(s.asisten) ? s.asisten : [];
        allSesiRows.push({
          'No': sesiCounter++,
          'Kelas Pembekalan': k.nama_kelas,
          'Nama Sesi': s.nama_sesi,
          'Tanggal': s.tanggal || '-',
          'Hari': s.hari,
          'Jam Mulai': s.jam_mulai,
          'Jam Selesai': s.jam_selesai,
          'Waktu Pelaksanaan': `${s.jam_mulai} - ${s.jam_selesai} WIB`,
          'Ruangan / Lab': s.ruangan || 'Lab Komputer',
          'Instruktur': s.instruktur || '-',
          'Tim Asisten (Maks. 4)': asistenArr.length > 0 ? asistenArr.join(', ') : '(Dikosongkan)',
          'Asisten 1': asistenArr[0] || '-',
          'Asisten 2': asistenArr[1] || '-',
          'Asisten 3': asistenArr[2] || '-',
          'Asisten 4': asistenArr[3] || '-',
          'Total Asisten': asistenArr.length > 0 ? `${asistenArr.length} Orang` : '0 (Dikosongkan)',
        });
      });
    }
  });

  const wsAllSesi = XLSX.utils.json_to_sheet(allSesiRows);
  wsAllSesi['!cols'] = [
    { wch: 6 },  // No
    { wch: 38 }, // Kelas Pembekalan
    { wch: 28 }, // Nama Sesi
    { wch: 14 }, // Hari
    { wch: 12 }, // Jam Mulai
    { wch: 12 }, // Jam Selesai
    { wch: 22 }, // Waktu Pelaksanaan
    { wch: 20 }, // Ruangan
    { wch: 30 }, // Instruktur
    { wch: 38 }, // Tim Asisten
    { wch: 20 }, // Asisten 1
    { wch: 20 }, // Asisten 2
    { wch: 20 }, // Asisten 3
    { wch: 20 }, // Asisten 4
    { wch: 16 }, // Total Asisten
  ];

  XLSX.utils.book_append_sheet(wb, wsAllSesi, 'Jadwal Semua Sesi');

  // -------------------------------------------------------------
  // Sheet 3: Seluruh Mahasiswa Terdaftar
  // -------------------------------------------------------------
  if (mahasiswaList && mahasiswaList.length > 0) {
    const allMhsRows = mahasiswaList.map((m, idx) => ({
      'No': idx + 1,
      'NPM': m.npm,
      'Nama Lengkap Mahasiswa': m.nama,
      'Kelas Reguler': m.kelas,
      'Kelas Pembekalan': m.nama_kelas_pembekalan || '-',
    }));

    const wsAllMhs = XLSX.utils.json_to_sheet(allMhsRows);
    wsAllMhs['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 36 },
      { wch: 16 },
      { wch: 38 },
    ];
    XLSX.utils.book_append_sheet(wb, wsAllMhs, 'Semua Mahasiswa');
  }

  const filename = `seluruh_jadwal_pembekalan_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, filename);
}
