import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FormulirPPDB, JurusanPPDB, User, SchoolInfo, RekeningBank } from '../types';
import { KopSuratView } from './KopSuratView';
import { SquareQrCode } from './SquareQrCode';
import { compressStudentPhoto } from '../utils/imageCompressor';
import { printDocumentArea } from '../utils/printHelper';
import fotoSmpHijab from '../assets/images/foto_smp_hijab_1790131075580.jpg';
import fotoSmpCewe from '../assets/images/foto_smp_cewe_1790131098484.jpg';
import fotoSmpCowo from '../assets/images/foto_smp_cowo_1790131110745.jpg';
import { 
  UserCheck, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  ArrowLeft, 
  ArrowRight, 
  FileText, 
  Lock, 
  Building, 
  Building2,
  Phone, 
  MapPin, 
  HeartHandshake,
  ShieldCheck,
  UserPlus,
  Camera,
  Upload,
  Image as ImageIcon,
  Check,
  GraduationCap,
  Sparkles,
  CreditCard,
  FileUp,
  Trash2,
  Users,
  Download,
  Calendar,
  Clock,
  Bookmark,
  Mail,
  Bell,
  X,
  Info,
  ExternalLink,
  Share2,
  FileDown,
  BadgeCheck,
  Award,
  FileCheck,
  Copy
} from 'lucide-react';
import { calculatePPDBQuota } from '../utils/ppdbQuota';
import { INITIAL_GELOMBANG, INITIAL_REKENING_BANK } from '../data/initialData';
import { exportFormulirToWord } from '../utils/exportPPDB';

interface PPDBViewProps {
  currentUser: User | null;
  formulirList: FormulirPPDB[];
  schoolInfo?: SchoolInfo;
  onSaveFormulir: (form: FormulirPPDB) => void;
  onRegisterCalonSiswa: (newUser: User, newForm: FormulirPPDB) => void;
}

