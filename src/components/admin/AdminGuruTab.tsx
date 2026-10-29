import React, { useState, useRef, useMemo } from 'react';
import { User, Mapel, Kelas, Ekskul, UserRole } from '../../types';
import { INITIAL_GURU_USERS } from '../../data/initialData';
import { downloadTemplateGuruExcel, readSpreadsheetFile } from '../../utils/excelHelper';
import { compressStudentPhoto } from '../../utils/imageCompressor';
import { 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Key, 
  CheckCircle2, 
  Phone, 
  Mail, 
  GraduationCap, 
  BookOpen, 
  UserCheck, 
  Filter,
  Check,
  Eye,
  EyeOff,
  Upload,
  Download,
  FileSpreadsheet,
  Layers,
  Award,
  AlertCircle,
  Sparkles,
  X,
  Tag,
  Briefcase,
  ShieldCheck,
  RefreshCw,
  Cloud
} from 'lucide-react';

interface AdminGuruTabProps {
  usersList: User[];
  mapelList: Mapel[];
  kelasList: Kelas[];
  ekskulList?: Ekskul[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onImportUsers?: (users: User[]) => void;
  onUpdateKelas?: (kelas: Kelas) => void;
  onUpdateEkskul?: (ekskul: Ekskul) => void;
  onUpdateMapel?: (mapel: Mapel) => void;
  onSyncAllToCloud?: () => Promise<{ success: boolean; count: number; error?: string }>;
  onPullAllFromCloud?: () => Promise<{ success: boolean; count: number; error?: string }>;
}

export const QUICK_JABATAN_OPTIONS = [
  'Kepala Sekolah',
  'Operator',
  'Bendahara',
  'Staf',
  'Guru Wali',
  'Pembina Ekskul',
  'Kesiswaan',
  'Pembina OSIS',
  'Pembina Pramuka',
  'Kepala Laboratorium',
  'Koordinator PKL',
  'Kurikulum',
  'Humas / Hubin',
  'Sarpras'
];

export const AdminGuruTab: React.FC<AdminGuruTabProps> = ({
  usersList,
  mapelList,
  kelasList,
  ekskulList = [],
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onImportUsers,
  onUpdateKelas,
  onUpdateEkskul,
  onUpdateMapel,
  onSyncAllToCloud,
  onPullAllFromCloud,
}) => {
  const [filterJurusan, setFilterJurusan] = useState<string>('Semua');
  const [filterRole, setFilterRole] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingGuru, setEditingGuru] = useState<User | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<{ [id: string]: boolean }>({});
  const [notification, setNotification] = useState<string | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [isPullingCloud, setIsPullingCloud] = useState(false);

  const handleSyncToCloud = async () => {
    if (!onSyncAllToCloud || isSyncingCloud) return;
    setIsSyncingCloud(true);
    try {
      const res = await onSyncAllToCloud();
      if (res.success) {
        setNotification(`✅ Sinkronisasi Berhasil! ${res.count} data berhasil dikirim ke Cloud Firestore. Data di HP, laptop, dan komputer lain langsung terupdate otomatis.`);
      } else {
        setNotification(`⚠️ Sinkronisasi Cloud: ${res.error || 'Silakan coba lagi'}`);
      }
    } catch (e: any) {
      setNotification(`⚠️ Error: ${e.message}`);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handlePullFromCloud = async () => {
    if (!onPullAllFromCloud || isPullingCloud) return;
    setIsPullingCloud(true);
    try {
      const res = await onPullAllFromCloud();
      if (res.success) {
        setNotification(`✅ Berhasil menarik data terbaru dari Cloud Firestore! (${res.count} data dimuat)`);
      } else {
        setNotification(`⚠️ Gagal mengambil dari cloud: ${res.error}`);
      }
    } catch (e: any) {
      setNotification(`⚠️ Error: ${e.message}`);
    } finally {
      setIsPullingCloud(false);
    }
  };

  // Set of initial guru IDs to identify user-created ones
  const initialGuruIdSet = useMemo(() => new Set(INITIAL_GURU_USERS.map(g => g.id)), []);

  // Modal State for Delete and Password Reset
  const [deleteConfirmGuru, setDeleteConfirmGuru] = useState<User | null>(null);
  const [passwordResetGuru, setPasswordResetGuru] = useState<User | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('guru123');

  // Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<User[]>([]);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formNama, setFormNama] = useState('');
  const [formGelar, setFormGelar] = useState('');
  const [formNip, setFormNip] = useState('');
  const [formTempatLahir, setFormTempatLahir] = useState('Bogor');
  const [formTanggalLahir, setFormTanggalLahir] = useState('1985-01-01');
  const [formTahunMasuk, setFormTahunMasuk] = useState<number>(2020);
  const [formFotoProfilUrl, setFormFotoProfilUrl] = useState<string>('');
  const [formRole, setFormRole] = useState<UserRole>('guru');
  const [formJabatanTambahan, setFormJabatanTambahan] = useState('');
  const [formIsPembinaEkskul, setFormIsPembinaEkskul] = useState(false);
  const [formEkskulDibina, setFormEkskulDibina] = useState<string[]>([]);
  const [formJurusan, setFormJurusan] = useState<'Farmasi' | 'Asisten Keperawatan' | 'Kesehatan' | 'Tata Kecantikan & Spa' | 'Perhotelan' | 'Umum'>('Farmasi');
  const [formMapel, setFormMapel] = useState<string[]>([]);
  const [mapelSearchQuery, setMapelSearchQuery] = useState('');
  const [mapelCategoryFilter, setMapelCategoryFilter] = useState('Semua');
  const [formWalasKelasIds, setFormWalasKelasIds] = useState<string[]>([]);
  const [formTelepon, setFormTelepon] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formStatusAktif, setFormStatusAktif] = useState(true);
  const [formJenisKelamin, setFormJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');

  const handlePhotoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await compressStudentPhoto(file, 640, 0.86);
      setFormFotoProfilUrl(result.dataUrl);
    } catch (err: any) {
      alert(err?.message || 'Gagal memproses pas foto');
    } finally {
      e.target.value = '';
    }
  };

  const handleAutoGenerateIdGuru = () => {
    let yyyymmdd = '19850101';
    if (formTanggalLahir) {
      yyyymmdd = formTanggalLahir.replace(/-/g, '').slice(0, 8);
    }
    const thnMasuk = formTahunMasuk || 2024;
    const countSameYear = guruList.filter(g => Number(g.tahunMasuk) === Number(thnMasuk)).length + 1;
    const nextNum = String(countSameYear).padStart(2, '0');
    const genId = `${thnMasuk}${yyyymmdd}${nextNum}`;
    setFormNip(genId);
  };

  // Filter list of Guru, Walas, Pembina Ekskul, and Kesiswaan
  const guruList = usersList.filter(u => 
    u.role === 'guru' || 
    u.role === 'walas' || 
    u.role === 'pembina_ekskul' || 
    u.role === 'kesiswaan' ||
    u.role === 'staf' ||
    u.role === 'kepala_sekolah' ||
    u.role === 'operator' ||
    u.role === 'bendahara' ||
    u.isPembinaEkskul || 
    u.isWalas ||
    u.isKesiswaan ||
    Boolean(u.jabatanTambahan && u.jabatanTambahan.trim().length > 0)
  );

