import React, { useState } from 'react';
import { SchoolInfo, MitraIndustri, GelombangPendaftaran, RekeningBank, KejuruanDetail } from '../../types';
import { INITIAL_GELOMBANG, INITIAL_REKENING_BANK, SCHOOL_INFO } from '../../data/initialData';
import { KopSuratView } from '../KopSuratView';
import { 
  Building2, 
  Settings, 
  CheckCircle2, 
  Award, 
  Calendar, 
  Users, 
  Share2, 
  FileText, 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  ExternalLink,
  GraduationCap,
  Image as ImageIcon,
  Check,
  Upload,
  BookOpen,
  Type,
  Sliders,
  RotateCcw,
  MapPin,
  Navigation,
  Clock,
  Layers,
  Tag,
  Coins,
  X,
  ArrowRight,
  Bookmark,
  Compass,
  LocateFixed,
  AlertTriangle,
  CreditCard,
  Power,
  PowerOff
} from 'lucide-react';
import { 
  DEFAULT_SCHOOL_LAT, 
  DEFAULT_SCHOOL_LNG, 
  DEFAULT_RADIUS_METERS, 
  DEFAULT_MAPS_URL, 
  parseGoogleMapsCoords 
} from '../../utils/geoMapsHelper';
import { compressImageFile, cleanLogoBackground } from '../../utils/imageCompressor';

// Preset official educational logos
export const PRESET_KOP_LOGOS = [
  {
    nama: 'Logo Tut Wuri Handayani (Kemendikbudristek)',
    url: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Indonesia.svg',
    deskripsi: 'Standar Nasional Pendidikan Dasar & Menengah'
  },
  {
    nama: 'Logo SMK Bisa - Hebat / Vokasi',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Logo_SMK_Bisa_Hebat.png/320px-Logo_SMK_Bisa_Hebat.png',
    deskripsi: 'Direktorat Jenderal Pendidikan Vokasi'
  },
  {
    nama: 'Logo Resmi BAPUMA (Default)',
    url: '/logo_bpm.png',
    deskripsi: 'Logo Resmi SMK Bakti Putra Mandiri'
  }
];

interface AdminPengaturanTabProps {
  schoolInfo: SchoolInfo;
  onUpdateSchoolInfo: (info: SchoolInfo) => void;
  initialSubSection?: 'identitas' | 'kop_logo' | 'kejuruan' | 'kuota_ta' | 'slogan_sosmed' | 'mitra' | 'lulusan' | 'lokasi_geofence';
}