export const PPDBView: React.FC<PPDBViewProps> = ({
  currentUser,
  formulirList,
  schoolInfo,
  onSaveFormulir,
  onRegisterCalonSiswa,
}) => {
  const quotaSummary = calculatePPDBQuota(schoolInfo, formulirList);
  // Check if current user is calon siswa and already has a form
  // PENTING: Siswa aktif sekolah (role === 'siswa') BUKAN calon siswa baru. Jangan pernah tampilkan verifikasi siswa baru untuk akun siswa aktif!
  const isSiswaAktif = currentUser?.role === 'siswa';

  const existingForm = useMemo(() => {
    if (!currentUser || isSiswaAktif) return undefined;
    return formulirList.find(f => 
      (f.userId && f.userId === currentUser.id) || 
      (f.nisn && (
        f.nisn === currentUser.nipOrNis || 
        f.nisn === currentUser.username || 
        (currentUser.nisn && f.nisn === currentUser.nisn) ||
        (f.nisn.replace(/\D/g, '') && f.nisn.replace(/\D/g, '') === (currentUser.nisn || currentUser.nipOrNis || currentUser.username).replace(/\D/g, ''))
      )) ||
      (f.namaLengkap && currentUser.nama && f.namaLengkap.trim().toLowerCase() === currentUser.nama.trim().toLowerCase()) ||
      (currentUser.email && (f.email === currentUser.email || f.emailSiswa === currentUser.email))
    );
  }, [currentUser, formulirList, isSiswaAktif]);

  const [mode, setMode] = useState<'info' | 'daftar_akun' | 'isi_form' | 'verifikasi_berkas' | 'cetak_bukti'>(() => {
    if (isSiswaAktif) return 'info';
    if (existingForm) return 'verifikasi_berkas';
    if (currentUser?.role === 'calon_siswa') return 'verifikasi_berkas';
    return 'info';
  });

  // Reaktif terhadap pergantian akun atau calon siswa yang masuk agar Verifikasi Berkas selalu muncul di akun calon siswa (TIDAK untuk siswa aktif)
  useEffect(() => {
    if (isSiswaAktif) {
      if (mode === 'verifikasi_berkas') setMode('info');
      return;
    }
    if (currentUser?.role === 'calon_siswa' || existingForm) {
      setMode(prev => (prev === 'info' || prev === 'daftar_akun' ? 'verifikasi_berkas' : prev));
    }
  }, [currentUser, existingForm, isSiswaAktif, mode]);

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Pilihan Jurusan, 2: Identitas Peserta Didik (A), 3: Data Ortu (B)

  // Registration state for new calon siswa
  const [regNisn, setRegNisn] = useState('');
  const [regNama, setRegNama] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regHp, setRegHp] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Main Form Data State initialized
  const [formData, setFormData] = useState<Partial<FormulirPPDB>>({
    pilihanJurusan: 'Farmasi',
    nisn: currentUser?.role === 'calon_siswa' ? currentUser.nipOrNis : '',
    namaLengkap: currentUser?.role === 'calon_siswa' ? currentUser.nama : '',
    nikSiswa: '',
    noKk: '',
    noAktaKelahiran: '',
    namaPanggilan: '',
    tempatLahir: '',
    tanggalLahir: '2008-05-15',
    jenisKelamin: 'Perempuan',
    tinggiBadan: 160,
    beratBadan: 50,
    wargaNegara: 'Indonesia',
    noHp: '',
    email: '',
    emailSiswa: '',
    medsosSiswa: '',
    jumlahSaudara: 2,
    anakKe: 1,
    agama: 'Islam',
    agamaLainnya: '',
    hobi: 'Olah Raga',
    hobiLainnya: '',
    citaCita: 'APOTEKER',
    citaCitaLainnya: '',
    pasFotoUrl: existingForm?.pasFotoUrl || fotoSmpHijab,
    prestasi: '',
    jarakSekolah: '1-3 Km',
    transportasi: 'Motor',
    transportasiLainnya: '',
    alamatLengkap: '',
    alamatKk: '',
    alamatDomisili: '',
    alamatSamaDenganKk: true,
    rt: '01',
    rw: '02',
    noRumah: '10',
    kodePos: '16360',
    desa: '',
    kecKab: '',
    penyakitBerat: 'Tidak Ada',
    alergi: 'Tidak Ada',
    namaOrganisasi: 'PMR / OSIS',
    jabatanOrganisasi: 'Anggota',
    asalSekolahSD: '',
    tahunLulusSd: '2020',
    asalSmp: '',
    asalSekolahSMP: '',
    tahunLulusSmp: '2026',
    noSeriIjazah: 'DN-01/D-SMP/26/000000',
    noSeriIjazahSMP: 'DN-01/D-SMP/26/000000',
    // Data Ortu
    namaAyah: '',
    nikAyah: '',
    namaIbu: '',
    nikIbu: '',
    noTelpOrtu: '',
    alamatOrtu: '',
    pendidikanAyah: 'SMA/MA/PAKET C',
    pendidikanAyahLainnya: '',
    pendidikanIbu: 'SMA/MA/PAKET C',
    pendidikanIbuLainnya: '',
    pekerjaanAyah: 'PEGAWAI SWASTA',
    pekerjaanAyahLainnya: '',
    pekerjaanIbu: 'DIRUMAH SAJA',
    pekerjaanIbuLainnya: '',
    pendapatanAyah: '3.000.000 s.d Rp. 5.000.000',
    pendapatanIbu: '< Rp. 1000.000',
    // Data Wali
    punyaWali: 'Tidak',
    namaWali: '',
    nikWali: '',
    hubunganWali: 'Paman / Bibi',
    hubunganWaliLainnya: '',
    pendidikanWali: 'SMA/MA/PAKET C',
    pendidikanWaliLainnya: '',
    pekerjaanWali: 'PEGAWAI SWASTA',
    pekerjaanWaliLainnya: '',
    pendapatanWali: '3.000.000 s.d Rp. 5.000.000',
    noTelpWali: '',
    alamatWali: '',
    // Bantuan Sosial KIP / PKH / BPJS
    memilikiKipPkhBpjs: existingForm?.memilikiKipPkhBpjs || 'Tidak',
    jenisBantuan: existingForm?.jenisBantuan || [],
    nomorKipPkhBpjs: existingForm?.nomorKipPkhBpjs || '',
    lampiranKipPkhBpjs: existingForm?.lampiranKipPkhBpjs || '',
    namaFileKipPkhBpjs: existingForm?.namaFileKipPkhBpjs || '',
    statusPendaftaran: 'Proses_Isi',
    tanggalDaftar: new Date().toISOString().replace('T', ' ').substring(0, 16),
  });

  // Reaktif terhadap perubahan data calon siswa atau gelombang dari Pengaturan Admin
  React.useEffect(() => {
    if (existingForm) {
      setFormData(prev => ({
        ...prev,
        ...existingForm,
        gelombang: existingForm.gelombang || schoolInfo?.gelombangSPMB || 'Gelombang 1',
      }));
    } else if (schoolInfo?.gelombangSPMB) {
      setFormData(prev => ({
        ...prev,
        gelombang: schoolInfo.gelombangSPMB,
      }));
    }
  }, [existingForm, schoolInfo?.gelombangSPMB]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNisn || !regNama || !regPassword) {
      alert('Mohon lengkapi NISN, Nama Lengkap, dan Kata Sandi.');
      return;
    }

    const finalUsername = (regUsername.trim() || regNisn.trim()).toLowerCase();
    const newUserId = `u-calon-${Date.now()}`;
    const newUser: User = {
      id: newUserId,
      username: finalUsername,
      nama: regNama,
      role: 'calon_siswa',
      nipOrNis: regNisn,
      nisn: regNisn,
      password: regPassword,
    };

    const newForm: FormulirPPDB = {
      ...(formData as FormulirPPDB),
      id: `ppdb-${Date.now()}`,
      userId: newUserId,
      nisn: regNisn,
      namaLengkap: regNama,
      email: regEmail,
      noHp: regHp,
      statusPendaftaran: 'Proses_Isi',
      tanggalDaftar: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    onRegisterCalonSiswa(newUser, newForm);
    setFormData(newForm);
    setMode('isi_form');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const result = await compressStudentPhoto(file, 640, 0.86);
        setFormData(prev => ({ ...prev, pasFotoUrl: result.dataUrl }));
      } catch (err: any) {
        alert(err?.message || 'Gagal memproses pas foto');
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleKipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran berkas KIP/PKH/BPJS maksimal 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData(prev => ({
            ...prev,
            lampiranKipPkhBpjs: event.target!.result as string,
            namaFileKipPkhBpjs: file.name
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [copiedRek, setCopiedRek] = useState<string | null>(null);

  const handleCopyRekening = (noRek: string) => {
    try {
      navigator.clipboard.writeText(noRek.replace(/[^0-9]/g, ''));
      setCopiedRek(noRek);
      setTimeout(() => setCopiedRek(null), 2500);
    } catch (_) {
      setCopiedRek(noRek);
      setTimeout(() => setCopiedRek(null), 2500);
    }
  };

  const handleBuktiBayarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran bukti pembayaran maksimal 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData(prev => ({
            ...prev,
            buktiPembayaranUrl: event.target!.result as string,
            statusPembayaran: 'Menunggu Verifikasi',
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFinalSubmit = () => {
    if (!formData.nisn || !formData.nikSiswa || !formData.namaLengkap) {
      alert('Lengkapi sekurang-kurangnya NISN, NIK, dan Nama Lengkap pada Identitas Peserta Didik.');
      return;
    }

    const emailToUse = formData.email || formData.emailSiswa || '';
    const finalAlamatKk = formData.alamatKk || formData.alamatLengkap || '';
    const finalAlamatDomisili = formData.alamatSamaDenganKk 
      ? finalAlamatKk 
      : (formData.alamatDomisili || finalAlamatKk);
    const finalAlamatLengkap = finalAlamatDomisili || finalAlamatKk || formData.alamatLengkap || '';

    const completedForm: FormulirPPDB = {
      ...(formData as FormulirPPDB),
      id: existingForm?.id || `spmb-${Date.now()}`,
      userId: currentUser?.id || `guest-${Date.now()}`,
      email: emailToUse,
      emailSiswa: emailToUse,
      alamatKk: finalAlamatKk,
      alamatDomisili: finalAlamatDomisili,
      alamatLengkap: finalAlamatLengkap,
      statusPendaftaran: 'Menunggu_Verifikasi',
      tanggalDaftar: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    onSaveFormulir(completedForm);
    setMode('verifikasi_berkas');
  };

  const currentDisplayForm: FormulirPPDB = useMemo(() => {
    if (existingForm) {
      return {
        ...existingForm,
        ...formData,
        statusPendaftaran: existingForm.statusPendaftaran || formData.statusPendaftaran || 'Menunggu_Verifikasi',
        catatanAdmin: existingForm.catatanAdmin || formData.catatanAdmin,
        nomorRegistrasi: existingForm.nomorRegistrasi || formData.nomorRegistrasi || `REG-${existingForm.id.substring(0, 8).toUpperCase()}`,
        nomorIndukSiswaResmi: existingForm.nomorIndukSiswaResmi || formData.nomorIndukSiswaResmi,
        kelasDiterima: existingForm.kelasDiterima || formData.kelasDiterima,
      } as FormulirPPDB;
    }
    return {
      id: `spmb-${currentUser?.id || 'calon-1'}`,
      userId: currentUser?.id || 'calon-1',
      pilihanJurusan: (formData.pilihanJurusan as JurusanPPDB) || (currentUser?.jurusan as JurusanPPDB) || 'Farmasi',
      statusPendaftaran: formData.statusPendaftaran || (currentUser?.role === 'calon_siswa' ? 'Menunggu_Verifikasi' : 'Proses_Isi'),
      tanggalDaftar: formData.tanggalDaftar || new Date().toISOString().replace('T', ' ').substring(0, 16),
      nisn: currentUser?.nipOrNis || currentUser?.username || formData.nisn || '',
      nikSiswa: formData.nikSiswa || '',
      noKk: formData.noKk || '',
      noAktaKelahiran: formData.noAktaKelahiran || '',
      namaLengkap: currentUser?.nama || formData.namaLengkap || 'Calon Siswa',
      namaPanggilan: formData.namaPanggilan || '',
      tempatLahir: formData.tempatLahir || 'Bogor',
      tanggalLahir: formData.tanggalLahir || '2008-05-15',
      jenisKelamin: formData.jenisKelamin || (currentUser?.jenisKelamin as any) || 'Perempuan',
      tinggiBadan: formData.tinggiBadan || 160,
      beratBadan: formData.beratBadan || 50,
      wargaNegara: formData.wargaNegara || 'Indonesia',
      noHp: currentUser?.telepon || formData.noHp || '',
      email: currentUser?.email || formData.email || '',
      emailSiswa: currentUser?.email || formData.emailSiswa || '',
      medsosSiswa: formData.medsosSiswa || '',
      jumlahSaudara: formData.jumlahSaudara || 2,
      anakKe: formData.anakKe || 1,
      agama: formData.agama || 'Islam',
      hobi: formData.hobi || 'Membaca',
      citaCita: formData.citaCita || 'Tenaga Kesehatan',
      prestasi: formData.prestasi || '',
      jarakSekolah: formData.jarakSekolah || '1-3 Km',
      transportasi: formData.transportasi || 'Motor',
      alamatLengkap: currentUser?.alamat || formData.alamatLengkap || 'Parung Panjang, Bogor',
      rt: formData.rt || '01',
      rw: formData.rw || '02',
      noRumah: formData.noRumah || '10',
      kodePos: formData.kodePos || '16360',
      desa: formData.desa || 'Parung Panjang',
      kecKab: formData.kecKab || 'Kec. Parung Panjang, Kab. Bogor',
      penyakitBerat: formData.penyakitBerat || 'Tidak Ada',
      alergi: formData.alergi || 'Tidak Ada',
      namaOrganisasi: formData.namaOrganisasi || 'OSIS / PMR',
      jabatanOrganisasi: formData.jabatanOrganisasi || 'Anggota',
      tahunLulusSd: formData.tahunLulusSd || '2020',
      tahunLulusSmp: formData.tahunLulusSmp || '2026',
      asalSmp: formData.asalSmp || 'SMP Negeri',
      noSeriIjazah: formData.noSeriIjazah || 'DN-01/D-SMP/26/000000',
      namaAyah: formData.namaAyah || '',
      nikAyah: formData.nikAyah || '',
      namaIbu: formData.namaIbu || '',
      nikIbu: formData.nikIbu || '',
      noTelpOrtu: formData.noTelpOrtu || '',
      alamatOrtu: formData.alamatOrtu || '',
      pendidikanAyah: formData.pendidikanAyah || 'SMA/MA/PAKET C',
      pendidikanIbu: formData.pendidikanIbu || 'SMA/MA/PAKET C',
      pekerjaanAyah: formData.pekerjaanAyah || 'Wiraswasta',
      pekerjaanIbu: formData.pekerjaanIbu || 'Ibu Rumah Tangga',
      pendapatanAyah: formData.pendapatanAyah || '3.000.000 s.d Rp. 5.000.000',
      pendapatanIbu: formData.pendapatanIbu || '< Rp. 1000.000',
      pasFotoUrl: formData.pasFotoUrl || fotoSmpHijab,
      catatanAdmin: formData.catatanAdmin,
      nomorRegistrasi: formData.nomorRegistrasi || `REG-${(currentUser?.nipOrNis || 'CALON').slice(-6)}`,
      nomorIndukSiswaResmi: formData.nomorIndukSiswaResmi,
      kelasDiterima: formData.kelasDiterima,
      memilikiKipPkhBpjs: formData.memilikiKipPkhBpjs || 'Tidak',
      jenisBantuan: formData.jenisBantuan || [],
      nomorKipPkhBpjs: formData.nomorKipPkhBpjs || '',
      namaFileKipPkhBpjs: formData.namaFileKipPkhBpjs || '',
      lampiranKipPkhBpjs: formData.lampiranKipPkhBpjs || '',
    } as FormulirPPDB;
  }, [existingForm, formData, currentUser]);

  const printableCardRef = useRef<HTMLDivElement>(null);

  const handleDownloadWord = () => {
    if (!currentDisplayForm) return;
    exportFormulirToWord(currentDisplayForm, schoolInfo);
  };

  const handleDownloadBuktiHTML = () => {
    if (!printableCardRef.current || !currentDisplayForm) return;
    const documentContent = printableCardRef.current.innerHTML;
    const cleanName = (currentDisplayForm.namaLengkap || 'Siswa').replace(/[^a-zA-Z0-9]/g, '_');
    const htmlTitle = `Formulir_Pendaftaran_PPDB_${cleanName}_${currentDisplayForm.nisn || currentDisplayForm.id}`;

    const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${htmlTitle}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #ffffff; padding: 20px; line-height: 1.4; font-size: 11px; }
    .printable-document { max-width: 820px; margin: 0 auto; }
    table { width: 100%; border-collapse: collapse; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="printable-document">
    ${documentContent}
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${htmlTitle}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Navigation / Header for SPMB */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold mb-2 border border-teal-200">
              <UserCheck className="w-3.5 h-3.5 text-teal-700" />
              <span>SISTEM SPMB ONLINE T.A. {schoolInfo?.tahunAjaranSPMB || '2026/2027'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
              <span className="text-teal-900">{schoolInfo?.gelombangSPMB || 'Gelombang 1'}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Sistem Penerimaan Murid Baru (SPMB) {schoolInfo?.nama || 'SMK Bakti Putra Mandiri'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              {schoolInfo?.alamatLengkap || 'Jl. Sawah, Kp. Sukasari, RT. 06/01, Desa Kabasiran, Kec. Parung Panjang, Kab. Bogor'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setMode('info')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'info' ? 'bg-teal-700 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Info SPMB & Kuota
            </button>

            {!currentUser && (
              <button
                onClick={() => setMode('daftar_akun')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'daftar_akun' ? 'bg-teal-700 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Daftar Akun Calon Siswa
              </button>
            )}

            {/* TAB VERIFIKASI BERKAS SPMB: Hanya muncul untuk Calon Siswa Baru SPMB, bukan siswa aktif */}
            {(currentUser?.role === 'calon_siswa' || (!currentUser && existingForm)) && (
              <button
                onClick={() => setMode('verifikasi_berkas')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                  mode === 'verifikasi_berkas'
                    ? 'bg-teal-700 text-white shadow-md ring-2 ring-teal-300'
                    : 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                }`}
                title="Cek kelengkapan dokumen dan status verifikasi berkas resmi SPMB"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verifikasi Berkas SPMB</span>
                {currentDisplayForm?.statusPendaftaran && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    currentDisplayForm.statusPendaftaran === 'Diterima' ? 'bg-emerald-600 text-white' :
                    currentDisplayForm.statusPendaftaran === 'Terverifikasi' ? 'bg-blue-600 text-white' :
                    currentDisplayForm.statusPendaftaran === 'Menunggu_Verifikasi' ? 'bg-amber-400 text-amber-950' :
                    currentDisplayForm.statusPendaftaran === 'Ditolak' ? 'bg-rose-600 text-white' :
                    'bg-slate-200 text-slate-800'
                  }`}>
                    {currentDisplayForm.statusPendaftaran.replace('_', ' ')}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => {
                if (!currentUser) {
                  alert('Formulir pendaftaran tidak dapat diakses kalau belum buat akun. Silakan buat akun calon siswa terlebih dahulu.');
                  setMode('daftar_akun');
                  return;
                }
                setMode('isi_form');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                mode === 'isi_form' ? 'bg-teal-700 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {!currentUser && <Lock className="w-3.5 h-3.5 text-amber-500" />}
              <span>Formulir Pendaftaran</span>
            </button>
            {(currentUser?.role === 'calon_siswa' && (formData.namaLengkap || formData.nisn || existingForm)) && (
              <button
                onClick={() => setMode('cetak_bukti')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'cetak_bukti' ? 'bg-teal-700 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Cetak Bukti SPMB
              </button>
            )}
          </div>
        </div>

        {/* Banner Akun Calon Siswa Aktif: Hanya untuk akun calon_siswa (bukan siswa aktif sekolah) */}
        {(currentUser?.role === 'calon_siswa' || (!currentUser && existingForm)) && (
          <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 border border-teal-700/60 rounded-2xl p-4 sm:p-5 mb-8 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-14 rounded-xl bg-white/10 border border-teal-400/40 overflow-hidden shrink-0 flex items-center justify-center">
                {currentDisplayForm.pasFotoUrl ? (
                  <img src={currentDisplayForm.pasFotoUrl} alt={currentDisplayForm.namaLengkap} className="w-full h-full object-cover" />
                ) : (
                  <UserCheck className="w-6 h-6 text-teal-300" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-sm sm:text-base text-white truncate uppercase">
                    {currentDisplayForm.namaLengkap}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-teal-800/80 border border-teal-400/30 text-teal-200 text-[10px] font-mono font-bold">
                    NISN: {currentDisplayForm.nisn}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    currentDisplayForm.statusPendaftaran === 'Diterima' ? 'bg-emerald-500 text-white' :
                    currentDisplayForm.statusPendaftaran === 'Terverifikasi' ? 'bg-blue-500 text-white' :
                    currentDisplayForm.statusPendaftaran === 'Menunggu_Verifikasi' ? 'bg-amber-400 text-amber-950' :
                    currentDisplayForm.statusPendaftaran === 'Ditolak' ? 'bg-rose-500 text-white' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    ● {currentDisplayForm.statusPendaftaran.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-teal-200 mt-1 truncate">
                  Pilihan Kejuruan: <strong className="text-white">{currentDisplayForm.pilihanJurusan}</strong> • Gelombang: {currentDisplayForm.gelombang || schoolInfo?.gelombangSPMB || '1'} • No. Reg: <span className="font-mono">{currentDisplayForm.nomorRegistrasi || `REG-${currentDisplayForm.id?.substring(0,8).toUpperCase()}`}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setMode('verifikasi_berkas')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  mode === 'verifikasi_berkas'
                    ? 'bg-teal-400 text-slate-950 shadow-md ring-2 ring-white font-extrabold'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>Verifikasi Berkas</span>
              </button>
              <button
                onClick={() => setMode('isi_form')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  mode === 'isi_form'
                    ? 'bg-teal-400 text-slate-950 shadow-md ring-2 ring-white font-extrabold'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-teal-300" />
                <span>Formulir</span>
              </button>
              <button
                onClick={() => setMode('cetak_bukti')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  mode === 'cetak_bukti'
                    ? 'bg-teal-400 text-slate-950 shadow-md ring-2 ring-white font-extrabold'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }`}
              >
                <Printer className="w-3.5 h-3.5 text-amber-300" />
                <span>Bukti SPMB</span>
              </button>
            </div>
          </div>
        )}

        {/* 1. Mode INFO & ALUR */}
        {mode === 'info' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-teal-800 to-emerald-900 rounded-2xl text-white p-6 sm:p-8 shadow-md">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                  <span className="px-2.5 py-1 rounded bg-teal-600/60 text-teal-100 text-xs font-bold uppercase tracking-wider">
                    Status: {schoolInfo?.statusSPMB === 'Buka' ? 'Pendaftaran SPMB Dibuka' : 'Pendaftaran SPMB Ditutup'}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold mt-2">
                    Portal Resmi SPMB Online {schoolInfo?.nama || 'SMK Bakti Putra Mandiri'}
                  </h2>
                  <p className="text-xs text-teal-200">
                    Akreditasi: <strong>{schoolInfo?.akreditasi || 'A (Unggul)'}</strong> • NPSN: <strong>{schoolInfo?.npsn || '69978901'}</strong>
                  </p>
                </div>
                <div className="text-left sm:text-right bg-black/30 p-3.5 rounded-2xl backdrop-blur-xs border border-white/20 shadow-inner">
                  <div className="text-[11px] text-teal-200 uppercase tracking-wider font-semibold">Sisa Kuota Tersedia</div>
                  <div className="text-3xl font-black text-amber-300">{quotaSummary.totalSisa} Kursi</div>
                  <div className="text-[10px] text-teal-200 mt-0.5">
                    Dari Total {quotaSummary.totalKapasitas} Kuota • Terisi: <strong>{quotaSummary.totalTerisi}</strong> Siswa Diterima
                  </div>
                  <div className="text-[10px] text-teal-300 font-mono mt-0.5">{schoolInfo?.gelombangSPMB || 'Gelombang 1'} • T.A. {schoolInfo?.tahunAjaranSPMB || '2026/2027'}</div>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-teal-100 max-w-3xl leading-relaxed mb-6">
                Sistem Penerimaan Murid Baru (SPMB) {schoolInfo?.nama || 'SMK Bakti Putra Mandiri'} menyelenggarakan seleksi penerimaan peserta didik baru secara transparan, akuntabel, dan terpadu. Lengkapi data identitas, unggah pas foto formal, dan cetak lembar bukti pendaftaran resmi.
              </p>

              {/* Live Quota Per Jurusan Breakdown Cards */}
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.values(quotaSummary.jurusan).map((j) => (
                  <div key={j.key} className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-teal-200">
                        <span className="truncate">{j.nama}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          j.sisa === 0 
                            ? 'bg-rose-500 text-white' 
                            : j.sisa < 10 
                            ? 'bg-amber-400 text-slate-950' 
                            : 'bg-teal-400 text-slate-950'
                        }`}>
                          {j.sisa === 0 ? 'Penuh' : `Sisa ${j.sisa}`}
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-lg font-black text-white">{j.sisa}</span>
                        <span className="text-[10px] text-teal-200">/ {j.kapasitas} kursi</span>
                      </div>
                      <div className="w-full bg-black/30 rounded-full h-1.5 mt-1.5 overflow-hidden">
                        <div 
                          className="bg-amber-400 h-1.5 rounded-full transition-all duration-500" 
                          style={{ width: `${j.persen}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-[9.5px] text-teal-200 mt-2 flex justify-between">
                      <span>Terisi: {j.terisi} Siswa</span>
                      <span>{j.persen}%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 3 Steps Visual Flow */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/15">
                  <div className="w-8 h-8 rounded-lg bg-teal-400 text-slate-900 font-bold flex items-center justify-center text-sm mb-2">
                    1
                  </div>
                  <h3 className="font-bold text-sm text-white">Buat Akun Mandiri</h3>
                  <p className="text-xs text-teal-100 mt-1">
                    Gunakan NISN asli dan kata sandi yang mudah diingat untuk akses login ke sistem.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/15">
                  <div className="w-8 h-8 rounded-lg bg-teal-400 text-slate-900 font-bold flex items-center justify-center text-sm mb-2">
                    2
                  </div>
                  <h3 className="font-bold text-sm text-white">Isi Formulir Lengkap</h3>
                  <p className="text-xs text-teal-100 mt-1">
                    Lengkapi Identitas Peserta Didik (Bagian A) dan Data Orang Tua/Wali (Bagian B).
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/15">
                  <div className="w-8 h-8 rounded-lg bg-teal-400 text-slate-900 font-bold flex items-center justify-center text-sm mb-2">
                    3
                  </div>
                  <h3 className="font-bold text-sm text-white">Cetak Bukti Registrasi</h3>
                  <p className="text-xs text-teal-100 mt-1">
                    Unduh dan cetak formulir resmi untuk dibawa saat tes wawancara dan pemeriksaan kesehatan.
                  </p>
                </div>
              </div>
            </div>

            {/* JADWAL & BENEFIT GELOMBANG PENDAFTARAN SPMB */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-black uppercase tracking-wider">
                      Jadwal Resmi
                    </span>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-teal-600" />
                      <span>Jadwal Gelombang Pendaftaran & Rentang Waktu SPMB</span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Perhatikan rentang tanggal pendaftaran, ketersediaan fasilitas seragam, serta keringanan biaya DSP pada masing-masing gelombang.
                  </p>
                </div>
                <div className="text-xs font-semibold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 shrink-0">
                  Tahun Ajaran SPMB: <strong>{schoolInfo?.tahunAjaranSPMB || '2026/2027'}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {(schoolInfo?.gelombangList && schoolInfo.gelombangList.length > 0 ? schoolInfo.gelombangList : INITIAL_GELOMBANG).map((gel, idx) => {
                  const isActive = (schoolInfo?.gelombangSPMB || '').trim().toLowerCase() === gel.nama.trim().toLowerCase();
                  
                  const formatIndo = (dStr?: string) => {
                    if (!dStr) return '-';
                    try {
                      const [y, m, d] = dStr.split('-');
                      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                      const mIdx = parseInt(m, 10) - 1;
                      return `${parseInt(d, 10)} ${months[mIdx] || m} ${y}`;
                    } catch (_) {
                      return dStr;
                    }
                  };

                  return (
                    <div 
                      key={gel.id || `gel-${idx}`}
                      className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col justify-between space-y-3 bg-white ${
                        isActive 
                          ? 'border-teal-500 shadow-md ring-2 ring-teal-200' 
                          : 'border-slate-200 shadow-xs hover:border-teal-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                            Gelombang #{gel.nomor || (idx + 1)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            gel.status === 'Buka'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : gel.status === 'Segera Dibuka'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-300'
                          }`}>
                            ● {gel.status}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-xs text-slate-900 leading-snug">
                          {gel.nama}
                        </h4>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>Rentang Waktu:</span>
                        </div>
                        <div className="font-bold text-slate-900 text-xs pl-5">
                          {formatIndo(gel.tanggalMulai)} <span className="text-slate-400 font-normal">s/d</span> {formatIndo(gel.tanggalSelesai)}
                        </div>
                        <div className="text-[10px] text-slate-500 pl-5">
                          Tahun Seleksi: <strong className="text-slate-700 font-bold">{gel.tahun || '2026'}</strong>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-[11px] text-slate-600">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Biaya Formulir:</span>
                          <span className="font-extrabold text-teal-800">
                            {gel.biayaPendaftaran && gel.biayaPendaftaran > 0 
                              ? `Rp ${gel.biayaPendaftaran.toLocaleString('id-ID')}` 
                              : 'Gratis (Rp 0)'}
                          </span>
                        </div>
                        {gel.diskonDSP && (
                          <div className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                            🎁 {gel.diskonDSP}
                          </div>
                        )}
                        {gel.keterangan && (
                          <div className="text-[10px] text-slate-500 line-clamp-2">
                            ℹ️ {gel.keterangan}
                          </div>
                        )}
                      </div>

                      {isActive && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50/80 py-1.5 rounded-xl">
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>Gelombang Pendaftaran Aktif Saat Ini</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Informasi Rekening Bank & Metode Pembayaran Pendaftaran */}
            <div className="bg-gradient-to-br from-teal-50/80 via-emerald-50/40 to-white rounded-3xl border-2 border-teal-200/80 p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-teal-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-700 text-white font-black text-[10px] uppercase tracking-wider">
                      Informasi Pembayaran
                    </span>
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-teal-700" />
                      <span>Metode & Rekening Resmi Pembayaran PPDB</span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Pembayaran biaya pendaftaran dapat dilakukan dengan transfer ke rekening resmi sekolah atau datang langsung secara tunai ke sekolah.
                  </p>
                </div>
              </div>

              {/* 2 Metode Pembayaran */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Metode 1: Transfer Bank */}
                <div className="p-4 rounded-2xl bg-white border border-teal-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Metode 1</span>
                      <h4 className="font-bold text-xs text-slate-900">Transfer Bank Resmi Sekolah</h4>
                    </div>
                  </div>

                  {/* List of Rekening Bank */}
                  <div className="space-y-2.5">
                    {(schoolInfo?.rekeningBankList && schoolInfo.rekeningBankList.length > 0 
                      ? schoolInfo.rekeningBankList 
                      : INITIAL_REKENING_BANK
                    ).map((rek, idx) => (
                      <div key={rek.id || `rek-${idx}`} className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                            {rek.namaBank}
                          </span>
                          {rek.isUtama && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[9px] border border-emerald-300">
                              UTAMA
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200">
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">No. Rekening</div>
                            <div className="font-mono font-black text-sm text-teal-900 tracking-wider">
                              {rek.nomorRekening}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyRekening(rek.nomorRekening)}
                            className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                            title="Salin nomor rekening"
                          >
                            {copiedRek === rek.nomorRekening ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="text-xs font-bold text-slate-800">
                          a.n. {rek.atasNama}
                        </div>
                        {rek.cabang && (
                          <div className="text-[10px] text-slate-500">
                            Kantor Cabang: {rek.cabang}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed italic">
                    *Harap simpan bukti transfer / tangkapan layar m-banking untuk diunggah pada formulir pendaftaran.
                  </p>
                </div>

                {/* Metode 2: Datang Langsung ke Sekolah */}
                <div className="p-4 rounded-2xl bg-white border border-teal-200 shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Metode 2</span>
                        <h4 className="font-bold text-xs text-slate-900">Datang Langsung ke Sekolah (Tunai)</h4>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-700 block text-[11px]">Tempat Pembayaran:</span>
                        <p className="font-bold text-slate-900 text-xs mt-0.5">
                          Loket Keuangan / Panitia PPDB Kampus SMK Bakti Putra Mandiri
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-slate-700 block text-[11px]">Alamat Sekolah:</span>
                        <p className="text-slate-600 text-[11px] mt-0.5">
                          {schoolInfo?.alamatLengkap || schoolInfo?.alamat || 'Jl. Sawah, Kp. Sukasari RT. 06/01, Desa Kabasiran, Kec. Parung Panjang, Kab. Bogor'}
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-slate-700 block text-[11px]">Jam Pelayanan Loket:</span>
                        <p className="text-slate-700 font-semibold text-[11px] mt-0.5 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-teal-600" />
                          <span>Senin – Sabtu: 08.00 – 15.00 WIB</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 font-medium">
                    ✓ Petugas loket sekolah akan langsung memberikan kuitansi resmi dan membantu verifikasi berkas pendaftaran Anda.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={() => setMode('daftar_akun')}
                className="px-8 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-lg shadow-teal-600/30 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Mulai Registrasi Akun Calon Siswa Sekarang
              </button>
            </div>
          </div>
        )}

        {/* 2. Mode DAFTAR AKUN BARU */}
        {mode === 'daftar_akun' && (
          <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center mx-auto mb-3">
                <UserPlus className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Registrasi Akun Calon Siswa</h2>
              <p className="text-xs text-slate-500 mt-1">
                Satu akun NISN hanya dapat didaftarkan satu kali untuk menghindari duplikasi berkas.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    NISN (10 Angka) *
                  </label>
                  {regNisn && regNisn.length < 10 && (
                    <span className="text-[10px] text-amber-600 font-semibold">
                      {regNisn.length}/10 digit
                    </span>
                  )}
                  {regNisn && regNisn.length === 10 && (
                    <span className="text-[10px] text-emerald-600 font-bold">
                      ✓ 10 digit valid
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  maxLength={10}
                  required
                  placeholder="Contoh: 0094701443 (10 Angka)"
                  value={regNisn}
                  onChange={(e) => setRegNisn(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                />
                <span className="text-[10px] text-slate-400">Pastikan NISN berjumlah 10 angka dan terdaftar resmi di Kemendikbudristek</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap (Sesuai Ijazah SMP) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama lengkap siswa"
                  value={regNama}
                  onChange={(e) => setRegNama(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp / HP *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="081234567890"
                    value={regHp}
                    onChange={(e) => setRegHp(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Aktif
                  </label>
                  <input
                    type="email"
                    placeholder="nama@email.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username Akun (Kustom / Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Gunakan NISN atau username sendiri"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Jika dikosongkan, NISN otomatis jadi username</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kata Sandi Akun PPDB *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Minimal 4 - 6 karakter"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Dibuat sendiri oleh calon siswa & terlihat oleh admin</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-4"
              >
                <span>Buat Akun & Lanjut ke Formulir</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* 3. Mode ISI FORMULIR (MULTI-STEP SESUAI PERMINTAAN LENGKAP) */}
        {mode === 'isi_form' && !currentUser && (
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 sm:p-10 border-2 border-slate-200 shadow-xl text-center space-y-6">
            <div className="w-18 h-18 mx-auto rounded-3xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
              <Lock className="w-9 h-9" />
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Wajib Registrasi / Login Akun Terlebih Dahulu</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                Formulir Pendaftaran Terkunci
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Formulir pendaftaran tidak dapat diakses kalau belum buat akun calon siswa. Silakan buat akun baru dengan NISN asli Anda atau masuk menggunakan akun yang sudah terdaftar.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-left text-xs text-teal-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                Keuntungan Membuat Akun Terlebih Dahulu:
              </p>
              <ul className="list-disc list-inside text-teal-800 space-y-0.5 text-[11px] pl-1">
                <li>Data formulir tersimpan otomatis di sistem</li>
                <li>Dapat mencetak ulang Lembar Bukti Registrasi kapan saja</li>
                <li>Memantau status verifikasi dan hasil seleksi langsung dari dashboard</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMode('daftar_akun')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>Buat Akun Calon Siswa Sekarang</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('info')}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
              >
                Kembali ke Info SPMB
              </button>
            </div>
          </div>
        )}

        {/* Fallback locked screen if trying to access isi_form without account */}
        {mode === 'isi_form' && !currentUser && (
          <div className="bg-white rounded-3xl shadow-md border-2 border-amber-200 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-inner">
              <Lock className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider">
                Akses Formulir Terkunci
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Formulir Pendaftaran Tidak Dapat Diakses Kalau Belum Buat Akun
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Calon peserta didik baru diwajibkan membuat akun resmi calon siswa terlebih dahulu menggunakan <strong>NISN</strong> dan <strong>Kata Sandi</strong> agar formulir dan nomor registrasi tersimpan aman.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-700 space-y-2 max-w-md mx-auto">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Tahapan Pendaftaran Siswa Baru:</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                <li>Klik tombol <strong>Buat Akun Calon Siswa</strong> di bawah ini.</li>
                <li>Isi NISN, Nama Lengkap, No. WhatsApp, dan Kata Sandi.</li>
                <li>Setelah akun terbit, Anda otomatis diarahkan mengisi Formulir Pendaftaran lengkap.</li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMode('daftar_akun')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Buat Akun Calon Siswa Sekarang</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('info')}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
              >
                Kembali ke Info SPMB
              </button>
            </div>
          </div>
        )}

        {mode === 'isi_form' && currentUser && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Step Tracker Header */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Formulir Pendaftaran Siswa Baru (PPDB Online)
                </h2>
                <p className="text-xs text-slate-500">
                  Tahap {step} dari 3: {step === 1 ? 'Pilihan Kompetensi Keahlian' : step === 2 ? 'Identitas Peserta Didik (Bagian A)' : 'Data Orang Tua / Wali (Bagian B)'}
                </p>
              </div>

              {/* Step indicator pills */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep(1)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    step === 1 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  1. Jurusan
                </button>
                <button
                  onClick={() => setStep(2)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    step === 2 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  2. Identitas (A)
                </button>
                <button
                  onClick={() => setStep(3)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    step === 3 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  3. Orang Tua (B)
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {/* STEP 1: PILIHAN JURUSAN */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-base font-bold text-slate-900">Pilihan Kompetensi Keahlian (Wajib Pilih 1)</h3>
                    <p className="text-xs text-slate-500">Pilih jurusan yang sesuai dengan minat dan bakat Anda.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      {
                        name: 'Farmasi' as JurusanPPDB,
                        desc: 'Farmasi Klinis & Komunitas, peracikan obat, dan apotek simulasi',
                        color: 'border-teal-500 bg-teal-50/50 text-teal-900',
                      },
                      {
                        name: 'Asisten Keperawatan' as JurusanPPDB,
                        desc: 'Pelayanan kebutuhan dasar manusia, TTV, dan bangsal rumah sakit mini',
                        color: 'border-sky-500 bg-sky-50/50 text-sky-900',
                      },
                      {
                        name: 'Tata Kecantikan & Spa' as JurusanPPDB,
                        desc: 'Perawatan kulit, spa aromaterapi, tata rias, dan beauty salon',
                        color: 'border-pink-500 bg-pink-50/50 text-pink-900',
                      },
                      {
                        name: 'Perhotelan' as JurusanPPDB,
                        desc: 'Front Office, Housekeeping, Food & Beverage, dan mockup hotel room',
                        color: 'border-amber-500 bg-amber-50/50 text-amber-900',
                      },
                    ].map((jur) => {
                      const isSelected = formData.pilihanJurusan === jur.name;
                      return (
                        <div
                          key={jur.name}
                          onClick={() => setFormData({ ...formData, pilihanJurusan: jur.name })}
                          className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? `${jur.color} shadow-sm`
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-slate-900">{jur.name}</span>
                            <input
                              type="radio"
                              name="jurusan"
                              checked={isSelected}
                              onChange={() => setFormData({ ...formData, pilihanJurusan: jur.name })}
                              className="text-teal-600 focus:ring-teal-500"
                            />
                          </div>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">{jur.desc}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pilihan Gelombang Pendaftaran SPMB (Sesuai Pengaturan Admin Sekolah) */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-teal-600" />
                          <span>Pilihan Gelombang Pendaftaran SPMB</span>
                        </h3>
                        <p className="text-xs text-slate-500">
                          Sistem otomatis merekomendasikan gelombang yang sedang aktif saat ini ({schoolInfo?.gelombangSPMB || 'Gelombang 1'}).
                        </p>
                      </div>
                      <div className="text-[11px] font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200 shrink-0 self-start sm:self-auto">
                        Gelombang Aktif: <strong>{schoolInfo?.gelombangSPMB || 'Gelombang 1'}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(schoolInfo?.gelombangList && schoolInfo.gelombangList.length > 0 ? schoolInfo.gelombangList : INITIAL_GELOMBANG).map((gel, idx) => {
                        const isCurrentActiveOfficial = (schoolInfo?.gelombangSPMB || '').toLowerCase() === gel.nama.toLowerCase() ||
                          (schoolInfo?.gelombangSPMB || '').toLowerCase().includes(`gelombang ${gel.nomor}`);
                        
                        const isSelectedInForm = (formData.gelombang || '').toLowerCase() === gel.nama.toLowerCase() ||
                          (formData.gelombang || '').toLowerCase().includes(`gelombang ${gel.nomor}`) ||
                          (!formData.gelombang && isCurrentActiveOfficial);

                        return (
                          <div
                            key={gel.id || `gel-opt-${idx}`}
                            onClick={() => setFormData({ ...formData, gelombang: gel.nama })}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                              isSelectedInForm
                                ? 'border-teal-600 bg-teal-50/60 shadow-sm ring-2 ring-teal-500/20'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono font-bold uppercase text-slate-500">
                                  Gelombang #{gel.nomor}
                                </span>
                                {isCurrentActiveOfficial && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[9px]">
                                    AKTIF SAAT INI
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-xs text-slate-900 leading-snug">{gel.nama}</h4>
                              <p className="text-[11px] text-slate-500">{gel.tanggalMulai} s/d {gel.tanggalSelesai}</p>
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-200/80 text-[10px] space-y-1">
                              <div className="flex justify-between font-semibold">
                                <span className="text-slate-500">Biaya:</span>
                                <span className="text-teal-700">{gel.biayaPendaftaran === 0 ? 'Gratis' : `Rp ${(gel.biayaPendaftaran ?? 0).toLocaleString('id-ID')}`}</span>
                              </div>
                              {gel.diskonDSP && (
                                <div className="flex justify-between text-amber-700 font-bold">
                                  <span>Keringanan:</span>
                                  <span>{gel.diskonDSP}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs flex items-center gap-2"
                    >
                      <span>Lanjut: Bagian A (Identitas Diri)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: KELOMPOK A - IDENTITAS PESERTA DIDIK (WAJIB DIISI) */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-[11px] font-bold uppercase">
                      BAGIAN A
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      IDENTITAS PESERTA DIDIK (WAJIB DIISI)
                    </h3>
                    <p className="text-xs text-slate-500">
                      *Jika data tidak ada, harus dilengkapi surat keterangan dari sekolah asal.
                    </p>
                  </div>

                  {/* UPLOAD PAS FOTO 3X4 RESMI CALON SISWA & CONTOH FOTO SERAGAM */}
                  <div className="p-5 rounded-2xl border-2 border-teal-200 bg-teal-50/30 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      <div className="relative group shrink-0">
                        <div className="w-28 h-36 rounded-xl border-2 border-dashed border-teal-500 bg-white flex flex-col items-center justify-center overflow-hidden shadow-sm">
                          {formData.pasFotoUrl ? (
                            <img 
                              src={formData.pasFotoUrl} 
                              alt="Pas Foto Calon Murid Baru" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="p-2 text-center text-slate-400">
                              <Camera className="w-8 h-8 mx-auto text-teal-600 mb-1" />
                              <span className="text-[10px] font-bold text-slate-600 block leading-tight">Pas Foto 3x4</span>
                            </div>
                          )}
                        </div>
                        {formData.pasFotoUrl && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, pasFotoUrl: '' })}
                            className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-5 h-5 flex items-center justify-center shadow text-xs"
                            title="Hapus Foto"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div className="flex-1 text-center sm:text-left space-y-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-1.5">
                            <Upload className="w-4 h-4 text-teal-700" />
                            <span>Upload Pas Foto Resmi Calon Siswa Baru (3x4) *</span>
                          </h4>
                          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                            Wajib menggunakan <strong>seragam sekolah asal (SMP / MTs)</strong> dengan latar belakang merah atau biru. Bagi pendaftar perempuan dapat mengenakan <strong>kerudung/hijab putih</strong> atau <strong>tanpa kerudung</strong> dengan rambut tertata rapi.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                          <label className="cursor-pointer px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs shadow-sm inline-flex items-center gap-1.5 transition-colors">
                            <Upload className="w-4 h-4" />
                            <span>{formData.pasFotoUrl ? 'Ganti Pas Foto' : 'Unggah File Foto'}</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handlePhotoUpload} 
                            />
                          </label>

                          {formData.pasFotoUrl && (
                            <span className="text-[11px] font-semibold text-teal-800 bg-teal-100 px-2.5 py-1 rounded-lg">
                              ✓ Foto Terpasang
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CONTOH FOTO SERAGAM SMP/MTS BERKERUDUNG & TANPA KERUDUNG */}
                    <div className="border-t border-teal-200/80 pt-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                          <span>Contoh Pas Foto Standar Seragam SMP/MTs (Klik untuk Gunakan):</span>
                        </span>
                        <span className="text-[10px] text-teal-800 font-medium">Latar Merah / Biru Resmi</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Contoh 1: Siswi Berkerudung */}
                        <div 
                          onClick={() => setFormData({ ...formData, pasFotoUrl: fotoSmpHijab })}
                          className={`p-2.5 rounded-xl border bg-white cursor-pointer transition-all flex items-center gap-3 hover:border-teal-500 hover:shadow-sm ${
                            formData.pasFotoUrl === fotoSmpHijab ? 'border-teal-600 ring-2 ring-teal-500/20 bg-teal-50/50' : 'border-slate-200'
                          }`}
                        >
                          <img 
                            src={fotoSmpHijab} 
                            alt="Contoh Siswi Berkerudung SMP/MTs" 
                            className="w-12 h-16 rounded-lg object-cover border border-slate-200 shadow-xs shrink-0" 
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold text-slate-900 leading-tight">
                              Siswi Berkerudung (SMP / MTs)
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Seragam putih-biru, kerudung putih rapi
                            </div>
                            <span className="inline-block mt-1 text-[10px] font-bold text-teal-700 hover:underline">
                              Gunakan Foto Ini →
                            </span>
                          </div>
                        </div>

                        {/* Contoh 2: Siswi Tanpa Kerudung */}
                        <div 
                          onClick={() => setFormData({ ...formData, pasFotoUrl: fotoSmpCewe })}
                          className={`p-2.5 rounded-xl border bg-white cursor-pointer transition-all flex items-center gap-3 hover:border-teal-500 hover:shadow-sm ${
                            formData.pasFotoUrl === fotoSmpCewe ? 'border-teal-600 ring-2 ring-teal-500/20 bg-teal-50/50' : 'border-slate-200'
                          }`}
                        >
                          <img 
                            src={fotoSmpCewe} 
                            alt="Contoh Siswi Tanpa Kerudung SMP" 
                            className="w-12 h-16 rounded-lg object-cover border border-slate-200 shadow-xs shrink-0" 
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold text-slate-900 leading-tight">
                              Siswi Tanpa Kerudung (SMP)
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Seragam putih-biru, dasi, rambut rapi
                            </div>
                            <span className="inline-block mt-1 text-[10px] font-bold text-teal-700 hover:underline">
                              Gunakan Foto Ini →
                            </span>
                          </div>
                        </div>

                        {/* Contoh 3: Siswa Laki-laki */}
                        <div 
                          onClick={() => setFormData({ ...formData, pasFotoUrl: fotoSmpCowo })}
                          className={`p-2.5 rounded-xl border bg-white cursor-pointer transition-all flex items-center gap-3 hover:border-teal-500 hover:shadow-sm ${
                            formData.pasFotoUrl === fotoSmpCowo ? 'border-teal-600 ring-2 ring-teal-500/20 bg-teal-50/50' : 'border-slate-200'
                          }`}
                        >
                          <img 
                            src={fotoSmpCowo} 
                            alt="Contoh Siswa Laki-laki SMP" 
                            className="w-12 h-16 rounded-lg object-cover border border-slate-200 shadow-xs shrink-0" 
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold text-slate-900 leading-tight">
                              Siswa Laki-laki (SMP)
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Seragam putih-biru, dasi, rambut pendek rapi
                            </div>
                            <span className="inline-block mt-1 text-[10px] font-bold text-teal-700 hover:underline">
                              Gunakan Foto Ini →
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Kependudukan */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          NISN * (10 Angka)
                        </label>
                        {formData.nisn && formData.nisn.length < 10 && (
                          <span className="text-[10px] text-amber-600 font-semibold">
                            {formData.nisn.length}/10 digit
                          </span>
                        )}
                        {formData.nisn && formData.nisn.length === 10 && (
                          <span className="text-[10px] text-emerald-600 font-bold">
                            ✓ 10 digit
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        maxLength={10}
                        value={formData.nisn || ''}
                        onChange={(e) => setFormData({ ...formData, nisn: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-teal-500 focus:outline-none font-mono"
                        placeholder="Contoh: 0094701443"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        NIK SISWA * (16 Angka)
                      </label>
                      <input
                        type="text"
                        maxLength={16}
                        value={formData.nikSiswa || ''}
                        onChange={(e) => setFormData({ ...formData, nikSiswa: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-teal-500 focus:outline-none font-mono"
                        placeholder="3201xxxxxxxxxxxx"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        NO. KARTU KELUARGA (KK) * (16 Angka)
                      </label>
                      <input
                        type="text"
                        maxLength={16}
                        value={formData.noKk || ''}
                        onChange={(e) => setFormData({ ...formData, noKk: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-teal-500 focus:outline-none font-mono"
                        placeholder="3201xxxxxxxxxxxx"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        NOMOR AKTA KELAHIRAN SISWA *
                      </label>
                      <input
                        type="text"
                        value={formData.noAktaKelahiran || ''}
                        onChange={(e) => setFormData({ ...formData, noAktaKelahiran: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-teal-500 focus:outline-none font-mono"
                        placeholder="Contoh: 3201-LT-14052008-0012"
                      />
                      <span className="text-[10px] text-slate-400 block mt-0.5">Sesuai kutipan akta kelahiran</span>
                    </div>
                  </div>

                  {/* Nama & Kelahiran */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Lengkap *
                      </label>
                      <input
                        type="text"
                        value={formData.namaLengkap || ''}
                        onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-teal-500 focus:outline-none uppercase font-semibold"
                        placeholder="Nama lengkap sesuai ijazah/akta"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Panggilan
                      </label>
                      <input
                        type="text"
                        value={formData.namaPanggilan || ''}
                        onChange={(e) => setFormData({ ...formData, namaPanggilan: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-teal-500 focus:outline-none"
                        placeholder="Nama panggilan akrab"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tempat Lahir
                      </label>
                      <input
                        type="text"
                        value={formData.tempatLahir || ''}
                        onChange={(e) => setFormData({ ...formData, tempatLahir: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                        placeholder="Kota / Kabupaten"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tanggal Lahir
                      </label>
                      <input
                        type="date"
                        value={formData.tanggalLahir || ''}
                        onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Jenis Kelamin
                      </label>
                      <div className="flex items-center gap-4 pt-1.5 text-xs">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="jk"
                            checked={formData.jenisKelamin === 'Laki-laki'}
                            onChange={() => setFormData({ ...formData, jenisKelamin: 'Laki-laki' })}
                          />
                          <span>Laki-laki</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="jk"
                            checked={formData.jenisKelamin === 'Perempuan'}
                            onChange={() => setFormData({ ...formData, jenisKelamin: 'Perempuan' })}
                          />
                          <span>Perempuan</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Warga Negara
                      </label>
                      <input
                        type="text"
                        value={formData.wargaNegara || 'Indonesia'}
                        onChange={(e) => setFormData({ ...formData, wargaNegara: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>

                  {/* Postur Tubuh & Kontak Siswa (Email Siswa, Medsos Siswa, No HP) */}
                  <div className="p-4 rounded-xl bg-teal-50/40 border border-teal-200/80 space-y-3">
                    <div className="font-bold text-xs text-teal-900 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-teal-700" />
                      <span>Kontak & Media Sosial Calon Siswa (Penting untuk Notifikasi Verifikasi)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Email Calon Siswa *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email || formData.emailSiswa || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value, emailSiswa: e.target.value })}
                          placeholder="contoh: calon.siswa@gmail.com"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-teal-500 bg-white"
                        />
                        <span className="text-[10px] text-teal-800 font-medium block mt-1">
                          ✉️ Notifikasi resmi status verifikasi pendaftaran akan otomatis dikirimkan ke email ini.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Media Sosial Siswa (Medsos)
                        </label>
                        <input
                          type="text"
                          value={formData.medsosSiswa || ''}
                          onChange={(e) => setFormData({ ...formData, medsosSiswa: e.target.value })}
                          placeholder="Contoh: @username (Instagram / TikTok / FB)"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-teal-500 bg-white"
                        />
                        <span className="text-[10px] text-slate-500 block mt-1">
                          Akun Instagram, TikTok, atau Facebook siswa
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          No. WhatsApp / HP Siswa *
                        </label>
                        <input
                          type="tel"
                          value={formData.noHp || formData.nomorHp || ''}
                          onChange={(e) => setFormData({ ...formData, noHp: e.target.value, nomorHp: e.target.value })}
                          placeholder="08xxxxxxxxxx"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-teal-500 bg-white font-mono"
                        />
                        <span className="text-[10px] text-slate-500 block mt-1">
                          Nomor aktif WhatsApp calon siswa
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Postur Tubuh & Saudara */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tinggi Badan (cm)
                      </label>
                      <input
                        type="number"
                        value={formData.tinggiBadan || ''}
                        onChange={(e) => setFormData({ ...formData, tinggiBadan: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                        placeholder="Contoh: 160"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Berat Badan (kg)
                      </label>
                      <input
                        type="number"
                        value={formData.beratBadan || ''}
                        onChange={(e) => setFormData({ ...formData, beratBadan: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                        placeholder="Contoh: 50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Jumlah Saudara
                      </label>
                      <input
                        type="number"
                        value={formData.jumlahSaudara || 0}
                        onChange={(e) => setFormData({ ...formData, jumlahSaudara: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Anak ke
                      </label>
                      <input
                        type="number"
                        value={formData.anakKe || 1}
                        onChange={(e) => setFormData({ ...formData, anakKe: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>

                  {/* Agama & Cita-Cita & Hobi */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Agama (Pilihan)
                      </label>
                      <select
                        value={formData.agama || 'Islam'}
                        onChange={(e) => setFormData({ ...formData, agama: e.target.value as any })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                      >
                        <option value="Islam">A. Islam</option>
                        <option value="Katholik">B. Katholik</option>
                        <option value="Protestan">C. Protestan</option>
                        <option value="Budha">D. Budha</option>
                        <option value="Hindu">E. Hindu</option>
                        <option value="Khonghucu">F. Khonghucu</option>
                        <option value="Lainnya">G. Lainnya</option>
                      </select>
                      {formData.agama === 'Lainnya' && (
                        <div className="mt-2">
                          <label className="block text-[10px] font-bold text-teal-800 mb-0.5">
                            Tuliskan Agama Anda:
                          </label>
                          <input
                            type="text"
                            placeholder="Tuliskan nama agama atau kepercayaan Anda..."
                            value={formData.agamaLainnya || ''}
                            onChange={(e) => setFormData({ ...formData, agamaLainnya: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-teal-400 bg-teal-50/50 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Hobi
                      </label>
                      <select
                        value={formData.hobi || 'Olah Raga'}
                        onChange={(e) => setFormData({ ...formData, hobi: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-teal-500"
                      >
                        <option value="Olah Raga">A. Olah Raga</option>
                        <option value="Kesenian">B. Kesenian</option>
                        <option value="Membaca">C. Membaca</option>
                        <option value="Menulis">D. Menulis</option>
                        <option value="Traveling">E. Traveling</option>
                        <option value="Lainnya">F. Lainnya</option>
                      </select>
                      {formData.hobi === 'Lainnya' && (
                        <div className="mt-2">
                          <label className="block text-[10px] font-bold text-teal-800 mb-0.5">
                            Tuliskan Hobi Anda:
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Desain Grafis, Robotika, Fotografi, dll."
                            value={formData.hobiLainnya || ''}
                            onChange={(e) => setFormData({ ...formData, hobiLainnya: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-teal-400 bg-teal-50/50 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cita - Cita
                      </label>
                      <select
                        value={formData.citaCita || 'APOTEKER'}
                        onChange={(e) => setFormData({ ...formData, citaCita: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-teal-500"
                      >
                        <option value="APOTEKER">A. APOTEKER</option>
                        <option value="BIDAN">B. BIDAN</option>
                        <option value="GURU/DOSEN">C. GURU/DOSEN</option>
                        <option value="DOKTER">D. DOKTER</option>
                        <option value="PERAWAT">E. PERAWAT</option>
                        <option value="Lainnya">F. Lainnya</option>
                      </select>
                      {formData.citaCita === 'Lainnya' && (
                        <div className="mt-2">
                          <label className="block text-[10px] font-bold text-teal-800 mb-0.5">
                            Tuliskan Cita-Cita Anda:
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Apoteker Industri, Ahli Gizi, Programmer, dll."
                            value={formData.citaCitaLainnya || ''}
                            onChange={(e) => setFormData({ ...formData, citaCitaLainnya: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-teal-400 bg-teal-50/50 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Jarak, Transportasi & Prestasi */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Jarak ke Sekolah
                      </label>
                      <select
                        value={formData.jarakSekolah || '1-3 Km'}
                        onChange={(e) => setFormData({ ...formData, jarakSekolah: e.target.value as any })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                      >
                        <option value="0-1 Km">A. 0-1 Km</option>
                        <option value="1-3 Km">B. 1-3 Km</option>
                        <option value="3-5 Km">C. 3-5 Km</option>
                        <option value="5-10 Km">D. 5-10 Km</option>
                        <option value="> 10 Km">E. &gt; 10 Km</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Transportasi
                      </label>
                      <select
                        value={formData.transportasi || 'Motor'}
                        onChange={(e) => setFormData({ ...formData, transportasi: e.target.value as any })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                      >
                        <option value="Jalan Kaki">A. Jalan Kaki</option>
                        <option value="Sepeda">B. Sepeda</option>
                        <option value="Motor">C. Motor</option>
                        <option value="Mobil Pribadi">D. Mobil Pribadi</option>
                        <option value="Antar Jemput Sekolah">E. Antar Jemput Sekolah</option>
                        <option value="Angkutan Umum">F. Angkutan Umum</option>
                        <option value="Lainnya">G. Lainnya</option>
                      </select>
                      {formData.transportasi === 'Lainnya' && (
                        <div className="mt-2">
                          <label className="block text-[10px] font-bold text-teal-800 mb-0.5">
                            Tuliskan Transportasi yang Digunakan:
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Kereta Commuter Line / Ojek Online..."
                            value={formData.transportasiLainnya || ''}
                            onChange={(e) => setFormData({ ...formData, transportasiLainnya: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-teal-400 bg-teal-50/50 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Prestasi yang Pernah Diraih
                      </label>
                      <input
                        type="text"
                        placeholder="Misal: Juara 2 PMR / OSN IPA"
                        value={formData.prestasi || ''}
                        onChange={(e) => setFormData({ ...formData, prestasi: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>

                  {/* ALAMAT TINGGAL BERDASARKAN KK & ALAMAT DOMISILI */}
                  <div className="space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div>
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                        <MapPin className="w-4 h-4 text-teal-600" />
                        <span>Alamat Tempat Tinggal Berdasarkan Kartu Keluarga (KK) *</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Tuliskan alamat lengkap sesuai data yang tercantum pada lembar Kartu Keluarga resmi.
                      </p>
                    </div>

                    <textarea
                      rows={2}
                      placeholder="Jalan, Kp, Dusun, Gang, Blok tempat tinggal sesuai KK..."
                      value={formData.alamatKk || formData.alamatLengkap || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          alamatKk: val,
                          alamatLengkap: val,
                          alamatDomisili: prev.alamatSamaDenganKk ? val : prev.alamatDomisili
                        }));
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-teal-500"
                    />

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                      <div>
                        <label className="block text-[11px] text-slate-600">RT</label>
                        <input
                          type="text"
                          value={formData.rt || ''}
                          onChange={(e) => setFormData({ ...formData, rt: e.target.value })}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white"
                          placeholder="01"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600">RW</label>
                        <input
                          type="text"
                          value={formData.rw || ''}
                          onChange={(e) => setFormData({ ...formData, rw: e.target.value })}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white"
                          placeholder="02"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600">No. Rumah</label>
                        <input
                          type="text"
                          value={formData.noRumah || ''}
                          onChange={(e) => setFormData({ ...formData, noRumah: e.target.value })}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white"
                          placeholder="12"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600">Kode Pos</label>
                        <input
                          type="text"
                          value={formData.kodePos || ''}
                          onChange={(e) => setFormData({ ...formData, kodePos: e.target.value })}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white font-mono"
                          placeholder="16360"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600">Desa/Kel.</label>
                        <input
                          type="text"
                          value={formData.desa || ''}
                          onChange={(e) => setFormData({ ...formData, desa: e.target.value })}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white"
                          placeholder="Parung Panjang"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600">Kec / Kab.</label>
                        <input
                          type="text"
                          value={formData.kecKab || ''}
                          onChange={(e) => setFormData({ ...formData, kecKab: e.target.value })}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white"
                          placeholder="Bogor"
                        />
                      </div>
                    </div>

                    {/* Checkbox: Alamat Domisili dan KK Sama */}
                    <div className="pt-2 border-t border-slate-200">
                      <label className="inline-flex items-start gap-2.5 cursor-pointer select-none bg-white p-3 rounded-xl border border-teal-300 hover:bg-teal-50/40 transition-all w-full">
                        <input
                          type="checkbox"
                          checked={formData.alamatSamaDenganKk !== false}
                          onChange={(e) => {
                            const isSame = e.target.checked;
                            setFormData(prev => ({
                              ...prev,
                              alamatSamaDenganKk: isSame,
                              alamatDomisili: isSame ? (prev.alamatKk || prev.alamatLengkap || '') : prev.alamatDomisili
                            }));
                          }}
                          className="w-4 h-4 text-teal-600 rounded mt-0.5 focus:ring-teal-500 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            Alamat Tinggal Domisili Sama Persis dengan Alamat di KK
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            (Jika alamat domisili dan KK sama, klik di sini sehingga Anda tidak perlu mengisi alamat lagi).
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* Jika Tidak Sama: Tampilkan Isian Alamat Domisili Terpisah */}
                    {formData.alamatSamaDenganKk === false && (
                      <div className="pt-2 space-y-2 animate-fadeIn bg-amber-50/70 p-3.5 rounded-xl border border-amber-300">
                        <label className="block text-xs font-bold text-amber-950">
                          Alamat Tinggal Domisili Saat Ini (Berbeda dari KK) *
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Tuliskan alamat tempat tinggal / domisili Anda saat ini secara lengkap (Jalan, RT/RW, Desa, Kecamatan, Kota)..."
                          value={formData.alamatDomisili || ''}
                          onChange={(e) => setFormData({ ...formData, alamatDomisili: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-amber-300 bg-white focus:ring-amber-500"
                          autoFocus
                        />
                        <p className="text-[10px] text-amber-800">
                          *Alamat ini akan digunakan untuk korespondensi pengiriman dokumen dan peninjauan zonasi tempat tinggal peserta didik.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Riwayat Kesehatan, Organisasi, Data Kelulusan */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Penyakit Berat yang Pernah Diderita
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Asma / Tidak Ada"
                        value={formData.penyakitBerat || ''}
                        onChange={(e) => setFormData({ ...formData, penyakitBerat: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Alergi yang Diderita
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Alergi Dingin / Obat Tertentu"
                        value={formData.alergi || ''}
                        onChange={(e) => setFormData({ ...formData, alergi: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                      <GraduationCap className="w-4 h-4 text-teal-600" />
                      <span>Riwayat Pendidikan Dasar (SD/MI) & Menengah Pertama (SMP/MTs)</span>
                    </div>

                    {/* Jenjang SD / MI */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Keterangan Asal Sekolah SD/MI/Sederajat *
                        </label>
                        <input
                          type="text"
                          placeholder="Misal: SDN Parung Panjang 01 / MI Nurul Falah..."
                          value={formData.asalSekolahSD || ''}
                          onChange={(e) => setFormData({ ...formData, asalSekolahSD: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Tahun Lulus SD/MI
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="2020"
                          value={formData.tahunLulusSd || ''}
                          onChange={(e) => setFormData({ ...formData, tahunLulusSd: e.target.value.replace(/\D/g, '') })}
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Jenjang SMP / MTs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Asal Sekolah SMP/MTs/Sederajat *
                        </label>
                        <input
                          type="text"
                          placeholder="SMP Negeri 1 / MTs..."
                          value={formData.asalSmp || formData.asalSekolahSMP || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData({ ...formData, asalSmp: val, asalSekolahSMP: val });
                          }}
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Tahun Lulus SMP/MTs
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="2026"
                          value={formData.tahunLulusSmp || ''}
                          onChange={(e) => setFormData({ ...formData, tahunLulusSmp: e.target.value.replace(/\D/g, '') })}
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nomor Seri Ijazah SMP/MTs/Sederajat *
                        </label>
                        <input
                          type="text"
                          placeholder="DN-01/D-SMP/K13/26/0000000"
                          value={formData.noSeriIjazahSMP || formData.noSeriIjazah || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData({ ...formData, noSeriIjazahSMP: val, noSeriIjazah: val });
                          }}
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Navigation Button */}
                  <div className="pt-4 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Kembali ke Jurusan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs flex items-center gap-2"
                    >
                      <span>Lanjut: Bagian B (Data Orang Tua)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: KELOMPOK B - DATA ORANGTUA / WALI */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-[11px] font-bold uppercase">
                      BAGIAN B
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      DATA ORANGTUA / WALI
                    </h3>
                    <p className="text-xs text-slate-500">
                      Lengkapi data ayah, ibu, atau wali peserta didik sesuai dokumen resmi Kartu Keluarga.
                    </p>
                  </div>

                  {/* Ayah & Ibu */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Data Ayah */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="font-bold text-xs text-teal-800 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                        <span>1. Data Ayah Kandung</span>
                        {formData.pekerjaanAyah === 'SUDAH MENINGGAL' && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                            Almarhum
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Nama Ayah *
                        </label>
                        <input
                          type="text"
                          value={formData.namaAyah || ''}
                          onChange={(e) => setFormData({ ...formData, namaAyah: e.target.value })}
                          placeholder="Nama lengkap ayah kandung"
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white uppercase font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          NIK Ayah (16 Angka)
                        </label>
                        <input
                          type="text"
                          maxLength={16}
                          value={formData.nikAyah || ''}
                          onChange={(e) => setFormData({ ...formData, nikAyah: e.target.value.replace(/\D/g, '') })}
                          placeholder="3201xxxxxxxxxxxx"
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Pendidikan Terakhir Ayah
                        </label>
                        <select
                          value={formData.pendidikanAyah || 'SMA/MA/PAKET C'}
                          onChange={(e) => setFormData({ ...formData, pendidikanAyah: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                        >
                          <option value="TIDAK TAMAT SD/MI/PAKET A">[A] TIDAK TAMAT SD/MI/PAKET A</option>
                          <option value="SD/MI/PAKET A">[B] SD/MI/PAKET A</option>
                          <option value="SMP/MTs/PAKET B">[C] SMP/MTs/PAKET B</option>
                          <option value="SMA/MA/PAKET C">[D] SMA/MA/PAKET C</option>
                          <option value="D1 & 2">[E] D1 & 2</option>
                          <option value="D3 & 4">[F] D3 & 4</option>
                          <option value="S1">[G] S1</option>
                          <option value="S2">[H] S2</option>
                          <option value="S3">[I] S3</option>
                          <option value="LAINNYA">[J] LAINNYA</option>
                        </select>
                        {formData.pendidikanAyah === 'LAINNYA' && (
                          <div className="mt-2">
                            <label className="block text-[10px] font-bold text-teal-800 mb-0.5">
                              Tuliskan Pendidikan Terakhir Ayah:
                            </label>
                            <input
                              type="text"
                              placeholder="Tuliskan jenjang pendidikan ayah..."
                              value={formData.pendidikanAyahLainnya || ''}
                              onChange={(e) => setFormData({ ...formData, pendidikanAyahLainnya: e.target.value })}
                              className="w-full px-3 py-1.5 text-xs rounded border border-teal-400 bg-teal-50/50 text-slate-800 placeholder:text-slate-400 focus:outline-none"
                              autoFocus
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Pekerjaan Ayah
                        </label>
                        <select
                          value={formData.pekerjaanAyah || 'PEGAWAI SWASTA'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              pekerjaanAyah: val,
                              // If father is deceased, offer or enable guardian choice
                              punyaWali: val === 'SUDAH MENINGGAL' || prev.pekerjaanIbu === 'SUDAH MENINGGAL' ? 'Ya' : prev.punyaWali
                            }));
                          }}
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                        >
                          <option value="PNS">[A] PNS (Selain C dan D)</option>
                          <option value="TNI/POLRI">[B] TNI/POLRI</option>
                          <option value="DOSEN/GURU">[C] DOSEN/GURU</option>
                          <option value="DOKTER">[D] DOKTER</option>
                          <option value="POLITIKUS">[E] POLITIKUS</option>
                          <option value="PEGAWAI SWASTA">[F] PEGAWAI SWASTA</option>
                          <option value="PEDAGANG/WIRASWASTA">[G] PEDAGANG/WIRASWASTA</option>
                          <option value="PETANI/PETERNAK">[H] PETANI/PETERNAK</option>
                          <option value="SENIMAN/ARTIS">[I] SENIMAN/ARTIS</option>
                          <option value="BURUH">[J] BURUH</option>
                          <option value="DIRUMAH SAJA">[K] DIRUMAH SAJA</option>
                          <option value="SUDAH MENINGGAL">[L] SUDAH MENINGGAL</option>
                          <option value="LAINNYA">[M] LAINNYA</option>
                        </select>
                        {formData.pekerjaanAyah === 'LAINNYA' && (
                          <div className="mt-2">
                            <label className="block text-[10px] font-bold text-teal-800 mb-0.5">
                              Tuliskan Pekerjaan Ayah:
                            </label>
                            <input
                              type="text"
                              placeholder="Tuliskan jenis pekerjaan ayah..."
                              value={formData.pekerjaanAyahLainnya || ''}
                              onChange={(e) => setFormData({ ...formData, pekerjaanAyahLainnya: e.target.value })}
                              className="w-full px-3 py-1.5 text-xs rounded border border-teal-400 bg-teal-50/50 text-slate-800 placeholder:text-slate-400 focus:outline-none"
                              autoFocus
                            />
                          </div>
                        )}
                        {formData.pekerjaanAyah === 'SUDAH MENINGGAL' && (
                          <div className="mt-1.5 p-2 rounded bg-slate-100 text-[11px] text-slate-600">
                            Ayah kandung tercatat telah meninggal dunia. Silakan isi data Wali Murid pada bagian bawah jika memiliki wali.
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Pendapatan Ayah per Bulan
                        </label>
                        <select
                          value={formData.pendapatanAyah || '3.000.000 s.d Rp. 5.000.000'}
                          onChange={(e) => setFormData({ ...formData, pendapatanAyah: e.target.value })}
                          disabled={formData.pekerjaanAyah === 'SUDAH MENINGGAL'}
                          className={`w-full px-3 py-1.5 text-xs rounded border border-slate-300 ${
                            formData.pekerjaanAyah === 'SUDAH MENINGGAL' ? 'bg-slate-100 text-slate-400' : 'bg-white'
                          }`}
                        >
                          <option value="< Rp. 1000.000">[A] &lt; Rp. 1.000.000</option>
                          <option value="1.000.000 s.d Rp.3.000.000">[B] Rp. 1.000.000 s.d Rp. 3.000.000</option>
                          <option value="3.000.000 s.d Rp. 5.000.000">[C] Rp. 3.000.000 s.d Rp. 5.000.000</option>
                          <option value="> Rp. 5.000.000">[D] &gt; Rp. 5.000.000</option>
                          <option value="Tidak Berpenghasilan / 0">[E] Tidak Berpenghasilan / Rp 0</option>
                        </select>
                      </div>
                    </div>

                    {/* Data Ibu */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="font-bold text-xs text-teal-800 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                        <span>2. Data Ibu Kandung</span>
                        {formData.pekerjaanIbu === 'SUDAH MENINGGAL' && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                            Almarhumah
                          </span>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Nama Ibu *
                        </label>
                        <input
                          type="text"
                          value={formData.namaIbu || ''}
                          onChange={(e) => setFormData({ ...formData, namaIbu: e.target.value })}
                          placeholder="Nama lengkap ibu kandung"
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white uppercase font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          NIK Ibu (16 Angka)
                        </label>
                        <input
                          type="text"
                          maxLength={16}
                          value={formData.nikIbu || ''}
                          onChange={(e) => setFormData({ ...formData, nikIbu: e.target.value.replace(/\D/g, '') })}
                          placeholder="3201xxxxxxxxxxxx"
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Pendidikan Terakhir Ibu
                        </label>
                        <select
                          value={formData.pendidikanIbu || 'SMA/MA/PAKET C'}
                          onChange={(e) => setFormData({ ...formData, pendidikanIbu: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                        >
                          <option value="TIDAK TAMAT SD/MI/PAKET A">[A] TIDAK TAMAT SD/MI/PAKET A</option>
                          <option value="SD/MI/PAKET A">[B] SD/MI/PAKET A</option>
                          <option value="SMP/MTs/PAKET B">[C] SMP/MTs/PAKET B</option>
                          <option value="SMA/MA/PAKET C">[D] SMA/MA/PAKET C</option>
                          <option value="D1 & 2">[E] D1 & 2</option>
                          <option value="D3 & 4">[F] D3 & 4</option>
                          <option value="S1">[G] S1</option>
                          <option value="S2">[H] S2</option>
                          <option value="S3">[I] S3</option>
                          <option value="LAINNYA">[J] LAINNYA</option>
                        </select>
                        {formData.pendidikanIbu === 'LAINNYA' && (
                          <div className="mt-2">
                            <label className="block text-[10px] font-bold text-teal-800 mb-0.5">
                              Tuliskan Pendidikan Terakhir Ibu:
                            </label>
                            <input
                              type="text"
                              placeholder="Tuliskan jenjang pendidikan ibu..."
                              value={formData.pendidikanIbuLainnya || ''}
                              onChange={(e) => setFormData({ ...formData, pendidikanIbuLainnya: e.target.value })}
                              className="w-full px-3 py-1.5 text-xs rounded border border-teal-400 bg-teal-50/50 text-slate-800 placeholder:text-slate-400 focus:outline-none"
                              autoFocus
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Pekerjaan Ibu
                        </label>
                        <select
                          value={formData.pekerjaanIbu || 'DIRUMAH SAJA'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              pekerjaanIbu: val,
                              punyaWali: val === 'SUDAH MENINGGAL' || prev.pekerjaanAyah === 'SUDAH MENINGGAL' ? 'Ya' : prev.punyaWali
                            }));
                          }}
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                        >
                          <option value="PNS">[A] PNS (Selain C dan D)</option>
                          <option value="TNI/POLRI">[B] TNI/POLRI</option>
                          <option value="DOSEN/GURU">[C] DOSEN/GURU</option>
                          <option value="DOKTER">[D] DOKTER</option>
                          <option value="POLITIKUS">[E] POLITIKUS</option>
                          <option value="PEGAWAI SWASTA">[F] PEGAWAI SWASTA</option>
                          <option value="PEDAGANG/WIRASWASTA">[G] PEDAGANG/WIRASWASTA</option>
                          <option value="PETANI/PETERNAK">[H] PETANI/PETERNAK</option>
                          <option value="SENIMAN/ARTIS">[I] SENIMAN/ARTIS</option>
                          <option value="BURUH">[J] BURUH</option>
                          <option value="DIRUMAH SAJA">[K] DIRUMAH SAJA</option>
                          <option value="SUDAH MENINGGAL">[L] SUDAH MENINGGAL</option>
                          <option value="LAINNYA">[M] LAINNYA</option>
                        </select>
                        {formData.pekerjaanIbu === 'LAINNYA' && (
                          <div className="mt-2">
                            <label className="block text-[10px] font-bold text-teal-800 mb-0.5">
                              Tuliskan Pekerjaan Ibu:
                            </label>
                            <input
                              type="text"
                              placeholder="Tuliskan jenis pekerjaan ibu..."
                              value={formData.pekerjaanIbuLainnya || ''}
                              onChange={(e) => setFormData({ ...formData, pekerjaanIbuLainnya: e.target.value })}
                              className="w-full px-3 py-1.5 text-xs rounded border border-teal-400 bg-teal-50/50 text-slate-800 placeholder:text-slate-400 focus:outline-none"
                              autoFocus
                            />
                          </div>
                        )}
                        {formData.pekerjaanIbu === 'SUDAH MENINGGAL' && (
                          <div className="mt-1.5 p-2 rounded bg-slate-100 text-[11px] text-slate-600">
                            Ibu kandung tercatat telah meninggal dunia. Silakan isi data Wali Murid pada bagian bawah jika memiliki wali.
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Pendapatan Ibu per Bulan
                        </label>
                        <select
                          value={formData.pendapatanIbu || '< Rp. 1000.000'}
                          onChange={(e) => setFormData({ ...formData, pendapatanIbu: e.target.value })}
                          disabled={formData.pekerjaanIbu === 'SUDAH MENINGGAL'}
                          className={`w-full px-3 py-1.5 text-xs rounded border border-slate-300 ${
                            formData.pekerjaanIbu === 'SUDAH MENINGGAL' ? 'bg-slate-100 text-slate-400' : 'bg-white'
                          }`}
                        >
                          <option value="< Rp. 1000.000">[A] &lt; Rp. 1.000.000</option>
                          <option value="1.000.000 s.d Rp.3.000.000">[B] Rp. 1.000.000 s.d Rp. 3.000.000</option>
                          <option value="3.000.000 s.d Rp. 5.000.000">[C] Rp. 3.000.000 s.d Rp. 5.000.000</option>
                          <option value="> Rp. 5.000.000">[D] &gt; Rp. 5.000.000</option>
                          <option value="Tidak Berpenghasilan / 0">[E] Tidak Berpenghasilan / Rp 0</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SMART WALI SECTION: Muncul ketika orang tua sudah meninggal atau memilih memiliki wali */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-teal-700" />
                          <span>Apakah Peserta Didik Mempunyai Wali Murid?</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {formData.pekerjaanAyah === 'SUDAH MENINGGAL' || formData.pekerjaanIbu === 'SUDAH MENINGGAL'
                            ? 'Orang tua tercatat sudah meninggal. Disarankan melengkapi biodata wali murid yang mengasuh.'
                            : 'Wali murid diisi apabila calon peserta didik tinggal bersama atau diasuh oleh wali (paman, kakek, kakak, dll).'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, punyaWali: 'Tidak' }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            formData.punyaWali !== 'Ya'
                              ? 'bg-slate-700 text-white shadow-xs'
                              : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Tidak Mempunyai Wali
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, punyaWali: 'Ya' }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            formData.punyaWali === 'Ya'
                              ? 'bg-teal-600 text-white shadow-xs'
                              : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Ya, Mempunyai Wali Murid
                        </button>
                      </div>
                    </div>

                    {/* BIODATA WALI LENGKAP (Muncul saat punyaWali === 'Ya') */}
                    {formData.punyaWali === 'Ya' && (
                      <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 space-y-3 animate-fadeIn">
                        <div className="text-xs font-bold text-teal-900 border-b border-teal-200/60 pb-1.5">
                          Biodata Lengkap Wali Murid
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Nama Lengkap Wali *
                            </label>
                            <input
                              type="text"
                              value={formData.namaWali || ''}
                              onChange={(e) => setFormData({ ...formData, namaWali: e.target.value })}
                              placeholder="Nama lengkap wali murid"
                              className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white uppercase font-medium"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              NIK Wali (16 Angka)
                            </label>
                            <input
                              type="text"
                              maxLength={16}
                              value={formData.nikWali || ''}
                              onChange={(e) => setFormData({ ...formData, nikWali: e.target.value.replace(/\D/g, '') })}
                              placeholder="3201xxxxxxxxxxxx"
                              className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Hubungan dengan Calon Siswa *
                            </label>
                            <select
                              value={formData.hubunganWali || 'Paman / Bibi'}
                              onChange={(e) => setFormData({ ...formData, hubunganWali: e.target.value })}
                              className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                            >
                              <option value="Paman / Bibi">Paman / Bibi</option>
                              <option value="Kakek / Nenek">Kakek / Nenek</option>
                              <option value="Kakak Kandung">Kakak Kandung</option>
                              <option value="Orang Tua Asuh / Angkat">Orang Tua Asuh / Angkat</option>
                              <option value="Saudara Keluarga">Saudara Keluarga</option>
                              <option value="LAINNYA">Lainnya</option>
                            </select>
                            {formData.hubunganWali === 'LAINNYA' && (
                              <div className="mt-1.5">
                                <input
                                  type="text"
                                  placeholder="Tuliskan hubungan kekeluargaan..."
                                  value={formData.hubunganWaliLainnya || ''}
                                  onChange={(e) => setFormData({ ...formData, hubunganWaliLainnya: e.target.value })}
                                  className="w-full px-3 py-1.5 text-xs rounded border border-teal-400 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none"
                                  autoFocus
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Pendidikan Terakhir Wali
                            </label>
                            <select
                              value={formData.pendidikanWali || 'SMA/MA/PAKET C'}
                              onChange={(e) => setFormData({ ...formData, pendidikanWali: e.target.value })}
                              className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                            >
                              <option value="SD/MI/PAKET A">[A] SD/MI/PAKET A</option>
                              <option value="SMP/MTs/PAKET B">[B] SMP/MTs/PAKET B</option>
                              <option value="SMA/MA/PAKET C">[C] SMA/MA/PAKET C</option>
                              <option value="D1/D2/D3">[D] Diploma (D1-D3)</option>
                              <option value="S1">[E] Sarjana (S1)</option>
                              <option value="S2/S3">[F] Pascasarjana (S2/S3)</option>
                              <option value="LAINNYA">[G] Lainnya</option>
                            </select>
                            {formData.pendidikanWali === 'LAINNYA' && (
                              <div className="mt-1.5">
                                <input
                                  type="text"
                                  placeholder="Tuliskan pendidikan terakhir wali..."
                                  value={formData.pendidikanWaliLainnya || ''}
                                  onChange={(e) => setFormData({ ...formData, pendidikanWaliLainnya: e.target.value })}
                                  className="w-full px-3 py-1.5 text-xs rounded border border-teal-400 bg-white text-slate-800 placeholder:text-slate-400"
                                />
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Pekerjaan Wali
                            </label>
                            <select
                              value={formData.pekerjaanWali || 'PEGAWAI SWASTA'}
                              onChange={(e) => setFormData({ ...formData, pekerjaanWali: e.target.value })}
                              className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                            >
                              <option value="PNS">PNS / TNI / POLRI</option>
                              <option value="PEGAWAI SWASTA">Pegawai Swasta</option>
                              <option value="PEDAGANG/WIRASWASTA">Wiraswasta / Pedagang</option>
                              <option value="PETANI/PETERNAK">Petani / Peternak</option>
                              <option value="BURUH">Buruh Harian Lepas</option>
                              <option value="PENSIUNAN">Pensiunan</option>
                              <option value="SUDAH MENINGGAL">Sudah Meninggal</option>
                              <option value="LAINNYA">Lainnya</option>
                            </select>
                            {formData.pekerjaanWali === 'LAINNYA' && (
                              <div className="mt-1.5">
                                <input
                                  type="text"
                                  placeholder="Tuliskan pekerjaan wali..."
                                  value={formData.pekerjaanWaliLainnya || ''}
                                  onChange={(e) => setFormData({ ...formData, pekerjaanWaliLainnya: e.target.value })}
                                  className="w-full px-3 py-1.5 text-xs rounded border border-teal-400 bg-white text-slate-800 placeholder:text-slate-400"
                                />
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Pendapatan Wali per Bulan
                            </label>
                            <select
                              value={formData.pendapatanWali || '3.000.000 s.d Rp. 5.000.000'}
                              onChange={(e) => setFormData({ ...formData, pendapatanWali: e.target.value })}
                              className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                            >
                              <option value="< Rp. 1000.000">&lt; Rp. 1.000.000</option>
                              <option value="1.000.000 s.d Rp.3.000.000">Rp. 1.000.000 s.d Rp. 3.000.000</option>
                              <option value="3.000.000 s.d Rp. 5.000.000">Rp. 3.000.000 s.d Rp. 5.000.000</option>
                              <option value="> Rp. 5.000.000">&gt; Rp. 5.000.000</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              No. WhatsApp / HP Wali Murid *
                            </label>
                            <input
                              type="tel"
                              placeholder="08xxxxxxxxxx"
                              value={formData.noTelpWali || ''}
                              onChange={(e) => setFormData({ ...formData, noTelpWali: e.target.value })}
                              className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Alamat Tempat Tinggal Wali Murid
                            </label>
                            <input
                              type="text"
                              placeholder="Alamat domisili lengkap wali..."
                              value={formData.alamatWali || ''}
                              onChange={(e) => setFormData({ ...formData, alamatWali: e.target.value })}
                              className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Kontak & Alamat Orang Tua / Wali */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nomor Telpon / WhatsApp Orang Tua / Wali *
                      </label>
                      <input
                        type="tel"
                        placeholder="08xxxxxxxxxx"
                        value={formData.noTelpOrtu || ''}
                        onChange={(e) => setFormData({ ...formData, noTelpOrtu: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                      />
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Nomor aktif untuk informasi panggilan sekolah dan pemberitahuan
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Alamat Orang Tua / Wali Murid
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Alamat domisili lengkap tempat tinggal orang tua / wali..."
                        value={formData.alamatOrtu || ''}
                        onChange={(e) => setFormData({ ...formData, alamatOrtu: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>

                  {/* KELOMPOK C: BANTUAN SOSIAL & KESEJAHTERAAN (KIP / PKH / BPJS) */}
                  <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-4">
                    <div className="border-b border-amber-200/60 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
                          BAGIAN C: BANTUAN SOSIAL
                        </span>
                        <span className="text-[11px] text-amber-800 font-medium">Program Afirmasi Pemerintah</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-amber-700" />
                        <span>Apakah mempunyai KIP / PKH / BPJS?</span>
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Pilih status kepemilikan kartu jaminan sosial atau bantuan pendidikan pemerintah. Jika ada, lampirkan bukti dokumen (Foto/File). Jika tidak ada, tidak usah melampirkan berkas.
                      </p>
                    </div>

                    {/* Radio Choice: Tidak / Ada */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            memilikiKipPkhBpjs: 'Tidak',
                            jenisBantuan: [],
                            nomorKipPkhBpjs: '',
                            lampiranKipPkhBpjs: '',
                            namaFileKipPkhBpjs: ''
                          }));
                        }}
                        className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                          formData.memilikiKipPkhBpjs !== 'Ya'
                            ? 'bg-white border-amber-500 shadow-sm ring-2 ring-amber-500/20'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                          formData.memilikiKipPkhBpjs !== 'Ya' ? 'border-amber-600 bg-amber-600' : 'border-slate-400'
                        }`}>
                          {formData.memilikiKipPkhBpjs !== 'Ya' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Tidak Memiliki (Tidak Ada)</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Tidak mempunyai KIP/PKH/BPJS (Tidak perlu melampirkan berkas apapun)
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            memilikiKipPkhBpjs: 'Ya',
                            jenisBantuan: prev.jenisBantuan && prev.jenisBantuan.length > 0 ? prev.jenisBantuan : ['KIP']
                          }));
                        }}
                        className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                          formData.memilikiKipPkhBpjs === 'Ya'
                            ? 'bg-white border-teal-600 shadow-sm ring-2 ring-teal-600/20'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                          formData.memilikiKipPkhBpjs === 'Ya' ? 'border-teal-600 bg-teal-600' : 'border-slate-400'
                        }`}>
                          {formData.memilikiKipPkhBpjs === 'Ya' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Ya, Mempunyai Kartu KIP / PKH / BPJS</div>
                          <div className="text-[11px] text-teal-700 font-medium mt-0.5">
                            Wajib melampirkan foto atau file kartu bantuan
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Expandable Details when user has KIP/PKH/BPJS */}
                    {formData.memilikiKipPkhBpjs === 'Ya' && (
                      <div className="p-4 rounded-xl bg-white border border-amber-300/80 space-y-4 animate-in fade-in duration-200">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1.5">
                            Pilih Jenis Kartu yang Dimiliki:
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {['KIP (Kartu Indonesia Pintar)', 'PKH (Program Keluarga Harapan)', 'BPJS Kesehatan / KIS'].map((item) => {
                              const key = item.split(' ')[0];
                              const isChecked = (formData.jenisBantuan || []).includes(key);
                              return (
                                <label
                                  key={item}
                                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                                    isChecked
                                      ? 'bg-teal-50 border-teal-600 text-teal-900 font-bold'
                                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const current = formData.jenisBantuan || [];
                                      if (e.target.checked) {
                                        setFormData(prev => ({ ...prev, jenisBantuan: [...current, key] }));
                                      } else {
                                        setFormData(prev => ({ ...prev, jenisBantuan: current.filter(k => k !== key) }));
                                      }
                                    }}
                                    className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                                  />
                                  <span>{item}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-800 mb-1">
                            Nomor Kartu KIP / PKH / BPJS / KIS
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: 000123456789 atau nomor registrasi kartu"
                            value={formData.nomorKipPkhBpjs || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, nomorKipPkhBpjs: e.target.value }))}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                          />
                        </div>

                        {/* File Upload Box */}
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Lampirkan Berkas (Foto atau File Dokumen Kartu) *
                          </label>
                          <p className="text-[11px] text-slate-500 mb-2">
                            Unggah foto fisik kartu atau scan dokumen (format JPG, PNG, atau PDF, maks. 5MB)
                          </p>

                          {formData.lampiranKipPkhBpjs ? (
                            <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                {formData.lampiranKipPkhBpjs.startsWith('data:image') ? (
                                  <img
                                    src={formData.lampiranKipPkhBpjs}
                                    alt="Preview Kartu KIP/PKH/BPJS"
                                    className="w-16 h-12 object-cover rounded-lg border border-teal-300 shadow-xs"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-teal-200 text-teal-800 flex items-center justify-center font-bold text-xs">
                                    DOC
                                  </div>
                                )}
                                <div>
                                  <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                                    <Check className="w-4 h-4 text-teal-600" />
                                    <span>{formData.namaFileKipPkhBpjs || 'berkas_kartu_bantuan.jpg'}</span>
                                  </div>
                                  <div className="text-[11px] text-teal-700">Berkas telah terlampir dan siap diverifikasi</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white border border-teal-300 text-teal-800 hover:bg-teal-50 text-xs font-semibold shadow-xs">
                                  <span>Ganti Berkas</span>
                                  <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={handleKipUpload}
                                    className="hidden"
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      lampiranKipPkhBpjs: '',
                                      namaFileKipPkhBpjs: ''
                                    }));
                                  }}
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Hapus berkas"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-teal-50/30 transition-all text-center">
                              <FileUp className="w-6 h-6 text-slate-400 mb-1" />
                              <span className="text-xs font-bold text-slate-700">
                                Klik untuk Unggah Foto atau File Kartu
                              </span>
                              <span className="text-[10px] text-slate-500 mt-0.5">
                                JPG, PNG, atau PDF (maksimal 5MB)
                              </span>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={handleKipUpload}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* KELOMPOK D: METODE & BUKTI PEMBAYARAN PENDAFTARAN */}
                  <div className="p-5 rounded-2xl bg-teal-50/50 border border-teal-200/80 space-y-4">
                    <div className="border-b border-teal-200/60 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-teal-200 text-teal-900 text-[10px] font-bold uppercase tracking-wider">
                          BAGIAN D: PEMBAYARAN FORMULIR PPDB
                        </span>
                        <span className="text-[11px] text-teal-800 font-medium">Bisa Transfer atau Bayar di Sekolah</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-teal-700" />
                        <span>Pilihan Metode Pembayaran Biaya Pendaftaran</span>
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Pilih cara pembayaran yang paling nyaman bagi Anda. Anda dapat mentransfer ke rekening resmi sekolah atau datang langsung ke sekolah.
                      </p>
                    </div>

                    {/* Radio Choice: Transfer Bank / Datang Langsung ke Sekolah */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            metodePembayaran: 'Transfer',
                            bankTujuan: prev.bankTujuan || (schoolInfo?.rekeningBankList?.[0]?.namaBank || 'Bank BJB')
                          }));
                        }}
                        className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                          formData.metodePembayaran !== 'Datang Langsung ke Sekolah'
                            ? 'bg-white border-teal-600 shadow-sm ring-2 ring-teal-600/20'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                          formData.metodePembayaran !== 'Datang Langsung ke Sekolah' ? 'border-teal-600 bg-teal-600' : 'border-slate-400'
                        }`}>
                          {formData.metodePembayaran !== 'Datang Langsung ke Sekolah' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-teal-700" />
                            <span>Transfer Bank (BJB / Rekening Sekolah)</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Transfer via ATM, Mobile Banking, atau Internet Banking ke rekening resmi sekolah
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            metodePembayaran: 'Datang Langsung ke Sekolah',
                            bankTujuan: 'Loket Keuangan Sekolah (Tunai)'
                          }));
                        }}
                        className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                          formData.metodePembayaran === 'Datang Langsung ke Sekolah'
                            ? 'bg-white border-emerald-600 shadow-sm ring-2 ring-emerald-600/20'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                          formData.metodePembayaran === 'Datang Langsung ke Sekolah' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-400'
                        }`}>
                          {formData.metodePembayaran === 'Datang Langsung ke Sekolah' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Datang Langsung ke Sekolah (Tunai)</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Bayar langsung di loket keuangan / panitia PPDB Kampus SMK Bakti Putra Mandiri
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Detail jika Transfer Bank */}
                    {formData.metodePembayaran !== 'Datang Langsung ke Sekolah' ? (
                      <div className="p-4 rounded-xl bg-white border border-teal-200 space-y-3.5">
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span>Rekening Tujuan Transfer Sekolah:</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(schoolInfo?.rekeningBankList && schoolInfo.rekeningBankList.length > 0 
                            ? schoolInfo.rekeningBankList 
                            : INITIAL_REKENING_BANK
                          ).map((rek, idx) => (
                            <div key={rek.id || `form-rek-${idx}`} className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-xs text-slate-900">
                                  {rek.namaBank}
                                </span>
                                {rek.isUtama && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px]">
                                    Utama
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                                <span className="font-mono font-black text-sm text-teal-900 tracking-wider">
                                  {rek.nomorRekening}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyRekening(rek.nomorRekening)}
                                  className="px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedRek === rek.nomorRekening ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  <span>{copiedRek === rek.nomorRekening ? 'Tersalin' : 'Salin'}</span>
                                </button>
                              </div>
                              <div className="text-[11px] font-semibold text-slate-700">
                                a.n. {rek.atasNama}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Upload Bukti Pembayaran */}
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <label className="block text-xs font-bold text-slate-800">
                            Upload Bukti Transfer / Resi Pembayaran (Opsional / Dapat disusulkan)
                          </label>
                          {formData.buktiPembayaranUrl ? (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-teal-50 border border-teal-200">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
                                <span className="text-xs font-bold text-teal-900">Bukti Pembayaran Terpasang</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, buktiPembayaranUrl: '', statusPembayaran: 'Belum Bayar' }))}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                title="Hapus Bukti"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <label className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-teal-50/30 transition-all text-center">
                              <FileUp className="w-5 h-5 text-slate-400 mb-1" />
                              <span className="text-xs font-bold text-slate-700">
                                Klik untuk Unggah Foto Bukti Transfer (Resi / Tangkapan Layar)
                              </span>
                              <span className="text-[10px] text-slate-500 mt-0.5">
                                Format: JPG, PNG, atau PDF (maksimal 5MB)
                              </span>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={handleBuktiBayarUpload}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Detail jika Datang Langsung ke Sekolah */
                      <div className="p-4 rounded-xl bg-white border border-emerald-200 space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold">
                          <Building2 className="w-4 h-4" />
                          <span>Panduan Pembayaran Langsung ke Sekolah:</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Setelah menekan tombol <strong>Simpan Permanen & Terbitkan Bukti PPDB</strong> di bawah, unduh/cetak lembar bukti pendaftaran dan tunjukkan ke <strong>Petugas Loket Keuangan / Panitia PPDB</strong> di Kampus SMK Bakti Putra Mandiri (Senin - Sabtu: 08.00 - 15.00 WIB) untuk pembayaran tunai dan penerimaan kuitansi resmi.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Final Submit Actions */}
                  <div className="pt-4 flex justify-between border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Kembali ke Bagian A</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleFinalSubmit}
                      className="px-8 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-md flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Simpan Permanen & Terbitkan Bukti PPDB</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Mode VERIFIKASI BERKAS SPMB (HANYA UNTUK CALON SISWA SPMB) */}
        {mode === 'verifikasi_berkas' && !isSiswaAktif && (
          !existingForm && currentUser?.role !== 'calon_siswa' && !currentUser ? (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center max-w-lg mx-auto space-y-4 my-8">
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-amber-700">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Portal Verifikasi Berkas SPMB Terproteksi</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Status verifikasi berkas pendaftaran hanya dapat dilihat oleh calon siswa yang bersangkutan. Silakan masuk dengan akun Calon Siswa (NISN) Anda untuk memantau kelengkapan berkas fisik & digital secara real-time.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('daftar_akun')}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Buat Akun Calon Siswa
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* TOP ACTION BAR */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span>Dossier Verifikasi Berkas SPMB T.A. {schoolInfo?.tahunAjaranSPMB || '2026/2027'}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span className="text-xs font-normal text-slate-500">{currentDisplayForm.gelombang || schoolInfo?.gelombangSPMB || 'Gelombang 1'}</span>
                    </h3>
                    <p className="text-xs text-slate-600">
                      Status keabsahan dokumen fisik & digital calon peserta didik baru {schoolInfo?.nama || 'SMK Bakti Putra Mandiri'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => setMode('cetak_bukti')}
                    className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold shadow flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Cetak lembar bukti pendaftaran dan verifikasi resmi"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Bukti SPMB</span>
                  </button>
                  <button
                    onClick={handleDownloadWord}
                    className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold shadow flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Unduh Formulir SPMB Lengkap dalam format Word (.doc)"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Unduh Word (.doc)</span>
                  </button>
                  <button
                    onClick={() => setMode('isi_form')}
                    className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Formulir</span>
                  </button>
                </div>
              </div>

              {/* HERO CARD: STATUS VERIFIKASI UTAMA */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* STATUS ALERT BANNER */}
                {currentDisplayForm.statusPendaftaran === 'Diterima' ? (
                  <div className="p-5 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-7 h-7 text-amber-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                            Resmi Diterima
                          </span>
                          <span className="text-xs text-emerald-100 font-medium">Pengesahan Final Panitia</span>
                        </div>
                        <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                          SELAMAT! ANDA RESMI DITERIMA SEBAGAI MURID BARU
                        </h2>
                        <p className="text-xs text-emerald-100 mt-1 max-w-2xl leading-relaxed">
                          Pendaftaran dan seluruh berkas administrasi Anda telah selesai diverifikasi dan disahkan oleh Administrator SPMB {schoolInfo?.nama || 'SMK Bakti Putra Mandiri'}.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 shrink-0 text-right md:text-left">
                      <div className="text-[11px] text-emerald-200 font-medium">NIS Resmi Diterbitkan:</div>
                      <div className="font-mono font-black text-lg text-amber-300">
                        {currentDisplayForm.nomorIndukSiswaResmi || '2627.10.001'}
                      </div>
                      <div className="text-xs text-white font-bold">
                        Kelas: {currentDisplayForm.kelasDiterima || 'X Farmasi 1'}
                      </div>
                    </div>
                  </div>
                ) : currentDisplayForm.statusPendaftaran === 'Terverifikasi' ? (
                  <div className="p-5 bg-gradient-to-r from-blue-700 via-teal-700 to-emerald-700 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-7 h-7 text-emerald-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                            Berkas Terverifikasi
                          </span>
                          <span className="text-xs text-teal-100 font-medium">Dokumen Lengkap & Sah</span>
                        </div>
                        <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                          BERKAS PERSYARATAN SPMB TELAH DIVERIFIKASI RESMI
                        </h2>
                        <p className="text-xs text-teal-100 mt-1 max-w-2xl leading-relaxed">
                          Seluruh dokumen digital (Pas Foto, KK, Akta Kelahiran, Ijazah SMP, dan Rapor) telah diverifikasi oleh Panitia SPMB. Calon siswa berhak mengikuti tes wawancara dan pemeriksaan kesehatan fisik.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 shrink-0">
                      <div className="text-[11px] text-teal-200 font-medium">No. Registrasi:</div>
                      <div className="font-mono font-black text-base text-white">
                        {currentDisplayForm.nomorRegistrasi || `REG-${currentDisplayForm.id?.substring(0,8).toUpperCase()}`}
                      </div>
                      <div className="text-[11px] text-emerald-300 font-bold">Lolos Seleksi Berkas ✓</div>
                    </div>
                  </div>
                ) : currentDisplayForm.statusPendaftaran === 'Menunggu_Verifikasi' ? (
                  <div className="p-5 bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-700 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                        <Clock className="w-7 h-7 text-amber-200" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-white text-amber-950 font-black text-[10px] uppercase tracking-wider">
                            Menunggu Verifikasi
                          </span>
                          <span className="text-xs text-amber-100 font-medium">Dalam Antrean Petugas</span>
                        </div>
                        <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                          BERKAS PENDAFTARAN SEDANG DALAM PENINJAUAN PANITIA
                        </h2>
                        <p className="text-xs text-amber-100 mt-1 max-w-2xl leading-relaxed">
                          Formulir dan berkas digital Anda telah berhasil disimpan di pangkalan data SPMB. Petugas panitia sedang memverifikasi kelengkapan dokumen dan data kependudukan.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 shrink-0">
                      <div className="text-[11px] text-amber-200 font-medium">Waktu Verifikasi:</div>
                      <div className="font-mono font-bold text-sm text-white">1 x 24 Jam Kerja</div>
                      <div className="text-[11px] text-amber-200">Hasil otomatis muncul di sini</div>
                    </div>
                  </div>
                ) : currentDisplayForm.statusPendaftaran === 'Ditolak' ? (
                  <div className="p-5 bg-gradient-to-r from-rose-700 via-rose-800 to-red-800 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                        <AlertCircle className="w-7 h-7 text-rose-200" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-white text-rose-950 font-black text-[10px] uppercase tracking-wider">
                            Perlu Perbaikan
                          </span>
                        </div>
                        <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                          BERKAS PENDAFTARAN BELUM MEMENUHI KETENTUAN
                        </h2>
                        <p className="text-xs text-rose-100 mt-1 max-w-2xl leading-relaxed">
                          Terdapat data atau berkas yang belum sesuai dengan standar persyaratan SPMB. Silakan periksa catatan panitia verifikasi di bawah ini dan perbarui berkas formulir Anda.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setMode('isi_form')}
                      className="px-4 py-2 rounded-xl bg-white text-rose-900 font-bold text-xs shadow hover:bg-rose-50 cursor-pointer shrink-0"
                    >
                      Perbaiki Berkas Sekarang
                    </button>
                  </div>
                ) : (
                  <div className="p-5 bg-gradient-to-r from-slate-700 to-slate-800 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                        <FileText className="w-7 h-7 text-slate-200" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-slate-300 text-slate-900 font-black text-[10px] uppercase tracking-wider">
                            Tahap Pengisian
                          </span>
                        </div>
                        <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                          FORMULIR PENDAFTARAN DALAM PROSES PENGISIAN
                        </h2>
                        <p className="text-xs text-slate-200 mt-1 max-w-2xl leading-relaxed">
                          Akun calon siswa aktif. Mohon lengkapi seluruh isian formulir dan unggah pas foto formal agar berkas dapat segera diproses ke tahap verifikasi resmi.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setMode('isi_form')}
                      className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow cursor-pointer shrink-0"
                    >
                      Lengkapi Isian Formulir
                    </button>
                  </div>
                )}

                {/* PROFIL CALON SISWA & DETAIL REGISTRASI */}
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-start gap-6">
                  {/* Pas Foto 3x4 */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-28 h-36 border-2 border-slate-300 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden shadow-sm relative group">
                      {currentDisplayForm.pasFotoUrl ? (
                        <img
                          src={currentDisplayForm.pasFotoUrl}
                          alt={currentDisplayForm.namaLengkap}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-3 text-slate-400">
                          <ImageIcon className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                          <span className="text-[10px] font-bold block">PAS FOTO 3X4</span>
                          <span className="text-[9px]">Belum Diunggah</span>
                        </div>
                      )}
                      <button
                        onClick={() => setMode('isi_form')}
                        className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] font-semibold gap-1 cursor-pointer"
                        title="Klik untuk mengganti pas foto"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Ganti Foto</span>
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-1.5 font-semibold">
                      Pas Foto Resmi 3x4
                    </span>
                  </div>

                  {/* Biodata Pendaftar Grid */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 text-[10px] font-bold uppercase tracking-wider">
                          Pendaftar Resmi
                        </span>
                        <span className="text-xs text-slate-400">|</span>
                        <span className="text-xs text-slate-500 font-mono font-medium">
                          No. Reg: {currentDisplayForm.nomorRegistrasi || `REG-${currentDisplayForm.id?.substring(0,8).toUpperCase()}`}
                        </span>
                        <span className="text-xs text-slate-400">|</span>
                        <span className="text-xs text-slate-500">
                          Gelombang: <strong>{currentDisplayForm.gelombang || schoolInfo?.gelombangSPMB || '1'}</strong>
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 mt-1 uppercase">
                        {currentDisplayForm.namaLengkap || 'Nama Calon Siswa'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Nama Panggilan: <strong>{currentDisplayForm.namaPanggilan || '-'}</strong> • Asal SMP: <strong>{currentDisplayForm.asalSmp || currentDisplayForm.asalSekolahSMP || '-'}</strong>
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-500 font-medium block text-[11px]">Kompetensi Keahlian:</span>
                        <span className="font-extrabold text-teal-900 text-sm">{currentDisplayForm.pilihanJurusan}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-500 font-medium block text-[11px]">NISN (10 Digit):</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">{currentDisplayForm.nisn || '-'}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-500 font-medium block text-[11px]">NIK Kependudukan:</span>
                        <span className="font-mono font-semibold text-slate-800">{currentDisplayForm.nikSiswa || '-'}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-500 font-medium block text-[11px]">No. Kartu Keluarga (KK):</span>
                        <span className="font-mono font-semibold text-slate-800">{currentDisplayForm.noKk || '-'}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-500 font-medium block text-[11px]">No. WhatsApp / HP:</span>
                        <span className="font-mono font-semibold text-slate-800">{currentDisplayForm.noHp || currentDisplayForm.nomorHp || '-'}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-500 font-medium block text-[11px]">Tanggal Pengajuan:</span>
                        <span className="font-semibold text-slate-800">{currentDisplayForm.tanggalDaftar || '-'}</span>
                      </div>
                      <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200">
                        <span className="text-teal-800 font-medium block text-[11px]">Metode Pembayaran:</span>
                        <span className="font-bold text-teal-950 text-xs flex items-center gap-1 mt-0.5">
                          <CreditCard className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                          <span>{currentDisplayForm.metodePembayaran || 'Transfer Bank'}</span>
                        </span>
                        <span className="text-[10px] text-teal-700 block mt-0.5">
                          Status: <strong>{currentDisplayForm.statusPembayaran || 'Menunggu Verifikasi'}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banner Rekening Sekolah untuk Calon Siswa */}
                <div className="px-6 py-3.5 bg-gradient-to-r from-teal-50 to-emerald-50 border-y border-teal-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">
                        Rekening Resmi Sekolah: Bank BJB <span className="font-mono text-teal-800 font-extrabold">{schoolInfo?.rekeningBankList?.[0]?.nomorRekening || '0061324992100'}</span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        a.n. {schoolInfo?.rekeningBankList?.[0]?.atasNama || 'SMK BAKTI PUTRA MANDIRI'} • Atau bayar tunai langsung di loket keuangan sekolah
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyRekening(schoolInfo?.rekeningBankList?.[0]?.nomorRekening || '0061324992100')}
                    className="px-3 py-1.5 rounded-lg bg-white border border-teal-300 hover:bg-teal-50 text-teal-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
                  >
                    {copiedRek === (schoolInfo?.rekeningBankList?.[0]?.nomorRekening || '0061324992100') ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin No. Rekening</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 5-STEP ALUR VERIFIKASI PROGRESS TRACKER */}
                <div className="p-6 bg-slate-50/70 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      <span>Alur Tahapan Seleksi & Verifikasi Berkas SPMB</span>
                    </h4>
                    <span className="text-[11px] text-teal-700 font-semibold bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                      Sistem Verifikasi Terpadu
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    {/* Tahap 1 */}
                    <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-emerald-700">Tahap 1</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="font-bold text-xs text-slate-900">Registrasi Akun</div>
                      <div className="text-[10px] text-emerald-700 mt-1 font-medium">✓ Selesai Terverifikasi</div>
                    </div>

                    {/* Tahap 2 */}
                    <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-emerald-700">Tahap 2</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="font-bold text-xs text-slate-900">Isi Formulir & Berkas</div>
                      <div className="text-[10px] text-emerald-700 mt-1 font-medium">✓ Dokumen Tersimpan</div>
                    </div>

                    {/* Tahap 3 */}
                    <div className={`p-3 rounded-xl bg-white shadow-xs flex flex-col justify-between border ${
                      currentDisplayForm.statusPendaftaran === 'Diterima' || currentDisplayForm.statusPendaftaran === 'Terverifikasi'
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : currentDisplayForm.statusPendaftaran === 'Menunggu_Verifikasi'
                        ? 'border-amber-300 bg-amber-50/50 ring-2 ring-amber-200'
                        : 'border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-700">Tahap 3</span>
                        {currentDisplayForm.statusPendaftaran === 'Diterima' || currentDisplayForm.statusPendaftaran === 'Terverifikasi' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <div className="font-bold text-xs text-slate-900">Verifikasi Dokumen</div>
                      <div className={`text-[10px] mt-1 font-medium ${
                        currentDisplayForm.statusPendaftaran === 'Diterima' || currentDisplayForm.statusPendaftaran === 'Terverifikasi'
                          ? 'text-emerald-700 font-bold'
                          : 'text-amber-700 font-semibold'
                      }`}>
                        {currentDisplayForm.statusPendaftaran === 'Diterima' || currentDisplayForm.statusPendaftaran === 'Terverifikasi'
                          ? '✓ Lolos Verifikasi'
                          : 'Sedang Berjalan'}
                      </div>
                    </div>

                    {/* Tahap 4 */}
                    <div className={`p-3 rounded-xl bg-white shadow-xs flex flex-col justify-between border ${
                      currentDisplayForm.statusPendaftaran === 'Diterima'
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-slate-200 opacity-80'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-700">Tahap 4</span>
                        {currentDisplayForm.statusPendaftaran === 'Diterima' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        )}
                      </div>
                      <div className="font-bold text-xs text-slate-900">Tes & Wawancara</div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {currentDisplayForm.statusPendaftaran === 'Diterima' ? '✓ Lolos Seleksi' : 'Jadwal Ditentukan'}
                      </div>
                    </div>

                    {/* Tahap 5 */}
                    <div className={`p-3 rounded-xl bg-white shadow-xs flex flex-col justify-between border ${
                      currentDisplayForm.statusPendaftaran === 'Diterima'
                        ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200'
                        : 'border-slate-200 opacity-80'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-700">Tahap 5</span>
                        {currentDisplayForm.statusPendaftaran === 'Diterima' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                        )}
                      </div>
                      <div className="font-bold text-xs text-slate-900">Penetapan NIS Resmi</div>
                      <div className={`text-[10px] mt-1 font-semibold ${
                        currentDisplayForm.statusPendaftaran === 'Diterima' ? 'text-emerald-700 font-bold' : 'text-slate-500'
                      }`}>
                        {currentDisplayForm.statusPendaftaran === 'Diterima' ? '✓ Resmi Terbit' : 'Menunggu Kelulusan'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CATATAN RESMI DARI VERIFIKATOR PANITIA SPMB */}
                <div className="p-6 border-b border-slate-100">
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="w-5 h-5 text-amber-600" />
                        <h4 className="font-bold text-xs text-amber-950 uppercase tracking-wide">
                          Catatan Resmi Verifikator Panitia SPMB:
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md font-semibold">
                        Verifikator: {currentDisplayForm.dikonfirmasiOleh || 'Tim Panitia SPMB ' + (schoolInfo?.nama || 'SMK Bakti Putra Mandiri')}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-amber-900 font-medium italic pl-7 leading-relaxed">
                      "{currentDisplayForm.catatanAdmin || 'Berkas pendaftaran, identitas kependudukan, dan data asal sekolah telah terdata di sistem SPMB. Pastikan membawa berkas asli saat jadwal tes wawancara dan pengukuran seragam.'}"
                    </p>

                    <div className="text-[10px] text-amber-700/90 pl-7 flex items-center gap-3 pt-1">
                      <span>Tanggal Verifikasi: <strong>{currentDisplayForm.tanggalVerifikasi || currentDisplayForm.tanggalDaftar || '2026-09-20'}</strong></span>
                      <span>•</span>
                      <span>Status Sistem: <strong>Aktif Terhubung Pangkalan Data</strong></span>
                    </div>
                  </div>
                </div>

                {/* CHECKLIST 8 BERKAS PERSYARATAN SPMB */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-teal-600" />
                        <span>Checklist Rincian Kelengkapan 8 Berkas Persyaratan SPMB</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Daftar verifikasi fisik dan digital yang divalidasi oleh panitia pendaftaran
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                      T.A. {schoolInfo?.tahunAjaranSPMB || '2026/2027'}
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">No</th>
                          <th className="py-2.5 px-3">Nama Berkas / Dokumen</th>
                          <th className="py-2.5 px-3">Data / Keterangan Berkas Terdaftar</th>
                          <th className="py-2.5 px-3 w-40 text-center">Status Verifikasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {/* 1. Pas Foto */}
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-center text-slate-500">1</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            Pas Foto Formal Berwarna (3x4)
                            <span className="block text-[10px] text-slate-500 font-normal">Seragam resmi SMP/MTs asal dengan background merah/biru</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {currentDisplayForm.pasFotoUrl ? (
                              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                                <Check className="w-3.5 h-3.5" /> Pas foto 3x4 telah terlampir
                              </span>
                            ) : (
                              <span className="text-amber-600 font-medium">Belum diunggah</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {currentDisplayForm.pasFotoUrl ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                ✓ Terverifikasi
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                Perlu Upload
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* 2. KK */}
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-center text-slate-500">2</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            Kartu Keluarga (KK)
                            <span className="block text-[10px] text-slate-500 font-normal">Data domisili & nama orang tua kandung / wali</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-mono">
                            No. KK: {currentDisplayForm.noKk || '-'} (Alamat: {currentDisplayForm.desa || '-'}, {currentDisplayForm.kecKab || '-'})
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {currentDisplayForm.noKk ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                ✓ Tervalidasi
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                Belum Lengkap
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* 3. Akta */}
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-center text-slate-500">3</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            Akta Kelahiran Siswa
                            <span className="block text-[10px] text-slate-500 font-normal">Kesesuaian tanggal lahir dan nama resmi</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            TTL: {currentDisplayForm.tempatLahir}, {currentDisplayForm.tanggalLahir} (No. Akta: {currentDisplayForm.noAktaKelahiran || 'Terdata'})
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              ✓ Tervalidasi
                            </span>
                          </td>
                        </tr>

                        {/* 4. Ijazah / SKL SMP */}
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-center text-slate-500">4</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            Surat Keterangan Lulus (SKL) / Ijazah SMP
                            <span className="block text-[10px] text-slate-500 font-normal">Bukti kelulusan jenjang SMP/MTs/Sederajat</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            Asal: {currentDisplayForm.asalSmp || currentDisplayForm.asalSekolahSMP || '-'} (No. Ijazah: <span className="font-mono">{currentDisplayForm.noSeriIjazah || '-'}</span>)
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {currentDisplayForm.noSeriIjazah || currentDisplayForm.asalSmp ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                ✓ Terdata Valid
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                Belum Lengkap
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* 5. Rapor SMP */}
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-center text-slate-500">5</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            Buku Rapor SMP (Semester 1 - 5)
                            <span className="block text-[10px] text-slate-500 font-normal">Dasar pemetaan minat & bakat kejuruan</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            Nilai IPA & Matematika Terdata untuk Peminatan Kejuruan {currentDisplayForm.pilihanJurusan}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              ✓ Siap Cek Fisik
                            </span>
                          </td>
                        </tr>

                        {/* 6. Kesehatan & Bebas Buta Warna */}
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-center text-slate-500">6</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            Surat Keterangan Sehat & Bebas Buta Warna
                            <span className="block text-[10px] text-slate-500 font-normal">Khusus kompetensi kejuruan Farmasi & Keperawatan</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            Tinggi: {currentDisplayForm.tinggiBadan} cm, Berat: {currentDisplayForm.beratBadan} kg • Riwayat: {currentDisplayForm.penyakitBerat || 'Sehat'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              ✓ Terverifikasi
                            </span>
                          </td>
                        </tr>

                        {/* 7. KIP / PKH / BPJS */}
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-center text-slate-500">7</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            Kartu Jaminan Sosial (KIP / PKH / KKS / BPJS)
                            <span className="block text-[10px] text-slate-500 font-normal">Bagi pendaftar jalur afirmasi & beasiswa pendidikan</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {currentDisplayForm.memilikiKipPkhBpjs === 'Ya' ? (
                              <span className="font-semibold text-teal-800">
                                Ya, Terlampir ({currentDisplayForm.jenisBantuan?.join(', ') || 'KIP/PKH'}) - No: <span className="font-mono">{currentDisplayForm.nomorKipPkhBpjs || '-'}</span>
                              </span>
                            ) : (
                              <span className="text-slate-500">Tidak Mengajukan Bantuan (Jalur Umum / Reguler)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                              {currentDisplayForm.memilikiKipPkhBpjs === 'Ya' ? '✓ Berkas Terlampir' : 'Opsional'}
                            </span>
                          </td>
                        </tr>

                        {/* 8. Prestasi */}
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-center text-slate-500">8</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            Piagam / Sertifikat Prestasi (Jalur Prestasi)
                            <span className="block text-[10px] text-slate-500 font-normal">Kejuaraan akademik/non-akademik tingkat kecamatan/kabupaten</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {currentDisplayForm.prestasi && currentDisplayForm.prestasi !== '-' ? (
                              <span className="font-semibold text-amber-800">
                                🏆 {currentDisplayForm.prestasi}
                              </span>
                            ) : (
                              <span className="text-slate-500">Tidak Melampirkan (Jalur Reguler)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                              {currentDisplayForm.prestasi && currentDisplayForm.prestasi !== '-' ? '✓ Terdata' : 'Opsional'}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* INFORMASI LOKASI & KONTAK SEKOLAH UNTUK REGISTRASI ULANG */}
                <div className="p-6 bg-gradient-to-br from-teal-50 via-emerald-50/40 to-slate-50 border-t border-slate-200">
                  <div className="max-w-4xl mx-auto space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                          <span>Informasi Lokasi & Kontak Sekolah untuk Registrasi Ulang</span>
                          <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold uppercase tracking-wider">
                            Sekretariat SPMB
                          </span>
                        </h4>
                        <p className="text-xs text-slate-600">
                          Bagi calon peserta didik baru yang berkasnya telah diverifikasi atau berstatus diterima, silakan hadir ke kampus sekolah untuk registrasi ulang fisik dan pencocokan dokumen asli.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {/* Card 1: Lokasi & Alamat Sekolah */}
                      <div className="p-4 bg-white rounded-2xl border border-teal-200/80 shadow-xs space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="space-y-1 flex-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                              Alamat / Lokasi Kampus Sekolah
                            </span>
                            <div className="font-bold text-xs sm:text-sm text-slate-900">
                              {schoolInfo?.namaLengkap || schoolInfo?.nama || 'SMK Bakti Putra Mandiri'}
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {schoolInfo?.alamatLengkap || schoolInfo?.alamat || 'Jl. Sawah, Kp. Sukasari, RT. 06/01, Desa Kabasiran, Kec. Parung Panjang, Kab. Bogor, Jawa Barat 16360'}
                            </p>
                            {schoolInfo?.desa && (
                              <p className="text-[11px] text-teal-700 font-medium">
                                Wilayah: Desa {schoolInfo.desa}, Kec. {schoolInfo.kecamatan || 'Parung Panjang'}, Kab. {schoolInfo.kabupaten || 'Bogor'} {schoolInfo.kodePos ? `(${schoolInfo.kodePos})` : ''}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                          <a
                            href={schoolInfo?.lokasiSekolah?.mapsUrl || 'https://maps.app.goo.gl/845UtAVRFmNoEVvSA'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Buka Petunjuk Arah (Google Maps)</span>
                            <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                          </a>
                        </div>
                      </div>

                      {/* Card 2: Nomor Telepon & Jam Layanan Sekolah */}
                      <div className="p-4 bg-white rounded-2xl border border-teal-200/80 shadow-xs space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                            <Phone className="w-4 h-4" />
                          </div>
                          <div className="space-y-1 flex-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                              Kontak Telepon & WhatsApp Panitia
                            </span>
                            <div className="font-bold text-xs sm:text-sm text-slate-900">
                              Layanan Registrasi Ulang & Konsultasi SPMB
                            </div>
                            <div className="text-sm font-black font-mono text-teal-900">
                              {schoolInfo?.telepon || '(021) 5978-2345 / 0812-8899-7766'}
                            </div>
                            {schoolInfo?.email && (
                              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span>{schoolInfo.email}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                          <a
                            href={`tel:${(schoolInfo?.telepon || '02159782345').split('/')[0].replace(/[^0-9+]/g, '')}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Hubungi Telepon</span>
                          </a>
                          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Senin - Sabtu (08.00 - 15.00 WIB)</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Persyaratan Dokumen Fisik Registrasi Ulang */}
                    <div className="p-3.5 bg-white/80 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-700">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Dokumen Fisik yang Wajib Dibawa Saat Registrasi Ulang ke Sekolah:</span>
                      </div>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pl-5 list-disc text-[11px] text-slate-600 pt-1">
                        <li>Cetakan Lembar Bukti Verifikasi / Tanda Bukti SPMB ini</li>
                        <li>Fotokopi Kartu Keluarga (KK) & Akta Kelahiran (2 lembar)</li>
                        <li>Surat Keterangan Lulus (SKL) / Ijazah SMP Asli & Legalisir (2 lembar)</li>
                        <li>Surat Keterangan Sehat & Bebas Buta Warna dari Klinik/Dokter/Puskesmas</li>
                        <li>Pas foto formal 3x4 berseragam SMP asal background merah/biru (3 lembar)</li>
                        <li>Fotokopi Kartu KIP / PKH / KKS / BPJS (khusus pendaftar jalur bantuan)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* QR CODE & CAP DIGITAL VERIFIKASI RESMI */}
                <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs shrink-0">
                      <SquareQrCode
                        value={`VERIF-SPMB|NOREG:${currentDisplayForm.id}|NISN:${currentDisplayForm.nisn}|NAMA:${currentDisplayForm.namaLengkap}|JURUSAN:${currentDisplayForm.pilihanJurusan}|STATUS:${currentDisplayForm.statusPendaftaran}|SEKOLAH:SMK_BAKTI_PUTRA_MANDIRI`}
                        size={84}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Autentikasi Keabsahan Digital SPMB</span>
                      </div>
                      <p className="text-[11px] text-slate-500 max-w-md">
                        QR Code ini terhubung dengan Pangkalan Data Resmi {schoolInfo?.nama || 'SMK Bakti Putra Mandiri'}. Dapat dipindai oleh Panitia Seleksi saat verifikasi berkas fisik.
                      </p>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Kode Enkripsi: SPMB-{currentDisplayForm.id?.substring(0, 10).toUpperCase() || 'BPM-2026'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => setMode('cetak_bukti')}
                      className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs shadow flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Cetak Lembar Bukti Verifikasi</span>
                    </button>
                    <button
                      onClick={() => setMode('isi_form')}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
                    >
                      Edit Berkas
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {/* 4. Mode CETAK BUKTI PENDAFTARAN */}
        {mode === 'cetak_bukti' && (
          !existingForm && currentUser?.role !== 'calon_siswa' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center max-w-lg mx-auto space-y-4 my-8">
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-amber-700">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Bukti Pendaftaran SPMB Terproteksi</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Lembar bukti pendaftaran hanya dapat diakses oleh calon peserta didik yang bersangkutan. Silakan masuk / login menggunakan akun Calon Siswa Anda untuk mencetak bukti pendaftaran resmi.
              </p>
              <button
                type="button"
                onClick={() => setMode('daftar_akun')}
                className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                Daftar / Masuk Akun Calon Siswa
              </button>
            </div>
          ) : currentDisplayForm ? (
            <div className="space-y-6">
            {/* Top Alert / Action Bar */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-sm text-emerald-900">
                    Formulir Berhasil Disimpan! Status: {currentDisplayForm.statusPendaftaran}
                  </h3>
                  <p className="text-xs text-emerald-700">
                    Silakan cetak lembar bukti pendaftaran resmi ini dan simpan nomor registrasi Anda.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDownloadWord}
                  className="px-3.5 py-2 rounded-xl bg-blue-800 hover:bg-blue-700 text-white text-xs font-semibold shadow flex items-center gap-1.5 cursor-pointer"
                  title="Unduh Formulir Pendaftaran resmi dalam format Microsoft Word (.doc)"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Unduh Word (.doc)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (printableCardRef.current) {
                      printDocumentArea(printableCardRef.current, {
                        title: `Bukti Pendaftaran SPMB - ${currentDisplayForm.namaLengkap}`,
                        paperSize: 'A4',
                        orientation: 'portrait',
                        margin: 'sempit',
                      });
                    } else {
                      window.print();
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold shadow flex items-center gap-1.5 cursor-pointer"
                  title="Cetak lembar bukti pendaftaran saja ke kertas atau simpan ke file PDF"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Simpan PDF</span>
                </button>
                <button
                  onClick={handleDownloadBuktiHTML}
                  className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold shadow flex items-center gap-1.5 cursor-pointer"
                  title="Unduh lembar bukti dalam format file web mandiri (.html)"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh HTML</span>
                </button>
                <button
                  onClick={() => setMode('verifikasi_berkas')}
                  className="px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-semibold shadow flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Lihat status verifikasi berkas lengkap"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Status Verifikasi</span>
                </button>
                <button
                  onClick={() => setMode('isi_form')}
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 cursor-pointer"
                >
                  Edit Berkas
                </button>
              </div>
            </div>

            {/* Printable Formal Card */}
            <div ref={printableCardRef} className="bg-white p-8 sm:p-10 rounded-2xl shadow-md border border-slate-300 printable-document space-y-6">
              {/* Kop Surat Sekolah Resmi Terpadu */}
              <KopSuratView schoolInfo={schoolInfo} />

              {/* Title Bukti Pendaftaran SPMB */}
              <div className="text-center">
                <span className="inline-block px-4 py-1 rounded bg-slate-100 text-slate-900 font-extrabold text-sm uppercase tracking-wider border border-slate-300">
                  TANDA BUKTI SISTEM PENERIMAAN MURID BARU (SPMB) T.A. {schoolInfo?.tahunAjaranSPMB || '2026/2027'}
                </span>
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  No. Registrasi: REG-{currentDisplayForm.id?.substring(0, 8).toUpperCase()} | Gelombang: {currentDisplayForm.gelombang || schoolInfo?.gelombangSPMB || 1} | Tanggal: {currentDisplayForm.tanggalDaftar}
                </div>
              </div>

              {/* Acceptance Banner if Admin Confirmed */}
              {currentDisplayForm.statusPendaftaran === 'Diterima' && (
                <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/80 text-emerald-950 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-extrabold text-sm uppercase tracking-wide text-emerald-900">
                        SELAMAT! ANDA RESMI DITERIMA SEBAGAI MURID BARU
                      </div>
                      <p className="text-xs text-emerald-800">
                        Pendaftaran telah diverifikasi dan disahkan oleh Administrator SPMB {schoolInfo?.nama || 'SMK Bakti Putra Mandiri'}.
                      </p>
                    </div>
                  </div>
                  <div className="text-right sm:text-left bg-white px-3.5 py-2 rounded-lg border border-emerald-300 shadow-xs">
                    <div className="text-[11px] text-slate-500 font-medium">NIS Resmi Diterbitkan:</div>
                    <div className="font-mono font-black text-sm text-emerald-800">{currentDisplayForm.nomorIndukSiswaResmi || '2627.10.001'}</div>
                    <div className="text-[11px] text-slate-600 font-bold">Kelas: {currentDisplayForm.kelasDiterima || 'X Farmasi 1'}</div>
                  </div>
                </div>
              )}

              {/* Table Data Siswa with Pas Foto Header */}
              <div className="space-y-6 text-xs text-slate-800">
                {/* Jurusan & Photo Box */}
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="text-slate-600 font-medium">PILIHAN KOMPETENSI KEAHLIAN:</span>
                    <div className="font-extrabold text-lg text-teal-950">{currentDisplayForm.pilihanJurusan}</div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold text-[11px]">
                      Status Berkas: {currentDisplayForm.statusPendaftaran}
                    </div>
                  </div>

                  {/* 3x4 Pas Foto Resmi */}
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-32 border-2 border-slate-700 rounded-lg bg-white flex items-center justify-center overflow-hidden shadow-sm">
                      {currentDisplayForm.pasFotoUrl ? (
                        <img 
                          src={currentDisplayForm.pasFotoUrl} 
                          alt="Pas Foto 3x4" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-2 text-slate-400">
                          <span className="text-[10px] font-bold block">PAS FOTO 3X4</span>
                          <span className="text-[9px]">Belum Ada</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section A: IDENTITAS PESERTA DIDIK */}
                <div>
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2 uppercase text-[11px] tracking-wide">
                    A. IDENTITAS PESERTA DIDIK
                  </h4>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 w-52 font-medium text-slate-600">NISN (10 Angka)</td>
                        <td className="py-1 font-bold font-mono">: {currentDisplayForm.nisn}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">Nomor Induk Kependudukan (NIK)</td>
                        <td className="py-1 font-mono">: {currentDisplayForm.nikSiswa}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">Nomor Kartu Keluarga (KK)</td>
                        <td className="py-1 font-mono">: {currentDisplayForm.noKk}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">Nomor Akta Kelahiran</td>
                        <td className="py-1 font-mono">: {currentDisplayForm.noAktaKelahiran || '-'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">Nama Lengkap Siswa</td>
                        <td className="py-1 font-bold uppercase">: {currentDisplayForm.namaLengkap} ({currentDisplayForm.namaPanggilan || '-'})</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">Tempat, Tanggal Lahir</td>
                        <td className="py-1">: {currentDisplayForm.tempatLahir}, {currentDisplayForm.tanggalLahir}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">Jenis Kelamin / Postur</td>
                        <td className="py-1">: {currentDisplayForm.jenisKelamin} (TB: {currentDisplayForm.tinggiBadan} cm, BB: {currentDisplayForm.beratBadan} kg)</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">Email Calon Siswa</td>
                        <td className="py-1">: {currentDisplayForm.emailSiswa || currentDisplayForm.email || '-'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">Media Sosial Siswa (Medsos)</td>
                        <td className="py-1">: {currentDisplayForm.medsosSiswa || '-'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">No. WhatsApp / HP Siswa</td>
                        <td className="py-1 font-mono">: {currentDisplayForm.noHp || currentDisplayForm.nomorHp || '-'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">Agama</td>
                        <td className="py-1">: {currentDisplayForm.agama === 'Lainnya' ? (currentDisplayForm.agamaLainnya || 'Lainnya') : currentDisplayForm.agama}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">Hobi & Cita-Cita</td>
                        <td className="py-1">: Hobi: {currentDisplayForm.hobi === 'Lainnya' ? currentDisplayForm.hobiLainnya : currentDisplayForm.hobi} | Cita-cita: {currentDisplayForm.citaCita === 'Lainnya' ? currentDisplayForm.citaCitaLainnya : currentDisplayForm.citaCita}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">Alamat Berdasarkan KK</td>
                        <td className="py-1">: {currentDisplayForm.alamatKk || currentDisplayForm.alamatLengkap} RT {currentDisplayForm.rt} / RW {currentDisplayForm.rw}, Desa {currentDisplayForm.desa}, Kec. {currentDisplayForm.kecKab}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">Alamat Tempat Tinggal Domisili</td>
                        <td className="py-1">
                          : {currentDisplayForm.alamatSamaDenganKk !== false 
                            ? 'Sama dengan Alamat di Kartu Keluarga (KK)' 
                            : (currentDisplayForm.alamatDomisili || currentDisplayForm.alamatLengkap)}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">Asal SD/MI/Sederajat</td>
                        <td className="py-1">: {currentDisplayForm.asalSekolahSD || '-'} (Lulus Tahun: {currentDisplayForm.tahunLulusSd || '-'})</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">Asal SMP/MTs/Sederajat</td>
                        <td className="py-1">: {currentDisplayForm.asalSekolahSMP || currentDisplayForm.asalSmp || '-'} (Lulus Tahun: {currentDisplayForm.tahunLulusSmp || '-'})</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">Nomor Seri Ijazah SMP/MTs/Sederajat</td>
                        <td className="py-1 font-mono font-bold">: {currentDisplayForm.noSeriIjazahSMP || currentDisplayForm.noSeriIjazah || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section B */}
                <div>
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2 uppercase text-[11px] tracking-wide">
                    B. DATA ORANG TUA / WALI
                  </h4>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 w-52 font-medium text-slate-600">Nama Ayah (NIK)</td>
                        <td className="py-1">: {currentDisplayForm.namaAyah} ({currentDisplayForm.nikAyah || '-'})</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">Pekerjaan & Pendapatan Ayah</td>
                        <td className="py-1">
                          : {currentDisplayForm.pekerjaanAyah === 'LAINNYA' 
                            ? (currentDisplayForm.pekerjaanAyahLainnya || 'Lainnya') 
                            : currentDisplayForm.pekerjaanAyah} 
                          {currentDisplayForm.pekerjaanAyah !== 'SUDAH MENINGGAL' && ` / ${currentDisplayForm.pendapatanAyah}`}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">Nama Ibu (NIK)</td>
                        <td className="py-1">: {currentDisplayForm.namaIbu} ({currentDisplayForm.nikIbu || '-'})</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">Pekerjaan & Pendapatan Ibu</td>
                        <td className="py-1">
                          : {currentDisplayForm.pekerjaanIbu === 'LAINNYA' 
                            ? (currentDisplayForm.pekerjaanIbuLainnya || 'Lainnya') 
                            : currentDisplayForm.pekerjaanIbu} 
                          {currentDisplayForm.pekerjaanIbu !== 'SUDAH MENINGGAL' && ` / ${currentDisplayForm.pendapatanIbu}`}
                        </td>
                      </tr>

                      {/* Data Wali Jika Ada */}
                      {(currentDisplayForm.punyaWali === 'Ya' || currentDisplayForm.namaWali) && (
                        <>
                          <tr className="border-b border-slate-100 bg-slate-50/60">
                            <td className="py-1 font-semibold text-teal-800">Nama Wali (Hubungan)</td>
                            <td className="py-1 font-semibold text-teal-900">: {currentDisplayForm.namaWali} (Hubungan: {currentDisplayForm.hubunganWali === 'LAINNYA' ? currentDisplayForm.hubunganWaliLainnya : currentDisplayForm.hubunganWali})</td>
                          </tr>
                          <tr className="border-b border-slate-100 bg-slate-50/60">
                            <td className="py-1 font-medium text-slate-600">NIK & Kontak Wali</td>
                            <td className="py-1">: NIK: {currentDisplayForm.nikWali || '-'} | Telp/WA: {currentDisplayForm.noTelpWali || '-'}</td>
                          </tr>
                          <tr className="border-b border-slate-100 bg-slate-50/60">
                            <td className="py-1 font-medium text-slate-600">Pekerjaan & Pendapatan Wali</td>
                            <td className="py-1">: {currentDisplayForm.pekerjaanWali === 'LAINNYA' ? currentDisplayForm.pekerjaanWaliLainnya : currentDisplayForm.pekerjaanWali} / {currentDisplayForm.pendapatanWali || '-'}</td>
                          </tr>
                        </>
                      )}

                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">No. Telepon/HP Orang Tua / Wali</td>
                        <td className="py-1 font-mono">: {currentDisplayForm.noTelpOrtu || '-'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-medium text-slate-600">Alamat Orang Tua / Wali</td>
                        <td className="py-1">: {currentDisplayForm.alamatOrtu || currentDisplayForm.alamatLengkap}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section C: Bantuan Sosial KIP/PKH/BPJS */}
                <div>
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2 uppercase text-[11px] tracking-wide flex items-center justify-between">
                    <span>C. STATUS BANTUAN SOSIAL & KESEJAHTERAAN (KIP / PKH / BPJS)</span>
                    <span className="text-[10px] font-semibold text-slate-500">PROGRAM AFIRMASI</span>
                  </h4>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 w-48 font-medium text-slate-600">Memiliki KIP / PKH / BPJS?</td>
                        <td className="py-1 font-bold">
                          : {currentDisplayForm.memilikiKipPkhBpjs === 'Ya' ? (
                            <span className="text-emerald-700">YA, MEMILIKI ({currentDisplayForm.jenisBantuan?.join(', ') || 'KIP/PKH/BPJS'})</span>
                          ) : (
                            <span className="text-slate-600">TIDAK MEMILIKI (TIDAK ADA)</span>
                          )}
                        </td>
                      </tr>
                      {currentDisplayForm.memilikiKipPkhBpjs === 'Ya' && (
                        <>
                          <tr className="border-b border-slate-100">
                            <td className="py-1 font-medium text-slate-600">Nomor Kartu Bantuan</td>
                            <td className="py-1 font-mono font-bold">: {currentDisplayForm.nomorKipPkhBpjs || '-'}</td>
                          </tr>
                          <tr className="border-b border-slate-100">
                            <td className="py-1 font-medium text-slate-600">Lampiran Bukti Dokumen</td>
                            <td className="py-1">
                              : {currentDisplayForm.lampiranKipPkhBpjs ? (
                                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                                  <Check className="w-3.5 h-3.5" />
                                  Berkas Kartu Terlampir ({currentDisplayForm.namaFileKipPkhBpjs || 'Dokumen KIP/PKH/BPJS'})
                                </span>
                              ) : (
                                <span className="text-amber-600">Belum dilampirkan</span>
                              )}
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>

                  {/* Thumbnail of attached card in printout if available */}
                  {currentDisplayForm.memilikiKipPkhBpjs === 'Ya' && currentDisplayForm.lampiranKipPkhBpjs && currentDisplayForm.lampiranKipPkhBpjs.startsWith('data:image') && (
                    <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-lg inline-block">
                      <div className="text-[10px] text-slate-500 font-semibold mb-1">Lampiran Fisik Kartu KIP/PKH/BPJS:</div>
                      <img
                        src={currentDisplayForm.lampiranKipPkhBpjs}
                        alt="Lampiran Kartu KIP/PKH/BPJS"
                        className="h-20 object-contain rounded border border-slate-300"
                      />
                    </div>
                  )}
                </div>

                {/* Informasi Lokasi & Kontak Sekolah untuk Registrasi Ulang */}
                <div className="p-3 border border-slate-300 rounded-xl bg-slate-50 text-[10px] space-y-1.5">
                  <div className="font-bold text-slate-900 uppercase flex items-center justify-between border-b border-slate-200 pb-1">
                    <span>LOKASI & KONTAK SEKOLAH UNTUK REGISTRASI ULANG SISWA BARU:</span>
                    <span className="font-mono text-[9px] text-teal-800">SEKRETARIAT SPMB KAMPUS</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="font-semibold text-slate-900 block">Alamat / Lokasi Sekolah:</span>
                      <span>{schoolInfo?.alamatLengkap || schoolInfo?.alamat || 'Jl. Sawah, Kp. Sukasari, RT. 06/01, Desa Kabasiran, Kec. Parung Panjang, Kab. Bogor, Jawa Barat 16360'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 block">No. Telepon & WhatsApp Panitia:</span>
                      <span className="font-mono font-bold text-teal-900">{schoolInfo?.telepon || '(021) 5978-2345 / 0812-8899-7766'}</span>
                      <span className="block text-[9px] text-slate-500">Jam Layanan: Senin - Sabtu (Pukul 08.00 - 15.00 WIB)</span>
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-500 italic pt-0.5 border-t border-slate-200">
                    *Harap membawa cetakan lembar bukti verifikasi ini beserta berkas fisik asli (KK, Akta Kelahiran, Ijazah/SKL SMP, Surat Keterangan Sehat, Pas Foto 3x4) saat hadir registrasi ulang di sekolah.
                  </div>
                </div>

                {/* Signatures */}
                <div className="pt-8 grid grid-cols-2 text-center text-xs">
                  <div>
                    <p className="text-slate-500">Calon Peserta Didik,</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline uppercase">{currentDisplayForm.namaLengkap}</p>
                    <p className="text-[10px] text-slate-500">NISN: {currentDisplayForm.nisn}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Panitia SPMB {schoolInfo?.nama || 'SMK Bakti Putra Mandiri'},</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline">Panitia Verifikasi SPMB</p>
                    <p className="text-[10px] text-slate-500">NIP. 198205142008011005</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null)}
      </div>
    </div>
  );
};
