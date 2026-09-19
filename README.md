# Portal Pembekalan Mahasiswa & Live Monitoring Sesi

Aplikasi web manajemen data mahasiswa pembekalan, konfigurasi referensi kelas dan sesi dinamis (dilengkapi tanggal pelaksanaan, jam, ruangan, instruktur, dan asisten), live monitoring mahasiswa aktif (khusus jadwal sesi hari ini), monitoring pengumpulan tugas mahasiswa per sesi, dan riwayat login dengan database **PostgreSQL**.

---

## 👥 Pengguna & Hak Akses (Role)

Sistem menyediakan 2 (dua) akun pengguna terdaftar:

| Username | Password | Peran (Role) | Hak Akses |
| :--- | :--- | :--- | :--- |
| **admin** | `admin123` | **Administrator** | **Akses Penuh**: Tambah, Ubah, Hapus Mahasiswa, Import Excel, Konfigurasi Referensi Kelas & Sesi, Monitoring, Unduh PDF/Excel, dan Riwayat. |
| **asisten** | `asisten123` | **Asisten** | **Mode Lihat Saja (Read-Only)**: Hanya dapat melihat data mahasiswa, referensi kelas, live monitoring, daftar tugas mahasiswa, dan riwayat login. |

> **Keamanan:** Halaman utama portal adalah halaman Login. Setiap akses harus didahului autentikasi login.

---

## 🚀 Fitur & Modul Aplikasi

1. **Autentikasi Pengguna & Role Guard:** Validasi akun admin dan asisten dengan pengamanan sesi login.
2. **Manajemen Data Mahasiswa:** CRUD data mahasiswa (NPM, Nama, Kelas Reguler, Kelas Pembekalan), import massal via Excel (.xlsx), dan ekspor data.
3. **Referensi Kelas & Sesi Pembekalan:** Konfigurasi kelas dan jadwal sesi dinamis (Nama Sesi, **Tanggal Pelaksanaan**, Hari, Jam Mulai-Selesai, Ruangan, Instruktur, dan Asisten), serta cetak jadwal ke PDF & Excel.
4. **Live Monitoring Mahasiswa Aktif:** Pemantauan real-time mahasiswa yang sedang login khusus pada jadwal sesi hari ini.
5. **Monitoring Pengumpulan Tugas:** Daftar mahasiswa yang telah mengumpulkan tugas per sesi pembekalan (NPM, Nama Mahasiswa, Kelas, Sesi) dengan fitur ekspor ke Excel.
6. **Riwayat Akses Login:** Log aktivitas login/logout dengan filter rentang tanggal, status, pencarian, dan ekspor ke Excel.

---

## 📡 Dokumentasi REST API Integrasi Sistem Eksternal

Endpoint ini dirancang khusus untuk menghubungkan sistem pihak luar (seperti aplikasi gerbang lab/RFID presensi, portal kampus, LMS Moodle, Google Classroom, bot auto-grader, atau webhook Git) ke portal ini.

**Base URL:**
```text
http://localhost:3000
```

---

### 1. Ingest Event Login Mahasiswa (Presensi Sesi Live)

Digunakan oleh aplikasi presensi eksternal (aplikasi komputer lab, reader RFID, gerbang laboratorium, atau portal kampus) untuk mencatat mahasiswa yang login atau logout secara real-time pada sesi pembekalan yang sedang berlangsung.

- **Method:** `POST`
- **Endpoint:** `/api/external/login-event`
- **Headers:** `Content-Type: application/json`

#### Parameter Payload (JSON):
| Parameter | Tipe | Status | Keterangan |
| :--- | :--- | :--- | :--- |
| `npm` | String | **Wajib** | Nomor Pokok Mahasiswa |
| `action` | String | Opsional | `login` (default) atau `logout` |
| `nama` | String | Opsional | Nama lengkap mahasiswa (jika tersedia di sistem luar) |
| `kelas` | String | Opsional | Kelas reguler mahasiswa (contoh: `4IA01`) |
| `nama_sesi` | String | Opsional | Nama sesi pembekalan yang sedang diikuti |
| `ip_address` | String | Opsional | Alamat IP perangkat/komputer lab yang digunakan |
| `user_agent` | String | Opsional | Identitas perangkat atau aplikasi klien |

#### Contoh Request Body (JSON):
```json
{
  "npm": "50421001",
  "action": "login",
  "nama": "Aditya Pratama",
  "kelas": "4IA01",
  "ip_address": "192.168.1.105",
  "user_agent": "Lab-Komputer-Gate/1.0"
}
```

#### Contoh Request (cURL):
```bash
curl -X POST http://localhost:3000/api/external/login-event \
  -H "Content-Type: application/json" \
  -d '{
    "npm": "50421001",
    "action": "login",
    "nama": "Aditya Pratama",
    "kelas": "4IA01",
    "ip_address": "192.168.1.105"
  }'
```

#### Contoh Respon Berhasil (200 OK):
```json
{
  "success": true,
  "message": "Login mahasiswa 50421001 (Aditya Pratama) berhasil dicatat.",
  "data": {
    "npm": "50421001",
    "nama": "Aditya Pratama",
    "action": "login",
    "waktu": "2026-09-19T08:15:00.000Z"
  }
}
```

