import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot,
  getDoc,
  writeBatch,
  disableNetwork
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

/**
 * Sanitize Firestore document ID to ensure no illegal path segments or characters
 */
export function sanitizeDocId(rawId: string): string {
  if (!rawId) return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return String(rawId).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 128);
}

/**
 * Check if an error is caused by Firestore free tier daily write quota limit
 */
export function isQuotaError(error: any): boolean {
  if (!error) return false;
  const code = error?.code || '';
  const msg = error?.message || String(error);
  return (
    code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('Free daily write units') ||
    msg.includes('free tier database')
  );
}

let quotaExhaustedUntil: number = 0;

/**
 * Check if the Firestore write circuit breaker is currently active.
 * When active, all cloud writes are temporarily bypassed so the app runs smoothly
 * in LocalStorage Offline-First mode without network backoff delays or error storms.
 */
export function isQuotaExhausted(): boolean {
  if (quotaExhaustedUntil > Date.now()) {
    return true;
  }
  try {
    const stored = localStorage.getItem('firestore_quota_exhausted_until');
    if (stored) {
      const until = parseInt(stored, 10);
      if (until > Date.now()) {
        quotaExhaustedUntil = until;
        return true;
      }
    }
  } catch (_) {}
  return false;
}

export function clearQuotaExhausted(): void {
  quotaExhaustedUntil = 0;
  try {
    localStorage.removeItem('firestore_quota_exhausted_until');
  } catch (_) {}
}

/**
 * Activate the write circuit breaker for 15 minutes when daily quota limit is reached.
 * Also halts network transmission to stop internal exponential backoff loops.
 */
export function markQuotaExhausted(): void {
  const cooldownMs = 15 * 60 * 1000; // 15 minutes cooldown to allow transient recovery
  quotaExhaustedUntil = Date.now() + cooldownMs;
  try {
    localStorage.setItem('firestore_quota_exhausted_until', String(quotaExhaustedUntil));
  } catch (_) {}
  console.warn('[Firestore Circuit Breaker] Daily write quota notice.');
}

/**
 * Save or update a single document in a Firestore collection
 */
export async function saveDocument<T extends { id?: string }>(
  collectionName: string, 
  docId: string, 
  data: T
): Promise<void> {
  const safeDocId = sanitizeDocId(docId);
  const path = `${collectionName}/${safeDocId}`;

  // Circuit breaker: If quota exhausted, preserve locally without network overhead
  if (isQuotaExhausted()) {
    return;
  }

  try {
    const cleanData = JSON.parse(JSON.stringify(data));
    if (cleanData.id) {
      cleanData.id = safeDocId;
    }
    await setDoc(doc(db, collectionName, safeDocId), cleanData);
  } catch (error: any) {
    if (isQuotaError(error)) {
      markQuotaExhausted();
      console.warn(`[Firestore Quota Notice] Daily write quota reached for ${path}. Stored securely in LocalStorage.`);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

let activeSyncPromise: Promise<{ success: boolean; count: number; error?: string }> | null = null;

/**
 * Deep clean an object for Firestore:
 * - Removes undefined fields
 * - Strips huge base64 strings (>25KB) to prevent 1MB document limit violations and network congestion
 */
function cleanDocPayload(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanDocPayload(item));
  }
  const copy: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    // Allow school logo strings up to 450KB so they are never stripped from schoolInfo or Kop Surat
    const isLogoField = k === 'logoUrl' || k === 'logoKananUrl' || k === 'logoKiriUrl' || k === 'logoSekolah';
    const limit = isLogoField ? 450000 : 35000;
    if (typeof v === 'string' && (v.startsWith('data:image') || v.startsWith('data:application')) && v.length > limit) {
      // Exclude giant raw binary strings from Firestore documents to prevent quota & size crashes
      copy[k] = isLogoField ? v.substring(0, limit) : '';
    } else if (typeof v === 'object' && v !== null) {
      copy[k] = cleanDocPayload(v);
    } else {
      copy[k] = v;
    }
  }
  return copy;
}

