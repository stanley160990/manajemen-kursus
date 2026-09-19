import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { KelasPembekalan, SesiPembekalan } from '../types.ts';

/**
 * Format tanggal dalam Bahasa Indonesia
 */
function getIndonesianDateString(): string {
  const date = new Date();
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Download PDF Jadwal untuk 1 Kelas Pembekalan Spesifik
 */
export function exportJadwalPerKelasPDF(kelas: KelasPembekalan) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [82, 95, 225]; // #525FE1
  const darkColor = [30, 41, 59]; // slate-800
  const grayColor = [100, 116, 139]; // slate-500

  // 1. Header Institusi / Program Pembekalan
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 8, 'F');

  // Judul Utama
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('PORTAL PEMBEKALAN MAHASISWA', 14, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('Dokumen Resmi Jadwal Pembekalan & Sesi Laboratorium', 14, 28);
  doc.text(`Dicetak pada: ${getIndonesianDateString()}`, 14, 33);

  // Garis Pembatas Header
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 37, 196, 37);

  // 2. Metadata Kelas
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 42, 182, 30, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 42, 182, 30, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(kelas.nama_kelas, 19, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  const deskripsi = kelas.deskripsi || 'Pembekalan materi teori, praktikum laboratorium, dan evaluasi berkala.';
  const splitDeskripsi = doc.splitTextToSize(`Deskripsi: ${deskripsi}`, 172);
  doc.text(splitDeskripsi, 19, 57);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text(`Target Kuota: ${kelas.kuota || 40} Mahasiswa`, 19, 67);
  doc.text(`Total Sesi: ${(kelas.sesi_list || []).length} Sesi Pertemuan`, 100, 67);

  // 3. Tabel Sesi
  const sesiList = kelas.sesi_list || [];
  const tableData = sesiList.map((s: SesiPembekalan, index: number) => [
    (index + 1).toString(),
    s.nama_sesi || `Sesi ${index + 1}`,
    s.tanggal || '-',
    s.hari,
    `${s.jam_mulai} - ${s.jam_selesai} WIB`,
    s.ruangan || 'Lab Komputer',
    s.instruktur || '-',
    s.asisten && s.asisten.length > 0 ? s.asisten.join(', ') : '- (Dikosongkan)',
  ]);

  autoTable(doc, {
    startY: 78,
    head: [['No', 'Nama Sesi Pembekalan', 'Tanggal', 'Hari', 'Waktu Pelaksanaan', 'Ruangan', 'Instruktur', 'Tim Asisten (Maks. 4)']],
    body: tableData.length > 0 ? tableData : [['-', 'Belum ada sesi dikonfigurasi', '-', '-', '-', '-', '-', '-']],
    headStyles: {
      fillColor: [82, 95, 225],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: [51, 65, 85],
      cellPadding: 3,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 38 },
      2: { cellWidth: 22 },
      3: { cellWidth: 16 },
      4: { cellWidth: 26 },
      5: { cellWidth: 22 },
      6: { cellWidth: 24 },
      7: { cellWidth: 28 },
    },
    margin: { left: 14, right: 14 },
  });

  // 4. Catatan & Tanda Tangan
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : 150;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('Ketentuan Pelaksanaan Pembekalan:', 14, finalY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('1. Mahasiswa wajib melakukan login pada sistem tepat waktu sesuai jadwal sesi yang terdaftar.', 14, finalY + 5);
  doc.text('2. Kehadiran tercatat otomatis melalui sistem live monitoring pembekalan.', 14, finalY + 9);
  doc.text('3. Pengumpulan tugas mandiri per sesi dilakukan melalui sistem sebelum batas waktu pengumpulan.', 14, finalY + 13);

  // Bagian Pengesahan
  const signY = finalY + 25;
  if (signY < 260) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text('Mengetahui / Disahkan,', 140, signY);
    doc.text('Koordinator Pembekalan & Lab', 140, signY + 5);
    doc.text('( _________________________ )', 140, signY + 24);
    doc.text('NIP. ........................................', 140, signY + 29);
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Dokumen Otomatis Sistem Pembekalan - Halaman ${i} dari ${pageCount}`, 14, 290);
    doc.text('Validitas resmi tanpa tanda tangan basah jika diakses melalui portal', 110, 290);
  }

  // Sanitize file name
  const safeName = kelas.nama_kelas.toLowerCase().replace(/[^a-z0-9]/g, '_');
  doc.save(`jadwal_pembekalan_${safeName}.pdf`);
}

/**
 * Download PDF Jadwal untuk KESELURUHAN Pembekalan (Semua Kelas & Sesi)
 */
export function exportJadwalSemuaKelasPDF(kelasList: KelasPembekalan[]) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [82, 95, 225];
  const darkColor = [30, 41, 59];
  const grayColor = [100, 116, 139];

  // 1. Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 297, 10, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('PORTAL PEMBEKALAN MAHASISWA', 14, 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('JADWAL LENGKAP SELURUH KELAS & SESI PEMBEKALAN', 14, 29);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text(`Waktu Cetak: ${getIndonesianDateString()} | Total Kelas: ${kelasList.length} Program`, 14, 35);

  // Garis Pembatas
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 38, 283, 38);

  // Flatten rows for table
  const allRows: any[] = [];
  let no = 1;

  kelasList.forEach((k) => {
    const sesiList = k.sesi_list || [];
    if (sesiList.length === 0) {
      allRows.push([
        no++,
        k.nama_kelas,
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        `Kuota: ${k.kuota || 40}`,
      ]);
    } else {
      sesiList.forEach((s) => {
        allRows.push([
          no++,
          k.nama_kelas,
          s.nama_sesi,
          s.tanggal || '-',
          s.hari,
          `${s.jam_mulai} - ${s.jam_selesai} WIB`,
          s.ruangan || 'Lab Komputer',
          s.instruktur || '-',
          s.asisten && s.asisten.length > 0 ? s.asisten.join(', ') : '-',
          `Kuota: ${k.kuota || 40} Mhs`,
        ]);
      });
    }
  });

  autoTable(doc, {
    startY: 42,
    head: [[
      'No',
      'Kelas Pembekalan',
      'Nama Sesi Pembekalan',
      'Tanggal',
      'Hari',
      'Waktu Pelaksanaan',
      'Ruangan / Lab',
      'Instruktur',
      'Tim Asisten (Maks. 4)',
      'Keterangan',
    ]],
    body: allRows,
    headStyles: {
      fillColor: [82, 95, 225],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: [51, 65, 85],
      cellPadding: 2.8,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 40, fontStyle: 'bold' },
      2: { cellWidth: 44 },
      3: { cellWidth: 20 },
      4: { cellWidth: 16 },
      5: { cellWidth: 26 },
      6: { cellWidth: 22 },
      7: { cellWidth: 26 },
      8: { cellWidth: 45 },
      9: { cellWidth: 18 },
    },
    margin: { left: 14, right: 14 },
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Jadwal Keseluruhan Pembekalan Mahasiswa | Halaman ${i} dari ${pageCount}`, 14, 202);
    doc.text('Sistem Informasi Manajemen Pembekalan Laboratorium - PostgreSQL Backend', 180, 202);
  }

  doc.save(`jadwal_keseluruhan_pembekalan_${Date.now()}.pdf`);
}
