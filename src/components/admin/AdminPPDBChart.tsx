import React, { useState, useMemo } from 'react';
import { FormulirPPDB, SchoolInfo } from '../../types';
import { calculatePPDBQuota } from '../../utils/ppdbQuota';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  Filter,
  Layers,
  GraduationCap
} from 'lucide-react';

interface AdminPPDBChartProps {
  formulirList: FormulirPPDB[];
  schoolInfo?: SchoolInfo;
  className?: string;
}

const JURUSAN_COLORS: Record<string, { main: string; light: string; border: string; bg: string }> = {
  farmasi: {
    main: '#059669', // Emerald
    light: '#10b981',
    border: '#a7f3d0',
    bg: '#ecfdf5',
  },
  keperawatan: {
    main: '#2563eb', // Blue
    light: '#3b82f6',
    border: '#bfdbfe',
    bg: '#eff6ff',
  },
  kecantikan: {
    main: '#db2777', // Pink/Rose
    light: '#ec4899',
    border: '#fbcfe8',
    bg: '#fdf2f8',
  },
  perhotelan: {
    main: '#d97706', // Amber/Orange
    light: '#f59e0b',
    border: '#fde68a',
    bg: '#fffbeb',
  },
  lainnya: {
    main: '#6366f1', // Indigo
    light: '#818cf8',
    border: '#c7d2fe',
    bg: '#eef2ff',
  }
};