  const filteredGuru = useMemo(() => {
    return guruList
      .filter(g => {
        const matchJurusan = filterJurusan === 'Semua' || (g.jurusan || 'Umum') === filterJurusan;
        const matchSearch = (g.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (g.nipOrNis || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (g.idGuru || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (g.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (g.jabatanTambahan || '').toLowerCase().includes(searchQuery.toLowerCase());

        const hasWalas = (g.role === 'walas' || g.isWalas === true) && g.isWalas !== false;
        const hasEkskul = g.role === 'pembina_ekskul' || g.isPembinaEkskul || (g.ekskulDibina && g.ekskulDibina.length > 0) || (g.jabatanTambahan && g.jabatanTambahan.toLowerCase().includes('ekskul'));
        const hasKesiswaan = g.role === 'kesiswaan' || g.isKesiswaan || (g.jabatanTambahan && g.jabatanTambahan.toLowerCase().includes('kesiswaan'));
        const hasTambahan = Boolean(g.jabatanTambahan && g.jabatanTambahan.trim().length > 0);

        let matchRole = true;
        if (filterRole === 'guru') matchRole = g.role === 'guru' && !hasWalas && !hasEkskul && !hasKesiswaan;
        else if (filterRole === 'walas') matchRole = Boolean(hasWalas);
        else if (filterRole === 'pembina_ekskul') matchRole = Boolean(hasEkskul);
        else if (filterRole === 'kesiswaan') matchRole = Boolean(hasKesiswaan);
        else if (filterRole === 'kepala_sekolah') matchRole = g.role === 'kepala_sekolah' || (g.jabatanTambahan || '').toLowerCase().includes('kepala');
        else if (filterRole === 'operator') matchRole = g.role === 'operator' || (g.jabatanTambahan || '').toLowerCase().includes('operator');
        else if (filterRole === 'bendahara') matchRole = g.role === 'bendahara' || (g.jabatanTambahan || '').toLowerCase().includes('bendahara');
        else if (filterRole === 'staf') matchRole = g.role === 'staf' || (g.jabatanTambahan || '').toLowerCase().includes('staf') || (g.jabatanTambahan || '').toLowerCase().includes('tu');
        else if (filterRole === 'jabatan_tambahan') matchRole = Boolean(hasTambahan);

        return matchJurusan && matchSearch && matchRole;
      })
      .sort((a, b) => {
        const aIsNew = !initialGuruIdSet.has(a.id);
        const bIsNew = !initialGuruIdSet.has(b.id);
        if (aIsNew && !bIsNew) return -1;
        if (!aIsNew && bIsNew) return 1;
        return 0;
      });
  }, [guruList, filterJurusan, searchQuery, filterRole, initialGuruIdSet]);

  // Filtered mapel list for search & selection modal
  const filteredMapelList = useMemo(() => {
    const q = mapelSearchQuery.trim().toLowerCase();
    return mapelList.filter(m => {
      const matchSearch = !q ||
        (m.namaMapel || '').toLowerCase().includes(q) ||
        (m.kode || m.kodeMapel || '').toLowerCase().includes(q) ||
        (m.tingkat || '').toLowerCase().includes(q) ||
        (m.jurusan || '').toLowerCase().includes(q) ||
        (m.kelompok || '').toLowerCase().includes(q);

      if (!matchSearch) return false;
      if (q) return true; // If admin searches explicitly, return all matching subjects across categories

      if (mapelCategoryFilter === 'Semua') return true;
      if (mapelCategoryFilter === 'Umum') {
        const j = (m.jurusan || '').toLowerCase();
        const k = (m.kelompok || '').toLowerCase();
        return j.includes('semua') || j.includes('umum') || k.includes('umum') || (!m.jurusan || m.jurusan === 'Umum');
      }
      if (mapelCategoryFilter === 'Farmasi') {
        return (m.jurusan || '').toLowerCase().includes('farmasi') ||
               (m.namaMapel || '').toLowerCase().includes('obat') ||
               (m.namaMapel || '').toLowerCase().includes('farm');
      }
      if (mapelCategoryFilter === 'Keperawatan') {
        return (m.jurusan || '').toLowerCase().includes('perawat') ||
               (m.jurusan || '').toLowerCase().includes('kesehatan') ||
               (m.namaMapel || '').toLowerCase().includes('pasien') ||
               (m.namaMapel || '').toLowerCase().includes('keperawatan');
      }
      if (mapelCategoryFilter === 'Kecantikan') {
        return (m.jurusan || '').toLowerCase().includes('cantik') ||
               (m.jurusan || '').toLowerCase().includes('spa') ||
               (m.namaMapel || '').toLowerCase().includes('kulit') ||
               (m.namaMapel || '').toLowerCase().includes('rambut') ||
               (m.namaMapel || '').toLowerCase().includes('rias');
      }
      if (mapelCategoryFilter === 'Perhotelan') {
        return (m.jurusan || '').toLowerCase().includes('hotel') ||
               (m.namaMapel || '').toLowerCase().includes('hotel') ||
               (m.namaMapel || '').toLowerCase().includes('front office') ||
               (m.namaMapel || '').toLowerCase().includes('housekeeping');
      }
      return true;
    });
  }, [mapelList, mapelSearchQuery, mapelCategoryFilter]);

  const toggleJabatanTag = (tag: string) => {
    const tokens = formJabatanTambahan
      .split(/[,/]+/)
      .map(t => t.trim())
      .filter(Boolean);

    const exists = tokens.some(t => t.toLowerCase() === tag.toLowerCase());
    let nextTokens: string[];
    if (exists) {
      nextTokens = tokens.filter(t => t.toLowerCase() !== tag.toLowerCase());
    } else {
      nextTokens = [...tokens, tag];
    }
    const newStr = nextTokens.join(', ');
    setFormJabatanTambahan(newStr);

    // Auto-trigger role and assignment synchronization
    const lowTag = tag.toLowerCase();
    if (exists) {
      // User is UNCHECKING / removing the tag
      if (lowTag.includes('wali')) {
        if (formRole === 'walas') setFormRole('guru');
        setFormWalasKelasIds([]);
      }
      if (lowTag.includes('ekskul') || lowTag.includes('pembina')) {
        if (formRole === 'pembina_ekskul') setFormRole('guru');
        setFormIsPembinaEkskul(false);
        setFormEkskulDibina([]);
      }
      if (lowTag.includes('kesiswaan')) {
        if (formRole === 'kesiswaan') setFormRole('guru');
      }
      if (lowTag.includes('kepala sekolah') || lowTag === 'kepala sekolah') {
        if (formRole === 'kepala_sekolah') setFormRole('guru');
      }
      if (lowTag.includes('operator')) {
        if (formRole === 'operator') setFormRole('guru');
      }
      if (lowTag.includes('bendahara')) {
        if (formRole === 'bendahara') setFormRole('guru');
      }
      if (lowTag.includes('staf') || lowTag.includes('tu')) {
        if (formRole === 'staf') setFormRole('guru');
      }
    } else {
      // User is CHECKING / adding the tag
      if (lowTag.includes('ekskul') || lowTag.includes('pembina')) {
        setFormIsPembinaEkskul(true);
        if (formRole === 'guru') setFormRole('pembina_ekskul');
      }
      if (lowTag.includes('wali')) {
        if (formRole === 'guru') setFormRole('walas');
      }
      if (lowTag.includes('kesiswaan')) {
        setFormRole('kesiswaan');
      }
      if (lowTag.includes('kepala sekolah') || lowTag === 'kepala sekolah') {
        setFormRole('kepala_sekolah');
      }
      if (lowTag.includes('operator')) {
        setFormRole('operator');
      }
      if (lowTag.includes('bendahara')) {
        setFormRole('bendahara');
      }
      if (lowTag.includes('staf')) {
        setFormRole('staf');
      }
    }
  };

  const toggleWalasKelas = (kelasId: string) => {
    setFormWalasKelasIds(prev => {
      const next = prev.includes(kelasId)
        ? prev.filter(id => id !== kelasId)
        : [...prev, kelasId];
      if (next.length === 0) {
        if (formRole === 'walas') setFormRole('guru');
        setFormJabatanTambahan(curr =>
          curr.split(/[,/]+/).map(t => t.trim()).filter(t => !t.toLowerCase().includes('wali')).join(', ')
        );
      } else {
        if (formRole === 'guru') setFormRole('walas');
        if (!formJabatanTambahan.toLowerCase().includes('wali')) {
          setFormJabatanTambahan(curr => curr ? `${curr}, Guru Wali` : 'Guru Wali');
        }
      }
      return next;
    });
  };

  const toggleEkskulDibina = (ekskulId: string) => {
    setFormEkskulDibina(prev => {
      if (prev.includes(ekskulId)) {
        return prev.filter(id => id !== ekskulId);
      } else {
        return [...prev, ekskulId];
      }
    });
  };

  const handleOpenAdd = () => {
    setEditingGuru(null);
    setFormNama('');
    setFormGelar('');
    setFormTempatLahir('Bogor');
    setFormTanggalLahir('1985-01-01');
    const currentYear = new Date().getFullYear();
    setFormTahunMasuk(currentYear);
    setFormFotoProfilUrl('');
    const nextNum = String(guruList.length + 1).padStart(2, '0');
    setFormNip(`${currentYear}19850101${nextNum}`);
    setFormRole('guru');
    setFormJabatanTambahan('');
    setFormIsPembinaEkskul(false);
    setFormEkskulDibina([]);
    setFormJurusan('Farmasi');
    setFormMapel([]);
    setMapelSearchQuery('');
    setMapelCategoryFilter('Semua');
    setFormWalasKelasIds([]);
    setFormTelepon('');
    setFormEmail('');
    setFormUsername('');
    setFormPassword('guru123');
    setFormStatusAktif(true);
    setFormJenisKelamin('Laki-laki');
    setShowModal(true);
  };

  const handleOpenEdit = (guru: User) => {
    setEditingGuru(guru);
    setFormNama(guru.nama);
    setFormGelar(guru.gelar || '');
    setFormNip(guru.idGuru || guru.nipOrNis);
    setFormTempatLahir(guru.tempatLahir || 'Bogor');
    setFormTanggalLahir(guru.tanggalLahir || '1985-01-01');
    setFormTahunMasuk(Number(guru.tahunMasuk) || 2020);
    setFormFotoProfilUrl(guru.fotoProfilUrl || '');
    setFormRole(guru.role || 'guru');
    setFormJabatanTambahan(guru.jabatanTambahan || '');
    setFormJurusan((guru.jurusan as any) || 'Farmasi');
    setFormMapel(guru.mapelDiampu || []);
    setMapelSearchQuery('');
    setMapelCategoryFilter('Semua');

    // Load multiple classes where this teacher is assigned as Walas
    const assignedIds: string[] = [];
    const isGuruActuallyWalas = (guru.role === 'walas' || guru.isWalas === true) && guru.isWalas !== false;
    if (isGuruActuallyWalas) {
      if (Array.isArray(guru.walasKelasIds) && guru.walasKelasIds.length > 0) {
        assignedIds.push(...guru.walasKelasIds);
      } else if (guru.walasKelasId) {
        assignedIds.push(guru.walasKelasId);
      } else if (guru.idKelas) {
        assignedIds.push(guru.idKelas);
      }
      // Also include classes in kelasList that have this teacher's ID or NIP or exact name
      kelasList.forEach(k => {
        if (
          (k.idWalas && (k.idWalas === guru.id || k.idWalas === guru.nipOrNis)) ||
          (k.namaWalas && k.namaWalas.toLowerCase() === guru.nama.toLowerCase())
        ) {
          if (!assignedIds.includes(k.id)) {
            assignedIds.push(k.id);
          }
        }
      });
    }

    setFormWalasKelasIds(assignedIds);

    // Load extracurriculars where this teacher is assigned as Pembina
    const isCoach = Boolean(guru.isPembinaEkskul || guru.role === 'pembina_ekskul' || (guru.ekskulDibina && guru.ekskulDibina.length > 0));
    setFormIsPembinaEkskul(isCoach);
    const assignedEkskulIds = [...(guru.ekskulDibina || [])];
    if (ekskulList) {
      ekskulList.forEach(e => {
        if (
          (e.idPembina && (e.idPembina === guru.id || e.idPembina === guru.nipOrNis)) ||
          (e.pembina && (e.pembina.toLowerCase() === guru.nama.toLowerCase() || e.pembina.toLowerCase().includes(guru.nama.toLowerCase())))
        ) {
          if (!assignedEkskulIds.includes(e.id)) {
            assignedEkskulIds.push(e.id);
          }
        }
      });
    }
    setFormEkskulDibina(assignedEkskulIds);

    setFormTelepon(guru.telepon || '');
    setFormEmail(guru.email || '');
    setFormUsername(guru.username);
    setFormPassword(guru.password || 'guru123');
    setFormStatusAktif(guru.statusAktif !== false);
    setFormJenisKelamin(guru.jenisKelamin || 'Laki-laki');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama || !formNip) {
      alert('Nama dan Id Guru wajib diisi!');
      return;
    }

    // Menentukan status Wali Kelas secara pasti:
    // Guru HANYA menjadi wali kelas jika formRole === 'walas' DAN formWalasKelasIds.length > 0
    // Jika user memilih peran selain walas atau mengosongkan rombel, isWali DIJAMIN FALSE!
    const isWali = formRole === 'walas' && formWalasKelasIds.length > 0;
    
    // Final role
    let finalRole: UserRole = formRole;
    if (formRole === 'walas' && !isWali) {
      // Jika dipilih peran walas namun rombel tidak dipilih sama sekali, sesuaikan kembali ke peran guru mapel
      finalRole = 'guru';
    }

    const isPembina = formRole === 'pembina_ekskul' || formIsPembinaEkskul || formEkskulDibina.length > 0;
    const isKesiswaan = formRole === 'kesiswaan' || formJabatanTambahan.toLowerCase().includes('kesiswaan');

    const finalWalasKelasIds = isWali ? formWalasKelasIds : [];
    const primaryKelasId = isWali ? (formWalasKelasIds[0] || '') : undefined;
    const matchedKelasNames = isWali
      ? formWalasKelasIds
          .map(id => kelasList.find(k => k.id === id)?.namaKelas)
          .filter(Boolean)
          .join(', ')
      : undefined;

    // Bersihkan 'Guru Wali' dan 'Wali Kelas' dari Jabatan Tambahan jika guru bukan wali kelas
    let cleanJabatanTambahan = formJabatanTambahan;
    if (!isWali) {
      cleanJabatanTambahan = cleanJabatanTambahan
        .split(/[,/]+/)
        .map(t => t.trim())
        .filter(t => !t.toLowerCase().includes('wali') && !t.toLowerCase().includes('walas'))
        .join(', ');
    }

    const guruId = editingGuru ? editingGuru.id : `u-guru-${Date.now()}`;

    const guruPayload: User = {
      ...(editingGuru || { id: guruId }),
      id: guruId,
      nama: formNama.trim(),
      gelar: formGelar.trim(),
      nipOrNis: formNip.trim(),
      idGuru: formNip.trim(),
      tempatLahir: formTempatLahir.trim(),
      tanggalLahir: formTanggalLahir.trim(),
      tahunMasuk: formTahunMasuk,
      fotoProfilUrl: formFotoProfilUrl.trim() || '',
      role: finalRole,
      jabatanTambahan: cleanJabatanTambahan.trim(),
      isKesiswaan: isKesiswaan,
      isWalas: isWali,
      walasKelasId: primaryKelasId,
      walasKelasIds: finalWalasKelasIds,
      walasNamaKelas: matchedKelasNames,
      walasNamaKelasList: isWali ? formWalasKelasIds.map(id => kelasList.find(k => k.id === id)?.namaKelas || '') : [],
      isPembinaEkskul: isPembina,
      ekskulDibina: isPembina ? formEkskulDibina : [],
      jurusan: formJurusan,
      mapelDiampu: formMapel,
      idKelas: primaryKelasId,
      namaKelas: matchedKelasNames,
      telepon: formTelepon.trim(),
      email: formEmail.trim(),
      username: formUsername.trim() || formNip.trim(),
      password: formPassword || 'guru123',
      statusAktif: formStatusAktif,
      jenisKelamin: formJenisKelamin,
      updatedAt: new Date().toISOString(),
    };

    if (editingGuru) {
      onUpdateUser(guruPayload);
      const roleLabel = finalRole === 'kesiswaan' ? 'Kesiswaan' : finalRole === 'walas' ? 'Guru Wali' : finalRole === 'pembina_ekskul' ? 'Pembina Ekskul' : finalRole === 'staf' ? 'Staf' : 'Guru Mapel';
      setNotification(`Data guru "${formNama}" berhasil diperbarui! Jabatan: ${roleLabel}`);
    } else {
      onAddUser(guruPayload);
      setSearchQuery('');
      setFilterJurusan('Semua');
      setFilterRole('Semua');
      setNotification(`Guru baru "${formNama}" berhasil ditambahkan ke sistem dan tampil di paling atas!`);
    }

    // Synchronize kelasList if onUpdateKelas is provided
    if (onUpdateKelas) {
      kelasList.forEach(k => {
        const isAssignedNow = isWali && finalWalasKelasIds.includes(k.id);
        const wasPreviouslyWalas =
          k.idWalas === guruId ||
          (formNip && k.idWalas === formNip) ||
          (editingGuru && (
            k.idWalas === editingGuru.id || 
            (editingGuru.nipOrNis && k.idWalas === editingGuru.nipOrNis) || 
            (k.namaWalas && editingGuru.nama && k.namaWalas.toLowerCase() === editingGuru.nama.toLowerCase())
          ));

        if (isAssignedNow) {
          if (k.idWalas !== guruId || k.namaWalas !== formNama) {
            onUpdateKelas({ ...k, idWalas: guruId, namaWalas: formNama });
          }
        } else if (wasPreviouslyWalas) {
          onUpdateKelas({ ...k, idWalas: '', namaWalas: '' });
        }
      });
    }

    // Synchronize ekskulList if onUpdateEkskul is provided
    if (onUpdateEkskul && ekskulList) {
      ekskulList.forEach(e => {
        if (formEkskulDibina.includes(e.id)) {
          if (e.idPembina !== guruId || e.pembina !== formNama) {
            onUpdateEkskul({ ...e, idPembina: guruId, pembina: formNama });
          }
        } else if (editingGuru && (e.idPembina === guruId || e.pembina === editingGuru.nama)) {
          onUpdateEkskul({ ...e, idPembina: undefined, pembina: '' });
        }
      });
    }

    // Synchronize mapelList if onUpdateMapel is provided
    if (onUpdateMapel && Array.isArray(mapelList)) {
      mapelList.forEach(m => {
        const isAssignedToThisGuru = formMapel.some(item => 
          item && (
            item === m.id || 
            item === m.namaMapel || 
            item.trim().toLowerCase() === m.id.toLowerCase() || 
            item.trim().toLowerCase() === m.namaMapel.trim().toLowerCase()
          )
        );
        if (isAssignedToThisGuru) {
          if (m.guruPengampu !== formNama.trim() || m.idGuru !== guruId) {
            onUpdateMapel({
              ...m,
              guruPengampu: formNama.trim(),
              idGuru: guruId,
            });
          }
        }
      });
    }

    setShowModal(false);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleDelete = (guru: User) => {
    setDeleteConfirmGuru(guru);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmGuru) return;
    const guru = deleteConfirmGuru;
    onDeleteUser(guru.id);
    // Clean walas in classes
    if (onUpdateKelas) {
      kelasList.forEach(k => {
        if (k.idWalas === guru.id) {
          onUpdateKelas({ ...k, idWalas: '', namaWalas: '' });
        }
      });
    }
    setNotification(`Guru "${guru.nama}" (${guru.nipOrNis}) telah berhasil dihapus dari sistem.`);
    setDeleteConfirmGuru(null);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleOpenResetPassword = (guru: User) => {
    setPasswordResetGuru(guru);
    setNewPasswordVal('guru123');
  };

  const handleConfirmResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetGuru) return;
    onUpdateUser({ ...passwordResetGuru, password: newPasswordVal });
    setNotification(`Kata sandi akun guru "${passwordResetGuru.nama}" berhasil diperbarui!`);
    setPasswordResetGuru(null);
    setTimeout(() => setNotification(null), 3500);
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ===================== ROBUST EXCEL / CSV IMPORT =====================
  const downloadSampleTemplate = () => {
    downloadTemplateGuruExcel(mapelList);
  };

  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportError(null);

    try {
      // Support JSON
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error('Format JSON harus berupa Array data guru.');
        const formatted: User[] = parsed.map((item, idx) => ({
          id: item.id || `u-imp-guru-${Date.now()}-${idx}`,
          nama: item.nama || item.name || 'Guru Baru',
          gelar: item.gelar || '',
          nipOrNis: item.nipOrNis || item.nip || String(198000000000000000 + idx),
          username: item.username || item.nipOrNis || item.nip || `guru${idx + 1}`,
          password: item.password || 'guru123',
          role: item.role === 'walas' || item.isWalas ? 'walas' : 'guru',
          isWalas: Boolean(item.role === 'walas' || item.isWalas || item.walasKelasId || item.walasKelasIds),
          walasKelasId: item.walasKelasId || item.idKelas || '',
          walasKelasIds: item.walasKelasIds || (item.walasKelasId ? [item.walasKelasId] : []),
          walasNamaKelas: item.walasNamaKelas || item.namaKelas || '',
          jurusan: item.jurusan || 'Farmasi',
          mapelDiampu: item.mapelDiampu || [],
          telepon: item.telepon || item.noHp || item.hp || '',
          email: item.email || '',
          jenisKelamin: item.jenisKelamin === 'Perempuan' || item.jk === 'P' ? 'Perempuan' : 'Laki-laki',
          statusAktif: item.statusAktif !== false,
        }));
        setImportPreview(formatted);
        return;
      }

      // Read spreadsheet (.xlsx, .xls, .csv, .tsv)
      const rows = await readSpreadsheetFile(file);
      if (!rows || rows.length <= 1) {
        throw new Error('Berkas tidak memiliki baris data setelah judul kolom.');
      }

      // Header mapping
      const headerCols = rows[0].map(c => String(c || '').trim().toLowerCase());
      const findColIndex = (keywords: string[]) => {
        return headerCols.findIndex(h => keywords.some(k => h.includes(k)));
      };

      const idxNip = findColIndex(['nip', 'nuptk', 'nik', 'id', 'username']);
      const idxNama = findColIndex(['nama', 'name', 'guru', 'gtk', 'pendidik']);
      const idxGelar = findColIndex(['gelar', 'title', 'pendidikan']);
      const idxPeran = findColIndex(['peran', 'role', 'jabatan_utama', 'jenis ptk']);
      const idxJabatanTambahan = findColIndex(['tambahan', 'jabatan_tambahan', 'tugas tambahan', 'ekskul', 'pembina', 'kesiswaan']);
      const idxJurusan = findColIndex(['jurusan', 'bidang', 'keahlian', 'rumpun']);
      const idxWalas = findColIndex(['walas', 'kelas', 'wali']);
      const idxHp = findColIndex(['hp', 'telepon', 'telp', 'wa', 'kontak']);
      const idxEmail = findColIndex(['email', 'surel']);
      const idxJk = findColIndex(['jk', 'kelamin', 'gender']);

      const parsedUsers: User[] = [];
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].map(c => String(c || '').trim());
        if (cols.length === 0 || cols.every(c => c === '')) continue;

        if (cols.length >= 2) {
          const rawNama = (idxNama >= 0 ? cols[idxNama] : cols[1]) || `Guru ${i}`;
          const rawNip = (idxNip >= 0 ? cols[idxNip] : cols[0]) || `1990${String(i).padStart(4, '0')}001`;
          const rawGelar = (idxGelar >= 0 ? cols[idxGelar] : '') || '';
          const rawPeran = (idxPeran >= 0 ? cols[idxPeran] : '') || 'guru';
          const rawJabatanTambahan = (idxJabatanTambahan >= 0 ? cols[idxJabatanTambahan] : '') || '';
          const rawJurusan = (idxJurusan >= 0 ? cols[idxJurusan] : '') || 'Farmasi';
          const rawWalas = (idxWalas >= 0 ? cols[idxWalas] : '') || '';
          const rawHp = (idxHp >= 0 ? cols[idxHp] : '') || '';
          const rawEmail = (idxEmail >= 0 ? cols[idxEmail] : '') || '';
          const rawJk = (idxJk >= 0 ? cols[idxJk] : '') || 'L';

          // Resolve Jurusan
          let normJurusan = 'Farmasi';
          const lowJur = rawJurusan.toLowerCase();
          if (lowJur.includes('perawat') || lowJur.includes('keperawatan')) normJurusan = 'Asisten Keperawatan';
          else if (lowJur.includes('kesehatan')) normJurusan = 'Kesehatan';
          else if (lowJur.includes('cantik') || lowJur.includes('spa')) normJurusan = 'Tata Kecantikan & Spa';
          else if (lowJur.includes('hotel') || lowJur.includes('perhotelan')) normJurusan = 'Perhotelan';
          else if (lowJur.includes('umum') || lowJur.includes('normatif') || lowJur.includes('adaptif')) normJurusan = 'Umum';

          // Resolve Walas Classes (supports multiple classes separated by comma or semicolon)
          const walasIds: string[] = [];
          const walasNames: string[] = [];
          if (rawWalas) {
            const classTokens = rawWalas.split(/[,;|]/).map(t => t.trim().toLowerCase()).filter(Boolean);
            kelasList.forEach(k => {
              const kNameLow = k.namaKelas.toLowerCase();
              const kIdLow = k.id.toLowerCase();
              if (classTokens.some(token => kNameLow.includes(token) || kIdLow === token)) {
                walasIds.push(k.id);
                walasNames.push(k.namaKelas);
              }
            });
          }

          const lowPeran = rawPeran.toLowerCase();
          const lowTambahan = rawJabatanTambahan.toLowerCase();

          const isWalas = lowPeran.includes('walas') || 
                          lowPeran.includes('wali') || 
                          lowTambahan.includes('wali') ||
                          walasIds.length > 0;

          const isKesiswaan = lowPeran.includes('kesiswaan') || lowTambahan.includes('kesiswaan');
          const isPembinaEkskul = lowPeran.includes('ekskul') || lowPeran.includes('pembina') || lowTambahan.includes('ekskul') || lowTambahan.includes('pembina');

          let parsedRole: UserRole = 'guru';
          if (isKesiswaan && !isWalas) parsedRole = 'kesiswaan';
          else if (isPembinaEkskul && !isWalas) parsedRole = 'pembina_ekskul';
          else if (isWalas) parsedRole = 'walas';

          parsedUsers.push({
            id: `u-imp-guru-${Date.now()}-${i}`,
            nama: rawNama,
            gelar: rawGelar,
            nipOrNis: rawNip,
            username: rawNip,
            password: 'guru' + rawNip.slice(-4),
            role: parsedRole,
            isWalas,
            walasKelasId: walasIds[0] || undefined,
            walasKelasIds: walasIds,
            walasNamaKelas: walasNames.join(', ') || undefined,
            walasNamaKelasList: walasNames,
            jabatanTambahan: rawJabatanTambahan || undefined,
            isKesiswaan,
            isPembinaEkskul,
            jurusan: normJurusan,
            mapelDiampu: [],
            telepon: rawHp || '0812' + Math.floor(10000000 + Math.random() * 90000000),
            email: rawEmail || `${rawNama.toLowerCase().replace(/[^a-z0-9]/g, '')}@smkbaktiputramandiri.sch.id`,
            jenisKelamin: rawJk.toLowerCase().startsWith('p') ? 'Perempuan' : 'Laki-laki',
            statusAktif: true,
          });
        }
      }

      if (parsedUsers.length === 0) {
        throw new Error('Tidak ada data guru yang valid dapat diekstrak dari berkas.');
      }

      setImportPreview(parsedUsers);
    } catch (err: any) {
      setImportError(err.message || 'Gagal memproses berkas Excel.');
      setImportPreview([]);
    }
  };

  const handleConfirmImport = () => {
    if (importPreview.length === 0) return;

    if (onImportUsers) {
      onImportUsers(importPreview);
    } else {
      importPreview.forEach(u => onAddUser(u));
    }

    // Sync walas classes if any
    if (onUpdateKelas) {
      importPreview.forEach(guru => {
        if (guru.walasKelasIds && guru.walasKelasIds.length > 0) {
          guru.walasKelasIds.forEach(cid => {
            const cls = kelasList.find(k => k.id === cid);
            if (cls) {
              onUpdateKelas({ ...cls, idWalas: guru.id, namaWalas: guru.nama });
            }
          });
        }
      });
    }

    setNotification(`Berhasil mengimpor ${importPreview.length} data guru ke sistem!`);
    setShowImportModal(false);
    setImportPreview([]);
    setImportFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* STATUS DATA DEWAN GURU RESMI BANNER */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white p-5 rounded-2xl shadow-md border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-200" />
            <span>Database Dewan Guru Resmi SMK Bakti Putra Mandiri (BAPUMA) Terverifikasi</span>
          </div>
          <h3 className="text-base font-bold text-white">
            {guruList.length} Pendidik & Tenaga Kependidikan Resmi Telah Masuk Sistem
          </h3>
          <p className="text-xs text-amber-100 max-w-3xl leading-relaxed">
            Seluruh data dewan guru (Mia Jamiah, Silvi Maulida, Yeni Yulipah, Irawati, Ruli, Rochanda, Muhammad Ridwan Purnama, Bogas Ardiansyah, Iqbal Putra Ramadhan, dkk) sudah terdaftar dengan NIP, akun login guru/walas, penugasan mata pelajaran, dan wali kelas.
          </p>
        </div>
        <button
          onClick={downloadSampleTemplate}
          className="px-4 py-2 bg-white text-emerald-950 hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 shrink-0"
          title="Unduh format template guru dalam Microsoft Excel (.xlsx)"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
          <span>Unduh Template Excel (.xlsx)</span>
        </button>
      </div>

      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900 text-xs font-semibold shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500">Total Guru</span>
          <p className="text-xl font-extrabold text-slate-900 mt-1">{guruList.length} Guru</p>
          <span className="text-[10px] text-amber-700 font-medium">Pendidik Aktif</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
          <span className="text-[11px] font-semibold text-emerald-800">Guru Farmasi</span>
          <p className="text-xl font-extrabold text-emerald-950 mt-1">
            {guruList.filter(g => g.jurusan === 'Farmasi').length} Guru
          </p>
          <span className="text-[10px] text-emerald-700">Apoteker & D3</span>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
          <span className="text-[11px] font-semibold text-blue-800">Guru Perawat</span>
          <p className="text-xl font-extrabold text-blue-950 mt-1">
            {guruList.filter(g => g.jurusan === 'Asisten Keperawatan').length} Guru
          </p>
          <span className="text-[10px] text-blue-700">Ners & S.Kep</span>
        </div>

        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200">
          <span className="text-[11px] font-semibold text-teal-800">Guru Kesehatan</span>
          <p className="text-xl font-extrabold text-teal-950 mt-1">
            {guruList.filter(g => g.jurusan === 'Kesehatan').length} Guru
          </p>
          <span className="text-[10px] text-teal-700">Rumpun Kesehatan</span>
        </div>

        <div className="p-4 rounded-2xl bg-pink-50 border border-pink-200">
          <span className="text-[11px] font-semibold text-pink-800">Guru Tata Kecantikan</span>
          <p className="text-xl font-extrabold text-pink-950 mt-1">
            {guruList.filter(g => g.jurusan === 'Tata Kecantikan & Spa').length} Guru
          </p>
          <span className="text-[10px] text-pink-700">Beauty & Spa</span>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
          <span className="text-[11px] font-semibold text-indigo-800">Guru Perhotelan</span>
          <p className="text-xl font-extrabold text-indigo-950 mt-1">
            {guruList.filter(g => g.jurusan === 'Perhotelan').length} Guru
          </p>
          <span className="text-[10px] text-indigo-700">Hospitality</span>
        </div>
      </div>

      {/* TOOLBAR & SEARCH */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari guru berdasarkan nama atau NIP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 w-64 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['Semua', 'Farmasi', 'Asisten Keperawatan', 'Kesehatan', 'Tata Kecantikan & Spa', 'Perhotelan', 'Umum'].map((jur) => (
              <button
                key={jur}
                onClick={() => setFilterJurusan(jur)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  filterJurusan === jur
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {jur}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 focus:ring-2 focus:ring-amber-500 shadow-2xs"
            >
              <option value="Semua">Semua Peran & Tugas</option>
              <option value="guru">Guru Mapel Saja</option>
              <option value="walas">Guru Wali (Walas)</option>
              <option value="kepala_sekolah">Kepala Sekolah</option>
              <option value="operator">Operator Sekolah</option>
              <option value="bendahara">Bendahara Sekolah</option>
              <option value="staf">Tenaga Kependidikan / Staf TU</option>
              <option value="pembina_ekskul">Pembina Ekskul</option>
              <option value="kesiswaan">Kesiswaan</option>
              <option value="jabatan_tambahan">Ada Jabatan Tambahan</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSyncAllToCloud && (
            <button
              type="button"
              onClick={handleSyncToCloud}
              disabled={isSyncingCloud || isPullingCloud}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
              title="Kirim dan sinkronkan data guru & rombel ke Cloud Firestore agar HP/laptop lain langsung terupdate"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>{isSyncingCloud ? 'Sedang Sinkron...' : 'Kirim Sinkron ke Cloud (HP & PC)'}</span>
            </button>
          )}

          {onPullAllFromCloud && (
            <button
              type="button"
              onClick={handlePullFromCloud}
              disabled={isSyncingCloud || isPullingCloud}
              className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
              title="Tarik data guru terbaru dari Cloud Firestore"
            >
              <Cloud className={`w-3.5 h-3.5 ${isPullingCloud ? 'animate-pulse' : ''}`} />
              <span>{isPullingCloud ? 'Menarik...' : 'Tarik Cloud'}</span>
            </button>
          )}

          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
            title="Impor data guru dari file CSV atau Excel Dapodik"
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-600" />
            <span>Impor CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Guru Baru</span>
          </button>
        </div>
      </div>

      {/* TABLE DATA GURU */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-3.5 px-4">Nama Lengkap & Gelar</th>
                <th className="py-3.5 px-4">Id Guru</th>
                <th className="py-3.5 px-4">Program Kejuruan</th>
                <th className="py-3.5 px-4">Peran, Tugas & Jabatan Tambahan</th>
                <th className="py-3.5 px-4">Mapel Diampu</th>
                <th className="py-3.5 px-4">Status & Sandi</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGuru.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada data guru yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredGuru.map((guru) => {
                  const isGuruWalas = Boolean(
                    (guru.role === 'walas' || guru.isWalas === true) &&
                    guru.isWalas !== false
                  );
                  const assignedWalasClasses = isGuruWalas
                    ? kelasList.filter(k => 
                        (guru.walasKelasIds && guru.walasKelasIds.includes(k.id)) ||
                        (k.idWalas && (k.idWalas === guru.id || (guru.nipOrNis && k.idWalas === guru.nipOrNis))) ||
                        (k.namaWalas && guru.nama && k.namaWalas.toLowerCase() === guru.nama.toLowerCase())
                      )
                    : [];
                  const isMultiWalas = assignedWalasClasses.length > 1;

                  // Assigned Extracurriculars
                  const assignedEkskuls = ekskulList.filter(e =>
                    (guru.ekskulDibina && (guru.ekskulDibina.includes(e.id) || guru.ekskulDibina.includes(e.nama))) ||
                    e.idPembina === guru.id ||
                    (e.pembina && (e.pembina.toLowerCase() === guru.nama.toLowerCase() || e.pembina.toLowerCase().includes(guru.nama.toLowerCase())))
                  );
                  const isPembina = Boolean(guru.isPembinaEkskul || guru.role === 'pembina_ekskul' || assignedEkskuls.length > 0);
                  const isKesiswaan = Boolean(guru.role === 'kesiswaan' || guru.isKesiswaan || (guru.jabatanTambahan && guru.jabatanTambahan.toLowerCase().includes('kesiswaan')));

                  return (
                    <tr key={guru.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 overflow-hidden border border-amber-200 shadow-2xs">
                            {guru.fotoProfilUrl ? (
                              <img src={guru.fotoProfilUrl} alt={guru.nama} className="w-full h-full object-cover" />
                            ) : (
                              guru.nama.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="font-bold flex items-center gap-1.5 flex-wrap">
                              <span>{guru.nama}</span>
                              {guru.gelar && <span className="text-slate-500 font-normal">, {guru.gelar}</span>}
                              {!initialGuruIdSet.has(guru.id) && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>GURU BARU</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">{guru.email || 'Belum ada email'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-blue-900 text-[11px]">
                        <div className="font-bold">{guru.idGuru || guru.nipOrNis}</div>
                        {(guru.tempatLahir || guru.tanggalLahir || guru.tahunMasuk) && (
                          <div className="text-[10px] text-slate-500 font-sans mt-0.5 flex flex-wrap items-center gap-1">
                            {(guru.tempatLahir || guru.tanggalLahir) && (
                              <span>
                                {guru.tempatLahir ? guru.tempatLahir : ''}
                                {guru.tempatLahir && guru.tanggalLahir ? ', ' : ''}
                                {guru.tanggalLahir || ''}
                              </span>
                            )}
                            {guru.tahunMasuk && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                                Masuk {guru.tahunMasuk}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                          {guru.jurusan || 'Umum'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1.5">
                          {/* Role badges (Kepala Sekolah, Operator, Bendahara, Kesiswaan, Staf) */}
                          <div className="flex flex-wrap items-center gap-1">
                            {guru.role === 'kepala_sekolah' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                <Award className="w-3 h-3 text-amber-700" />
                                <span>Kepala Sekolah</span>
                              </span>
                            )}

                            {guru.role === 'operator' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1">
                                <span>Operator Sekolah</span>
                              </span>
                            )}

                            {guru.role === 'bendahara' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                                <span>Bendahara Sekolah</span>
                              </span>
                            )}

                            {isKesiswaan && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-blue-600" />
                                <span>Kesiswaan</span>
                              </span>
                            )}

                            {guru.role === 'staf' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                Tenaga Kependidikan
                              </span>
                            )}
                          </div>

                          {/* Walas badges */}
                          {assignedWalasClasses.length > 0 && (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1 text-[10px] font-bold text-purple-900">
                                <Award className="w-3 h-3 text-purple-700" />
                                <span>Wali Kelas ({assignedWalasClasses.length} Rombel):</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {assignedWalasClasses.map(cls => (
                                  <span key={cls.id} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                    {cls.namaKelas}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Pembina Ekskul badges */}
                          {isPembina && (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-900">
                                <Sparkles className="w-3 h-3 text-amber-600" />
                                <span>Pembina Ekskul:</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {assignedEkskuls.length > 0 ? (
                                  assignedEkskuls.map(ek => (
                                    <span key={ek.id} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      {ek.nama}
                                    </span>
                                  ))
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    Pembina Ekskul Aktif
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Custom Jabatan Tambahan badges */}
                          {guru.jabatanTambahan && (
                            <div className="flex flex-wrap items-center gap-1">
                              {guru.jabatanTambahan
                                .split(/[,/]+/)
                                .map(t => t.trim())
                                .filter(t => Boolean(t) && !t.toLowerCase().includes('wali') && !t.toLowerCase().includes('pembina') && !t.toLowerCase().includes('kesiswaan'))
                                .map((tag, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-0.5">
                                    <Briefcase className="w-2.5 h-2.5 text-teal-600" />
                                    <span>{tag}</span>
                                  </span>
                                ))
                              }
                            </div>
                          )}

                          {assignedWalasClasses.length === 0 && !isPembina && !isKesiswaan && guru.role === 'guru' && !guru.jabatanTambahan && (
                            <span className="text-[10px] text-slate-500 font-medium">Guru Mata Pelajaran</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] text-slate-600">
                          {guru.mapelDiampu && guru.mapelDiampu.length > 0
                            ? `${guru.mapelDiampu.length} Mapel Diampu`
                            : 'Belum diatur'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${guru.statusAktif !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {guru.statusAktif !== false ? 'Aktif' : 'Nonaktif'}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {showPasswordMap[guru.id] ? guru.password : '••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(guru.id)}
                            className="text-slate-400 hover:text-slate-700"
                            title="Tampilkan / Sembunyikan Password"
                          >
                            {showPasswordMap[guru.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenResetPassword(guru)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 cursor-pointer transition-colors"
                            title="Reset Kata Sandi Akun"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(guru)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 cursor-pointer transition-colors"
                            title="Edit Data Guru"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(guru)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                            title="Hapus Guru"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TAMBAH / EDIT GURU */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[94vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingGuru ? 'Edit Tenaga Pendidik' : 'Tambah Guru Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Konfigurasi data pendidik, peran sekolah, jabatan tambahan, dan mata pelajaran yang diampu.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* UPLOAD & UBAH PAS FOTO GURU */}
              <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200/80 flex items-center gap-3.5">
                <div className="w-14 h-16 rounded-xl bg-white border-2 border-blue-300 overflow-hidden shadow-xs flex items-center justify-center shrink-0">
                  {formFotoProfilUrl ? (
                    <img src={formFotoProfilUrl} alt="Preview Foto" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-1">
                      <span className="text-blue-700 font-black text-xl">{formNama ? formNama.charAt(0) : 'G'}</span>
                      <span className="block text-[8px] text-slate-400 font-bold">FOTO</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="font-bold text-slate-800 text-xs">Pas Foto Guru / Tenaga Pendidik</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] cursor-pointer shadow-2xs flex items-center gap-1 transition-all">
                      <span>Unggah File Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoFileUpload}
                        className="hidden"
                      />
                    </label>
                    {formFotoProfilUrl && (
                      <button
                        type="button"
                        onClick={() => setFormFotoProfilUrl('')}
                        className="px-2.5 py-1.5 rounded-xl bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 text-[11px] font-bold transition-all"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formFotoProfilUrl}
                    onChange={(e) => setFormFotoProfilUrl(e.target.value)}
                    placeholder="Atau tempel URL foto langsung di sini..."
                    className="w-full px-2.5 py-1 text-[10px] rounded-lg border border-slate-200 bg-white placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    placeholder="Contoh: Siti Rahmawati"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Gelar Akademik
                  </label>
                  <input
                    type="text"
                    value={formGelar}
                    onChange={(e) => setFormGelar(e.target.value)}
                    placeholder="Contoh: S.Farm., Apt. / S.Kep., Ners / S.Pd.I"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* TEMPAT & TANGGAL LAHIR */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    value={formTempatLahir}
                    onChange={(e) => setFormTempatLahir(e.target.value)}
                    placeholder="Contoh: Bogor / Jakarta"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={formTanggalLahir}
                    onChange={(e) => setFormTanggalLahir(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                {/* TAHUN MASUK & ID GURU */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tahun Masuk
                  </label>
                  <input
                    type="number"
                    value={formTahunMasuk}
                    onChange={(e) => setFormTahunMasuk(Number(e.target.value))}
                    placeholder="Contoh: 2013"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">
                      Id Guru (TahunMasuk-TglLahir-NoUrut) *
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateIdGuru}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                    >
                      Generate Otomatis
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formNip}
                    onChange={(e) => setFormNip(e.target.value)}
                    placeholder={`${formTahunMasuk || 2024}1985010101`}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono font-bold text-blue-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Rumpun Program Kejuruan *
                  </label>
                  <select
                    value={formJurusan}
                    onChange={(e) => setFormJurusan(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Farmasi">Farmasi</option>
                    <option value="Asisten Keperawatan">Asisten Keperawatan</option>
                    <option value="Kesehatan">Kesehatan</option>
                    <option value="Tata Kecantikan & Spa">Tata Kecantikan & Spa</option>
                    <option value="Perhotelan">Perhotelan</option>
                    <option value="Umum">Umum (Normatif / Adaptif)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formJenisKelamin}
                    onChange={(e) => setFormJenisKelamin(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Peran / Jabatan Utama Sekolah *
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => {
                      const val = e.target.value as UserRole;
                      setFormRole(val);
                      if (val === 'pembina_ekskul') {
                        setFormIsPembinaEkskul(true);
                        setFormWalasKelasIds([]);
                        setFormJabatanTambahan(prev => 
                          prev.split(/[,/]+/)
                            .map(t => t.trim())
                            .filter(t => !t.toLowerCase().includes('wali') && !t.toLowerCase().includes('walas'))
                            .join(', ')
                        );
                        if (!formJabatanTambahan.toLowerCase().includes('pembina') && !formJabatanTambahan.toLowerCase().includes('ekskul')) {
                          setFormJabatanTambahan(prev => prev ? `${prev}, Pembina Ekskul` : 'Pembina Ekskul');
                        }
                      } else if (val === 'kesiswaan') {
                        setFormWalasKelasIds([]);
                        setFormJabatanTambahan(prev => 
                          prev.split(/[,/]+/)
                            .map(t => t.trim())
                            .filter(t => !t.toLowerCase().includes('wali') && !t.toLowerCase().includes('walas'))
                            .join(', ')
                        );
                        if (!formJabatanTambahan.toLowerCase().includes('kesiswaan')) {
                          setFormJabatanTambahan(prev => prev ? `${prev}, Kesiswaan` : 'Kesiswaan');
                        }
                      } else if (val === 'kepala_sekolah') {
                        setFormWalasKelasIds([]);
                        if (!formJabatanTambahan.toLowerCase().includes('kepala')) {
                          setFormJabatanTambahan(prev => prev ? `${prev}, Kepala Sekolah` : 'Kepala Sekolah');
                        }
                      } else if (val === 'operator') {
                        setFormWalasKelasIds([]);
                        if (!formJabatanTambahan.toLowerCase().includes('operator')) {
                          setFormJabatanTambahan(prev => prev ? `${prev}, Operator Sekolah` : 'Operator Sekolah');
                        }
                      } else if (val === 'bendahara') {
                        setFormWalasKelasIds([]);
                        if (!formJabatanTambahan.toLowerCase().includes('bendahara')) {
                          setFormJabatanTambahan(prev => prev ? `${prev}, Bendahara Sekolah` : 'Bendahara Sekolah');
                        }
                      } else if (val === 'staf') {
                        setFormWalasKelasIds([]);
                        if (!formJabatanTambahan.toLowerCase().includes('staf')) {
                          setFormJabatanTambahan(prev => prev ? `${prev}, Staf Kependidikan` : 'Staf Kependidikan');
                        }
                      } else if (val === 'guru') {
                        setFormWalasKelasIds([]);
                        setFormJabatanTambahan(prev => 
                          prev.split(/[,/]+/)
                            .map(t => t.trim())
                            .filter(t => !t.toLowerCase().includes('wali') && !t.toLowerCase().includes('walas'))
                            .join(', ')
                        );
                      } else if (val === 'walas') {
                        if (!formJabatanTambahan.toLowerCase().includes('wali')) {
                          setFormJabatanTambahan(prev => prev ? `${prev}, Guru Wali` : 'Guru Wali');
                        }
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-purple-900 bg-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="guru">Guru Mata Pelajaran</option>
                    <option value="walas">Guru Wali / Wali Kelas (Merangkap)</option>
                    <option value="kepala_sekolah">Kepala Sekolah</option>
                    <option value="operator">Operator Sekolah</option>
                    <option value="bendahara">Bendahara Sekolah</option>
                    <option value="staf">Tenaga Kependidikan / Staf TU</option>
                    <option value="pembina_ekskul">Pembina Ekstrakurikuler</option>
                    <option value="kesiswaan">Kesiswaan / Wakasek Kesiswaan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    No. Handphone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formTelepon}
                    onChange={(e) => setFormTelepon(e.target.value)}
                    placeholder="081234567890"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Guru
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="guru@smkbaktiputramandiri.sch.id"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              {/* KOLOM TAMBAHAN UNTUK JABATAN TAMBAHAN (PEMBINA EKSKUL, GURU WALI, KESISWAAN, DLL) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                    <Briefcase className="w-4 h-4 text-amber-700" />
                    <span>Jabatan Tambahan / Tugas Tambahan Sekolah</span>
                  </div>
                  <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    Bisa Diisi Lebih dari Satu
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Tuliskan jabatan tambahan guru atau klik tombol cepat di bawah (contoh: <strong>Pembina Ekskul</strong>, <strong>Guru Wali</strong>, <strong>Kesiswaan</strong>, <strong>Pembina OSIS</strong>, <strong>Kepala Bengkel</strong>).
                </p>
                <div className="space-y-2">
                  <div className="relative">
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formJabatanTambahan}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormJabatanTambahan(val);
                        const low = val.toLowerCase();
                        if (!low.includes('wali') && !low.includes('walas') && formRole === 'walas') {
                          setFormRole('guru');
                          setFormWalasKelasIds([]);
                        }
                      }}
                      placeholder="Ketik jabatan tambahan (contoh: Kesiswaan, Pembina Pramuka, Kepala Lab)..."
                      className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-amber-500"
                    />
                    {formJabatanTambahan && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormJabatanTambahan('');
                          if (formRole === 'walas') setFormRole('guru');
                          setFormWalasKelasIds([]);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer rounded-full hover:bg-slate-100"
                        title="Kosongkan Jabatan Tambahan"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold mr-1">Pilihan Cepat:</span>
                    {QUICK_JABATAN_OPTIONS.map((tag) => {
                      const isSelected = formJabatanTambahan.toLowerCase().includes(tag.toLowerCase());
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleJabatanTag(tag)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-600 text-white shadow-2xs font-bold'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}{tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* FITUR MULTI-KELAS WALI KELAS (GURU DAPAT MEMEGANG HINGGA 3 KELAS SEKALIGUS) */}
              <div className="p-3.5 rounded-xl bg-purple-50/80 border border-purple-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-purple-950 font-bold">
                    <Award className="w-4 h-4 text-purple-700" />
                    <span>Penugasan Wali Kelas (Bisa Memegang hingga 3 Kelas Sekaligus)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-purple-700 font-semibold bg-white px-2 py-0.5 rounded-md border border-purple-200">
                      {formWalasKelasIds.length} Kelas Dipilih
                    </span>
                    {formWalasKelasIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormWalasKelasIds([]);
                          if (formRole === 'walas') setFormRole('guru');
                          setFormJabatanTambahan(prev =>
                            prev.split(/[,/]+/)
                              .map(t => t.trim())
                              .filter(t => !t.toLowerCase().includes('wali') && !t.toLowerCase().includes('walas'))
                              .join(', ')
                          );
                        }}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:underline bg-white px-2 py-0.5 rounded-md border border-rose-200 cursor-pointer transition-colors"
                        title="Kosongkan penugasan wali kelas untuk guru ini"
                      >
                        Kosongkan Rombel
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-purple-800">
                  Centang rombel yang dibimbing oleh guru ini. Guru dapat memegang hingga 3 kelas sekaligus (misal Kelas X Kesehatan, Kelas XI Asisten Farmasi, & Kelas XII Asisten Keperawatan).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-36 overflow-y-auto">
                  {kelasList.map(k => {
                    const isChecked = formWalasKelasIds.includes(k.id);
                    return (
                      <label 
                        key={k.id}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-purple-600 text-white border-purple-700 shadow-xs font-bold' 
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-100/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleWalasKelas(k.id)}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span className="truncate">{k.namaKelas}</span>
                        <span className={`text-[9px] ml-auto px-1.5 py-0.2 rounded font-mono ${isChecked ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {k.jurusan}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* FITUR PENUGASAN PEMBINA EKSTRAKURIKULER (BISA MERANGKAP GURU, WALAS, & PEMBINA) */}
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-950 font-bold">
                    <Sparkles className="w-4 h-4 text-amber-700" />
                    <span>Penugasan Pembina Ekstrakurikuler (Bisa Merangkap)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-amber-800 font-semibold bg-white px-2 py-0.5 rounded-md border border-amber-200">
                      {formEkskulDibina.length} Ekskul Terpilih
                    </span>
                    {formEkskulDibina.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormEkskulDibina([]);
                          setFormIsPembinaEkskul(false);
                        }}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:underline bg-white px-2 py-0.5 rounded-md border border-rose-200 cursor-pointer transition-colors"
                        title="Kosongkan pembinaan ekskul untuk guru ini"
                      >
                        Kosongkan Ekskul
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  Guru dapat bertugas sebagai Pembina Ekskul saja, atau merangkap sekaligus sebagai Guru Mapel, Wali Kelas, dan Pembina Ekstrakurikuler. Hak akses penilaian ekskul akan otomatis aktif.
                </p>

                <div className="pt-1 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-amber-950">
                    <input
                      type="checkbox"
                      checked={formIsPembinaEkskul || formRole === 'pembina_ekskul' || formEkskulDibina.length > 0 || formJabatanTambahan.toLowerCase().includes('ekskul')}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormIsPembinaEkskul(checked);
                        if (!checked) setFormEkskulDibina([]);
                      }}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Tugaskan Guru ini Sebagai Pembina Ekstrakurikuler</span>
                  </label>

                  {(formIsPembinaEkskul || formRole === 'pembina_ekskul' || formEkskulDibina.length > 0 || formJabatanTambahan.toLowerCase().includes('ekskul')) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-36 overflow-y-auto">
                      {ekskulList.length === 0 ? (
                        <p className="text-xs text-slate-500 italic col-span-2">Belum ada daftar ekstrakurikuler terdaftar.</p>
                      ) : (
                        ekskulList.map(e => {
                          const isChecked = formEkskulDibina.includes(e.id) || formEkskulDibina.includes(e.nama);
                          return (
                            <label
                              key={e.id}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-amber-600 text-white border-amber-700 shadow-xs font-bold'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-100/50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleEkskulDibina(e.id)}
                                className="rounded text-amber-600 focus:ring-amber-500"
                              />
                              <span className="truncate">{e.nama}</span>
                              <span className={`text-[9px] ml-auto px-1.5 py-0.2 rounded font-mono ${isChecked ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                {e.kategori}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* MAPEL DIPIIH DENGAN KOLOM PENCARIAN & FILTER KATEGORI */}
              <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <label className="block font-bold text-slate-900 text-xs">
                      Mata Pelajaran yang Diampu (Pilihan dari DAPODIK)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Cari dan centang mapel yang diajarkan oleh guru ini pada kurikulum berjalan.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                      {formMapel.length} Mapel Terpilih
                    </span>
                  </div>
                </div>

                {/* Kolom Pencarian & Kategori Filter */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={mapelSearchQuery}
                      onChange={(e) => setMapelSearchQuery(e.target.value)}
                      placeholder="Cari mapel (cth: Farmasi, Agama, Matematika, Keperawatan, IPAS, PAI, dll)..."
                      className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-amber-500 shadow-2xs"
                    />
                    {mapelSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setMapelSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-100"
                        title="Hapus pencarian"
                      >
                        &times;
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
                    <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                      {['Semua', 'Umum', 'Farmasi', 'Keperawatan', 'Kecantikan', 'Perhotelan'].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setMapelCategoryFilter(cat)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                            mapelCategoryFilter === cat
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cat === 'Umum' ? 'Umum / Nasional' : cat}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto">
                      {filteredMapelList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newIds = filteredMapelList.map(m => m.id);
                            setFormMapel(prev => Array.from(new Set([...prev, ...newIds])));
                          }}
                          className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold"
                        >
                          Pilih Semua ({filteredMapelList.length})
                        </button>
                      )}
                      {formMapel.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFormMapel([])}
                          className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold"
                        >
                          Hapus Pilihan ({formMapel.length})
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mapel yang sudah dipilih */}
                {formMapel.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-slate-200/80">
                    <span className="text-[10px] font-semibold text-slate-500">Mapel yang sudah dipilih:</span>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1.5 bg-white rounded-lg border border-slate-200">
                      {formMapel.map(mid => {
                        const m = mapelList.find(x => x.id === mid);
                        return (
                          <span
                            key={mid}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-medium"
                          >
                            <span className="truncate max-w-[200px]">{m ? m.namaMapel : mid}</span>
                            <button
                              type="button"
                              onClick={() => setFormMapel(prev => prev.filter(id => id !== mid))}
                              className="text-amber-500 hover:text-rose-600 font-bold ml-0.5"
                              title="Hapus mapel ini"
                            >
                              &times;
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Daftar Mapel dengan Checkbox */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 rounded-xl border border-slate-200 bg-white">
                  {filteredMapelList.length === 0 ? (
                    <div className="col-span-2 text-center py-6 text-slate-400 space-y-1">
                      <BookOpen className="w-6 h-6 mx-auto text-slate-300" />
                      <p className="font-semibold text-xs text-slate-600">Tidak ada mapel yang cocok</p>
                      <p className="text-[10px]">Coba cari dengan kata kunci lain (misal: "Agama", "IPAS", "Kimia", "Farmasi").</p>
                      {mapelSearchQuery && (
                        <button
                          type="button"
                          onClick={() => { setMapelSearchQuery(''); setMapelCategoryFilter('Semua'); }}
                          className="mt-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700"
                        >
                          Reset Pencarian
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredMapelList.map((m) => {
                      const isSelected = formMapel.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className={`flex items-start gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-amber-50/80 border-amber-400 shadow-2xs font-semibold'
                              : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-amber-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormMapel([...formMapel, m.id]);
                              } else {
                                setFormMapel(formMapel.filter(id => id !== m.id));
                              }
                            }}
                            className="rounded text-amber-600 focus:ring-amber-500 mt-0.5 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <span className={`text-[11px] block truncate ${isSelected ? 'text-amber-950 font-bold' : 'text-slate-800'}`}>
                              {m.namaMapel}
                            </span>
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-0.5">
                              <span className="font-mono bg-slate-100 px-1 rounded">{m.kode || m.id}</span>
                              <span>Tingkat {m.tingkat || 'Umum'}</span>
                              <span className="truncate">{m.jurusan || 'Umum'}</span>
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* AKUN LOGIN */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <h5 className="font-bold text-amber-900 text-xs">Akun Login Portal Guru</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Username Login *
                    </label>
                    <input
                      type="text"
                      required
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="Username login guru"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Kata Sandi (Password) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Kata sandi"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="statusAktifGuru"
                  checked={formStatusAktif}
                  onChange={(e) => setFormStatusAktif(e.target.checked)}
                  className="rounded text-amber-600"
                />
                <label htmlFor="statusAktifGuru" className="font-semibold text-slate-700 cursor-pointer">
                  Status Guru Aktif Mengajar
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Guru</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPOR GURU (CSV / EXCEL / DAPODIK) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Impor Data Guru (CSV / Excel / Dapodik GTK)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Unggah data pendidik dari berkas CSV / Excel Dapodik secara otomatis dan cepat.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview([]);
                  setImportFileName('');
                }}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                <div>
                  <span className="font-bold text-emerald-950 block">Template Microsoft Excel (.xlsx) Resmi:</span>
                  <span className="text-[11px] text-emerald-800">
                    Format Excel resmi dengan kolom NIP, Nama Lengkap, Gelar, Jurusan, Wali Kelas, No HP, dan Email. Juga mendukung berkas .xlsx, .xls, dan .csv.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
                  title="Unduh template Excel resmi pendidik"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                  <span>Unduh Template Guru (.xlsx)</span>
                </button>
              </div>

              {/* Upload Box */}
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50/50">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls,.csv,.json,.tsv"
                  onChange={handleSelectFile}
                  className="hidden"
                  id="importTeacherInput"
                />
                <label htmlFor="importTeacherInput" className="cursor-pointer space-y-2 block">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="font-bold text-slate-800">
                    {importFileName ? importFileName : 'Klik untuk Memilih Berkas Excel (.xlsx / .xls) atau CSV'}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Format didukung: <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>, <strong>.json</strong> (Maksimal 10MB)
                  </p>
                </label>
              </div>

              {importError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Preview Table */}
              {importPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>Pratinjau Data ({importPreview.length} Guru Terdeteksi):</span>
                    <span className="text-emerald-700 text-[11px] font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Siap dimasukkan ke database
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-3">No</th>
                          <th className="py-2 px-3">NIP</th>
                          <th className="py-2 px-3">Nama Lengkap</th>
                          <th className="py-2 px-3">Jurusan</th>
                          <th className="py-2 px-3">Peran / Walas</th>
                          <th className="py-2 px-3">No. HP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {importPreview.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-1.5 px-3 font-mono font-semibold">{item.nipOrNis}</td>
                            <td className="py-1.5 px-3 font-semibold text-slate-900">{item.nama} {item.gelar ? `, ${item.gelar}` : ''}</td>
                            <td className="py-1.5 px-3">{item.jurusan}</td>
                            <td className="py-1.5 px-3">
                              <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${item.role === 'walas' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'}`}>
                                {item.role === 'walas' ? `Walas (${item.walasNamaKelas || 'Rombel'})` : 'Guru'}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 font-mono text-slate-600">{item.telepon || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportPreview([]);
                    setImportFileName('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={importPreview.length === 0}
                  onClick={handleConfirmImport}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan {importPreview.length > 0 ? `${importPreview.length} Guru` : 'Data'} ke Sistem</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS GURU */}
      {deleteConfirmGuru && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Data Guru</h3>
              <p className="text-xs text-slate-600">
                Apakah Anda yakin ingin menghapus data guru <strong className="text-slate-900">{deleteConfirmGuru.nama}</strong> ({deleteConfirmGuru.nipOrNis})?
              </p>
              <p className="text-[11px] text-rose-600 mt-2">
                Akun login dan seluruh penugasan wali kelas / ekskul guru ini akan dinonaktifkan.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmGuru(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Ya, Hapus Guru Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESET KATA SANDI GURU */}
      {passwordResetGuru && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Key className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Reset Kata Sandi Akun Guru</h3>
              <p className="text-xs text-slate-600">
                Atur kata sandi baru untuk akun guru <strong className="text-slate-900">{passwordResetGuru.nama}</strong> (NIP: {passwordResetGuru.nipOrNis}):
              </p>
            </div>

            <form onSubmit={handleConfirmResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi Baru
                </label>
                <input
                  type="text"
                  required
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  placeholder="Ketik kata sandi baru..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordResetGuru(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  Simpan Kata Sandi Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
