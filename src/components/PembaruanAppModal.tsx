import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  History, 
  Filter, 
  Database, 
  Smartphone, 
  Printer, 
  ShieldCheck, 
  X, 
  ChevronRight, 
  Calendar,
  Layers,
  ArrowRight,
  Flame,
  FileSpreadsheet
} from 'lucide-react';

export const CURRENT_APP_VERSION = '2.8.5';
export const APP_RELEASE_DATE = '15 Oktober 2026';
// Batas maksimal jendela info pembaruan otomatis tampil adalah 2 hari (48 jam) sejak pertama kali pembaruan aktif
export const MAX_UPDATE_DISPLAY_DURATION_MS = 2 * 24 * 60 * 60 * 1000; // 48 jam (2 hari)

export function shouldShowAppUpdateModal(): boolean {
  try {
    const lastSeen = localStorage.getItem('last_seen_app_version');
    if (lastSeen === CURRENT_APP_VERSION) {
      return false;
    }

    const firstSeenKey = `first_seen_update_time_${CURRENT_APP_VERSION}`;
    const storedFirstSeen = localStorage.getItem(firstSeenKey);
    const now = Date.now();

    if (!storedFirstSeen) {
      // Pertama kali versi ini terdeteksi pada perangkat pengguna
      localStorage.setItem(firstSeenKey, String(now));
      return true;
    }

    const elapsed = now - Number(storedFirstSeen);
    if (elapsed > MAX_UPDATE_DISPLAY_DURATION_MS) {
      // Sudah lewat 2 hari -> otomatis ditutup permanen
      localStorage.setItem('last_seen_app_version', CURRENT_APP_VERSION);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export interface VersionChangelog {
  version: string;
  releaseDate: string;
  isLatest?: boolean;
  title: string;
  summary: string;
  highlights: {
    category: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    badge?: string;
  }[];
}

export const APP_CHANGELOG_HISTORY: VersionChangelog[] = [
  {
    version: '2.8.5',
    releaseDate: '15 Oktober 2026',
    isLatest: true,
    title: 'Optimalisasi Monitoring Nilai Guru, Filter Kombinasi 3 Jurusan/Kelas & Kecepatan Memulai Sistem',
    summary: 'Pembaruan sistem: perbaikan tampilan monitoring nilai guru dan sinkronisasi nama pengampu, penambahan filter kombinasi 3 jurusan dan kelas, akselerasi kecepatan loading aplikasi saat startup, serta batas maksimal notifikasi pembaruan 2 hari.',
    highlights: [
      {
        category: 'Monitoring Nilai Guru',
        icon: Filter,
        title: 'Filter Kombinasi 3 Jurusan & Sinkronisasi Nama Guru',
        description: 'Kini Admin dapat memilih filter kombinasi hingga 3 jurusan sekaligus (misal Farmasi, Askep & Kecantikan) dan 3 rombel kelas. Penugasan nilai guru kini terdeteksi 100% lengkap tanpa ada baris guru yang terlewat.',
        badge: 'Pembaruan'
      },
      {
        category: 'Kecepatan Aplikasi',
        icon: Database,
        title: 'Akselerasi Loading Awal Sistem (High-Speed Startup)',
        description: 'Optimalisasi pemuatan data awal cloud saat aplikasi pertama kali dibuka (startup). Sistem kini memprioritaskan cache lokal dan snapshot cloud berkecepatan tinggi tanpa hambatan delay jaringan.',
        badge: 'Performa Cepat'
      },
      {
        category: 'Notifikasi Sistem',
        icon: Sparkles,
        title: 'Batas Aktif Info Pembaruan Maksimal 2 Hari',
        description: 'Jendela pemberitahuan informasi pembaruan sistem kini otomatis berhenti muncul setelah 2 hari (48 jam) sehingga tidak mengganggu aktivitas rutin bapak/ibu guru dan staf sekolah.',
        badge: 'Otomatis 2 Hari'
      },
      {
        category: 'Leger Nilai & Walas',
        icon: History,
        title: 'Multi-Kelas Walas & Penyimpanan Pengampu Otomatis',
        description: 'Setiap nilai yang diinput guru otomatis mengikat identitas pengampu. Penugasan wali kelas kini mendukung multi-kelas hingga 3 rombel sekaligus.',
        badge: 'Fleksibilitas'
      }
    ]
  },
  {
    version: '2.8.0',
    releaseDate: '15 Oktober 2026',
    title: 'Pembaruan Fitur Monitoring Nilai Ujian, Sistem Restore Leger & Optimalisasi Cloud',
    summary: 'Pembaruan besar sistem akademik: penambahan filter cerdas di Monitoring Nilai Guru, tombol Restore di Leger Nilai, dan pemberitahuan update otomatis.',
    highlights: [
      {
        category: 'Monitoring Nilai Guru',
        icon: Filter,
        title: 'Filter Fleksibel Kelas Ujian, Tingkatan & Jurusan',
        description: 'Admin dapat memfilter progres pengisian nilai guru berdasarkan rombel dan kelas ujian.',
        badge: 'Fitur Baru'
      },
      {
        category: 'Leger Nilai Mata Pelajaran',
        icon: History,
        title: 'Tombol Restore Nilai & Snapshot Cadangan',
        description: 'Tersedia tombol "Restore Nilai" dengan riwayat snapshot otomatis untuk mengantisipasi nilai terhapus tidak sengaja.',
        badge: 'Proteksi Data'
      }
    ]
  },
  {
    version: '2.7.5',
    releaseDate: '10 Oktober 2026',
    title: 'Optimalisasi Cetak Leger & Presensi Berbasis GPS',
    summary: 'Penyempurnaan modul cetak raport Kurikulum Merdeka, absensi geolokasi radius sekolah, dan ekspor excel.',
    highlights: [
      {
        category: 'Presensi',
        icon: Smartphone,
        title: 'Presensi GPS Radius Sekolah & Barcode Scan',
        description: 'Presensi kehadiran siswa dan guru terintegrasi koordinat GPS sekolah dengan deteksi hari efektif (Sabtu-Minggu libur).',
      },
      {
        category: 'Raport',
        icon: Printer,
        title: 'Cetak Raport & Leger Resmi Kurikulum Merdeka',
        description: 'Tampilan cetak lembar nilai rapi berstandar Disdik dengan pilihan ukuran kertas A4 / Folio (F4) dan kop surat ganda.',
      }
    ]
  }
];

interface PembaruanAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userRole?: string;
}

export const PembaruanAppModal: React.FC<PembaruanAppModalProps> = ({
  isOpen,
  onClose,
  userName,
  userRole,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<string>(CURRENT_APP_VERSION);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  if (!isOpen) return null;

  const currentChangelog = APP_CHANGELOG_HISTORY.find(c => c.version === selectedVersion) || APP_CHANGELOG_HISTORY[0];

  const handleClose = () => {
    try {
      if (dontShowAgain) {
        localStorage.setItem('last_seen_app_version', CURRENT_APP_VERSION);
      }
    } catch (_) {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with attractive gradient */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-indigo-600 p-5 sm:p-6 text-white relative">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/30 text-white transition-all cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Info Pembaruan Sistem</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/90 text-white text-[11px] font-black">
              Versi {CURRENT_APP_VERSION}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
            {currentChangelog.title}
          </h2>

          <p className="text-xs sm:text-sm text-white/90 mt-1.5 leading-relaxed max-w-xl">
            {currentChangelog.summary}
          </p>

          <div className="flex items-center gap-3 mt-3 text-[11px] text-white/80">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-white/70" />
              <span>Rilis: {currentChangelog.releaseDate}</span>
            </span>
            <span>•</span>
            <span>SMK Bakti Putra Mandiri</span>
            {userName && (
              <>
                <span>•</span>
                <span className="truncate max-w-[180px]">Halo, {userName}</span>
              </>
            )}
          </div>
        </div>

        {/* Version Switcher Tabs if more than 1 version */}
        {APP_CHANGELOG_HISTORY.length > 1 && (
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-bold text-slate-500 uppercase shrink-0">
              Riwayat Versi:
            </span>
            {APP_CHANGELOG_HISTORY.map((ver) => (
              <button
                key={ver.version}
                type="button"
                onClick={() => setSelectedVersion(ver.version)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedVersion === ver.version
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-200/70 text-slate-700 border border-slate-200'
                }`}
              >
                v{ver.version} {ver.isLatest ? '(Terbaru)' : ''}
              </button>
            ))}
          </div>
        )}

        {/* Content Body: Highlights */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>Daftar Peningkatan & Fitur Baru</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              {currentChangelog.highlights.length} Peningkatan
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {currentChangelog.highlights.map((item, index) => {
              const IconComp = item.icon;
              return (
                <div 
                  key={index}
                  className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-amber-300 hover:shadow-sm transition-all space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                      <IconComp className="w-4 h-4" />
                    </div>
                    {item.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                      {item.category}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {item.title}
                    </h4>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Quick Guidance Box */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Petunjuk Guru & Pengguna:</span>
            </p>
            <p className="text-slate-700 leading-relaxed">
              • <strong>Leger Nilai:</strong> Jika Anda salah menghapus nilai atau ingin membatalkan perubahan, buka menu <strong>Leger Mapel</strong> lalu klik tombol <strong>"Restore Nilai"</strong> untuk mengembalikan data kapan saja.
            </p>
            <p className="text-slate-700 leading-relaxed">
              • <strong>Monitoring Nilai:</strong> Admin dan kurikulum dapat memantau rombel kelas ujian dan tingkatan tertentu dengan cepat melalui bilah filter baru.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
              />
              <span>Jangan tampilkan lagi jendela ini untuk versi {CURRENT_APP_VERSION}</span>
            </label>
            <span className="text-[10px] text-slate-400 italic">
              * Info pembaruan ini otomatis berhenti muncul setelah paling lama 2 hari (48 jam).
            </span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <span>Saya Mengerti & Lanjutkan</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