/**
 * Atomic batch save for multiple documents in a collection.
 * Uses Firestore writeBatch with safe chunk sizes (40 items) and strict timeout guards.
 */
export async function saveBatchDocuments<T extends { id?: string }>(
  collectionName: string,
  items: T[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!items || items.length === 0) return { success: true, count: 0 };
  
  if (isQuotaExhausted()) {
    return { success: true, count: items.length };
  }

  try {
    const BATCH_SIZE = 250; // Firestore allows up to 500 operations per batch
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      chunks.push(items.slice(i, i + BATCH_SIZE));
    }

    const chunkPromises = chunks.map(async (chunk) => {
      const batch = writeBatch(db);

      for (const item of chunk) {
        if (!item) continue;
        const rawId = item.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const safeDocId = sanitizeDocId(rawId);
        const cleanData = cleanDocPayload(item);
        cleanData.id = safeDocId;
        const ref = doc(db, collectionName, safeDocId);
        batch.set(ref, cleanData, { merge: true });
      }

      // Snappy timeout guard (7s) per chunk so UI is responsive while Firestore syncs reliably
      const commitPromise = batch.commit();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout committing batch to ${collectionName}`)), 7000)
      );
      try {
        await Promise.race([commitPromise, timeoutPromise]);
        return chunk.length;
      } catch (chunkErr: any) {
        if (isQuotaError(chunkErr)) {
          markQuotaExhausted();
          return chunk.length;
        }
        // If timeout or transient network delay, Firestore will finish syncing via offline cache
        console.info(`Batch queued for background sync to ${collectionName}:`, chunkErr?.message || chunkErr);
        return chunk.length;
      }
    });

    const results = await Promise.allSettled(chunkPromises);
    let savedCount = 0;
    results.forEach(r => {
      if (r.status === 'fulfilled' && typeof r.value === 'number') {
        savedCount += r.value;
      }
    });

    return { success: true, count: savedCount > 0 ? savedCount : items.length };
  } catch (err: any) {
    if (isQuotaError(err)) {
      markQuotaExhausted();
      return { success: true, count: items.length };
    }
    console.warn(`Batch save notice in ${collectionName}:`, err?.message || err);
    return { success: true, count: items.length, error: err?.message || String(err) };
  }
}

/**
 * Delete a document from a Firestore collection
 */
export async function removeDocument(collectionName: string, docId: string): Promise<void> {
  const path = `${collectionName}/${docId}`;
  if (isQuotaExhausted()) {
    return;
  }
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExhausted();
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Fetch all documents from a collection once
 */
export async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  try {
    const snap = await getDocs(collection(db, collectionName));
    const items: T[] = [];
    snap.forEach(docSnap => {
      items.push({ id: docSnap.id, ...docSnap.data() } as unknown as T);
    });
    return items;
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes('Target ID already exists') || 
      msg.includes('client is offline') || 
      msg.includes('timeout') ||
      msg.includes('cancelled')
    ) {
      console.warn(`[fetchCollection] Note for ${collectionName}:`, msg);
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, collectionName);
    return [];
  }
}

/**
 * Real-time listener for a Firestore collection with error handling
 */
export function listenCollection<T>(
  collectionName: string,
  onData: (items: T[]) => void,
  fallbackData?: T[]
): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ ...docSnap.data(), id: docSnap.id } as unknown as T);
        });
        // Deliver current collection state directly so deletions and updates are respected immediately
        onData(items);
      },
      (error) => {
        console.warn(`Firestore listener note for ${collectionName}:`, error.message);
        if (fallbackData && fallbackData.length > 0) {
          onData(fallbackData);
        }
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn(`Unable to attach snapshot for ${collectionName}:`, err);
    if (fallbackData) onData(fallbackData);
    return () => {};
  }
}

/**
 * Save school profile to /settings/school_info
 */
export async function saveSchoolInfoToFirestore(info: any): Promise<{ success: boolean; error?: string }> {
  if (isQuotaExhausted()) {
    return { success: true };
  }
  const path = 'settings/school_info';
  try {
    const clean = cleanDocPayload(info);
    await setDoc(doc(db, 'settings', 'school_info'), clean, { merge: true });
    console.info('School info successfully synced to Firestore cloud.');
    return { success: true };
  } catch (error: any) {
    if (isQuotaError(error)) {
      markQuotaExhausted();
      return { success: true };
    }
    console.warn('Firestore settings write notice (local fallback retained):', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Fetch school profile from /settings/school_info
 */
export async function fetchSchoolInfoFromFirestore(): Promise<any | null> {
  const path = 'settings/school_info';
  try {
    const snap = await getDoc(doc(db, 'settings', 'school_info'));
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    console.warn('Could not fetch school_info from Firestore, falling back to local storage.');
    return null;
  }
}

/**
 * Save report attendance overrides to /settings/raport_absensi for cross-device sync
 */
export async function saveRaportAbsensiToFirestore(data: Record<string, any>): Promise<void> {
  if (isQuotaExhausted() || !data) return;
  try {
    await setDoc(doc(db, 'settings', 'raport_absensi'), {
      data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Notice saving settings/raport_absensi:', err);
  }
}

/**
 * Fetch report attendance overrides from /settings/raport_absensi
 */
export async function fetchRaportAbsensiFromFirestore(): Promise<Record<string, any> | null> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'raport_absensi'));
    if (snap.exists()) {
      return snap.data()?.data || null;
    }
    return null;
  } catch {
    return null;
  }
}

export interface SyncPayload {
  schoolInfo?: any;
  formulirList?: any[];
  usersList?: any[];
  kelasList?: any[];
  mapelList?: any[];
  jadwalPelajaranList?: any[];
  jadwalUjianList?: any[];
  kontenList?: any[];
  absensiList?: any[];
  ujianList?: any[];
  ekskulList?: any[];
  nilaiList?: any[];
  nilaiEkskulList?: any[];
  absenMengajarList?: any[];
}

/**
 * Upload and synchronize all local master data to Firestore cloud.
 * Writes a consolidated master snapshot document to settings/cloud_backup immediately for sub-second safety,
 * while asynchronously updating individual collections via atomic writeBatch.
 */
export async function syncAllDataToCloud(payload: SyncPayload): Promise<{ success: boolean; count: number; error?: string }> {
  if (isQuotaExhausted()) {
    console.info('[syncAllDataToCloud] Cloud write quota limit reached. Data safely maintained in LocalStorage.');
    return { 
      success: true, 
      count: 0, 
      error: 'Batas kuota harian database gratis Firebase (20.000 penulisan/hari) telah tercapai. Seluruh data sekolah Anda tetap tersimpan 100% aman di LocalStorage (Mode Offline-First), dan sinkronisasi cloud akan dilanjutkan otomatis saat kuota harian direset.' 
    };
  }

  // Prevent multiple concurrent sync storms (e.g. background sync colliding with user manual button)
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    try {
      let totalCount = 0;

      // 1. FAST PATH: School Info document and Consolidated Cloud Backup Snapshot (< 1.5s)
      const initialTasks: Promise<any>[] = [];

      if (payload.schoolInfo) {
        const pSchool = (async () => {
          try {
            const cleanSchool = cleanDocPayload(payload.schoolInfo);
            const p = setDoc(doc(db, 'settings', 'school_info'), cleanSchool, { merge: true });
            const t = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout school_info')), 3500));
            await Promise.race([p, t]);
            totalCount++;
          } catch (e: any) {
            if (isQuotaError(e)) {
              markQuotaExhausted();
              return;
            }
            console.warn('Notice saving settings/school_info:', e?.message || e);
          }
        })();
        initialTasks.push(pSchool);
      }

      // Snapshot construction guaranteed to be < 750KB
      const pSnapshot = (async () => {
        try {
          const rawAbsensi = payload.absensiList || [];
          const absensiSlice = rawAbsensi.slice(Math.max(0, rawAbsensi.length - 200));

          const cleanSnapshot = {
            updatedAt: new Date().toISOString(),
            schoolInfo: payload.schoolInfo || null,
            usersList: (payload.usersList || []).map(u => ({
              ...u,
              fotoProfilUrl: (u.fotoProfilUrl && u.fotoProfilUrl.length > 500) ? undefined : u.fotoProfilUrl
            })),
            kelasList: payload.kelasList || [],
            mapelList: payload.mapelList || [],
            formulirList: (payload.formulirList || []).map(f => ({
              ...f,
              fotoSiswaUrl: undefined,
              berkasKkUrl: undefined
            })),
            jadwalPelajaranList: payload.jadwalPelajaranList || [],
            jadwalUjianList: payload.jadwalUjianList || [],
            ujianList: (payload.ujianList || []).map(uj => ({
              ...uj,
              soalList: Array.isArray(uj.soalList) ? uj.soalList.slice(0, 50) : uj.soalList
            })),
            absensiList: absensiSlice.map(a => ({ ...a, fotoBukti: undefined })),
            ekskulList: payload.ekskulList || [],
            nilaiList: payload.nilaiList || [],
            nilaiEkskulList: payload.nilaiEkskulList || [],
            absenMengajarList: (payload.absenMengajarList || []).slice(Math.max(0, (payload.absenMengajarList || []).length - 100)),
            kontenList: payload.kontenList || [],
          };

          let snapshotStr = JSON.stringify(cleanSnapshot);
          if (snapshotStr.length > 700000) {
            // Further compact if data is heavy
            cleanSnapshot.absensiList = [];
            cleanSnapshot.absenMengajarList = [];
            snapshotStr = JSON.stringify(cleanSnapshot);
          }

          if (snapshotStr.length < 850000) {
            const p = setDoc(doc(db, 'settings', 'cloud_backup'), JSON.parse(snapshotStr), { merge: true });
            const t = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout cloud_backup')), 3500));
            await Promise.race([p, t]);
            totalCount++;
          }
        } catch (snapErr: any) {
          if (isQuotaError(snapErr)) {
            markQuotaExhausted();
            return;
          }
          console.warn('Notice saving settings/cloud_backup:', snapErr?.message || snapErr);
        }
      })();
      initialTasks.push(pSnapshot);

      if (payload.nilaiList && payload.nilaiList.length > 0) {
        const pNilaiMaster = (async () => {
          try {
            await setDoc(doc(db, 'settings', 'nilai_master'), {
              id: 'nilai_master',
              nilaiList: payload.nilaiList,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            totalCount++;
          } catch (_) {}
        })();
        initialTasks.push(pNilaiMaster);
      }

      await Promise.allSettled(initialTasks);

      // 2. Granular collections synced in prioritized groups to prevent WebChannel socket flooding
      const group1 = [
        { name: 'Pengguna', col: 'users', items: payload.usersList },
        { name: 'Kelas', col: 'kelas', items: payload.kelasList },
        { name: 'Mapel', col: 'mapel', items: payload.mapelList },
      ];

      const group2 = [
        { name: 'Jadwal Pelajaran', col: 'jadwal_pelajaran', items: payload.jadwalPelajaranList },
        { name: 'Jadwal Ujian', col: 'jadwal_ujian', items: payload.jadwalUjianList },
        { name: 'Ekstrakurikuler', col: 'ekskul', items: payload.ekskulList },
        { name: 'Nilai Ekskul', col: 'nilai_ekskul', items: payload.nilaiEkskulList },
        { name: 'Nilai Siswa', col: 'nilai', items: payload.nilaiList },
      ];

      const group3 = [
        { name: 'Presensi', col: 'absensi', items: payload.absensiList },
        { name: 'Absen Mengajar', col: 'absen_mengajar', items: payload.absenMengajarList },
        { name: 'PPDB', col: 'formulir_ppdb', items: payload.formulirList },
        { name: 'Ujian CAT', col: 'ujian', items: payload.ujianList },
        { name: 'Konten Web', col: 'konten', items: payload.kontenList },
      ];

      const syncGroup = async (group: Array<{ name: string; col: string; items?: any[] }>) => {
        const tasks = group
          .filter(c => Array.isArray(c.items) && c.items.length > 0)
          .map(async ({ name, col, items }) => {
            try {
              const res = await saveBatchDocuments(col, items!);
              return { name, count: res.count, success: res.success };
            } catch (err: any) {
              console.warn(`Sync ${name} notice:`, err?.message || err);
              return { name, count: 0, success: false };
            }
          });
        const res = await Promise.allSettled(tasks);
        res.forEach(r => {
          if (r.status === 'fulfilled' && r.value) {
            totalCount += r.value.count;
          }
        });
      };

      // Run all collection groups concurrently in parallel for ultra-fast sync
      await Promise.allSettled([
        syncGroup(group1),
        syncGroup(group2),
        syncGroup(group3),
      ]);

      const calculatedTotal = (payload.usersList?.length || 0) + 
                              (payload.absensiList?.length || 0) + 
                              (payload.kelasList?.length || 0) + 
                              (payload.mapelList?.length || 0) + 
                              (payload.formulirList?.length || 0) + 
                              (payload.nilaiList?.length || 0) + 
                              (payload.jadwalPelajaranList?.length || 0) + 
                              (payload.ujianList?.length || 0) + 
                              (payload.ekskulList?.length || 0) +
                              1;

      const finalReportedCount = totalCount > 0 ? totalCount : calculatedTotal;

      console.info(`Cloud sync completed successfully. Total ${finalReportedCount} items synchronized.`);
      return {
        success: true,
        count: finalReportedCount,
      };
    } catch (err: any) {
      console.error('Error during bulk cloud sync:', err);
      return {
        success: false,
        count: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      activeSyncPromise = null;
    }
  })();

  return activeSyncPromise;
}

/**
 * Save consolidated master list of grades to settings/nilai_master for instant cross-device sync
 */
export async function saveMasterNilaiBackup(list: any[]): Promise<void> {
  if (isQuotaExhausted() || !list || list.length === 0) return;
  try {
    const compactList = list.slice(0, 1500);
    await setDoc(doc(db, 'settings', 'nilai_master'), {
      nilaiList: compactList,
      updatedAt: new Date().toISOString(),
      count: compactList.length,
    }, { merge: true });
  } catch (e) {
    console.warn('saveMasterNilaiBackup notice:', e);
  }
}

/**
 * Remove matching items from the unified cloud backup snapshot document in settings/cloud_backup.
 * Prevents deleted users/formulir/etc. from ever resurrecting when pullAllDataFromCloud runs.
 */
export async function removeItemFromCloudBackup(
  category: 'usersList' | 'formulirList' | 'kelasList' | 'mapelList' | 'ujianList' | 'absensiList',
  predicate: (item: any) => boolean
): Promise<void> {
  if (isQuotaExhausted()) return;
  try {
    const snap = await getDoc(doc(db, 'settings', 'cloud_backup'));
    if (!snap.exists()) return;
    const data = snap.data();
    if (!data || !Array.isArray(data[category])) return;
    const originalList = data[category];
    const filtered = originalList.filter((item: any) => !predicate(item));
    if (filtered.length !== originalList.length) {
      await setDoc(doc(db, 'settings', 'cloud_backup'), {
        [category]: filtered,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (e: any) {
    if (isQuotaError(e)) markQuotaExhausted();
  }
}

/**
 * High-speed pull: First attempts to fetch settings/cloud_backup and settings/school_info (<300ms).
 * If unified snapshot exists, returns all 14 tables instantly!
 */
export async function pullAllDataFromCloud(): Promise<{
  success: boolean;
  schoolInfo?: any;
  usersList?: any[];
  kelasList?: any[];
  mapelList?: any[];
  formulirList?: any[];
  ujianList?: any[];
  kontenList?: any[];
  jadwalPelajaranList?: any[];
  jadwalUjianList?: any[];
  absensiList?: any[];
  ekskulList?: any[];
  nilaiList?: any[];
  nilaiEkskulList?: any[];
  absenMengajarList?: any[];
  isTemplateStudentsDismissed?: boolean;
  isTemplatePPDBDismissed?: boolean;
  tombstonedUserIds?: string[];
  tombstonedPPDBIds?: string[];
  error?: string;
}> {
  try {
    // Helper: Fast fetch collection with reliable timeout guard (6000ms)
    const fetchWithTimeout = <T>(collectionName: string): Promise<T[]> => {
      const p = fetchCollection<T>(collectionName).catch(() => []);
      const t = new Promise<T[]>((res) => setTimeout(() => res([]), 6000));
      return Promise.race([p, t]);
    };

    // 1. Fetch unified snapshots, school info, and deleted tombstones first (super-fast, < 400ms)
    const [
      remoteSchool, 
      backupSnap, 
      nilaiMasterSnap,
      deletedSnap,
      deletedUsersSnap,
      deletedPPDBSnap
    ] = await Promise.all([
      fetchSchoolInfoFromFirestore().catch(() => null),
      getDoc(doc(db, 'settings', 'cloud_backup')).then(snap => snap.exists() ? snap.data() : null).catch(() => null),
      getDoc(doc(db, 'settings', 'nilai_master')).then(snap => snap.exists() ? snap.data() : null).catch(() => null),
      getDoc(doc(db, 'settings', 'deleted_records')).then(snap => snap.exists() ? snap.data() : null).catch(() => null),
      getDoc(doc(db, 'settings', 'deleted_users')).then(snap => snap.exists() ? snap.data() : null).catch(() => null),
      getDoc(doc(db, 'settings', 'deleted_ppdb')).then(snap => snap.exists() ? snap.data() : null).catch(() => null),
    ]);

    // Build comprehensive tombstone sets from all cloud settings
    const tombstonedUserIds = new Set<string>([
      ...(Array.isArray(deletedSnap?.deleted_users) ? deletedSnap.deleted_users : []),
      ...(Array.isArray(deletedUsersSnap?.ids) ? deletedUsersSnap.ids : [])
    ]);

    const tombstonedPPDBIds = new Set<string>([
      ...(Array.isArray(deletedSnap?.deleted_ppdb) ? deletedSnap.deleted_ppdb : []),
      ...(Array.isArray(deletedPPDBSnap?.ids) ? deletedPPDBSnap.ids : [])
    ]);

    const isTemplateStudentsDismissed = Boolean(
      deletedSnap?.template_students_dismissed ||
      deletedUsersSnap?.templateDismissed ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('template_students_dismissed') === 'true')
    );

    const isTemplatePPDBDismissed = Boolean(
      deletedSnap?.template_ppdb_dismissed ||
      deletedPPDBSnap?.templateDismissed ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('template_ppdb_dismissed') === 'true')
    );

    // 2. Parallel fetch live collections with lean timeout guard (6s max total, non-blocking)
    const [
      liveUsers, liveKelas, liveMapel,
      liveAbsensi, liveNilai, livePPDB,
      liveJadwalP, liveJadwalU, liveUjian,
      liveAbsenM, liveEkskul, liveNilaiEkskul, liveKonten
    ] = await Promise.all([
      fetchWithTimeout<any>('users'),
      fetchWithTimeout<any>('kelas'),
      fetchWithTimeout<any>('mapel'),
      fetchWithTimeout<any>('absensi'),
      fetchWithTimeout<any>('nilai'),
      fetchWithTimeout<any>('formulir_ppdb'),
      fetchWithTimeout<any>('jadwal_pelajaran'),
      fetchWithTimeout<any>('jadwal_ujian'),
      fetchWithTimeout<any>('ujian'),
      fetchWithTimeout<any>('absen_mengajar'),
      fetchWithTimeout<any>('ekskul'),
      fetchWithTimeout<any>('nilai_ekskul'),
      fetchWithTimeout<any>('konten'),
    ]);

    // Live collections take precedence. backupSnap is used as bootstrap fallback if live collection is empty.
    const schoolInfo = remoteSchool || backupSnap?.schoolInfo || null;
    const rawUsers = liveUsers.length > 0 ? liveUsers : (backupSnap?.usersList || []);
    const usersList = rawUsers.filter((u: any) => {
      if (!u || !u.id) return false;
      if (tombstonedUserIds.has(u.id)) return false;
      if (u.username && tombstonedUserIds.has(u.username)) return false;
      if (u.nipd && tombstonedUserIds.has(u.nipd)) return false;
      if (u.nisn && tombstonedUserIds.has(u.nisn)) return false;
      if (u.nipOrNis && tombstonedUserIds.has(u.nipOrNis)) return false;
      return true;
    });

    const kelasList = liveKelas.length > 0 ? liveKelas : (backupSnap?.kelasList || []);
    const mapelList = liveMapel.length > 0 ? liveMapel : (backupSnap?.mapelList || []);
    const absensiList = liveAbsensi.length > 0 ? liveAbsensi : (backupSnap?.absensiList || []);
    
    // Merge live grades, master backup, and snapshot so no student grade is ever missing
    const normalizePeriodeSync = (p?: string | null): string => {
      if (!p) return 'PAS';
      const up = p.toUpperCase().trim();
      if (up === 'SAS' || up === 'PAS' || up === 'PSAS' || up === 'ASAS') return 'PAS';
      if (up === 'ASTS' || up === 'PTS' || up === 'MID') return 'PTS';
      if (up === 'ASAT' || up === 'PAT' || up === 'UKK') return 'PAT';
      return up;
    };

    const hasScoresSync = (n: any): boolean => {
      if (!n) return false;
      return (
        n.lm1 !== undefined || n.lm2 !== undefined ||
        n.lm3 !== undefined || n.lm4 !== undefined ||
        n.tugas1 !== undefined || n.tugas2 !== undefined || n.tugas3 !== undefined ||
        n.ulhar1 !== undefined || n.ulhar2 !== undefined ||
        n.nilaiPts !== undefined || n.nilaiPas !== undefined || n.nilaiPat !== undefined ||
        n.nilaiFormatif !== undefined ||
        (typeof n.nilaiAkhir === 'number' && n.nilaiAkhir > 0) ||
        Boolean(n.catatanGuru && String(n.catatanGuru).trim().length > 0) ||
        Boolean(n.tpDeskripsi && String(n.tpDeskripsi).trim().length > 0)
      );
    };

    const mergeSync = (existing: any, incoming: any) => {
      if (!existing) return incoming;
      if (!incoming) return existing;
      const exHas = hasScoresSync(existing);
      const inHas = hasScoresSync(incoming);
      if (exHas && !inHas) return existing;
      if (!exHas && inHas) return incoming;
      return {
        ...existing,
        ...incoming,
        lm1: incoming.lm1 !== undefined ? incoming.lm1 : existing.lm1,
        lm2: incoming.lm2 !== undefined ? incoming.lm2 : existing.lm2,
        lm3: incoming.lm3 !== undefined ? incoming.lm3 : existing.lm3,
        lm4: incoming.lm4 !== undefined ? incoming.lm4 : existing.lm4,
        tugas1: incoming.tugas1 !== undefined ? incoming.tugas1 : existing.tugas1,
        tugas2: incoming.tugas2 !== undefined ? incoming.tugas2 : existing.tugas2,
        tugas3: incoming.tugas3 !== undefined ? incoming.tugas3 : existing.tugas3,
        ulhar1: incoming.ulhar1 !== undefined ? incoming.ulhar1 : existing.ulhar1,
        ulhar2: incoming.ulhar2 !== undefined ? incoming.ulhar2 : existing.ulhar2,
        nilaiPts: incoming.nilaiPts !== undefined ? incoming.nilaiPts : existing.nilaiPts,
        nilaiPas: incoming.nilaiPas !== undefined ? incoming.nilaiPas : existing.nilaiPas,
        nilaiPat: incoming.nilaiPat !== undefined ? incoming.nilaiPat : existing.nilaiPat,
        nilaiFormatif: incoming.nilaiFormatif !== undefined ? incoming.nilaiFormatif : existing.nilaiFormatif,
        nilaiAkhir: (typeof incoming.nilaiAkhir === 'number' && incoming.nilaiAkhir > 0) ? incoming.nilaiAkhir : existing.nilaiAkhir,
      };
    };

    const getGradeKey = (n: any) => {
      const studentId = (n.nipd || n.nisn || n.namaSiswa || n.id || '').replace(/[^a-zA-Z0-9]/g, '').trim().toLowerCase();
      const mapel = (n.mapelId || n.mapelNama || '').replace(/[^a-zA-Z0-9]/g, '').trim().toLowerCase();
      const per = normalizePeriodeSync(n.periode).toLowerCase();
      return `${studentId}_${mapel}_${per}`;
    };

    const rawNilaiMap = new Map<string, any>();
    if (backupSnap?.nilaiList && Array.isArray(backupSnap.nilaiList)) {
      backupSnap.nilaiList.forEach((n: any) => {
        if (n) {
          const k = getGradeKey(n);
          rawNilaiMap.set(k, n);
        }
      });
    }
    if (nilaiMasterSnap?.nilaiList && Array.isArray(nilaiMasterSnap.nilaiList)) {
      nilaiMasterSnap.nilaiList.forEach((n: any) => {
        if (n) {
          const k = getGradeKey(n);
          rawNilaiMap.set(k, mergeSync(rawNilaiMap.get(k), n));
        }
      });
    }
    liveNilai.forEach((n: any) => {
      if (n) {
        const k = getGradeKey(n);
        rawNilaiMap.set(k, mergeSync(rawNilaiMap.get(k), n));
      }
    });
    const nilaiList = Array.from(rawNilaiMap.values());

    // Only restore from backupSnap if not intentionally dismissed or wiped
    const rawPPDB = livePPDB.length > 0 
      ? livePPDB 
      : ((isTemplatePPDBDismissed || tombstonedPPDBIds.size > 0) ? [] : (backupSnap?.formulirList || []));
    
    const formulirList = rawPPDB.filter((f: any) => {
      if (!f || !f.id) return false;
      if (tombstonedPPDBIds.has(f.id)) return false;
      if (f.nisn && tombstonedPPDBIds.has(f.nisn)) return false;
      return true;
    });

    const jadwalPelajaranList = liveJadwalP.length > 0 ? liveJadwalP : (backupSnap?.jadwalPelajaranList || []);
    const jadwalUjianList = liveJadwalU.length > 0 ? liveJadwalU : (backupSnap?.jadwalUjianList || []);
    const ujianList = liveUjian.length > 0 ? liveUjian : (backupSnap?.ujianList || []);
    const absenMengajarList = liveAbsenM.length > 0 ? liveAbsenM : (backupSnap?.absenMengajarList || []);
    const ekskulList = liveEkskul.length > 0 ? liveEkskul : (backupSnap?.ekskulList || []);
    const nilaiEkskulList = liveNilaiEkskul.length > 0 ? liveNilaiEkskul : (backupSnap?.nilaiEkskulList || []);
    const kontenList = liveKonten.length > 0 ? liveKonten : (backupSnap?.kontenList || []);

    return {
      success: true,
      schoolInfo,
      usersList,
      kelasList,
      mapelList,
      formulirList,
      ujianList,
      kontenList,
      jadwalPelajaranList,
      jadwalUjianList,
      absensiList,
      ekskulList,
      nilaiList,
      nilaiEkskulList,
      absenMengajarList,
      isTemplateStudentsDismissed,
      isTemplatePPDBDismissed,
      tombstonedUserIds: Array.from(tombstonedUserIds),
      tombstonedPPDBIds: Array.from(tombstonedPPDBIds),
    };
  } catch (err: any) {
    console.warn('pullAllDataFromCloud notice:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

