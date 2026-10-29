import React, { useState } from 'react';
import { User, FormulirPPDB, Kelas, SchoolInfo } from '../../types';
import { calculatePPDBQuota } from '../../utils/ppdbQuota';
import { AdminPPDBChart } from './AdminPPDBChart';
import { FormulirPPDBModal } from './FormulirPPDBModal';
import { exportPPDBToCSV, exportPPDBToExcel, exportFormulirToWord } from '../../utils/exportPPDB';
import { compressStudentPhoto } from '../../utils/imageCompressor';
import { 
  Key, 
  Users, 
  UserCheck, 
  GraduationCap, 
  Search, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Eye, 
  EyeOff, 
  Edit3, 
  ShieldCheck, 
  Sparkles,
  Phone,
  Mail,
  Check,
  Trash2,
  AlertTriangle,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Printer,
  BarChart2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AdminAkunTabProps {
  usersList: User[];
  formulirList: FormulirPPDB[];
  kelasList: Kelas[];
  schoolInfo?: SchoolInfo;
  onUpdateUser: (user: User) => void;
  onUpdatePPDBStatus: (formId: string, status: FormulirPPDB['statusPendaftaran'], catatan?: string) => void;
  onConfirmNewStudent: (formId: string, nomorIndukSiswaResmi: string, kelasDiterima: string, catatan?: string) => void;
  onDeleteCalonSiswa?: (formId: string, userId?: string) => void;
  onUpdateCalonSiswa?: (updatedForm: FormulirPPDB) => void;
}

export const AdminAkunTab: React.FC<AdminAkunTabProps> = ({
  usersList,
  formulirList,
  kelasList,
  schoolInfo,
  onUpdateUser,
  onUpdatePPDBStatus,
  onConfirmNewStudent,
  onDeleteCalonSiswa,
  onUpdateCalonSiswa,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'guru' | 'siswa' | 'calon_siswa' | 'admin'>('calon_siswa');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswordMap, setShowPasswordMap] = useState<{ [id: string]: boolean }>({});
  const [notification, setNotification] = useState<string | null>(null);

  const quotaSummary = calculatePPDBQuota(schoolInfo, formulirList);

  // State untuk Cetak / Unduh Formulir Siswa PPDB
  const [selectedCalonForPrint, setSelectedCalonForPrint] = useState<FormulirPPDB | null>(null);
  const [showChartSection, setShowChartSection] = useState<boolean>(true);
  const [jurusanFilter, setJurusanFilter] = useState<string>('semua');
  const [statusFilter, setStatusFilter] = useState<string>('semua');

  // Modal Edit Calon Siswa Lengkap
  const [editingCalonForm, setEditingCalonForm] = useState<FormulirPPDB | null>(null);
  const [editCalonData, setEditCalonData] = useState<Partial<FormulirPPDB>>({});

  const handleOpenEditCalonModal = (form: FormulirPPDB) => {
    setEditingCalonForm(form);
    setEditCalonData({ ...form });
  };

  const handleSaveEditCalon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCalonForm) return;
    if (!editCalonData.namaLengkap || !editCalonData.nisn) {
      alert('Nama lengkap dan NISN wajib diisi!');
      return;
    }

    const updated: FormulirPPDB = {
      ...editingCalonForm,
      ...editCalonData,
      namaLengkap: (editCalonData.namaLengkap || '').trim(),
      nisn: (editCalonData.nisn || '').trim(),
    } as FormulirPPDB;

    if (onUpdateCalonSiswa) {
      onUpdateCalonSiswa(updated);
    } else {
      onUpdatePPDBStatus(updated.id, updated.statusPendaftaran, updated.catatanAdmin);
    }

    // Also update student user account if exists
    const targetUser = usersList.find(u => 
      (updated.userId && u.id === updated.userId) || 
      (updated.nisn && (u.username === updated.nisn || u.nipOrNis === updated.nisn))
    );
    if (targetUser) {
      onUpdateUser({
        ...targetUser,
        nama: updated.namaLengkap,
        nipOrNis: updated.nisn,
      });
    }

    setEditingCalonForm(null);
    setNotification(`Data calon siswa "${updated.namaLengkap}" berhasil diperbarui dan disinkronkan ke seluruh sistem!`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Modal Konfirmasi Calon Siswa
  const [selectedCalon, setSelectedCalon] = useState<FormulirPPDB | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<FormulirPPDB['statusPendaftaran']>('Diterima');
  const [confirmNisResmi, setConfirmNisResmi] = useState('');
  const [confirmIdKelas, setConfirmIdKelas] = useState('');
  const [confirmCatatan, setConfirmCatatan] = useState('Selamat! Berkas dan tes administrasi Anda telah disetujui. Akun siswa resmi telah diterbitkan.');
  
  // Modal Hapus Calon Siswa (In-App Modal Confirmation, avoiding window.confirm block)
  const [calonToDelete, setCalonToDelete] = useState<FormulirPPDB | null>(null);

  const handleDeleteCalon = (calon: FormulirPPDB) => {
    setCalonToDelete(calon);
  };

  const handleConfirmDeleteCalon = () => {
    if (calonToDelete) {
      if (onDeleteCalonSiswa) {
        onDeleteCalonSiswa(calonToDelete.id, calonToDelete.userId);
      }
      setNotification(`Data calon siswa "${calonToDelete.namaLengkap}" berhasil dihapus.`);
      setTimeout(() => setNotification(null), 3000);
      if (selectedCalon && selectedCalon.id === calonToDelete.id) {
        setSelectedCalon(null);
      }
      setCalonToDelete(null);
    }
  };

  // Modal Edit Password / User
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editPassword, setEditPassword] = useState('');

  // Admin Profile Edit Modal
  const [isEditingAdmin, setIsEditingAdmin] = useState(false);
  const adminUser = usersList.find(u => u.role === 'admin') || usersList[0];
  const [adminFormNama, setAdminFormNama] = useState(adminUser?.nama || 'Administrator Utama');
  const [adminFormUsername, setAdminFormUsername] = useState(adminUser?.username || 'admin');
  const [adminFormNip, setAdminFormNip] = useState(adminUser?.nipOrNis || 'ADM-01');
  const [adminFormEmail, setAdminFormEmail] = useState(adminUser?.email || 'admin@smk-bpm.sch.id');
  const [adminFormTelepon, setAdminFormTelepon] = useState(adminUser?.telepon || '(021) 5978-2345');
  const [adminFormPassword, setAdminFormPassword] = useState(adminUser?.password || 'admin123');
  const [adminFormFoto, setAdminFormFoto] = useState(adminUser?.fotoProfilUrl || '');

  const guruAccounts = usersList.filter(u => u.role === 'guru' || u.role === 'walas');
  const siswaAccounts = usersList.filter(u => u.role === 'siswa');
  const calonSiswaAccounts = formulirList;
  const adminAccounts = usersList.filter(u => u.role === 'admin');

  const handleOpenAdminEdit = () => {
    if (adminUser) {
      setAdminFormNama(adminUser.nama);
      setAdminFormUsername(adminUser.username);
      setAdminFormNip(adminUser.nipOrNis);
      setAdminFormEmail(adminUser.email || '');
      setAdminFormTelepon(adminUser.telepon || '');
      setAdminFormPassword(adminUser.password || 'admin123');
      setAdminFormFoto(adminUser.fotoProfilUrl || '');
    }
    setIsEditingAdmin(true);
  };

  const handleSaveAdminProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser) return;
    const updated: User = {
      ...adminUser,
      nama: adminFormNama,
      username: adminFormUsername,
      nipOrNis: adminFormNip,
      email: adminFormEmail,
      telepon: adminFormTelepon,
      password: adminFormPassword,
      fotoProfilUrl: adminFormFoto,
    };
    onUpdateUser(updated);
    setIsEditingAdmin(false);
    setNotification('Data profil & akun Administrator berhasil diperbarui!');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAdminPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const result = await compressStudentPhoto(file, 640, 0.86);
        setAdminFormFoto(result.dataUrl);
      } catch (err: any) {
        alert(err?.message || 'Gagal memproses pas foto');
      } finally {
        e.target.value = '';
      }
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenConfirmModal = (form: FormulirPPDB) => {
    setSelectedCalon(form);
    setConfirmStatus(form.statusPendaftaran || 'Diterima');
    const existingCount = siswaAccounts.length + 1;
    const defaultNis = `2627.10.${String(existingCount).padStart(3, '0')}`;
    setConfirmNisResmi(form.nomorIndukSiswaResmi || defaultNis);

    // Auto find suitable class based on major
    const matchedKelas = kelasList.find(k => k.jurusan === form.pilihanJurusan) || kelasList[0];
    setConfirmIdKelas(matchedKelas?.id || '');
    setConfirmCatatan(form.catatanAdmin || `Selamat! Pendaftaran Ananda ${form.namaLengkap} telah dikonfirmasi dan resmi diterima di jurusan ${form.pilihanJurusan}.`);
  };

  const handleExecuteConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCalon) return;

    if (confirmStatus === 'Diterima') {
      if (!confirmNisResmi || !confirmIdKelas) {
        alert('NIS resmi dan penempatan kelas wajib dipilih untuk siswa diterima!');
        return;
      }

      const matchedKelas = kelasList.find(k => k.id === confirmIdKelas);
      const kelasName = matchedKelas ? matchedKelas.namaKelas : confirmIdKelas;

      // Trigger confirmation to mutate calon siswa into active student account
      onConfirmNewStudent(selectedCalon.id, confirmNisResmi, kelasName, confirmCatatan);
      setNotification(`Akun Siswa Baru "${selectedCalon.namaLengkap}" berhasil disahkan dengan NIS Resmi ${confirmNisResmi}!`);
    } else {
      onUpdatePPDBStatus(selectedCalon.id, confirmStatus, confirmCatatan);
      setNotification(`Status pendaftaran calon siswa "${selectedCalon.namaLengkap}" diperbarui menjadi "${confirmStatus}".`);
    }

    setSelectedCalon(null);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleQuickPasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser && editPassword) {
      onUpdateUser({ ...editingUser, password: editPassword });
      setNotification(`Kata sandi akun "${editingUser.nama}" berhasil diperbarui!`);
      setEditingUser(null);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900 text-xs font-semibold shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* SUB-TAB NAV */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 flex flex-wrap gap-2 shadow-sm justify-between items-center">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveSubTab('calon_siswa')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSubTab === 'calon_siswa'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Akun Calon Siswa & Konfirmasi SPMB ({calonSiswaAccounts.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('guru')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSubTab === 'guru'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Akun Guru & Walas ({guruAccounts.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('siswa')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSubTab === 'siswa'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Akun Siswa Aktif ({siswaAccounts.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('admin')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSubTab === 'admin'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Akun Administrator Utama</span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari username / nama akun..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 w-52"
          />
        </div>
      </div>

      {/* 1. AKUN CALON SISWA & KONFIRMASI */}
      {activeSubTab === 'calon_siswa' && (
        <div className="space-y-4">
          {/* Reactive PPDB Quota Reduction Monitoring Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-900 to-slate-900 text-white shadow-md border border-teal-800/60 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-teal-800/80 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Otomatisasi Kuota SPMB Aktif
                </span>
                <h4 className="text-base font-extrabold text-white mt-1">
                  Monitoring Kuota Real-time & Verifikasi Calon Siswa
                </h4>
                <p className="text-xs text-teal-200 mt-0.5">
                  Setiap calon siswa yang diverifikasi atau diterima otomatis mengurangi kuota jurusan.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-center">
                  <div className="text-[10px] text-teal-200">Sisa Kuota Terbuka</div>
                  <div className="text-xl font-black text-amber-300">{quotaSummary.totalSisa} Kursi</div>
                </div>
                <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-center">
                  <div className="text-[10px] text-teal-200">Terverifikasi / Diterima</div>
                  <div className="text-xl font-black text-emerald-400">{quotaSummary.totalTerisi} Murid</div>
                </div>
              </div>
            </div>

            {/* Breakdown per major */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {Object.values(quotaSummary.jurusan).map(j => (
                <div key={j.key} className="bg-black/30 rounded-xl p-2.5 border border-white/10">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                    <span className="truncate">{j.nama}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] ${
                      j.sisa === 0 ? 'bg-rose-500 text-white' : 'bg-teal-400 text-slate-950'
                    }`}>
                      {j.sisa === 0 ? 'Penuh' : `Sisa ${j.sisa}`}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between text-xs">
                    <span className="text-white font-extrabold">{j.sisa} <span className="text-[10px] font-normal text-teal-200">/ {j.kapasitas} kursi</span></span>
                    <span className="text-[10px] text-amber-300 font-semibold">{j.terisi} diterima</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
                    <div className="bg-amber-400 h-1 rounded-full" style={{ width: `${j.persen}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Data Visualization Component (Recharts) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-700">
                  <BarChart2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <span>Visualisasi Tren Pendaftar Real-Time (Recharts)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Live
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Statistik pergerakan pendaftaran calon siswa dan analisis keterisian kuota per jurusan.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowChartSection(!showChartSection)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <span>{showChartSection ? 'Sembunyikan Grafik' : 'Tampilkan Grafik'}</span>
                  {showChartSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {showChartSection && (
              <AdminPPDBChart formulirList={formulirList} schoolInfo={schoolInfo} />
            )}
          </div>

          {/* Action Toolbar: Unduh Data PPDB (Excel/CSV) & Filter */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => exportPPDBToExcel(calonSiswaAccounts, schoolInfo?.nama || 'SMK')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                title="Unduh rekapitulasi data seluruh pendaftar calon siswa baru dalam format Microsoft Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>Unduh Data PPDB (.xlsx)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-800 text-[10px] font-mono">
                  {calonSiswaAccounts.length}
                </span>
              </button>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px] font-semibold">Jurusan:</span>
                <select
                  value={jurusanFilter}
                  onChange={(e) => setJurusanFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="semua">Semua Jurusan</option>
                  <option value="farmasi">Farmasi Klinis</option>
                  <option value="perawat">Asisten Keperawatan</option>
                  <option value="cantik">Tata Kecantikan & Spa</option>
                  <option value="hotel">Perhotelan</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px] font-semibold">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="semua">Semua Status</option>
                  <option value="Menunggu_Verifikasi">Menunggu Verifikasi</option>
                  <option value="Terverifikasi">Terverifikasi</option>
                  <option value="Diterima">Diterima</option>
                  <option value="Ditolak">Ditolak</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-bold flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-amber-700" />
                <span>Pusat Konfirmasi Penerimaan Calon Siswa & Penerbitan Akun Siswa Resmi</span>
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Klik tombol <strong>"Formulir Siswa"</strong> untuk mencetak/mengunduh formulir resmi yang sudah terisi data, atau <strong>"Verifikasi Siswa"</strong> untuk menetapkan NIS Resmi dan kelas kejuruan.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-3.5 px-4">No. Registrasi & Nama</th>
                    <th className="py-3.5 px-4">NISN & Asal Sekolah</th>
                    <th className="py-3.5 px-4">Akun Login Calon Siswa</th>
                    <th className="py-3.5 px-4">Pilihan Kejuruan</th>
                    <th className="py-3.5 px-4">Kontak Siswa / Ortu</th>
                    <th className="py-3.5 px-4">Status Penerimaan</th>
                    <th className="py-3.5 px-4 text-center">Tindakan & Formulir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calonSiswaAccounts
                    .filter(c => {
                      const matchesSearch = 
                        (c.namaLengkap || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (c.nomorRegistrasi || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (c.nisn || '').includes(searchQuery);
                      
                      const matchesJurusan = 
                        jurusanFilter === 'semua' || 
                        c.pilihanJurusan.toLowerCase().includes(jurusanFilter);

                      const matchesStatus = 
                        statusFilter === 'semua' || 
                        c.statusPendaftaran === statusFilter;

                      return matchesSearch && matchesJurusan && matchesStatus;
                    })
                    .map((calon) => {
                      const linkedUser = usersList.find(u => 
                        (calon.nisn && (u.username === calon.nisn || u.nipOrNis === calon.nisn || u.nisn === calon.nisn)) ||
                        (u.nama && calon.namaLengkap && u.nama.toLowerCase() === calon.namaLengkap.toLowerCase()) ||
                        (calon.userId && u.id === calon.userId)
                      );
                      const calonUsername = (linkedUser && (!linkedUser.nama || linkedUser.nama.toLowerCase() === calon.namaLengkap?.toLowerCase()))
                        ? linkedUser.username
                        : (calon.nisn || calon.nomorRegistrasi || linkedUser?.username);
                      const calonPassword = linkedUser?.password || 'ppdb';
                      const isPassVisible = !!showPasswordMap[calon.id];

                      return (
                        <tr key={calon.id} className="hover:bg-amber-50/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{calon.namaLengkap}</div>
                            <div className="font-mono text-amber-800 font-bold text-[11px]">
                              {calon.nomorRegistrasi}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Daftar: {new Date(calon.tanggalDaftar).toLocaleDateString('id-ID')}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-mono text-slate-800 font-semibold">NISN: {calon.nisn}</div>
                            <div className="text-slate-500 text-[11px]">{calon.asalSekolah}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="space-y-1 bg-amber-50/60 p-2 rounded-xl border border-amber-200/80 w-fit min-w-[140px]">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold text-amber-800">User:</span>
                                <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-amber-200 text-[11px]">
                                  {calonUsername}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold text-amber-800">Sandi:</span>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-amber-200 text-[11px]">
                                    {isPassVisible ? calonPassword : '••••••••'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility(calon.id)}
                                    className="p-1 rounded text-slate-400 hover:text-amber-700 hover:bg-amber-100 transition-colors"
                                    title={isPassVisible ? "Sembunyikan Sandi" : "Lihat Sandi"}
                                  >
                                    {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-amber-700" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              calon.pilihanJurusan === 'Farmasi' ? 'bg-emerald-100 text-emerald-800' :
                              calon.pilihanJurusan === 'Asisten Keperawatan' ? 'bg-blue-100 text-blue-800' :
                              calon.pilihanJurusan === 'Tata Kecantikan & Spa' ? 'bg-pink-100 text-pink-800' :
                              'bg-indigo-100 text-indigo-800'
                            }`}>
                              {calon.pilihanJurusan}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-slate-600">
                            <div>{calon.nomorHp}</div>
                            <div className="text-[10px] text-slate-400">{calon.email}</div>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit ${
                              calon.statusPendaftaran === 'Diterima' ? 'bg-emerald-100 text-emerald-800' :
                              calon.statusPendaftaran === 'Terverifikasi' ? 'bg-blue-100 text-blue-800' :
                              calon.statusPendaftaran === 'Ditolak' ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {calon.statusPendaftaran === 'Diterima' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              <span>{calon.statusPendaftaran}</span>
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Tombol Unduh / Cetak Formulir Siswa */}
                              <button
                                type="button"
                                onClick={() => setSelectedCalonForPrint(calon)}
                                className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                title="Unduh / Cetak Lembar Formulir Pendaftaran Siswa (PDF / HTML Lengkap)"
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                <span>Cetak / PDF</span>
                              </button>

                              {/* Tombol Unduh Word Resmi (.doc) */}
                              <button
                                type="button"
                                onClick={() => exportFormulirToWord(calon, schoolInfo)}
                                className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                title="Unduh Formulir PPDB Lengkap dalam format Microsoft Word (.doc)"
                              >
                                <FileDown className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Word</span>
                              </button>

                              {/* Tombol Edit Lengkap Data Calon Siswa */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditCalonModal(calon)}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                title="Edit Lengkap Data Calon Siswa (Nama, NISN, Jurusan, Sekolah, Ortu, Gelombang, dll)"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                                <span>Edit</span>
                              </button>

                              <button
                                onClick={() => handleOpenConfirmModal(calon)}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 ${
                                  calon.statusPendaftaran === 'Diterima'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                                title="Konfirmasi / Verifikasi Calon Siswa Baru"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{calon.statusPendaftaran === 'Diterima' ? 'Ubah Status' : 'Verifikasi'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteCalon(calon)}
                                className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                title="Hapus Calon Siswa Baru"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {calonSiswaAccounts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        Belum ada data pendaftar calon siswa.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. AKUN GURU & WALAS */}
      {activeSubTab === 'guru' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Nama Lengkap & NIP</th>
                  <th className="py-3.5 px-4">Role Sistem</th>
                  <th className="py-3.5 px-4">Username Login</th>
                  <th className="py-3.5 px-4">Kata Sandi</th>
                  <th className="py-3.5 px-4">Status Akun</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {guruAccounts
                  .filter(g => (g.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) || (g.username || '').toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((guru) => (
                    <tr key={guru.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{guru.nama}</div>
                        <div className="font-mono text-slate-500 text-[11px]">NIP. {guru.nipOrNis}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          guru.role === 'walas' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {guru.role === 'walas' ? 'Wali Kelas' : 'Guru'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {guru.username}
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-700 font-medium">
                            {showPasswordMap[guru.id] ? guru.password : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(guru.id)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            {showPasswordMap[guru.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          guru.statusAktif !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {guru.statusAktif !== false ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setEditingUser(guru);
                            setEditPassword(guru.password || 'guru123');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-[11px] transition-colors"
                        >
                          Ubah Sandi
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. AKUN SISWA */}
      {activeSubTab === 'siswa' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Nama Siswa & NIS Resmi</th>
                  <th className="py-3.5 px-4">Kelas & Jurusan</th>
                  <th className="py-3.5 px-4">Username Login (NISN)</th>
                  <th className="py-3.5 px-4">Kata Sandi CAT</th>
                  <th className="py-3.5 px-4">Status Akun</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {siswaAccounts
                  .filter(s => (s.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.username || '').toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((siswa) => (
                    <tr key={siswa.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{siswa.nama}</div>
                        <div className="font-mono font-bold text-amber-800 text-[11px]">
                          NIS: {siswa.nipOrNis}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-purple-900">{siswa.namaKelas || siswa.kelas}</div>
                        <div className="text-[10px] text-slate-500">{siswa.jurusan}</div>
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {siswa.username}
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-700 font-medium">
                            {showPasswordMap[siswa.id] ? siswa.password : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(siswa.id)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            {showPasswordMap[siswa.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          siswa.statusAktif !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {siswa.statusAktif !== false ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setEditingUser(siswa);
                            setEditPassword(siswa.password || 'siswa123');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-[11px] transition-colors"
                        >
                          Ubah Sandi
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. AKUN ADMINISTRATOR UTAMA */}
      {activeSubTab === 'admin' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <span>Pengaturan Akun Super Administrator</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Akun administrator mengontrol seluruh sistem sekolah, CBT ujian, dan SPMB. Data nama akun dapat disesuaikan secara bebas tanpa batasan nama bawaan.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAdminEdit}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profil & Sandi Admin</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Foto & Identitas */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center text-center space-y-3">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 p-1 shadow-md">
                <div className="w-full h-full rounded-xl bg-white overflow-hidden flex items-center justify-center">
                  {adminUser?.fotoProfilUrl ? (
                    <img src={adminUser.fotoProfilUrl} alt={adminUser.nama} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-black text-amber-700">
                      {adminUser?.nama ? adminUser.nama.charAt(0) : 'A'}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-black text-base text-slate-900">{adminUser?.nama || 'Administrator'}</h4>
                <p className="text-xs text-slate-500 font-mono">@{adminUser?.username || 'admin'}</p>
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                  Super Administrator
                </span>
              </div>
            </div>

            {/* Rincian Akun */}
            <div className="md:col-span-2 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Nama Lengkap Admin</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{adminUser?.nama}</div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Username Login</div>
                  <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{adminUser?.username}</div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">No. Identitas / NIP</div>
                  <div className="font-mono font-semibold text-slate-700 text-sm mt-0.5">{adminUser?.nipOrNis || '-'}</div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Kata Sandi Saat Ini</div>
                  <div className="font-mono font-bold text-amber-700 text-sm mt-0.5 flex items-center gap-2">
                    <span>{showPasswordMap[adminUser?.id || 'admin'] ? adminUser?.password : '••••••••'}</span>
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(adminUser?.id || 'admin')}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {showPasswordMap[adminUser?.id || 'admin'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">No. WhatsApp / Telepon</div>
                  <div className="font-medium text-slate-700 text-sm mt-0.5">{adminUser?.telepon || '-'}</div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Email Resmi</div>
                  <div className="font-medium text-slate-700 text-sm mt-0.5">{adminUser?.email || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT PROFIL ADMIN UTAMA */}
      {isEditingAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-900 text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <span>Edit Profil Administrator Utama</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsEditingAdmin(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdminProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Foto Profil Administrator</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-xl font-bold text-amber-700">
                    {adminFormFoto ? (
                      <img src={adminFormFoto} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      adminFormNama.charAt(0) || 'A'
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAdminPhotoUpload}
                      className="text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-800"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Administrator *</label>
                <input
                  type="text"
                  required
                  value={adminFormNama}
                  onChange={(e) => setAdminFormNama(e.target.value)}
                  placeholder="Contoh: Tim IT SMK Bina Putra Mandiri"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username Login *</label>
                  <input
                    type="text"
                    required
                    value={adminFormUsername}
                    onChange={(e) => setAdminFormUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-bold focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIP / ID Admin</label>
                  <input
                    type="text"
                    value={adminFormNip}
                    onChange={(e) => setAdminFormNip(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. WhatsApp</label>
                  <input
                    type="text"
                    value={adminFormTelepon}
                    onChange={(e) => setAdminFormTelepon(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={adminFormEmail}
                    onChange={(e) => setAdminFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 space-y-1.5">
                <label className="block font-bold text-slate-800">Kata Sandi Baru Administrator *</label>
                <input
                  type="text"
                  required
                  value={adminFormPassword}
                  onChange={(e) => setAdminFormPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:border-amber-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingAdmin(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedCalon && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Konfirmasi Penerimaan & Terbitkan Akun Siswa</span>
              </h4>
              <button
                onClick={() => setSelectedCalon(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="font-bold text-slate-900 text-sm">{selectedCalon.namaLengkap}</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCalonForPrint(selectedCalon)}
                    className="px-2.5 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Buka Lembar Formulir Pendaftaran Lengkap"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-700" />
                    <span>Cetak Formulir</span>
                  </button>
                  <div className="font-mono text-amber-800 font-bold text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200 w-fit">
                    No. Reg: {selectedCalon.nomorRegistrasi}
                  </div>
                </div>
              </div>
              <div className="text-slate-600">
                NISN: <span className="font-mono font-bold text-slate-800">{selectedCalon.nisn}</span> • Asal: <span className="font-semibold">{selectedCalon.asalSekolah}</span>
              </div>
              <div className="text-emerald-800 font-semibold">
                Pilihan Kejuruan: {selectedCalon.pilihanJurusan}
              </div>

              {/* KREDENSIAL LOGIN CALON SISWA */}
              {(() => {
                const linkedUser = usersList.find(u => 
                  (selectedCalon.userId && u.id === selectedCalon.userId) ||
                  (selectedCalon.nisn && (u.username === selectedCalon.nisn || u.nipOrNis === selectedCalon.nisn)) ||
                  (u.nama && selectedCalon.namaLengkap && u.nama.toLowerCase() === selectedCalon.namaLengkap.toLowerCase())
                );
                const calonUsername = linkedUser?.username || selectedCalon.nisn || selectedCalon.nomorRegistrasi;
                const calonPassword = linkedUser?.password || 'ppdb';

                return (
                  <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-slate-800 space-y-1">
                    <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-amber-700" />
                      <span>Akun Login Calon Siswa (Username & Sandi)</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-0.5">
                      <div>
                        <span className="text-slate-500 font-sans text-[11px]">Username: </span>
                        <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-amber-300">
                          {calonUsername}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans text-[11px]">Password: </span>
                        <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-amber-300">
                          {calonPassword}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-2 mt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-slate-500">Status KIP/PKH/BPJS: </span>
                  {selectedCalon.memilikiKipPkhBpjs === 'Ya' ? (
                    <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                      Memiliki {selectedCalon.jenisBantuan?.join('/') || 'KIP/PKH/BPJS'} {selectedCalon.nomorKipPkhBpjs ? `(${selectedCalon.nomorKipPkhBpjs})` : ''}
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium">Tidak Memiliki</span>
                  )}
                </div>
                {selectedCalon.lampiranKipPkhBpjs && (
                  <a
                    href={selectedCalon.lampiranKipPkhBpjs}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-800 underline"
                  >
                    <span>📎 Lihat Berkas Lampiran</span>
                  </a>
                )}
              </div>
            </div>

            <form onSubmit={handleExecuteConfirm} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Keputusan Verifikasi / Status Penerimaan *
                </label>
                <select
                  value={confirmStatus}
                  onChange={(e) => setConfirmStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
                >
                  <option value="Diterima">Diterima (Resmi Siswa Baru & Terbitkan Akun Siswa)</option>
                  <option value="Terverifikasi">Terverifikasi (Lolos Berkas & Wawancara)</option>
                  <option value="Ditolak">Ditolak (Berkas Tidak Memenuhi Kriteria)</option>
                  <option value="Menunggu">Menunggu Konfirmasi / Pending</option>
                </select>
              </div>

              {confirmStatus === 'Diterima' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tetapkan Nomor Induk Siswa Resmi (NIS) *
                    </label>
                    <input
                      type="text"
                      required
                      value={confirmNisResmi}
                      onChange={(e) => setConfirmNisResmi(e.target.value)}
                      placeholder="2627.10.005"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-900"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Format baku: [TahunMasuk].[KodeKejuruan].[NomorUrut]
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Penempatan Rombongan Belajar (Kelas) *
                    </label>
                    <select
                      value={confirmIdKelas}
                      onChange={(e) => setConfirmIdKelas(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                    >
                      {kelasList.map(k => (
                        <option key={k.id} value={k.id}>{k.namaKelas} ({k.jurusan})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan Pengesahan / Berita Penerimaan
                </label>
                <textarea
                  rows={2}
                  value={confirmCatatan}
                  onChange={(e) => setConfirmCatatan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                <p className="font-bold text-[11px] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Otomatisasi Sistem:
                </p>
                <p className="text-[10px] text-emerald-800 leading-relaxed">
                  Setelah dikonfirmasi, calon siswa akan otomatis mendapatkan hak akses login ke sistem Ujian CAT dan portal siswa menggunakan NISN/NIS dengan kata sandi bawaan <strong>siswa123</strong>.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const toDelete = selectedCalon;
                    setCalonToDelete(toDelete);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Hapus pendaftaran calon siswa ini"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Hapus Pendaftar</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCalon(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>Sahkan & Terbitkan Akun</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS CALON SISWA (IN-APP MODAL) */}
      {calonToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Hapus Calon Siswa</h4>
                <p className="text-xs text-slate-500">Tindakan ini permanen dan menghapus akun</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 text-xs space-y-2 text-slate-700">
              <p>Apakah Anda yakin ingin menghapus data calon siswa ini secara permanen?</p>
              <div className="bg-white p-2.5 rounded-lg border border-rose-200 space-y-1">
                <div className="font-bold text-slate-900 text-sm">{calonToDelete.namaLengkap}</div>
                <div className="text-slate-600 text-[11px]">
                  No. Registrasi: <span className="font-mono font-bold text-amber-800">{calonToDelete.nomorRegistrasi}</span>
                </div>
                <div className="text-slate-600 text-[11px]">
                  NISN: <span className="font-mono font-bold text-slate-800">{calonToDelete.nisn}</span> • Pilihan: <span className="font-semibold text-emerald-800">{calonToDelete.pilihanJurusan}</span>
                </div>
              </div>
              <p className="text-[11px] text-rose-700 font-semibold">
                ⚠️ Formulir pendaftaran PPDB dan akun login calon siswa akan dihapus dari sistem.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCalonToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCalon}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UBAH SANDI CEPAT */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600" />
                <span>Ubah Kata Sandi</span>
              </h4>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Ubah kata sandi untuk akun: <strong className="text-slate-900">{editingUser.nama}</strong> ({editingUser.username})
            </div>

            <form onSubmit={handleQuickPasswordUpdate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kata Sandi Baru *
                </label>
                <input
                  type="text"
                  required
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT LENGKAP CALON SISWA BARU (ADMIN PENGATURAN DATA SISWA) */}
      {editingCalonForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-scaleUp">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-5 sm:px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-amber-100" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">Edit Data Calon Siswa SPMB</h3>
                  <p className="text-xs text-amber-100">
                    Perubahan data langsung otomatis disinkronkan ke seluruh sistem & database
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCalonForm(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Form Edit */}
            <form onSubmit={handleSaveEditCalon} className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
              {/* Bagian 1: Data Identitas Siswa */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200 font-bold text-slate-800 text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>1. Identitas & Biodata Calon Siswa</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                    <input
                      type="text"
                      required
                      value={editCalonData.namaLengkap || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, namaLengkap: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Panggilan</label>
                    <input
                      type="text"
                      value={editCalonData.namaPanggilan || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, namaPanggilan: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">NISN *</label>
                    <input
                      type="text"
                      required
                      value={editCalonData.nisn || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, nisn: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">NIK Siswa (KTP / KK)</label>
                    <input
                      type="text"
                      value={editCalonData.nikSiswa || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, nikSiswa: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">No. Kartu Keluarga (KK)</label>
                    <input
                      type="text"
                      value={editCalonData.noKk || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, noKk: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                    <input
                      type="text"
                      value={editCalonData.tempatLahir || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, tempatLahir: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                    <input
                      type="date"
                      value={editCalonData.tanggalLahir || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, tanggalLahir: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                    <select
                      value={editCalonData.jenisKelamin || 'Laki-laki'}
                      onChange={e => setEditCalonData(prev => ({ ...prev, jenisKelamin: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nomor HP / WhatsApp</label>
                    <input
                      type="text"
                      value={editCalonData.nomorHp || editCalonData.noHp || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, nomorHp: e.target.value, noHp: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editCalonData.email || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Asal Sekolah (SMP/MTs)</label>
                    <input
                      type="text"
                      value={editCalonData.asalSekolah || editCalonData.asalSmp || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, asalSekolah: e.target.value, asalSmp: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Bagian 2: Pilihan Jurusan & Status SPMB */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200 font-bold text-slate-800 text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span>2. Pilihan Kejuruan & Status Kelulusan SPMB</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pilihan Jurusan *</label>
                    <select
                      value={editCalonData.pilihanJurusan || 'Farmasi'}
                      onChange={e => setEditCalonData(prev => ({ ...prev, pilihanJurusan: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="Farmasi">Farmasi Klinis & Komunitas</option>
                      <option value="Asisten Keperawatan">Asisten Keperawatan & Caregiver</option>
                      <option value="Tata Kecantikan & Spa">Tata Kecantikan & Spa</option>
                      <option value="Perhotelan">Perhotelan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Gelombang Pendaftaran</label>
                    <input
                      type="text"
                      value={editCalonData.gelombang || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, gelombang: e.target.value }))}
                      placeholder={schoolInfo?.gelombangSPMB || 'Gelombang 1'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status Pendaftaran</label>
                    <select
                      value={editCalonData.statusPendaftaran || 'Menunggu_Verifikasi'}
                      onChange={e => setEditCalonData(prev => ({ ...prev, statusPendaftaran: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="Menunggu_Verifikasi">Menunggu Verifikasi</option>
                      <option value="Terverifikasi">Terverifikasi</option>
                      <option value="Diterima">Diterima (Lulus)</option>
                      <option value="Ditolak">Ditolak</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nomor Induk Resmi (Jika Diterima)</label>
                    <input
                      type="text"
                      value={editCalonData.nomorIndukSiswaResmi || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, nomorIndukSiswaResmi: e.target.value }))}
                      placeholder="Contoh: 2627.10.001"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kelas Diterima</label>
                    <input
                      type="text"
                      value={editCalonData.kelasDiterima || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, kelasDiterima: e.target.value }))}
                      placeholder="Contoh: X Farmasi 1"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Catatan Admin / Pengumuman</label>
                    <input
                      type="text"
                      value={editCalonData.catatanAdmin || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, catatanAdmin: e.target.value }))}
                      placeholder="Catatan hasil verifikasi..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Bagian 3: Domisili / Alamat */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200 font-bold text-slate-800 text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>3. Alamat & Tempat Tinggal</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="block font-semibold text-slate-700 mb-1">Alamat Jalan / Dusun</label>
                    <input
                      type="text"
                      value={editCalonData.alamatLengkap || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, alamatLengkap: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">RT / RW</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="RT"
                        value={editCalonData.rt || ''}
                        onChange={e => setEditCalonData(prev => ({ ...prev, rt: e.target.value }))}
                        className="w-1/2 px-2.5 py-2 rounded-xl border border-slate-300 text-center"
                      />
                      <input
                        type="text"
                        placeholder="RW"
                        value={editCalonData.rw || ''}
                        onChange={e => setEditCalonData(prev => ({ ...prev, rw: e.target.value }))}
                        className="w-1/2 px-2.5 py-2 rounded-xl border border-slate-300 text-center"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kelurahan / Desa</label>
                    <input
                      type="text"
                      value={editCalonData.desa || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, desa: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kecamatan / Kabupaten</label>
                    <input
                      type="text"
                      value={editCalonData.kecKab || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, kecKab: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kode Pos</label>
                    <input
                      type="text"
                      value={editCalonData.kodePos || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, kodePos: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    />
                  </div>
                </div>
              </div>

              {/* Bagian 4: Data Orang Tua / Wali */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200 font-bold text-slate-800 text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>4. Data Orang Tua / Wali Siswa</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Ayah Kandung</label>
                    <input
                      type="text"
                      value={editCalonData.namaAyah || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, namaAyah: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pekerjaan Ayah</label>
                    <input
                      type="text"
                      value={editCalonData.pekerjaanAyah || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, pekerjaanAyah: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Ibu Kandung</label>
                    <input
                      type="text"
                      value={editCalonData.namaIbu || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, namaIbu: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pekerjaan Ibu</label>
                    <input
                      type="text"
                      value={editCalonData.pekerjaanIbu || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, pekerjaanIbu: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">No. Telp / WhatsApp Orang Tua</label>
                    <input
                      type="text"
                      value={editCalonData.noTelpOrtu || ''}
                      onChange={e => setEditCalonData(prev => ({ ...prev, noTelpOrtu: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingCalonForm(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Perubahan Calon Siswa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cetak / Unduh Formulir PPDB Berisi Data Calon Siswa */}
      <FormulirPPDBModal
        calon={selectedCalonForPrint}
        schoolInfo={schoolInfo}
        isOpen={!!selectedCalonForPrint}
        onClose={() => setSelectedCalonForPrint(null)}
      />
    </div>
  );
};
