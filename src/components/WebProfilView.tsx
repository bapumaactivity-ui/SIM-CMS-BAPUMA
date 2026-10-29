import React, { useState } from 'react';
import { KontenWeb, SchoolInfo, FormulirPPDB } from '../types';
import { SCHOOL_INFO, INITIAL_GELOMBANG } from '../data/initialData';
import { calculatePPDBQuota } from '../utils/ppdbQuota';
import { 
  Building2, 
  Stethoscope, 
  Pill, 
  Sparkles, 
  Hotel, 
  Calendar, 
  User, 
  Video, 
  ChevronRight, 
  CheckCircle2, 
  Award, 
  ArrowRight,
  ShieldCheck,
  PlayCircle,
  ExternalLink,
  LogIn,
  MapPin,
  Phone,
  Mail,
  GraduationCap,
  Clock,
  Gift,
  Tag,
  CalendarCheck
} from 'lucide-react';

interface WebProfilViewProps {
  kontenList: KontenWeb[];
  formulirList?: FormulirPPDB[];
  onNavigateToPPDB: () => void;
  onNavigateToCAT: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToGuru?: () => void;
  schoolInfo?: SchoolInfo;
}

export const WebProfilView: React.FC<WebProfilViewProps> = ({
  kontenList,
  formulirList = [],
  onNavigateToPPDB,
  onNavigateToCAT,
  onNavigateToLogin,
  onNavigateToGuru,
  schoolInfo,
}) => {
  const currentSchool = schoolInfo || SCHOOL_INFO;
  const schoolName = currentSchool.namaSekolah || currentSchool.nama || 'SMK Bakti Putra Mandiri';
  const schoolLogo = currentSchool.logoUrl || currentSchool.logoKiriUrl || currentSchool.logoSekolah || '/logo_bpm.png';
  const [selectedKategori, setSelectedKategori] = useState<string>('Semua');
  const [activeArticle, setActiveArticle] = useState<KontenWeb | null>(null);

  const quotaSummary = calculatePPDBQuota(currentSchool, formulirList);

  const kategoriList = ['Semua', 'Berita', 'Pengumuman', 'Fasilitas', 'Prestasi'];

  const filteredKonten = selectedKategori === 'Semua' 
    ? kontenList 
    : kontenList.filter(k => k.kategori === selectedKategori);

  const kuotaFarmasi = Number(
    currentSchool.kuotaJurusan?.farmasi ?? 
    currentSchool.kuotaPerJurusan?.farmasi ?? 
    72
  );
  const kuotaKeperawatan = Number(
    currentSchool.kuotaJurusan?.keperawatan ?? 
    currentSchool.kuotaPerJurusan?.asistenKeperawatan ?? 
    72
  );
  const kuotaKecantikan = Number(
    currentSchool.kuotaJurusan?.kecantikan ?? 
    currentSchool.kuotaPerJurusan?.tataKecantikan ?? 
    36
  );
  const kuotaPerhotelan = Number(
    currentSchool.kuotaJurusan?.perhotelan ?? 
    currentSchool.kuotaPerJurusan?.perhotelan ?? 
    36
  );
  const totalKuota = currentSchool.kuotaSPMB || (kuotaFarmasi + kuotaKeperawatan + kuotaKecantikan + kuotaPerhotelan);

  // Custom kejuruan list details if defined by admin
  const getJurusanInfo = (key: string) => {
    const kLower = key.toLowerCase();
    return currentSchool.kejuruanList?.find(k => {
      const nama = (k.nama || '').toLowerCase();
      const kode = (k.kode || '').toLowerCase();
      const singkatan = (k.singkatan || '').toLowerCase();
      const id = (k.id || '').toLowerCase();
      const slug = ((k as any).slug || '').toLowerCase();
      return (
        slug === kLower ||
        id === kLower ||
        nama.includes(kLower) ||
        kode.includes(kLower) ||
        singkatan.includes(kLower)
      );
    });
  };
  const customFarmasi = getJurusanInfo('farmasi');
  const customKeperawatan = getJurusanInfo('perawat');
  const customKecantikan = getJurusanInfo('cantik');
  const customPerhotelan = getJurusanInfo('hotel');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-0 flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white overflow-hidden py-16 sm:py-24 border-b border-emerald-900/40">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold tracking-wide">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>SMK PUSAT KEUNGGULAN RUMPUN KESEHATAN & VOKASI BOGOR</span>
              </div>
              
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                {currentSchool.namaLengkap || currentSchool.nama}
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                {currentSchool.subSlogan || currentSchool.slogan || 'Mencetak tenaga kesehatan dan vokasi berstandar industri dengan fasilitas laboratorium terpadu: Apotek Simulasi Farmasi, Bangsal Mini Rumah Sakit, Klinik Estetika Kulit & Spa, serta Mockup Hotel Room.'}
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={onNavigateToPPDB}
                  className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2.5 transition-all transform hover:-translate-y-0.5"
                >
                  <span>Daftar SPMB Online {currentSchool.tahunAjaranSPMB || '2026/2027'}</span>
                  <span className="text-xs bg-black/25 px-2.5 py-0.5 rounded-full font-bold text-amber-300">
                    Sisa: {quotaSummary.totalSisa} Kursi
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {onNavigateToGuru && (
                  <button
                    onClick={onNavigateToGuru}
                    className="px-5 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                    title="Buka Portal Dewan Guru & Jurnal Absen Mengajar"
                  >
                    <GraduationCap className="w-4 h-4 text-blue-200" />
                    <span>Portal Guru & Absen Mengajar</span>
                  </button>
                )}

                {onNavigateToLogin && (
                  <button
                    onClick={onNavigateToLogin}
                    className="px-5 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-slate-950" />
                    <span>Login SIM Sekolah</span>
                  </button>
                )}
              </div>

              {/* Badges / Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800">
                <div>
                  <div className="text-2xl font-bold text-teal-400">
                    {currentSchool.kejuruanList?.length || 4}
                  </div>
                  <div className="text-xs text-slate-400">Program Kejuruan</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-teal-400">
                    {currentSchool.mitraIndustri?.length ? `${currentSchool.mitraIndustri.length}+` : '35+'}
                  </div>
                  <div className="text-xs text-slate-400">Mitra RS & Industri</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-teal-400">
                    {currentSchool.tracerLulusan?.persenBekerja ? `${currentSchool.tracerLulusan.persenBekerja}%` : '94%'}
                  </div>
                  <div className="text-xs text-slate-400">Lulusan Terserap</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-teal-400">{currentSchool.akreditasi || 'A (Unggul)'}</div>
                  <div className="text-xs text-slate-400">Akreditasi BAN-SM</div>
                </div>
              </div>
            </div>

            {/* Visual Hero Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-800">
                <img 
                  src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80" 
                  alt="Laboratorium Kesehatan" 
                  className="w-full h-72 object-cover"
                />
                <div className="p-5 bg-slate-900/95 space-y-3">
                  <div className="flex items-center justify-between text-xs text-teal-300 font-semibold">
                    <span>Laboratorium Simulasi Rumah Sakit</span>
                    <span className="px-2 py-0.5 rounded bg-teal-900/80 text-teal-300">Terstandar</span>
                  </div>
                  <h3 className="font-bold text-white text-base">
                    Simulasi Asuhan Klinis & Peracikan Obat Presisi
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Siswa dilatih langsung menggunakan laminar air flow, autoklaf uap medis bertekanan, dan pemantauan hemodinamik pasien pasca-operasi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Program Keahlian Unggulan */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
          <div className="text-xs font-bold uppercase tracking-widest text-teal-600">
            Kompetensi Keahlian
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            4 Pilihan Jurusan Masa Depan Berprospek Cerah
          </h2>
          <p className="text-sm text-slate-600">
            Kurikulum berbasis Teaching Factory dan uji kompetensi bersama Lembaga Sertifikasi Profesi (LSP).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Jurusan 1: Farmasi */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Pill className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 text-[10px] font-extrabold uppercase tracking-wide">
                  {currentSchool.rombelJurusan?.farmasi || 2} Rombel
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {customFarmasi?.nama || 'Farmasi Klinis & Komunitas'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {customFarmasi?.deskripsi || 'Mempelajari administrasi resep dokter, skrining klinis, peracikan obat (salep, kapsul, puyer, sirup), farmakologi, dan pengujian simplisia herbal (galenika).'}
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>{customFarmasi?.fasilitasLab || 'Laboratorium Apotek & Kimia Terpadu'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Sertifikasi Tenaga Asisten Apoteker</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>{customFarmasi?.prospekKerja || 'Peluang Kerja di Apotek, RS, & Industri Obat'}</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-600">
              <span>Sisa Kuota: <strong>{quotaSummary.jurusan.farmasi.sisa}</strong> / {quotaSummary.jurusan.farmasi.kapasitas} Kursi</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Jurusan 2: Keperawatan */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 text-[10px] font-extrabold uppercase tracking-wide">
                  {currentSchool.rombelJurusan?.keperawatan || 2} Rombel
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {customKeperawatan?.nama || 'Asisten Keperawatan'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {customKeperawatan?.deskripsi || 'Fokus pada pemenuhan kebutuhan dasar manusia (oksigenasi, nutrisi, eliminasi, personal hygiene), pengukuran Tanda-Tanda Vital (TTV), dan komunikasi terapeutik.'}
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                  <span>{customKeperawatan?.fasilitasLab || 'Bangsal Mini RS & Manekin Interaktif'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                  <span>Magang RSUD & Puskesmas Terkemuka</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                  <span>{customKeperawatan?.prospekKerja || 'Kesiapan Caregiver Nasional & Global'}</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-sky-600">
              <span>Sisa Kuota: <strong>{quotaSummary.jurusan.keperawatan.sisa}</strong> / {quotaSummary.jurusan.keperawatan.kapasitas} Kursi</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Jurusan 3: Tata Kecantikan */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-pink-100 text-pink-800 text-[10px] font-extrabold uppercase tracking-wide">
                  {currentSchool.rombelJurusan?.kecantikan || 1} Rombel
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {customKecantikan?.nama || 'Tata Kecantikan & Spa'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {customKecantikan?.deskripsi || 'Menguasai perawatan kulit wajah dan tubuh (facial, body massage, lulur aroma terapi), tata rias kecantikan (Make Up Artist), hair styling, dan manajemen salon estetika.'}
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-pink-600" />
                  <span>{customKecantikan?.fasilitasLab || 'Studio Spa & Alat Facial Modern'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-pink-600" />
                  <span>Kerjasama Brand Kosmetik & Klinik Estetika</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-pink-600" />
                  <span>{customKecantikan?.prospekKerja || 'Kewirausahaan Beauty Preneur Mandiri'}</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-pink-600">
              <span>Sisa Kuota: <strong>{quotaSummary.jurusan.kecantikan.sisa}</strong> / {quotaSummary.jurusan.kecantikan.kapasitas} Kursi</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Jurusan 4: Perhotelan */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Hotel className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase tracking-wide">
                  {currentSchool.rombelJurusan?.perhotelan || 1} Rombel
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {customPerhotelan?.nama || 'Perhotelan'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {customPerhotelan?.deskripsi || 'Membekali keahlian operasional kantor depan (Front Office), tata graha (Housekeeping), tata hidang (Food & Beverage Service), serta standar hospitalitas internasional.'}
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>{customPerhotelan?.fasilitasLab || 'Mockup Kamar Hotel Bintang 4'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Bahasa Asing Terapan (Inggris & Jepang)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>{customPerhotelan?.prospekKerja || 'Penyaluran Magang ke Jaringan Hotel Ternama'}</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-amber-600">
              <span>Sisa Kuota: <strong>{quotaSummary.jurusan.perhotelan.sisa}</strong> / {quotaSummary.jurusan.perhotelan.kapasitas} Kursi</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </section>

      {/* Jadwal & Periode Gelombang SPMB Online Terkini (Real-time dari Admin Pengaturan) */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white py-16 px-4 sm:px-6 lg:px-8 border-y border-slate-800">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                <span>SPMB Online T.A. {currentSchool.tahunAjaranSPMB || '2026/2027'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Jadwal & Jalur Gelombang Pendaftaran
              </h2>
              <p className="text-sm text-slate-400 max-w-2xl">
                Pilih gelombang pendaftaran yang sedang aktif untuk memperoleh subsidi pembiayaan dan beasiswa minat bakat.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Gelombang Resmi Aktif:</div>
                <div className="font-bold text-amber-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{currentSchool.gelombangSPMB || 'Gelombang 1'}</span>
                </div>
              </div>

              <button
                onClick={onNavigateToPPDB}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg hover:shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <span>Daftar Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grid Gelombang Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(currentSchool.gelombangList && currentSchool.gelombangList.length > 0 
              ? currentSchool.gelombangList 
              : INITIAL_GELOMBANG
            ).map((gel, idx) => {
              const isActive = (currentSchool.gelombangSPMB || '').toLowerCase() === gel.nama.toLowerCase() ||
                (currentSchool.gelombangSPMB || '').includes(`Gelombang ${gel.nomor}`);

              return (
                <div
                  key={gel.id || idx}
                  className={`relative rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between ${
                    isActive
                      ? 'bg-gradient-to-b from-slate-800 to-slate-850 border-2 border-emerald-500 shadow-xl shadow-emerald-950/40 ring-2 ring-emerald-500/20'
                      : 'bg-slate-800/60 border border-slate-700/70 hover:border-slate-600'
                  }`}
                >
                  {/* Top Badge: Active / Status */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Jalur {gel.nomor}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isActive && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-extrabold text-[10px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>SEDANG DIBUKA</span>
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        gel.status === 'Buka'
                          ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                          : gel.status === 'Segera Dibuka'
                          ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
                          : 'bg-slate-700 text-slate-400 border border-slate-600'
                      }`}>
                        {gel.status}
                      </span>
                    </div>
                  </div>

                  {/* Title & Dates */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {gel.nama}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-700/50">
                      <Calendar className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>{gel.tanggalMulai} s/d {gel.tanggalSelesai}</span>
                    </div>

                    {gel.keterangan && (
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {gel.keterangan}
                      </p>
                    )}

                    {/* Financial Perks & Fees */}
                    <div className="pt-3 border-t border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-slate-500" />
                          <span>Biaya Registrasi:</span>
                        </span>
                        <span className="font-bold text-emerald-400">
                          {gel.biayaPendaftaran === 0 ? 'Gratis (Rp 0)' : `Rp ${(gel.biayaPendaftaran ?? 0).toLocaleString('id-ID')}`}
                        </span>
                      </div>

                      {gel.diskonDSP && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Gift className="w-3.5 h-3.5 text-amber-400" />
                            <span>Keringanan DSP:</span>
                          </span>
                          <span className="font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-800/60 text-[11px]">
                            {gel.diskonDSP}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Button Action */}
                  <div className="mt-6 pt-4 border-t border-slate-700/60">
                    <button
                      onClick={onNavigateToPPDB}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                      }`}
                    >
                      <span>{isActive ? 'Daftar di Gelombang Ini' : 'Lihat Formulir Pendaftaran'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CMS Berita & Artikel Terpadu (Teks, Foto, Video) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-teal-600">
              Warta & Informasi Sekolah
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Kabar Terbaru & Dokumentasi Kegiatan
            </h2>
          </div>

          {/* Kategori Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-slate-200/70 p-1 rounded-xl">
            {kategoriList.map(kat => (
              <button
                key={kat}
                onClick={() => setSelectedKategori(kat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedKategori === kat
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {kat}
              </button>
            ))}
          </div>
        </div>

        {/* Konten Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredKonten.map(item => (
            <article 
              key={item.id}
              onClick={() => setActiveArticle(item)}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                {/* Media Thumbnail */}
                <div className="relative h-48 bg-slate-100 overflow-hidden">
                  {item.gambarUrl ? (
                    <img 
                      src={item.gambarUrl} 
                      alt={item.judul}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                      <Building2 className="w-12 h-12" />
                    </div>
                  )}

                  {item.videoUrl && (
                    <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/70 backdrop-blur text-white text-[11px] font-medium flex items-center gap-1">
                      <Video className="w-3.5 h-3.5 text-teal-400" />
                      <span>Video</span>
                    </div>
                  )}

                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-teal-600 text-white text-[11px] font-semibold tracking-wide shadow-sm">
                    {item.kategori}
                  </div>
                </div>

                <div className="p-5 space-y-2.5">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {item.tanggalPost}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {item.penulis}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base group-hover:text-teal-600 transition-colors line-clamp-2">
                    {item.judul}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {item.ringkasan}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-2 text-xs font-semibold text-teal-600 flex items-center gap-1">
                <span>Baca Selengkapnya</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Footer Sekolah SMK Bakti Putra Mandiri */}
      <footer className="mt-auto bg-slate-900 text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* School Profile Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shadow-md">
                  <img 
                    src={currentSchool.logoUrl || SCHOOL_INFO.logoUrl} 
                    alt={currentSchool.nama} 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-base text-white">{currentSchool.nama}</h4>
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                    Akreditasi {currentSchool.akreditasi} • Rumpun Kesehatan & Vokasi
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Lembaga pendidikan kejuruan berfokus pada keahlian vokasi unggul, kompetensi siap kerja industri, serta integritas moral dan budi pekerti.
              </p>
            </div>

            {/* Address & Contact */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider text-emerald-400">
                Alamat & Kontak
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <a
                    href={currentSchool.lokasiSekolah?.mapsUrl || 'https://maps.app.goo.gl/845UtAVRFmNoEVvSA'}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-emerald-300 transition-colors underline decoration-slate-600 hover:decoration-emerald-400"
                    title="Buka titik lokasi SMK Bakti Putra Mandiri di Google Maps"
                  >
                    {currentSchool.alamatLengkap || currentSchool.alamat} (Buka Google Maps ↗)
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{currentSchool.telepon}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{currentSchool.email}</span>
                </li>
              </ul>
            </div>

            {/* Kompetensi Keahlian */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider text-emerald-400">
                Program Keahlian
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Farmasi Klinis & Komunitas</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Asisten Keperawatan & Caregiver</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tata Kecantikan Kulit & Rambut</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Hotel className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Perhotelan & Akomodasi</span>
                </li>
              </ul>
            </div>

            {/* Portal Akses Cepat */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider text-emerald-400">
                Portal Civitas
              </h4>
              <div className="flex flex-col gap-2">
                {onNavigateToGuru && (
                  <button
                    onClick={onNavigateToGuru}
                    className="w-full py-2 px-3 rounded-lg bg-blue-700/80 hover:bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-blue-200" />
                    <span>Portal Guru & Absen Mengajar</span>
                  </button>
                )}
                {onNavigateToLogin && (
                  <button
                    onClick={onNavigateToLogin}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Login Semua Pengguna</span>
                  </button>
                )}
                <button
                  onClick={onNavigateToPPDB}
                  className="w-full py-2 px-3 rounded-lg bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 border border-purple-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Daftar Calon Siswa Baru</span>
                </button>
                <button
                  onClick={onNavigateToCAT}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Sistem Ujian CAT</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <p>© 2026 {currentSchool.nama}. Hak Cipta Dilindungi.</p>
            <p className="text-slate-400">
              Desa Kabasiran, Kec. Parung Panjang, Kab. Bogor, Jawa Barat.
            </p>
          </div>
        </div>
      </footer>

      {/* Article Detail Modal */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Image Header */}
            {activeArticle.gambarUrl && (
              <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-slate-900">
                <img 
                  src={activeArticle.gambarUrl} 
                  alt={activeArticle.judul} 
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setActiveArticle(null)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center text-lg font-bold"
                >
                  ✕
                </button>
                <div className="absolute bottom-4 left-4 px-3 py-1 rounded-md bg-teal-600 text-white text-xs font-semibold">
                  {activeArticle.kategori}
                </div>
              </div>
            )}

            <div className="p-6 sm:p-8 space-y-4">
              {!activeArticle.gambarUrl && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="px-3 py-1 rounded bg-teal-100 text-teal-700 text-xs font-semibold">
                    {activeArticle.kategori}
                  </span>
                  <button
                    onClick={() => setActiveArticle(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕ Tutup
                  </button>
                </div>
              )}

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                {activeArticle.judul}
              </h2>

              <div className="flex items-center gap-3 text-xs text-slate-500 pb-3 border-b border-slate-100">
                <span>Diterbitkan: {activeArticle.tanggalPost}</span>
                <span>•</span>
                <span>Oleh: {activeArticle.penulis}</span>
              </div>

              {/* Video preview / embed if available */}
              {activeArticle.videoUrl && (
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-teal-400 flex items-center gap-1.5">
                      <PlayCircle className="w-4 h-4" />
                      Dokumentasi Video Tersedia
                    </span>
                    <a 
                      href={activeArticle.videoUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs text-teal-300 hover:underline flex items-center gap-1"
                    >
                      Buka Tautan Video <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {activeArticle.videoUrl}
                  </p>
                </div>
              )}

              <div className="text-sm text-slate-700 leading-relaxed space-y-3 whitespace-pre-line pt-2">
                {activeArticle.isiTulisan}
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setActiveArticle(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700"
                >
                  Tutup Artikel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
