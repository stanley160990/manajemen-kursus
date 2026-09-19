export type UserRole = 'admin' | 'asisten';

export interface User {
  id: number;
  username: string;
  nama: string;
  role: UserRole;
  created_at?: string;
}

export interface SesiPembekalan {
  id: number;
  kelas_pembekalan_id: number;
  nama_sesi: string;
  tanggal?: string; // Format YYYY-MM-DD atau string tanggal
  hari: string; // Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu
  jam_mulai: string; // HH:mm (e.g. 08:00)
  jam_selesai: string; // HH:mm (e.g. 10:00)
  ruangan?: string;
  instruktur?: string;
  asisten?: string[]; // Tim asisten pengampu sesi (maksimal 4 asisten, bisa dikosongkan)
  created_at?: string;
}

export interface KelasPembekalan {
  id: number;
  nama_kelas: string;
  deskripsi?: string;
  kuota?: number;
  jumlah_mahasiswa?: number;
  sesi_list?: SesiPembekalan[];
  created_at?: string;
  updated_at?: string;
}

export interface Mahasiswa {
  id: number;
  npm: string;
  nama: string;
  kelas: string; // Kelas reguler mahasiswa, misal: 3IA01, 4KA02
  kelas_pembekalan_id: number;
  nama_kelas_pembekalan?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LiveActiveMahasiswa {
  id: number;
  mahasiswa_id?: number;
  npm: string;
  nama: string;
  kelas: string;
  nama_kelas_pembekalan: string;
  nama_sesi: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  waktu_login: string; // ISO or formatted
  ip_address: string;
  user_agent: string;
  device_info: string;
  status: 'aktif' | 'idle' | 'selesai';
  durasi_menit: number;
}

export interface RiwayatLoginMahasiswa {
  id: number;
  mahasiswa_id?: number;
  npm: string;
  nama: string;
  kelas: string;
  nama_kelas_pembekalan: string;
  nama_sesi: string;
  waktu_login: string;
  waktu_logout?: string | null;
  durasi_menit?: number;
  ip_address: string;
  user_agent: string;
  status: 'login' | 'logout' | 'timeout' | 'selesai';
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  token?: string;
}

export interface ExternalLoginPayload {
  npm: string;
  nama?: string;
  kelas?: string;
  nama_kelas_pembekalan?: string;
  nama_sesi?: string;
  ip_address?: string;
  user_agent?: string;
  action?: 'login' | 'logout' | 'ping';
}

export type StatusTugas = 'sudah_dikumpulkan' | 'dinilai' | 'terlambat' | 'belum_mengumpulkan';

export interface TugasMahasiswa {
  id: number;
  mahasiswa_id?: number;
  npm: string;
  nama: string;
  kelas: string;
  kelas_pembekalan_id: number;
  nama_kelas_pembekalan: string;
  sesi_id?: number;
  nama_sesi: string;
  judul_tugas: string;
  status: StatusTugas;
  nilai?: number | null;
  waktu_pengumpulan?: string | null;
  deadline?: string | null;
  tautan_tugas?: string | null;
  catatan_instruktur?: string | null;
  external_source?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExternalTaskPayload {
  npm: string;
  nama?: string;
  kelas?: string;
  nama_kelas_pembekalan?: string;
  nama_sesi: string;
  judul_tugas?: string;
  status?: StatusTugas;
  nilai?: number | null;
  waktu_pengumpulan?: string;
  tautan_tugas?: string;
  catatan_instruktur?: string;
  external_source?: string;
}
