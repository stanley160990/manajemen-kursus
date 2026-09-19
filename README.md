# Portal Pembekalan Mahasiswa & Live Monitoring Sesi

Aplikasi web manajemen data mahasiswa pembekalan, konfigurasi referensi kelas dan sesi dinamis (dilengkapi tanggal pelaksanaan, jam, ruangan, instruktur, dan asisten), live monitoring mahasiswa aktif (khusus jadwal sesi hari ini), monitoring pengumpulan tugas mahasiswa per sesi, dan riwayat login dengan database **PostgreSQL**.

---

## 👥 Pengguna & Hak Akses (Role)

Sistem menyediakan 2 (dua) akun pengguna:

| Username | Password | Peran (Role) | Hak Akses |
| :--- | :--- | :--- | :--- |
| **admin** | `admin123` | **Administrator** | **Akses Penuh**: Tambah, Ubah, Hapus Mahasiswa, Import Excel, Konfigurasi Referensi Kelas & Sesi, Monitoring, Unduh PDF/Excel, dan Riwayat. |
| **asisten** | `asisten123` | **Asisten** | **Mode Lihat Saja (Read-Only)**: Hanya melihat data mahasiswa, referensi kelas, live monitoring, tugas mahasiswa, dan riwayat. |

> **Keamanan:** Halaman utama portal adalah halaman Login. Setiap akses harus didahului autentikasi login.

---

## 🚀 Fitur & Modul Aplikasi

1. **Autentikasi & Otorisasi Berbasis Peran:**
   - Validasi akun admin dan asisten dengan token autentikasi.
   - Proteksi endpoint API mutasi data (hanya dapat dieksekusi oleh role `admin`).

2. **Manajemen Data Mahasiswa:**
   - Atribut: **NPM**, **Nama Mahasiswa**, **Kelas Reguler**, **Kelas Pembekalan Terdaftar**.
   - CRUD data mahasiswa, pencarian cepat, dan filter kelas.
   - Import massal via file Excel (`.xlsx` / `.xls`) dengan template siap unduh.
   - Ekspor data mahasiswa ke Excel.

3. **Referensi Kelas & Sesi Pembekalan Fleksibel:**
   - Nama Kelas, Deskripsi, dan Kuota Mahasiswa.
   - **Sesi Pembekalan:** Nama Sesi, **Tanggal Pelaksanaan**, Hari, Jam Mulai, Jam Selesai (WIB), Ruangan/Lab, Instruktur, dan hingga 4 Asisten per sesi.
   - Cetak Jadwal resmi ke format **PDF** dan **Excel (.xlsx)** baik per kelas maupun rekap seluruh kelas.

4. **Live Monitoring Mahasiswa Aktif (Sesi Hari Ini):**
   - Menampilkan mahasiswa yang sedang aktif login khusus pada **jadwal sesi hari ini**.
   - Indikator online real-time, waktu login, durasi aktif, dan alamat IP.
   - Sinkronisasi otomatis per 5 detik.

5. **Monitoring Pengumpulan Tugas Mahasiswa:**
   - Menampilkan daftar mahasiswa yang telah mengumpulkan tugas per sesi pembekalan dengan data terstruktur: **NPM, Nama Mahasiswa, Kelas, dan Sesi**.
   - Ekspor data pengumpulan tugas ke Excel (`.xlsx`).

6. **Riwayat Akses Login:**
   - Log aktivitas login dan logout dengan filter rentang tanggal (*Hari Ini, 7 Hari, 30 Hari, Semua*), status sesi, dan pencarian NPM/nama.
   - Ekspor riwayat ke Excel.

---

## 📖 Dokumentasi REST API

Semua endpoint API beralamat dasar (Base URL):
```text
http://localhost:3000
```

Header autentikasi untuk endpoint yang memerlukan hak akses Admin:
```http
Authorization: Bearer <token>
# atau
x-auth-token: <token>
```

---

### 1. Autentikasi & Pemeriksaan Sistem

#### 1.1 Login Pengguna
- **Method:** `POST`
- **Endpoint:** `/api/login`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```
- **Response Sukses (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "u-admin",
    "username": "admin",
    "nama": "Administrator Portal",
    "role": "admin"
  },
  "token": "token-admin-1726700000000",
  "message": "Selamat datang, Administrator Portal (ADMIN)"
}
```

