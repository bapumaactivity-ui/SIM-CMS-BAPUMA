import React, { useState } from 'react';
import { User, Kelas, SchoolInfo } from '../../types';
import { KartuPelajarModal } from '../KartuPelajarModal';
import { SquareQrCode } from '../SquareQrCode';
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
  UserCheck, 
  GraduationCap, 
  Building2, 
  Eye, 
  EyeOff, 
  Check,
  QrCode,
  Printer,
  Shield,
  Calendar,
  MapPin,
  IdCard
} from 'lucide-react';

interface AdminSiswaTabProps {
  usersList: User[];
  kelasList: Kelas[];
  schoolInfo?: SchoolInfo;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onClearTemplateStudents?: () => void;
}

export const AdminSiswaTab: React.FC<AdminSiswaTabProps> = ({
  usersList,
  kelasList,
  schoolInfo,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onClearTemplateStudents,
}) => {
  const [filterJurusan, setFilterJurusan] = useState<string>('Semua');
  const [filterKelas, setFilterKelas] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState<User | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<{ [id: string]: boolean }>({});
  const [notification, setNotification] = useState<string | null>(null);
  const [kartuPelajarSiswa, setKartuPelajarSiswa] = useState<User | null>(null);
  const [isBulkPrintOpen, setIsBulkPrintOpen] = useState(false);

  // Dedicated in-app modals for Delete and Password Reset (replacing window.confirm / prompt)
  const [deleteConfirmSiswa, setDeleteConfirmSiswa] = useState<User | null>(null);
  const [showClearTemplateModal, setShowClearTemplateModal] = useState(false);
  const [passwordResetSiswa, setPasswordResetSiswa] = useState<User | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('siswa123');

  // Form state
  const [formNama, setFormNama] = useState('');
  const [formNipd, setFormNipd] = useState(''); // NIPD (Primary Key e.g. 24.25.10.001)
  const [formNisn, setFormNisn] = useState(''); // NISN (10 digit e.g. 0094701443)
  const [formTempatLahir, setFormTempatLahir] = useState('');
  const [formTanggalLahir, setFormTanggalLahir] = useState('');
  const [formIdKelas, setFormIdKelas] = useState('');
  const [formJurusan, setFormJurusan] = useState<'Farmasi' | 'Asisten Keperawatan' | 'Tata Kecantikan & Spa' | 'Perhotelan'>('Farmasi');
  const [formJenisKelamin, setFormJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Perempuan');
  const [formJabatanKelas, setFormJabatanKelas] = useState<string>('Anggota');
  const [formTelepon, setFormTelepon] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('siswa123');
  const [formStatusAktif, setFormStatusAktif] = useState(true);
  const [formFotoProfilUrl, setFormFotoProfilUrl] = useState<string>('');
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [photoCompressInfo, setPhotoCompressInfo] = useState<string | null>(null);

  const handlePhotoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingPhoto(true);
    setPhotoCompressInfo(null);
    try {
      const result = await compressStudentPhoto(file, 640, 0.86);
      setFormFotoProfilUrl(result.dataUrl);
      const origKb = Math.round(result.originalSize / 1024);
      const compKb = Math.round(result.compressedSize / 1024);
      const infoMsg = `Foto berhasil dioptimasi otomatis (${origKb} KB → ${compKb} KB). Kualitas tetap tajam & jernih!`;
      setPhotoCompressInfo(infoMsg);
    } catch (err: any) {
      alert(err?.message || 'Gagal memproses berkas foto');
    } finally {
      setIsCompressingPhoto(false);
      e.target.value = '';
    }
  };

  const availableJurusanList = React.useMemo(() => {
    if (schoolInfo?.kejuruanList && schoolInfo.kejuruanList.length > 0) {
      return schoolInfo.kejuruanList.map(j => j.singkatan || j.nama);
    }
    return ['Farmasi', 'Asisten Keperawatan', 'Kesehatan', 'Tata Kecantikan & Spa', 'Perhotelan'];
  }, [schoolInfo?.kejuruanList]);

  // Filter list of active students
  const siswaList = usersList.filter(u => u.role === 'siswa');

  // Hitung jumlah siswa bawaan template sistem
  const templateStudentsCount = React.useMemo(() => {
    return usersList.filter(u => u.role === 'siswa' && (u.id.startsWith('u-siswa-gen-') || u.id.startsWith('u-siswa-dummy-'))).length;
  }, [usersList]);

  const filteredSiswa = siswaList.filter(s => {
    const matchJurusan = filterJurusan === 'Semua' || (s.jurusan || '') === filterJurusan;
    const matchKelas = filterKelas === 'Semua' || s.idKelas === filterKelas || s.kelas === filterKelas || s.namaKelas === filterKelas;
    const matchSearch = (s.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.nipOrNis || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.nipd || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.nisn || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.username || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchJurusan && matchKelas && matchSearch;
  });

  const handleOpenAdd = () => {
    setEditingSiswa(null);
    setFormNama('');
    const nextNum = String(siswaList.length + 1).padStart(3, '0');
    setFormNipd(`24.25.10.${nextNum}`);
    setFormNisn('');
    setFormTempatLahir('Bogor');
    setFormTanggalLahir('2009-01-01');
    setFormIdKelas(kelasList[0]?.id || '');
    setFormJurusan((kelasList[0]?.jurusan as any) || 'Farmasi');
    setFormJenisKelamin('Perempuan');
    setFormJabatanKelas('Anggota');
    setFormTelepon('');
    setFormEmail('');
    setFormPassword('siswa123');
    setFormStatusAktif(true);
    setFormFotoProfilUrl('');
    setShowModal(true);
  };

  const handleOpenEdit = (siswa: User) => {
    setEditingSiswa(siswa);
    setFormNama(siswa.nama);
    setFormNipd(siswa.nipd || siswa.nipOrNis || '');
    setFormNisn(siswa.nisn || (siswa.username && siswa.username.length === 10 ? siswa.username : '') || '');
    setFormTempatLahir(siswa.tempatLahir || '');
    setFormTanggalLahir(siswa.tanggalLahir || '');
    setFormIdKelas(siswa.idKelas || '');
    setFormJurusan((siswa.jurusan as any) || 'Farmasi');
    setFormJenisKelamin(siswa.jenisKelamin || (siswa.jk === 'L' ? 'Laki-laki' : 'Perempuan'));
    setFormJabatanKelas(siswa.jabatanKelas || 'Anggota');
    setFormTelepon(siswa.telepon || '');
    setFormEmail(siswa.email || '');
    setFormPassword(siswa.password || 'siswa123');
    setFormStatusAktif(siswa.statusAktif !== false);
    setFormFotoProfilUrl(siswa.fotoProfilUrl || '');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama || !formNipd) {
      alert('Nama siswa dan NIPD wajib diisi!');
      return;
    }

    const matchedKelas = kelasList.find(k => k.id === formIdKelas);
    const kelasName = (matchedKelas ? matchedKelas.namaKelas : (editingSiswa?.namaKelas || 'XII Asisten Farmasi')).replace(/^Kelas\s+/i, '');

    if (editingSiswa) {
      const updated: User = {
        ...editingSiswa,
        nama: formNama,
        nipd: formNipd,
        nipOrNis: formNipd,
        nisn: formNisn,
        username: formNisn || formNipd,
        tempatLahir: formTempatLahir,
        tanggalLahir: formTanggalLahir,
        role: 'siswa',
        idKelas: formIdKelas,
        namaKelas: kelasName,
        kelas: kelasName,
        jurusan: formJurusan,
        jenisKelamin: formJenisKelamin,
        jk: formJenisKelamin === 'Laki-laki' ? 'L' : 'P',
        jabatanKelas: formJabatanKelas,
        isKetuaKelas: formJabatanKelas === 'Ketua Kelas',
        telepon: formTelepon,
        email: formEmail,
        password: formPassword,
        statusAktif: formStatusAktif,
        fotoProfilUrl: formFotoProfilUrl.trim() || undefined,
      };
      onUpdateUser(updated);
      setNotification(`Data siswa "${formNama}" (NIPD: ${formNipd}) berhasil diperbarui!`);
    } else {
      const newUser: User = {
        id: `u-siswa-${Date.now()}`,
        nama: formNama,
        nipd: formNipd,
        nipOrNis: formNipd,
        nisn: formNisn,
        username: formNisn || formNipd,
        tempatLahir: formTempatLahir,
        tanggalLahir: formTanggalLahir,
        role: 'siswa',
        idKelas: formIdKelas,
        namaKelas: kelasName,
        kelas: kelasName,
        jurusan: formJurusan,
        jenisKelamin: formJenisKelamin,
        jk: formJenisKelamin === 'Laki-laki' ? 'L' : 'P',
        jabatanKelas: formJabatanKelas,
        isKetuaKelas: formJabatanKelas === 'Ketua Kelas',
        telepon: formTelepon,
        email: formEmail,
        password: formPassword || 'siswa123',
        statusAktif: formStatusAktif,
        fotoProfilUrl: formFotoProfilUrl.trim() || undefined,
      };
      onAddUser(newUser);
      setNotification(`Siswa baru "${formNama}" (NIPD: ${formNipd}) berhasil ditambahkan!`);
    }

    setShowModal(false);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleDelete = (siswa: User) => {
    setDeleteConfirmSiswa(siswa);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmSiswa) return;
    const target = deleteConfirmSiswa;
    onDeleteUser(target.id);
    setNotification(`Siswa "${target.nama}" (NIPD: ${target.nipd || target.nipOrNis}) telah berhasil dihapus dari sistem.`);
    setDeleteConfirmSiswa(null);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleOpenResetPassword = (siswa: User) => {
    setPasswordResetSiswa(siswa);
    setNewPasswordVal('siswa123');
  };

  const handleConfirmResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetSiswa) return;
    onUpdateUser({ ...passwordResetSiswa, password: newPasswordVal });
    setNotification(`Kata sandi akun siswa "${passwordResetSiswa.nama}" berhasil diperbarui!`);
    setPasswordResetSiswa(null);
    setTimeout(() => setNotification(null), 3500);
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900 text-xs font-semibold shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Total Siswa Terdata</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{siswaList.length}</div>
          <div className="text-[10px] text-emerald-600 mt-1 font-semibold">Semua Kelas & Kejuruan</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">XII Farmasi</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {siswaList.filter(s => (s.namaKelas || s.kelas || '').toLowerCase().includes('farmasi')).length}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Asisten Farmasi</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">XII Keperawatan</div>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {siswaList.filter(s => (s.namaKelas || s.kelas || '').toLowerCase().includes('keperawatan')).length}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Asisten Keperawatan</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Kartu Barcode NIPD</div>
          <div className="text-2xl font-black text-purple-600 mt-1">{siswaList.length}</div>
          <div className="text-[10px] text-purple-600 mt-1 font-semibold">Siap Cetak ID Card</div>
        </div>
      </div>

      {/* TOOLBAR CONTROLS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Nama, NIPD, NISN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:border-amber-500"
            />
          </div>

          {/* Filter Kelas */}
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50"
          >
            <option value="Semua">Semua Kelas ({siswaList.length})</option>
            {kelasList.map(k => (
              <option key={k.id} value={k.namaKelas}>
                {k.namaKelas}{k.status === 'nonaktif' ? ' (Nonaktif)' : ''}
              </option>
            ))}
          </select>

          {/* Filter Jurusan */}
          <select
            value={filterJurusan}
            onChange={(e) => setFilterJurusan(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50"
          >
            <option value="Semua">Semua Jurusan</option>
            {availableJurusanList.map(j => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onClearTemplateStudents && templateStudentsCount > 0 && (
            <button
              type="button"
              onClick={() => setShowClearTemplateModal(true)}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
              title="Bersihkan data siswa bawaan template secara permanen agar tidak muncul lagi"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Bersihkan Siswa Bawaan ({templateStudentsCount})</span>
            </button>
          )}

          <button
            onClick={() => setIsBulkPrintOpen(true)}
            className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors whitespace-nowrap"
            title="Cetak Kartu Tanda Pelajar untuk siswa hasil filter"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Kartu Rombel ({filteredSiswa.length})</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa Baru</span>
          </button>
        </div>
      </div>

      {/* TABLE DATA SISWA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3.5 px-4">Nama Siswa & TTL</th>
                <th className="py-3.5 px-4">NIPD (Primary Key)</th>
                <th className="py-3.5 px-4">NISN</th>
                <th className="py-3.5 px-4">Kelas & Jabatan</th>
                <th className="py-3.5 px-4">JK</th>
                <th className="py-3.5 px-4">Akun Login</th>
                <th className="py-3.5 px-4 text-center">Kartu Pelajar & QR</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSiswa.map((siswa) => {
                const primaryNipd = siswa.nipd || siswa.nipOrNis;
                return (
                  <tr key={siswa.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 font-black flex items-center justify-center shrink-0 border border-purple-200 overflow-hidden shadow-2xs">
                          {siswa.fotoProfilUrl ? (
                            <img src={siswa.fotoProfilUrl} alt={siswa.nama} className="w-full h-full object-cover" />
                          ) : (
                            siswa.nama.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate max-w-[180px]">{siswa.nama}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{siswa.tempatLahir || '-'}, {siswa.tanggalLahir || '-'}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-amber-700 bg-amber-50/40">
                      {primaryNipd}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-700">
                      {siswa.nisn || siswa.username || '-'}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-purple-900">
                        {(siswa.namaKelas || siswa.kelas || 'XII').replace(/^Kelas\s+/i, '')}
                      </div>
                      <div className="mt-0.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          siswa.jabatanKelas === 'Ketua Kelas' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          siswa.jabatanKelas === 'Wakil Ketua' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {siswa.jabatanKelas || 'Anggota'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-700 font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        siswa.jk === 'L' || siswa.jenisKelamin === 'Laki-laki'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {siswa.jk || (siswa.jenisKelamin === 'Laki-laki' ? 'L' : 'P')}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px]">
                      <div className="text-slate-800 font-semibold">{siswa.username}</div>
                      <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                        <span>{showPasswordMap[siswa.id] ? siswa.password : '••••••••'}</span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(siswa.id)}
                          className="text-slate-400 hover:text-slate-600"
                          title="Lihat Password"
                        >
                          {showPasswordMap[siswa.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setKartuPelajarSiswa(siswa)}
                        className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-bold flex items-center gap-1.5 mx-auto transition-colors shadow-2xs"
                        title="Lihat & Cetak Kartu Pelajar Resmi (QR Code Persegi)"
                      >
                        <IdCard className="w-3.5 h-3.5 text-teal-600" />
                        <span>Kartu Pelajar</span>
                      </button>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenResetPassword(siswa)}
                          className="p-1.5 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
                          title="Reset Password Siswa"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(siswa)}
                          className="p-1.5 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                          title="Edit Siswa"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(siswa)}
                          className="p-1.5 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredSiswa.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Tidak ditemukan data siswa dengan kriteria filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL KARTU PELAJAR & QR CODE PERSEGI */}
      {(kartuPelajarSiswa || isBulkPrintOpen) && (
        <KartuPelajarModal
          siswa={kartuPelajarSiswa || filteredSiswa[0]}
          bulkList={isBulkPrintOpen ? filteredSiswa : undefined}
          schoolInfo={schoolInfo || ({
            nama: 'SMK BAKTI PUTRA MANDIRI',
            npsn: '69987123',
            akreditasi: 'A (Unggul)',
            alamatLengkap: 'Jl. Mohamad Sumantri No. 11 Parungpanjang, Bogor',
            telepon: '(021) 5978-2345',
            kepalaSekolah: 'Dr. Nurul Husnul Lail, M.Kes.',
            nipKepalaSekolah: '197108151998021004',
            logoUrl: '/logo_bpm.png'
          } as any)}
          onClose={() => {
            setKartuPelajarSiswa(null);
            setIsBulkPrintOpen(false);
          }}
        />
      )}

      {/* MODAL FORM TAMBAH / EDIT SISWA */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-900 text-base flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-amber-600" />
                <span>{editingSiswa ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</span>
              </h4>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: A'inun Latifah"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 focus:border-amber-500"
                />
              </div>

              {/* UPLOAD & UBAH PAS FOTO PROFILE SISWA */}
              <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/80 flex items-center gap-3.5">
                <div className="w-14 h-16 rounded-xl bg-white border-2 border-amber-300 overflow-hidden shadow-xs flex items-center justify-center shrink-0">
                  {formFotoProfilUrl ? (
                    <img src={formFotoProfilUrl} alt="Preview Foto" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-1">
                      <span className="text-amber-700 font-black text-xl">{formNama ? formNama.charAt(0) : 'S'}</span>
                      <span className="block text-[8px] text-slate-400 font-bold">FOTO</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="font-bold text-slate-800 text-xs">Pas Foto Siswa (Kartu Pelajar & Profil)</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className={`px-3 py-1.5 rounded-xl text-white font-bold text-[11px] cursor-pointer shadow-2xs flex items-center gap-1.5 transition-all ${
                      isCompressingPhoto ? 'bg-amber-400 cursor-wait' : 'bg-amber-600 hover:bg-amber-700'
                    }`}>
                      <span>{isCompressingPhoto ? 'Mengompres...' : 'Unggah File Foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isCompressingPhoto}
                        onChange={handlePhotoFileUpload}
                        className="hidden"
                      />
                    </label>
                    {formFotoProfilUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormFotoProfilUrl('');
                          setPhotoCompressInfo(null);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 text-[11px] font-bold transition-all"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                  {photoCompressInfo && (
                    <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 p-1.5 rounded-lg font-medium leading-tight">
                      ✓ {photoCompressInfo}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Foto dari kamera HP otomatis dikompres ringan (&lt;70KB) agar hemat memori &amp; tetap jernih untuk cetak ID Card.
                  </p>
                  <input
                    type="text"
                    value={formFotoProfilUrl}
                    onChange={(e) => setFormFotoProfilUrl(e.target.value)}
                    placeholder="Atau tempel URL foto langsung..."
                    className="w-full px-2.5 py-1 text-[10px] rounded-lg border border-slate-200 bg-white placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    NIPD (Primary Key Barcode) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNipd}
                    onChange={(e) => setFormNipd(e.target.value)}
                    placeholder="Contoh: 24.25.10.001"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-bold text-amber-700 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    NISN (10 Digit Nasional)
                  </label>
                  <input
                    type="text"
                    value={formNisn}
                    onChange={(e) => setFormNisn(e.target.value)}
                    placeholder="Contoh: 0094701443"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    value={formTempatLahir}
                    onChange={(e) => setFormTempatLahir(e.target.value)}
                    placeholder="Contoh: Bogor / Jepara"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={formTanggalLahir}
                    onChange={(e) => setFormTanggalLahir(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formJenisKelamin}
                    onChange={(e) => setFormJenisKelamin(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold bg-white focus:border-amber-500"
                  >
                    <option value="Perempuan">Perempuan (P)</option>
                    <option value="Laki-laki">Laki-laki (L)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Jabatan di Kelas
                  </label>
                  <select
                    value={formJabatanKelas}
                    onChange={(e) => setFormJabatanKelas(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold bg-white focus:border-amber-500"
                  >
                    <option value="Anggota">Anggota Kelas</option>
                    <option value="Ketua Kelas">Ketua Kelas (Kordinator)</option>
                    <option value="Wakil Ketua">Wakil Ketua</option>
                    <option value="Sekretaris">Sekretaris</option>
                    <option value="Bendahara">Bendahara</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kelas & Rombel
                  </label>
                  <select
                    value={formIdKelas}
                    onChange={(e) => {
                      setFormIdKelas(e.target.value);
                      const k = kelasList.find(item => item.id === e.target.value);
                      if (k && k.jurusan) setFormJurusan(k.jurusan as any);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold bg-white focus:border-amber-500"
                  >
                    {kelasList.map(k => (
                      <option key={k.id} value={k.id}>
                        {k.namaKelas}{k.status === 'nonaktif' ? ' (Nonaktif)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Program Keahlian
                  </label>
                  <select
                    value={formJurusan}
                    onChange={(e) => setFormJurusan(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold bg-white focus:border-amber-500"
                  >
                    {availableJurusanList.map(j => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    No. WhatsApp Siswa
                  </label>
                  <input
                    type="text"
                    value={formTelepon}
                    onChange={(e) => setFormTelepon(e.target.value)}
                    placeholder="081234567890"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kata Sandi Akun Siswa
                  </label>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-sm"
                >
                  {editingSiswa ? 'Simpan Perubahan' : 'Tambah Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS SISWA */}
      {deleteConfirmSiswa && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Hapus Data Siswa?</h4>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-4 text-xs text-rose-950 space-y-2">
              <p>
                Anda akan menghapus data siswa:
              </p>
              <div className="font-bold text-sm text-slate-900">{deleteConfirmSiswa.nama}</div>
              <div className="font-mono text-slate-600">
                NIPD: {deleteConfirmSiswa.nipd || deleteConfirmSiswa.nipOrNis} • NISN: {deleteConfirmSiswa.nisn || deleteConfirmSiswa.username || '-'}
              </div>
              <div className="text-purple-900 font-semibold">
                Kelas: {deleteConfirmSiswa.namaKelas || deleteConfirmSiswa.kelas} ({deleteConfirmSiswa.jurusan})
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmSiswa(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Siswa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESET KATA SANDI SISWA */}
      {passwordResetSiswa && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600" />
                <span>Reset Kata Sandi Siswa</span>
              </h4>
              <button
                type="button"
                onClick={() => setPasswordResetSiswa(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div>Siswa: <strong className="text-slate-900">{passwordResetSiswa.nama}</strong></div>
              <div className="font-mono text-slate-500">NIPD: {passwordResetSiswa.nipd || passwordResetSiswa.nipOrNis}</div>
            </div>

            <form onSubmit={handleConfirmResetPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kata Sandi Baru *
                </label>
                <input
                  type="text"
                  required
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold focus:border-amber-500 focus:outline-none"
                  placeholder="Masukkan sandi baru..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPasswordResetSiswa(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
                >
                  Simpan Kata Sandi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL BERSIHKAN SISWA TEMPLATE / BAWAAN SISTEM */}
      {showClearTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Bersihkan Siswa Bawaan Sistem</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowClearTemplateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 font-medium leading-relaxed">
                Tindakan ini akan <strong>menghapus permanen seluruh {templateStudentsCount} data siswa bawaan template</strong> (ID generator) dari sistem, browser, dan cloud database sehingga <strong>tidak akan muncul kembali keesokan harinya atau di perangkat lain</strong>.
              </div>
              <p className="text-slate-500">
                Siswa asli yang ditambahkan secara manual atau diimpor oleh sekolah <strong>tetap aman dan tidak akan terhapus</strong>.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowClearTemplateModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearTemplateStudents) {
                    onClearTemplateStudents();
                    setNotification(`Berhasil membersihkan ${templateStudentsCount} siswa template bawaan secara permanen.`);
                    setTimeout(() => setNotification(null), 4000);
                  }
                  setShowClearTemplateModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Bersihkan Permanen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
