import React, { useState, useMemo, useEffect } from 'react';
import { 
  History, 
  RotateCcw, 
  Download, 
  Upload, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  X, 
  Database, 
  ChevronRight, 
  Eye, 
  FileSpreadsheet,
  Sparkles,
  HelpCircle,
  Search,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Mapel, Kelas, User, NilaiMapelSiswa } from '../types';
import { isSameKelas } from '../utils/academicHelpers';

export interface LegerSnapshot {
  id: string;
  timestamp: number;
  formattedTime: string;
  mapelId: string;
  mapelNama: string;
  kelasId: string;
  kelasNama: string;
  periode: string;
  totalStudentsWithScore: number;
  averageScore: number;
  scores: { [nipd: string]: Partial<NilaiMapelSiswa> };
  trigger: 'sebelum_simpan' | 'sebelum_kosongkan' | 'manual' | 'otomatis' | 'database_backup';
  keterangan?: string;
}

export const LEGER_SNAPSHOTS_STORAGE_KEY = 'saved_leger_snapshots_history';

// Helper to count how many students have actual filled scores
export const countStudentsWithScores = (scores: { [nipd: string]: Partial<NilaiMapelSiswa> }): { count: number; avg: number } => {
  if (!scores) return { count: 0, avg: 0 };
  let count = 0;
  let sumNA = 0;
  let naCount = 0;

  Object.values(scores).forEach(item => {
    if (!item) return;
    const hasAny = (
      item.lm1 !== undefined || item.lm2 !== undefined ||
      item.lm3 !== undefined || item.lm4 !== undefined ||
      item.tugas1 !== undefined || item.tugas2 !== undefined || item.tugas3 !== undefined ||
      item.ulhar1 !== undefined || item.ulhar2 !== undefined ||
      item.nilaiPts !== undefined || item.nilaiPas !== undefined || item.nilaiPat !== undefined ||
      (item.nilaiAkhir !== undefined && item.nilaiAkhir > 0)
    );
    if (hasAny) {
      count++;
      if (item.nilaiAkhir && item.nilaiAkhir > 0) {
        sumNA += item.nilaiAkhir;
        naCount++;
      }
    }
  });

  return {
    count,
    avg: naCount > 0 ? Number((sumNA / naCount).toFixed(1)) : 0,
  };
};