export const AdminPPDBChart: React.FC<AdminPPDBChartProps> = ({
  formulirList,
  schoolInfo,
  className = '',
}) => {
  const [chartMode, setChartMode] = useState<'kumulatif' | 'harian'>('kumulatif');
  const [selectedJurusanFilter, setSelectedJurusanFilter] = useState<string>('semua');

  const quotaSummary = useMemo(() => {
    return calculatePPDBQuota(schoolInfo, formulirList);
  }, [schoolInfo, formulirList]);

  // Normalize Jurusan Name to category key
  const categorizeJurusan = (jurusanStr: string = ''): 'farmasi' | 'keperawatan' | 'kecantikan' | 'perhotelan' | 'lainnya' => {
    const s = jurusanStr.toLowerCase();
    if (s.includes('farmasi')) return 'farmasi';
    if (s.includes('perawat') || s.includes('keperawatan')) return 'keperawatan';
    if (s.includes('cantik') || s.includes('kecantikan') || s.includes('spa')) return 'kecantikan';
    if (s.includes('hotel') || s.includes('perhotelan') || s.includes('hospitality')) return 'perhotelan';
    return 'lainnya';
  };

  // Group applicants by Date and calculate Daily + Cumulative Trends
  const trendData = useMemo(() => {
    if (!formulirList || formulirList.length === 0) {
      return [];
    }

    // Map each form to date string (YYYY-MM-DD)
    const dateMap: Record<string, { farmasi: number; keperawatan: number; kecantikan: number; perhotelan: number; total: number }> = {};

    formulirList.forEach((form) => {
      let rawDate = form.tanggalDaftar || '';
      let dateKey = '2026-09-01'; // Fallback default
      
      if (rawDate) {
        // e.g. "2026-09-18 14:30" or "2026-09-18" or "18/09/2026"
        const clean = rawDate.split(' ')[0].trim();
        if (clean.includes('-')) {
          dateKey = clean;
        } else if (clean.includes('/')) {
          const parts = clean.split('/');
          if (parts.length === 3) {
            dateKey = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
      }

      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { farmasi: 0, keperawatan: 0, kecantikan: 0, perhotelan: 0, total: 0 };
      }

      const cat = categorizeJurusan(form.pilihanJurusan);
      if (cat === 'farmasi') dateMap[dateKey].farmasi++;
      else if (cat === 'keperawatan') dateMap[dateKey].keperawatan++;
      else if (cat === 'kecantikan') dateMap[dateKey].kecantikan++;
      else if (cat === 'perhotelan') dateMap[dateKey].perhotelan++;
      dateMap[dateKey].total++;
    });

    // Sort chronologically
    const sortedDates = Object.keys(dateMap).sort();

    let cumFarmasi = 0;
    let cumKeperawatan = 0;
    let cumKecantikan = 0;
    let cumPerhotelan = 0;
    let cumTotal = 0;

    return sortedDates.map((d) => {
      const daily = dateMap[d];
      cumFarmasi += daily.farmasi;
      cumKeperawatan += daily.keperawatan;
      cumKecantikan += daily.kecantikan;
      cumPerhotelan += daily.perhotelan;
      cumTotal += daily.total;

      // Format label e.g. "18 Sep"
      const dateParts = d.split('-');
      const label = dateParts.length === 3 
        ? `${dateParts[2]}/${dateParts[1]}` 
        : d;

      return {
        date: d,
        displayDate: label,
        // Daily counts
        harianFarmasi: daily.farmasi,
        harianKeperawatan: daily.keperawatan,
        harianKecantikan: daily.kecantikan,
        harianPerhotelan: daily.perhotelan,
        harianTotal: daily.total,
        // Cumulative counts
        kumFarmasi: cumFarmasi,
        kumKeperawatan: cumKeperawatan,
        kumKecantikan: cumKecantikan,
        kumPerhotelan: cumPerhotelan,
        kumTotal: cumTotal,
      };
    });
  }, [formulirList]);

  // Bar Chart: Comparison of Applicants vs Verified vs Quota
  const quotaComparisonData = useMemo(() => {
    const list = formulirList || [];

    const stats = {
      farmasi: { pendaftar: 0, diterima: 0, terverifikasi: 0 },
      keperawatan: { pendaftar: 0, diterima: 0, terverifikasi: 0 },
      kecantikan: { pendaftar: 0, diterima: 0, terverifikasi: 0 },
      perhotelan: { pendaftar: 0, diterima: 0, terverifikasi: 0 },
    };

    list.forEach(f => {
      const cat = categorizeJurusan(f.pilihanJurusan);
      if (stats[cat as keyof typeof stats]) {
        stats[cat as keyof typeof stats].pendaftar++;
        if (f.statusPendaftaran === 'Diterima' || f.statusKonfirmasi === 'Diterima') {
          stats[cat as keyof typeof stats].diterima++;
        }
        if (f.statusPendaftaran === 'Terverifikasi' || f.statusPendaftaran === 'Diterima') {
          stats[cat as keyof typeof stats].terverifikasi++;
        }
      }
    });

    return [
      {
        jurusan: 'Farmasi Klinis',
        key: 'farmasi',
        pendaftar: stats.farmasi.pendaftar,
        diterima: stats.farmasi.diterima,
        terverifikasi: stats.farmasi.terverifikasi,
        dayaTampung: quotaSummary.jurusan.farmasi.kapasitas,
        sisaKuota: quotaSummary.jurusan.farmasi.sisa,
      },
      {
        jurusan: 'Asisten Keperawatan',
        key: 'keperawatan',
        pendaftar: stats.keperawatan.pendaftar,
        diterima: stats.keperawatan.diterima,
        terverifikasi: stats.keperawatan.terverifikasi,
        dayaTampung: quotaSummary.jurusan.keperawatan.kapasitas,
        sisaKuota: quotaSummary.jurusan.keperawatan.sisa,
      },
      {
        jurusan: 'Tata Kecantikan & Spa',
        key: 'kecantikan',
        pendaftar: stats.kecantikan.pendaftar,
        diterima: stats.kecantikan.diterima,
        terverifikasi: stats.kecantikan.terverifikasi,
        dayaTampung: quotaSummary.jurusan.kecantikan.kapasitas,
        sisaKuota: quotaSummary.jurusan.kecantikan.sisa,
      },
      {
        jurusan: 'Perhotelan (Hospitality)',
        key: 'perhotelan',
        pendaftar: stats.perhotelan.pendaftar,
        diterima: stats.perhotelan.diterima,
        terverifikasi: stats.perhotelan.terverifikasi,
        dayaTampung: quotaSummary.jurusan.perhotelan.kapasitas,
        sisaKuota: quotaSummary.jurusan.perhotelan.sisa,
      },
    ];
  }, [formulirList, quotaSummary]);

  // Pie Chart: Distribution per Jurusan
  const pieDistributionData = useMemo(() => {
    return quotaComparisonData
      .filter(item => item.pendaftar > 0)
      .map(item => ({
        name: item.jurusan,
        value: item.pendaftar,
        color: JURUSAN_COLORS[item.key]?.main || '#6366f1',
      }));
  }, [quotaComparisonData]);

  // Status Metrics
  const statusStats = useMemo(() => {
    const list = formulirList || [];
    const total = list.length;
    const diterima = list.filter(f => f.statusPendaftaran === 'Diterima' || f.statusKonfirmasi === 'Diterima').length;
    const terverifikasi = list.filter(f => f.statusPendaftaran === 'Terverifikasi').length;
    const menunggu = list.filter(f => f.statusPendaftaran === 'Menunggu_Verifikasi').length;
    const proses = list.filter(f => f.statusPendaftaran === 'Proses_Isi').length;
    const ditolak = list.filter(f => f.statusPendaftaran === 'Ditolak').length;

    return { total, diterima, terverifikasi, menunggu, proses, ditolak };
  }, [formulirList]);

  const persentaseKeterisian = Math.round(
    quotaSummary.totalKapasitas > 0
      ? (quotaSummary.totalTerisi / quotaSummary.totalKapasitas) * 100
      : 0
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Header & Live Indicator */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">
                  Visualisasi & Analisis Tren Pendaftar SPMB
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Real-time Database
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pantau dinamika pendaftaran siswa baru, kapasitas kuota terisi, dan komparasi 4 program keahlian secara interaktif.
              </p>
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setChartMode('kumulatif')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              chartMode === 'kumulatif'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
            <span>Tren Kumulatif</span>
          </button>
          <button
            type="button"
            onClick={() => setChartMode('harian')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              chartMode === 'harian'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
            <span>Pendaftar Per Hari</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span>Total Pendaftar</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {statusStats.total}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Formulir Terdaftar</div>
        </div>

        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-800 flex items-center justify-between">
            <span>Siswa Diterima</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {statusStats.diterima}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Akun Resmi Aktif</div>
        </div>

        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200 shadow-xs">
          <div className="text-[11px] font-semibold text-blue-800 flex items-center justify-between">
            <span>Terverifikasi</span>
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 mt-1">
            {statusStats.terverifikasi}
          </div>
          <div className="text-[10px] text-blue-600 mt-0.5">Lolos Berkas</div>
        </div>

        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 shadow-xs">
          <div className="text-[11px] font-semibold text-amber-800 flex items-center justify-between">
            <span>Menunggu Seleksi</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {statusStats.menunggu}
          </div>
          <div className="text-[10px] text-amber-600 mt-0.5">Perlu Tindakan</div>
        </div>

        <div className="bg-teal-50 rounded-2xl p-4 border border-teal-200 shadow-xs">
          <div className="text-[11px] font-semibold text-teal-800 flex items-center justify-between">
            <span>Sisa Kuota SPMB</span>
            <ArrowUpRight className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-700 mt-1">
            {quotaSummary.totalSisa}
          </div>
          <div className="text-[10px] text-teal-600 mt-0.5">Dari {quotaSummary.totalKapasitas} Kuota</div>
        </div>

        <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200 shadow-xs">
          <div className="text-[11px] font-semibold text-purple-800 flex items-center justify-between">
            <span>Keterisian Kuota</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 mt-1">
            {persentaseKeterisian}%
          </div>
          <div className="w-full bg-purple-200 rounded-full h-1.5 mt-1 overflow-hidden">
            <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, persentaseKeterisian)}%` }}></div>
          </div>
        </div>
      </div>

      {/* 3. Main Chart: Recharts AreaChart (Tren Pendaftaran) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>
                Grafik Tren Pendaftaran Calon Siswa Baru ({chartMode === 'kumulatif' ? 'Pertumbuhan Kumulatif' : 'Volume Harian'})
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Grafik interaktif menunjukkan tren laju pendaftaran calon siswa per jurusan seiring waktu.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600">Farmasi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span className="text-slate-600">Keperawatan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-pink-500"></span>
              <span className="text-slate-600">Kecantikan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="text-slate-600">Perhotelan</span>
            </div>
          </div>
        </div>

        {trendData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
            <Users className="w-8 h-8 mb-2 opacity-50" />
            <span>Belum ada data pendaftar yang terdata.</span>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendData}
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorFarmasi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorKeperawatan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorKecantikan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#db2777" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#db2777" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorPerhotelan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '11px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#f59e0b', marginBottom: '4px' }}
                />
                <Area
                  type="monotone"
                  dataKey={chartMode === 'kumulatif' ? 'kumFarmasi' : 'harianFarmasi'}
                  name="Farmasi Klinis"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorFarmasi)"
                />
                <Area
                  type="monotone"
                  dataKey={chartMode === 'kumulatif' ? 'kumKeperawatan' : 'harianKeperawatan'}
                  name="Asisten Keperawatan"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorKeperawatan)"
                />
                <Area
                  type="monotone"
                  dataKey={chartMode === 'kumulatif' ? 'kumKecantikan' : 'harianKecantikan'}
                  name="Tata Kecantikan & Spa"
                  stroke="#db2777"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorKecantikan)"
                />
                <Area
                  type="monotone"
                  dataKey={chartMode === 'kumulatif' ? 'kumPerhotelan' : 'harianPerhotelan'}
                  name="Perhotelan (Hospitality)"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPerhotelan)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 4. Second Row Charts: Bar Chart (Pendaftar vs Kuota) & Pie Chart (Distribusi) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recharts BarChart (Komparasi Kuota vs Pendaftar) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>Komparasi Jumlah Pendaftar vs Daya Tampung Kuota</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Evaluasi minat peminat vs kuota resmi yang ditetapkan pihak sekolah.
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={quotaComparisonData}
                margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="jurusan"
                  tick={{ fontSize: 10, fill: '#475569' }}
                  interval={0}
                  angle={-10}
                  textAnchor="end"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                />
                <Bar dataKey="dayaTampung" name="Daya Tampung (Kuota)" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                <Bar dataKey="pendaftar" name="Total Pendaftar" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="terverifikasi" name="Terverifikasi / Diterima" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Recharts PieChart (Porsi Pendaftar per Jurusan) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              <span>Porsi Peminat per Program Keahlian</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Persentase proporsi pendaftar dari total calon siswa terdaftar.
            </p>
          </div>

          {pieDistributionData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
              <PieIcon className="w-8 h-8 mb-2 opacity-50" />
              <span>Belum ada data pendaftar.</span>
            </div>
          ) : (
            <div className="h-64 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                    formatter={(val: any, name: any) => [`${val} Siswa`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Breakdown Mini List */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            {quotaComparisonData.map(q => {
              const total = statusStats.total || 1;
              const pct = Math.round((q.pendaftar / total) * 100);
              const colorInfo = JURUSAN_COLORS[q.key] || JURUSAN_COLORS.lainnya;
              return (
                <div key={q.key} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorInfo.main }}></span>
                    <span className="text-slate-700 truncate font-medium text-[11px]">{q.jurusan}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] shrink-0">
                    <span className="font-bold text-slate-900">{q.pendaftar} siswa</span>
                    <span className="text-slate-400">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