#### 1.2 Health Check & Status Database
- **Method:** `GET`
- **Endpoint:** `/api/health`
- **Response Sukses (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-09-19T05:15:00.000Z",
  "database": {
    "connected": true,
    "adapter": "postgresql",
    "host": "localhost",
    "database": "portal_pembekalan"
  }
}
```

---

### 2. Manajemen Data Mahasiswa

#### 2.1 Ambil Semua Data Mahasiswa
- **Method:** `GET`
- **Endpoint:** `/api/mahasiswa`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "npm": "50421001",
      "nama": "Aditya Pratama",
      "kelas": "4IA01",
      "kelas_pembekalan_id": 1,
      "nama_kelas_pembekalan": "Web Development & Cloud Computing",
      "created_at": "2026-09-01T08:00:00.000Z"
    }
  ]
}
```

#### 2.2 Tambah Mahasiswa Baru (Admin Only)
- **Method:** `POST`
- **Endpoint:** `/api/mahasiswa`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`
- **Request Body:**
```json
{
  "npm": "50421050",
  "nama": "Budi Santoso",
  "kelas": "4IA02",
  "kelas_pembekalan_id": 1
}
```

#### 2.3 Ubah Data Mahasiswa (Admin Only)
- **Method:** `PUT`
- **Endpoint:** `/api/mahasiswa/:id`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`
- **Request Body:**
```json
{
  "npm": "50421050",
  "nama": "Budi Santoso, S.Kom",
  "kelas": "4IA02",
  "kelas_pembekalan_id": 2
}
```

#### 2.4 Hapus Mahasiswa (Admin Only)
- **Method:** `DELETE`
- **Endpoint:** `/api/mahasiswa/:id`
- **Headers:** `Authorization: Bearer <token>`

#### 2.5 Import Massal Data Mahasiswa via JSON / Excel Data (Admin Only)
- **Method:** `POST`
- **Endpoint:** `/api/mahasiswa/bulk-import`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`
- **Request Body:**
```json
{
  "items": [
    {
      "npm": "50421060",
      "nama": "Citra Lestari",
      "kelas": "4IA03",
      "kelas_pembekalan": "Web Development & Cloud Computing"
    },
    {
      "npm": "50421061",
      "nama": "Dedi Kurniawan",
      "kelas": "4IA03",
      "kelas_pembekalan": "Data Science & Machine Learning"
    }
  ]
}
```

#### 2.6 Unduh Template Excel Mahasiswa
- **Method:** `GET`
- **Endpoint:** `/api/mahasiswa/template-xlsx`
- **Response:** File biner Excel `template_data_mahasiswa.xlsx`

---

### 3. Referensi Kelas & Sesi Pembekalan

#### 3.1 Ambil Semua Referensi Kelas & Jadwal Sesi
- **Method:** `GET`
- **Endpoint:** `/api/referensi-kelas`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nama_kelas": "Web Development & Cloud Computing",
      "deskripsi": "Pelatihan pembuatan arsitektur web modern fullstack dan deployment cloud.",
      "kuota": 40,
      "sesi_list": [
        {
          "id": 101,
          "kelas_pembekalan_id": 1,
          "nama_sesi": "Sesi 1: REST API & Cloud Ingress",
          "tanggal": "2026-09-22",
          "hari": "Senin",
          "jam_mulai": "08:30",
          "jam_selesai": "11:30",
          "ruangan": "Lab Komputer 3",
          "instruktur": "Dr. Ir. Hendra Wijaya, M.Kom",
          "asisten": ["Rian Maulana", "Anisa Rahma"]
        }
      ]
    }
  ]
}
```

#### 3.2 Tambah Referensi Kelas & Sesi (Admin Only)
- **Method:** `POST`
- **Endpoint:** `/api/referensi-kelas`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`
- **Request Body:**
```json
{
  "nama_kelas": "Mobile App Development",
  "deskripsi": "Pengembangan aplikasi Flutter & React Native untuk industri.",
  "kuota": 35,
  "sesi_list": [
    {
      "nama_sesi": "Sesi 1: Dasar Widget & State Management",
      "tanggal": "2026-09-25",
      "hari": "Kamis",
      "jam_mulai": "09:00",
      "jam_selesai": "12:00",
      "ruangan": "Lab Mobile 2",
      "instruktur": "Ahmad Fauzi, M.T.",
      "asisten": ["Doni", "Tiara"]
    }
  ]
}
```

#### 3.3 Perbarui Referensi Kelas & Sesi (Admin Only)
- **Method:** `PUT`
- **Endpoint:** `/api/referensi-kelas/:id`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`

#### 3.4 Hapus Referensi Kelas (Admin Only)
- **Method:** `DELETE`
- **Endpoint:** `/api/referensi-kelas/:id`
- **Headers:** `Authorization: Bearer <token>`

#### 3.5 Ekspor Rekap Seluruh Kelas ke Excel
- **Method:** `GET`
- **Endpoint:** `/api/referensi-kelas/export-excel`

#### 3.6 Ekspor Satu Kelas ke Excel
- **Method:** `GET`
- **Endpoint:** `/api/referensi-kelas/:id/export-excel`

