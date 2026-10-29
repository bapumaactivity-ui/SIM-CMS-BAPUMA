/**
 * Persistent Storage Management for SMK Bakti Putra Mandiri System
 * Ensures all user inputs, grade modifications, student updates, and promotion logs
 * are securely retained in browser LocalStorage across refreshes and sessions.
 */

export const STORAGE_KEYS = {
  USERS: 'bpm_users_list',
  KELAS: 'bpm_kelas_list',
  MAPEL: 'bpm_mapel_list',
  JADWAL_PELAJARAN: 'bpm_jadwal_pelajaran_list',
  JADWAL_UJIAN: 'bpm_jadwal_ujian_list',
  ABSENSI: 'bpm_absensi_list',
  NILAI: 'bpm_nilai_list',
  EKSKUL: 'bpm_ekskul_list',
  NILAI_EKSKUL: 'bpm_nilai_ekskul_list',
  UJIAN: 'bpm_paket_ujian_list',
  FORMULIR_PPDB: 'bpm_formulir_ppdb_list',
  HASIL_UJIAN: 'bpm_hasil_ujian_list',
  KONTEN_WEB: 'bpm_konten_web_list',
  SCHOOL_INFO: 'saved_school_info',
  TITIMANGSA_TEMPAT: 'saved_titimangsa_tempat',
  TITIMANGSA_TANGGAL: 'saved_titimangsa_tanggal',
  KENAIKAN_KELAS_LOG: 'bpm_kenaikan_kelas_log',
  DELETED_USERS: 'bpm_deleted_users',
  DELETED_KELAS: 'bpm_deleted_kelas',
  DELETED_MAPEL: 'bpm_deleted_mapel',
  DELETED_PPDB: 'bpm_deleted_ppdb',
  DELETED_ABSEN_MENGAJAR: 'bpm_deleted_absen_mengajar',
  DELETED_ABSENSI: 'bpm_deleted_absensi',
  DELETED_UJIAN: 'bpm_deleted_ujian',
  DELETED_EKSKUL: 'bpm_deleted_ekskul',
  DELETED_JADWAL_PELAJARAN: 'bpm_deleted_jadwal_pelajaran',
  DELETED_JADWAL_UJIAN: 'bpm_deleted_jadwal_ujian',
  DELETED_KONTEN: 'bpm_deleted_konten',
  DELETED_NILAI: 'bpm_deleted_nilai',
  DELETED_NILAI_KEYS: 'bpm_deleted_nilai_keys',
  ABSEN_MENGAJAR: 'bpm_absen_mengajar_list',
  INTERNAL_BACKUPS: 'bpm_internal_backups_list',
};

// Safe getItem with fallback
export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      // Check legacy keys
      if (key === STORAGE_KEYS.USERS) {
        const legacy = localStorage.getItem('saved_users_list');
        if (legacy) return JSON.parse(legacy);
      }
      if (key === STORAGE_KEYS.FORMULIR_PPDB) {
        const legacy = localStorage.getItem('saved_formulir_ppdb');
        if (legacy) return JSON.parse(legacy);
      }
      if (key === STORAGE_KEYS.ABSENSI) {
        const legacy = localStorage.getItem('saved_absensi_list');
        if (legacy) return JSON.parse(legacy);
      }
      if (key === STORAGE_KEYS.NILAI) {
        const legacy = localStorage.getItem('saved_nilai_list') || 
                       localStorage.getItem('nilai_mapel_siswa') || 
                       localStorage.getItem('saved_nilai_master');
        if (legacy) return JSON.parse(legacy);
      }
      return fallback;
    }
    const parsed = JSON.parse(raw);
    if (key === STORAGE_KEYS.NILAI && Array.isArray(parsed) && parsed.length === 0) {
      const legacy = localStorage.getItem('saved_nilai_list') || 
                     localStorage.getItem('nilai_mapel_siswa') || 
                     localStorage.getItem('saved_nilai_master');
      if (legacy) {
        const legacyParsed = JSON.parse(legacy);
        if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
          return legacyParsed as unknown as T;
        }
      }
    }
    return parsed;
  } catch (err) {
    console.warn(`[Storage] Failed to parse item for key "${key}":`, err);
    return fallback;
  }
}

// Safe setItem with Quota Resilience
export function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err: any) {
    console.warn(`[Storage] Direct save warning for "${key}":`, err?.message || err);
    // If quota exceeded and saving backups list, keep only latest 3
    if (key === STORAGE_KEYS.INTERNAL_BACKUPS && Array.isArray(data)) {
      try {
        const pruned = data.slice(0, 3);
        localStorage.setItem(key, JSON.stringify(pruned));
        return;
      } catch (_) {}
    }
  }
}
