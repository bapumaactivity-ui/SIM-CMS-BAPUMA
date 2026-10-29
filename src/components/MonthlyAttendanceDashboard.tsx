import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  BarChart3,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HelpCircle,
  FileSpreadsheet,
  Printer,
  TrendingUp,
  Download,
  Filter,
  Layers,
  Award,
  ChevronRight,
  School,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { AbsensiRecord, User, Kelas } from '../types';
import { isHariSekolahEfektif } from '../utils/academicHelpers';

interface MonthlyAttendanceDashboardProps {
  absensiList: AbsensiRecord[];
  usersList?: User[];
  kelasList?: Kelas[];
  currentUser?: User;
  onNavigateToScanner?: () => void;
  onNavigateToRiwayat?: () => void;
  className?: string;
}

const MONTH_NAMES_ID: Record<string, string> = {
  '01': 'Januari',
  '02': 'Februari',
  '03': 'Maret',
  '04': 'April',
  '05': 'Mei',
  '06': 'Juni',
  '07': 'Juli',
  '08': 'Agustus',
  '09': 'September',
  '10': 'Oktober',
  '11': 'November',
  '12': 'Desember',
};

export const MonthlyAttendanceDashboard: React.FC<MonthlyAttendanceDashboardProps> = ({
  absensiList = [],
  usersList = [],
  kelasList = [],
  currentUser,
  onNavigateToScanner,
  onNavigateToRiwayat,
  className = '',
}) => {
  // 1. Ekstrak seluruh bulan yang ada di catatan absensi
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    absensiList.forEach((r) => {
      if (r.tanggal && r.tanggal.length >= 7) {
        set.add(r.tanggal.substring(0, 7)); // 'YYYY-MM'
      }
    });

    // Selalu sertakan September 2026 dan Oktober 2026 jika belum ada
    set.add('2026-09');
    set.add('2026-10');

    const sorted = Array.from(set).sort();
    return sorted.map((key) => {
      const [year, month] = key.split('-');
      const monthLabel = MONTH_NAMES_ID[month] || month;
      return {
        key,
        year,
        month,
        label: `${monthLabel} ${year}`,
      };
    });
  }, [absensiList]);

  // Default ke September 2026 jika ada di data, atau bulan terbaru
  const defaultSelectedMonth = useMemo(() => {
    const hasSept2026 = availableMonths.some((m) => m.key === '2026-09');
    if (hasSept2026) return '2026-09';
    return availableMonths[availableMonths.length - 1]?.key || '2026-09';
  }, [availableMonths]);

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultSelectedMonth);
  const [selectedKelas, setSelectedKelas] = useState<string>('Semua');
  const [chartMode, setChartMode] = useState<'stacked' | 'grouped' | 'percent'>('stacked');
  const [granularity, setGranularity] = useState<'monthly' | 'daily'>('monthly');

  // Daftar kelas unik dari database
  const availableKelasList = useMemo(() => {
    const set = new Set<string>();
    if (kelasList && kelasList.length > 0) {
      kelasList.forEach((k) => {
        if (k.namaKelas) set.add(k.namaKelas.replace(/^Kelas\s+/i, '').trim());
      });
    }
    absensiList.forEach((r) => {
      if (r.kelas) set.add(r.kelas.replace(/^Kelas\s+/i, '').trim());
    });
    return Array.from(set).sort();
  }, [kelasList, absensiList]);

  // Saring absensi yang hanya pada hari sekolah efektif (Senin-Jumat)
  const validAbsensi = useMemo(() => {
    return absensiList.filter((r) => r.tanggal && isHariSekolahEfektif(r.tanggal));
  }, [absensiList]);

  // Absensi terfilter berdasarkan kelas yang dipilih
  const classFilteredAbsensi = useMemo(() => {
    if (selectedKelas === 'Semua') return validAbsensi;
    return validAbsensi.filter(
      (r) =>
        r.kelas &&
        r.kelas.replace(/^Kelas\s+/i, '').trim().toLowerCase() ===
          selectedKelas.toLowerCase()
    );
  }, [validAbsensi, selectedKelas]);

  // 2. Data Agregasi Tren Bulanan untuk Grafik Batang Recharts
  interface MonthlyChartItem {
    key: string;
    label: string;
    sublabel: string;
    Hadir: number;
    Terlambat: number;
    Sakit: number;
    Izin: number;
    Alpa: number;
    TotalPresensi: number;
    TotalHadir: number;
    PersenHadir: number;
    HariEfektif: number;
  }

  const monthlyBarData = useMemo<MonthlyChartItem[]>(() => {
    return availableMonths.map((m) => {
      const records = classFilteredAbsensi.filter(
        (r) => r.tanggal && r.tanggal.startsWith(m.key)
      );
      const hadir = records.filter((r) => r.status === 'Hadir').length;
      const terlambat = records.filter((r) => r.status === 'Terlambat').length;
      const sakit = records.filter((r) => r.status === 'Sakit').length;
      const izin = records.filter((r) => r.status === 'Izin').length;
      const alpa = records.filter((r) => r.status === 'Alpa').length;
      const total = hadir + terlambat + sakit + izin + alpa;
      const totalHadir = hadir + terlambat;
      const percentHadir = total > 0 ? Number(((totalHadir / total) * 100).toFixed(1)) : 0;

      // Hitung jumlah tanggal unik (hari efektif yang tercatat)
      const uniqueDates = new Set(records.map((r) => r.tanggal)).size;

      return {
        key: m.key,
        label: m.label.replace(' 2026', "'26").replace(' 2027', "'27"),
        sublabel: m.label,
        Hadir: hadir,
        Terlambat: terlambat,
        Sakit: sakit,
        Izin: izin,
        Alpa: alpa,
        TotalPresensi: total,
        TotalHadir: totalHadir,
        PersenHadir: percentHadir,
        HariEfektif: uniqueDates,
      };
    });
  }, [availableMonths, classFilteredAbsensi]);

  // 3. Data Harian dalam Bulan Terpilih (Daily Breakdown)
  const dailyBarData = useMemo<MonthlyChartItem[]>(() => {
    const recordsInMonth = classFilteredAbsensi.filter(
      (r) => r.tanggal && r.tanggal.startsWith(selectedMonth)
    );

    // Kumpulkan tanggal unik
    const dateMap = new Map<string, AbsensiRecord[]>();
    recordsInMonth.forEach((r) => {
      if (!dateMap.has(r.tanggal)) {
        dateMap.set(r.tanggal, []);
      }
      dateMap.get(r.tanggal)!.push(r);
    });

    const sortedDates = Array.from(dateMap.keys()).sort();

    return sortedDates.map((tgl) => {
      const recs = dateMap.get(tgl) || [];
      const dayNum = tgl.split('-')[2];
      const hadir = recs.filter((r) => r.status === 'Hadir').length;
      const terlambat = recs.filter((r) => r.status === 'Terlambat').length;
      const sakit = recs.filter((r) => r.status === 'Sakit').length;
      const izin = recs.filter((r) => r.status === 'Izin').length;
      const alpa = recs.filter((r) => r.status === 'Alpa').length;
      const total = hadir + terlambat + sakit + izin + alpa;
      const totalHadir = hadir + terlambat;
      const persen = total > 0 ? Number(((totalHadir / total) * 100).toFixed(1)) : 0;

      return {
        key: tgl,
        label: `Tgl ${dayNum}`,
        sublabel: tgl,
        Hadir: hadir,
        Terlambat: terlambat,
        Sakit: sakit,
        Izin: izin,
        Alpa: alpa,
        TotalPresensi: total,
        TotalHadir: totalHadir,
        PersenHadir: persen,
        HariEfektif: 1,
      };
    });
  }, [classFilteredAbsensi, selectedMonth]);

  const activeChartData = useMemo<MonthlyChartItem[]>(() => {
    return granularity === 'monthly' ? monthlyBarData : dailyBarData;
  }, [granularity, monthlyBarData, dailyBarData]);

  // 4. Data Komparasi Kehadiran Antar Kelas pada Bulan Terpilih
  const classComparisonData = useMemo(() => {
    const monthRecords = validAbsensi.filter(
      (r) => r.tanggal && r.tanggal.startsWith(selectedMonth)
    );

    const map = new Map<string, AbsensiRecord[]>();
    availableKelasList.forEach((k) => map.set(k, []));

    monthRecords.forEach((r) => {
      const k = r.kelas ? r.kelas.replace(/^Kelas\s+/i, '').trim() : 'Lainnya';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });

    return Array.from(map.entries())
      .map(([namaKelas, recs]) => {
        const hadir = recs.filter((r) => r.status === 'Hadir').length;
        const terlambat = recs.filter((r) => r.status === 'Terlambat').length;
        const sakit = recs.filter((r) => r.status === 'Sakit').length;
        const izin = recs.filter((r) => r.status === 'Izin').length;
        const alpa = recs.filter((r) => r.status === 'Alpa').length;
        const total = hadir + terlambat + sakit + izin + alpa;
        const totalHadir = hadir + terlambat;
        const persen = total > 0 ? Number(((totalHadir / total) * 100).toFixed(1)) : 0;

        return {
          namaKelas,
          Hadir: hadir,
          Terlambat: terlambat,
          Sakit: sakit,
          Izin: izin,
          Alpa: alpa,
          Total: total,
          TotalHadir: totalHadir,
          PersenHadir: persen,
        };
      })
      .filter((item) => item.Total > 0 || availableKelasList.includes(item.namaKelas))
      .sort((a, b) => b.PersenHadir - a.PersenHadir);
  }, [validAbsensi, selectedMonth, availableKelasList]);

  // 5. Statistik Ringkasan untuk KPI Cards pada Bulan Terpilih
  const selectedMonthSummary = useMemo(() => {
    const recs = classFilteredAbsensi.filter(
      (r) => r.tanggal && r.tanggal.startsWith(selectedMonth)
    );
    const hadir = recs.filter((r) => r.status === 'Hadir').length;
    const terlambat = recs.filter((r) => r.status === 'Terlambat').length;
    const sakit = recs.filter((r) => r.status === 'Sakit').length;
    const izin = recs.filter((r) => r.status === 'Izin').length;
    const alpa = recs.filter((r) => r.status === 'Alpa').length;
    const total = hadir + terlambat + sakit + izin + alpa;
    const totalHadir = hadir + terlambat;
    const persentase = total > 0 ? Number(((totalHadir / total) * 100).toFixed(1)) : 0;

    const uniqueDates = Array.from(new Set(recs.map((r) => r.tanggal))).sort();
    const hariEfektif = uniqueDates.length;

    // Kelas terbaik di bulan ini
    const bestClass = classComparisonData.length > 0 ? classComparisonData[0] : null;

    return {
      total,
      hadir,
      terlambat,
      sakit,
      izin,
      alpa,
      totalHadir,
      persentase,
      hariEfektif,
      bestClass,
    };
  }, [classFilteredAbsensi, selectedMonth, classComparisonData]);

  // Cetak Dokumen Laporan Tren
  const handlePrint = () => {
    window.print();
  };

  // Ekspor Data Rekap ke CSV
  const handleExportCSV = () => {
    const header = [
      'Bulan',
      'Kelas',
      'Hadir',
      'Terlambat',
      'Sakit',
      'Izin',
      'Alpa',
      'Total Presensi',
      'Persentase Kehadiran (%)',
    ];
    const rows: string[][] = [];

    classComparisonData.forEach((c) => {
      rows.push([
        selectedMonth,
        c.namaKelas,
        String(c.Hadir),
        String(c.Terlambat),
        String(c.Sakit),
        String(c.Izin),
        String(c.Alpa),
        String(c.Total),
        `${c.PersenHadir}%`,
      ]);
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [header.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `tren_absensi_${selectedMonth}_${selectedKelas}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedMonthLabel =
    availableMonths.find((m) => m.key === selectedMonth)?.label || selectedMonth;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* HEADER DASBOR */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold tracking-wide">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>VISUALISASI STATISTIK KEHADIRAN (RECHARTS)</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
              Dasbor Tren Absensi Bulanan Siswa
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Pantau perkembangan tingkat kedisiplinan dan rekap kehadiran siswa per bulan
              secara menyeluruh dengan diagram batang interaktif, komparasi rombel, dan analisis harian.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            {onNavigateToRiwayat && (
              <button
                type="button"
                onClick={onNavigateToRiwayat}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15 flex items-center gap-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Buka Riwayat Absensi</span>
              </button>
            )}

            {onNavigateToScanner && (
              <button
                type="button"
                onClick={onNavigateToScanner}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-2 cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                <span>Buka Pemindai Barcode</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              title="Unduh data dalam format CSV / Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Ekspor CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              title="Cetak Laporan Dasbor"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTER & KONTROL INTERAKTIF */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {/* Pemilih Bulan Fokus */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Bulan:</span>
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label} {m.key === '2026-09' ? '★ (September 2026)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Pemilih Rombel / Kelas */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <School className="w-4 h-4 text-emerald-600" />
              <span>Kelas:</span>
            </span>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="Semua">Semua Rombel / Kelas</option>
              {availableKelasList.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Preset: Tombol Langsung September 2026 */}
          <button
            type="button"
            onClick={() => {
              setSelectedMonth('2026-09');
              setSelectedKelas('Semua');
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              selectedMonth === '2026-09' && selectedKelas === 'Semua'
                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            ★ Fokus September 2026
          </button>
        </div>

        {/* Granularity & Chart Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tampilan Granularitas */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setGranularity('monthly')}
              className={`px-3 py-1 rounded-lg transition-all ${
                granularity === 'monthly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tren Bulanan
            </button>
            <button
              type="button"
              onClick={() => setGranularity('daily')}
              className={`px-3 py-1 rounded-lg transition-all ${
                granularity === 'daily'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Harian {selectedMonthLabel.split(' ')[0]}
            </button>
          </div>

          {/* Mode Tampilan Grafik Batang */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setChartMode('stacked')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                chartMode === 'stacked'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grafik Batang Bertumpuk (Jumlah Siswa)"
            >
              Bertumpuk
            </button>
            <button
              type="button"
              onClick={() => setChartMode('grouped')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                chartMode === 'grouped'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grafik Multi-Batang (Terpisah)"
            >
              Kelompok
            </button>
            <button
              type="button"
              onClick={() => setChartMode('percent')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                chartMode === 'percent'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Persentase Kehadiran (%)"
            >
              % Persentase
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS PADA BULAN TERPILIH */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Persentase Kehadiran */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tingkat Kehadiran</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {selectedMonthSummary.persentase}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                selectedMonthSummary.persentase >= 90
                  ? 'bg-emerald-500'
                  : selectedMonthSummary.persentase >= 75
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, selectedMonthSummary.persentase)}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-slate-500 block font-medium">
            {selectedMonthLabel}
          </span>
        </div>

        {/* Card 2: Total Hadir Tepat Waktu */}
        <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Hadir Tepat Waktu</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-900">
            {selectedMonthSummary.hadir.toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-emerald-700 font-medium">
            Sesi presensi tercatat
          </p>
        </div>

        {/* Card 3: Terlambat */}
        <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Terlambat</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-900">
            {selectedMonthSummary.terlambat.toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-amber-700 font-medium">
            Terlambat masuk sekolah
          </p>
        </div>

        {/* Card 4: Sakit */}
        <div className="bg-sky-50/70 rounded-2xl p-4 border border-sky-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-sky-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Sakit (Surat)</span>
            <HelpCircle className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-sky-900">
            {selectedMonthSummary.sakit.toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-sky-700 font-medium">
            Dengan surat dokter / ortu
          </p>
        </div>

        {/* Card 5: Izin */}
        <div className="bg-indigo-50/70 rounded-2xl p-4 border border-indigo-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Izin Resmi</span>
            <AlertTriangle className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-900">
            {selectedMonthSummary.izin.toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-indigo-700 font-medium">
            Keperluan keluarga / izin
          </p>
        </div>

        {/* Card 6: Alpa / Tanpa Keterangan */}
        <div className="bg-rose-50/70 rounded-2xl p-4 border border-rose-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Alpa / Tanpa Kabar</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-900">
            {selectedMonthSummary.alpa.toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-rose-700 font-medium">
            Tidak ada konfirmasi
          </p>
        </div>
      </div>

      {/* INFORMASI HARI EFEKTIF DAN STATUS DATA SEPTEMBER 2026 */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-950">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-emerald-900 flex items-center gap-2">
              <span>Status Presensi Bulan {selectedMonthLabel}:</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-black uppercase">
                {selectedMonthSummary.hariEfektif} Hari KBM Efektif
              </span>
            </h4>
            <p className="text-xs text-emerald-800">
              {selectedMonth === '2026-09'
                ? 'Data kehadiran 22 hari sekolah aktif September 2026 (Senin s.d. Jumat) tersimpan lengkap & sinkron di seluruh rombel.'
                : `Total ${selectedMonthSummary.total.toLocaleString('id-ID')} rekaman kehadiran tercatat pada periode ini.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-emerald-900">
            {selectedMonthSummary.bestClass ? (
              <>
                Rombel Paling Disiplin:{' '}
                <span className="underline decoration-emerald-500 font-black">
                  {selectedMonthSummary.bestClass.namaKelas} (
                  {selectedMonthSummary.bestClass.PersenHadir}%)
                </span>
              </>
            ) : null}
          </span>
        </div>
      </div>

      {/* GRAFIK UTAMA: TREN ABSENSI BULANAN DENGAN RECHARTS */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <span>
                {granularity === 'monthly'
                  ? 'Grafik Batang Tren Kehadiran Siswa Per Bulan'
                  : `Grafik Batang Kehadiran Harian Siswa (${selectedMonthLabel})`}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              {granularity === 'monthly'
                ? `Visualisasi kehadiran akumulatif bulanan (Rombel: ${selectedKelas})`
                : `Visualisasi kehadiran per hari sekolah aktif di bulan ${selectedMonthLabel}`}
            </p>
          </div>

          {/* Mode Legend Quick Indicator */}
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500"></span> Hadir
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-500"></span> Terlambat
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-sky-500"></span> Sakit
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-indigo-500"></span> Izin
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-500"></span> Alpa
            </span>
          </div>
        </div>

        {/* CONTAINER GRAFIK RECHARTS */}
        <div className="w-full h-80 sm:h-96 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'percent' ? (
              // Mode Persentase Kehadiran (%)
              <BarChart
                data={activeChartData}
                margin={{ top: 20, right: 20, left: -10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white rounded-xl p-3 shadow-xl text-xs space-y-1.5 border border-slate-700">
                          <p className="font-bold border-b border-slate-700 pb-1 text-slate-200">
                            {data.sublabel}
                          </p>
                          <div className="flex justify-between gap-4">
                            <span className="text-emerald-400 font-bold">Tingkat Hadir:</span>
                            <span className="font-black">{data.PersenHadir}%</span>
                          </div>
                          <div className="flex justify-between gap-4 text-slate-300">
                            <span>Total Hadir:</span>
                            <span>{data.Hadir + data.Terlambat} siswa</span>
                          </div>
                          <div className="flex justify-between gap-4 text-slate-400">
                            <span>Total Ketidakhadiran:</span>
                            <span>{data.Sakit + data.Izin + data.Alpa} siswa</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={85} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Target 85%', fill: '#10b981', fontSize: 10 }} />
                <Bar
                  dataKey="PersenHadir"
                  name="Persentase Kehadiran (%)"
                  radius={[8, 8, 0, 0]}
                >
                  {activeChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.PersenHadir >= 90
                          ? '#10b981'
                          : entry.PersenHadir >= 75
                          ? '#f59e0b'
                          : '#f43f5e'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              // Mode Batang Jumlah (Stacked atau Grouped)
              <BarChart
                data={activeChartData}
                margin={{ top: 20, right: 20, left: -10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white rounded-xl p-3 shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-[190px]">
                          <p className="font-extrabold border-b border-slate-700 pb-1 text-slate-200">
                            {data.sublabel}
                          </p>
                          <div className="flex justify-between gap-3 text-emerald-400">
                            <span>Hadir Tepat Waktu:</span>
                            <span className="font-black">{data.Hadir}</span>
                          </div>
                          <div className="flex justify-between gap-3 text-amber-400">
                            <span>Terlambat:</span>
                            <span className="font-black">{data.Terlambat}</span>
                          </div>
                          <div className="flex justify-between gap-3 text-sky-400">
                            <span>Sakit:</span>
                            <span className="font-black">{data.Sakit}</span>
                          </div>
                          <div className="flex justify-between gap-3 text-indigo-400">
                            <span>Izin:</span>
                            <span className="font-black">{data.Izin}</span>
                          </div>
                          <div className="flex justify-between gap-3 text-rose-400">
                            <span>Alpa:</span>
                            <span className="font-black">{data.Alpa}</span>
                          </div>
                          <div className="border-t border-slate-700 pt-1 flex justify-between font-bold text-slate-200">
                            <span>Tingkat Kehadiran:</span>
                            <span className="text-emerald-300">{data.PersenHadir}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 10, fontSize: 11 }}
                  formatter={(value) => <span className="text-slate-700 font-semibold">{value}</span>}
                />
                <Bar
                  dataKey="Hadir"
                  name="Hadir"
                  stackId={chartMode === 'stacked' ? 'a' : undefined}
                  fill="#10b981"
                  radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                />
                <Bar
                  dataKey="Terlambat"
                  name="Terlambat"
                  stackId={chartMode === 'stacked' ? 'a' : undefined}
                  fill="#f59e0b"
                  radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                />
                <Bar
                  dataKey="Sakit"
                  name="Sakit"
                  stackId={chartMode === 'stacked' ? 'a' : undefined}
                  fill="#0ea5e9"
                  radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                />
                <Bar
                  dataKey="Izin"
                  name="Izin"
                  stackId={chartMode === 'stacked' ? 'a' : undefined}
                  fill="#6366f1"
                  radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                />
                <Bar
                  dataKey="Alpa"
                  name="Alpa"
                  stackId={chartMode === 'stacked' ? 'a' : undefined}
                  fill="#f43f5e"
                  radius={chartMode === 'stacked' ? [6, 6, 0, 0] : [6, 6, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRAFIK 2 & TABEL: KOMPARASI KEHADIRAN ANTAR KELAS (ROMBEL) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Grafik Komparasi Rombel */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <School className="w-4 h-4 text-emerald-600" />
                <span>Perbandingan Kehadiran Antar Rombel ({selectedMonthLabel})</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Peringkat persentase kehadiran setiap kelas pada bulan yang dipilih
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              {classComparisonData.length} Rombel
            </span>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={classComparisonData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <YAxis
                  dataKey="namaKelas"
                  type="category"
                  tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                  width={110}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white rounded-xl p-3 shadow-xl text-xs space-y-1 border border-slate-700">
                          <p className="font-extrabold text-emerald-400">{d.namaKelas}</p>
                          <div className="flex justify-between gap-3">
                            <span>Tingkat Hadir:</span>
                            <span className="font-black">{d.PersenHadir}%</span>
                          </div>
                          <div className="flex justify-between gap-3 text-slate-300">
                            <span>Hadir Tepat Waktu:</span>
                            <span>{d.Hadir}</span>
                          </div>
                          <div className="flex justify-between gap-3 text-slate-300">
                            <span>Terlambat:</span>
                            <span>{d.Terlambat}</span>
                          </div>
                          <div className="flex justify-between gap-3 text-slate-400">
                            <span>Sakit / Izin / Alpa:</span>
                            <span>{d.Sakit + d.Izin + d.Alpa}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="PersenHadir"
                  name="Kehadiran (%)"
                  radius={[0, 8, 8, 0]}
                >
                  {classComparisonData.map((entry, index) => (
                    <Cell
                      key={`comp-cell-${index}`}
                      fill={
                        entry.PersenHadir >= 95
                          ? '#059669'
                          : entry.PersenHadir >= 85
                          ? '#10b981'
                          : entry.PersenHadir >= 75
                          ? '#f59e0b'
                          : '#f43f5e'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabel Ringkasan Rombel */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Rekapitulasi & Kinerja Kelas</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-400">{selectedMonthLabel}</span>
          </div>

          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="py-2 px-2.5 rounded-l-lg">Rombel</th>
                  <th className="py-2 px-1 text-center">H</th>
                  <th className="py-2 px-1 text-center">T</th>
                  <th className="py-2 px-1 text-center">S/I/A</th>
                  <th className="py-2 px-2.5 text-right rounded-r-lg">Persentase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {classComparisonData.map((row, idx) => {
                  const isTop = idx === 0 && row.Total > 0;
                  return (
                    <tr
                      key={row.namaKelas}
                      className={`hover:bg-slate-50 transition-colors ${
                        isTop ? 'bg-emerald-50/50' : ''
                      }`}
                    >
                      <td className="py-2 px-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                        {isTop && <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        <span>{row.namaKelas}</span>
                      </td>
                      <td className="py-2 px-1 text-center text-emerald-700 font-bold">
                        {row.Hadir}
                      </td>
                      <td className="py-2 px-1 text-center text-amber-700">
                        {row.Terlambat}
                      </td>
                      <td className="py-2 px-1 text-center text-slate-500">
                        {row.Sakit + row.Izin + row.Alpa}
                      </td>
                      <td className="py-2 px-2.5 text-right font-black">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[11px] ${
                            row.PersenHadir >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : row.PersenHadir >= 75
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {row.PersenHadir}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
