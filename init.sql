-- Script Inisialisasi Database PostgreSQL untuk Sistem Pembekalan Mahasiswa
-- Database: pembekalan_db

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
    hari VARCHAR(30) NOT NULL,
    jam_mulai VARCHAR(10) NOT NULL,
    jam_selesai VARCHAR(10) NOT NULL,
    ruangan VARCHAR(100),
    instruktur VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- Indeks untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_mahasiswa_npm ON mahasiswa(npm);
CREATE INDEX IF NOT EXISTS idx_log_login_waktu ON log_login_mahasiswa(waktu_login);
CREATE INDEX IF NOT EXISTS idx_log_login_npm ON log_login_mahasiswa(npm);
CREATE INDEX IF NOT EXISTS idx_log_active ON log_login_mahasiswa(is_active_now);
CREATE INDEX IF NOT EXISTS idx_tugas_npm ON tugas_mahasiswa(npm);
CREATE INDEX IF NOT EXISTS idx_tugas_status ON tugas_mahasiswa(status);
CREATE INDEX IF NOT EXISTS idx_tugas_sesi ON tugas_mahasiswa(nama_sesi);

-- Seed Pengguna Awal: Admin dan Asisten
INSERT INTO users (username, password, nama, role) VALUES 
('admin', 'admin123', 'Administrator Pembekalan', 'admin'),
('asisten', 'asisten123', 'Asisten Laboratorium', 'asisten')
ON CONFLICT (username) DO NOTHING;

-- Seed Kelas Pembekalan
INSERT INTO kelas_pembekalan (id, nama_kelas, deskripsi, kuota) VALUES
(1, 'Web Development & Cloud Computing', 'Pelatihan arsitektur modern web, RESTful API, dan kontainerisasi', 40),
(2, 'Data Science & Machine Learning', 'Pembekalan pipeline analitika data, model prediktif, dan visualisasi', 35),
(3, 'Cyber Security & Network Defense', 'Pembekalan keamanan jaringan, vulnerability assessment, dan ethical hacking', 30),
(4, 'Mobile Application Development', 'Pengembangan aplikasi mobile multiplatform dengan arsitektur reaktif', 35)
ON CONFLICT (id) DO NOTHING;

-- Seed Sesi Pembekalan Fleksibel
INSERT INTO sesi_pembekalan (kelas_pembekalan_id, nama_sesi, hari, jam_mulai, jam_selesai, ruangan, instruktur) VALUES
(1, 'Sesi 1: Dasar REST API & Database Design', 'Senin', '08:00', '10:00', 'Lab Komputer 1', 'Dr. Ir. Hendra Wijaya, M.Kom'),
(1, 'Sesi 2: Frontend Architecture & Tailwind', 'Rabu', '10:15', '12:15', 'Lab Komputer 1', 'Ahmad Fauzi, S.Kom, M.T'),
(1, 'Sesi 3: Docker Container & Deployment CI/CD', 'Jumat', '13:30', '15:30', 'Lab Komputer 3', 'Rian Pratama, M.Sc'),

(2, 'Sesi 1: Python Data Wrangling & Pandas', 'Selasa', '08:00', '10:00', 'Lab Riset AI', 'Prof. Siti Nurhaliza, Ph.D'),
(2, 'Sesi 2: Supervised & Unsupervised ML Models', 'Kamis', '13:00', '15:00', 'Lab Riset AI', 'Budi Santoso, M.Kom'),

(3, 'Sesi 1: Network Traffic Analysis & Wireshark', 'Senin', '10:30', '12:30', 'Lab Jaringan', 'Eko Prasetyo, CEH'),
(3, 'Sesi 2: Web Exploitation & SQL Injection Prevention', 'Kamis', '08:00', '10:00', 'Lab Jaringan', 'Dian Anggraini, OSCP'),

(4, 'Sesi 1: Cross-Platform UI Component & State Management', 'Rabu', '08:00', '10:00', 'Lab Multimedia', 'Kevin Susanto, S.T'),
(4, 'Sesi 2: API Integration & Offline SQLite Sync', 'Sabtu', '09:00', '11:00', 'Lab Multimedia', 'Kevin Susanto, S.T');

-- Seed Data Mahasiswa
INSERT INTO mahasiswa (npm, nama, kelas, kelas_pembekalan_id) VALUES
('50421001', 'Aditya Pratama Putra', '4IA01', 1),
('50421002', 'Bunga Citra Lestari', '4IA01', 1),
('50421003', 'Chandra Wijaya', '4IA02', 1),
('50421004', 'Dwi Septian Nugroho', '4IA02', 2),
('50421005', 'Elvira Rahmadani', '4IA03', 2),
('50421006', 'Fajar Ramadhan', '4IA03', 2),
('50421007', 'Gita Gutawa Putri', '4IA04', 3),
('50421008', 'Hafizh Ihsanuddin', '4IA04', 3),
('50421009', 'Indah Permata Sari', '4IA05', 4),
('50421010', 'Joko Tri Wahyudi', '4IA05', 4),
('50421011', 'Kartika Dewi', '4IA06', 1),
('50421012', 'Lukman Hakim', '4IA06', 3)
ON CONFLICT (npm) DO NOTHING;