---

### 2. Ingest Pengumpulan Tugas & Nilai Mahasiswa (Single Task Webhook)

Digunakan oleh LMS (Moodle, Google Classroom), sistem pengujian otomatis (*AutoGrader*), atau webhook Git saat mahasiswa telah mengumpulkan tugas pada sesi tertentu.

- **Method:** `POST`
- **Endpoint:** `/api/external/task-event`
- **Headers:** `Content-Type: application/json`

#### Parameter Payload (JSON):
| Parameter | Tipe | Status | Keterangan |
| :--- | :--- | :--- | :--- |
| `npm` | String | **Wajib** | Nomor Pokok Mahasiswa yang mengumpulkan tugas |
| `nama_sesi` | String | **Wajib** | Nama sesi pembekalan terkait (contoh: `Sesi 1: Dasar REST API & Database Design`) |
| `nama` | String | Opsional | Nama lengkap mahasiswa |
| `kelas` | String | Opsional | Kelas reguler mahasiswa (contoh: `4IA01`) |
| `judul_tugas` | String | Opsional | Judul penugasan / modul praktikum |
| `nilai` | Number | Opsional | Nilai atau skor tugas mahasiswa (contoh: `88.5`) |
| `status` | String | Opsional | Status pengumpulan (contoh: `sudah_dikumpulkan`, `dinilai`) |
| `waktu_pengumpulan` | String (ISO) | Opsional | Waktu mahasiswa mengumpulkan tugas (otomatis saat ini jika kosong) |
| `tautan_tugas` | String | Opsional | Tautan berkas penugasan atau repository Git |
| `catatan_instruktur`| String | Opsional | Catatan atau umpan balik pengoreksian |
| `external_source` | String | Opsional | Nama sistem luar (contoh: `LMS Moodle`, `AutoGrader CI`) |

#### Contoh Request Body (JSON):
```json
{
  "npm": "50421001",
  "nama": "Aditya Pratama",
  "kelas": "4IA01",
  "nama_sesi": "Sesi 1: Dasar REST API & Database Design",
  "nilai": 90,
  "judul_tugas": "Implementasi RESTful API & Schema PostgreSQL",
  "external_source": "LMS Moodle Lab"
}
```

#### Contoh Request (cURL):
```bash
curl -X POST http://localhost:3000/api/external/task-event \
  -H "Content-Type: application/json" \
  -d '{
    "npm": "50421001",
    "nama": "Aditya Pratama",
    "kelas": "4IA01",
    "nama_sesi": "Sesi 1: Dasar REST API & Database Design",
    "nilai": 90,
    "external_source": "LMS Moodle Lab"
  }'
```

#### Contoh Respon Berhasil (200 OK):
```json
{
  "success": true,
  "message": "Pengumpulan tugas untuk mahasiswa 50421001 pada sesi Sesi 1: Dasar REST API & Database Design berhasil dicatat.",
  "data": {
    "npm": "50421001",
    "nama": "Aditya Pratama",
    "kelas": "4IA01",
    "nama_sesi": "Sesi 1: Dasar REST API & Database Design",
    "nilai": 90,
    "waktu_pengumpulan": "2026-09-19T10:30:00.000Z"
  }
}
```

---

### 3. Ingest Pengumpulan Tugas & Nilai Massal (Batch Sync)

Digunakan untuk sinkronisasi berkala (misalnya melalui cron job harian atau sinkronisasi terjadwal dari database LMS luar) untuk mengirim banyak data pengumpulan tugas dan nilai sekaligus dalam satu permintaan.

- **Method:** `POST`
- **Endpoint:** `/api/external/tasks-batch`
- **Headers:** `Content-Type: application/json`

#### Contoh Request Body (JSON):
```json
{
  "tasks": [
    {
      "npm": "50421001",
      "nama": "Aditya Pratama",
      "kelas": "4IA01",
      "nama_sesi": "Sesi 1: Dasar REST API & Database Design",
      "nilai": 88
    },
    {
      "npm": "50421002",
      "nama": "Annisa Rahmawati",
      "kelas": "4IA01",
      "nama_sesi": "Sesi 1: Dasar REST API & Database Design",
      "nilai": 95
    }
  ]
}
```

#### Contoh Respon Berhasil (200 OK):
```json
{
  "success": true,
  "message": "Berhasil memproses 2 data tugas dari sistem luar.",
  "processed_count": 2
}
```

---

## 🐳 Menjalankan dengan Docker Compose

Untuk menjalankan aplikasi lengkap beserta database PostgreSQL secara terisolasi:

```bash
docker compose up --build -d
```

- **Aplikasi Web:** Buka [http://localhost:3000](http://localhost:3000)
- **Database PostgreSQL:** Port `5432`, Database: `portal_pembekalan`, User: `postgres`, Password: `postgres_password`.
- Skema tabel diinisialisasi otomatis dari file `init.sql`.

Untuk mematikan container:
```bash
docker compose down
```

---

## 💻 Menjalankan Secara Lokal (Node.js)

1. **Install dependensi:**
   ```bash
   npm install
   ```

2. **Jalankan Development Server:**
   ```bash
   npm run dev
   ```

3. **Build & Jalankan Produksi:**
   ```bash
   npm run build
   npm start
   ```