---

### 4. Live Monitoring Mahasiswa Aktif (Sesi Hari Ini)

#### 4.1 Ambil Data Mahasiswa Sedang Aktif Hari Ini
- **Method:** `GET`
- **Endpoint:** `/api/monitoring/live`
- **Response (200 OK):**
```json
{
  "success": true,
  "todayDayName": "Jumat",
  "todayDate": "2026-09-18",
  "todaySessions": [
    {
      "id": 105,
      "nama_sesi": "Sesi 1: Cloud Native & Containerization",
      "tanggal": "2026-09-18",
      "hari": "Jumat",
      "jam_mulai": "08:00",
      "jam_selesai": "11:00",
      "ruangan": "Lab Jaringan"
    }
  ],
  "activeList": [
    {
      "npm": "50421001",
      "nama": "Aditya Pratama",
      "kelas": "4IA01",
      "nama_kelas_pembekalan": "Web Development & Cloud Computing",
      "nama_sesi": "Sesi 1: Cloud Native & Containerization",
      "ip_address": "192.168.1.45",
      "waktu_login": "2026-09-18T08:15:30.000Z",
      "durasi_menit": 45,
      "status": "online"
    }
  ]
}
```

#### 4.2 Simulasi Login/Logout Mahasiswa dari UI
- **Method:** `POST`
- **Endpoint:** `/api/monitoring/simulate`
- **Request Body:**
```json
{
  "action": "login",
  "npm": "50421001"
}
```

---

### 5. Riwayat Akses & Log Login Mahasiswa

#### 5.1 Ambil Daftar Riwayat Login
- **Method:** `GET`
- **Endpoint:** `/api/riwayat-login`
- **Query Parameters:**
  - `startDate` (opsional, format: `YYYY-MM-DD`): Tanggal mulai rentang.
  - `endDate` (opsional, format: `YYYY-MM-DD`): Tanggal selesai rentang.
  - `search` (opsional): Pencarian nama atau NPM.
  - `status` (opsional): `online` atau `logout`.
  - `kelas` (opsional): Nama kelas reguler (misal: `4IA01`).
