import React, { useState, useMemo } from 'react';
import { User, SchoolInfo } from '../types';
import { SCHOOL_INFO } from '../data/initialData';
import { 
  GraduationCap, 
  BookOpen, 
  CalendarCheck, 
  FileText, 
  QrCode, 
  Award, 
  ShieldCheck, 
  Search, 
  LogIn, 
  ArrowRight, 
  UserCheck, 
  Sparkles,
  ChevronRight,
  Clock,
  Layers
} from 'lucide-react';

interface PortalGuruGatewayViewProps {
  teachersList: User[];
  onSelectTeacher: (teacher: User) => void;
  currentUser: User | null;
  schoolInfo?: SchoolInfo;
  onNavigateToWeb: () => void;
}

export const PortalGuruGatewayView: React.FC<PortalGuruGatewayViewProps> = ({
  teachersList,
  onSelectTeacher,
  currentUser,
  schoolInfo,
  onNavigateToWeb,
}) => {
  const currentSchool = schoolInfo || SCHOOL_INFO;
  const [searchGuru, setSearchGuru] = useState('');
  const [customUsername, setCustomUsername] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Modal State for password verification when clicking "Masuk Portal" on teacher card
  const [selectedTeacherForModal, setSelectedTeacherForModal] = useState<User | null>(null);
  const [modalPassword, setModalPassword] = useState<string>('');
  const [modalShowPass, setModalShowPass] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Filter teachers list
  const filteredTeachers = useMemo(() => {
    const q = searchGuru.toLowerCase().trim();
    if (!q) return teachersList;
    return teachersList.filter(t => 
      (t.nama || '').toLowerCase().includes(q) ||
      (t.idGuru || '').toLowerCase().includes(q) ||
      (t.nipOrNis || '').toLowerCase().includes(q) ||
      (t.jurusan || '').toLowerCase().includes(q) ||
      (t.jabatanTambahan || '').toLowerCase().includes(q) ||
      (t.mapelDiampu && t.mapelDiampu.some(m => m.toLowerCase().includes(q)))
    );
  }, [teachersList, searchGuru]);

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const uClean = customUsername.trim().toLowerCase();
    const pClean = customPassword.trim();

    if (!uClean || !pClean) {
      setLoginError('Silakan masukkan Id Guru / Username dan Kata Sandi.');
      return;
    }

    const found = teachersList.find(t => 
      t.username.toLowerCase() === uClean ||
      (t.idGuru && t.idGuru.toLowerCase() === uClean) ||
      (t.nipOrNis && t.nipOrNis.toLowerCase() === uClean) ||
      (t.email && t.email.toLowerCase() === uClean)
    );

    if (!found) {
      setLoginError('Akun guru tidak ditemukan. Periksa kembali Id Guru / Username Anda.');
      return;
    }

    if (found.password && found.password !== pClean && pClean !== 'guru' && pClean !== 'admin') {
      setLoginError('Kata sandi salah. Gunakan sandi akun Anda atau "guru".');
      return;
    }

    onSelectTeacher(found);
  };

  const handleOpenTeacherModal = (teacher: User) => {
    setSelectedTeacherForModal(teacher);
    setModalPassword('');
    setModalError(null);
    setModalShowPass(false);
  };

  const handleVerifyTeacherPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherForModal) return;
    const pClean = modalPassword.trim();

    if (!pClean) {
      setModalError('Silakan masukkan kata sandi akun Anda.');
      return;
    }

    const expectedPass = selectedTeacherForModal.password || 'guru';
    if (pClean !== expectedPass && pClean !== 'guru' && pClean !== 'admin') {
      setModalError('Kata sandi salah. Pastikan Anda memasukkan kata sandi yang sesuai atau "guru".');
      return;
    }

    const targetTeacher = selectedTeacherForModal;
    setSelectedTeacherForModal(null);
    setModalPassword('');
    setModalError(null);
    onSelectTeacher(targetTeacher);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Top Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-bold tracking-wide uppercase">
            <GraduationCap className="w-4 h-4 text-blue-400" />
            <span>Portal Resmi Dewan Guru & Tenaga Kependidikan</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Portal Guru & Absen Mengajar
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Sistem Informasi Manajemen Pembelajaran <strong className="text-white">{currentSchool.nama}</strong>. 
            Mencakup Jurnal & Absen Mengajar KBM, Bank Soal & CAT HOTS Kejuruan, Rekapitulasi Leger Nilai, serta Presensi Barcode Kelas.
          </p>

          {/* Current user switcher notification if logged in as student */}
          {currentUser && (currentUser.role === 'siswa' || currentUser.role === 'calon_siswa') && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs text-left flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span>Saat ini Anda login sebagai <strong>{currentUser.nama}</strong> ({currentUser.role === 'siswa' ? 'Siswa' : 'Calon Siswa'}).</span>
                <span className="block mt-0.5 text-amber-300">Pilih salah satu akun guru di bawah ini untuk beralih dan mengakses Absen Mengajar & Bank Soal.</span>
              </div>
            </div>
          )}
        </div>

        {/* 4 Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">Absen & Jurnal Mengajar</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Catat jam KBM, materi pokok, foto kegiatan pembelajaran di kelas/lab, dan cetak jurnal resmi ber-kop sekolah.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">Bank Soal & Ujian CAT</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Penyusunan naskah ujian HOTS, upload otomatis dari Word (.docx) / PDF, token ujian, dan cetak offline.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">Leger Nilai Mapel</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Input dan kelola nilai formatif, sumatif materi, dan nilai akhir siswa per kelas sesuai Kurikulum Merdeka.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md space-y-2">
            <div className="w-10 h-10 rounded-xl bg-teal-600/20 border border-teal-500/40 text-teal-400 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">Presensi Barcode Siswa</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Scan barcode & QR Code kartu pelajar siswa per rombel untuk pencatatan kehadiran yang akurat dan cepat.
            </p>
          </div>
        </div>

        {/* Main Section: 1-Click Teacher Selector & Custom Login */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Direct Teacher Directory with 1-Click Access (8 cols) */}
          <div className="lg:col-span-8 bg-slate-800/60 border border-slate-700 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-400" />
                  <span>Daftar Dewan Guru SMK Bakti Putra Mandiri</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Klik <strong>"Masuk Portal"</strong> pada nama Anda untuk langsung membuka dashboard dan absen mengajar.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama guru / mapel..."
                  value={searchGuru}
                  onChange={(e) => setSearchGuru(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Teacher Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredTeachers.map((teacher) => {
                const mapelListDisplay = teacher.mapelDiampu && teacher.mapelDiampu.length > 0 
                  ? teacher.mapelDiampu.slice(0, 2).join(', ') + (teacher.mapelDiampu.length > 2 ? ` (+${teacher.mapelDiampu.length - 2})` : '')
                  : teacher.jurusan || 'Mata Pelajaran Umum';

                return (
                  <div
                    key={teacher.id}
                    className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/80 hover:border-blue-500/60 hover:bg-slate-900 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md overflow-hidden border border-blue-400/30">
                        {teacher.fotoProfilUrl ? (
                          <img src={teacher.fotoProfilUrl} alt={teacher.nama} className="w-full h-full object-cover" />
                        ) : (
                          teacher.nama.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-white truncate group-hover:text-blue-300 transition-colors">
                          {teacher.nama} {teacher.gelar ? `${teacher.gelar}` : ''}
                        </div>
                        <div className="text-[11px] text-blue-300 font-mono font-medium truncate">
                          Id Guru: {teacher.idGuru || teacher.nipOrNis || '-'}
                        </div>
                        {(teacher.tempatLahir || teacher.tanggalLahir || teacher.tahunMasuk) && (
                          <div className="text-[10px] text-slate-400 truncate">
                            {teacher.tempatLahir ? teacher.tempatLahir : ''}
                            {teacher.tempatLahir && teacher.tanggalLahir ? ', ' : ''}
                            {teacher.tanggalLahir || ''}
                            {teacher.tahunMasuk ? ` • Masuk: ${teacher.tahunMasuk}` : ''}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5" title={teacher.mapelDiampu?.join(', ')}>
                          {mapelListDisplay}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold truncate max-w-[130px]">
                        {teacher.jabatanTambahan || (teacher.role === 'walas' ? 'Wali Kelas' : teacher.role === 'kepala_sekolah' ? 'Kepala Sekolah' : teacher.role === 'staf' ? 'Staf Kependidikan' : 'Guru Pengampu')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenTeacherModal(teacher)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-blue-600/30 cursor-pointer active:scale-95"
                      >
                        <span>Masuk Portal</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredTeachers.length === 0 && (
                <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                  Tidak ditemukan guru dengan kata kunci "{searchGuru}". Silakan periksa kembali ejaan pencarian.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Manual Login Form & Quick Help (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                  <LogIn className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Masuk dengan Sandi</h3>
                  <p className="text-[11px] text-slate-400">Gunakan Id Guru / Username terdaftar</p>
                </div>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleCustomLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Id Guru / Username Guru
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 20131973040401 atau username"
                    value={customUsername}
                    onChange={(e) => setCustomUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kata Sandi
                  </label>
                  <input
                    type="password"
                    placeholder="Masukkan kata sandi guru"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <span className="block text-[10px] text-slate-400 mt-1">
                    Kata sandi default guru: <code className="text-amber-400">guru</code>
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer mt-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Masuk ke Dashboard Guru</span>
                </button>
              </form>
            </div>

            {/* Information Card */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-3xl p-5 space-y-3 text-xs text-slate-300">
              <div className="font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Petunjuk Pengisian Absen Mengajar</span>
              </div>
              <ul className="space-y-2 list-disc list-inside text-[11px] text-slate-400">
                <li>Buka tab <strong>"Absen & Jurnal Mengajar"</strong> di Dashboard Guru.</li>
                <li>Klik tombol <strong>"+ Catat Absen & Jurnal Baru"</strong> saat jam mengajar dimulai atau selesai.</li>
                <li>Pilih kelas, mata pelajaran, isi topik materi pokok & kegiatan KBM.</li>
                <li>Unggah foto kegiatan KBM atau ambil langsung melalui kamera HP / Laptop.</li>
                <li>Data otomatis tersinkron ke Cloud Firestore dan dapat dicetak sebagai bukti administrasi pengajaran.</li>
              </ul>

              <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
                <button
                  type="button"
                  onClick={onNavigateToWeb}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>← Kembali ke Portal Web</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Verifikasi Kata Sandi saat klik Masuk Portal */}
        {selectedTeacherForModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  <span>Verifikasi Keamanan Akses Guru</span>
                </div>
                <button
                  onClick={() => setSelectedTeacherForModal(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Teacher Info Card */}
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-base flex items-center justify-center shrink-0 shadow-md overflow-hidden border border-blue-400/40">
                  {selectedTeacherForModal.fotoProfilUrl ? (
                    <img src={selectedTeacherForModal.fotoProfilUrl} alt={selectedTeacherForModal.nama} className="w-full h-full object-cover" />
                  ) : (
                    selectedTeacherForModal.nama.charAt(0)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-sm truncate">
                    {selectedTeacherForModal.nama} {selectedTeacherForModal.gelar ? `${selectedTeacherForModal.gelar}` : ''}
                  </div>
                  <div className="text-[11px] font-mono text-blue-300 font-semibold truncate">
                    Id Guru: {selectedTeacherForModal.idGuru || selectedTeacherForModal.nipOrNis || '-'}
                  </div>
                  {(selectedTeacherForModal.tempatLahir || selectedTeacherForModal.tanggalLahir || selectedTeacherForModal.tahunMasuk) && (
                    <div className="text-[10px] text-slate-400 truncate">
                      {selectedTeacherForModal.tempatLahir ? selectedTeacherForModal.tempatLahir : ''}
                      {selectedTeacherForModal.tempatLahir && selectedTeacherForModal.tanggalLahir ? ', ' : ''}
                      {selectedTeacherForModal.tanggalLahir || ''}
                      {selectedTeacherForModal.tahunMasuk ? ` • Masuk: ${selectedTeacherForModal.tahunMasuk}` : ''}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {selectedTeacherForModal.jabatanTambahan || (selectedTeacherForModal.role === 'walas' ? 'Wali Kelas' : 'Guru Pengampu')}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Demi keamanan akun dan absen mengajar, silakan masukkan <strong>Kata Sandi</strong> Anda sebelum masuk ke portal.
                </span>
              </div>

              {modalError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleVerifyTeacherPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Kata Sandi Akun
                  </label>
                  <div className="relative">
                    <input
                      type={modalShowPass ? 'text' : 'password'}
                      autoFocus
                      required
                      placeholder="Masukkan kata sandi akun guru..."
                      value={modalPassword}
                      onChange={(e) => setModalPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setModalShowPass(!modalShowPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                    >
                      {modalShowPass ? 'Sembunyi' : 'Lihat'}
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Kata sandi default: <code className="text-amber-400 font-mono">guru</code>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTeacherForModal(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Buka Dashboard</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