export const AdminPengaturanTab: React.FC<AdminPengaturanTabProps> = ({
  schoolInfo,
  onUpdateSchoolInfo,
  initialSubSection = 'identitas',
}) => {
  const [formData, setFormData] = useState<SchoolInfo>({
    ...schoolInfo,
    kejuruanList: schoolInfo.kejuruanList || [],
    kuotaJurusan: schoolInfo.kuotaJurusan || {
      farmasi: 72,
      keperawatan: 72,
      kecantikan: 36,
      perhotelan: 36,
    },
    rombelJurusan: schoolInfo.rombelJurusan || {
      farmasi: 2,
      keperawatan: 2,
      kecantikan: 1,
      perhotelan: 1,
    },
    gelombangList: schoolInfo.gelombangList && schoolInfo.gelombangList.length > 0 
      ? schoolInfo.gelombangList 
      : INITIAL_GELOMBANG,
    rekeningBankList: schoolInfo.rekeningBankList && schoolInfo.rekeningBankList.length > 0
      ? schoolInfo.rekeningBankList
      : INITIAL_REKENING_BANK,
    ppdbInstruksiPembayaran: schoolInfo.ppdbInstruksiPembayaran || 'Pembayaran pendaftaran dapat dilakukan dengan transfer ke Rekening Bank BJB SMK Bakti Putra Mandiri (0061324992100) atau datang langsung ke sekolah di Bagian Keuangan / Panitia PPDB.',
    kopSekolah: schoolInfo.kopSekolah || {
      yayasan: 'YAYASAN PENDIDIKAN BAKTI PUTRA MANDIRI',
      instansi: 'SMK BAKTI PUTRA MANDIRI',
      subJudul: 'Kompetensi Keahlian: Farmasi Klinis • Asisten Keperawatan • Tata Kecantikan & Spa • Perhotelan (Hospitality)',
      teleponEmail: 'Jl. Sawah, Kp. Sukasari RT. 06/01, Desa Kabasiran, Parung Panjang, Bogor 16360 | Telp: (021) 5978-2345',
      garisGanda: true,
    },
    slogan: schoolInfo.slogan || 'Terampil, Berakhlak Mulia, dan Unggul dalam Vokasi Kesehatan & Hospitalitas',
    subSlogan: schoolInfo.subSlogan || 'Pusat Keunggulan Pendidikan Kejuruan Farmasi, Keperawatan, Tata Kecantikan, dan Perhotelan Terakreditasi A Unggul',
    sosmed: schoolInfo.sosmed || {
      instagram: 'https://instagram.com/smkbaktiputramandiri',
      facebook: 'https://facebook.com/smkbaktiputramandiribogor',
      youtube: 'https://youtube.com/@smkbaktiputramandiriofficial',
      tiktok: 'https://tiktok.com/@smk_bpm_parungpanjang',
      whatsapp: '081288997766',
    },
    tracerLulusan: schoolInfo.tracerLulusan || {
      persenBekerja: 84,
      persenKuliah: 11,
      persenWirausaha: 5,
      totalAlumni: 1420,
      mitraPenyerapUtama: 'RS Hermina, Kimia Farma, Hotel Aston, Martha Tilaar Salon',
      keterangan: '84% lulusan langsung diserap kerja di rumah sakit, apotek jaringan nasional, klinik kecantikan, dan hotel berbintang.',
    },
    mitraIndustri: schoolInfo.mitraIndustri || [],
  });

  const [activeSubSection, setActiveSubSection] = useState<'identitas' | 'kop_logo' | 'kejuruan' | 'kuota_ta' | 'slogan_sosmed' | 'mitra' | 'lulusan' | 'lokasi_geofence'>(initialSubSection);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialSubSection) {
      setActiveSubSection(initialSubSection);
    }
  }, [initialSubSection]);

  React.useEffect(() => {
    setFormData({
      ...schoolInfo,
      kejuruanList: schoolInfo.kejuruanList || [],
      kuotaJurusan: schoolInfo.kuotaJurusan || {
        farmasi: 72,
        keperawatan: 72,
        kecantikan: 36,
        perhotelan: 36,
      },
      rombelJurusan: schoolInfo.rombelJurusan || {
        farmasi: 2,
        keperawatan: 2,
        kecantikan: 1,
        perhotelan: 1,
      },
      gelombangList: schoolInfo.gelombangList && schoolInfo.gelombangList.length > 0 
        ? schoolInfo.gelombangList 
        : INITIAL_GELOMBANG,
      rekeningBankList: schoolInfo.rekeningBankList && schoolInfo.rekeningBankList.length > 0
        ? schoolInfo.rekeningBankList
        : INITIAL_REKENING_BANK,
      ppdbInstruksiPembayaran: schoolInfo.ppdbInstruksiPembayaran || 'Pembayaran pendaftaran dapat dilakukan dengan transfer ke Rekening Bank BJB SMK Bakti Putra Mandiri (0061324992100) atau datang langsung ke sekolah di Bagian Keuangan / Panitia PPDB.',
      kopSekolah: schoolInfo.kopSekolah || {
        yayasan: 'YAYASAN PENDIDIKAN',
        instansi: schoolInfo.nama || 'SMK',
        subJudul: 'Kompetensi Keahlian: Farmasi Klinis • Asisten Keperawatan • Tata Kecantikan & Spa • Perhotelan (Hospitality)',
        teleponEmail: `${schoolInfo.alamat || ''} | Telp: ${schoolInfo.telepon || ''}`,
        garisGanda: true,
      },
      slogan: schoolInfo.slogan || 'Terampil, Berakhlak Mulia, dan Unggul dalam Vokasi Kesehatan & Hospitalitas',
      subSlogan: schoolInfo.subSlogan || 'Pusat Keunggulan Pendidikan Kejuruan Terakreditasi A Unggul',
      sosmed: schoolInfo.sosmed || {
        instagram: '',
        facebook: '',
        youtube: '',
        tiktok: '',
        whatsapp: schoolInfo.telepon || '',
      },
      tracerLulusan: schoolInfo.tracerLulusan || {
        persenBekerja: 84,
        persenKuliah: 11,
        persenWirausaha: 5,
        totalAlumni: 1420,
        mitraPenyerapUtama: 'RS Hermina, Kimia Farma, Hotel Aston, Martha Tilaar Salon',
        keterangan: '84% lulusan langsung diserap kerja di industri dan fasilitas mitra.',
      },
      mitraIndustri: schoolInfo.mitraIndustri || [],
    });
  }, [schoolInfo]);

  const [isProcessingLogoKiri, setIsProcessingLogoKiri] = useState(false);
  const [isProcessingLogoKanan, setIsProcessingLogoKanan] = useState(false);

  // Upload handler for Logo Kiri (Logo Utama Sekolah) with automatic canvas compression (<35KB)
  const handleLogoKiriFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingLogoKiri(true);
    try {
      const compressedDataUrl = await compressImageFile(file, 360, 0.90, true);
      const cleanDataUrl = await cleanLogoBackground(compressedDataUrl);
      const updatedSchool: SchoolInfo = {
        ...formData,
        logoUrl: cleanDataUrl,
        logoKiriUrl: cleanDataUrl,
        logoSekolah: cleanDataUrl,
      };
      setFormData(updatedSchool);
      onUpdateSchoolInfo(updatedSchool);
      setSaveSuccessMsg('Logo Kiri berhasil diupload dengan latar belakang transparan & otomatis disimpan!');
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err?.message || 'Gagal memproses gambar logo');
    } finally {
      setIsProcessingLogoKiri(false);
      e.target.value = '';
    }
  };

  // Handler to strip dark/black background from existing logo
  const handleRemoveBlackBgLogo = async (target: 'kiri' | 'kanan') => {
    const currentUrl = target === 'kiri' 
      ? (formData.logoUrl || formData.logoKiriUrl || '/logo_bpm.png')
      : (formData.logoKananUrl || formData.kopSekolah?.logoKananUrl || '');
    if (!currentUrl) return;

    try {
      const cleanDataUrl = await cleanLogoBackground(currentUrl);
      let updatedSchool: SchoolInfo;
      if (target === 'kiri') {
        updatedSchool = {
          ...formData,
          logoUrl: cleanDataUrl,
          logoKiriUrl: cleanDataUrl,
          logoSekolah: cleanDataUrl,
        };
      } else {
        updatedSchool = {
          ...formData,
          logoKananUrl: cleanDataUrl,
          kopSekolah: { ...formData.kopSekolah!, logoKananUrl: cleanDataUrl },
        };
      }
      setFormData(updatedSchool);
      onUpdateSchoolInfo(updatedSchool);
      setSaveSuccessMsg('Latar belakang hitam logo berhasil dihilangkan & langsung tersimpan transparan!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Gagal membersihkan latar belakang logo: ' + err.message);
    }
  };

  // Upload handler for Logo Kanan (Logo Sekunder / Tut Wuri Handayani / dll.) with automatic canvas compression (<35KB)
  const handleLogoKananFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingLogoKanan(true);
    try {
      const compressedDataUrl = await compressImageFile(file, 320, 0.88, true);
      const cleanDataUrl = await cleanLogoBackground(compressedDataUrl);
      setFormData(prev => ({
        ...prev,
        logoKananUrl: cleanDataUrl,
        kopSekolah: {
          ...prev.kopSekolah!,
          logoKananUrl: cleanDataUrl,
          tampilkanLogoKanan: true,
        }
      }));
      setSaveSuccessMsg('Logo Kanan berhasil dioptimalkan dengan latar belakang transparan! Klik "Simpan KOP & Logo Sekolah" untuk menyimpan permanen.');
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err?.message || 'Gagal memproses gambar logo kanan');
    } finally {
      setIsProcessingLogoKanan(false);
      e.target.value = '';
    }
  };

  const handleRemoveLogoKanan = () => {
    setFormData(prev => ({
      ...prev,
      logoKananUrl: '',
      kopSekolah: {
        ...prev.kopSekolah!,
        logoKananUrl: '',
        tampilkanLogoKanan: false,
      }
    }));
    setSaveSuccessMsg('Logo Kanan dinonaktifkan. KOP Surat kini menggunakan 1 logo kiri dengan tata letak simetris.');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleSetPresetLogoKanan = (url: string) => {
    setFormData(prev => ({
      ...prev,
      logoKananUrl: url,
      kopSekolah: {
        ...prev.kopSekolah!,
        logoKananUrl: url,
        tampilkanLogoKanan: true,
      }
    }));
    setSaveSuccessMsg('Logo Kanan berhasil diatur dari Preset Resmi! Jangan lupa klik "Simpan KOP & Logo Sekolah".');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Mitra Modal state
  const [showMitraModal, setShowMitraModal] = useState(false);
  const [editingMitraId, setEditingMitraId] = useState<string | null>(null);
  const [mitraNama, setMitraNama] = useState('');
  const [mitraKategori, setMitraKategori] = useState<MitraIndustri['kategori']>('Rumah Sakit');
  const [mitraKerjasama, setMitraKerjasama] = useState('');
  const [mitraAlamat, setMitraAlamat] = useState('');
  const [mitraKontak, setMitraKontak] = useState('');
  const [mitraLogo, setMitraLogo] = useState('');

  // Gelombang Pendaftaran Modal state
  const [showGelombangModal, setShowGelombangModal] = useState(false);
  const [editingGelombangId, setEditingGelombangId] = useState<string | null>(null);
  const [gelNomor, setGelNomor] = useState(1);
  const [gelNama, setGelNama] = useState('');
  const [gelTglMulai, setGelTglMulai] = useState('');
  const [gelTglSelesai, setGelTglSelesai] = useState('');
  const [gelTahun, setGelTahun] = useState('2026');
  const [gelStatus, setGelStatus] = useState<'Buka' | 'Segera Dibuka' | 'Tutup'>('Buka');
  const [gelBiaya, setGelBiaya] = useState<number>(0);
  const [gelDiskon, setGelDiskon] = useState('');
  const [gelKeterangan, setGelKeterangan] = useState('');

  // Indonesian Date Formatter Helper
  const formatIndoDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const [y, m, d] = parts;
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const mName = months[parseInt(m, 10) - 1] || m;
      return `${parseInt(d, 10)} ${mName} ${y}`;
    } catch (_) {
      return dateStr;
    }
  };

  const handleOpenAddGelombang = () => {
    const list = formData.gelombangList || [];
    const nextNomor = list.length > 0 ? Math.max(...list.map(g => g.nomor || 0)) + 1 : 1;
    setEditingGelombangId(null);
    setGelNomor(nextNomor);
    setGelNama(`Gelombang ${nextNomor} (Reguler)`);
    setGelTglMulai(new Date().toISOString().split('T')[0]);
    setGelTglSelesai(`${new Date().getFullYear()}-06-30`);
    setGelTahun(`${new Date().getFullYear()}`);
    setGelStatus('Buka');
    setGelBiaya(0);
    setGelDiskon('Cashback DSP & Bebas Biaya Seragam');
    setGelKeterangan('');
    setShowGelombangModal(true);
  };

  const handleOpenEditGelombang = (gel: GelombangPendaftaran) => {
    setEditingGelombangId(gel.id);
    setGelNomor(gel.nomor);
    setGelNama(gel.nama);
    setGelTglMulai(gel.tanggalMulai);
    setGelTglSelesai(gel.tanggalSelesai);
    setGelTahun(gel.tahun || '2026');
    setGelStatus(gel.status);
    setGelBiaya(gel.biayaPendaftaran || 0);
    setGelDiskon(gel.diskonDSP || '');
    setGelKeterangan(gel.keterangan || '');
    setShowGelombangModal(true);
  };

  const handleSaveGelombang = (e: React.FormEvent) => {
    e.preventDefault();
    const list = formData.gelombangList ? [...formData.gelombangList] : [];
    let updatedList: GelombangPendaftaran[];
    if (editingGelombangId) {
      updatedList = list.map(g => {
        if (g.id === editingGelombangId) {
          return {
            ...g,
            nomor: gelNomor,
            nama: gelNama,
            tanggalMulai: gelTglMulai,
            tanggalSelesai: gelTglSelesai,
            tahun: gelTahun,
            status: gelStatus,
            biayaPendaftaran: Number(gelBiaya) || 0,
            diskonDSP: gelDiskon,
            keterangan: gelKeterangan,
          };
        }
        return g;
      });
    } else {
      const newGel: GelombangPendaftaran = {
        id: `gel-${Date.now()}`,
        nomor: gelNomor,
        nama: gelNama,
        tanggalMulai: gelTglMulai,
        tanggalSelesai: gelTglSelesai,
        tahun: gelTahun,
        status: gelStatus,
        biayaPendaftaran: Number(gelBiaya) || 0,
        diskonDSP: gelDiskon,
        keterangan: gelKeterangan,
      };
      updatedList = [...list, newGel];
    }

    const updatedSchool: SchoolInfo = {
      ...formData,
      gelombangList: updatedList,
      ...(formData.gelombangSPMB === gelNama ? { statusSPMB: gelStatus } : {})
    };

    setFormData(updatedSchool);
    onUpdateSchoolInfo(updatedSchool);
    setShowGelombangModal(false);
    setSaveSuccessMsg(`Gelombang "${gelNama}" berhasil disimpan dan langsung disinkronkan ke seluruh sistem!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleDeleteGelombang = (id: string) => {
    if ((formData.gelombangList || []).length <= 1) {
      alert('Minimal harus tersisa 1 gelombang pendaftaran.');
      return;
    }
    const targetGel = (formData.gelombangList || []).find(g => g.id === id);
    if (confirm(`Yakin ingin menghapus gelombang "${targetGel?.nama || 'ini'}"?`)) {
      const updatedList = (formData.gelombangList || []).filter(g => g.id !== id);
      const updatedSchool: SchoolInfo = {
        ...formData,
        gelombangList: updatedList,
        ...(formData.gelombangSPMB === targetGel?.nama && updatedList.length > 0
          ? { gelombangSPMB: updatedList[0].nama, statusSPMB: updatedList[0].status }
          : {})
      };
      setFormData(updatedSchool);
      onUpdateSchoolInfo(updatedSchool);
      setSaveSuccessMsg(`Gelombang berhasil dihapus dan langsung disinkronkan!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  const handleSetActiveGelombang = (gel: GelombangPendaftaran) => {
    const updatedSchool: SchoolInfo = {
      ...formData,
      gelombangSPMB: gel.nama,
      statusSPMB: gel.status
    };
    setFormData(updatedSchool);
    onUpdateSchoolInfo(updatedSchool);
    setSaveSuccessMsg(`Gelombang "${gel.nama}" (${gel.status}) kini aktif sebagai periode resmi SPMB!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Rekening Bank Management for PPDB Payment
  const [showRekeningModal, setShowRekeningModal] = useState(false);
  const [editingRekeningId, setEditingRekeningId] = useState<string | null>(null);
  const [rekNamaBank, setRekNamaBank] = useState('Bank BJB');
  const [rekNomor, setRekNomor] = useState('0061324992100');
  const [rekAtasNama, setRekAtasNama] = useState('SMK BAKTI PUTRA MANDIRI');
  const [rekCabang, setRekCabang] = useState('KCP Parung Panjang');
  const [rekKeterangan, setRekKeterangan] = useState('Rekening Resmi Pembayaran Pendaftaran PPDB');
  const [rekIsUtama, setRekIsUtama] = useState(true);

  const handleOpenAddRekening = () => {
    setEditingRekeningId(null);
    setRekNamaBank('Bank BJB');
    setRekNomor('');
    setRekAtasNama('SMK BAKTI PUTRA MANDIRI');
    setRekCabang('KCP Parung Panjang');
    setRekKeterangan('Rekening Resmi Penerimaan Pendaftaran Siswa Baru (PPDB)');
    setRekIsUtama((formData.rekeningBankList || []).length === 0);
    setShowRekeningModal(true);
  };

  const handleOpenEditRekening = (rek: RekeningBank) => {
    setEditingRekeningId(rek.id);
    setRekNamaBank(rek.namaBank);
    setRekNomor(rek.nomorRekening);
    setRekAtasNama(rek.atasNama);
    setRekCabang(rek.cabang || '');
    setRekKeterangan(rek.keterangan || '');
    setRekIsUtama(!!rek.isUtama);
    setShowRekeningModal(true);
  };

  const handleSaveRekening = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rekNamaBank.trim() || !rekNomor.trim() || !rekAtasNama.trim()) {
      alert('Nama Bank, Nomor Rekening, dan Atas Nama wajib diisi.');
      return;
    }

    const currentList = formData.rekeningBankList && formData.rekeningBankList.length > 0 
      ? [...formData.rekeningBankList] 
      : [...INITIAL_REKENING_BANK];

    let updatedList: RekeningBank[];
    if (editingRekeningId) {
      updatedList = currentList.map(r => {
        if (r.id === editingRekeningId) {
          return {
            ...r,
            namaBank: rekNamaBank.trim(),
            nomorRekening: rekNomor.trim(),
            atasNama: rekAtasNama.trim(),
            cabang: rekCabang.trim(),
            keterangan: rekKeterangan.trim(),
            isUtama: rekIsUtama,
          };
        }
        return rekIsUtama ? { ...r, isUtama: false } : r;
      });
    } else {
      const newRek: RekeningBank = {
        id: `rek-${Date.now()}`,
        namaBank: rekNamaBank.trim(),
        nomorRekening: rekNomor.trim(),
        atasNama: rekAtasNama.trim(),
        cabang: rekCabang.trim(),
        keterangan: rekKeterangan.trim(),
        isUtama: rekIsUtama || currentList.length === 0,
      };
      if (rekIsUtama) {
        updatedList = currentList.map(r => ({ ...r, isUtama: false }));
        updatedList.push(newRek);
      } else {
        updatedList = [...currentList, newRek];
      }
    }

    const updatedSchool: SchoolInfo = {
      ...formData,
      rekeningBankList: updatedList,
    };
    setFormData(updatedSchool);
    onUpdateSchoolInfo(updatedSchool);
    setShowRekeningModal(false);
    setSaveSuccessMsg(`Rekening ${rekNamaBank} (${rekNomor}) berhasil disimpan dan disinkronkan ke portal PPDB!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleDeleteRekening = (id: string) => {
    const currentList = formData.rekeningBankList && formData.rekeningBankList.length > 0 
      ? [...formData.rekeningBankList] 
      : [...INITIAL_REKENING_BANK];

    const target = currentList.find(r => r.id === id);
    if (!target) return;

    if (confirm(`Yakin ingin menghapus rekening "${target.namaBank} - ${target.nomorRekening} a.n. ${target.atasNama}"?`)) {
      let updatedList = currentList.filter(r => r.id !== id);
      if (target.isUtama && updatedList.length > 0) {
        updatedList[0].isUtama = true;
      }
      const updatedSchool: SchoolInfo = {
        ...formData,
        rekeningBankList: updatedList,
      };
      setFormData(updatedSchool);
      onUpdateSchoolInfo(updatedSchool);
      setSaveSuccessMsg(`Rekening berhasil dihapus!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  const handleSetRekeningUtama = (id: string) => {
    const currentList = formData.rekeningBankList && formData.rekeningBankList.length > 0 
      ? [...formData.rekeningBankList] 
      : [...INITIAL_REKENING_BANK];

    const updatedList = currentList.map(r => ({
      ...r,
      isUtama: r.id === id,
    }));

    const updatedSchool: SchoolInfo = {
      ...formData,
      rekeningBankList: updatedList,
    };
    setFormData(updatedSchool);
    onUpdateSchoolInfo(updatedSchool);
    setSaveSuccessMsg(`Rekening utama pembayaran PPDB berhasil diperbarui!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Modal State for Program Kejuruan (Tambah, Edit & Hapus)
  const [showKejuruanModal, setShowKejuruanModal] = useState(false);
  const [deleteConfirmKejuruan, setDeleteConfirmKejuruan] = useState<KejuruanDetail | null>(null);
  const [editingKejuruanId, setEditingKejuruanId] = useState<string | null>(null);
  const [jurKode, setJurKode] = useState('');
  const [jurNama, setJurNama] = useState('');
  const [jurSingkatan, setJurSingkatan] = useState('');
  const [jurDeskripsi, setJurDeskripsi] = useState('');
  const [jurVisi, setJurVisi] = useState('');
  const [jurKuotaRombel, setJurKuotaRombel] = useState<number>(1);
  const [jurKuotaSiswa, setJurKuotaSiswa] = useState<number>(36);
  const [jurFasilitasLab, setJurFasilitasLab] = useState('');
  const [jurProspekKerja, setJurProspekKerja] = useState('');
  const [jurStatus, setJurStatus] = useState<'aktif' | 'nonaktif'>('aktif');

  const handleOpenAddKejuruan = () => {
    setEditingKejuruanId(null);
    setJurKode('');
    setJurNama('');
    setJurSingkatan('');
    setJurDeskripsi('');
    setJurVisi('');
    setJurKuotaRombel(1);
    setJurKuotaSiswa(36);
    setJurFasilitasLab('');
    setJurProspekKerja('');
    setJurStatus('aktif');
    setShowKejuruanModal(true);
  };

  const handleOpenEditKejuruan = (jur: KejuruanDetail) => {
    setEditingKejuruanId(jur.id);
    setJurKode(jur.kode || '');
    setJurNama(jur.nama || '');
    setJurSingkatan(jur.singkatan || '');
    setJurDeskripsi(jur.deskripsi || '');
    setJurVisi(jur.visi || '');
    setJurKuotaRombel(jur.kuotaRombel || 1);
    setJurKuotaSiswa(jur.kuotaSiswa || 36);
    setJurFasilitasLab(jur.fasilitasLab || '');
    setJurProspekKerja(jur.prospekKerja || '');
    setJurStatus(jur.status === 'nonaktif' ? 'nonaktif' : 'aktif');
    setShowKejuruanModal(true);
  };

  const handleToggleStatusKejuruan = (id: string) => {
    const currentList = (formData.kejuruanList && formData.kejuruanList.length > 0)
      ? [...formData.kejuruanList]
      : (SCHOOL_INFO.kejuruanList ? [...SCHOOL_INFO.kejuruanList] : []);

    const target = currentList.find(j => j.id === id);
    if (!target) return;

    const isCurrentlyNonaktif = target.status === 'nonaktif';
    const nextStatus: 'aktif' | 'nonaktif' = isCurrentlyNonaktif ? 'aktif' : 'nonaktif';
    const actionLabel = isCurrentlyNonaktif ? 'diaktifkan kembali' : 'dinonaktifkan';

    const updatedList = currentList.map(j => {
      if (j.id === id) {
        return {
          ...j,
          status: nextStatus,
          aktif: nextStatus === 'aktif'
        };
      }
      return j;
    });

    const updatedSchool: SchoolInfo = {
      ...formData,
      kejuruanList: updatedList,
    };
    setFormData(updatedSchool);
    onUpdateSchoolInfo(updatedSchool);
    setSaveSuccessMsg(`Program keahlian "${target.nama}" berhasil ${actionLabel}!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleSaveKejuruan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jurNama.trim()) {
      alert('Nama kejuruan wajib diisi.');
      return;
    }
    const currentList = (formData.kejuruanList && formData.kejuruanList.length > 0)
      ? [...formData.kejuruanList]
      : (SCHOOL_INFO.kejuruanList ? [...SCHOOL_INFO.kejuruanList] : []);

    let updatedList: KejuruanDetail[];
    if (editingKejuruanId) {
      updatedList = currentList.map(j => {
        if (j.id === editingKejuruanId) {
          return {
            ...j,
            kode: jurKode.trim().toUpperCase() || 'JUR',
            nama: jurNama.trim(),
            singkatan: jurSingkatan.trim() || jurNama.trim(),
            deskripsi: jurDeskripsi.trim(),
            visi: jurVisi.trim(),
            kuotaRombel: Number(jurKuotaRombel) || 1,
            kuotaSiswa: Number(jurKuotaSiswa) || 36,
            fasilitasLab: jurFasilitasLab.trim(),
            prospekKerja: jurProspekKerja.trim(),
            status: jurStatus,
            aktif: jurStatus === 'aktif',
          };
        }
        return j;
      });
    } else {
      const newJur: KejuruanDetail = {
        id: `jur-${Date.now()}`,
        kode: jurKode.trim().toUpperCase() || 'JUR',
        nama: jurNama.trim(),
        singkatan: jurSingkatan.trim() || jurNama.trim(),
        deskripsi: jurDeskripsi.trim(),
        visi: jurVisi.trim(),
        kuotaRombel: Number(jurKuotaRombel) || 1,
        kuotaSiswa: Number(jurKuotaSiswa) || 36,
        fasilitasLab: jurFasilitasLab.trim(),
        prospekKerja: jurProspekKerja.trim(),
        status: jurStatus,
        aktif: jurStatus === 'aktif',
      };
      updatedList = [...currentList, newJur];
    }

    const updatedSchool: SchoolInfo = {
      ...formData,
      kejuruanList: updatedList,
    };
    setFormData(updatedSchool);
    onUpdateSchoolInfo(updatedSchool);
    setShowKejuruanModal(false);
    setSaveSuccessMsg(`Program keahlian "${jurNama}" berhasil disimpan!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleDeleteKejuruan = (id: string) => {
    const currentList = (formData.kejuruanList && formData.kejuruanList.length > 0)
      ? [...formData.kejuruanList]
      : (SCHOOL_INFO.kejuruanList ? [...SCHOOL_INFO.kejuruanList] : []);

    const target = currentList.find(j => j.id === id);
    if (!target) return;
    setDeleteConfirmKejuruan(target);
  };

  const handleConfirmDeleteKejuruan = () => {
    if (!deleteConfirmKejuruan) return;
    const id = deleteConfirmKejuruan.id;
    const currentList = (formData.kejuruanList && formData.kejuruanList.length > 0)
      ? [...formData.kejuruanList]
      : (SCHOOL_INFO.kejuruanList ? [...SCHOOL_INFO.kejuruanList] : []);

    const updatedList = currentList.filter(j => j.id !== id);
    const updatedSchool: SchoolInfo = {
      ...formData,
      kejuruanList: updatedList,
    };
    setFormData(updatedSchool);
    onUpdateSchoolInfo(updatedSchool);
    setSaveSuccessMsg(`Program keahlian "${deleteConfirmKejuruan.nama}" berhasil dihapus.`);
    setDeleteConfirmKejuruan(null);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Calculate total quota and rombel automatically
  const totalRombelDihitung = (Number(formData.rombelJurusan?.farmasi) || 2) +
    (Number(formData.rombelJurusan?.keperawatan) || 2) +
    (Number(formData.rombelJurusan?.kecantikan) || 1) +
    (Number(formData.rombelJurusan?.perhotelan) || 1);

  const totalKuotaDihitung = (formData.kuotaJurusan?.farmasi || 0) +
    (formData.kuotaJurusan?.keperawatan || 0) +
    (formData.kuotaJurusan?.kecantikan || 0) +
    (formData.kuotaJurusan?.perhotelan || 0);

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalNama = formData.nama?.trim() || 'SMK';
    const finalNamaLengkap = formData.namaLengkap?.trim() || finalNama;

    // Helper to find quota in kejuruanList
    const findInKejuruan = (keywords: string[]): number | null => {
      const found = (formData.kejuruanList || []).find(j => {
        const text = `${j.nama || ''} ${j.singkatan || ''} ${j.kode || ''}`.toLowerCase();
        return keywords.some(k => text.includes(k));
      });
      return typeof found?.kuotaSiswa === 'number' && found.kuotaSiswa > 0 ? Number(found.kuotaSiswa) : null;
    };

    // Prioritize values based on the active sub-section or non-zero entries
    const isKejuruanActive = activeSubSection === 'kejuruan';

    let farmasi = isKejuruanActive
      ? (findInKejuruan(['farmasi']) ?? Number(formData.kuotaJurusan?.farmasi || 72))
      : (Number(formData.kuotaJurusan?.farmasi) || findInKejuruan(['farmasi']) || 72);

    let keperawatan = isKejuruanActive
      ? (findInKejuruan(['perawat', 'keperawatan']) ?? Number(formData.kuotaJurusan?.keperawatan || 72))
      : (Number(formData.kuotaJurusan?.keperawatan) || findInKejuruan(['perawat', 'keperawatan']) || 72);

    let kecantikan = isKejuruanActive
      ? (findInKejuruan(['cantik', 'kecantikan', 'spa']) ?? Number(formData.kuotaJurusan?.kecantikan || 36))
      : (Number(formData.kuotaJurusan?.kecantikan) || findInKejuruan(['cantik', 'kecantikan', 'spa']) || 36);

    let perhotelan = isKejuruanActive
      ? (findInKejuruan(['hotel', 'perhotelan']) ?? Number(formData.kuotaJurusan?.perhotelan || 36))
      : (Number(formData.kuotaJurusan?.perhotelan) || findInKejuruan(['hotel', 'perhotelan']) || 36);

    let rombelFarmasi = Number(formData.rombelJurusan?.farmasi || 2);
    let rombelKeperawatan = Number(formData.rombelJurusan?.keperawatan || 2);
    let rombelKecantikan = Number(formData.rombelJurusan?.kecantikan || 1);
    let rombelPerhotelan = Number(formData.rombelJurusan?.perhotelan || 1);

    const totalKuotaDihitung = farmasi + keperawatan + kecantikan + perhotelan;

    // Synchronize kejuruanList's kuotaSiswa & kuotaRombel
    const updatedKejuruanList = (formData.kejuruanList || []).map(jur => {
      const lower = `${jur.nama || ''} ${jur.singkatan || ''} ${jur.kode || ''}`.toLowerCase();
      let kuota = jur.kuotaSiswa;
      let rombel = jur.kuotaRombel;
      if (lower.includes('farmasi')) {
        kuota = farmasi;
        rombel = rombelFarmasi;
      } else if (lower.includes('perawat') || lower.includes('keperawatan')) {
        kuota = keperawatan;
        rombel = rombelKeperawatan;
      } else if (lower.includes('cantik') || lower.includes('kecantikan') || lower.includes('spa')) {
        kuota = kecantikan;
        rombel = rombelKecantikan;
      } else if (lower.includes('hotel') || lower.includes('perhotelan')) {
        kuota = perhotelan;
        rombel = rombelPerhotelan;
      }
      return { ...jur, kuotaSiswa: kuota, kuotaRombel: rombel };
    });

    const finalLogoUrl = formData.logoUrl || schoolInfo.logoUrl || '/logo_bpm.png';
    const finalLogoKananUrl = formData.logoKananUrl !== undefined 
      ? formData.logoKananUrl 
      : (formData.kopSekolah?.logoKananUrl || schoolInfo.logoKananUrl || '');

    const updated: SchoolInfo = {
      ...formData,
      logoUrl: finalLogoUrl,
      logoKiriUrl: finalLogoUrl,
      logoSekolah: finalLogoUrl,
      logoKananUrl: finalLogoKananUrl,
      nama: finalNama,
      namaLengkap: finalNamaLengkap,
      kejuruanList: updatedKejuruanList.length > 0 ? updatedKejuruanList : formData.kejuruanList,
      kuotaJurusan: {
        farmasi,
        keperawatan,
        kecantikan,
        perhotelan,
      },
      rombelJurusan: {
        farmasi: rombelFarmasi,
        keperawatan: rombelKeperawatan,
        kecantikan: rombelKecantikan,
        perhotelan: rombelPerhotelan,
      },
      gelombangList: formData.gelombangList && formData.gelombangList.length > 0
        ? formData.gelombangList
        : (schoolInfo.gelombangList || INITIAL_GELOMBANG),
      kuotaPerJurusan: {
        farmasi,
        asistenKeperawatan: keperawatan,
        tataKecantikan: kecantikan,
        perhotelan,
      },
      kuotaSPMB: totalKuotaDihitung,
      kopSekolah: {
        ...formData.kopSekolah,
        yayasan: formData.kopSekolah?.yayasan?.trim() || 'YAYASAN PENDIDIKAN BAKTI PUTRA MANDIRI',
        instansi: formData.kopSekolah?.instansi?.trim() || finalNama.toUpperCase(),
        subJudul: formData.kopSekolah?.subJudul?.trim() || 'KOMPETENSI KEAHLIAN VOKASI & KEJURUAN TERPADU',
        teleponEmail: formData.kopSekolah?.teleponEmail?.trim() || `${formData.alamatLengkap || formData.alamat} | Telp: ${formData.telepon}`,
        garisGanda: formData.kopSekolah?.garisGanda ?? true,
        fontFamily: formData.kopSekolah?.fontFamily || 'Times New Roman, Times, Georgia, serif',
        fontSizeYayasan: Number(formData.kopSekolah?.fontSizeYayasan || 12),
        fontSizeInstansi: Number(formData.kopSekolah?.fontSizeInstansi || 18),
        fontSizeSubJudul: Number(formData.kopSekolah?.fontSizeSubJudul || 11),
        fontSizeTeleponEmail: Number(formData.kopSekolah?.fontSizeTeleponEmail || 10),
        logoSize: Number(formData.kopSekolah?.logoSize || 64),
        logoKananSize: Number(formData.kopSekolah?.logoKananSize || formData.kopSekolah?.logoSize || 64),
        logoKananUrl: finalLogoKananUrl,
        tampilkanLogoKanan: formData.kopSekolah?.tampilkanLogoKanan ?? Boolean(finalLogoKananUrl),
        lineThickness: formData.kopSekolah?.lineThickness || 'sedang',
      },
      lokasiSekolah: {
        latitude: Number(formData.lokasiSekolah?.latitude ?? DEFAULT_SCHOOL_LAT),
        longitude: Number(formData.lokasiSekolah?.longitude ?? DEFAULT_SCHOOL_LNG),
        radiusMeters: Number(formData.lokasiSekolah?.radiusMeters ?? DEFAULT_RADIUS_METERS),
        namaTempat: formData.lokasiSekolah?.namaTempat || 'SMK Kesehatan Bakti Putra Mandiri',
        mapsUrl: formData.lokasiSekolah?.mapsUrl || DEFAULT_MAPS_URL,
      },
    };

    setFormData(updated);
    onUpdateSchoolInfo(updated);
    setSaveSuccessMsg(`Perubahan berhasil disimpan! Data identitas, kuota SPMB, dan lokasi Geofence Maps sekolah telah diperbarui.`);
    setTimeout(() => setSaveSuccessMsg(null), 5000);
  };

  // Google Maps and Geofence Location Handlers
  const [geoNotice, setGeoNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);

  const handleExtractCoordsFromUrl = () => {
    const rawUrl = formData.lokasiSekolah?.mapsUrl || '';
    if (!rawUrl.trim()) {
      setGeoNotice({ type: 'error', text: 'Silakan masukkan atau tempel link Google Maps terlebih dahulu.' });
      return;
    }
    const coords = parseGoogleMapsCoords(rawUrl);
    if (coords) {
      setFormData(prev => ({
        ...prev,
        lokasiSekolah: {
          ...prev.lokasiSekolah,
          latitude: coords.latitude,
          longitude: coords.longitude,
          radiusMeters: prev.lokasiSekolah?.radiusMeters ?? DEFAULT_RADIUS_METERS,
          mapsUrl: rawUrl.trim()
        }
      }));
      setGeoNotice({ 
        type: 'success', 
        text: `Koordinat berhasil diekstrak otomatis: Lat ${coords.latitude}, Lng ${coords.longitude}!` 
      });
      setTimeout(() => setGeoNotice(null), 4000);
    } else {
      setGeoNotice({ 
        type: 'error', 
        text: 'Tidak dapat menemukan angka koordinat otomatis dari link ini. Silakan masukkan angka Latitude dan Longitude secara manual di bawah.' 
      });
    }
  };

  const handleDetectCurrentAdminGps = () => {
    if (!navigator.geolocation) {
      setGeoNotice({ type: 'error', text: 'Browser tidak mendukung deteksi GPS Geolocation.' });
      return;
    }
    setIsDetectingGps(true);
    setGeoNotice(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(7));
        const lng = Number(pos.coords.longitude.toFixed(7));
        setFormData(prev => ({
          ...prev,
          lokasiSekolah: {
            ...prev.lokasiSekolah,
            latitude: lat,
            longitude: lng,
            radiusMeters: prev.lokasiSekolah?.radiusMeters ?? DEFAULT_RADIUS_METERS,
            mapsUrl: prev.lokasiSekolah?.mapsUrl || `https://maps.google.com/?q=${lat},${lng}`
          }
        }));
        setIsDetectingGps(false);
        setGeoNotice({ 
          type: 'success', 
          text: `Posisi GPS saat ini berhasil diambil: Lat ${lat}, Lng ${lng} (Akurasi ±${Math.round(pos.coords.accuracy)}m).` 
        });
        setTimeout(() => setGeoNotice(null), 4000);
      },
      (err) => {
        setIsDetectingGps(false);
        setGeoNotice({ 
          type: 'error', 
          text: `Gagal membaca GPS: ${err.message}. Pastikan izin lokasi aktif di browser Anda.` 
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleResetToOfficialLocation = () => {
    setFormData(prev => ({
      ...prev,
      lokasiSekolah: {
        latitude: DEFAULT_SCHOOL_LAT,
        longitude: DEFAULT_SCHOOL_LNG,
        radiusMeters: 100,
        namaTempat: 'SMK Kesehatan Bakti Putra Mandiri',
        mapsUrl: DEFAULT_MAPS_URL
      }
    }));
    setGeoNotice({ 
      type: 'success', 
      text: 'Titik resmi SMK Kesehatan Bakti Putra Mandiri (-6.3463444, 106.57316) dan toleransi 100 meter berhasil dimuat!' 
    });
    setTimeout(() => setGeoNotice(null), 4000);
  };

  // Mitra Handlers
  const handleOpenAddMitra = () => {
    setEditingMitraId(null);
    setMitraNama('');
    setMitraKategori('Rumah Sakit');
    setMitraKerjasama('');
    setMitraAlamat('');
    setMitraKontak('');
    setMitraLogo('');
    setShowMitraModal(true);
  };

  const handleOpenEditMitra = (m: MitraIndustri) => {
    setEditingMitraId(m.id);
    setMitraNama(m.nama);
    setMitraKategori(m.kategori);
    setMitraKerjasama(m.bidangKerjasama);
    setMitraAlamat(m.alamat || '');
    setMitraKontak(m.kontak || '');
    setMitraLogo(m.logoUrl || '');
    setShowMitraModal(true);
  };

  const handleSaveMitra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mitraNama) return;

    let updatedList = [...(formData.mitraIndustri || [])];
    if (editingMitraId) {
      updatedList = updatedList.map(m => m.id === editingMitraId ? {
        ...m,
        nama: mitraNama,
        kategori: mitraKategori,
        bidangKerjasama: mitraKerjasama,
        alamat: mitraAlamat,
        kontak: mitraKontak,
        logoUrl: mitraLogo || m.logoUrl,
      } : m);
    } else {
      const newM: MitraIndustri = {
        id: `mitra-${Date.now()}`,
        nama: mitraNama,
        kategori: mitraKategori,
        bidangKerjasama: mitraKerjasama,
        alamat: mitraAlamat,
        kontak: mitraKontak,
        logoUrl: mitraLogo || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=300&q=80',
      };
      updatedList = [newM, ...updatedList];
    }

    const updatedSchool = { ...formData, mitraIndustri: updatedList };
    setFormData(updatedSchool);
    onUpdateSchoolInfo(updatedSchool);
    setShowMitraModal(false);
    setSaveSuccessMsg(`Data mitra industri "${mitraNama}" berhasil diperbarui!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleDeleteMitra = (id: string, nama: string) => {
    if (window.confirm(`Hapus kemitraan dengan "${nama}"?`)) {
      const updatedList = (formData.mitraIndustri || []).filter(m => m.id !== id);
      const updatedSchool = { ...formData, mitraIndustri: updatedList };
      setFormData(updatedSchool);
      onUpdateSchoolInfo(updatedSchool);
    }
  };

  return (
    <div className="space-y-6">
      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900 text-xs font-semibold shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Sub-menu Navigation for School Settings */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 flex flex-wrap gap-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveSubSection('identitas')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSubSection === 'identitas'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Nama & Alamat Sekolah</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubSection('kop_logo')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSubSection === 'kop_logo'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>KOP Surat & Logo Sekolah</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubSection('kejuruan')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSubSection === 'kejuruan'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Pengaturan 4 Kejuruan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubSection('kuota_ta')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSubSection === 'kuota_ta'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Tahun Pelajaran & Kuota 4 Jurusan SPMB</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubSection('slogan_sosmed')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSubSection === 'slogan_sosmed'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>Slogan & Sosial Media</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubSection('mitra')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSubSection === 'mitra'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Mitra Industri DUDI ({(formData.mitraIndustri || []).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubSection('lulusan')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSubSection === 'lulusan'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Tracer Study Lulusan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubSection('lokasi_geofence')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSubSection === 'lokasi_geofence'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-teal-900 bg-teal-50/70 hover:bg-teal-100 border border-teal-200'
          }`}
        >
          <MapPin className="w-4 h-4 text-teal-600" />
          <span>Lokasi Maps & Geofence Presensi</span>
        </button>
      </div>

      {/* 1. SUB-SECTION: NAMA SEKOLAH, ALAMAT, KEPALA SEKOLAH, AKREDITASI */}
      {activeSubSection === 'identitas' && (
        <form onSubmit={handleSaveAll} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>Identitas Resmi & Alamat Sekolah</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Data ini akan tercantum di kop surat dinas, rapor siswa, kartu peserta ujian, dan formulir pendaftaran.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                Terverifikasi
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Resmi Sekolah *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={(e) => {
                    const newNama = e.target.value;
                    setFormData({
                      ...formData,
                      nama: newNama,
                      namaLengkap: newNama,
                      kopSekolah: formData.kopSekolah ? {
                        yayasan: formData.kopSekolah.yayasan || 'YAYASAN PENDIDIKAN',
                        instansi: newNama.toUpperCase(),
                        subJudul: formData.kopSekolah.subJudul || 'KOMPETENSI KEAHLIAN VOKASI & KEJURUAN TERPADU',
                        teleponEmail: formData.kopSekolah.teleponEmail || '',
                        garisGanda: formData.kopSekolah.garisGanda ?? true,
                      } : undefined,
                    });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Singkatan Resmi
                </label>
                <input
                  type="text"
                  value={formData.singkatan}
                  onChange={(e) => setFormData({ ...formData, singkatan: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-semibold text-slate-900"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Lembaga
                </label>
                <input
                  type="text"
                  value={formData.namaLengkap}
                  onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Lengkap (Jalan, Kp, RT/RW, Desa, Kecamatan) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.alamatLengkap}
                  onChange={(e) => setFormData({ ...formData, alamatLengkap: e.target.value, alamat: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Pos
                </label>
                <input
                  type="text"
                  value={formData.kodePos || '16360'}
                  onChange={(e) => setFormData({ ...formData, kodePos: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Pokok Sekolah Nasional (NPSN) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.npsn}
                  onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  No. SK Izin Operasional
                </label>
                <input
                  type="text"
                  value={formData.skIzinOperasional || '421.3/182-Disdik/2016'}
                  onChange={(e) => setFormData({ ...formData, skIzinOperasional: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Akreditasi Sekolah *
                </label>
                <input
                  type="text"
                  required
                  value={formData.akreditasi}
                  onChange={(e) => setFormData({ ...formData, akreditasi: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-emerald-800 font-bold"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor SK Akreditasi BAN-SM
                </label>
                <input
                  type="text"
                  value={formData.skAkreditasi || 'BAN-SM No. 1347/BAN-SM/SK/2023'}
                  onChange={(e) => setFormData({ ...formData, skAkreditasi: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Kepala Sekolah *
                </label>
                <input
                  type="text"
                  required
                  value={formData.kepalaSekolah}
                  onChange={(e) => setFormData({ ...formData, kepalaSekolah: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIP Kepala Sekolah *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nipKepalaSekolah}
                  onChange={(e) => setFormData({ ...formData, nipKepalaSekolah: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telepon / Hotline Sekolah
                </label>
                <input
                  type="text"
                  value={formData.telepon}
                  onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Resmi Sekolah
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Website Resmi
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Identitas & Alamat Sekolah</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 2. SUB-SECTION: KOP SEKOLAH & LOGO SEKOLAH (DENGAN LIVE PREVIEW) */}
      {activeSubSection === 'kop_logo' && (
        <form onSubmit={handleSaveAll} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Pengaturan KOP Surat Resmi & Logo Sekolah</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Sesuaikan teks kop lembaga, izin kejuruan, dan logo sekolah yang tampil pada cetakan dokumen kedinasan.
                </p>
              </div>
            </div>

            {/* LIVE PREVIEW KOP SURAT */}
            <div className="bg-amber-50/50 rounded-2xl border border-amber-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pratinjau Langsung KOP Surat Resmi (Live Print Preview):</span>
                </div>
                <div className="text-[11px] text-amber-800 font-mono bg-white px-2 py-0.5 rounded border border-amber-300">
                  Font: {formData.kopSekolah?.fontFamily?.split(',')[0] || 'Times New Roman'}
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-slate-300 shadow-sm">
                <KopSuratView schoolInfo={formData} />
                <p className="text-[11px] italic text-slate-400 text-center mt-2">
                  [Area Dokumen Surat Keputusan / Jadwal Pelajaran / Kartu Peserta Ujian / Leger Nilai / Lembar Absensi]
                </p>
              </div>
            </div>

            {/* PENGATURAN FONT & UKURAN KOP SURAT */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Pengaturan Font & Ukuran Huruf KOP Surat (Tipografi Kedinasan)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    kopSekolah: {
                      ...formData.kopSekolah!,
                      fontFamily: 'Times New Roman, Times, Georgia, serif',
                      fontSizeYayasan: 12,
                      fontSizeInstansi: 18,
                      fontSizeSubJudul: 11,
                      fontSizeTeleponEmail: 10,
                      logoSize: 64,
                      lineThickness: 'sedang',
                      garisGanda: true,
                    }
                  })}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium flex items-center gap-1 w-fit"
                >
                  <RotateCcw className="w-3 h-3 text-amber-600" />
                  <span>Reset ke Standar Dinas</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Pilihan Font Family */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Font (Font Family) KOP
                  </label>
                  <select
                    value={formData.kopSekolah?.fontFamily || 'Times New Roman, Times, Georgia, serif'}
                    onChange={(e) => setFormData({
                      ...formData,
                      kopSekolah: { ...formData.kopSekolah!, fontFamily: e.target.value }
                    })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium bg-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Times New Roman, Times, Georgia, serif">Times New Roman (Klasik / Standar Dinas Formal)</option>
                    <option value="Arial, Helvetica, sans-serif">Arial (Modern Bersih & Tegas)</option>
                    <option value="Georgia, serif">Georgia (Elegan Berwibawa)</option>
                    <option value="Tahoma, Geneva, sans-serif">Tahoma (Kompak & Tajam)</option>
                    <option value="Trebuchet MS, sans-serif">Trebuchet MS (Humanis & Dinamis)</option>
                    <option value="Courier New, Courier, monospace">Courier New (Monospace Naskah)</option>
                    <option value="Cambria, serif">Cambria (Resmi Tajam Modern)</option>
                  </select>
                </div>

                {/* 2. Ukuran Font Yayasan (Baris 1) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Ukuran Baris 1: Yayasan
                    </label>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      {formData.kopSekolah?.fontSizeYayasan || 12} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="22"
                    step="0.5"
                    value={formData.kopSekolah?.fontSizeYayasan || 12}
                    onChange={(e) => setFormData({
                      ...formData,
                      kopSekolah: { ...formData.kopSekolah!, fontSizeYayasan: parseFloat(e.target.value) }
                    })}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>

                {/* 3. Ukuran Font Nama Lembaga / Sekolah (Baris 2) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Ukuran Baris 2: Nama Lembaga
                    </label>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      {formData.kopSekolah?.fontSizeInstansi || 18} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="30"
                    step="0.5"
                    value={formData.kopSekolah?.fontSizeInstansi || 18}
                    onChange={(e) => setFormData({
                      ...formData,
                      kopSekolah: { ...formData.kopSekolah!, fontSizeInstansi: parseFloat(e.target.value) }
                    })}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>

                {/* 4. Ukuran Font Sub-Judul Kejuruan (Baris 3) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Ukuran Baris 3: Sub-Judul
                    </label>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      {formData.kopSekolah?.fontSizeSubJudul || 11} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="9"
                    max="18"
                    step="0.5"
                    value={formData.kopSekolah?.fontSizeSubJudul || 11}
                    onChange={(e) => setFormData({
                      ...formData,
                      kopSekolah: { ...formData.kopSekolah!, fontSizeSubJudul: parseFloat(e.target.value) }
                    })}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>

                {/* 5. Ukuran Font Alamat & Kontak (Baris 4) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Ukuran Baris 4: Kontak & Alamat
                    </label>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      {formData.kopSekolah?.fontSizeTeleponEmail || 10} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="16"
                    step="0.5"
                    value={formData.kopSekolah?.fontSizeTeleponEmail || 10}
                    onChange={(e) => setFormData({
                      ...formData,
                      kopSekolah: { ...formData.kopSekolah!, fontSizeTeleponEmail: parseFloat(e.target.value) }
                    })}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>

                {/* 6. Ukuran Logo Kiri & Logo Kanan */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Ukuran Logo Kiri (Utama)
                    </label>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      {formData.kopSekolah?.logoSize || 64} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="96"
                    step="2"
                    value={formData.kopSekolah?.logoSize || 64}
                    onChange={(e) => setFormData({
                      ...formData,
                      kopSekolah: { ...formData.kopSekolah!, logoSize: parseInt(e.target.value) }
                    })}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Ukuran Logo Kanan (Pendamping)
                    </label>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      {formData.kopSekolah?.logoKananSize || formData.kopSekolah?.logoSize || 64} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="96"
                    step="2"
                    value={formData.kopSekolah?.logoKananSize || formData.kopSekolah?.logoSize || 64}
                    onChange={(e) => setFormData({
                      ...formData,
                      kopSekolah: { ...formData.kopSekolah!, logoKananSize: parseInt(e.target.value) }
                    })}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Garis Pembatas KOP Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Model Garis Pembatas KOP
                  </label>
                  <select
                    value={formData.kopSekolah?.garisGanda ? 'ganda' : 'tunggal'}
                    onChange={(e) => setFormData({
                      ...formData,
                      kopSekolah: { ...formData.kopSekolah!, garisGanda: e.target.value === 'ganda' }
                    })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium bg-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ganda">Garis Ganda Resmi (Double Line - Standar Kedinasan)</option>
                    <option value="tunggal">Garis Tunggal (Single Line)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ketebalan Garis Pembatas
                  </label>
                  <select
                    value={formData.kopSekolah?.lineThickness || 'sedang'}
                    onChange={(e) => setFormData({
                      ...formData,
                      kopSekolah: { ...formData.kopSekolah!, lineThickness: e.target.value as any }
                    })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium bg-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="tipis">Garis Halus (Tipis 1.5px)</option>
                    <option value="sedang">Standar Kedinasan (Sedang 2.5px)</option>
                    <option value="tebal">Tegas & Kontras (Tebal 3.5px)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* FORM KOP & LOGO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Header Yayasan (Baris 1) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.kopSekolah?.yayasan || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    kopSekolah: { ...formData.kopSekolah!, yayasan: e.target.value }
                  })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lembaga Sekolah pada KOP (Baris 2) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.kopSekolah?.instansi || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    kopSekolah: { ...formData.kopSekolah!, instansi: e.target.value }
                  })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-bold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sub-Judul Kejuruan / Izin Operasional pada KOP (Baris 3) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.kopSekolah?.subJudul || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    kopSekolah: { ...formData.kopSekolah!, subJudul: e.target.value }
                  })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat & Kontak pada KOP (Baris 4) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.kopSekolah?.teleponEmail || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    kopSekolah: { ...formData.kopSekolah!, teleponEmail: e.target.value }
                  })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* DUAL LOGO UPLOAD: LOGO KIRI (UTAMA) & LOGO KANAN (PENDAMPING KOP SURAT) */}
              <div className="md:col-span-2 space-y-4 pt-3 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-600" />
                      <span>Upload 2 Logo KOP Surat (Logo Kiri & Logo Kanan Kedinasan)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Format resmi KOP kedinasan mendukung 2 logo: Sisi kiri untuk logo utama yayasan/sekolah, dan sisi kanan untuk logo instansi pembina (Tut Wuri Handayani / SMK Bisa / Pemda).
                    </p>
                  </div>
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full border self-start sm:self-auto ${
                    (formData.kopSekolah?.tampilkanLogoKanan ?? Boolean(formData.logoKananUrl || formData.kopSekolah?.logoKananUrl)) && (formData.logoKananUrl || formData.kopSekolah?.logoKananUrl)
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {(formData.kopSekolah?.tampilkanLogoKanan ?? Boolean(formData.logoKananUrl || formData.kopSekolah?.logoKananUrl)) && (formData.logoKananUrl || formData.kopSekolah?.logoKananUrl)
                      ? '✓ KOP Mode: 2 Logo (Kiri & Kanan Aktif)'
                      : '• KOP Mode: 1 Logo (Kiri Simetris)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* 1. KARTU UPLOAD LOGO KIRI (UTAMA SEKOLAH) */}
                  <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-extrabold flex items-center justify-center">1</span>
                        <span>Logo Kiri (Logo Utama Sekolah) *</span>
                      </span>
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        Sisi Kiri KOP
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3.5 bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs">
                      <div className="w-20 h-20 shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-1.5 flex items-center justify-center overflow-hidden">
                        <img
                          src={formData.logoUrl || formData.logoKiriUrl || '/logo_bpm.png'}
                          alt="Logo Kiri"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/logo_bpm.png';
                          }}
                        />
                      </div>

                      <div className="flex-1 space-y-2 w-full">
                        <div className="flex flex-wrap gap-2">
                          <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{isProcessingLogoKiri ? 'Memproses...' : 'Upload File Logo Kiri'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isProcessingLogoKiri}
                              onChange={handleLogoKiriFileUpload}
                              className="hidden"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => handleRemoveBlackBgLogo('kiri')}
                            className="px-2.5 py-2 text-[11px] rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            title="Hapus latar belakang luar logo (pinggiran) agar transparan tanpa merusak isi logo di dalam"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                            <span>Bersihkan Pinggiran Logo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setFormData({ 
                              ...formData, 
                              logoUrl: '/logo_bpm.png', 
                              logoKiriUrl: '/logo_bpm.png',
                              logoSekolah: '/logo_bpm.png'
                            })}
                            className="px-2.5 py-2 text-[11px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3 text-slate-500" />
                            <span>Default BAPUMA</span>
                          </button>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={formData.logoUrl || ''}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              logoUrl: e.target.value,
                              logoKiriUrl: e.target.value,
                              logoSekolah: e.target.value
                            })}
                            placeholder="Atau masukkan URL Web logo kiri..."
                            className="w-full px-2.5 py-1 text-[11px] rounded-lg border border-slate-300 font-mono text-slate-700"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">
                          Logo ini digunakan pada KOP Surat kiri, Navbar Website, Login Portal, dan Raport. Format: PNG, JPG, SVG (otomatis dioptimalkan).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2. KARTU UPLOAD LOGO KANAN (PENDAMPING KEDINASAN) */}
                  <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold flex items-center justify-center">2</span>
                        <span>Logo Kanan (Logo Sekunder / Kedinasan)</span>
                      </span>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.kopSekolah?.tampilkanLogoKanan ?? Boolean(formData.logoKananUrl || formData.kopSekolah?.logoKananUrl)}
                          onChange={(e) => setFormData({
                            ...formData,
                            kopSekolah: {
                              ...formData.kopSekolah!,
                              tampilkanLogoKanan: e.target.checked
                            }
                          })}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <span className="text-[11px] font-bold text-blue-900">Aktifkan</span>
                      </label>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3.5 bg-white p-3.5 rounded-xl border border-blue-200 shadow-xs">
                      <div className="w-20 h-20 shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-1.5 flex items-center justify-center overflow-hidden">
                        {(formData.logoKananUrl || formData.kopSekolah?.logoKananUrl) ? (
                          <img
                            src={formData.logoKananUrl || formData.kopSekolah?.logoKananUrl}
                            alt="Logo Kanan"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = PRESET_KOP_LOGOS[0].url;
                            }}
                          />
                        ) : (
                          <div className="text-center p-1 text-slate-400">
                            <ImageIcon className="w-6 h-6 mx-auto stroke-1" />
                            <span className="text-[9px] block mt-0.5 leading-tight">Belum Ada</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-2 w-full">
                        <div className="flex flex-wrap gap-2">
                          <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{isProcessingLogoKanan ? 'Memproses...' : 'Upload File Logo Kanan'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isProcessingLogoKanan}
                              onChange={handleLogoKananFileUpload}
                              className="hidden"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={handleRemoveLogoKanan}
                            className="px-2.5 py-2 text-[11px] rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold border border-rose-200 transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Nonaktifkan</span>
                          </button>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={formData.logoKananUrl || formData.kopSekolah?.logoKananUrl || ''}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              logoKananUrl: e.target.value,
                              kopSekolah: {
                                ...formData.kopSekolah!,
                                logoKananUrl: e.target.value,
                                tampilkanLogoKanan: Boolean(e.target.value)
                              }
                            })}
                            placeholder="Atau masukkan URL Web logo kanan..."
                            className="w-full px-2.5 py-1 text-[11px] rounded-lg border border-slate-300 font-mono text-slate-700"
                          />
                        </div>

                        {/* Pilihan Cepat Preset Resmi */}
                        <div className="pt-1 space-y-1">
                          <span className="text-[10px] font-bold text-slate-600 block">Pilihan Preset Cepat Logo Kedinasan:</span>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSetPresetLogoKanan(PRESET_KOP_LOGOS[0].url)}
                              className="px-2 py-1 text-[10px] rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-medium border border-blue-200"
                            >
                              Tut Wuri Handayani
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetPresetLogoKanan(PRESET_KOP_LOGOS[1].url)}
                              className="px-2 py-1 text-[10px] rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-medium border border-blue-200"
                            >
                              SMK Bisa - Hebat
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetPresetLogoKanan(PRESET_KOP_LOGOS[2].url)}
                              className="px-2 py-1 text-[10px] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-300"
                            >
                              Logo BAPUMA
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Simpan KOP & Logo Sekolah</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SUB-SECTION: PENGATURAN PROGRAM KEAHLIAN / KEJURUAN SEKOLAH */}
      {activeSubSection === 'kejuruan' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <span>Manajemen Kompetensi Keahlian &amp; Program Kejuruan</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Program keahlian/jurusan dapat ditambah, diedit, atau dihapus. Perubahan otomatis tersinkron ke Rombel Kelas, Biodata Siswa, Jadwal KBM, Dewan Guru, dan Portal SPMB.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                  {((formData.kejuruanList && formData.kejuruanList.length > 0) ? formData.kejuruanList : (SCHOOL_INFO.kejuruanList || [])).filter(j => j.status !== 'nonaktif').length} Jurusan Aktif
                  {((formData.kejuruanList && formData.kejuruanList.length > 0) ? formData.kejuruanList : (SCHOOL_INFO.kejuruanList || [])).some(j => j.status === 'nonaktif') && (
                    <span className="text-rose-700 ml-1">
                      ({((formData.kejuruanList && formData.kejuruanList.length > 0) ? formData.kejuruanList : (SCHOOL_INFO.kejuruanList || [])).filter(j => j.status === 'nonaktif').length} Nonaktif)
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddKejuruan}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Program Kejuruan</span>
                </button>
              </div>
            </div>

            {/* LIST KARTU KEJURUAN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {((formData.kejuruanList && formData.kejuruanList.length > 0) 
                ? formData.kejuruanList 
                : (SCHOOL_INFO.kejuruanList || [])
              ).map((jur, index) => {
                const isNonaktif = jur.status === 'nonaktif';
                return (
                <div key={jur.id} className={`p-5 rounded-2xl border transition-all space-y-3.5 shadow-xs flex flex-col justify-between ${
                  isNonaktif 
                    ? 'bg-slate-50/70 border-dashed border-rose-300 opacity-75' 
                    : 'bg-white border-slate-200 hover:border-amber-300'
                }`}>
                  <div className="space-y-3">
                    {/* Header Card: Kode, Nama, Status & Tombol Aksi */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shadow-xs shrink-0 ${
                          isNonaktif ? 'bg-slate-400 text-white' : 'bg-amber-600 text-white'
                        }`}>
                          {jur.kode}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm leading-snug">
                              {jur.nama}
                            </h4>
                            {isNonaktif ? (
                              <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                                <PowerOff className="w-3 h-3 text-rose-500" />
                                <span>Nonaktif</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Aktif</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Singkatan: {jur.singkatan}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">
                              #{index + 1}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tombol Aksi: Nonaktifkan, Edit & Hapus */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleStatusKejuruan(jur.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isNonaktif
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700'
                          }`}
                          title={isNonaktif ? 'Aktifkan Kembali Program Kejuruan' : 'Nonaktifkan Program Kejuruan'}
                        >
                          {isNonaktif ? <Power className="w-3.5 h-3.5 text-emerald-600" /> : <PowerOff className="w-3.5 h-3.5 text-rose-600" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditKejuruan(jur)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 transition-colors cursor-pointer"
                          title="Edit Program Kejuruan"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteKejuruan(jur.id)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 transition-colors cursor-pointer"
                          title="Hapus Program Kejuruan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Kuota & Rombel Pill */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                        Kuota: {jur.kuotaSiswa || 36} Siswa
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[11px]">
                        Alokasi: {jur.kuotaRombel || 1} Rombel
                      </span>
                    </div>

                    {/* Deskripsi */}
                    <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="font-bold text-slate-700 block mb-0.5 text-[11px]">Profil &amp; Deskripsi:</span>
                      {jur.deskripsi || 'Belum ada deskripsi profil kejuruan.'}
                    </div>

                    {/* Visi Kejuruan */}
                    {jur.visi && (
                      <div className="text-[11px] text-amber-900 bg-amber-50/70 p-2 rounded-xl border border-amber-100">
                        <span className="font-bold block text-[10px] text-amber-800 uppercase tracking-wide">Visi Keahlian:</span>
                        {jur.visi}
                      </div>
                    )}

                    {/* Fasilitas Lab */}
                    {jur.fasilitasLab && (
                      <div className="text-[11px] text-slate-600">
                        <strong className="text-slate-800">Fasilitas Lab:</strong> {jur.fasilitasLab}
                      </div>
                    )}

                    {/* Prospek Kerja */}
                    {jur.prospekKerja && (
                      <div className="text-[11px] text-slate-600">
                        <strong className="text-slate-800">Peluang Karir:</strong> {jur.prospekKerja}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>ID: {jur.id}</span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditKejuruan(jur)}
                      className="font-bold text-amber-700 hover:text-amber-800 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ubah Detail</span>
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                Setiap perubahan jurusan otomatis disinkronkan ke seluruh sistem dan Cloud Firestore.
              </span>
              <button
                type="button"
                onClick={handleOpenAddKejuruan}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Program Kejuruan Baru</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SUB-SECTION: TAHUN AJARAN & KUOTA 4 KEJURUAN SPMB */}
      {activeSubSection === 'kuota_ta' && (
        <form onSubmit={handleSaveAll} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>Tahun Pelajaran & Manajemen Kuota 4 Kejuruan SPMB</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Atur alokasi kursi peserta didik baru pada masing-masing program keahlian kejuruan secara real-time.
                </p>
              </div>
            </div>

            {/* PENGATURAN TAHUN AJARAN */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Konfigurasi Tahun Pelajaran Aktif
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tahun Ajaran KBM *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.tahunAjaranPembelajaran}
                    onChange={(e) => setFormData({ ...formData, tahunAjaranPembelajaran: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Semester KBM *
                  </label>
                  <select
                    value={formData.semesterPembelajaran}
                    onChange={(e) => setFormData({ ...formData, semesterPembelajaran: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold"
                  >
                    <option value="Ganjil">Semester Ganjil</option>
                    <option value="Genap">Semester Genap</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tahun Ajaran SPMB *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.tahunAjaranSPMB}
                    onChange={(e) => setFormData({ ...formData, tahunAjaranSPMB: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold text-teal-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Status Pendaftaran SPMB
                  </label>
                  <select
                    value={formData.statusSPMB}
                    onChange={(e) => setFormData({ ...formData, statusSPMB: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold text-emerald-700"
                  >
                    <option value="Buka">Buka (Pendaftaran Aktif)</option>
                    <option value="Segera Dibuka">Segera Dibuka</option>
                    <option value="Tutup">Tutup (Pendaftaran Ditutup)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* KUOTA & ROMBEL TIAP JURUSAN UNTUK 4 KEJURUAN */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <span>Alokasi Kuota & Jumlah Rombel per Program Kejuruan (4 Kejuruan)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Atur kapasitas rombongan belajar (rombel) dan daya tampung siswa baru untuk masing-masing program keahlian.
                  </p>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold shrink-0">
                  Total Daya Tampung: <span className="text-amber-700 font-extrabold">{totalRombelDihitung} Rombel</span> • <span className="text-emerald-700 font-extrabold">{totalKuotaDihitung} Siswa</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Farmasi */}
                <div className="p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950">1. Farmasi</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                      {formData.rombelJurusan?.farmasi || 2} Rombel
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">Farmasi Klinis & Komunitas</p>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-700">
                          Jumlah Rombel (Kelas)
                        </label>
                        <span className="text-[10px] text-emerald-700 font-bold">
                          ~{Math.round((formData.kuotaJurusan?.farmasi || 72) / (formData.rombelJurusan?.farmasi || 2))} Siswa/Kls
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          required
                          value={formData.rombelJurusan?.farmasi ?? 2}
                          onChange={(e) => {
                            const rVal = Math.max(1, parseInt(e.target.value) || 1);
                            setFormData(prev => ({
                              ...prev,
                              rombelJurusan: {
                                ...(prev.rombelJurusan || { farmasi: 2, keperawatan: 2, kecantikan: 1, perhotelan: 1 }),
                                farmasi: rVal,
                              }
                            }));
                          }}
                          className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-300 bg-white text-emerald-900 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const r = formData.rombelJurusan?.farmasi ?? 2;
                            const newCap = r * 36;
                            setFormData(prev => ({
                              ...prev,
                              kuotaJurusan: {
                                ...prev.kuotaJurusan!,
                                farmasi: newCap
                              }
                            }));
                          }}
                          title="Setel otomatis 36 siswa per rombel"
                          className="px-2 py-1.5 text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl border border-emerald-300 whitespace-nowrap shrink-0 transition-colors"
                        >
                          Auto 36×
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Kapasitas Kuota (Siswa)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={formData.kuotaJurusan?.farmasi || 72}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          const updatedKejuruan = (formData.kejuruanList || []).map(j => 
                            j.nama.toLowerCase().includes('farmasi') ? { ...j, kuotaSiswa: val } : j
                          );
                          setFormData({
                            ...formData,
                            kejuruanList: updatedKejuruan,
                            kuotaJurusan: {
                              ...formData.kuotaJurusan!,
                              farmasi: val
                            }
                          });
                        }}
                        className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-300 bg-white text-emerald-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Asisten Keperawatan */}
                <div className="p-4 rounded-2xl border-2 border-blue-200 bg-blue-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-950">2. Asisten Keperawatan</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-200 text-blue-900 text-[10px] font-bold">
                      {formData.rombelJurusan?.keperawatan || 2} Rombel
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">Keperawatan Medis & Caregiver</p>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-700">
                          Jumlah Rombel (Kelas)
                        </label>
                        <span className="text-[10px] text-blue-700 font-bold">
                          ~{Math.round((formData.kuotaJurusan?.keperawatan || 72) / (formData.rombelJurusan?.keperawatan || 2))} Siswa/Kls
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          required
                          value={formData.rombelJurusan?.keperawatan ?? 2}
                          onChange={(e) => {
                            const rVal = Math.max(1, parseInt(e.target.value) || 1);
                            setFormData(prev => ({
                              ...prev,
                              rombelJurusan: {
                                ...(prev.rombelJurusan || { farmasi: 2, keperawatan: 2, kecantikan: 1, perhotelan: 1 }),
                                keperawatan: rVal,
                              }
                            }));
                          }}
                          className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-blue-300 bg-white text-blue-900 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const r = formData.rombelJurusan?.keperawatan ?? 2;
                            const newCap = r * 36;
                            setFormData(prev => ({
                              ...prev,
                              kuotaJurusan: {
                                ...prev.kuotaJurusan!,
                                keperawatan: newCap
                              }
                            }));
                          }}
                          title="Setel otomatis 36 siswa per rombel"
                          className="px-2 py-1.5 text-[10px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-xl border border-blue-300 whitespace-nowrap shrink-0 transition-colors"
                        >
                          Auto 36×
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Kapasitas Kuota (Siswa)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={formData.kuotaJurusan?.keperawatan || 72}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          const updatedKejuruan = (formData.kejuruanList || []).map(j => 
                            (j.nama.toLowerCase().includes('perawat') || j.nama.toLowerCase().includes('keperawatan')) ? { ...j, kuotaSiswa: val } : j
                          );
                          setFormData({
                            ...formData,
                            kejuruanList: updatedKejuruan,
                            kuotaJurusan: {
                              ...formData.kuotaJurusan!,
                              keperawatan: val
                            }
                          });
                        }}
                        className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-blue-300 bg-white text-blue-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Tata Kecantikan dan Spa */}
                <div className="p-4 rounded-2xl border-2 border-pink-200 bg-pink-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-pink-950">3. Tata Kecantikan & Spa</span>
                    <span className="px-2 py-0.5 rounded-full bg-pink-200 text-pink-900 text-[10px] font-bold">
                      {formData.rombelJurusan?.kecantikan || 1} Rombel
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">Perawatan Kulit, Rambut, & Spa</p>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-700">
                          Jumlah Rombel (Kelas)
                        </label>
                        <span className="text-[10px] text-pink-700 font-bold">
                          ~{Math.round((formData.kuotaJurusan?.kecantikan || 36) / (formData.rombelJurusan?.kecantikan || 1))} Siswa/Kls
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          required
                          value={formData.rombelJurusan?.kecantikan ?? 1}
                          onChange={(e) => {
                            const rVal = Math.max(1, parseInt(e.target.value) || 1);
                            setFormData(prev => ({
                              ...prev,
                              rombelJurusan: {
                                ...(prev.rombelJurusan || { farmasi: 2, keperawatan: 2, kecantikan: 1, perhotelan: 1 }),
                                kecantikan: rVal,
                              }
                            }));
                          }}
                          className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-pink-300 bg-white text-pink-900 focus:outline-none focus:border-pink-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const r = formData.rombelJurusan?.kecantikan ?? 1;
                            const newCap = r * 36;
                            setFormData(prev => ({
                              ...prev,
                              kuotaJurusan: {
                                ...prev.kuotaJurusan!,
                                kecantikan: newCap
                              }
                            }));
                          }}
                          title="Setel otomatis 36 siswa per rombel"
                          className="px-2 py-1.5 text-[10px] font-bold bg-pink-100 hover:bg-pink-200 text-pink-900 rounded-xl border border-pink-300 whitespace-nowrap shrink-0 transition-colors"
                        >
                          Auto 36×
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Kapasitas Kuota (Siswa)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={formData.kuotaJurusan?.kecantikan || 36}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          const updatedKejuruan = (formData.kejuruanList || []).map(j => 
                            (j.nama.toLowerCase().includes('cantik') || j.nama.toLowerCase().includes('spa')) ? { ...j, kuotaSiswa: val } : j
                          );
                          setFormData({
                            ...formData,
                            kejuruanList: updatedKejuruan,
                            kuotaJurusan: {
                              ...formData.kuotaJurusan!,
                              kecantikan: val
                            }
                          });
                        }}
                        className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-pink-300 bg-white text-pink-900 focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Perhotelan (Hospitality & RS Management) */}
                <div className="p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950">4. Perhotelan</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900 text-[10px] font-bold">
                      {formData.rombelJurusan?.perhotelan || 1} Rombel
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">Hospitality & Management RS</p>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-700">
                          Jumlah Rombel (Kelas)
                        </label>
                        <span className="text-[10px] text-indigo-700 font-bold">
                          ~{Math.round((formData.kuotaJurusan?.perhotelan || 36) / (formData.rombelJurusan?.perhotelan || 1))} Siswa/Kls
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          required
                          value={formData.rombelJurusan?.perhotelan ?? 1}
                          onChange={(e) => {
                            const rVal = Math.max(1, parseInt(e.target.value) || 1);
                            setFormData(prev => ({
                              ...prev,
                              rombelJurusan: {
                                ...(prev.rombelJurusan || { farmasi: 2, keperawatan: 2, kecantikan: 1, perhotelan: 1 }),
                                perhotelan: rVal,
                              }
                            }));
                          }}
                          className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-indigo-300 bg-white text-indigo-900 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const r = formData.rombelJurusan?.perhotelan ?? 1;
                            const newCap = r * 36;
                            setFormData(prev => ({
                              ...prev,
                              kuotaJurusan: {
                                ...prev.kuotaJurusan!,
                                perhotelan: newCap
                              }
                            }));
                          }}
                          title="Setel otomatis 36 siswa per rombel"
                          className="px-2 py-1.5 text-[10px] font-bold bg-indigo-100 hover:bg-indigo-200 text-indigo-900 rounded-xl border border-indigo-300 whitespace-nowrap shrink-0 transition-colors"
                        >
                          Auto 36×
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Kapasitas Kuota (Siswa)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={formData.kuotaJurusan?.perhotelan || 36}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          const updatedKejuruan = (formData.kejuruanList || []).map(j => 
                            (j.nama.toLowerCase().includes('hotel') || j.nama.toLowerCase().includes('perhotelan')) ? { ...j, kuotaSiswa: val } : j
                          );
                          setFormData({
                            ...formData,
                            kejuruanList: updatedKejuruan,
                            kuotaJurusan: {
                              ...formData.kuotaJurusan!,
                              perhotelan: val
                            }
                          });
                        }}
                        className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-indigo-300 bg-white text-indigo-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PENGATURAN GELOMBANG PENDAFTARAN SPMB & RENTANG TANGGAL, BULAN, TAHUN */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-slate-50 border-2 border-indigo-100 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider">
                      Jadwal Gelombang SPMB
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span>Pengaturan Gelombang Pendaftaran & Rentang Waktu</span>
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600">
                    Atur jadwal periode pendaftaran (rentang tanggal, bulan, tahun), status pembukaan, biaya formulir, serta fasilitas cashback DSP per gelombang.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddGelombang}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 shrink-0 transition-all hover:scale-102"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Gelombang Baru</span>
                </button>
              </div>

              {/* List of Gelombang Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {(formData.gelombangList && formData.gelombangList.length > 0 ? formData.gelombangList : INITIAL_GELOMBANG).map((gel, idx) => {
                  const isActive = (formData.gelombangSPMB || '').trim().toLowerCase() === gel.nama.trim().toLowerCase();
                  return (
                    <div
                      key={gel.id || `gel-${idx}`}
                      className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col justify-between space-y-3 bg-white ${
                        isActive 
                          ? 'border-indigo-500 shadow-md ring-2 ring-indigo-200' 
                          : 'border-slate-200 shadow-xs hover:border-indigo-300'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
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
                          <h5 className="font-extrabold text-xs text-slate-900 leading-tight">
                            {gel.nama}
                          </h5>
                        </div>

                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider shrink-0 shadow-xs">
                            Aktif di Portal
                          </span>
                        )}
                      </div>

                      {/* Period: Rentang Tanggal, Bulan, Tahun */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>Rentang Waktu:</span>
                        </div>
                        <div className="font-bold text-slate-900 text-xs pl-5">
                          {formatIndoDate(gel.tanggalMulai)} <span className="text-slate-400 font-normal">s/d</span> {formatIndoDate(gel.tanggalSelesai)}
                        </div>
                        <div className="text-[10px] text-slate-500 pl-5">
                          Tahun Seleksi: <strong className="text-slate-700 font-bold">{gel.tahun || '2026'}</strong>
                        </div>
                      </div>

                      {/* Benefits & Fees */}
                      <div className="space-y-1 text-[11px] text-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Biaya Formulir:</span>
                          <span className="font-bold text-slate-800">
                            {gel.biayaPendaftaran && gel.biayaPendaftaran > 0 
                              ? `Rp ${gel.biayaPendaftaran.toLocaleString('id-ID')}` 
                              : 'Gratis (Rp 0)'}
                          </span>
                        </div>
                        {gel.diskonDSP && (
                          <div className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                            🎁 {gel.diskonDSP}
                          </div>
                        )}
                        {gel.keterangan && (
                          <div className="text-[10px] text-slate-500 line-clamp-2">
                            ℹ️ {gel.keterangan}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSetActiveGelombang(gel)}
                          disabled={isActive}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                            isActive
                              ? 'bg-indigo-50 text-indigo-700 cursor-default'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                          }`}
                        >
                          {isActive ? <Check className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                          <span>{isActive ? 'Aktif' : 'Pilih Jadi Aktif'}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditGelombang(gel)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Gelombang"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGelombang(gel.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Gelombang"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Nomor Rekening & Metode Pembayaran Pendaftaran Siswa Baru (PPDB) */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-50/70 via-emerald-50/40 to-slate-50 border-2 border-teal-200 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-teal-200/70 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-teal-700 text-white text-[10px] font-black uppercase tracking-wider">
                      Keuangan PPDB
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-teal-700" />
                      <span>Rekening Bank & Pembayaran Pendaftaran Siswa Baru</span>
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600">
                    Atur rekening bank sekolah untuk transfer biaya pendaftaran PPDB. Calon siswa juga dapat memilih pembayaran tunai langsung di loket panitia sekolah.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddRekening}
                  className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 shrink-0 transition-all hover:scale-102 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Rekening Bank</span>
                </button>
              </div>

              {/* Informational Method Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white border border-teal-200 flex items-start gap-3 shadow-xs">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900">Metode 1: Transfer Bank</h5>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Calon murid atau orang tua mentransfer biaya pendaftaran ke salah satu rekening resmi sekolah di bawah ini.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-teal-200 flex items-start gap-3 shadow-xs">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900">Metode 2: Datang Langsung ke Sekolah</h5>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Pembayaran tunai dapat dilakukan langsung di loket keuangan / panitia PPDB Kampus SMK Bakti Putra Mandiri (Senin - Sabtu 08.00 - 15.00 WIB).
                    </p>
                  </div>
                </div>
              </div>

              {/* List of Bank Accounts */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                {(formData.rekeningBankList && formData.rekeningBankList.length > 0 ? formData.rekeningBankList : INITIAL_REKENING_BANK).map((rek, idx) => {
                  return (
                    <div
                      key={rek.id || `rek-${idx}`}
                      className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col justify-between space-y-3 bg-white ${
                        rek.isUtama 
                          ? 'border-teal-500 shadow-sm ring-2 ring-teal-200' 
                          : 'border-slate-200 shadow-xs hover:border-teal-300'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm text-teal-900 flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-teal-700" />
                            <span>{rek.namaBank}</span>
                          </span>
                          {rek.isUtama && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[9px] border border-emerald-300">
                              REKENING UTAMA
                            </span>
                          )}
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Nomor Rekening
                          </div>
                          <div className="font-mono font-black text-base text-slate-900 tracking-wider">
                            {rek.nomorRekening}
                          </div>
                          <div className="text-xs font-bold text-teal-800 pt-0.5">
                            a.n. {rek.atasNama}
                          </div>
                          {rek.cabang && (
                            <div className="text-[10px] text-slate-500">
                              Cabang: {rek.cabang}
                            </div>
                          )}
                        </div>

                        {rek.keterangan && (
                          <div className="text-[11px] text-slate-600 italic">
                            {rek.keterangan}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        {!rek.isUtama ? (
                          <button
                            type="button"
                            onClick={() => handleSetRekeningUtama(rek.id)}
                            className="px-2 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                          >
                            Set Jadi Utama
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700">✓ Default Pembayaran</span>
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditRekening(rek)}
                            className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Rekening"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRekening(rek.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Rekening"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Editable Instruksi Pembayaran */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Instruksi Pembayaran untuk Calon Murid:
                </label>
                <textarea
                  rows={2}
                  value={formData.ppdbInstruksiPembayaran || ''}
                  onChange={(e) => setFormData({ ...formData, ppdbInstruksiPembayaran: e.target.value })}
                  placeholder="Misal: Pembayaran pendaftaran dapat dilakukan dengan transfer ke Rekening Bank BJB SMK Bakti Putra Mandiri (0061324992100) atau datang langsung ke sekolah di Bagian Keuangan / Panitia PPDB..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-teal-300 bg-white focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              {saveSuccessMsg ? (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-300 animate-pulse">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Tahun Ajaran & Kuota SPMB Berhasil Disimpan!</span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-500">
                  Total kuota otomatis sinkron ke halaman beranda web, tombol SPMB, dan formulir pendaftaran.
                </span>
              )}
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md transition-colors flex items-center gap-2 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Tahun Pelajaran & Kuota Jurusan</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 4. SUB-SECTION: SLOGAN & MEDIA SOSIAL */}
      {activeSubSection === 'slogan_sosmed' && (
        <form onSubmit={handleSaveAll} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-amber-600" />
                  <span>Slogan Sekolah & Tautan Media Sosial Resmi</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Teks slogan dan tautan sosial media resmi yang terhubung di footer dan portal profil sekolah.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Slogan Utama Sekolah (Motto) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.slogan || ''}
                  onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                  placeholder="Contoh: Terampil, Berakhlak Mulia, dan Siap Kerja"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sub-Slogan / Deskripsi Keunggulan
                </label>
                <textarea
                  rows={2}
                  value={formData.subSlogan || ''}
                  onChange={(e) => setFormData({ ...formData, subSlogan: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">
                  Tautan Akun Media Sosial Resmi
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Instagram Resmi
                    </label>
                    <input
                      type="text"
                      value={formData.sosmed?.instagram || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        sosmed: { ...formData.sosmed, instagram: e.target.value }
                      })}
                      placeholder="https://instagram.com/smkbaktiputramandiri"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Facebook Resmi
                    </label>
                    <input
                      type="text"
                      value={formData.sosmed?.facebook || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        sosmed: { ...formData.sosmed, facebook: e.target.value }
                      })}
                      placeholder="https://facebook.com/smkbaktiputramandiribogor"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Kanal YouTube Resmi
                    </label>
                    <input
                      type="text"
                      value={formData.sosmed?.youtube || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        sosmed: { ...formData.sosmed, youtube: e.target.value }
                      })}
                      placeholder="https://youtube.com/@smkbaktiputramandiriofficial"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Akun TikTok Resmi
                    </label>
                    <input
                      type="text"
                      value={formData.sosmed?.tiktok || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        sosmed: { ...formData.sosmed, tiktok: e.target.value }
                      })}
                      placeholder="https://tiktok.com/@smk_bpm_parungpanjang"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nomor WhatsApp Resmi Layanan Informasi & SPMB
                    </label>
                    <input
                      type="text"
                      value={formData.sosmed?.whatsapp || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        sosmed: { ...formData.sosmed, whatsapp: e.target.value }
                      })}
                      placeholder="081288997766"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Slogan & Media Sosial</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 5. SUB-SECTION: MITRA INDUSTRI DUDI */}
      {activeSubSection === 'mitra' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>Manajemen Mitra Industri DUDI (Dunia Usaha & Dunia Industri)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Rumah Sakit, Jaringan Apotek, Klinik Estetika Spa, dan Hotel mitra kerja sama PKL & penyaluran kerja.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddMitra}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Mitra Baru</span>
              </button>
            </div>

            {/* MITRA LIST TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-3 px-4">Nama Mitra</th>
                    <th className="py-3 px-4">Kategori Industri</th>
                    <th className="py-3 px-4">Bidang Kerja Sama</th>
                    <th className="py-3 px-4">Kontak / Lokasi</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(formData.mitraIndustri || []).map((m) => (
                    <tr key={m.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          {m.logoUrl ? (
                            <img src={m.logoUrl} alt={m.nama} className="w-8 h-8 rounded-lg object-cover border border-slate-200" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                              <Building2 className="w-4 h-4" />
                            </div>
                          )}
                          <span>{m.nama}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          m.kategori === 'Rumah Sakit' ? 'bg-blue-100 text-blue-800' :
                          m.kategori === 'Apotek & Farmasi' ? 'bg-emerald-100 text-emerald-800' :
                          m.kategori === 'Hotel & Hospitalitas' ? 'bg-indigo-100 text-indigo-800' :
                          m.kategori === 'Kecantikan & Estetika' ? 'bg-pink-100 text-pink-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {m.kategori}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">
                        {m.bidangKerjasama}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        <div>{m.kontak || '-'}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{m.alamat || '-'}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditMitra(m)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-amber-600 transition-colors"
                            title="Edit Mitra"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMitra(m.id, m.nama)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Hapus Mitra"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!formData.mitraIndustri || formData.mitraIndustri.length === 0) && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        Belum ada mitra industri DUDI yang terdaftar. Klik tombol Tambah Mitra Baru.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. SUB-SECTION: TRACER STUDY LULUSAN */}
      {activeSubSection === 'lulusan' && (
        <form onSubmit={handleSaveAll} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-amber-600" />
                  <span>Pengaturan Statistik Tracer Study & Lulusan Terserap</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Data keterserapan alumni yang bekerja di RS/Apotek/Hotel, kuliah ke PTN/PTS, atau berwirausaha mandiri.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-xs font-semibold text-emerald-800">Persentase Bekerja</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.tracerLulusan?.persenBekerja || 84}
                    onChange={(e) => setFormData({
                      ...formData,
                      tracerLulusan: {
                        ...formData.tracerLulusan!,
                        persenBekerja: parseInt(e.target.value) || 0
                      }
                    })}
                    className="w-20 px-3 py-1.5 text-base font-bold rounded-lg border border-emerald-300 text-emerald-950 bg-white"
                  />
                  <span className="text-sm font-bold text-emerald-900">%</span>
                </div>
                <p className="text-[10px] text-emerald-700 mt-1">Diserap RS, Apotek, Klinik, & Hotel</p>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-xs font-semibold text-blue-800">Melanjutkan Kuliah</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.tracerLulusan?.persenKuliah || 11}
                    onChange={(e) => setFormData({
                      ...formData,
                      tracerLulusan: {
                        ...formData.tracerLulusan!,
                        persenKuliah: parseInt(e.target.value) || 0
                      }
                    })}
                    className="w-20 px-3 py-1.5 text-base font-bold rounded-lg border border-blue-300 text-blue-950 bg-white"
                  />
                  <span className="text-sm font-bold text-blue-900">%</span>
                </div>
                <p className="text-[10px] text-blue-700 mt-1">Melanjutkan ke PTN & PTS Kesehatan</p>
              </div>

              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                <span className="text-xs font-semibold text-purple-800">Wirausaha Mandiri</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.tracerLulusan?.persenWirausaha || 5}
                    onChange={(e) => setFormData({
                      ...formData,
                      tracerLulusan: {
                        ...formData.tracerLulusan!,
                        persenWirausaha: parseInt(e.target.value) || 0
                      }
                    })}
                    className="w-20 px-3 py-1.5 text-base font-bold rounded-lg border border-purple-300 text-purple-950 bg-white"
                  />
                  <span className="text-sm font-bold text-purple-900">%</span>
                </div>
                <p className="text-[10px] text-purple-700 mt-1">Membuka Salon, Apotek, atau Usaha Vokasi</p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-xs font-semibold text-amber-800">Total Alumni Terserap</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="number"
                    min="0"
                    value={formData.tracerLulusan?.totalAlumni || 1420}
                    onChange={(e) => setFormData({
                      ...formData,
                      tracerLulusan: {
                        ...formData.tracerLulusan!,
                        totalAlumni: parseInt(e.target.value) || 0
                      }
                    })}
                    className="w-28 px-3 py-1.5 text-base font-bold rounded-lg border border-amber-300 text-amber-950 bg-white"
                  />
                  <span className="text-xs font-semibold text-amber-900">Alumni</span>
                </div>
                <p className="text-[10px] text-amber-700 mt-1">Total lulusan angkatan ke-1 hingga sekarang</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mitra Penyerap Utama (Disorot di Web Profil)
                </label>
                <input
                  type="text"
                  value={formData.tracerLulusan?.mitraPenyerapUtama || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    tracerLulusan: {
                      ...formData.tracerLulusan!,
                      mitraPenyerapUtama: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan Ringkasan Keterserapan Kerja
                </label>
                <textarea
                  rows={2}
                  value={formData.tracerLulusan?.keterangan || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    tracerLulusan: {
                      ...formData.tracerLulusan!,
                      keterangan: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Data Tracer Lulusan</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 8. SUB-SECTION: LOKASI GPS & GEOFENCE PRESENSI MANDIRI SISWA */}
      {activeSubSection === 'lokasi_geofence' && (
        <form onSubmit={handleSaveAll} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  <span>Pengaturan Titik Koordinat GPS & Geofence Presensi SMK Bakti Putra Mandiri</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Kelola tautan Google Maps, titik lintang/bujur (Latitude & Longitude), serta batas radius toleransi presensi mandiri siswa & guru.
                </p>
              </div>
              <a
                href={formData.lokasiSekolah?.mapsUrl || DEFAULT_MAPS_URL}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold flex items-center gap-1.5 self-start transition-colors"
              >
                <Navigation className="w-3.5 h-3.5 text-teal-600" />
                <span>Buka Titik di Google Maps</span>
              </a>
            </div>

            {/* Notification alert for extracting coords / GPS detection */}
            {geoNotice && (
              <div className={`p-4 rounded-xl text-xs flex items-center gap-3 animate-in fade-in duration-200 ${
                geoNotice.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-950 font-medium'
                  : 'bg-rose-50 border border-rose-300 text-rose-950 font-medium'
              }`}>
                {geoNotice.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span>{geoNotice.text}</span>
              </div>
            )}

            {/* Geofence Info Alert */}
            <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 flex items-start gap-3 text-xs text-teal-950">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 font-extrabold text-sm shadow-xs">
                {formData.lokasiSekolah?.radiusMeters ?? DEFAULT_RADIUS_METERS}m
              </div>
              <div className="space-y-1">
                <p className="font-bold text-teal-900">Validasi Geofence & Toleransi Jarak Presensi:</p>
                <p className="text-teal-800 leading-relaxed text-[11px]">
                  Toleransi standar <strong className="font-bold">100 meter</strong> sangat direkomendasikan agar siswa dan guru di seluruh penjuru gedung SMK Bakti Putra Mandiri (gerbang masuk, ruang kelas, laboratorium, hingga aula) dapat melakukan presensi mandiri dengan lancar meskipun ada fluktuasi akurasi satelit GPS smartphone (±10m–30m).
                </p>
              </div>
            </div>

            {/* 1. TAUTAN GOOGLE MAPS & AUTO-EXTRACT */}
            <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-xs font-bold text-slate-800">
                  Tautan / Link Google Maps Titik Lokasi Sekolah
                </label>
                <span className="text-[11px] text-slate-500 font-normal">
                  Contoh: <code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-[10px]">https://maps.app.goo.gl/845UtAVRFmNoEVvSA</code>
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={formData.lokasiSekolah?.mapsUrl || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    lokasiSekolah: {
                      ...formData.lokasiSekolah,
                      latitude: formData.lokasiSekolah?.latitude ?? DEFAULT_SCHOOL_LAT,
                      longitude: formData.lokasiSekolah?.longitude ?? DEFAULT_SCHOOL_LNG,
                      radiusMeters: formData.lokasiSekolah?.radiusMeters ?? DEFAULT_RADIUS_METERS,
                      mapsUrl: e.target.value.trim()
                    }
                  })}
                  placeholder="Tempel tautan Google Maps sekolah di sini..."
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:border-teal-500 bg-white"
                />

                <button
                  type="button"
                  onClick={handleExtractCoordsFromUrl}
                  className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shrink-0 flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  title="Ekstrak Latitude dan Longitude secara otomatis dari tautan yang ditempel"
                >
                  <Compass className="w-4 h-4" />
                  <span>Ekstrak Koordinat</span>
                </button>
              </div>

              {/* Quick Calibration Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToOfficialLocation}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-teal-500 text-slate-700 hover:text-teal-800 font-semibold text-[11px] flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
                  <span>Gunakan Titik Resmi SMK Bakti Putra Mandiri (-6.3463444, 106.57316)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDetectCurrentAdminGps}
                  disabled={isDetectingGps}
                  className="px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-300 hover:bg-teal-100 text-teal-800 font-semibold text-[11px] flex items-center gap-1.5 transition-colors"
                >
                  <LocateFixed className={`w-3.5 h-3.5 text-teal-600 ${isDetectingGps ? 'animate-spin' : ''}`} />
                  <span>{isDetectingGps ? 'Mengambil GPS...' : 'Ambil Titik Koordinat GPS Perangkat Saya Saat Ini'}</span>
                </button>
              </div>
            </div>

            {/* 2. KOORDINAT LATITUDE, LONGITUDE, RADIUS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Latitude (Garis Lintang) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.lokasiSekolah?.latitude ?? DEFAULT_SCHOOL_LAT}
                  onChange={(e) => setFormData({
                    ...formData,
                    lokasiSekolah: {
                      ...formData.lokasiSekolah,
                      latitude: parseFloat(e.target.value) || DEFAULT_SCHOOL_LAT,
                      longitude: formData.lokasiSekolah?.longitude ?? DEFAULT_SCHOOL_LNG,
                      radiusMeters: formData.lokasiSekolah?.radiusMeters ?? DEFAULT_RADIUS_METERS,
                      mapsUrl: formData.lokasiSekolah?.mapsUrl || DEFAULT_MAPS_URL
                    }
                  })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:border-teal-500 bg-slate-50/50"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Titik resmi kampus: -6.3463444</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Longitude (Garis Bujur) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.lokasiSekolah?.longitude ?? DEFAULT_SCHOOL_LNG}
                  onChange={(e) => setFormData({
                    ...formData,
                    lokasiSekolah: {
                      ...formData.lokasiSekolah,
                      latitude: formData.lokasiSekolah?.latitude ?? DEFAULT_SCHOOL_LAT,
                      longitude: parseFloat(e.target.value) || DEFAULT_SCHOOL_LNG,
                      radiusMeters: formData.lokasiSekolah?.radiusMeters ?? DEFAULT_RADIUS_METERS,
                      mapsUrl: formData.lokasiSekolah?.mapsUrl || DEFAULT_MAPS_URL
                    }
                  })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:border-teal-500 bg-slate-50/50"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Titik resmi kampus: 106.5731600</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Radius Toleransi Geofence (Meter) *
                </label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  required
                  value={formData.lokasiSekolah?.radiusMeters ?? DEFAULT_RADIUS_METERS}
                  onChange={(e) => setFormData({
                    ...formData,
                    lokasiSekolah: {
                      ...formData.lokasiSekolah,
                      latitude: formData.lokasiSekolah?.latitude ?? DEFAULT_SCHOOL_LAT,
                      longitude: formData.lokasiSekolah?.longitude ?? DEFAULT_SCHOOL_LNG,
                      radiusMeters: parseInt(e.target.value) || DEFAULT_RADIUS_METERS,
                      mapsUrl: formData.lokasiSekolah?.mapsUrl || DEFAULT_MAPS_URL
                    }
                  })}
                  className="w-full px-3 py-2 text-xs font-bold text-teal-800 rounded-xl border border-slate-300 focus:outline-none focus:border-teal-500 bg-slate-50/50"
                />
                
                {/* Quick Radius Selection Badges */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {[100, 200, 250, 300, 500].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        lokasiSekolah: {
                          ...formData.lokasiSekolah,
                          latitude: formData.lokasiSekolah?.latitude ?? DEFAULT_SCHOOL_LAT,
                          longitude: formData.lokasiSekolah?.longitude ?? DEFAULT_SCHOOL_LNG,
                          radiusMeters: val,
                          mapsUrl: formData.lokasiSekolah?.mapsUrl || DEFAULT_MAPS_URL
                        }
                      })}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                        (formData.lokasiSekolah?.radiusMeters ?? DEFAULT_RADIUS_METERS) === val
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-teal-500'
                      }`}
                    >
                      {val}m {val === 250 ? '★ Rekomendasi Kampus' : ''}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. LIVE EMBEDDED MAP PREVIEW */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-teal-600" />
                  <span>Pratinjau Peta Lokasi SMK Bakti Putra Mandiri</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {formData.lokasiSekolah?.latitude ?? DEFAULT_SCHOOL_LAT}, {formData.lokasiSekolah?.longitude ?? DEFAULT_SCHOOL_LNG}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden relative shadow-inner bg-slate-100 h-56 sm:h-64">
                <iframe
                  title="Peta Titik SMK Bakti Putra Mandiri"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src={`https://maps.google.com/maps?q=${formData.lokasiSekolah?.latitude ?? DEFAULT_SCHOOL_LAT},${formData.lokasiSekolah?.longitude ?? DEFAULT_SCHOOL_LNG}&hl=id&z=18&output=embed`}
                  className="w-full h-full object-cover"
                ></iframe>

                <div className="absolute top-2.5 left-2.5 bg-slate-900/85 backdrop-blur-xs text-white px-3 py-1 rounded-xl text-[10px] font-bold border border-white/20 shadow-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
                  <span>Radius Geofence Presensi: {formData.lokasiSekolah?.radiusMeters ?? DEFAULT_RADIUS_METERS} Meter</span>
                </div>
              </div>
            </div>

            {/* 4. TOMBOL SIMPAN */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-slate-500 text-[11px]">
                Perubahan lokasi dan radius akan langsung tersinkronisasi ke seluruh siswa & guru di sistem SIM.
              </p>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Pengaturan Koordinat & Geofence Maps</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* MODAL TAMBAH / EDIT MITRA INDUSTRI */}
      {showMitraModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-600" />
                <span>{editingMitraId ? 'Edit Mitra Industri DUDI' : 'Tambah Mitra Industri Baru'}</span>
              </h4>
              <button
                onClick={() => setShowMitraModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMitra} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Institusi / Perusahaan Mitra *
                </label>
                <input
                  type="text"
                  required
                  value={mitraNama}
                  onChange={(e) => setMitraNama(e.target.value)}
                  placeholder="Contoh: RS Hermina Parung Panjang"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kategori Industri *
                  </label>
                  <select
                    value={mitraKategori}
                    onChange={(e) => setMitraKategori(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    <option value="Rumah Sakit">Rumah Sakit</option>
                    <option value="Apotek & Farmasi">Apotek & Farmasi</option>
                    <option value="Hotel & Hospitalitas">Hotel & Hospitalitas</option>
                    <option value="Kecantikan & Estetika">Kecantikan & Estetika</option>
                    <option value="Puskesmas / Klinik">Puskesmas / Klinik</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kontak / Telepon
                  </label>
                  <input
                    type="text"
                    value={mitraKontak}
                    onChange={(e) => setMitraKontak(e.target.value)}
                    placeholder="(021) 5978-XXXX"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bidang Kerja Sama & Program *
                </label>
                <input
                  type="text"
                  required
                  value={mitraKerjasama}
                  onChange={(e) => setMitraKerjasama(e.target.value)}
                  placeholder="Contoh: PKL Asisten Perawat, Uji Kompetensi Keahlian, Penyaluran Kerja"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alamat Lengkap Mitra
                </label>
                <input
                  type="text"
                  value={mitraAlamat}
                  onChange={(e) => setMitraAlamat(e.target.value)}
                  placeholder="Jl. Raya Parung Panjang, Bogor"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  URL Logo / Gambar Mitra
                </label>
                <input
                  type="text"
                  value={mitraLogo}
                  onChange={(e) => setMitraLogo(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-[11px]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMitraModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  Simpan Mitra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Save Notification (Pop-up selalu tampak di mana pun posisi scroll layar) */}
      {saveSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 max-w-lg transition-all transform animate-bounce-in shadow-2xl">
          <div className="p-4 rounded-2xl bg-emerald-950/95 backdrop-blur-md text-white border-2 border-emerald-400 flex items-start gap-3.5 shadow-emerald-950/50">
            <div className="p-2 rounded-xl bg-emerald-500 text-slate-950 font-bold shrink-0 mt-0.5 shadow-md">
              <Check className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-emerald-300">
                  Data Berhasil Disimpan & Tersinkronisasi!
                </h4>
              </div>
              <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                {saveSuccessMsg}
              </p>
              <div className="mt-2.5 pt-2 border-t border-emerald-800/80 flex items-center justify-between text-[11px] font-semibold text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Langsung aktif di Portal Beranda Web & SPMB
                </span>
                <button
                  type="button"
                  onClick={() => setSaveSuccessMsg(null)}
                  className="px-2 py-0.5 rounded bg-emerald-800/80 hover:bg-emerald-700 text-white text-[10px] font-bold"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT GELOMBANG PENDAFTARAN SPMB */}
      {showGelombangModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/10 text-white">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">
                    {editingGelombangId ? 'Edit Gelombang Pendaftaran' : 'Tambah Gelombang Pendaftaran Baru'}
                  </h3>
                  <p className="text-xs text-indigo-200">
                    Atur nama gelombang, rentang tanggal & bulan, tahun, serta fasilitas pendaftaran
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGelombangModal(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveGelombang} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor Urut *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={gelNomor}
                    onChange={(e) => setGelNomor(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Gelombang *
                  </label>
                  <input
                    type="text"
                    required
                    value={gelNama}
                    onChange={(e) => setGelNama(e.target.value)}
                    placeholder="Contoh: Gelombang 1 (Jalur Prestasi & Minat Bakat)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
              </div>

              {/* Rentang Waktu: Tanggal Mulai & Selesai + Tahun */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-950">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Rentang Waktu Pendaftaran (Tanggal, Bulan & Tahun)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tanggal & Bulan Mulai *
                    </label>
                    <input
                      type="date"
                      required
                      value={gelTglMulai}
                      onChange={(e) => setGelTglMulai(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tanggal & Bulan Selesai *
                    </label>
                    <input
                      type="date"
                      required
                      value={gelTglSelesai}
                      onChange={(e) => setGelTglSelesai(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tahun Seleksi *
                    </label>
                    <input
                      type="text"
                      required
                      value={gelTahun}
                      onChange={(e) => setGelTahun(e.target.value)}
                      placeholder="2026"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold text-indigo-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-indigo-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">Pratinjau Rentang Jadwal:</span>
                  <span className="font-bold text-indigo-900 text-xs">
                    {formatIndoDate(gelTglMulai)} s/d {formatIndoDate(gelTglSelesai)} ({gelTahun})
                  </span>
                </div>
              </div>

              {/* Status & Biaya */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Gelombang *
                  </label>
                  <select
                    value={gelStatus}
                    onChange={(e) => setGelStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Buka">Buka (Pendaftaran Aktif)</option>
                    <option value="Segera Dibuka">Segera Dibuka</option>
                    <option value="Tutup">Tutup (Pendaftaran Ditutup)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Biaya Formulir / Pendaftaran (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={gelBiaya}
                    onChange={(e) => setGelBiaya(parseInt(e.target.value) || 0)}
                    placeholder="0 = Gratis"
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {gelBiaya === 0 ? '✓ Gratis Pendaftaran' : `Rp ${gelBiaya.toLocaleString('id-ID')}`}
                  </span>
                </div>
              </div>

              {/* Diskon DSP / Fasilitas Khusus */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Diskon DSP & Fasilitas Bebas Biaya Khusus Gelombang Ini
                </label>
                <input
                  type="text"
                  value={gelDiskon}
                  onChange={(e) => setGelDiskon(e.target.value)}
                  placeholder="Contoh: Cashback DSP 50% & Bebas Biaya Seragam 2 Stel"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Keterangan Tambahan / Syarat */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan Tambahan / Persyaratan Khusus
                </label>
                <textarea
                  rows={2}
                  value={gelKeterangan}
                  onChange={(e) => setGelKeterangan(e.target.value)}
                  placeholder="Contoh: Kuota terbatas untuk 50 pendaftar pertama dengan nilai rapor rata-rata minimal 75."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowGelombangModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingGelombangId ? 'Simpan Perubahan Gelombang' : 'Tambahkan Gelombang'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT REKENING BANK PPDB */}
      {showRekeningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm leading-tight">
                    {editingRekeningId ? 'Edit Rekening Bank PPDB' : 'Tambah Rekening Bank Baru'}
                  </h4>
                  <p className="text-[11px] text-teal-100">
                    Rekening resmi untuk menerima biaya pendaftaran siswa baru
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRekeningModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRekening} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Nama Bank */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Bank *
                  </label>
                  <input
                    type="text"
                    required
                    value={rekNamaBank}
                    onChange={(e) => setRekNamaBank(e.target.value)}
                    placeholder="Contoh: Bank BJB, Bank BCA, dll."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600 font-semibold"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['Bank BJB', 'Bank BCA', 'Bank BRI', 'Bank Mandiri', 'Bank BNI'].map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setRekNamaBank(b)}
                        className="px-1.5 py-0.5 text-[9px] rounded bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-700 font-medium cursor-pointer"
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nomor Rekening */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor Rekening *
                  </label>
                  <input
                    type="text"
                    required
                    value={rekNomor}
                    onChange={(e) => setRekNomor(e.target.value.replace(/[^0-9-]/g, ''))}
                    placeholder="Contoh: 0061324992100"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Atas Nama Rekening */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Atas Nama (Pemilik Rekening) *
                </label>
                <input
                  type="text"
                  required
                  value={rekAtasNama}
                  onChange={(e) => setRekAtasNama(e.target.value)}
                  placeholder="Contoh: SMK BAKTI PUTRA MANDIRI"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600 font-semibold uppercase"
                />
              </div>

              {/* Kantor Cabang */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kantor Cabang (Opsional)
                </label>
                <input
                  type="text"
                  value={rekCabang}
                  onChange={(e) => setRekCabang(e.target.value)}
                  placeholder="Contoh: KCP Parung Panjang"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600"
                />
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan Rekening (Opsional)
                </label>
                <input
                  type="text"
                  value={rekKeterangan}
                  onChange={(e) => setRekKeterangan(e.target.value)}
                  placeholder="Contoh: Rekening Resmi Pembayaran Pendaftaran PPDB"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600"
                />
              </div>

              {/* Checkbox Rekening Utama */}
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="rekIsUtamaCheck"
                  checked={rekIsUtama}
                  onChange={(e) => setRekIsUtama(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="rekIsUtamaCheck" className="text-xs font-semibold text-teal-950 cursor-pointer">
                  Jadikan sebagai Rekening Utama (Muncul pertama di portal pendaftaran calon siswa)
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowRekeningModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingRekeningId ? 'Simpan Perubahan Rekening' : 'Tambahkan Rekening'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH & EDIT PROGRAM KEAHLIAN / KEJURUAN */}
      {showKejuruanModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {editingKejuruanId ? 'Edit Program Kejuruan' : 'Tambah Program Kejuruan Baru'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Kelola data kurikulum, kuota penerimaan, dan profil kejuruan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKejuruanModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveKejuruan} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Jurusan *
                  </label>
                  <input
                    type="text"
                    required
                    value={jurKode}
                    onChange={(e) => setJurKode(e.target.value.toUpperCase())}
                    placeholder="Contoh: FAR / TKJ"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-amber-600 font-mono font-bold uppercase"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Singkatan / Panggilan *
                  </label>
                  <input
                    type="text"
                    required
                    value={jurSingkatan}
                    onChange={(e) => setJurSingkatan(e.target.value)}
                    placeholder="Contoh: Farmasi / Keperawatan"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-amber-600 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Resmi Program Keahlian *
                </label>
                <input
                  type="text"
                  required
                  value={jurNama}
                  onChange={(e) => setJurNama(e.target.value)}
                  placeholder="Contoh: Farmasi Klinis & Komunitas"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-amber-600 font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alokasi Rombel
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={jurKuotaRombel}
                    onChange={(e) => setJurKuotaRombel(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-amber-600 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kuota Siswa SPMB
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={360}
                    value={jurKuotaSiswa}
                    onChange={(e) => setJurKuotaSiswa(parseInt(e.target.value) || 36)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-amber-600 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi &amp; Profil Keahlian
                </label>
                <textarea
                  rows={2}
                  value={jurDeskripsi}
                  onChange={(e) => setJurDeskripsi(e.target.value)}
                  placeholder="Ringkasan kompetensi yang dipelajari..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Visi &amp; Keunggulan Kejuruan
                </label>
                <input
                  type="text"
                  value={jurVisi}
                  onChange={(e) => setJurVisi(e.target.value)}
                  placeholder="Visi keunggulan lulusan..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fasilitas Laboratorium &amp; Praktik
                </label>
                <input
                  type="text"
                  value={jurFasilitasLab}
                  onChange={(e) => setJurFasilitasLab(e.target.value)}
                  placeholder="Contoh: Lab Komputer, Lab Farmasi, Studio Foto..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Prospek Kerja &amp; Karir Lulusan
                </label>
                <input
                  type="text"
                  value={jurProspekKerja}
                  onChange={(e) => setJurProspekKerja(e.target.value)}
                  placeholder="Contoh: Teknisi Jaringan, Staf Rumah Sakit, Wirausaha..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status Program Kejuruan *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setJurStatus('aktif')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      jurStatus === 'aktif'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>🟢 Aktif (Berjalan)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setJurStatus('nonaktif')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      jurStatus === 'nonaktif'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <PowerOff className="w-3.5 h-3.5 text-rose-600" />
                    <span>🔴 Nonaktif (Disembunyikan)</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Jurusan nonaktif tidak akan muncul di formulir PPDB dan alokasi rombel baru.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowKejuruanModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingKejuruanId ? 'Simpan Perubahan Kejuruan' : 'Tambahkan Kejuruan Baru'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS KEJURUAN */}
      {deleteConfirmKejuruan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Hapus Program Kejuruan?</h4>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              Apakah Anda yakin ingin menghapus program keahlian <strong className="text-slate-900 font-bold">{deleteConfirmKejuruan.nama}</strong> ({deleteConfirmKejuruan.singkatan}) dari daftar kejuruan sekolah?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmKejuruan(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteKejuruan}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Kejuruan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
