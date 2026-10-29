import React, { useState, useRef } from 'react';
import { User, SchoolInfo } from '../types';
import { SCHOOL_INFO } from '../data/initialData';
import { SquareQrCode } from './SquareQrCode';
import { 
  Printer, 
  X, 
  IdCard, 
  Sparkles,
  LayoutTemplate,
  Smartphone
} from 'lucide-react';
import { printDocumentArea } from '../utils/printHelper';

interface KartuPelajarModalProps {
  siswa: User;
  schoolInfo?: SchoolInfo;
  onClose: () => void;
  bulkList?: User[];
  bulkStudents?: User[];
}

export const KartuPelajarModal: React.FC<KartuPelajarModalProps> = ({
  siswa,
  schoolInfo,
  onClose,
  bulkList,
  bulkStudents,
}) => {
  const currentSchoolInfo = schoolInfo || SCHOOL_INFO;
  const effectiveBulkList = bulkList || bulkStudents;
  const [activeSide, setActiveSide] = useState<'depan' | 'belakang' | 'kedua'>('kedua');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [paperSize, setPaperSize] = useState<'A4' | 'F4' | 'Legal' | 'Letter'>('A4');
  const [isPrinting, setIsPrinting] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      if (printContainerRef.current) {
        await printDocumentArea(printContainerRef.current, {
          title: `Kartu Pelajar - ${siswa.nama}`,
          paperSize,
          orientation,
          margin: 'minimal',
        });
      } else {
        window.print();
      }
    } finally {
      setIsPrinting(false);
    }
  };

  // Helper untuk mendapatkan kejuruan saja (tanpa tingkat kelas X/XI/XII)
  const getCleanKejuruan = (s: User): string => {
    let val = s.jurusan || '';
    if (!val || !val.trim()) {
      val = s.namaKelas || s.kelas || '';
    }
    // Hapus awalan kelas (Kelas X, X, XI, XII, 10, 11, 12) dan nomor rombel di belakang
    const cleaned = val
      .replace(/^Kelas\s+/i, '')
      .replace(/^(X|XI|XII|10|11|12)\s+/i, '')
      .replace(/\s+[0-9]+$/g, '')
      .trim();

    if (/^TKJ$/i.test(cleaned)) return 'Teknik Komputer & Jaringan';
    if (/^AKL$/i.test(cleaned)) return 'Akuntansi & Keuangan Lembaga';
    if (/^MPLB$/i.test(cleaned)) return 'Manajemen Perkantoran';
    if (/^Farmasi$/i.test(cleaned)) return 'Farmasi';

    return cleaned || 'Teknik Komputer & Jaringan';
  };

  // ==========================================
  // 1. RENDER KARTU LANDSCAPE (MENDATAR: 85.6 × 54 mm)
  // ==========================================
  const renderCardFrontLandscape = (s: User) => {
    const nipd = s.nipd || s.nipOrNis || '24.25.10.001';
    const nisn = s.nisn || s.username || '-';
    const kejuruan = getCleanKejuruan(s);

    return (
      <div className="w-[350px] h-[220px] sm:w-[360px] sm:h-[227px] rounded-2xl bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 text-slate-900 p-2.5 shadow-xl border-2 border-emerald-500/40 relative overflow-hidden flex flex-col justify-between select-none print:shadow-none print:border-emerald-600 print:w-[85.6mm] print:h-[53.98mm] print:p-2 print:rounded-xl print:break-inside-avoid">
        {/* Decorative background watermark */}
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-emerald-500/10 blur-xl pointer-events-none"></div>
        <div className="absolute left-1/4 -top-8 w-24 h-24 rounded-full bg-teal-500/10 blur-xl pointer-events-none"></div>

        {/* Card Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-1.5 px-2 rounded-xl flex items-center gap-2 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-white p-0.5 flex items-center justify-center shrink-0 shadow-xs border border-emerald-200">
            <img 
              src={currentSchoolInfo.logoUrl || '/logo_bpm.png'} 
              alt="Logo" 
              className="w-full h-full object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-[10.5px] font-black uppercase tracking-wider text-white truncate drop-shadow-xs">
              {currentSchoolInfo.nama || 'SMK BAKTI PUTRA MANDIRI'}
            </div>
            <div className="text-[7.5px] text-emerald-100 font-bold tracking-wider uppercase">
              KARTU TANDA PELAJAR RESMI
            </div>
            <div className="text-[7px] text-teal-100/90 truncate">
              NPSN: {currentSchoolInfo.npsn || '69987123'} • Akreditasi: {currentSchoolInfo.akreditasi || 'A (Unggul)'}
            </div>
          </div>
          <div className="shrink-0 px-1.5 py-0.5 rounded bg-white/20 backdrop-blur-xs border border-white/30 text-white text-[7px] font-extrabold tracking-wide">
            AKTIF
          </div>
        </div>

        {/* Body: Foto Siswa, Nama Lengkap & Kejuruan, QR Code Presensi */}
        <div className="flex items-center justify-between gap-3 px-1 my-auto flex-1">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-18 h-22 sm:w-20 sm:h-24 rounded-xl bg-white border-2 border-emerald-500/50 overflow-hidden shadow-sm flex items-center justify-center text-slate-400 font-bold shrink-0">
              {s.fotoProfilUrl ? (
                <img src={s.fotoProfilUrl} alt={s.nama} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center">
                  <span className="text-emerald-700 text-2xl font-black">{s.nama.charAt(0)}</span>
                  <span className="text-[7px] text-slate-500 font-bold mt-0.5">SISWA</span>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="font-black text-[11.5px] sm:text-[12.5px] text-slate-900 leading-snug truncate" title={s.nama}>
                {s.nama}
              </div>
              <div className="text-[9.5px] font-extrabold text-emerald-700 truncate">
                {kejuruan}
              </div>
              <div className="pt-1 flex flex-col gap-0.5 text-[8px] font-mono text-slate-700">
                <span className="font-bold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.2 rounded border border-emerald-200 inline-block w-fit">
                  NIPD: {nipd}
                </span>
                <span className="text-slate-500 font-semibold">
                  NISN: {nisn}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center shrink-0 pl-2 border-l border-emerald-100/80">
            <div className="p-1.5 bg-white rounded-xl shadow-xs border border-emerald-400/50 flex flex-col items-center">
              <SquareQrCode value={nipd} size={50} />
            </div>
            <span className="font-mono text-[6.5px] text-emerald-800 font-black mt-1 tracking-wider text-center">
              QR PRESENSI
            </span>
          </div>
        </div>

        {/* Card Footer */}
        <div className="flex items-center justify-between text-[7px] text-slate-500 border-t border-emerald-100/80 pt-0.5">
          <span className="truncate">Berlaku selama menjadi siswa aktif</span>
          <span className="font-bold text-emerald-700 shrink-0">Parungpanjang, Bogor</span>
        </div>
      </div>
    );
  };

  const renderCardBackLandscape = (s: User) => {
    const nipd = s.nipd || s.nipOrNis || '24.25.10.001';
    const nisn = s.nisn || s.username || '-';
    const kejuruan = getCleanKejuruan(s);
    const ttl = s.tempatTanggalLahir || `${s.tempatLahir || 'Bogor'}, ${s.tanggalLahir || '12 Mei 2009'}`;
    const jk = s.jk === 'L' || s.jenisKelamin === 'Laki-laki' ? 'Laki-laki' : 'Perempuan';

    return (
      <div className="w-[350px] h-[220px] sm:w-[360px] sm:h-[227px] rounded-2xl bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 text-slate-900 p-2.5 shadow-xl border-2 border-emerald-500/40 relative overflow-hidden flex flex-col justify-between select-none print:shadow-none print:border-emerald-600 print:w-[85.6mm] print:h-[53.98mm] print:p-2 print:rounded-xl print:break-inside-avoid">
        {/* Decorative background watermark */}
        <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-emerald-500/10 blur-xl pointer-events-none"></div>

        {/* Back Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white py-1 px-2.5 rounded-lg flex items-center justify-between shadow-xs">
          <div className="text-[8.5px] font-black uppercase tracking-wider text-white">
            BIODATA & KETENTUAN KARTU TANDA PELAJAR
          </div>
          <div className="text-[7px] text-emerald-100 uppercase font-bold">
            {currentSchoolInfo.singkatan || 'SMK BPM'}
          </div>
        </div>

        {/* Grid Tengah: Kiri Biodata Siswa Rapih Terstruktur, Kanan Ketentuan Kartu */}
        <div className="grid grid-cols-12 gap-2 my-1 text-[7.5px] leading-tight">
          <div className="col-span-6 bg-white/95 p-1.5 rounded-xl border border-emerald-100 shadow-2xs">
            <div className="text-[8px] font-extrabold text-emerald-800 border-b border-emerald-100/90 pb-0.5 mb-1 uppercase tracking-wide flex items-center justify-between">
              <span>Biodata Siswa</span>
              <span className="text-[6px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">Resmi</span>
            </div>
            {/* Penulisan Biodata Rapih Sejajar Titik Dua */}
            <table className="w-full text-left border-collapse text-[7px] leading-tight">
              <tbody>
                <tr>
                  <td className="text-slate-500 font-medium py-0.2 w-[54px] whitespace-nowrap">Nama</td>
                  <td className="text-slate-400 py-0.2 w-[6px] text-center">:</td>
                  <td className="font-black text-slate-900 py-0.2 truncate">{s.nama}</td>
                </tr>
                <tr>
                  <td className="text-slate-500 font-medium py-0.2 whitespace-nowrap">NIPD / NISN</td>
                  <td className="text-slate-400 py-0.2 text-center">:</td>
                  <td className="font-mono text-emerald-800 font-bold py-0.2">{nipd} / {nisn}</td>
                </tr>
                <tr>
                  <td className="text-slate-500 font-medium py-0.2 whitespace-nowrap">Kejuruan</td>
                  <td className="text-slate-400 py-0.2 text-center">:</td>
                  <td className="font-bold text-emerald-900 py-0.2 truncate">{kejuruan}</td>
                </tr>
                <tr>
                  <td className="text-slate-500 font-medium py-0.2 whitespace-nowrap">TTL</td>
                  <td className="text-slate-400 py-0.2 text-center">:</td>
                  <td className="text-slate-800 py-0.2 truncate">{ttl}</td>
                </tr>
                <tr>
                  <td className="text-slate-500 font-medium py-0.2 whitespace-nowrap">Jns Kelamin</td>
                  <td className="text-slate-400 py-0.2 text-center">:</td>
                  <td className="text-slate-800 py-0.2">{jk}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="col-span-6 bg-white/95 p-1.5 rounded-xl border border-emerald-100 shadow-2xs flex flex-col justify-between">
            <div className="text-[8px] font-extrabold text-emerald-800 border-b border-emerald-100/90 pb-0.5 mb-0.5 uppercase tracking-wide">
              Ketentuan Kartu
            </div>
            <ol className="list-decimal list-inside space-y-0.5 text-[7px] text-slate-700 leading-tight">
              <li>Kartu ini adalah identitas resmi siswa.</li>
              <li>Wajib dibawa saat KBM & ujian CBT.</li>
              <li>Kode QR digunakan untuk presensi harian.</li>
              <li>Dilarang merusak / memindahtangankan.</li>
              <li>Jika menemukan, kembalikan ke sekolah.</li>
            </ol>
          </div>
        </div>

        {/* Footer Sisi Kedua: Alamat Sekolah & Kepala Sekolah */}
        <div className="border-t border-emerald-100/90 pt-1 flex items-end justify-between text-[7px] text-slate-700 mt-auto">
          <div className="space-y-0.5 max-w-[190px]">
            <div className="font-extrabold text-slate-900 text-[7.5px] uppercase">{currentSchoolInfo.nama || 'SMK Bakti Putra Mandiri'}</div>
            <div className="text-slate-500 text-[6.5px] leading-tight line-clamp-2">
              {currentSchoolInfo.alamatLengkap || currentSchoolInfo.alamat || 'Jl. Mohamad Sumantri No. 11 Parungpanjang, Kab. Bogor'}
            </div>
            <div className="text-slate-500 text-[6.5px]">
              Telp: {currentSchoolInfo.telepon || '(021) 5978-2345'}
            </div>
          </div>

          <div className="text-center space-y-0.5 min-w-[100px]">
            <div className="text-[6.5px] text-slate-500 font-medium">Kepala Sekolah,</div>
            {/* Area tanda tangan dan cap dikosongkan tanpa coretan/garis */}
            <div className="h-8 w-full"></div>
            <div className="font-bold text-slate-900 text-[7px] pt-0.5">
              {currentSchoolInfo.kepalaSekolah || 'Dr. Nurul Husnul Lail, M.Kes.'}
            </div>
            <div className="text-[6px] text-slate-500 font-mono">
              NIP. {currentSchoolInfo.nipKepalaSekolah || '197108151998021004'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // 2. RENDER KARTU PORTRAIT (TEGAK / VERTIKAL: 54 × 85.6 mm)
  // Foto diperbesar, tingkat kelas tidak ditampilkan,
  // kejuruan sejajar dengan QR Code
  // ==========================================
  const renderCardFrontPortrait = (s: User) => {
    const nipd = s.nipd || s.nipOrNis || '24.25.10.001';
    const nisn = s.nisn || s.username || '-';
    const kejuruan = getCleanKejuruan(s);

    return (
      <div className="w-[235px] h-[375px] sm:w-[250px] sm:h-[395px] rounded-2xl bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 text-slate-900 p-2.5 shadow-xl border-2 border-emerald-500/40 relative overflow-hidden flex flex-col justify-between select-none print:shadow-none print:border-emerald-600 print:w-[53.98mm] print:h-[85.6mm] print:p-2 print:rounded-xl print:break-inside-avoid">
        {/* Subtle decorative background watermark */}
        <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-emerald-500/10 blur-xl pointer-events-none"></div>
        <div className="absolute left-1/4 -top-6 w-20 h-20 rounded-full bg-teal-500/10 blur-xl pointer-events-none"></div>

        {/* Card Header Portrait */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-1.5 px-2 rounded-xl flex items-center gap-2 shadow-xs shrink-0">
          <div className="w-7 h-7 rounded-lg bg-white p-0.5 flex items-center justify-center shrink-0 shadow-xs border border-emerald-200">
            <img 
              src={currentSchoolInfo.logoUrl || '/logo_bpm.png'} 
              alt="Logo" 
              className="w-full h-full object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-[9px] font-black uppercase tracking-wider text-white truncate drop-shadow-xs">
              {currentSchoolInfo.nama || 'SMK BAKTI PUTRA MANDIRI'}
            </div>
            <div className="text-[6.5px] text-emerald-100 font-bold tracking-wider uppercase">
              KARTU TANDA PELAJAR RESMI
            </div>
            <div className="text-[6px] text-teal-100/90 truncate">
              NPSN: {currentSchoolInfo.npsn || '69987123'} • Akreditasi: {currentSchoolInfo.akreditasi || 'A'}
            </div>
          </div>
          <div className="shrink-0 px-1 py-0.5 rounded bg-white/20 backdrop-blur-xs border border-white/30 text-white text-[6.5px] font-extrabold tracking-wide">
            AKTIF
          </div>
        </div>

        {/* Body Portrait: Foto Siswa Diperbesar + Identitas + Kejuruan & QR Sejajar */}
        <div className="flex flex-col items-center text-center my-auto py-1 space-y-1.5 flex-1 justify-between">
          {/* Foto Siswa Diperbesar (Besar & Jelas Sesuai Permintaan) */}
          <div className="w-24 h-32 sm:w-28 sm:h-36 rounded-2xl bg-white border-2 border-emerald-500/60 overflow-hidden shadow-md flex items-center justify-center text-slate-400 font-bold shrink-0 mx-auto">
            {s.fotoProfilUrl ? (
              <img src={s.fotoProfilUrl} alt={s.nama} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center">
                <span className="text-emerald-700 text-3xl font-black">{s.nama.charAt(0)}</span>
                <span className="text-[7.5px] text-slate-500 font-bold mt-1 tracking-wider">PAS FOTO</span>
              </div>
            )}
          </div>

          {/* Nama Siswa & Identitas NIPD/NISN (Tingkat Kelas TIDAK ditampilkan) */}
          <div className="w-full px-1 space-y-1">
            <div className="font-black text-xs sm:text-[13px] text-slate-900 leading-tight line-clamp-2 px-1 text-center" title={s.nama}>
              {s.nama}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[7.5px] font-mono">
              <span className="font-bold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-200">
                NIPD: {nipd}
              </span>
              <span className="text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                NISN: {nisn}
              </span>
            </div>
          </div>

          {/* Kejuruan SEJAJAR dengan QR Code Presensi (Tingkat Kelas Dihilangkan) */}
          <div className="w-full grid grid-cols-12 gap-1.5 items-center bg-white/95 p-1.5 rounded-xl border border-emerald-200 shadow-2xs mt-auto">
            {/* Kejuruan (kiri, sejajar dengan QR) */}
            <div className="col-span-7 flex flex-col justify-center text-left pl-1">
              <span className="text-[6.5px] uppercase font-bold text-slate-400 tracking-wider">
                KOMPETENSI KEAHLIAN
              </span>
              <span className="text-[10px] font-black text-emerald-800 leading-tight line-clamp-2 mt-0.5">
                {kejuruan}
              </span>
              <span className="text-[6px] text-slate-400 font-medium mt-0.5 truncate">
                SMK Bakti Putra Mandiri
              </span>
            </div>

            {/* QR Code Barcode Presensi (kanan, sejajar) */}
            <div className="col-span-5 flex flex-col items-center justify-center border-l border-emerald-100 pl-1">
              <div className="p-1 bg-white rounded-lg shadow-2xs border border-emerald-300/60 flex items-center justify-center">
                <SquareQrCode value={nipd} size={46} />
              </div>
              <span className="font-mono text-[5.5px] text-emerald-800 font-black mt-0.5 tracking-wider text-center">
                QR PRESENSI
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer Portrait */}
        <div className="flex items-center justify-between text-[6.5px] text-slate-500 border-t border-emerald-100/80 pt-0.5 shrink-0">
          <span className="truncate">Berlaku selama menjadi siswa aktif</span>
          <span className="font-bold text-emerald-700 shrink-0">Parungpanjang, Bogor</span>
        </div>
      </div>
    );
  };

  const renderCardBackPortrait = (s: User) => {
    const nipd = s.nipd || s.nipOrNis || '24.25.10.001';
    const nisn = s.nisn || s.username || '-';
    const kejuruan = getCleanKejuruan(s);
    const ttl = s.tempatTanggalLahir || `${s.tempatLahir || 'Bogor'}, ${s.tanggalLahir || '12 Mei 2009'}`;
    const jk = s.jk === 'L' || s.jenisKelamin === 'Laki-laki' ? 'Laki-laki' : 'Perempuan';

    return (
      <div className="w-[235px] h-[375px] sm:w-[250px] sm:h-[395px] rounded-2xl bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 text-slate-900 p-2.5 shadow-xl border-2 border-emerald-500/40 relative overflow-hidden flex flex-col justify-between select-none print:shadow-none print:border-emerald-600 print:w-[53.98mm] print:h-[85.6mm] print:p-2 print:rounded-xl print:break-inside-avoid">
        {/* Subtle decorative background watermark */}
        <div className="absolute -left-6 -bottom-6 w-28 h-28 rounded-full bg-emerald-500/10 blur-xl pointer-events-none"></div>

        {/* Header Portrait */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white py-1 px-2 rounded-lg flex items-center justify-between shadow-xs shrink-0">
          <div className="text-[7.5px] font-black uppercase tracking-wider text-white">
            BIODATA & KETENTUAN KARTU
          </div>
          <div className="text-[6.5px] text-emerald-100 uppercase font-bold">
            {currentSchoolInfo.singkatan || 'SMK BPM'}
          </div>
        </div>

        {/* Biodata Box Rapih Sejajar Titik Dua (Tingkat Kelas Dihilangkan, Kejuruan Ditampilkan) */}
        <div className="bg-white/95 p-2 rounded-xl border border-emerald-100 shadow-2xs my-1">
          <div className="text-[7.5px] font-extrabold text-emerald-800 border-b border-emerald-100/80 pb-0.5 mb-1 uppercase tracking-wide flex items-center justify-between">
            <span>Biodata Lengkap Siswa</span>
            <span className="text-[6px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">Resmi</span>
          </div>
          <table className="w-full text-left border-collapse text-[6.8px] leading-tight">
            <tbody>
              <tr>
                <td className="text-slate-500 font-medium py-0.5 w-[58px] whitespace-nowrap">Nama Lengkap</td>
                <td className="text-slate-400 py-0.5 w-[6px] text-center">:</td>
                <td className="font-black text-slate-900 py-0.5 truncate">{s.nama}</td>
              </tr>
              <tr>
                <td className="text-slate-500 font-medium py-0.5 whitespace-nowrap">NIPD / NISN</td>
                <td className="text-slate-400 py-0.5 text-center">:</td>
                <td className="font-mono text-emerald-800 font-bold py-0.5">{nipd} / {nisn}</td>
              </tr>
              <tr>
                <td className="text-slate-500 font-medium py-0.5 whitespace-nowrap">Kejuruan</td>
                <td className="text-slate-400 py-0.5 text-center">:</td>
                <td className="font-bold text-emerald-900 py-0.5 truncate">{kejuruan}</td>
              </tr>
              <tr>
                <td className="text-slate-500 font-medium py-0.5 whitespace-nowrap">TTL</td>
                <td className="text-slate-400 py-0.5 text-center">:</td>
                <td className="text-slate-800 py-0.5 truncate">{ttl}</td>
              </tr>
              <tr>
                <td className="text-slate-500 font-medium py-0.5 whitespace-nowrap">Jenis Kelamin</td>
                <td className="text-slate-400 py-0.5 text-center">:</td>
                <td className="text-slate-800 py-0.5">{jk}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Ketentuan Box */}
        <div className="bg-white/95 p-2 rounded-xl border border-emerald-100 shadow-2xs space-y-0.5 text-[6.5px] text-slate-700 leading-tight my-0.5">
          <div className="text-[7.5px] font-extrabold text-emerald-800 border-b border-emerald-100/80 pb-0.5 mb-0.5 uppercase tracking-wide">
            Ketentuan Pemakaian Kartu
          </div>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Kartu ini adalah identitas resmi siswa.</li>
            <li>Wajib dibawa saat KBM & ujian CBT.</li>
            <li>Kode QR untuk presensi scanner gerbang.</li>
            <li>Dilarang merusak / dipindahtangankan.</li>
            <li>Jika menemukan, kembalikan ke sekolah.</li>
          </ol>
        </div>

        {/* Signature & Address Footer */}
        <div className="border-t border-emerald-100/90 pt-1 flex items-end justify-between text-[6.5px] text-slate-700 mt-auto shrink-0">
          <div className="space-y-0.5 max-w-[120px]">
            <div className="font-extrabold text-slate-900 text-[7px] uppercase">{currentSchoolInfo.nama || 'SMK Bakti Putra Mandiri'}</div>
            <div className="text-slate-500 text-[6px] leading-tight line-clamp-2">
              {currentSchoolInfo.alamatLengkap || currentSchoolInfo.alamat || 'Jl. Mohamad Sumantri No. 11 Parungpanjang, Bogor'}
            </div>
            <div className="text-slate-500 text-[6px]">
              Telp: {currentSchoolInfo.telepon || '(021) 5978-2345'}
            </div>
          </div>

          <div className="text-center space-y-0.5 min-w-[85px]">
            <div className="text-[6px] text-slate-500 font-medium">Kepala Sekolah,</div>
            {/* Area tanda tangan dan cap dikosongkan tanpa coretan/garis */}
            <div className="h-7 w-full"></div>
            <div className="font-bold text-slate-900 text-[6.5px] pt-0.5 truncate">
              {currentSchoolInfo.kepalaSekolah || 'Dr. Nurul Husnul Lail'}
            </div>
            <div className="text-[5.5px] text-slate-500 font-mono truncate">
              NIP. {currentSchoolInfo.nipKepalaSekolah || '197108151998021004'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const studentsToPrint = effectiveBulkList && effectiveBulkList.length > 0 ? effectiveBulkList : [siswa];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Dynamic Print CSS for Portrait / Landscape */}
      <style>{`
        @media print {
          @page {
            size: ${orientation === 'portrait' ? 'portrait' : 'landscape'};
            margin: 6mm;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .printable-card-item {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header - Screen Only */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800">
              <IdCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Kartu Tanda Pelajar & Absen Resmi (Digital & Print)
              </h3>
              <p className="text-xs text-slate-500">
                Dilengkapi Pas Foto, Profil Lengkap, dan QR Code Persegi Scanner Presensi Gerbang
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
              title="Cetak kartu pelajar saja (halaman aplikasi disembunyikan otomatis)"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'Menyiapkan Cetak...' : `Cetak Kartu (${paperSize})`}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Controls - Screen Only */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          {/* Selector 1: Orientasi (Landscape vs Portrait) */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Bentuk Kartu:</span>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => setOrientation('portrait')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  orientation === 'portrait' 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Portrait (Tegak)</span>
              </button>
              <button
                onClick={() => setOrientation('landscape')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  orientation === 'landscape' 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                <span>Landscape (Mendatar)</span>
              </button>
            </div>
          </div>

          {/* Selector Kertas Cetak */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Kertas:</span>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as any)}
              className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-xs cursor-pointer"
            >
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="F4">F4 / Folio (215 × 330 mm)</option>
              <option value="Legal">Legal (216 × 356 mm)</option>
              <option value="Letter">Letter (216 × 279 mm)</option>
            </select>
          </div>

          {/* Selector 2: Sisi Kartu */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Tampilan Sisi:</span>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => setActiveSide('depan')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeSide === 'depan' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Depan
              </button>
              <button
                onClick={() => setActiveSide('belakang')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeSide === 'belakang' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Belakang
              </button>
              <button
                onClick={() => setActiveSide('kedua')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeSide === 'kedua' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Kedua Sisi
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Format presisi standar ID-1 siap cetak PVC / laminasi ID Card Lanyard</span>
          </div>
        </div>

        {/* Content Area - Isolated Printable Document */}
        <div ref={printContainerRef} id="printable-kartu-doc" className="printable-document p-6 overflow-y-auto flex-1 bg-slate-100/70 print:p-0 print:bg-white">
          <div className="space-y-8">
            {studentsToPrint.map((st) => (
              <div key={st.id} className="printable-card-item flex flex-col items-center gap-3 print:py-3">
                <div className="text-center print:hidden">
                  <span className="text-xs font-bold text-slate-700 bg-white px-3.5 py-1 rounded-full border border-slate-200 shadow-2xs">
                    {st.nama} ({st.namaKelas || st.kelas}) • NIPD: {st.nipd || st.nipOrNis}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-6 print:gap-4">
                  {orientation === 'portrait' ? (
                    <>
                      {(activeSide === 'depan' || activeSide === 'kedua') && renderCardFrontPortrait(st)}
                      {(activeSide === 'belakang' || activeSide === 'kedua') && renderCardBackPortrait(st)}
                    </>
                  ) : (
                    <>
                      {(activeSide === 'depan' || activeSide === 'kedua') && renderCardFrontLandscape(st)}
                      {(activeSide === 'belakang' || activeSide === 'kedua') && renderCardBackLandscape(st)}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info - Screen only */}
        <div className="px-6 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 print:hidden">
          <span>Tips Cetak: Pilih skala 100% dan centang opsi <strong>"Background graphics"</strong> pada jendela dialog print browser Anda.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