// Global helper to load snapshots from localStorage
export const loadAllLegerSnapshots = (): LegerSnapshot[] => {
  try {
    const raw = localStorage.getItem(LEGER_SNAPSHOTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

// Global helper to record a new snapshot
export const recordLegerSnapshot = (snapshot: Omit<LegerSnapshot, 'id' | 'timestamp' | 'formattedTime' | 'totalStudentsWithScore' | 'averageScore'> & {
  id?: string;
  timestamp?: number;
  formattedTime?: string;
}): LegerSnapshot => {
  const all = loadAllLegerSnapshots();
  const now = Date.now();
  const dateFormatted = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(now));

  const stats = countStudentsWithScores(snapshot.scores);

  const newSnap: LegerSnapshot = {
    id: snapshot.id || `snap_${now}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: snapshot.timestamp || now,
    formattedTime: snapshot.formattedTime || dateFormatted,
    mapelId: snapshot.mapelId,
    mapelNama: snapshot.mapelNama,
    kelasId: snapshot.kelasId,
    kelasNama: snapshot.kelasNama,
    periode: snapshot.periode || 'PAS',
    totalStudentsWithScore: stats.count,
    averageScore: stats.avg,
    scores: snapshot.scores,
    trigger: snapshot.trigger,
    keterangan: snapshot.keterangan,
  };

  // Only keep maximum 60 most recent snapshots
  const updated = [newSnap, ...all.filter(s => s.id !== newSnap.id)].slice(0, 60);
  try {
    localStorage.setItem(LEGER_SNAPSHOTS_STORAGE_KEY, JSON.stringify(updated));
  } catch (_) {}

  return newSnap;
};

interface LegerRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMapel?: Mapel;
  currentKelas?: Kelas;
  selectedPeriode: string;
  classStudents: User[];
  currentGrades: { [nipd: string]: Partial<NilaiMapelSiswa> };
  savedNilaiList: NilaiMapelSiswa[];
  onRestoreScores: (restoredScores: { [nipd: string]: Partial<NilaiMapelSiswa> }, sourceInfo: string) => void;
  onRestoreGlobalNilaiList?: (mergedList: NilaiMapelSiswa[], count: number) => void;
}

export const LegerRestoreModal: React.FC<LegerRestoreModalProps> = ({
  isOpen,
  onClose,
  currentMapel,
  currentKelas,
  selectedPeriode,
  classStudents = [],
  currentGrades = {},
  savedNilaiList = [],
  onRestoreScores,
  onRestoreGlobalNilaiList,
}) => {
  const [snapshots, setSnapshots] = useState<LegerSnapshot[]>([]);
  const [activeTab, setActiveTab] = useState<'current_class' | 'rescue' | 'database_source' | 'all_history'>('current_class');
  const [searchFilter, setSearchFilter] = useState('');
  const [previewSnapshot, setPreviewSnapshot] = useState<LegerSnapshot | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  // Load snapshots when modal opens
  useEffect(() => {
    if (isOpen) {
      setSnapshots(loadAllLegerSnapshots());
      setConfirmRestoreId(null);
      setPreviewSnapshot(null);
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Manual Snapshot Creation
  const handleCreateManualSnapshot = () => {
    if (!currentMapel || !currentKelas) return;
    const stats = countStudentsWithScores(currentGrades);
    if (stats.count === 0) {
      showToast('⚠️ Form saat ini tidak memiliki nilai siswa untuk dicadangkan.');
      return;
    }

    const created = recordLegerSnapshot({
      mapelId: currentMapel.id,
      mapelNama: currentMapel.namaMapel,
      kelasId: currentKelas.id,
      kelasNama: currentKelas.namaKelas,
      periode: selectedPeriode || 'PAS',
      scores: currentGrades,
      trigger: 'manual',
      keterangan: `Cadangan manual oleh pengguna (${stats.count} nilai siswa)`,
    });

    setSnapshots(loadAllLegerSnapshots());
    showToast(`✅ Titik pemulihan berhasil dibuat! (${stats.count} nilai siswa dicadangkan).`);
  };

  // Delete single snapshot
  const handleDeleteSnapshot = (id: string) => {
    const updated = snapshots.filter(s => s.id !== id);
    setSnapshots(updated);
    try {
      localStorage.setItem(LEGER_SNAPSHOTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}
    if (previewSnapshot?.id === id) setPreviewSnapshot(null);
    showToast('Cadangan riwayat berhasil dihapus.');
  };

  // Clear all snapshots
  const handleClearAllSnapshots = () => {
    if (window.confirm('Hapus seluruh riwayat titik pemulihan leger nilai? Tindakan ini tidak dapat dibatalkan.')) {
      setSnapshots([]);
      try {
        localStorage.removeItem(LEGER_SNAPSHOTS_STORAGE_KEY);
      } catch (_) {}
      setPreviewSnapshot(null);
      showToast('Seluruh riwayat cadangan telah dibersihkan.');
    }
  };

  // Export snapshots to JSON file
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snapshots, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `Cadangan_Leger_Nilai_${currentMapel?.namaMapel || 'Mapel'}_${currentKelas?.namaKelas || 'Kelas'}_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast('File cadangan .json berhasil diunduh ke perangkat Anda!');
  };

  // Import snapshots from JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          const combined = [...parsed, ...snapshots];
          const map = new Map<string, LegerSnapshot>();
          combined.forEach(s => {
            if (s && s.id && s.scores) map.set(s.id, s);
          });
          const merged = Array.from(map.values()).slice(0, 100);
          setSnapshots(merged);
          localStorage.setItem(LEGER_SNAPSHOTS_STORAGE_KEY, JSON.stringify(merged));
          showToast(`Berhasil mengimpor ${parsed.length} titik pemulihan cadangan!`);
        } else {
          showToast('⚠️ Format file JSON cadangan tidak sesuai.');
        }
      } catch (err: any) {
        showToast('❌ Gagal membaca file cadangan: ' + err?.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Execute restore of snapshot to form
  const handleExecuteRestore = (snap: LegerSnapshot) => {
    onRestoreScores(snap.scores, `${snap.formattedTime} (${snap.trigger})`);
    setConfirmRestoreId(null);
    onClose();
  };

  // Pindai & Pulihkan Semua Cadangan (Deep Restore dari seluruh riwayat & snapshot)
  const handleDeepScanAndRestore = () => {
    const recoveredMap: { [key: string]: NilaiMapelSiswa } = {};
    let count = 0;

    const ingest = (item: any) => {
      if (!item) return;
      const hasAnyScore = (
        item.lm1 !== undefined || item.lm2 !== undefined || item.lm3 !== undefined || item.lm4 !== undefined ||
        item.tugas1 !== undefined || item.tugas2 !== undefined || item.tugas3 !== undefined ||
        item.ulhar1 !== undefined || item.ulhar2 !== undefined ||
        item.nilaiPts !== undefined || item.nilaiPas !== undefined || item.nilaiPat !== undefined ||
        item.nilaiFormatif !== undefined ||
        (typeof item.nilaiAkhir === 'number' && item.nilaiAkhir > 0)
      );
      if (!hasAnyScore) return;

      const studentKey = (item.nipd || item.nisn || item.namaSiswa || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const mapelKey = (item.mapelId || item.mapelNama || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const perKey = (item.periode || 'pas').toLowerCase();
      const uniqueKey = `${studentKey}_${mapelKey}_${perKey}`;

      if (!recoveredMap[uniqueKey]) {
        recoveredMap[uniqueKey] = item;
        count++;
      } else {
        const existing = recoveredMap[uniqueKey];
        recoveredMap[uniqueKey] = {
          ...existing,
          ...item,
          lm1: item.lm1 !== undefined ? item.lm1 : existing.lm1,
          lm2: item.lm2 !== undefined ? item.lm2 : existing.lm2,
          lm3: item.lm3 !== undefined ? item.lm3 : existing.lm3,
          lm4: item.lm4 !== undefined ? item.lm4 : existing.lm4,
          tugas1: item.tugas1 !== undefined ? item.tugas1 : existing.tugas1,
          tugas2: item.tugas2 !== undefined ? item.tugas2 : existing.tugas2,
          tugas3: item.tugas3 !== undefined ? item.tugas3 : existing.tugas3,
          ulhar1: item.ulhar1 !== undefined ? item.ulhar1 : existing.ulhar1,
          ulhar2: item.ulhar2 !== undefined ? item.ulhar2 : existing.ulhar2,
          nilaiPts: item.nilaiPts !== undefined ? item.nilaiPts : existing.nilaiPts,
          nilaiPas: item.nilaiPas !== undefined ? item.nilaiPas : existing.nilaiPas,
          nilaiPat: item.nilaiPat !== undefined ? item.nilaiPat : existing.nilaiPat,
          nilaiFormatif: item.nilaiFormatif !== undefined ? item.nilaiFormatif : existing.nilaiFormatif,
          nilaiAkhir: (typeof item.nilaiAkhir === 'number' && item.nilaiAkhir > 0) ? item.nilaiAkhir : existing.nilaiAkhir,
        };
      }
    };

    // 1. Scan semua snapshots leger
    const allSnaps = loadAllLegerSnapshots();
    allSnaps.forEach(s => {
      if (s.scores && typeof s.scores === 'object') {
        Object.values(s.scores).forEach(sc => ingest(sc));
      }
    });

    // 2. Scan internal backups list
    try {
      const rawInternal = localStorage.getItem('bpm_internal_backups_list');
      if (rawInternal) {
        const parsed = JSON.parse(rawInternal);
        if (Array.isArray(parsed)) {
          parsed.forEach(b => {
            const list = b?.data?.nilaiList || b?.nilaiList;
            if (Array.isArray(list)) list.forEach(ingest);
          });
        }
      }
    } catch (_) {}

    // 3. Scan semua storage keys cadangan
    const otherKeys = ['saved_nilai_list', 'nilai_mapel_siswa', 'saved_nilai_master', 'bpm_nilai_list'];
    otherKeys.forEach(k => {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) parsed.forEach(ingest);
        }
      } catch (_) {}
    });

    // 4. Scan savedNilaiList saat ini
    if (Array.isArray(savedNilaiList)) {
      savedNilaiList.forEach(ingest);
    }

    const allRecovered = Object.values(recoveredMap);
    if (allRecovered.length === 0) {
      showToast('⚠️ Belum ditemukan arsip nilai dalam riwayat penyimpanan lokal.');
      return;
    }

    // Terapkan ke form input mapel aktif jika sesuai
    if (currentMapel && currentKelas) {
      const clean = (s?: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const currentMNorm = clean(currentMapel.namaMapel);
      const currentMId = clean(currentMapel.id);

      const matchedForCurrent: { [nipd: string]: Partial<NilaiMapelSiswa> } = {};
      allRecovered.forEach(item => {
        const itemMNorm = clean(item.mapelNama);
        const itemMId = clean(item.mapelId);
        const isMatchMapel = (itemMId && itemMId === currentMId) || (itemMNorm && itemMNorm === currentMNorm);
        if (isMatchMapel) {
          const sKey = item.nipd || item.nisn || item.namaSiswa;
          if (sKey) matchedForCurrent[sKey] = item;
        }
      });

      if (Object.keys(matchedForCurrent).length > 0) {
        onRestoreScores(matchedForCurrent, 'Pemindaian Seluruh Arsip Cadangan');
      }
    }

    // Panggil sinkronisasi global ke state induk & database jika didukung
    if (onRestoreGlobalNilaiList) {
      onRestoreGlobalNilaiList(allRecovered, allRecovered.length);
    }

    showToast(`✅ Berhasil memindai dan memulihkan ${allRecovered.length} nilai siswa dari seluruh riwayat cadangan!`);
  };

  // Database Existing Grades for this Mapel & Kelas
  const databaseGradesForCurrent = useMemo(() => {
    if (!currentMapel || !currentKelas || !savedNilaiList) return null;

    const mId = currentMapel.id;
    const mNama = currentMapel.namaMapel.trim().toLowerCase();
    const kNama = currentKelas.namaKelas;
    const per = selectedPeriode || 'PAS';

    const matched = savedNilaiList.filter(n => {
      if (!n) return false;
      const matchMapel = (n.mapelId && n.mapelId === mId) ||
        (n.mapelNama && n.mapelNama.trim().toLowerCase() === mNama);
      const matchKelas = isSameKelas(n.kelas, kNama) || n.kelas === currentKelas.id;
      const matchPeriode = !n.periode || n.periode === per;
      return matchMapel && matchKelas && matchPeriode;
    });

    if (matched.length === 0) return null;

    const scoresMap: { [nipd: string]: Partial<NilaiMapelSiswa> } = {};
    matched.forEach(item => {
      const key = item.nipd || item.nisn || item.id;
      if (key) scoresMap[key] = item;
    });

    return {
      count: matched.length,
      scores: scoresMap,
      items: matched,
    };
  }, [savedNilaiList, currentMapel, currentKelas, selectedPeriode]);

  // Filtered Snapshots for Current Class and Subject
  const currentClassSnapshots = useMemo(() => {
    if (!currentMapel || !currentKelas) return [];
    return snapshots.filter(s => {
      const matchMapel = s.mapelId === currentMapel.id || 
                         s.mapelNama.toLowerCase() === currentMapel.namaMapel.toLowerCase();
      const matchKelas = isSameKelas(s.kelasNama, currentKelas.namaKelas) || 
                         s.kelasId === currentKelas.id;
      return matchMapel && matchKelas;
    });
  }, [snapshots, currentMapel, currentKelas]);

  // Cadangan Penyelamat: Titik pemulihan untuk rombel kelas ini yang tersimpan di bawah mapel lain
  // (misal saat nilai Biologi kemarin sempat nyasar dan dicadangkan di Mikrobiologi / Keperawatan)
  const relatedClassSnapshots = useMemo(() => {
    if (!currentMapel || !currentKelas) return [];
    const currentMId = currentMapel.id;
    const currentMNorm = (currentMapel.namaMapel || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return snapshots.filter(s => {
      const isClass = isSameKelas(s.kelasNama, currentKelas.namaKelas) || s.kelasId === currentKelas.id;
      if (!isClass) return false;
      const sMId = s.mapelId;
      const sMNorm = (s.mapelNama || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const isSameSubject = (sMId === currentMId) || (sMNorm === currentMNorm);
      return !isSameSubject && s.totalStudentsWithScore > 0;
    });
  }, [snapshots, currentMapel, currentKelas]);

  // Filtered All Snapshots by Search
  const filteredAllSnapshots = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return snapshots;
    return snapshots.filter(s => 
      s.mapelNama.toLowerCase().includes(q) ||
      s.kelasNama.toLowerCase().includes(q) ||
      s.formattedTime.toLowerCase().includes(q) ||
      s.periode.toLowerCase().includes(q) ||
      (s.keterangan && s.keterangan.toLowerCase().includes(q))
    );
  }, [snapshots, searchFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-indigo-600 p-5 sm:p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/30 text-white transition-all cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wide flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-amber-200" />
              <span>Pusat Pemulihan Data Nilai</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[11px] font-black">
              Anti-Hilang & Cadangan
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
            Restore / Pulihkan Nilai Leger Mata Pelajaran
          </h2>

          <p className="text-xs sm:text-sm text-white/90 mt-1 leading-relaxed max-w-2xl">
            Jika Anda tidak sengaja mengosongkan/menghapus semua nilai, atau terjadi kesalahan input, Anda dapat memulihkan seluruh nilai siswa kembali ke form input dalam satu kali klik.
          </p>

          {currentMapel && currentKelas && (
            <div className="flex flex-wrap items-center gap-2.5 mt-3 text-xs bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
              <span className="font-bold">Mata Pelajaran: <span className="text-amber-200">{currentMapel.namaMapel}</span></span>
              <span>•</span>
              <span className="font-bold">Kelas: <span className="text-emerald-200">{currentKelas.namaKelas}</span></span>
              <span>•</span>
              <span className="font-bold">Periode: <span className="text-sky-200">{selectedPeriode}</span></span>
              <span>•</span>
              <span>{classStudents.length} Peserta Didik</span>
            </div>
          )}
        </div>

        {/* Action Bar (Create Manual Snapshot, Export, Import, Deep Scan) */}
        <div className="bg-slate-50 px-4 sm:px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDeepScanAndRestore}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
              title="Pindai seluruh arsip riwayat, cadangan otomatis sebelum simpan, dan berkas lokal untuk memulihkan nilai yang hilang"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pindai & Pulihkan Semua Cadangan</span>
            </button>

            <button
              type="button"
              onClick={handleCreateManualSnapshot}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Buat titik pemulihan dari nilai form yang sedang aktif sekarang"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Buat Cadangan Baru (Snapshot)</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              disabled={snapshots.length === 0}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              title="Unduh file riwayat cadangan (.json) ke perangkat lokal Anda"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Export Cadangan (.json)</span>
            </button>

            <label className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 shadow-2xs transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Import Cadangan (.json)</span>
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
          </div>

          {snapshots.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllSnapshots}
              className="text-[11px] text-slate-400 hover:text-rose-600 font-semibold transition-colors cursor-pointer"
            >
              Bersihkan Riwayat ({snapshots.length})
            </button>
          )}
        </div>

        {/* Toast Notification */}
        {notification && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Tab Navigation & Search */}
        <div className="px-4 sm:px-6 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('current_class')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'current_class'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Cadangan Mapel & Kelas Ini ({currentClassSnapshots.length})
            </button>

            {relatedClassSnapshots.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('rescue')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'rescue'
                    ? 'bg-orange-600 text-white shadow-xs ring-2 ring-orange-300'
                    : 'bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-300'
                }`}
                title="Cadangan siswa rombel kelas ini yang tersimpan saat nilai sempat berada di mapel lain"
              >
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span>Penyelamat Nilai Rombel ({relatedClassSnapshots.length})</span>
              </button>
            )}

            {databaseGradesForCurrent && (
              <button
                type="button"
                onClick={() => setActiveTab('database_source')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'database_source'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Dari Database ({databaseGradesForCurrent.count} Nilai)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('all_history')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all_history'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Semua Riwayat Cadangan ({snapshots.length})
            </button>
          </div>

          {activeTab === 'all_history' && (
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Cari mapel, kelas, tanggal..."
                className="w-full pl-8 pr-3 py-1 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
              />
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: Cadangan Rombel & Mapel Ini */}
          {activeTab === 'current_class' && (
            <div className="space-y-3">
              {currentClassSnapshots.length === 0 ? (
                <div className="p-6 sm:p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Belum Ada Riwayat Cadangan dengan Label "{currentMapel?.namaMapel}"
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Sistem otomatis membuat titik pemulihan sebelum Anda menyimpan nilai atau sebelum form dikosongkan.
                  </p>

                  {/* Deteksi Otomatis Cadangan Penyelamat Rombel Kelas Ini */}
                  {relatedClassSnapshots.length > 0 && (
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-orange-400 rounded-2xl text-left space-y-3 mt-3 shadow-xs">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 bg-orange-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                          <Sparkles className="w-4 h-4 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-orange-950 flex items-center gap-2 flex-wrap">
                            <span>Mengapa di cadangan yang muncul adalah mapel lain?</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-orange-200 text-orange-900 font-extrabold uppercase border border-orange-300">
                              Ditemukan {relatedClassSnapshots.length} Titik Cadangan
                            </span>
                          </h4>
                          <p className="text-xs text-orange-900/90 leading-relaxed mt-1">
                            Kemarin saat Anda menginput nilai kelas <strong>{currentKelas?.namaKelas}</strong>, pilihan mata pelajaran aktif sempat berada pada <em>"{relatedClassSnapshots[0]?.mapelNama || 'mapel lain'}"</em>. 
                            <br />
                            <strong>Nilai siswa Anda TIDAK HILANG!</strong> Seluruh nilai yang Anda ketik tersimpan aman di dalam cadangan di bawah ini. Cukup klik tombol <strong>"Pindahkan ke {currentMapel?.namaMapel}"</strong> untuk langsung menyalin seluruh nilai siswa ke mata pelajaran {currentMapel?.namaMapel} dan menyimpannya permanen ke database sekolah.
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 pt-1 border-t border-orange-200/80">
                        {relatedClassSnapshots.map(snap => renderSnapshotCard(snap, true))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
                    <button
                      type="button"
                      onClick={handleDeepScanAndRestore}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Pindai & Pulihkan Semua Cadangan</span>
                    </button>
                    {databaseGradesForCurrent && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('database_source')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>Gunakan Nilai dari Database ({databaseGradesForCurrent.count} siswa)</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-xs text-slate-500 font-medium">
                    Daftar titik pemulihan tersimpan untuk <strong>{currentMapel?.namaMapel} ({currentKelas?.namaKelas})</strong>:
                  </p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {currentClassSnapshots.map((snap) => renderSnapshotCard(snap))}
                  </div>

                  {relatedClassSnapshots.length > 0 && (
                    <div className="pt-4 border-t border-slate-200 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-orange-900">
                        <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                        <span>Cadangan Siswa Rombel Ini yang Tercatat di Mapel Lain ({relatedClassSnapshots.length}):</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {relatedClassSnapshots.map(snap => renderSnapshotCard(snap, true))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB RESCUE: Cadangan Rombel dari Mapel Lain */}
          {activeTab === 'rescue' && (
            <div className="space-y-3">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl text-orange-950 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-sm text-orange-900">
                  <Sparkles className="w-4 h-4 text-orange-600" />
                  <span>Cadangan Penyelamat Siswa Rombel {currentKelas?.namaKelas}</span>
                </div>
                <p className="text-xs text-orange-900/90 leading-relaxed">
                  Berikut adalah riwayat cadangan siswa <strong>{currentKelas?.namaKelas}</strong> yang tersimpan saat nilai sempat berada di bawah nama mata pelajaran lain (misal Mikrobiologi atau Keperawatan). Anda dapat mengklik <strong>"Pulihkan ke {currentMapel?.namaMapel}"</strong> untuk langsung memindahkan seluruh nilai tersebut ke form mata pelajaran ini.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {relatedClassSnapshots.map((snap) => renderSnapshotCard(snap, true))}
              </div>
            </div>
          )}

          {/* TAB 2: Database Source */}
          {activeTab === 'database_source' && databaseGradesForCurrent && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                  <Database className="w-4 h-4 text-emerald-700" />
                  <span>Data Nilai Tersimpan di Database Sekolah</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Ditemukan <strong>{databaseGradesForCurrent.count} rekaman nilai</strong> pada database sistem (Cloud Firestore / Memori) untuk kelas <strong>{currentKelas?.namaKelas}</strong> mata pelajaran <strong>{currentMapel?.namaMapel}</strong> ({selectedPeriode}).
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onRestoreScores(databaseGradesForCurrent.scores, 'Database Tersimpan (Cloud/Lokal)');
                      onClose();
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Pulihkan Seluruh Nilai dari Database ({databaseGradesForCurrent.count} Siswa)</span>
                  </button>
                </div>
              </div>

              {/* Table of Database Records */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">No</th>
                      <th className="py-2 px-3">NISN / NIPD</th>
                      <th className="py-2 px-3">Nama Siswa</th>
                      <th className="py-2 px-2 text-center">LM 1</th>
                      <th className="py-2 px-2 text-center">LM 2</th>
                      <th className="py-2 px-2 text-center">LM 3</th>
                      <th className="py-2 px-2 text-center">LM 4</th>
                      <th className="py-2 px-2 text-center">PTS/PAS</th>
                      <th className="py-2 px-2 text-center bg-emerald-100 text-emerald-900">NA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {databaseGradesForCurrent.items.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-mono">{it.nipd || it.nisn || '-'}</td>
                        <td className="py-1.5 px-3 font-semibold text-slate-800">{it.namaSiswa}</td>
                        <td className="py-1.5 px-2 text-center font-mono">{it.lm1 ?? '-'}</td>
                        <td className="py-1.5 px-2 text-center font-mono">{it.lm2 ?? '-'}</td>
                        <td className="py-1.5 px-2 text-center font-mono">{it.lm3 ?? '-'}</td>
                        <td className="py-1.5 px-2 text-center font-mono">{it.lm4 ?? '-'}</td>
                        <td className="py-1.5 px-2 text-center font-mono">{it.nilaiPas ?? it.nilaiPts ?? '-'}</td>
                        <td className="py-1.5 px-2 text-center font-mono font-bold text-emerald-700 bg-emerald-50/50">{it.nilaiAkhir ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Semua Riwayat Cadangan */}
          {activeTab === 'all_history' && (
            <div className="space-y-3">
              {filteredAllSnapshots.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                  Tidak ada cadangan yang cocok dengan pencarian "{searchFilter}".
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {filteredAllSnapshots.map((snap) => renderSnapshotCard(snap))}
                </div>
              )}
            </div>
          )}

          {/* Snapshot Preview Detail Modal/Drawer */}
          {previewSnapshot && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-300 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-indigo-600" />
                    <span>Pratinjau Cadangan: {previewSnapshot.mapelNama} ({previewSnapshot.kelasNama})</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Waktu Simpan: {previewSnapshot.formattedTime} • {previewSnapshot.totalStudentsWithScore} Nilai Siswa
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewSnapshot(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕ Tutup Pratinjau
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                    <tr>
                      <th className="py-1.5 px-2.5">NISN / NIPD</th>
                      <th className="py-1.5 px-2.5">Nama Siswa</th>
                      <th className="py-1.5 px-1.5 text-center">LM 1</th>
                      <th className="py-1.5 px-1.5 text-center">LM 2</th>
                      <th className="py-1.5 px-1.5 text-center">LM 3</th>
                      <th className="py-1.5 px-1.5 text-center">LM 4</th>
                      <th className="py-1.5 px-1.5 text-center">PTS/PAS</th>
                      <th className="py-1.5 px-2 text-center bg-emerald-100 text-emerald-900">NA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(previewSnapshot.scores).map(([nipd, scoreItem], i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-1 px-2.5 font-mono">{nipd}</td>
                        <td className="py-1 px-2.5 font-medium">{scoreItem.namaSiswa || 'Siswa'}</td>
                        <td className="py-1 px-1.5 text-center font-mono">{scoreItem.lm1 ?? '-'}</td>
                        <td className="py-1 px-1.5 text-center font-mono">{scoreItem.lm2 ?? '-'}</td>
                        <td className="py-1 px-1.5 text-center font-mono">{scoreItem.lm3 ?? '-'}</td>
                        <td className="py-1 px-1.5 text-center font-mono">{scoreItem.lm4 ?? '-'}</td>
                        <td className="py-1 px-1.5 text-center font-mono">{scoreItem.nilaiPas ?? scoreItem.nilaiPts ?? '-'}</td>
                        <td className="py-1 px-2 text-center font-mono font-bold text-emerald-700 bg-emerald-50/40">{scoreItem.nilaiAkhir ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                {currentMapel && previewSnapshot.mapelNama.toLowerCase() !== currentMapel.namaMapel.toLowerCase() && (
                  <div className="text-xs text-orange-800 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span>Cadangan ini tercatat sebagai <strong>{previewSnapshot.mapelNama}</strong>. Akan dialihkan menjadi nilai <strong>{currentMapel.namaMapel}</strong>.</span>
                  </div>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => handleExecuteRestore(previewSnapshot)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{currentMapel && previewSnapshot.mapelNama.toLowerCase() !== currentMapel.namaMapel.toLowerCase() ? `Pindahkan & Terapkan ke ${currentMapel.namaMapel}` : 'Terapkan Cadangan Ini ke Form'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Nilai yang dipulihkan akan langsung masuk ke form input. Klik tombol <strong>"Simpan Nilai Leger Mapel"</strong> pada halaman utama untuk menyimpan permanen ke Cloud.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-all cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );

  function renderSnapshotCard(snap: LegerSnapshot, isCrossMapelRescue = false) {
    const isConfirming = confirmRestoreId === snap.id;
    const isDifferentMapel = currentMapel && (snap.mapelNama.toLowerCase() !== currentMapel.namaMapel.toLowerCase());
    const isRescue = isCrossMapelRescue || isDifferentMapel;

    const triggerLabel = 
      snap.trigger === 'sebelum_simpan' ? 'Otomatis Sebelum Disimpan' :
      snap.trigger === 'sebelum_kosongkan' ? 'Cadangan Sebelum Dikosongkan' :
      snap.trigger === 'manual' ? 'Cadangan Manual' : 'Snapshot Sistem';

    const triggerBadgeColor = 
      snap.trigger === 'sebelum_kosongkan' ? 'bg-rose-100 text-rose-800 border-rose-200' :
      snap.trigger === 'manual' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
      'bg-amber-100 text-amber-800 border-amber-200';

    return (
      <div 
        key={snap.id}
        className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isRescue 
            ? 'border-orange-300 bg-orange-50/40 hover:border-orange-400 hover:shadow-xs' 
            : 'border-slate-200 bg-white hover:border-amber-300 hover:shadow-xs'
        }`}
      >
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${triggerBadgeColor}`}>
              {triggerLabel}
            </span>
            {isRescue && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-200 text-orange-900 border border-orange-300">
                Tercatat di: {snap.mapelNama}
              </span>
            )}
            <span className="text-xs font-bold text-slate-800">
              {snap.mapelNama} — {snap.kelasNama}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
              {snap.periode}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{snap.formattedTime}</span>
            </span>
            <span>•</span>
            <span className="font-semibold text-emerald-700">
              {snap.totalStudentsWithScore} Siswa Memiliki Nilai
            </span>
            {snap.averageScore > 0 && (
              <>
                <span>•</span>
                <span>Rata-rata NA: <strong>{snap.averageScore}</strong></span>
              </>
            )}
          </div>

          {/* Pratinjau Nama Siswa & Nilai yang ada di dalam cadangan */}
          {(() => {
            const studentSample = Object.values(snap.scores || {})
              .filter(sc => sc && (sc.nilaiAkhir || sc.lm1 || sc.tugas1 || sc.nilaiPts || sc.nilaiPas))
              .slice(0, 4);
            if (studentSample.length === 0) return null;
            return (
              <div className="text-[11px] text-slate-600 bg-slate-100/80 px-2.5 py-1.5 rounded-lg flex items-center gap-2 flex-wrap mt-1">
                <span className="font-semibold text-slate-500">Nilai Siswa:</span>
                {studentSample.map((st, i) => (
                  <span key={i} className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-medium text-[10px]">
                    {st.namaSiswa || 'Siswa'}: <strong className="text-emerald-700">{st.nilaiAkhir || st.nilaiPas || st.nilaiPts || st.lm1 || '-'}</strong>
                  </span>
                ))}
              </div>
            );
          })()}

          {snap.keterangan && (
            <p className="text-[11px] text-slate-400 italic">
              {snap.keterangan}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setPreviewSnapshot(snap)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Lihat rincian nilai siswa dalam cadangan ini"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Pratinjau</span>
          </button>

          {isConfirming ? (
            <div className="flex items-center gap-1.5 bg-amber-50 p-1 rounded-xl border border-amber-300">
              <span className="text-[11px] font-bold text-amber-900 px-1">
                {isRescue && currentMapel ? `Pindahkan seluruh nilai ke ${currentMapel.namaMapel}?` : 'Pulihkan?'}
              </span>
              <button
                type="button"
                onClick={() => handleExecuteRestore(snap)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
              >
                Ya, Pulihkan
              </button>
              <button
                type="button"
                onClick={() => setConfirmRestoreId(null)}
                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRestoreId(snap.id)}
              className={`px-3.5 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 ${
                isRescue
                  ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-200'
                  : 'bg-amber-600 hover:bg-amber-500'
              }`}
              title={`Pulihkan ${snap.totalStudentsWithScore} nilai dari cadangan ini ke dalam form ${currentMapel?.namaMapel || ''}`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isRescue && currentMapel ? `Pindahkan ke ${currentMapel.namaMapel}` : 'Pulihkan (Restore)'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleDeleteSnapshot(snap.id)}
            className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors cursor-pointer rounded-lg hover:bg-rose-50"
            title="Hapus cadangan ini"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }
};
