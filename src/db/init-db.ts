import { runDatabaseInitialization, getDatabaseStatus } from './db.ts';

/**
 * Script CLI Inisiasi Manual Database PostgreSQL
 * 
 * Jalankan perintah ini dari luar docker saat pertama kali setup atau saat ingin inisiasi:
 *   docker compose exec app npm run db:init
 * 
 * Atau via psql di container db:
 *   docker compose exec db psql -U ${PGUSER} -d ${PGDATABASE} -f /init.sql
 */
async function main() {
  console.log('===========================================================');
  console.log('🛠️  INISIASI DATABASE SISTEM PEMBEKALAN (MANUAL EXEC)');
  console.log('===========================================================');
  console.log('ℹ️  Proses ini aman dan menggunakan klausul ON CONFLICT DO NOTHING.');
  console.log('ℹ️  Data yang sudah diinput oleh pengguna TIDAK akan tertimpa.\n');

  try {
    const result = await runDatabaseInitialization();
    const status = getDatabaseStatus();

    console.log('\n===========================================================');
    console.log('🎉 HASIL INISIASI:');
    console.log(`   Status Koneksi: ${status.isPostgresConnected ? '✅ Terhubung' : '❌ Gagal'}`);
    console.log(`   Host / DB: ${status.host}:${status.port} / ${status.database}`);
    console.log(`   Pesan: ${result.message}`);
    console.log('===========================================================');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Gagal melakukan inisiasi database:', error.message);
    process.exit(1);
  }
}

main();
