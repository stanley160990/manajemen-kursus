import pg from 'pg';
import crypto from 'crypto';
import {
  Mahasiswa,
  KelasPembekalan,
  SesiPembekalan,
  RiwayatLoginMahasiswa,
  LiveActiveMahasiswa,
  User,
  TugasMahasiswa,
  ExternalTaskPayload,
  StatusTugas,
} from '../types.ts';

const { Pool } = pg;

/**
 * Menghasilkan hash SHA-1 dari string password untuk penyimpanan yang aman.
 * Format output berupa string hexadecimal 40-karakter.
 */
export function hashPasswordSha1(password: string): string {
  return crypto.createHash('sha1').update(password).digest('hex');
}

export interface UserRecord {
  id: number;
  username: string;
  password_hash: string;
  nama: string;
  role: 'admin' | 'asisten';
}

// Konfigurasi koneksi PostgreSQL
const poolConfig: pg.PoolConfig = {
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.PGHOST || process.env.SQL_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.SQL_PORT || '5432', 10),
  database: process.env.PGDATABASE || process.env.SQL_DB_NAME || 'pembekalan_db',
  user: process.env.PGUSER || process.env.SQL_USER || 'postgres',
  password: process.env.PGPASSWORD || process.env.SQL_PASSWORD || 'postgrespassword',
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
};

let pool: pg.Pool | null = null;
let isPostgresConnected = false;
let lastDbError: string | null = null;

// Seed Data Standar
const initialUsers: User[] = [
  { id: 1, username: 'admin', nama: 'Administrator Pembekalan', role: 'admin' },
  { id: 2, username: 'asisten', nama: 'Asisten Laboratorium', role: 'asisten' },
];

// Kredensial dengan password yang di-hash menggunakan SHA-1
// admin: 'admin123' -> hash: 'f865b53623b121fd34ee5426c792e5c33af8c227'
// asisten: 'asisten123' -> hash: 'f745837ba7cd22623cb736bef901235e9f492bb8'
const initialUserRecords: UserRecord[] = [
  {
    id: 1,
    username: 'admin',
    password_hash: hashPasswordSha1('admin123'),
    nama: 'Administrator Pembekalan',
    role: 'admin',
  },
  {
    id: 2,
    username: 'asisten',
    password_hash: hashPasswordSha1('asisten123'),
    nama: 'Asisten Laboratorium',
    role: 'asisten',
  },
];

const initialKelas: KelasPembekalan[] = [
  {
    id: 1,
    nama_kelas: 'Web Development & Cloud Computing',
    deskripsi: 'Pelatihan arsitektur modern web, RESTful API, dan kontainerisasi',
    kuota: 40,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    nama_kelas: 'Data Science & Machine Learning',
    deskripsi: 'Pembekalan pipeline analitika data, model prediktif, dan visualisasi',
    kuota: 35,
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    nama_kelas: 'Cyber Security & Network Defense',
    deskripsi: 'Pembekalan keamanan jaringan, vulnerability assessment, dan ethical hacking',
    kuota: 30,
    created_at: new Date().toISOString(),
  },
  {
    id: 4,
    nama_kelas: 'Mobile Application Development',
    deskripsi: 'Pengembangan aplikasi mobile multiplatform dengan arsitektur reaktif',
    kuota: 35,
    created_at: new Date().toISOString(),
  },
];

const initialSesi: SesiPembekalan[] = [
  {
    id: 1,
    kelas_pembekalan_id: 1,
    nama_sesi: 'Sesi 1: Dasar REST API & Database Design',
    tanggal: '2026-09-21',
    hari: 'Senin',
    jam_mulai: '08:00',
    jam_selesai: '10:00',
    ruangan: 'Lab Komputer 1',
    instruktur: 'Dr. Ir. Hendra Wijaya, M.Kom',
    asisten: ['Rian Hidayat', 'Siti Fatimah'],
  },
  {
    id: 2,
    kelas_pembekalan_id: 1,
    nama_sesi: 'Sesi 2: Frontend Architecture & Tailwind',
    tanggal: '2026-09-23',
    hari: 'Rabu',
    jam_mulai: '10:15',
    jam_selesai: '12:15',
    ruangan: 'Lab Komputer 1',
    instruktur: 'Ahmad Fauzi, S.Kom, M.T',
    asisten: ['Dimas Anggara', 'Aulia Rahma', 'Fajar Pratama'],
  },
  {
    id: 3,
    kelas_pembekalan_id: 1,
    nama_sesi: 'Sesi 3: Docker Container & Deployment CI/CD',
    tanggal: '2026-09-25',
    hari: 'Jumat',
    jam_mulai: '13:30',
    jam_selesai: '15:30',
    ruangan: 'Lab Komputer 3',
    instruktur: 'Rian Pratama, M.Sc',
    asisten: ['Taufik Hidayat'],
  },
  {
    id: 4,
    kelas_pembekalan_id: 2,
    nama_sesi: 'Sesi 1: Python Data Wrangling & Pandas',
    tanggal: '2026-09-22',
    hari: 'Selasa',
    jam_mulai: '08:00',
    jam_selesai: '10:00',
    ruangan: 'Lab Riset AI',
    instruktur: 'Prof. Siti Nurhaliza, Ph.D',
    asisten: ['Nadia Safitri', 'Kevin Sanjaya', 'Lestari Indah', 'Bayu Nugroho'],
  },
  {
    id: 5,
    kelas_pembekalan_id: 2,
    nama_sesi: 'Sesi 2: Supervised & Unsupervised ML Models',
    tanggal: '2026-09-24',
    hari: 'Kamis',
    jam_mulai: '13:00',
    jam_selesai: '15:00',
    ruangan: 'Lab Riset AI',
    instruktur: 'Budi Santoso, M.Kom',
    asisten: [], // Dikosongkan (opsional)
  },
  {
    id: 6,
    kelas_pembekalan_id: 3,
    nama_sesi: 'Sesi 1: Network Traffic Analysis & Wireshark',
    tanggal: '2026-09-28',
    hari: 'Senin',
    jam_mulai: '10:30',
    jam_selesai: '12:30',
    ruangan: 'Lab Jaringan',
    instruktur: 'Eko Prasetyo, CEH',
    asisten: ['Rizki Maulana', 'Dewi Sartika'],
  },
  {
    id: 7,
    kelas_pembekalan_id: 3,
    nama_sesi: 'Sesi 2: Web Exploitation & SQL Injection Prevention',
    tanggal: '2026-10-01',
    hari: 'Kamis',
    jam_mulai: '08:00',
    jam_selesai: '10:00',
    ruangan: 'Lab Jaringan',
    instruktur: 'Dian Anggraini, OSCP',
    asisten: [], // Dikosongkan
  },
  {
    id: 8,
    kelas_pembekalan_id: 4,
    nama_sesi: 'Sesi 1: Cross-Platform UI Component & State',
    tanggal: '2026-09-30',
    hari: 'Rabu',
    jam_mulai: '08:00',
    jam_selesai: '10:00',
    ruangan: 'Lab Multimedia',
    instruktur: 'Kevin Susanto, S.T',
    asisten: ['Bambang Pamungkas', 'Jessica Mila'],
  },
  {
    id: 9,
    kelas_pembekalan_id: 4,
    nama_sesi: 'Sesi 2: API Integration & Offline SQLite Sync',
    tanggal: '2026-10-03',
    hari: 'Sabtu',
    jam_mulai: '09:00',
    jam_selesai: '11:00',
    ruangan: 'Lab Multimedia',
    instruktur: 'Kevin Susanto, S.T',
    asisten: ['Eko Wahyudi'],
  },
];

