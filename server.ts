import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import { createServer as createViteServer } from 'vite';
import {
  initializeDatabase,
  getDatabaseStatus,
  getAllMahasiswa,
  addMahasiswa,
  updateMahasiswa,
  deleteMahasiswa,
  getAllKelasReferensi,
  createKelasReferensi,
  updateKelasReferensi,
  deleteKelasReferensi,
  getLiveActiveMahasiswaToday,
  recordExternalLogin,
  getRiwayatLogin,
  getAllTugas,
  recordExternalTask,
  simulateExternalTaskSubmission,
  memoryStore,
} from './src/db/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Inisialisasi Database
  await initializeDatabase();

  // Middleware Auth Guard
  const verifyAdmin = (req: Request, res: Response, next: () => void) => {
    const role = req.headers['x-user-role'];
    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Akses ditolak: User Asisten hanya memiliki izin melihat data (Read-Only).',
      });
    }
    next();
  };

  // -------------------------------------------------------------
  // API AUTENTIKASI (Hanya 2 User: Admin & Asisten)
  // -------------------------------------------------------------
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username dan password wajib diisi.' });
    }

    const trimmedUser = String(username).trim().toLowerCase();
    const user = memoryStore.users.find((u) => u.username.toLowerCase() === trimmedUser);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Username tidak ditemukan. Hanya ada 2 user: admin dan asisten.',
      });
    }

    // Verifikasi password sederhana untuk akun bawaan
    const expectedPassword = user.role === 'admin' ? 'admin123' : 'asisten123';
    if (password !== expectedPassword && password !== 'admin' && password !== 'asisten') {
      return res.status(401).json({
        success: false,
        error: `Password salah untuk user ${user.username}. (Gunakan '${expectedPassword}')`,
      });
    }

    const token = `token-${user.role}-${Date.now()}`;
    return res.json({
      success: true,
      user,
      token,
      message: `Selamat datang, ${user.nama} (${user.role.toUpperCase()})`,
    });
  });

  // -------------------------------------------------------------
  // API STATUS & HEALTH
  // -------------------------------------------------------------
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: getDatabaseStatus(),
    });
  });

  // -------------------------------------------------------------
  // API MANAJEMEN DATA MAHASISWA
  // -------------------------------------------------------------
  app.get('/api/mahasiswa', async (req: Request, res: Response) => {
    try {
      const data = await getAllMahasiswa();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/mahasiswa', verifyAdmin, async (req: Request, res: Response) => {
    try {
      const { npm, nama, kelas, kelas_pembekalan_id } = req.body;
      if (!npm || !nama || !kelas || !kelas_pembekalan_id) {
        return res.status(400).json({
          success: false,
          error: 'Semua bidang (NPM, Nama, Kelas, Kelas Pembekalan) wajib diisi.',
        });
      }

      const created = await addMahasiswa({
        npm: String(npm).trim(),
        nama: String(nama).trim(),
        kelas: String(kelas).trim(),
        kelas_pembekalan_id: parseInt(kelas_pembekalan_id, 10),
      });

      res.status(201).json({ success: true, data: created, message: 'Data mahasiswa berhasil ditambahkan' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.put('/api/mahasiswa/:id', verifyAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { npm, nama, kelas, kelas_pembekalan_id } = req.body;

      if (!npm || !nama || !kelas || !kelas_pembekalan_id) {
        return res.status(400).json({
          success: false,
          error: 'Semua bidang (NPM, Nama, Kelas, Kelas Pembekalan) wajib diisi.',
        });
      }

      const updated = await updateMahasiswa(id, {
        npm: String(npm).trim(),
        nama: String(nama).trim(),
        kelas: String(kelas).trim(),
        kelas_pembekalan_id: parseInt(kelas_pembekalan_id, 10),
      });

      res.json({ success: true, data: updated, message: 'Data mahasiswa berhasil diperbarui' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/mahasiswa/:id', verifyAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const deleted = await deleteMahasiswa(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Mahasiswa tidak ditemukan' });
      }
      res.json({ success: true, message: 'Data mahasiswa berhasil dihapus' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Bulk Upload / Import Mahasiswa from Excel / Array
  app.post('/api/mahasiswa/bulk-import', verifyAdmin, async (req: Request, res: Response) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Data baris mahasiswa tidak ditemukan.' });
      }

      const allKelas = await getAllKelasReferensi();
      const results = {
        successCount: 0,
        failedCount: 0,
        errors: [] as string[],
      };

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowNum = i + 2; // Anggap header di baris 1
        const npm = String(item.npm || item.NPM || '').trim();
        const nama = String(item.nama || item.Nama || item.NAMA || '').trim();
        const kelas = String(item.kelas || item.Kelas || item.KELAS || '').trim();
        const namaPembekalan = String(item.kelas_pembekalan || item.pembekalan || item['Kelas Pembekalan'] || '').trim();

        if (!npm || !nama || !kelas) {
          results.failedCount++;
          results.errors.push(`Baris ${rowNum}: NPM, Nama, dan Kelas wajib diisi.`);
          continue;
        }

        // Cari ID Kelas Pembekalan
        let kId = 1;
        if (namaPembekalan) {
          const matched = allKelas.find((k) =>
            k.nama_kelas.toLowerCase().includes(namaPembekalan.toLowerCase())
          );
          if (matched) kId = matched.id;
        }

        try {
          // Check if exists
          const existing = memoryStore.mahasiswa.find((m) => m.npm === npm);
          if (existing) {
            await updateMahasiswa(existing.id, { npm, nama, kelas, kelas_pembekalan_id: kId });
          } else {
            await addMahasiswa({ npm, nama, kelas, kelas_pembekalan_id: kId });
          }
          results.successCount++;
        } catch (rowErr: any) {
          results.failedCount++;
          results.errors.push(`Baris ${rowNum} (${npm}): ${rowErr.message}`);
        }
      }

      res.json({
        success: true,
        message: `Import selesai: ${results.successCount} berhasil diproses, ${results.failedCount} gagal.`,
        details: results,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Download Sample Excel Template
  app.get('/api/mahasiswa/template-xlsx', (req: Request, res: Response) => {
    try {
      const templateData = [
        {
          NPM: '50421013',
          Nama: 'Muhammad Rafli Ardiansyah',
          Kelas: '4IA07',
          'Kelas Pembekalan': 'Web Development & Cloud Computing',
        },
        {
          NPM: '50421014',
          Nama: 'Nabila Syakieb Maharani',
          Kelas: '4IA07',
          'Kelas Pembekalan': 'Data Science & Machine Learning',
        },
        {
          NPM: '50421015',
          Nama: 'Oscar Danuarta',
          Kelas: '4IA08',
          'Kelas Pembekalan': 'Cyber Security & Network Defense',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'TemplateMahasiswa');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Disposition', 'attachment; filename="template_data_mahasiswa.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------
  // API MANAJEMEN DATA REFERENSI KELAS & SESI PEMBEKALAN
  // -------------------------------------------------------------
  app.get('/api/referensi-kelas', async (req: Request, res: Response) => {
    try {
      const data = await getAllKelasReferensi();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/referensi-kelas', verifyAdmin, async (req: Request, res: Response) => {
    try {
      const { nama_kelas, deskripsi, kuota, sesi_list } = req.body;
      if (!nama_kelas) {
        return res.status(400).json({ success: false, error: 'Nama Kelas wajib diisi.' });
      }

      const created = await createKelasReferensi({
        nama_kelas: String(nama_kelas).trim(),
        deskripsi: deskripsi ? String(deskripsi).trim() : '',
        kuota: kuota ? parseInt(kuota, 10) : 40,
        sesi_list: sesi_list || [],
      });

      res.status(201).json({ success: true, data: created, message: 'Kelas pembekalan dan jadwal sesi berhasil dibuat' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.put('/api/referensi-kelas/:id', verifyAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { nama_kelas, deskripsi, kuota, sesi_list } = req.body;
      if (!nama_kelas) {
        return res.status(400).json({ success: false, error: 'Nama Kelas wajib diisi.' });
      }

      const updated = await updateKelasReferensi(id, {
        nama_kelas: String(nama_kelas).trim(),
        deskripsi: deskripsi ? String(deskripsi).trim() : '',
        kuota: kuota ? parseInt(kuota, 10) : 40,
        sesi_list,
      });

      res.json({ success: true, data: updated, message: 'Kelas pembekalan dan jadwal sesi berhasil diperbarui' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/referensi-kelas/:id', verifyAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      await deleteKelasReferensi(id);
      res.json({ success: true, message: 'Kelas pembekalan berhasil dihapus' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Export Seluruh Kelas & Jadwal ke Excel
  app.get('/api/referensi-kelas/export-excel', async (req: Request, res: Response) => {
    try {
      const [kelasList, mahasiswaList] = await Promise.all([
        getAllKelasReferensi(),
        getAllMahasiswa(),
      ]);

      const wb = XLSX.utils.book_new();

      // Sheet 1: Ringkasan Semua Kelas
      const summaryRows = kelasList.map((k, idx) => {
        const totalSesi = (k.sesi_list || []).length;
        const enrolledCount = mahasiswaList.filter((m) => m.kelas_pembekalan_id === k.id).length;
        const kuota = k.kuota || 40;
        return {
          No: idx + 1,
          'Nama Kelas Pembekalan': k.nama_kelas,
          Deskripsi: k.deskripsi || '-',
          'Kuota Maksimal': kuota,
          'Mahasiswa Terdaftar': enrolledCount,
          'Sisa Kuota': Math.max(0, kuota - enrolledCount),
          'Jumlah Sesi': totalSesi,
          Status: enrolledCount >= kuota ? 'KUOTA PENUH' : 'TERSEDIA',
        };
      });
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Kelas');

      // Sheet 2: Semua Sesi Jadwal
      const allSesiRows: any[] = [];
      let noSesi = 1;
      kelasList.forEach((k) => {
        (k.sesi_list || []).forEach((s) => {
          const asistenArr = Array.isArray(s.asisten) ? s.asisten : [];
          allSesiRows.push({
            No: noSesi++,
            'Kelas Pembekalan': k.nama_kelas,
            'Nama Sesi': s.nama_sesi,
            Tanggal: s.tanggal || '-',
            Hari: s.hari,
            'Jam Mulai': s.jam_mulai,
            'Jam Selesai': s.jam_selesai,
            'Waktu Pelaksanaan': `${s.jam_mulai} - ${s.jam_selesai} WIB`,
            Ruangan: s.ruangan || 'Lab Komputer',
            Instruktur: s.instruktur || '-',
            'Tim Asisten': asistenArr.length > 0 ? asistenArr.join(', ') : '(Dikosongkan)',
            'Asisten 1': asistenArr[0] || '-',
            'Asisten 2': asistenArr[1] || '-',
            'Asisten 3': asistenArr[2] || '-',
            'Asisten 4': asistenArr[3] || '-',
            'Total Asisten': asistenArr.length,
          });
        });
      });
      const wsSesi = XLSX.utils.json_to_sheet(allSesiRows);
      XLSX.utils.book_append_sheet(wb, wsSesi, 'Jadwal Semua Sesi');

      // Sheet 3: Semua Mahasiswa
      const mhsRows = mahasiswaList.map((m, idx) => ({
        No: idx + 1,
        NPM: m.npm,
        'Nama Mahasiswa': m.nama,
        'Kelas Reguler': m.kelas,
        'Kelas Pembekalan': m.nama_kelas_pembekalan || '-',
      }));
      const wsMhs = XLSX.utils.json_to_sheet(mhsRows);
      XLSX.utils.book_append_sheet(wb, wsMhs, 'Daftar Mahasiswa');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', `attachment; filename="jadwal_seluruh_pembekalan_${Date.now()}.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Export 1 Kelas Pembekalan Spesifik ke Excel
  app.get('/api/referensi-kelas/:id/export-excel', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const [allKelas, allMhs] = await Promise.all([
        getAllKelasReferensi(),
        getAllMahasiswa(),
      ]);

      const kelas = allKelas.find((k) => k.id === id);
      if (!kelas) {
        return res.status(404).json({ success: false, error: 'Kelas pembekalan tidak ditemukan' });
      }

      const enrolledMhs = allMhs.filter((m) => m.kelas_pembekalan_id === id);
      const sesiList = kelas.sesi_list || [];
      const wb = XLSX.utils.book_new();

      // Sheet 1: Jadwal Sesi
      const sesiRows = sesiList.map((s, idx) => {
        const asistenArr = Array.isArray(s.asisten) ? s.asisten : [];
        return {
          No: idx + 1,
          'Nama Sesi': s.nama_sesi,
          Tanggal: s.tanggal || '-',
          Hari: s.hari,
          'Jam Mulai': s.jam_mulai,
          'Jam Selesai': s.jam_selesai,
          'Waktu Pelaksanaan': `${s.jam_mulai} - ${s.jam_selesai} WIB`,
          Ruangan: s.ruangan || 'Lab Komputer',
          Instruktur: s.instruktur || '-',
          'Tim Asisten': asistenArr.length > 0 ? asistenArr.join(', ') : '(Dikosongkan)',
          'Asisten 1': asistenArr[0] || '-',
          'Asisten 2': asistenArr[1] || '-',
          'Asisten 3': asistenArr[2] || '-',
          'Asisten 4': asistenArr[3] || '-',
          'Total Asisten': asistenArr.length,
        };
      });
      const wsSesi = XLSX.utils.json_to_sheet(sesiRows);
      XLSX.utils.book_append_sheet(wb, wsSesi, 'Jadwal Sesi');

      // Sheet 2: Mahasiswa
      const mhsRows = enrolledMhs.map((m, idx) => ({
        No: idx + 1,
        NPM: m.npm,
        'Nama Lengkap': m.nama,
        'Kelas Reguler': m.kelas,
        'Kelas Pembekalan': kelas.nama_kelas,
      }));
      const wsMhs = XLSX.utils.json_to_sheet(
        mhsRows.length > 0
          ? mhsRows
          : [{ No: '-', NPM: '-', 'Nama Lengkap': 'Belum ada mahasiswa terdaftar', 'Kelas Reguler': '-', 'Kelas Pembekalan': kelas.nama_kelas }]
      );
      XLSX.utils.book_append_sheet(wb, wsMhs, 'Daftar Mahasiswa');

      // Sheet 3: Ringkasan
      const infoRows = [
        { Parameter: 'Nama Kelas', Keterangan: kelas.nama_kelas },
        { Parameter: 'Deskripsi', Keterangan: kelas.deskripsi || '-' },
        { Parameter: 'Kuota', Keterangan: `${kelas.kuota || 40} Mahasiswa` },
        { Parameter: 'Jumlah Mahasiswa Terdaftar', Keterangan: `${enrolledMhs.length} Mahasiswa` },
        { Parameter: 'Total Sesi', Keterangan: `${sesiList.length} Sesi` },
      ];
      const wsInfo = XLSX.utils.json_to_sheet(infoRows);
      XLSX.utils.book_append_sheet(wb, wsInfo, 'Informasi Kelas');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const cleanName = kelas.nama_kelas.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      res.setHeader('Content-Disposition', `attachment; filename="jadwal_kelas_${cleanName}_${Date.now()}.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------
  // API LIVE MONITORING (HANYA SESI HARI INI)
  // -------------------------------------------------------------
  app.get('/api/monitoring/live', async (req: Request, res: Response) => {
    try {
      const result = await getLiveActiveMahasiswaToday();
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------
  // API INGEST EKSTERNAL (UNTUK SISTEM LAIN MENGINPUT EVENT LOGIN)
  // -------------------------------------------------------------
  app.post('/api/external/login-event', async (req: Request, res: Response) => {
    try {
      const { npm, nama, kelas, nama_kelas_pembekalan, nama_sesi, ip_address, user_agent, action } = req.body;
      if (!npm) {
        return res.status(400).json({ success: false, error: 'Parameter npm wajib disertakan.' });
      }

      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ip_address;
      const clientAgent = req.headers['user-agent'] || user_agent;

      const result = await recordExternalLogin({
        npm: String(npm).trim(),
        nama: nama ? String(nama).trim() : undefined,
        kelas: kelas ? String(kelas).trim() : undefined,
        nama_kelas_pembekalan: nama_kelas_pembekalan ? String(nama_kelas_pembekalan).trim() : undefined,
        nama_sesi: nama_sesi ? String(nama_sesi).trim() : undefined,
        ip_address: String(clientIp),
        user_agent: String(clientAgent),
        action: action === 'logout' ? 'logout' : 'login',
      });

      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Simulasi Ingest dari UI (untuk memudahkan demo & pengujian langsung)
  app.post('/api/monitoring/simulate', async (req: Request, res: Response) => {
    try {
      const { action, npm } = req.body;
      const allMhs = await getAllMahasiswa();
      const targetMhs = npm
        ? allMhs.find((m) => m.npm === npm)
        : allMhs[Math.floor(Math.random() * allMhs.length)];

      if (!targetMhs) {
        return res.status(400).json({ success: false, error: 'Mahasiswa tidak ditemukan untuk simulasi' });
      }

      const clientIps = ['192.168.1.45', '192.168.1.112', '10.20.30.5', '172.16.0.88'];
      const randomIp = clientIps[Math.floor(Math.random() * clientIps.length)];

      const result = await recordExternalLogin({
        npm: targetMhs.npm,
        nama: targetMhs.nama,
        kelas: targetMhs.kelas,
        nama_kelas_pembekalan: targetMhs.nama_kelas_pembekalan,
        ip_address: randomIp,
        action: action === 'logout' ? 'logout' : 'login',
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------
  // API DAFTAR LOGIN MAHASISWA (RIWAYAT DENGAN RENTANG WAKTU)
  // -------------------------------------------------------------
  app.get('/api/riwayat-login', async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, search, status, kelas } = req.query;
      const logs = await getRiwayatLogin({
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
        search: search ? String(search) : undefined,
        status: status ? String(status) : undefined,
        kelas: kelas ? String(kelas) : undefined,
      });

      res.json({
        success: true,
        count: logs.length,
        data: logs,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Export Riwayat to Excel
  app.get('/api/riwayat-login/export', async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, search, status, kelas } = req.query;
      const logs = await getRiwayatLogin({
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
        search: search ? String(search) : undefined,
        status: status ? String(status) : undefined,
        kelas: kelas ? String(kelas) : undefined,
      });

      const exportRows = logs.map((l, index) => ({
        No: index + 1,
        NPM: l.npm,
        'Nama Mahasiswa': l.nama,
        'Kelas Reguler': l.kelas,
        'Kelas Pembekalan': l.nama_kelas_pembekalan,
        'Sesi Pembekalan': l.nama_sesi,
        'Waktu Login': new Date(l.waktu_login).toLocaleString('id-ID'),
        'Waktu Logout': l.waktu_logout ? new Date(l.waktu_logout).toLocaleString('id-ID') : 'Masih Aktif',
        'Durasi (Menit)': l.durasi_menit || '-',
        'IP Address': l.ip_address,
        Status: l.status.toUpperCase(),
      }));

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'RiwayatAksesLogin');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Disposition', `attachment; filename="riwayat_login_mahasiswa_${Date.now()}.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------
  // API MONITORING TUGAS MAHASISWA (PERSESI)
  // Data diinput dari luar sistem (LMS, Webhook, AutoGrader)
  // -------------------------------------------------------------
  app.get('/api/monitoring/tugas', async (req: Request, res: Response) => {
    try {
      const { kelas_pembekalan_id, nama_sesi, status, search, kelas_reguler } = req.query;
      const result = await getAllTugas({
        kelas_pembekalan_id: kelas_pembekalan_id ? parseInt(String(kelas_pembekalan_id), 10) : undefined,
        nama_sesi: nama_sesi ? String(nama_sesi) : undefined,
        status: status ? String(status) : undefined,
        search: search ? String(search) : undefined,
        kelas_reguler: kelas_reguler ? String(kelas_reguler) : undefined,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Export Monitoring Tugas to Excel
  app.get('/api/monitoring/tugas/export', async (req: Request, res: Response) => {
    try {
      const { kelas_pembekalan_id, nama_sesi, status, search, kelas_reguler } = req.query;
      const result = await getAllTugas({
        kelas_pembekalan_id: kelas_pembekalan_id ? parseInt(String(kelas_pembekalan_id), 10) : undefined,
        nama_sesi: nama_sesi ? String(nama_sesi) : undefined,
        status: status ? String(status) : undefined,
        search: search ? String(search) : undefined,
        kelas_reguler: kelas_reguler ? String(kelas_reguler) : undefined,
      });

      const exportRows = result.data.map((t, index) => ({
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
      XLSX.utils.book_append_sheet(wb, ws, 'DaftarPengumpulanTugas');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Disposition', `attachment; filename="daftar_pengumpulan_tugas_${Date.now()}.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Ingest Tugas Eksternal (Single Submission)
  // Dipanggil oleh sistem luar seperti LMS Moodle, Google Classroom, Bot Grader, atau Git Webhook
  app.post('/api/external/task-event', async (req: Request, res: Response) => {
    try {
      const {
        npm,
        nama,
        kelas,
        nama_kelas_pembekalan,
        nama_sesi,
        judul_tugas,
        status,
        nilai,
        waktu_pengumpulan,
        tautan_tugas,
        catatan_instruktur,
        external_source,
      } = req.body;

      if (!npm || !nama_sesi) {
        return res.status(400).json({
          success: false,
          error: 'Parameter wajib: npm dan nama_sesi harus disertakan dalam payload external ingest tugas.',
        });
      }

      const result = await recordExternalTask({
        npm: String(npm).trim(),
        nama: nama ? String(nama).trim() : undefined,
        kelas: kelas ? String(kelas).trim() : undefined,
        nama_kelas_pembekalan: nama_kelas_pembekalan ? String(nama_kelas_pembekalan).trim() : undefined,
        nama_sesi: String(nama_sesi).trim(),
        judul_tugas: judul_tugas ? String(judul_tugas).trim() : undefined,
        status,
        nilai: nilai !== undefined && nilai !== null ? parseFloat(nilai) : undefined,
        waktu_pengumpulan,
        tautan_tugas,
        catatan_instruktur,
        external_source: external_source || req.headers['x-external-source']?.toString() || 'External System Webhook',
      });

      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Ingest Tugas Eksternal (Batch Submissions)
  app.post('/api/external/tasks-batch', async (req: Request, res: Response) => {
    try {
      const { tasks } = req.body;
      if (!Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ success: false, error: 'Array "tasks" wajib disertakan dan tidak boleh kosong.' });
      }

      const results = [];
      for (const t of tasks) {
        if (!t.npm || !t.nama_sesi) continue;
        const resTask = await recordExternalTask(t);
        results.push(resTask);
      }

      res.json({
        success: true,
        message: `Berhasil memproses ${results.length} data tugas dari sistem luar.`,
        processed_count: results.length,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Simulasi Ingest Tugas dari sistem luar (Untuk kebutuhan demo / pengujian langsung di UI)
  app.post('/api/monitoring/tugas/simulate', async (req: Request, res: Response) => {
    try {
      const result = await simulateExternalTaskSubmission();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------
  // VITE MIDDLEWARE / STATIC ASSETS
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sistem Pembekalan Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
