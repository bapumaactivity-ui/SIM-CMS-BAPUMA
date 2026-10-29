import React, { useRef } from 'react';
import { FormulirPPDB, SchoolInfo } from '../../types';
import { KopSuratView } from '../KopSuratView';
import { exportFormulirToWord } from '../../utils/exportPPDB';
import {
  X,
  Printer,
  Download,
  FileDown,
  FileText,
  CheckCircle2,
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Award,
  BookOpen,
  GraduationCap
} from 'lucide-react';

interface FormulirPPDBModalProps {
  calon: FormulirPPDB | null;
  schoolInfo?: SchoolInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const FormulirPPDBModal: React.FC<FormulirPPDBModalProps> = ({
  calon,
  schoolInfo,
  isOpen,
  onClose,
}) => {
  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !calon) return null;

  const noReg = calon.nomorRegistrasi || `REG-${calon.id?.substring(0, 8).toUpperCase()}`;
  const tahunAjaran = schoolInfo?.tahunAjaranSPMB || '2026/2027';

  // Handle direct browser print
  const handlePrint = () => {
    window.print();
  };

  // Handle export / download standalone HTML file
  const handleDownloadHTML = () => {
    if (!printableRef.current) return;
    const documentContent = printableRef.current.innerHTML;
    const htmlTitle = `Formulir_PPDB_${calon.namaLengkap.replace(/\s+/g, '_')}_${calon.nisn || calon.id}`;

    const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${htmlTitle}</title>
  <style>
    @page { size: A4; margin: 12mm 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 20px;
      background-color: #fff;
    }
    .print-container {
      max-width: 800px;
      margin: 0 auto;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 12px; }
    th, td { padding: 6px 8px; font-size: 11px; text-align: left; vertical-align: top; }
    .border-table th, .border-table td { border: 1px solid #cbd5e1; }
    .section-header {
      background-color: #f1f5f9;
      font-weight: bold;
      padding: 6px 8px;
      font-size: 12px;
      border-left: 4px solid #d97706;
      margin-top: 14px;
      margin-bottom: 6px;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      page-break-inside: avoid;
    }
    .sig-box {
      width: 30%;
      text-align: center;
      font-size: 11px;
    }
    .sig-space {
      height: 60px;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="print-container">
    ${documentContent}
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${htmlTitle}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:rounded-none">
        {/* Top Control Bar (Hidden on print) */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-4 border-b border-slate-800 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Formulir Pendaftaran Siswa Baru (PPDB)
              </h3>
              <p className="text-xs text-slate-400">
                {calon.namaLengkap} • No. Reg: {noReg}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportFormulirToWord(calon, schoolInfo)}
              className="px-3.5 py-2 rounded-xl bg-blue-800 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              title="Unduh formulir resmi dalam format Microsoft Word (.doc)"
            >
              <FileDown className="w-4 h-4" />
              <span>Unduh Word (.doc)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHTML}
              className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh HTML</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Content */}
        <div className="overflow-y-auto p-6 sm:p-10 space-y-6 print:overflow-visible print:p-0">
          <div ref={printableRef} className="printable-document bg-white space-y-5 text-slate-900">
            {/* 1. KOP SURAT SEKOLAH RESMI */}
            <KopSuratView schoolInfo={schoolInfo} />

            {/* 2. JUDUL DOKUMEN & IDENTIFIKASI FORMULIR */}
            <div className="text-center space-y-1 border-b-2 border-slate-900 pb-3">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900">
                FORMULIR PENDAFTARAN PESERTA DIDIK BARU (PPDB)
              </h2>
              <div className="text-xs font-bold text-slate-700">
                TAHUN AJARAN {tahunAjaran}
              </div>
              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-600 pt-1">
                <span>No. Registrasi: <strong>{noReg}</strong></span>
                <span>•</span>
                <span>Gelombang: <strong>{calon.gelombang || 'Gelombang 1'}</strong></span>
                <span>•</span>
                <span>Tgl Daftar: <strong>{calon.tanggalDaftar || '-'}</strong></span>
                <span>•</span>
                <span>Status: <strong className="uppercase">{calon.statusPendaftaran}</strong></span>
              </div>
            </div>

            {/* Top Grid: Pas Foto & Pilihan Jurusan */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 p-4 rounded-xl border border-slate-300 bg-slate-50/50">
              <div className="space-y-1.5 flex-1 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Kompetensi Keahlian yang Dipilih
                </div>
                <div className="text-base font-black text-amber-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>{calon.pilihanJurusan}</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Asal SD/MI: <strong>{calon.asalSekolahSD || '-'} (Lulus: {calon.tahunLulusSd || '-'})</strong>
                </div>
                <div className="text-[11px] text-slate-600">
                  Asal SMP/MTs: <strong>{calon.asalSekolahSMP || calon.asalSmp || calon.asalSekolah || '-'} (Lulus: {calon.tahunLulusSmp || '-'})</strong>
                </div>
                <div className="text-[11px] text-slate-600">
                  No. Seri Ijazah SMP: <strong>{calon.noSeriIjazahSMP || calon.noSeriIjazah || '-'}</strong>
                </div>
              </div>

              {/* Pas Foto 3x4 Box */}
              <div className="w-28 h-36 border-2 border-dashed border-slate-400 rounded-lg flex flex-col items-center justify-center overflow-hidden bg-white shadow-xs shrink-0">
                {calon.pasFotoUrl ? (
                  <img
                    src={calon.pasFotoUrl}
                    alt={calon.namaLengkap}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-2 text-slate-400">
                    <User className="w-8 h-8 mx-auto mb-1 opacity-40" />
                    <span className="text-[10px] font-semibold block">Pas Foto</span>
                    <span className="text-[9px] block">3 x 4 cm</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bagian A: IDENTITAS CALON PESERTA DIDIK */}
            <div className="space-y-2">
              <div className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between">
                <span>A. DATA PRIBADI CALON PESERTA DIDIK</span>
                <span className="text-[10px] font-normal text-slate-300">Wajib diisi sesuai Akta Kelahiran & KK</span>
              </div>

              <table className="w-full text-xs border border-slate-200 divide-y divide-slate-200">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="w-1/3 py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Nama Lengkap</td>
                    <td className="py-1.5 px-3 font-bold text-slate-900 uppercase">{calon.namaLengkap}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Nama Panggilan</td>
                    <td className="py-1.5 px-3 text-slate-900">{calon.namaPanggilan || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Jenis Kelamin</td>
                    <td className="py-1.5 px-3 text-slate-900">{calon.jenisKelamin}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">NISN (10 Angka)</td>
                    <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{calon.nisn || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">NIK (Nomor Induk Kependudukan)</td>
                    <td className="py-1.5 px-3 font-mono text-slate-900">{calon.nikSiswa || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Nomor Kartu Keluarga (KK)</td>
                    <td className="py-1.5 px-3 font-mono text-slate-900">{calon.noKk || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Nomor Akta Kelahiran</td>
                    <td className="py-1.5 px-3 font-mono text-slate-900">{calon.noAktaKelahiran || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Tempat, Tanggal Lahir</td>
                    <td className="py-1.5 px-3 text-slate-900">{calon.tempatLahir}, {calon.tanggalLahir}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Agama</td>
                    <td className="py-1.5 px-3 text-slate-900">{calon.agama} {calon.agamaLainnya ? `(${calon.agamaLainnya})` : ''}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Alamat Berdasarkan Kartu Keluarga (KK)</td>
                    <td className="py-1.5 px-3 text-slate-900">
                      {calon.alamatKk || calon.alamatLengkap} {calon.rt && `RT ${calon.rt}`} {calon.rw && `RW ${calon.rw}`} {calon.desa && `Desa/Kel. ${calon.desa}`} {calon.kecKab && `Kec. ${calon.kecKab}`} {calon.kodePos && `(${calon.kodePos})`}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Alamat Tempat Tinggal Domisili</td>
                    <td className="py-1.5 px-3 text-slate-900">
                      {calon.alamatSamaDenganKk !== false 
                        ? 'Sama dengan Alamat di Kartu Keluarga (KK)' 
                        : (calon.alamatDomisili || calon.alamatLengkap)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">No. WhatsApp / HP Siswa</td>
                    <td className="py-1.5 px-3 font-mono text-slate-900">{calon.noHp || calon.nomorHp || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Email Calon Siswa</td>
                    <td className="py-1.5 px-3 text-slate-900">{calon.emailSiswa || calon.email || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Media Sosial Siswa (Medsos)</td>
                    <td className="py-1.5 px-3 text-slate-900">{calon.medsosSiswa || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Tinggi / Berat Badan</td>
                    <td className="py-1.5 px-3 text-slate-900">{calon.tinggiBadan ? `${calon.tinggiBadan} cm` : '-'} / {calon.beratBadan ? `${calon.beratBadan} kg` : '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Cita-cita & Hobi</td>
                    <td className="py-1.5 px-3 text-slate-900">Cita-cita: {calon.citaCita === 'Lainnya' ? calon.citaCitaLainnya : calon.citaCita} | Hobi: {calon.hobi === 'Lainnya' ? calon.hobiLainnya : calon.hobi}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Keterangan Asal Sekolah SD/MI/Sederajat</td>
                    <td className="py-1.5 px-3 text-slate-900">{calon.asalSekolahSD || '-'} (Lulus: {calon.tahunLulusSd || '-'})</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Asal Sekolah SMP/MTs/Sederajat</td>
                    <td className="py-1.5 px-3 text-slate-900">{calon.asalSekolahSMP || calon.asalSmp || calon.asalSekolah || '-'} (Lulus: {calon.tahunLulusSmp || '-'})</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Nomor Seri Ijazah SMP/MTs/Sederajat</td>
                    <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{calon.noSeriIjazahSMP || calon.noSeriIjazah || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bagian B: DATA ORANG TUA / WALI */}
            <div className="space-y-2">
              <div className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                <span>B. DATA ORANG TUA / WALI MURID</span>
              </div>

              <table className="w-full text-xs border border-slate-200 divide-y divide-slate-200">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="w-1/3 py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Nama Ayah Kandung</td>
                    <td className="py-1.5 px-3 font-semibold text-slate-900">{calon.namaAyah || '-'} (NIK: {calon.nikAyah || '-'})</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Pendidikan & Pekerjaan Ayah</td>
                    <td className="py-1.5 px-3 text-slate-900">
                      {calon.pendidikanAyah === 'LAINNYA' ? calon.pendidikanAyahLainnya : (calon.pendidikanAyah || '-')} | {calon.pekerjaanAyah === 'LAINNYA' ? calon.pekerjaanAyahLainnya : (calon.pekerjaanAyah || '-')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Nama Ibu Kandung</td>
                    <td className="py-1.5 px-3 font-semibold text-slate-900">{calon.namaIbu || '-'} (NIK: {calon.nikIbu || '-'})</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Pendidikan & Pekerjaan Ibu</td>
                    <td className="py-1.5 px-3 text-slate-900">
                      {calon.pendidikanIbu === 'LAINNYA' ? calon.pendidikanIbuLainnya : (calon.pendidikanIbu || '-')} | {calon.pekerjaanIbu === 'LAINNYA' ? calon.pekerjaanIbuLainnya : (calon.pekerjaanIbu || '-')}
                    </td>
                  </tr>

                  {/* Data Wali Murid jika diisi */}
                  {(calon.punyaWali === 'Ya' || calon.namaWali) && (
                    <>
                      <tr className="bg-teal-50/50">
                        <td className="py-1.5 px-3 font-semibold text-teal-800">Nama Wali Murid (Hubungan)</td>
                        <td className="py-1.5 px-3 font-semibold text-teal-900">
                          {calon.namaWali} (Hubungan: {calon.hubunganWali === 'LAINNYA' ? calon.hubunganWaliLainnya : (calon.hubunganWali || '-')})
                        </td>
                      </tr>
                      <tr className="bg-teal-50/50">
                        <td className="py-1.5 px-3 font-semibold text-teal-800">NIK & Pendidikan Wali</td>
                        <td className="py-1.5 px-3 text-slate-900">
                          NIK: {calon.nikWali || '-'} | Pendidikan: {calon.pendidikanWali === 'LAINNYA' ? calon.pendidikanWaliLainnya : (calon.pendidikanWali || '-')}
                        </td>
                      </tr>
                      <tr className="bg-teal-50/50">
                        <td className="py-1.5 px-3 font-semibold text-teal-800">Pekerjaan & Pendapatan Wali</td>
                        <td className="py-1.5 px-3 text-slate-900">
                          Pekerjaan: {calon.pekerjaanWali === 'LAINNYA' ? calon.pekerjaanWaliLainnya : (calon.pekerjaanWali || '-')} | Pendapatan: {calon.pendapatanWali || '-'}
                        </td>
                      </tr>
                      <tr className="bg-teal-50/50">
                        <td className="py-1.5 px-3 font-semibold text-teal-800">Kontak & Alamat Wali</td>
                        <td className="py-1.5 px-3 text-slate-900">
                          Telp/WA: {calon.noTelpWali || '-'} | Alamat: {calon.alamatWali || '-'}
                        </td>
                      </tr>
                    </>
                  )}

                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">No. Kontak / HP Orang Tua / Wali</td>
                    <td className="py-1.5 px-3 font-mono text-slate-900">{calon.noTelpOrtu || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 bg-slate-50 font-semibold text-slate-700">Program Bantuan Sosial (KIP/PKH/KKS)</td>
                    <td className="py-1.5 px-3 text-slate-900">
                      {calon.memilikiKipPkhBpjs === 'Ya' ? `Ya - No. Kartu: ${calon.nomorKipPkhBpjs || '-'}` : 'Tidak Ada'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bagian C: CATATAN & KEPUTUSAN PANITIA PPDB */}
            <div className="space-y-2">
              <div className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                <span>C. KEPUTUSAN & PENGESAHAN PANITIA PPDB</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50 space-y-2 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">STATUS PENERIMAAN:</span>
                    <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                      calon.statusPendaftaran === 'Diterima'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : calon.statusPendaftaran === 'Terverifikasi'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {calon.statusPendaftaran}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">NIS RESMI DITERBITKAN:</span>
                    <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                      {calon.nomorIndukSiswaResmi || '(Menunggu Penetapan)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">KELAS DITERIMA:</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {calon.kelasDiterima || '(Menunggu Penetapan Rombel)'}
                    </span>
                  </div>
                </div>

                {/* Metode Pembayaran & Rekening Sekolah */}
                <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">Metode Pembayaran:</span>
                    <span className="font-bold text-slate-900">
                      {calon.metodePembayaran || 'Transfer Bank / Datang Langsung'}
                    </span>
                    {calon.statusPembayaran && (
                      <span className="ml-2 px-1.5 py-0.5 text-[9px] rounded font-bold bg-teal-100 text-teal-800">
                        {calon.statusPembayaran}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">Rekening Resmi Sekolah:</span>
                    <span className="font-medium text-slate-800">
                      Bank BJB: <strong className="font-mono">0061324992100</strong> a.n. SMK BAKTI PUTRA MANDIRI
                    </span>
                  </div>
                </div>

                {calon.catatanAdmin && (
                  <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                    Catatan Verifikator: <em>"{calon.catatanAdmin}"</em>
                  </div>
                )}
              </div>
            </div>

            {/* Bagian D: LEMBAR TANDA TANGAN RESMI */}
            <div className="pt-4 page-break-inside-avoid">
              <div className="text-[11px] text-slate-500 text-right mb-4">
                {schoolInfo?.lokasiSekolah?.namaTempat ? 'Bogor' : 'Bogor'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>

              <div className="grid grid-cols-3 gap-4 text-center text-xs">
                {/* 1. Siswa */}
                <div className="space-y-16">
                  <div className="font-semibold text-slate-700">Calon Peserta Didik,</div>
                  <div>
                    <div className="font-bold underline text-slate-900 uppercase">{calon.namaLengkap}</div>
                    <div className="text-[10px] text-slate-500">Tanda Tangan & Nama Jelas</div>
                  </div>
                </div>

                {/* 2. Orang Tua */}
                <div className="space-y-16">
                  <div className="font-semibold text-slate-700">Orang Tua / Wali Murid,</div>
                  <div>
                    <div className="font-bold underline text-slate-900 uppercase">{calon.namaAyah || calon.namaIbu || calon.namaWali || '................................'}</div>
                    <div className="text-[10px] text-slate-500">Tanda Tangan & Nama Jelas</div>
                  </div>
                </div>

                {/* 3. Panitia PPDB */}
                <div className="space-y-16">
                  <div className="font-semibold text-slate-700">Panitia SPMB / Kepala Sekolah,</div>
                  <div>
                    <div className="font-bold underline text-slate-900 uppercase">
                      {schoolInfo?.kepalaSekolah || 'Dr. Nurul Husnul Lail, M.Kes.'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      NIP. {schoolInfo?.nipKepalaSekolah || '197108151998021004'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