const initialMahasiswa: Mahasiswa[] = [
  { id: 1, npm: '50421001', nama: 'Aditya Pratama Putra', kelas: '4IA01', kelas_pembekalan_id: 1 },
  { id: 2, npm: '50421002', nama: 'Bunga Citra Lestari', kelas: '4IA01', kelas_pembekalan_id: 1 },
  { id: 3, npm: '50421003', nama: 'Chandra Wijaya', kelas: '4IA02', kelas_pembekalan_id: 1 },
  { id: 4, npm: '50421004', nama: 'Dwi Septian Nugroho', kelas: '4IA02', kelas_pembekalan_id: 2 },
  { id: 5, npm: '50421005', nama: 'Elvira Rahmadani', kelas: '4IA03', kelas_pembekalan_id: 2 },
  { id: 6, npm: '50421006', nama: 'Fajar Ramadhan', kelas: '4IA03', kelas_pembekalan_id: 2 },
  { id: 7, npm: '50421007', nama: 'Gita Gutawa Putri', kelas: '4IA04', kelas_pembekalan_id: 3 },
  { id: 8, npm: '50421008', nama: 'Hafizh Ihsanuddin', kelas: '4IA04', kelas_pembekalan_id: 3 },
  { id: 9, npm: '50421009', nama: 'Indah Permata Sari', kelas: '4IA05', kelas_pembekalan_id: 4 },
  { id: 10, npm: '50421010', nama: 'Joko Tri Wahyudi', kelas: '4IA05', kelas_pembekalan_id: 4 },
  { id: 11, npm: '50421011', nama: 'Kartika Dewi', kelas: '4IA06', kelas_pembekalan_id: 1 },
  { id: 12, npm: '50421012', nama: 'Lukman Hakim', kelas: '4IA06', kelas_pembekalan_id: 3 },
];

// In-memory store (active fallback when PostgreSQL container is not running locally in preview)
export const memoryStore = {
  users: [...initialUsers],
  userRecords: [...initialUserRecords],
  kelas: [...initialKelas],
  sesi: [...initialSesi],
  mahasiswa: [...initialMahasiswa],
  riwayat: [] as RiwayatLoginMahasiswa[],
  tugas: [] as TugasMahasiswa[],
};

// Generate realistic initial login history
function generateInitialLogs() {
  const now = new Date();
  const dayNamesIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayName = dayNamesIndo[now.getDay()];

  // Filter or match sessions
  const logs: RiwayatLoginMahasiswa[] = [];
  let logId = 1;

  // Recent logs over past 5 days
  for (let i = 0; i < 25; i++) {
    const m = initialMahasiswa[i % initialMahasiswa.length];
    const k = initialKelas.find((c) => c.id === m.kelas_pembekalan_id);
    const sList = initialSesi.filter((s) => s.kelas_pembekalan_id === m.kelas_pembekalan_id);
    const s = sList[i % sList.length] || initialSesi[0];

    const daysAgo = Math.floor(i / 5);
    const logDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - (i % 6) * 45 * 60 * 1000);
    const isToday = daysAgo === 0;

    const waktuLogout = !isToday || i % 3 !== 0
      ? new Date(logDate.getTime() + (60 + (i * 7) % 50) * 60 * 1000).toISOString()
      : null;

    logs.push({
      id: logId++,
      mahasiswa_id: m.id,
      npm: m.npm,
      nama: m.nama,
      kelas: m.kelas,
      nama_kelas_pembekalan: k ? k.nama_kelas : 'Web Development',
      nama_sesi: s.nama_sesi,
      waktu_login: logDate.toISOString(),
      waktu_logout: waktuLogout,
      durasi_menit: waktuLogout ? Math.round((new Date(waktuLogout).getTime() - logDate.getTime()) / 60000) : Math.round((now.getTime() - logDate.getTime()) / 60000),
      ip_address: `192.168.10.${10 + (i * 3) % 80}`,
      user_agent: i % 2 === 0 ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
      status: waktuLogout ? 'logout' : 'login',
    });
  }

  memoryStore.riwayat = logs;
}

// Generate realistic task submissions per student and session
function generateInitialTasks() {
  const tasks: TugasMahasiswa[] = [];
  let taskId = 1;
  const now = new Date();

  initialMahasiswa.forEach((m) => {
    const k = initialKelas.find((c) => c.id === m.kelas_pembekalan_id);
    const sesiList = initialSesi.filter((s) => s.kelas_pembekalan_id === m.kelas_pembekalan_id);

    sesiList.forEach((s, idx) => {
      let status: StatusTugas = 'belum_mengumpulkan';
      let nilai: number | null = null;
      let waktuSubmit: string | null = null;
      let tautan: string | null = null;
      let feedback: string | null = null;
      const source = idx % 2 === 0 ? 'LMS Moodle Laboratorium' : 'Google Classroom Webhook';

      const taskName = s.nama_sesi.replace(/^Sesi \d+:\s*/, '');
      const taskTitles = [
        `Tugas Praktikum: ${taskName}`,
        `Laporan Evaluasi: ${taskName}`,
        `Implementasi Proyek Mandiri: ${taskName}`,
      ];
      const judul = taskTitles[idx % taskTitles.length];

      if (idx === 0) {
        // Sesi 1 sudah dinilai hampir semua
        status = 'dinilai';
        nilai = 82 + ((m.id * 7 + idx * 3) % 17); // 82 - 98
        waktuSubmit = new Date(now.getTime() - (3 + (m.id % 2)) * 24 * 60 * 60 * 1000).toISOString();
        tautan = `https://repo.lab.ac.id/pembekalan/${m.npm}/sesi-1-source.zip`;
        feedback = nilai >= 90
          ? 'Implementasi sangat baik, kode terstruktur dan memenuhi seluruh kriteria kelulusan sesi.'
          : 'Pengerjaan baik, perlu perbaikan kecil pada penanganan kasus error dan struktur respon.';
      } else if (idx === 1) {
        // Sesi 2 variatif
        if (m.id % 4 === 0) {
          status = 'terlambat';
          waktuSubmit = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
          tautan = `https://github.com/mahasiswa-${m.npm}/sesi-2-submission`;
          feedback = 'Tugas diterima namun terlambat 2 jam dari batas tenggat pengumpulan.';
        } else if (m.id % 3 === 0) {
          status = 'belum_mengumpulkan';
        } else if (m.id % 2 === 0) {
          status = 'dinilai';
          nilai = 80 + (m.id % 16);
          waktuSubmit = new Date(now.getTime() - 28 * 60 * 60 * 1000).toISOString();
          tautan = `https://gitlab.univ.ac.id/${m.npm}/tugas-sesi-2`;
          feedback = 'Pengujian berhasil, dokumentasi jelas dan terperinci.';
        } else {
          status = 'sudah_dikumpulkan';
          waktuSubmit = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
          tautan = `https://drive.google.com/open?id=file_submission_${m.npm}_s2`;
        }
      } else {
        // Sesi 3 ke atas
        if (m.id % 5 === 0) {
          status = 'sudah_dikumpulkan';
          waktuSubmit = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
          tautan = `https://github.com/${m.npm}/project-sesi-3`;
        } else {
          status = 'belum_mengumpulkan';
        }
      }

      tasks.push({
        id: taskId++,
        mahasiswa_id: m.id,
        npm: m.npm,
        nama: m.nama,
        kelas: m.kelas,
        kelas_pembekalan_id: m.kelas_pembekalan_id,
        nama_kelas_pembekalan: k ? k.nama_kelas : 'Pembekalan Komputer',
        sesi_id: s.id,
        nama_sesi: s.nama_sesi,
        judul_tugas: judul,
        status,
        nilai,
        waktu_pengumpulan: waktuSubmit,
        deadline: new Date(now.getTime() + (idx * 2 + 1) * 24 * 60 * 60 * 1000).toISOString(),
        tautan_tugas: tautan,
        catatan_instruktur: feedback,
        external_source: source,
        created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: waktuSubmit || new Date().toISOString(),
      });
    });
  });

  memoryStore.tugas = tasks;
}

generateInitialLogs();
generateInitialTasks();

export let isDbInitialized = false;

/**
 * Inisiasi struktur tabel dan data awal (seeding).
 * HANYA dipanggil saat eksekusi manual via CLI (misal: docker compose exec app npm run db:init)
 * atau jika environment variable AUTO_INIT_DB='true'.
 * Menggunakan ON CONFLICT DO NOTHING agar TIDAK menimpa data yang telah diinput pengguna.
 */