- **Response (200 OK):**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": 501,
      "npm": "50421001",
      "nama": "Aditya Pratama",
      "kelas": "4IA01",
      "nama_kelas_pembekalan": "Web Development & Cloud Computing",
      "nama_sesi": "Sesi 1: Cloud Native",
      "ip_address": "192.168.1.45",
      "waktu_login": "2026-09-18T08:15:30.000Z",
      "waktu_logout": "2026-09-18T10:45:00.000Z",
      "durasi_menit": 150,
      "status": "logout"
    }
  ]
}
```

#### 5.2 Ekspor Riwayat Login ke Excel
- **Method:** `GET`
- **Endpoint:** `/api/riwayat-login/export?startDate=2026-09-01&endDate=2026-09-18`

---

### 6. Monitoring Pengumpulan Tugas Mahasiswa

#### 6.1 Ambil Daftar Mahasiswa yang Sudah Mengumpulkan Tugas
- **Method:** `GET`
- **Endpoint:** `/api/monitoring/tugas`
- **Query Parameters:**
  - `kelas_pembekalan_id` (opsional): ID kelas pembekalan.
  - `nama_sesi` (opsional): Nama sesi pembekalan.
  - `kelas_reguler` (opsional): Filter kelas mahasiswa (misal: `4IA01`).
  - `search` (opsional): Pencarian NPM atau nama.
- **Response (200 OK):**
```json
{
  "success": true,
  "total": 3,
  "data": [
    {
      "id": 1,
      "npm": "50421001",
      "nama": "Aditya Pratama",
      "kelas": "4IA01",
      "nama_kelas_pembekalan": "Web Development & Cloud Computing",
      "nama_sesi": "Sesi 1: Dasar REST API & Database Design",
      "waktu_pengumpulan": "2026-09-18T10:15:00.000Z"
    }
  ]
}
```

#### 6.2 Ekspor Daftar Pengumpulan Tugas ke Excel
- **Method:** `GET`
- **Endpoint:** `/api/monitoring/tugas/export`
- **Response:** File Excel `.xlsx` berisi daftar mahasiswa yang mengumpulkan (kolom: No, NPM, Nama Mahasiswa, Kelas, Sesi).

---

### 7. REST API Ingest Sistem Eksternal (Webhook)

Endpoint ini dirancang khusus untuk dipanggil oleh sistem eksternal (aplikasi gerbang lab, fingerprint/RFID, LMS Moodle, Google Classroom, atau webhook bot CI/CD).

#### 7.1 Ingest Event Login Mahasiswa (Presensi Sesi)
Mencatat mahasiswa masuk/keluar ke sesi pembekalan hari ini.

- **Method:** `POST`
- **Endpoint:** `/api/external/login-event`
- **Headers:** `Content-Type: application/json`
- **Parameter Payload JSON:**
  | Parameter | Tipe | Wajib? | Keterangan |
  | :--- | :--- | :--- | :--- |
  | `npm` | String | **Ya** | NPM mahasiswa yang melakukan login |
  | `action` | String | Tidak | `login` (default) atau `logout` |
  | `nama` | String | Tidak | Nama mahasiswa jika sudah diketahui |
  | `kelas` | String | Tidak | Kelas reguler mahasiswa (contoh: `4IA01`) |
  | `nama_sesi` | String | Tidak | Nama sesi terkait |
  | `ip_address` | String | Tidak | IP perangkat mahasiswa / komputer lab |
  | `user_agent` | String | Tidak | Identitas aplikasi eksternal / browser |

- **Contoh Payload JSON:**
```json
{
  "npm": "50421001",
  "action": "login",
  "nama": "Aditya Pratama",
  "kelas": "4IA01",
  "ip_address": "192.168.1.105",
  "user_agent": "Lab-Gate-Reader-v2.1"
}
```

- **Contoh Request cURL:**
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

- **Response Sukses (200 OK):**
```json
{
  "success": true,
  "message": "Login mahasiswa 50421001 (Aditya Pratama) berhasil dicatat.",
  "data": {
    "npm": "50421001",
    "action": "login",
    "waktu": "2026-09-18T22:15:00.000Z"
  }
}
```

---

#### 7.2 Ingest Pengumpulan Tugas Mahasiswa (Single Task Webhook)
Mencatat mahasiswa yang telah mengumpulkan tugas per sesi pembekalan dari LMS (Moodle, Google Classroom, Git commit webhook, dsb).

- **Method:** `POST`
- **Endpoint:** `/api/external/task-event`
- **Headers:** `Content-Type: application/json`
- **Parameter Payload JSON:**
  | Parameter | Tipe | Wajib? | Keterangan |
  | :--- | :--- | :--- | :--- |
  | `npm` | String | **Ya** | NPM mahasiswa yang mengumpulkan tugas |
  | `nama_sesi` | String | **Ya** | Nama sesi pembekalan yang relevan |
  | `nama` | String | Tidak | Nama mahasiswa |
  | `kelas` | String | Tidak | Kelas reguler mahasiswa (contoh: `4IA01`) |
  | `judul_tugas` | String | Tidak | Judul atau nama file tugas |
  | `waktu_pengumpulan`| String (ISO)| Tidak | Waktu pengumpulan (otomatis waktu sekarang jika kosong) |
  | `tautan_tugas` | String | Tidak | URL repo Git atau link file di LMS |
  | `external_source` | String | Tidak | Nama sistem pengirim (contoh: `LMS Moodle`, `GitLab`) |

- **Contoh Request cURL:**
```bash
curl -X POST http://localhost:3000/api/external/task-event \
  -H "Content-Type: application/json" \
  -d '{
    "npm": "50421001",
    "nama": "Aditya Pratama",
    "kelas": "4IA01",
    "nama_sesi": "Sesi 1: Dasar REST API & Database Design",
    "external_source": "LMS Moodle Lab"
  }'
```

- **Response Sukses (200 OK):**
```json
{
  "success": true,
  "message": "Pengumpulan tugas untuk mahasiswa 50421001 pada sesi Sesi 1: Dasar REST API & Database Design berhasil dicatat.",
  "data": {
    "npm": "50421001",
    "nama": "Aditya Pratama",
    "kelas": "4IA01",
    "nama_sesi": "Sesi 1: Dasar REST API & Database Design",
    "waktu_pengumpulan": "2026-09-18T22:15:00.000Z"
  }
}
```

---

#### 7.3 Ingest Pengumpulan Tugas Massal (Batch Task Webhook)
Mencatat banyak data pengumpulan tugas sekaligus (misalnya sinkronisasi berkala dari cron job LMS).

- **Method:** `POST`
- **Endpoint:** `/api/external/tasks-batch`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "tasks": [
    {
      "npm": "50421001",
      "nama": "Aditya Pratama",
      "kelas": "4IA01",
      "nama_sesi": "Sesi 1: Dasar REST API & Database Design"
    },
    {
      "npm": "50421002",
      "nama": "Annisa Rahmawati",
      "kelas": "4IA01",
      "nama_sesi": "Sesi 1: Dasar REST API & Database Design"
    }
  ]
}
```

- **Response Sukses (200 OK):**
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
- Inisialisasi skema tabel otomatis dijalankan dari `init.sql`.

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
