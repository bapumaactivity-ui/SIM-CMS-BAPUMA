import React, { useState } from 'react';
import { User, UserRole, SchoolInfo, Kelas } from '../types';
import { SCHOOL_INFO } from '../data/initialData';
import { isUserAdmin, isUserWalas } from '../utils/academicHelpers';
import { 
  GraduationCap, 
  Globe, 
  UserCheck, 
  FileText, 
  BookOpen, 
  ShieldCheck, 
  LogOut, 
  UserCircle2, 
  Award, 
  CalendarCheck, 
  LogIn, 
  KeyRound, 
  LayoutDashboard, 
  QrCode,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  onSwitchUser: (user: User) => void;
  onLogout: () => void;
  availableUsers: User[];
  activeTab: 'web' | 'ppdb' | 'cat' | 'siswa' | 'guru' | 'walas' | 'admin' | 'login' | 'presensi';
  setActiveTab: (tab: 'web' | 'ppdb' | 'cat' | 'siswa' | 'guru' | 'walas' | 'admin' | 'login' | 'presensi') => void;
  schoolInfo?: SchoolInfo;
  kelasList?: Kelas[];
  onPullAllFromCloud?: () => Promise<{ success: boolean; count: number; error?: string }>;
  onOpenPembaruanModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSwitchUser,
  onLogout,
  availableUsers,
  activeTab,
  setActiveTab,
  schoolInfo,
  kelasList = [],
  onPullAllFromCloud,
  onOpenPembaruanModal,
}) => {
  const currentSchool = schoolInfo || SCHOOL_INFO;
  const isAdmin = isUserAdmin(currentUser);
  const isWalas = isUserWalas(currentUser, kelasList);
  const isPengurusKelas = Boolean(
    currentUser && (
      currentUser.isKetuaKelas || 
      (currentUser.jabatanKelas && currentUser.jabatanKelas !== 'Anggota')
    )
  );
  const canAccessPresensi = Boolean(
    currentUser && (
      currentUser.role === 'admin' || 
      currentUser.role === 'walas' || 
      currentUser.role === 'guru' || 
      currentUser.role === 'staf' ||
      isPengurusKelas
    )
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRefreshingCloud, setIsRefreshingCloud] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  const handleRefreshCloud = async () => {
    if (!onPullAllFromCloud || isRefreshingCloud) return;
    setIsRefreshingCloud(true);
    setRefreshNotice(null);
    try {
      const res = await onPullAllFromCloud();
      if (res.success) {
        setRefreshNotice(`Tersinkron (${res.count} data)`);
      } else {
        setRefreshNotice('Gagal sinkron');
      }
    } catch (_) {
      setRefreshNotice('Koneksi offline');
    } finally {
      setIsRefreshingCloud(false);
      setTimeout(() => setRefreshNotice(null), 4000);
    }
  };

  const handleNavClick = (tab: NavbarProps['activeTab']) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const getDashboardTab = (): NavbarProps['activeTab'] => {
    if (!currentUser) return 'login';
    if (currentUser.role === 'admin') return 'admin';
    if (currentUser.role === 'guru') return 'guru';
    if (currentUser.role === 'walas') return 'walas';
    if (currentUser.role === 'siswa') return 'siswa';
    if (currentUser.role === 'calon_siswa') return 'ppdb';
    return 'web';
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      {/* Top Banner */}
      <div className="bg-slate-950 px-3 sm:px-4 py-1.5 border-b border-slate-800/80 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-400 min-w-0">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span className="font-semibold text-slate-200 truncate">{currentSchool.nama}</span>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:inline text-slate-400 text-[11px] truncate max-w-xs lg:max-w-md">{currentSchool.alamatLengkap || currentSchool.alamat}</span>
          <span className="px-1.5 py-0.2 rounded bg-amber-900/50 border border-amber-600/40 text-amber-300 font-bold text-[10px] shrink-0">
            Akreditasi {currentSchool.akreditasi || 'A'}
          </span>
        </div>

        {/* Right Info Bar */}
        <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-slate-300">
          {onPullAllFromCloud && (
            <button
              type="button"
              onClick={handleRefreshCloud}
              disabled={isRefreshingCloud}
              className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-600/50 hover:bg-emerald-900 text-emerald-300 font-semibold text-[10px] flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
              title="Tarik data terbaru dari Cloud Firestore agar HP & laptop langsung terupdate"
            >
              <RefreshCw className={`w-2.5 h-2.5 text-emerald-400 ${isRefreshingCloud ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Cloud:</span>
              <span className="font-bold">{isRefreshingCloud ? 'Menyinkronkan...' : (refreshNotice || 'Terhubung')}</span>
            </button>
          )}
          <span className="px-2 py-0.5 rounded-full bg-teal-950 border border-teal-700/50 text-teal-300 font-bold text-[10px] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-teal-400" />
            <span className="truncate max-w-[120px] sm:max-w-none">{currentSchool.gelombangSPMB || 'Gelombang Aktif'}</span>
          </span>
          <span className="hidden sm:inline text-amber-400 font-semibold">T.A. {currentSchool.tahunAjaranPembelajaran || '2026/2027'}</span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & School Name */}
          <div 
            onClick={() => handleNavClick('web')} 
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-transparent flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <img 
                src={currentSchool.logoUrl || SCHOOL_INFO.logoUrl} 
                alt={currentSchool.nama} 
                className="w-full h-full object-contain filter drop-shadow-md"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm sm:text-base lg:text-lg text-slate-100 flex items-center gap-1.5 sm:gap-2 truncate">
                <span className="truncate">{currentSchool.nama}</span>
                <span className="text-[9px] sm:text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0">
                  {currentSchool.akreditasi || 'A'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate">
                {currentSchool.kecamatan || 'Parung Panjang'} • {currentSchool.slogan || 'Pusat Keunggulan Rumpun Kesehatan & Vokasi'}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1.5">
            <button
              onClick={() => handleNavClick('web')}
              className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'web'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Portal Web</span>
            </button>

            <button
              onClick={() => handleNavClick('ppdb')}
              className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === 'ppdb'
                  ? 'bg-purple-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>SPMB Online</span>
            </button>

            {currentUser && currentUser.role === 'calon_siswa' && (
              <button
                onClick={() => handleNavClick('ppdb')}
                className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  activeTab === 'ppdb'
                    ? 'bg-teal-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Cek status verifikasi berkas pendaftaran calon siswa"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>Verifikasi Berkas SPMB</span>
              </button>
            )}

            {currentUser && currentUser.role === 'siswa' && (
              <button
                onClick={() => handleNavClick('siswa')}
                className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  activeTab === 'siswa'
                    ? 'bg-teal-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <CalendarCheck className="w-4 h-4 text-teal-300" />
                <span>Ruang Absen Siswa</span>
              </button>
            )}

            {(currentUser?.role === 'siswa' || currentUser?.role === 'admin' || currentUser?.role === 'guru' || currentUser?.role === 'staf') && (
              <button
                onClick={() => handleNavClick('cat')}
                className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  activeTab === 'cat'
                    ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>{currentUser.role === 'siswa' ? 'Ujian CAT' : 'Ujian CAT'}</span>
              </button>
            )}

            {/* Portal Guru */}
            <button
              onClick={() => handleNavClick('guru')}
              className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'guru'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Portal Guru & Jurnal Mengajar"
            >
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Portal Guru</span>
            </button>

            {currentUser && (isAdmin || isWalas) && (
              <button
                onClick={() => handleNavClick('walas')}
                className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  activeTab === 'walas'
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Buku Leger Nilai & Raport Kurikulum Merdeka (Wali Kelas & Admin)"
              >
                <Award className="w-4 h-4 text-emerald-400" />
                <span>{isWalas && !isAdmin ? 'Leger Walas' : 'Leger Nilai'}</span>
              </button>
            )}

            {canAccessPresensi && (
              <button
                onClick={() => handleNavClick('presensi')}
                className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  activeTab === 'presensi'
                    ? 'bg-teal-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title={isPengurusKelas && currentUser?.role === 'siswa' ? `Presensi Barcode Rombel (${currentUser.jabatanKelas || 'Pengurus Kelas'})` : "Presensi Barcode & QR Code Siswa Per Kelas"}
              >
                <QrCode className="w-4 h-4 text-teal-400" />
                <span>{isPengurusKelas && currentUser?.role === 'siswa' ? 'Presensi Rombel' : 'Presensi Barcode'}</span>
              </button>
            )}

            {currentUser && currentUser.role === 'admin' && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  activeTab === 'admin'
                    ? 'bg-amber-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Admin</span>
              </button>
            )}

            {currentUser && (
              <button
                onClick={() => handleNavClick(getDashboardTab())}
                className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  ['admin', 'guru', 'walas', 'siswa'].includes(activeTab)
                    ? 'bg-slate-100 text-slate-900 shadow-sm font-bold'
                    : 'bg-emerald-700/80 hover:bg-emerald-600 text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
            )}
          </nav>

          {/* Right Area: User Info / Login / Hamburger Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onOpenPembaruanModal && (
              <button
                type="button"
                onClick={onOpenPembaruanModal}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer group"
                title="Lihat info pembaruan dan fitur baru aplikasi (v2.8.0)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse group-hover:rotate-12 transition-transform" />
                <span className="hidden sm:inline">Pembaruan v2.8.0</span>
                <span className="sm:hidden text-[10px]">v2.8.0</span>
              </button>
            )}

            {currentUser ? (
              <div className="flex items-center gap-2">
                <div 
                  onClick={() => handleNavClick(getDashboardTab())} 
                  className="text-right hidden sm:block cursor-pointer group"
                  title="Klik untuk menuju dashboard saya"
                >
                  <div className="text-xs font-semibold text-slate-200 line-clamp-1 max-w-[120px] lg:max-w-[150px] group-hover:text-emerald-400 transition-colors">
                    {currentUser.nama}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                    {currentUser.role === 'admin' && 'Super Admin'}
                    {currentUser.role === 'guru' && `Guru (${currentUser.jurusan || 'Produktif'})`}
                    {currentUser.role === 'walas' && `Wali ${currentUser.namaKelas || currentUser.kelas}`}
                    {currentUser.role === 'siswa' && `Siswa (${currentUser.namaKelas || currentUser.kelas})`}
                    {currentUser.role === 'calon_siswa' && 'Calon Siswa SPMB'}
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                  title="Keluar dari Sistem (Logout)"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Keluar</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNavClick('login')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                  activeTab === 'login'
                    ? 'bg-white text-slate-900 shadow-md ring-2 ring-emerald-300'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                title="Masuk ke Portal Login SIM Terpadu"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Login Portal</span>
                <span className="sm:hidden">Login</span>
              </button>
            )}

            {/* Mobile & Tablet Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/80 transition-colors focus:outline-none"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu (Visible on HP / Tablet when toggled) */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-slate-900 border-t border-slate-800 px-4 pt-3 pb-6 space-y-3 shadow-2xl animate-fadeIn">
          {/* User Status Card on Mobile */}
          {currentUser ? (
            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">{currentUser.nama}</div>
                <div className="text-[10px] text-emerald-400 font-mono">
                  {currentUser.role === 'admin' && 'Super Administrator'}
                  {currentUser.role === 'guru' && `Guru Pengampu`}
                  {currentUser.role === 'walas' && `Wali Kelas ${currentUser.namaKelas || currentUser.kelas}`}
                  {currentUser.role === 'siswa' && `Siswa Aktif (${currentUser.namaKelas || currentUser.kelas})`}
                  {currentUser.role === 'calon_siswa' && 'Calon Siswa Baru SPMB'}
                </div>
              </div>
              <button
                onClick={() => handleNavClick(getDashboardTab())}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold shadow-xs flex items-center gap-1"
              >
                <span>Dashboard</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Portal SIM Terpadu</div>
                <div className="text-[10px] text-emerald-300">Akses Admin, Guru, Siswa, dan Calon Siswa</div>
              </div>
              <button
                onClick={() => handleNavClick('login')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            </div>
          )}

          {/* Mobile Navigation Links Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => handleNavClick('web')}
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'web'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Portal Web</span>
            </button>

            <button
              onClick={() => handleNavClick('ppdb')}
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'ppdb'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <UserCheck className="w-4 h-4 text-purple-400 shrink-0" />
              <span>SPMB Online</span>
            </button>

            {currentUser && currentUser.role === 'calon_siswa' && (
              <button
                onClick={() => handleNavClick('ppdb')}
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left ${
                  activeTab === 'ppdb'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Verifikasi Berkas SPMB</span>
              </button>
            )}

            <button
              onClick={() => handleNavClick('cat')}
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'cat'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <BookOpen className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Sistem Ujian CAT</span>
            </button>

            {currentUser && currentUser.role === 'siswa' && (
              <button
                onClick={() => handleNavClick('siswa')}
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left ${
                  activeTab === 'siswa'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <CalendarCheck className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Ruang Absen Siswa</span>
              </button>
            )}

            {/* Portal Guru */}
            <button
              onClick={() => handleNavClick('guru')}
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                activeTab === 'guru'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <FileText className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Portal Guru & Jurnal Mengajar</span>
            </button>

            {currentUser && (isAdmin || isWalas) && (
              <button
                onClick={() => handleNavClick('walas')}
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left ${
                  activeTab === 'walas'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Leger Raport</span>
              </button>
            )}

            {canAccessPresensi && (
              <button
                onClick={() => handleNavClick('presensi')}
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left ${
                  activeTab === 'presensi'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <QrCode className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{isPengurusKelas && currentUser?.role === 'siswa' ? `Presensi Rombel (${currentUser.jabatanKelas})` : 'Presensi Barcode & QR'}</span>
              </button>
            )}

            {currentUser && currentUser.role === 'admin' && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left ${
                  activeTab === 'admin'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Pusat Kendali Admin</span>
              </button>
            )}

            {onOpenPembaruanModal && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenPembaruanModal();
                }}
                className="w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between bg-amber-500/15 border border-amber-400/40 text-amber-300 hover:bg-amber-500/25 transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Info Pembaruan Aplikasi (v2.8.0)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                  Terbaru
                </span>
              </button>
            )}
          </div>

          {/* Active SPMB Wave Banner in Mobile Drawer */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Periode SPMB Aktif:</div>
              <div className="font-bold text-amber-400">{currentSchool.gelombangSPMB || 'Gelombang 1'}</div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              currentSchool.statusSPMB === 'Buka'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-amber-950 text-amber-400 border border-amber-800'
            }`}>
              ● {currentSchool.statusSPMB || 'Buka'}
            </span>
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation Bar for Mobile Phones (HP) */}
      <nav 
        aria-label="Navigasi Bawah HP" 
        className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-2xl py-1 px-1.5 flex items-center justify-around safe-area-pb"
      >
        <button
          type="button"
          onClick={() => handleNavClick('web')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'web'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Web</span>
        </button>

        <button
          type="button"
          onClick={() => handleNavClick('ppdb')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'ppdb'
              ? 'text-purple-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">SPMB</span>
        </button>

        {canAccessPresensi && (
          <button
            type="button"
            onClick={() => handleNavClick('presensi')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              activeTab === 'presensi'
                ? 'text-teal-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Presensi</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => handleNavClick('guru')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'guru'
              ? 'text-blue-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Guru</span>
        </button>

        {currentUser ? (
          <button
            type="button"
            onClick={() => handleNavClick(getDashboardTab())}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              ['admin', 'walas', 'siswa'].includes(activeTab)
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Menu</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleNavClick('login')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              activeTab === 'login'
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Login</span>
          </button>
        )}
      </nav>
    </header>
  );
};