export async function runDatabaseInitialization(clientParam?: pg.PoolClient): Promise<{ success: boolean; message: string }> {
  const shouldRelease = !clientParam;
  let client = clientParam;
  if (!client) {
    if (!pool) {
      pool = new Pool(poolConfig);
    }
    client = await pool.connect();
  }

  try {
    console.log('🚀 Memulai inisiasi tabel dan schema database PostgreSQL...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        nama VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'asisten')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS kelas_pembekalan (
        id SERIAL PRIMARY KEY,
        nama_kelas VARCHAR(150) UNIQUE NOT NULL,
        deskripsi TEXT,
        kuota INT DEFAULT 40,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sesi_pembekalan (
        id SERIAL PRIMARY KEY,
        kelas_pembekalan_id INT NOT NULL REFERENCES kelas_pembekalan(id) ON DELETE CASCADE,
        nama_sesi VARCHAR(150) NOT NULL,
        tanggal VARCHAR(30),
        hari VARCHAR(30) NOT NULL,
        jam_mulai VARCHAR(10) NOT NULL,
        jam_selesai VARCHAR(10) NOT NULL,
        ruangan VARCHAR(100),
        instruktur VARCHAR(150),
        asisten JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE sesi_pembekalan ADD COLUMN IF NOT EXISTS asisten JSONB DEFAULT '[]';
      ALTER TABLE sesi_pembekalan ADD COLUMN IF NOT EXISTS tanggal VARCHAR(30);

      CREATE TABLE IF NOT EXISTS mahasiswa (
        id SERIAL PRIMARY KEY,
        npm VARCHAR(20) UNIQUE NOT NULL,
        nama VARCHAR(150) NOT NULL,
        kelas VARCHAR(20) NOT NULL,
        kelas_pembekalan_id INT REFERENCES kelas_pembekalan(id) ON DELETE RESTRICT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS log_login_mahasiswa (
        id SERIAL PRIMARY KEY,
        mahasiswa_id INT REFERENCES mahasiswa(id) ON DELETE SET NULL,
        npm VARCHAR(20) NOT NULL,
        nama VARCHAR(150) NOT NULL,
        kelas VARCHAR(20) NOT NULL,
        nama_kelas_pembekalan VARCHAR(150) NOT NULL,
        nama_sesi VARCHAR(150) NOT NULL,
        waktu_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        waktu_logout TIMESTAMP,
        durasi_menit INT DEFAULT 0,
        ip_address VARCHAR(45),
        user_agent TEXT,
        status VARCHAR(20) DEFAULT 'login',
        is_active_now BOOLEAN DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS tugas_mahasiswa (
        id SERIAL PRIMARY KEY,
        mahasiswa_id INT REFERENCES mahasiswa(id) ON DELETE CASCADE,
        npm VARCHAR(20) NOT NULL,
        nama VARCHAR(150) NOT NULL,
        kelas VARCHAR(20) NOT NULL,
        kelas_pembekalan_id INT REFERENCES kelas_pembekalan(id) ON DELETE CASCADE,
        nama_kelas_pembekalan VARCHAR(150) NOT NULL,
        sesi_id INT REFERENCES sesi_pembekalan(id) ON DELETE SET NULL,
        nama_sesi VARCHAR(150) NOT NULL,
        judul_tugas VARCHAR(255) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'belum_mengumpulkan',
        nilai NUMERIC(5,2),
        waktu_pengumpulan TIMESTAMP,
        deadline TIMESTAMP,
        tautan_tugas TEXT,
        catatan_instruktur TEXT,
        external_source VARCHAR(100) DEFAULT 'External Ingest System',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_mahasiswa_npm ON mahasiswa(npm);
      CREATE INDEX IF NOT EXISTS idx_log_login_waktu ON log_login_mahasiswa(waktu_login);
      CREATE INDEX IF NOT EXISTS idx_log_login_npm ON log_login_mahasiswa(npm);
      CREATE INDEX IF NOT EXISTS idx_log_active ON log_login_mahasiswa(is_active_now);
      CREATE INDEX IF NOT EXISTS idx_tugas_npm ON tugas_mahasiswa(npm);
      CREATE INDEX IF NOT EXISTS idx_tugas_status ON tugas_mahasiswa(status);
      CREATE INDEX IF NOT EXISTS idx_tugas_sesi ON tugas_mahasiswa(nama_sesi);
    `);

    // Seed default users if not exists (Password SHA-1, ON CONFLICT DO NOTHING)
    const adminHash = hashPasswordSha1('admin123');
    const asistenHash = hashPasswordSha1('asisten123');

    await client.query(`
      INSERT INTO users (username, password, nama, role) VALUES 
      ('admin', $1, 'Administrator Pembekalan', 'admin'),
      ('asisten', $2, 'Asisten Laboratorium', 'asisten')
      ON CONFLICT (username) DO NOTHING;
    `, [adminHash, asistenHash]);

    // Seed default kelas (ON CONFLICT DO NOTHING)
    for (const k of initialKelas) {
      await client.query(
        'INSERT INTO kelas_pembekalan (id, nama_kelas, deskripsi, kuota) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
        [k.id, k.nama_kelas, k.deskripsi, k.kuota]
      );
    }

    // Seed default sesi (ON CONFLICT DO NOTHING)
    for (const s of initialSesi) {
      await client.query(
        'INSERT INTO sesi_pembekalan (id, kelas_pembekalan_id, nama_sesi, tanggal, hari, jam_mulai, jam_selesai, ruangan, instruktur, asisten) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING',
        [s.id, s.kelas_pembekalan_id, s.nama_sesi, s.tanggal || null, s.hari, s.jam_mulai, s.jam_selesai, s.ruangan, s.instruktur, JSON.stringify(s.asisten || [])]
      );
    }

    // Seed default mahasiswa (ON CONFLICT DO NOTHING)
    for (const m of initialMahasiswa) {
      await client.query(
        'INSERT INTO mahasiswa (id, npm, nama, kelas, kelas_pembekalan_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (npm) DO NOTHING',
        [m.id, m.npm, m.nama, m.kelas, m.kelas_pembekalan_id]
      );
    }

    // Sinkronisasi sequences agar auto-increment ID baru tidak bentrok
    await client.query(`
      SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
      SELECT setval('kelas_pembekalan_id_seq', COALESCE((SELECT MAX(id) FROM kelas_pembekalan), 1));
      SELECT setval('sesi_pembekalan_id_seq', COALESCE((SELECT MAX(id) FROM sesi_pembekalan), 1));
      SELECT setval('mahasiswa_id_seq', COALESCE((SELECT MAX(id) FROM mahasiswa), 1));
    `);

    isDbInitialized = true;
    console.log('✅ Inisiasi database berhasil (aman: data input pengguna tidak ditimpa).');
    return { success: true, message: 'Inisiasi tabel dan schema database berhasil diselesaikan.' };
  } finally {
    if (shouldRelease && client) {
      client.release();
    }
  }
}

// Initialize Database connection without auto-seeding
export async function initializeDatabase(retries = 4, delayMs = 1500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔌 Menghubungkan ke PostgreSQL (${poolConfig.host}:${poolConfig.port}/${poolConfig.database}) [Percobaan ${attempt}/${retries}]...`);
      if (!pool) {
        pool = new Pool(poolConfig);
      }
      const client = await pool.connect();
      console.log('✅ PostgreSQL connected successfully!');
      isPostgresConnected = true;
      lastDbError = null;

      // Periksa apakah tabel sudah diinisiasi sebelumnya
      const tableCheck = await client.query(`
        SELECT 
          to_regclass('public.users') as users_table,
          to_regclass('public.mahasiswa') as mahasiswa_table
      `);
      const hasUsers = !!tableCheck.rows[0]?.users_table;
      const hasMahasiswa = !!tableCheck.rows[0]?.mahasiswa_table;
      isDbInitialized = hasUsers && hasMahasiswa;

      // JANGAN inisiasi otomatis saat docker compose up / build,
      // kecuali secara eksplisit diaktifkan lewat variabel AUTO_INIT_DB=true
      if (process.env.AUTO_INIT_DB === 'true') {
        console.log('⚙️ AUTO_INIT_DB=true aktif, menjalankan inisiasi...');
        await runDatabaseInitialization(client);
      } else {
        if (isDbInitialized) {
          console.log('🔒 Database terhubung. Mode aman: Auto-inisiasi dinonaktifkan untuk menjaga data input pengguna.');
          try {
            await client.query(`
              SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
              SELECT setval('kelas_pembekalan_id_seq', COALESCE((SELECT MAX(id) FROM kelas_pembekalan), 1));
              SELECT setval('sesi_pembekalan_id_seq', COALESCE((SELECT MAX(id) FROM sesi_pembekalan), 1));
              SELECT setval('mahasiswa_id_seq', COALESCE((SELECT MAX(id) FROM mahasiswa), 1));
            `);
          } catch (seqErr) {
            // Abaikan
          }
        } else {
          console.log('ℹ️ PostgreSQL terhubung namun tabel belum diinisiasi.');
          console.log('👉 Lakukan inisiasi manual dari luar docker dengan salah satu cara berikut:');
          console.log('   1. docker compose exec db psql -U ${PGUSER} -d ${PGDATABASE} -f /init.sql');
          console.log('   2. docker compose exec app npm run db:init');
        }
      }

      client.release();
      return true;
    } catch (err: any) {
      lastDbError = err.message;
      console.warn(`⚠️ [Percobaan ${attempt}/${retries}] Gagal menghubungkan ke PostgreSQL:`, err.message);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.warn('⚠️ Tidak dapat terhubung ke server PostgreSQL.');
        console.log('ℹ️ Berjalan dalam mode cadangan memori (In-Memory Fallback).');
        isPostgresConnected = false;
      }
    }
  }

  return false;
}

// Background auto-reconnect berkala jika PostgreSQL belum terhubung
setInterval(async () => {
  if (!isPostgresConnected) {
    try {
      if (!pool) {
        pool = new Pool(poolConfig);
      }
      const client = await pool.connect();
      isPostgresConnected = true;
      lastDbError = null;
      console.log('✅ PostgreSQL Auto-Reconnect Berhasil terhubung!');
      client.release();
    } catch (err: any) {
      lastDbError = err.message;
    }
  }
}, 12000);

export function getDatabaseStatus() {
  let modeDescription = 'In-Memory Fallback (PostgreSQL Tidak Terhubung)';
  if (isPostgresConnected) {
    modeDescription = isDbInitialized
      ? 'PostgreSQL Active (Live Connection - Aman/No-Auto-Init)'
      : 'PostgreSQL Connected (Menunggu Inisiasi Manual)';
  }

  return {
    isPostgresConnected,
    isDbInitialized,
    mode: modeDescription,
    host: poolConfig.host,
    port: poolConfig.port,
    database: poolConfig.database,
    user: poolConfig.user,
    lastError: lastDbError,
  };
}

/**
 * Otentikasi pengguna menggunakan verifikasi hash SHA-1.
 * Password input di-hash dengan SHA-1 sebelum dicocokkan dengan nilai di tabel users.
 */
export async function authenticateUser(
  username: string,
  plainPassword: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  const trimmedUsername = username.trim().toLowerCase();
  const inputHash = hashPasswordSha1(plainPassword);

  // 1. Verifikasi dengan PostgreSQL jika terhubung
  if (isPostgresConnected && pool) {
    try {
      const res = await pool.query(
        'SELECT id, username, password, nama, role, created_at FROM users WHERE LOWER(username) = $1',
        [trimmedUsername]
      );

      if (res.rows.length === 0) {
        return { success: false, error: 'Username tidak ditemukan di database.' };
      }

      const userRow = res.rows[0];
      const storedPassword = userRow.password;

      // Cek kecocokan hash SHA-1 (atau fallback plaintext untuk database lama yang belum termigrasi)
      const isMatch = storedPassword === inputHash || storedPassword === plainPassword;

      if (!isMatch) {
        return { success: false, error: 'Kata sandi salah.' };
      }

      // Jika password di PostgreSQL masih plaintext, upgrade langsung ke hash SHA-1
      if (storedPassword !== inputHash) {
        try {
          await pool.query('UPDATE users SET password = $1 WHERE id = $2', [inputHash, userRow.id]);
          console.log(`🔒 Password pengguna '${userRow.username}' telah di-upgrade ke hash SHA-1 di PostgreSQL`);
        } catch (upgradeErr) {
          console.warn('Gagal memperbarui password ke hash SHA-1:', upgradeErr);
        }
      }

      return {
        success: true,
        user: {
          id: userRow.id,
          username: userRow.username,
          nama: userRow.nama,
          role: userRow.role,
          created_at: userRow.created_at,
        },
      };
    } catch (e: any) {
      console.error('Error saat verifikasi login di PostgreSQL, beralih ke memori:', e);
    }
  }

  // 2. Verifikasi dengan memoryStore jika PostgreSQL tidak terhubung
  const record = memoryStore.userRecords.find(
    (u) => u.username.toLowerCase() === trimmedUsername
  );

  if (!record) {
    return { success: false, error: 'Username tidak ditemukan.' };
  }

  const isMemMatch = record.password_hash === inputHash || record.password_hash === plainPassword;
  if (!isMemMatch) {
    return { success: false, error: 'Kata sandi salah.' };
  }

  return {
    success: true,
    user: {
      id: record.id,
      username: record.username,
      nama: record.nama,
      role: record.role,
    },
  };
}

/**
 * Mengubah kata sandi pengguna dengan enkripsi hash SHA-1.
 */
export async function changeUserPassword(
  userId: number,
  oldPlainPassword: string,
  newPlainPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!newPlainPassword || newPlainPassword.length < 4) {
    return { success: false, error: 'Kata sandi baru minimal 4 karakter.' };
  }

  const oldHash = hashPasswordSha1(oldPlainPassword);
  const newHash = hashPasswordSha1(newPlainPassword);

  if (isPostgresConnected && pool) {
    try {
      const res = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
      if (res.rows.length === 0) {
        return { success: false, error: 'Pengguna tidak ditemukan di database.' };
      }

      const currentStored = res.rows[0].password;
      if (currentStored !== oldHash && currentStored !== oldPlainPassword) {
        return { success: false, error: 'Kata sandi lama salah.' };
      }

      await pool.query('UPDATE users SET password = $1 WHERE id = $2', [newHash, userId]);

      // Update juga di memoryStore jika ada
      const memRecord = memoryStore.userRecords.find((u) => u.id === userId);
      if (memRecord) memRecord.password_hash = newHash;

      return { success: true };
    } catch (e: any) {
      console.error('Error ubah password di PostgreSQL:', e);
      throw new Error(`Gagal mengubah password di PostgreSQL: ${e.message}`);
    }
  }

  const memRecord = memoryStore.userRecords.find((u) => u.id === userId);
  if (!memRecord) {
    return { success: false, error: 'Pengguna tidak ditemukan.' };
  }

  if (memRecord.password_hash !== oldHash && memRecord.password_hash !== oldPlainPassword) {
    return { success: false, error: 'Kata sandi lama salah.' };
  }

  memRecord.password_hash = newHash;
  return { success: true };
}

// Helpers for Data Operations
export async function getAllMahasiswa(): Promise<Mahasiswa[]> {
  if (isPostgresConnected && pool) {
    try {
      const res = await pool.query(`
        SELECT m.id, m.npm, m.nama, m.kelas, m.kelas_pembekalan_id, k.nama_kelas as nama_kelas_pembekalan, m.created_at, m.updated_at
        FROM mahasiswa m
        LEFT JOIN kelas_pembekalan k ON m.kelas_pembekalan_id = k.id
        ORDER BY m.npm ASC
      `);
      return res.rows;
    } catch (e) {
      console.error('PostgreSQL query error, falling back:', e);
    }
  }

  return memoryStore.mahasiswa.map((m) => {
    const k = memoryStore.kelas.find((c) => c.id === m.kelas_pembekalan_id);
    return {
      ...m,
      nama_kelas_pembekalan: k ? k.nama_kelas : 'Belum Ditentukan',
    };
  });
}

export async function addMahasiswa(data: { npm: string; nama: string; kelas: string; kelas_pembekalan_id: number }): Promise<Mahasiswa> {
  if (isPostgresConnected && pool) {
    try {
      const res = await pool.query(
        `INSERT INTO mahasiswa (npm, nama, kelas, kelas_pembekalan_id) VALUES ($1, $2, $3, $4) RETURNING *`,
        [data.npm, data.nama, data.kelas, data.kelas_pembekalan_id]
      );
      const inserted = res.rows[0];
      const k = await pool.query('SELECT nama_kelas FROM kelas_pembekalan WHERE id = $1', [data.kelas_pembekalan_id]);
      return {
        ...inserted,
        nama_kelas_pembekalan: k.rows[0]?.nama_kelas,
      };
    } catch (e: any) {
      console.error('❌ PostgreSQL insert error in addMahasiswa:', e);
      throw new Error(`Gagal menyimpan ke database PostgreSQL: ${e.message}`);
    }
  }

  const existing = memoryStore.mahasiswa.find((m) => m.npm === data.npm);
  if (existing) {
    throw new Error(`Mahasiswa dengan NPM ${data.npm} sudah terdaftar`);
  }

  const newId = memoryStore.mahasiswa.length > 0 ? Math.max(...memoryStore.mahasiswa.map((m) => m.id)) + 1 : 1;
  const k = memoryStore.kelas.find((c) => c.id === data.kelas_pembekalan_id);
  const newMahasiswa: Mahasiswa = {
    id: newId,
    npm: data.npm,
    nama: data.nama,
    kelas: data.kelas,
    kelas_pembekalan_id: data.kelas_pembekalan_id,
    nama_kelas_pembekalan: k ? k.nama_kelas : undefined,
    created_at: new Date().toISOString(),
  };

  memoryStore.mahasiswa.push(newMahasiswa);
  return newMahasiswa;
}

export async function updateMahasiswa(id: number, data: { npm: string; nama: string; kelas: string; kelas_pembekalan_id: number }): Promise<Mahasiswa> {
  if (isPostgresConnected && pool) {
    try {
      const res = await pool.query(
        `UPDATE mahasiswa SET npm = $1, nama = $2, kelas = $3, kelas_pembekalan_id = $4, updated_at = NOW() WHERE id = $5 RETURNING *`,
        [data.npm, data.nama, data.kelas, data.kelas_pembekalan_id, id]
      );
      if (res.rows.length === 0) throw new Error('Mahasiswa tidak ditemukan di database');
      const k = await pool.query('SELECT nama_kelas FROM kelas_pembekalan WHERE id = $1', [data.kelas_pembekalan_id]);
      return {
        ...res.rows[0],
        nama_kelas_pembekalan: k.rows[0]?.nama_kelas,
      };
    } catch (e: any) {
      console.error('❌ PostgreSQL update error in updateMahasiswa:', e);
      throw new Error(`Gagal mengubah data di database PostgreSQL: ${e.message}`);
    }
  }

  const index = memoryStore.mahasiswa.findIndex((m) => m.id === id);
  if (index === -1) throw new Error('Mahasiswa tidak ditemukan');

  const k = memoryStore.kelas.find((c) => c.id === data.kelas_pembekalan_id);
  memoryStore.mahasiswa[index] = {
    ...memoryStore.mahasiswa[index],
    npm: data.npm,
    nama: data.nama,
    kelas: data.kelas,
    kelas_pembekalan_id: data.kelas_pembekalan_id,
    nama_kelas_pembekalan: k ? k.nama_kelas : undefined,
    updated_at: new Date().toISOString(),
  };

  return memoryStore.mahasiswa[index];
}

export async function deleteMahasiswa(id: number): Promise<boolean> {
  if (isPostgresConnected && pool) {
    try {
      const res = await pool.query('DELETE FROM mahasiswa WHERE id = $1 RETURNING id', [id]);
      return (res.rowCount ?? 0) > 0;
    } catch (e: any) {
      console.error('❌ PostgreSQL delete error in deleteMahasiswa:', e);
      throw new Error(`Gagal menghapus data di database PostgreSQL: ${e.message}`);
    }
  }

  const initialLen = memoryStore.mahasiswa.length;
  memoryStore.mahasiswa = memoryStore.mahasiswa.filter((m) => m.id !== id);
  return memoryStore.mahasiswa.length < initialLen;
}

export async function getAllKelasReferensi(): Promise<KelasPembekalan[]> {
  if (isPostgresConnected && pool) {
    try {
      const kelasRes = await pool.query(`
        SELECT k.*, 
          (SELECT COUNT(*) FROM mahasiswa m WHERE m.kelas_pembekalan_id = k.id) as jumlah_mahasiswa
        FROM kelas_pembekalan k
        ORDER BY k.id ASC
      `);
      const sesiRes = await pool.query(`
        SELECT * FROM sesi_pembekalan ORDER BY id ASC
      `);

      return kelasRes.rows.map((k) => ({
        ...k,
        jumlah_mahasiswa: parseInt(k.jumlah_mahasiswa || '0', 10),
        sesi_list: sesiRes.rows
          .filter((s) => s.kelas_pembekalan_id === k.id)
          .map((s) => ({
            ...s,
            asisten: Array.isArray(s.asisten)
              ? s.asisten
              : typeof s.asisten === 'string'
              ? (() => {
                  try {
                    return JSON.parse(s.asisten);
                  } catch {
                    return [];
                  }
                })()
              : [],
          })),
      }));
    } catch (e) {
      console.error('PostgreSQL error fetching referensi:', e);
    }
  }

  return memoryStore.kelas.map((k) => {
    const sesiList = memoryStore.sesi.filter((s) => s.kelas_pembekalan_id === k.id);
    const mhsCount = memoryStore.mahasiswa.filter((m) => m.kelas_pembekalan_id === k.id).length;
    return {
      ...k,
      jumlah_mahasiswa: mhsCount,
      sesi_list: sesiList,
    };
  });
}

export async function createKelasReferensi(data: {
  nama_kelas: string;
  deskripsi?: string;
  kuota?: number;
  sesi_list?: Array<Omit<SesiPembekalan, 'id' | 'kelas_pembekalan_id'>>;
}): Promise<KelasPembekalan> {
  if (isPostgresConnected && pool) {
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const res = await client.query(
          'INSERT INTO kelas_pembekalan (nama_kelas, deskripsi, kuota) VALUES ($1, $2, $3) RETURNING *',
          [data.nama_kelas, data.deskripsi || '', data.kuota || 40]
        );
        const newKelas = res.rows[0];
        const createdSesi: SesiPembekalan[] = [];

        if (data.sesi_list && data.sesi_list.length > 0) {
          for (const s of data.sesi_list) {
            const asistenArr = Array.isArray(s.asisten) ? s.asisten.filter(Boolean).slice(0, 4) : [];
            const sRes = await client.query(
              'INSERT INTO sesi_pembekalan (kelas_pembekalan_id, nama_sesi, tanggal, hari, jam_mulai, jam_selesai, ruangan, instruktur, asisten) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
              [newKelas.id, s.nama_sesi, s.tanggal || null, s.hari, s.jam_mulai, s.jam_selesai, s.ruangan || '', s.instruktur || '', JSON.stringify(asistenArr)]
            );
            createdSesi.push({
              ...sRes.rows[0],
              asisten: asistenArr,
            });
          }
        }
        await client.query('COMMIT');
        return {
          ...newKelas,
          jumlah_mahasiswa: 0,
          sesi_list: createdSesi,
        };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (e: any) {
      console.error('❌ PostgreSQL create referensi error:', e);
      throw new Error(`Gagal menyimpan kelas referensi ke database PostgreSQL: ${e.message}`);
    }
  }

  const newId = memoryStore.kelas.length > 0 ? Math.max(...memoryStore.kelas.map((k) => k.id)) + 1 : 1;
  const newKelas: KelasPembekalan = {
    id: newId,
    nama_kelas: data.nama_kelas,
    deskripsi: data.deskripsi || '',
    kuota: data.kuota || 40,
    jumlah_mahasiswa: 0,
    created_at: new Date().toISOString(),
  };

  memoryStore.kelas.push(newKelas);

  const createdSesiList: SesiPembekalan[] = [];
  if (data.sesi_list && data.sesi_list.length > 0) {
    for (const s of data.sesi_list) {
      const sId = memoryStore.sesi.length > 0 ? Math.max(...memoryStore.sesi.map((item) => item.id)) + 1 : 1;
      const asistenArr = Array.isArray(s.asisten) ? s.asisten.filter(Boolean).slice(0, 4) : [];
      const newSesi: SesiPembekalan = {
        id: sId,
        kelas_pembekalan_id: newId,
        nama_sesi: s.nama_sesi,
        tanggal: s.tanggal,
        hari: s.hari,
        jam_mulai: s.jam_mulai,
        jam_selesai: s.jam_selesai,
        ruangan: s.ruangan,
        instruktur: s.instruktur,
        asisten: asistenArr,
      };
      memoryStore.sesi.push(newSesi);
      createdSesiList.push(newSesi);
    }
  }

  return {
    ...newKelas,
    sesi_list: createdSesiList,
  };
}

export async function updateKelasReferensi(
  id: number,
  data: {
    nama_kelas: string;
    deskripsi?: string;
    kuota?: number;
    sesi_list?: Array<{
      id?: number;
      nama_sesi: string;
      tanggal?: string;
      hari: string;
      jam_mulai: string;
      jam_selesai: string;
      ruangan?: string;
      instruktur?: string;
      asisten?: string[];
    }>;
  }
): Promise<KelasPembekalan> {
  if (isPostgresConnected && pool) {
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const res = await client.query(
          'UPDATE kelas_pembekalan SET nama_kelas = $1, deskripsi = $2, kuota = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
          [data.nama_kelas, data.deskripsi || '', data.kuota || 40, id]
        );
        if (res.rows.length === 0) throw new Error('Kelas pembekalan tidak ditemukan');
        const updatedKelas = res.rows[0];

        // Replace sessions
        if (data.sesi_list !== undefined) {
          await client.query('DELETE FROM sesi_pembekalan WHERE kelas_pembekalan_id = $1', [id]);
          for (const s of data.sesi_list) {
            const asistenArr = Array.isArray(s.asisten) ? s.asisten.filter(Boolean).slice(0, 4) : [];
            await client.query(
              'INSERT INTO sesi_pembekalan (kelas_pembekalan_id, nama_sesi, tanggal, hari, jam_mulai, jam_selesai, ruangan, instruktur, asisten) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
              [id, s.nama_sesi, s.tanggal || null, s.hari, s.jam_mulai, s.jam_selesai, s.ruangan || '', s.instruktur || '', JSON.stringify(asistenArr)]
            );
          }
        }
        await client.query('COMMIT');
        return updatedKelas;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (e: any) {
      console.error('❌ PostgreSQL update referensi error:', e);
      throw new Error(`Gagal memperbarui kelas referensi di database PostgreSQL: ${e.message}`);
    }
  }

  const kIndex = memoryStore.kelas.findIndex((k) => k.id === id);
  if (kIndex === -1) throw new Error('Kelas pembekalan tidak ditemukan');

  memoryStore.kelas[kIndex] = {
    ...memoryStore.kelas[kIndex],
    nama_kelas: data.nama_kelas,
    deskripsi: data.deskripsi ?? memoryStore.kelas[kIndex].deskripsi,
    kuota: data.kuota ?? memoryStore.kelas[kIndex].kuota,
    updated_at: new Date().toISOString(),
  };

  if (data.sesi_list) {
    // Remove old sessions for this class
    memoryStore.sesi = memoryStore.sesi.filter((s) => s.kelas_pembekalan_id !== id);
    // Add new sessions
    for (const s of data.sesi_list) {
      const sId = memoryStore.sesi.length > 0 ? Math.max(...memoryStore.sesi.map((item) => item.id)) + 1 : 1;
      const asistenArr = Array.isArray(s.asisten) ? s.asisten.filter(Boolean).slice(0, 4) : [];
      memoryStore.sesi.push({
        id: sId,
        kelas_pembekalan_id: id,
        nama_sesi: s.nama_sesi,
        tanggal: s.tanggal,
        hari: s.hari,
        jam_mulai: s.jam_mulai,
        jam_selesai: s.jam_selesai,
        ruangan: s.ruangan,
        instruktur: s.instruktur,
        asisten: asistenArr,
      });
    }
  }

  return memoryStore.kelas[kIndex];
}

export async function deleteKelasReferensi(id: number): Promise<boolean> {
  if (isPostgresConnected && pool) {
    try {
      const countRes = await pool.query('SELECT COUNT(*) FROM mahasiswa WHERE kelas_pembekalan_id = $1', [id]);
      if (parseInt(countRes.rows[0].count, 10) > 0) {
        throw new Error('Kelas tidak dapat dihapus karena masih digunakan oleh mahasiswa');
      }
      await pool.query('DELETE FROM kelas_pembekalan WHERE id = $1', [id]);
      return true;
    } catch (e: any) {
      console.error('PostgreSQL delete referensi error, falling back:', e);
      throw e;
    }
  }

  const mhsUsing = memoryStore.mahasiswa.some((m) => m.kelas_pembekalan_id === id);
  if (mhsUsing) {
    throw new Error('Kelas tidak dapat dihapus karena masih digunakan oleh data mahasiswa.');
  }

  memoryStore.kelas = memoryStore.kelas.filter((k) => k.id !== id);
  memoryStore.sesi = memoryStore.sesi.filter((s) => s.kelas_pembekalan_id !== id);
  return true;
}

// Live Monitoring: daftar mahasiswa yang sedang aktif login HANYA sesi hari ini
export async function getLiveActiveMahasiswaToday(): Promise<{
  activeList: LiveActiveMahasiswa[];
  todayDayName: string;
  totalActiveToday: number;
  totalSessionsToday: number;
  todaySessions: SesiPembekalan[];
}> {
  const now = new Date();
  const dayNamesIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayName = dayNamesIndo[now.getDay()];

  // Ambil semua sesi yang dijadwalkan pada hari ini
  let allSesi = memoryStore.sesi;
  if (isPostgresConnected && pool) {
    try {
      const sRes = await pool.query('SELECT * FROM sesi_pembekalan WHERE LOWER(hari) = LOWER($1)', [todayName]);
      allSesi = sRes.rows.map((s) => ({
        ...s,
        asisten: Array.isArray(s.asisten)
          ? s.asisten
          : typeof s.asisten === 'string'
          ? (() => {
              try {
                return JSON.parse(s.asisten);
              } catch {
                return [];
              }
            })()
          : [],
      }));
    } catch (e) {
      console.error('PG query error in live monitoring:', e);
    }
  } else {
    allSesi = memoryStore.sesi.filter((s) => s.hari.toLowerCase() === todayName.toLowerCase());
  }

  // Jika hari ini belum ada sesi yang dijadwalkan, ambil sesi hari ini atau sesi terdekat
  const todaySesiIds = allSesi.map((s) => s.id);
  const todayKelasIds = allSesi.map((s) => s.kelas_pembekalan_id);

  // Ambil log yang aktif login hari ini
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  const activeLogs = memoryStore.riwayat.filter((log) => {
    const logDate = new Date(log.waktu_login);
    const isToday = logDate >= todayStart;
    const isStillActive = log.status === 'login' || !log.waktu_logout;
    return isToday && isStillActive;
  });

  const activeList: LiveActiveMahasiswa[] = activeLogs.map((log) => {
    const m = memoryStore.mahasiswa.find((item) => item.npm === log.npm);
    const k = memoryStore.kelas.find((c) => c.nama_kelas === log.nama_kelas_pembekalan);
    const sesi = memoryStore.sesi.find((s) => s.nama_sesi === log.nama_sesi && s.hari === todayName) || memoryStore.sesi[0];

    const diffMinutes = Math.max(1, Math.round((now.getTime() - new Date(log.waktu_login).getTime()) / 60000));

    return {
      id: log.id,
      mahasiswa_id: log.mahasiswa_id || m?.id,
      npm: log.npm,
      nama: log.nama,
      kelas: log.kelas,
      nama_kelas_pembekalan: log.nama_kelas_pembekalan,
      nama_sesi: log.nama_sesi,
      hari: todayName,
      jam_mulai: sesi ? sesi.jam_mulai : '08:00',
      jam_selesai: sesi ? sesi.jam_selesai : '10:00',
      waktu_login: log.waktu_login,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      device_info: log.user_agent.includes('Macintosh') ? 'macOS • Safari/Chrome' : log.user_agent.includes('Windows') ? 'Windows 11 • Chrome' : 'Linux/Android',
      status: diffMinutes > 60 ? 'idle' : 'aktif',
      durasi_menit: diffMinutes,
    };
  });

  return {
    activeList,
    todayDayName: todayName,
    totalActiveToday: activeList.length,
    totalSessionsToday: allSesi.length,
    todaySessions: allSesi,
  };
}

// Ingest Login Event from External System
export async function recordExternalLogin(payload: {
  npm: string;
  nama?: string;
  kelas?: string;
  nama_kelas_pembekalan?: string;
  nama_sesi?: string;
  ip_address?: string;
  user_agent?: string;
  action?: 'login' | 'logout' | 'ping';
}): Promise<{ success: boolean; message: string; log: RiwayatLoginMahasiswa }> {
  // Cari mahasiswa berdasarkan NPM
  let m = memoryStore.mahasiswa.find((item) => item.npm === payload.npm);
  if (isPostgresConnected && pool) {
    try {
      const res = await pool.query('SELECT * FROM mahasiswa WHERE npm = $1', [payload.npm]);
      if (res.rows.length > 0) m = res.rows[0];
    } catch (e) {
      console.error('PG query error during external login:', e);
    }
  }

  const nama = payload.nama || (m ? m.nama : `Mahasiswa (${payload.npm})`);
  const kelas = payload.kelas || (m ? m.kelas : 'Reguler');

  let kelasPembekalanNama = payload.nama_kelas_pembekalan;
  if (!kelasPembekalanNama && m) {
    const k = memoryStore.kelas.find((c) => c.id === m?.kelas_pembekalan_id);
    kelasPembekalanNama = k?.nama_kelas || 'Web Development & Cloud Computing';
  } else if (!kelasPembekalanNama) {
    kelasPembekalanNama = 'Web Development & Cloud Computing';
  }

  const dayNamesIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayName = dayNamesIndo[new Date().getDay()];
  const availableSesi = memoryStore.sesi.filter((s) => s.hari.toLowerCase() === todayName.toLowerCase());
  const sesiNama = payload.nama_sesi || (availableSesi.length > 0 ? availableSesi[0].nama_sesi : 'Sesi Pembekalan Hari Ini');

  const now = new Date();

  if (payload.action === 'logout') {
    // Update existing active log for this NPM
    const activeLog = memoryStore.riwayat.find((l) => l.npm === payload.npm && !l.waktu_logout);
    if (activeLog) {
      activeLog.waktu_logout = now.toISOString();
      activeLog.status = 'logout';
      activeLog.durasi_menit = Math.round((now.getTime() - new Date(activeLog.waktu_login).getTime()) / 60000);
      return { success: true, message: `Mahasiswa ${payload.npm} berhasil logout`, log: activeLog };
    }
  }

  const newLogId = memoryStore.riwayat.length > 0 ? Math.max(...memoryStore.riwayat.map((l) => l.id)) + 1 : 1;
  const newLog: RiwayatLoginMahasiswa = {
    id: newLogId,
    mahasiswa_id: m?.id,
    npm: payload.npm,
    nama,
    kelas,
    nama_kelas_pembekalan: kelasPembekalanNama,
    nama_sesi: sesiNama,
    waktu_login: now.toISOString(),
    waktu_logout: null,
    durasi_menit: 0,
    ip_address: payload.ip_address || '192.168.1.105',
    user_agent: payload.user_agent || 'External Client Application (v1.0)',
    status: 'login',
  };

  memoryStore.riwayat.unshift(newLog);

  if (isPostgresConnected && pool) {
    try {
      await pool.query(
        `INSERT INTO log_login_mahasiswa 
        (mahasiswa_id, npm, nama, kelas, nama_kelas_pembekalan, nama_sesi, waktu_login, ip_address, user_agent, status, is_active_now) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          m?.id || null,
          payload.npm,
          nama,
          kelas,
          kelasPembekalanNama,
          sesiNama,
          now,
          payload.ip_address || '127.0.0.1',
          payload.user_agent || 'External Client',
          'login',
          true,
        ]
      );
    } catch (e) {
      console.error('PG write error for external log:', e);
    }
  }

  return { success: true, message: `Login mahasiswa ${payload.npm} berhasil dicatat`, log: newLog };
}

// Riwayat Login Mahasiswa dengan rentang waktu tertentu
export async function getRiwayatLogin(filters: {
  startDate?: string;
  endDate?: string;
  search?: string;
  status?: string;
  kelas?: string;
}): Promise<RiwayatLoginMahasiswa[]> {
  let logs = [...memoryStore.riwayat];

  if (filters.startDate) {
    const start = new Date(filters.startDate);
    start.setHours(0, 0, 0, 0);
    logs = logs.filter((l) => new Date(l.waktu_login) >= start);
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    logs = logs.filter((l) => new Date(l.waktu_login) <= end);
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    logs = logs.filter(
      (l) =>
        l.npm.toLowerCase().includes(q) ||
        l.nama.toLowerCase().includes(q) ||
        l.kelas.toLowerCase().includes(q) ||
        l.nama_kelas_pembekalan.toLowerCase().includes(q)
    );
  }

  if (filters.status && filters.status !== 'all') {
    logs = logs.filter((l) => l.status === filters.status);
  }

  if (filters.kelas && filters.kelas !== 'all') {
    logs = logs.filter((l) => l.kelas === filters.kelas);
  }

  // Urutkan waktu login terbaru di atas
  logs.sort((a, b) => new Date(b.waktu_login).getTime() - new Date(a.waktu_login).getTime());

  return logs;
}

// -------------------------------------------------------------
// MANAJEMEN MONITORING TUGAS MAHASISWA (PERSESI)
// -------------------------------------------------------------

export interface TugasFilterOptions {
  kelas_pembekalan_id?: number;
  nama_sesi?: string;
  status?: string;
  search?: string;
  kelas_reguler?: string;
}

export interface MonitoringTugasResult {
  data: TugasMahasiswa[];
  summary: {
    total: number;
    dikumpulkan: number;
    dinilai?: number;
    terlambat?: number;
    belum?: number;
    persentase_pengumpulan?: number;
    rata_rata_nilai?: number;
    total_mahasiswa_unik: number;
    total_sesi: number;
  };
}

export async function getAllTugas(filters?: TugasFilterOptions): Promise<MonitoringTugasResult> {
  // Hanya mahasiswa yang sudah mengumpulkan tugas saja (tidak termasuk belum_mengumpulkan)
  let list = memoryStore.tugas.filter((t) => t.status !== 'belum_mengumpulkan' && t.waktu_pengumpulan !== null);

  if (filters?.kelas_pembekalan_id) {
    const kId = Number(filters.kelas_pembekalan_id);
    list = list.filter((t) => t.kelas_pembekalan_id === kId);
  }

  if (filters?.nama_sesi && filters.nama_sesi !== 'all') {
    const sesiFilter = filters.nama_sesi.toLowerCase();
    list = list.filter((t) => t.nama_sesi.toLowerCase() === sesiFilter || t.nama_sesi.toLowerCase().includes(sesiFilter));
  }

  if (filters?.status && filters.status !== 'all') {
    list = list.filter((t) => t.status === filters.status);
  }

  if (filters?.kelas_reguler && filters.kelas_reguler !== 'all') {
    list = list.filter((t) => t.kelas === filters.kelas_reguler);
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (t) =>
        t.npm.toLowerCase().includes(q) ||
        t.nama.toLowerCase().includes(q) ||
        t.kelas.toLowerCase().includes(q) ||
        t.nama_sesi.toLowerCase().includes(q) ||
        (t.nama_kelas_pembekalan && t.nama_kelas_pembekalan.toLowerCase().includes(q))
    );
  }

  // Metrik ringkasan sederhana tanpa evaluasi/koreksi
  const total = list.length;
  const uniqueStudents = new Set(list.map((t) => t.npm)).size;
  const uniqueSesi = new Set(list.map((t) => t.nama_sesi)).size;

  // Urutkan berdasarkan waktu pengumpulan terbaru
  list.sort((a, b) => {
    if (a.waktu_pengumpulan && b.waktu_pengumpulan) {
      return new Date(b.waktu_pengumpulan).getTime() - new Date(a.waktu_pengumpulan).getTime();
    }
    return a.nama.localeCompare(b.nama);
  });

  return {
    data: list,
    summary: {
      total,
      dikumpulkan: total,
      dinilai: 0,
      terlambat: 0,
      belum: 0,
      persentase_pengumpulan: 100,
      rata_rata_nilai: 0,
      total_mahasiswa_unik: uniqueStudents,
      total_sesi: uniqueSesi,
    },
  };
}

// Ingest External Task Event (dari LMS, Webhook Git, Auto-Grader, Bot Python, Google Classroom)
export async function recordExternalTask(payload: ExternalTaskPayload) {
  const now = new Date();
  const m = memoryStore.mahasiswa.find((item) => item.npm === payload.npm);
  const k = m ? memoryStore.kelas.find((c) => c.id === m.kelas_pembekalan_id) : null;
  const sesiMatch = memoryStore.sesi.find(
    (s) =>
      (m ? s.kelas_pembekalan_id === m.kelas_pembekalan_id : true) &&
      (s.nama_sesi.toLowerCase().includes(payload.nama_sesi.toLowerCase()) ||
        payload.nama_sesi.toLowerCase().includes(s.nama_sesi.toLowerCase()))
  );

  const nama = payload.nama || m?.nama || 'Mahasiswa Terdaftar';
  const kelas = payload.kelas || m?.kelas || '4IA01';
  const kelasPembekalanId = m?.kelas_pembekalan_id || 1;
  const kelasPembekalanNama = payload.nama_kelas_pembekalan || k?.nama_kelas || 'Web Development';
  const sesiNama = sesiMatch?.nama_sesi || payload.nama_sesi;
  const status: StatusTugas = payload.status || (payload.nilai !== undefined && payload.nilai !== null ? 'dinilai' : 'sudah_dikumpulkan');

  // Cari apakah tugas per mahasiswa & sesi ini sudah ada di store
  let existingIndex = memoryStore.tugas.findIndex(
    (t) => t.npm === payload.npm && (t.nama_sesi.toLowerCase() === sesiNama.toLowerCase() || t.sesi_id === sesiMatch?.id)
  );

  let updatedTask: TugasMahasiswa;

  if (existingIndex !== -1) {
    const current = memoryStore.tugas[existingIndex];
    updatedTask = {
      ...current,
      nama,
      kelas,
      nama_kelas_pembekalan: kelasPembekalanNama,
      status,
      nilai: payload.nilai !== undefined ? payload.nilai : current.nilai,
      waktu_pengumpulan: payload.waktu_pengumpulan || now.toISOString(),
      tautan_tugas: payload.tautan_tugas || current.tautan_tugas,
      catatan_instruktur: payload.catatan_instruktur || current.catatan_instruktur,
      external_source: payload.external_source || current.external_source || 'External Ingest API',
      updated_at: now.toISOString(),
    };
    memoryStore.tugas[existingIndex] = updatedTask;
  } else {
    const newId = memoryStore.tugas.length > 0 ? Math.max(...memoryStore.tugas.map((t) => t.id)) + 1 : 1;
    updatedTask = {
      id: newId,
      mahasiswa_id: m?.id,
      npm: payload.npm,
      nama,
      kelas,
      kelas_pembekalan_id: kelasPembekalanId,
      nama_kelas_pembekalan: kelasPembekalanNama,
      sesi_id: sesiMatch?.id,
      nama_sesi: sesiNama,
      judul_tugas: payload.judul_tugas || `Tugas Mandiri: ${sesiNama}`,
      status,
      nilai: payload.nilai !== undefined ? payload.nilai : null,
      waktu_pengumpulan: payload.waktu_pengumpulan || now.toISOString(),
      deadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      tautan_tugas: payload.tautan_tugas || null,
      catatan_instruktur: payload.catatan_instruktur || null,
      external_source: payload.external_source || 'External Ingest API',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    memoryStore.tugas.unshift(updatedTask);
  }

  // Update ke PostgreSQL jika terhubung
  if (isPostgresConnected && pool) {
    try {
      await pool.query(
        `INSERT INTO tugas_mahasiswa 
        (mahasiswa_id, npm, nama, kelas, kelas_pembekalan_id, nama_kelas_pembekalan, sesi_id, nama_sesi, judul_tugas, status, nilai, waktu_pengumpulan, tautan_tugas, catatan_instruktur, external_source) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET 
          status = EXCLUDED.status,
          nilai = EXCLUDED.nilai,
          waktu_pengumpulan = EXCLUDED.waktu_pengumpulan,
          tautan_tugas = EXCLUDED.tautan_tugas,
          catatan_instruktur = EXCLUDED.catatan_instruktur,
          updated_at = CURRENT_TIMESTAMP`,
        [
          updatedTask.mahasiswa_id || null,
          updatedTask.npm,
          updatedTask.nama,
          updatedTask.kelas,
          updatedTask.kelas_pembekalan_id,
          updatedTask.nama_kelas_pembekalan,
          updatedTask.sesi_id || null,
          updatedTask.nama_sesi,
          updatedTask.judul_tugas,
          updatedTask.status,
          updatedTask.nilai,
          updatedTask.waktu_pengumpulan,
          updatedTask.tautan_tugas,
          updatedTask.catatan_instruktur,
          updatedTask.external_source,
        ]
      );
    } catch (e) {
      console.error('PG write error for external task ingest:', e);
    }
  }

  return {
    success: true,
    message: `Data tugas persesi untuk ${updatedTask.npm} (${updatedTask.nama}) berhasil diinput dari sistem luar.`,
    data: updatedTask,
  };
}

// Simulasi Ingest Tugas Eksternal untuk kemudahan verifikasi & demonstrasi
export async function simulateExternalTaskSubmission() {
  const pendingTasks = memoryStore.tugas.filter((t) => t.status === 'belum_mengumpulkan');
  const target = pendingTasks.length > 0
    ? pendingTasks[Math.floor(Math.random() * pendingTasks.length)]
    : memoryStore.tugas[Math.floor(Math.random() * memoryStore.tugas.length)];

  if (!target) {
    return { success: false, error: 'Tidak ada data tugas yang dapat disimulasikan' };
  }

  const sources = ['LMS Moodle External', 'Google Classroom Webhook', 'AutoGrader Bot CI/CD', 'GitHub Classroom API'];
  const source = sources[Math.floor(Math.random() * sources.length)];
  const status: StatusTugas = 'sudah_dikumpulkan';

  return recordExternalTask({
    npm: target.npm,
    nama: target.nama,
    kelas: target.kelas,
    nama_kelas_pembekalan: target.nama_kelas_pembekalan,
    nama_sesi: target.nama_sesi,
    judul_tugas: target.judul_tugas,
    status,
    nilai: undefined,
    waktu_pengumpulan: new Date().toISOString(),
    tautan_tugas: `https://github.com/${target.npm}/submission-${Date.now().toString().slice(-4)}`,
    catatan_instruktur: undefined,
    external_source: source,
  });
}
