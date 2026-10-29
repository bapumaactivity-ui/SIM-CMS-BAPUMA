import React, { useState } from 'react';
import { Ekskul, User, NilaiEkskulSiswa, SchoolInfo } from '../../types';
import { NilaiEkskulView } from '../NilaiEkskulView';
import { 
  Award, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Users, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  BookOpen, 
  Check, 
  X, 
  Filter,
  GraduationCap,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';

interface AdminEkskulTabProps {
  ekskulList: Ekskul[];
  onAddEkskul: (ekskul: Ekskul) => void;
  onUpdateEkskul: (ekskul: Ekskul) => void;
  onDeleteEkskul: (ekskulId: string) => void;
  usersList: User[];
  kelasList?: any[];
  onUpdateUser: (user: User) => void;
  nilaiEkskulList: NilaiEkskulSiswa[];
  onSaveNilaiEkskul: (list: NilaiEkskulSiswa[]) => void;
  schoolInfo?: SchoolInfo;
}

export const AdminEkskulTab: React.FC<AdminEkskulTabProps> = ({
  ekskulList,
  onAddEkskul,
  onUpdateEkskul,
  onDeleteEkskul,
  usersList,
  kelasList,
  onUpdateUser,
  nilaiEkskulList,
  onSaveNilaiEkskul,
  schoolInfo,
}) => {
  const [filterKategori, setFilterKategori] = useState<'all' | 'wajib' | 'pilihan'>('all');
  const [activeSubTab, setActiveSubTab] = useState<'daftar' | 'penilaian'>('daftar');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEkskulId, setEditingEkskulId] = useState<string | null>(null);

  // Form State
  const [formNama, setFormNama] = useState('');
  const [formKategori, setFormKategori] = useState<'wajib' | 'pilihan'>('pilihan');
  const [formPembina, setFormPembina] = useState('');
  const [formPembinaId, setFormPembinaId] = useState('');
  const [formHari, setFormHari] = useState('Sabtu');
  const [formJam, setFormJam] = useState('08:00 - 10:30 WIB');
  const [formKeterangan, setFormKeterangan] = useState('');

  // Selected Ekskul for Member Management modal
  const [managingEkskul, setManagingEkskul] = useState<Ekskul | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  // Filter students and teachers (supporting both pure pembina and teachers/walas merangkap)
  const siswaList = usersList.filter(u => u.role === 'siswa');
  const guruList = usersList.filter(u => u.role === 'guru' || u.role === 'walas' || u.role === 'pembina_ekskul' || u.isPembinaEkskul);

  const filteredEkskul = ekskulList.filter(e => {
    const matchKat = filterKategori === 'all' || e.kategori === filterKategori;
    const matchSearch = e.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.pembina || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchKat && matchSearch;
  });

  const handleOpenAdd = () => {
    setEditingEkskulId(null);
    setFormNama('');
    setFormKategori('pilihan');
    const firstGuru = guruList[0];
    setFormPembina(firstGuru ? firstGuru.nama : '');
    setFormPembinaId(firstGuru ? firstGuru.id : '');
    setFormHari('Sabtu');
    setFormJam('08:00 - 10:30 WIB');
    setFormKeterangan('');
    setShowModal(true);
  };

  const handleOpenEdit = (ekskul: Ekskul) => {
    setEditingEkskulId(ekskul.id);
    setFormNama(ekskul.nama);
    setFormKategori(ekskul.kategori);
    setFormPembina(ekskul.pembina || '');
    // Match teacher by ekskul.idPembina, or fallback to matching full name or username
    const match = guruList.find(g => 
      (ekskul.idPembina && g.id === ekskul.idPembina) ||
      (ekskul.pembina && g.nama.toLowerCase() === ekskul.pembina.toLowerCase()) ||
      (ekskul.pembina && (g.nama.toLowerCase().includes(ekskul.pembina.toLowerCase()) || ekskul.pembina.toLowerCase().includes(g.nama.toLowerCase())))
    );
    setFormPembinaId(match ? match.id : (ekskul.idPembina || ''));
    setFormHari(ekskul.hari || 'Sabtu');
    setFormJam(ekskul.jam || '08:00 - 10:30 WIB');
    setFormKeterangan(ekskul.keterangan || '');
    setShowModal(true);
  };

  const handleSelectPembina = (teacherId: string) => {
    setFormPembinaId(teacherId);
    if (!teacherId) {
      setFormPembina('');
      return;
    }
    const selectedTeacher = guruList.find(g => g.id === teacherId);
    if (selectedTeacher) {
      setFormPembina(selectedTeacher.nama);
    }
  };

  const handleSaveEkskul = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      alert('Nama ekstrakurikuler wajib diisi!');
      return;
    }

    const ekskulId = editingEkskulId || `ekskul-${Date.now()}`;
    const ekskulData: Ekskul = {
      id: ekskulId,
      nama: formNama.trim(),
      kategori: formKategori,
      pembina: formPembina.trim(),
      idPembina: formPembinaId.trim() || undefined,
      hari: formHari.trim(),
      jam: formJam.trim(),
      keterangan: formKeterangan.trim(),
    };

    if (editingEkskulId) {
      onUpdateEkskul(ekskulData);
      setNotification(`Ekskul "${ekskulData.nama}" berhasil diperbarui dengan pembina: ${ekskulData.pembina || '-'}.`);
    } else {
      onAddEkskul(ekskulData);
      setNotification(`Ekskul baru "${ekskulData.nama}" berhasil ditambahkan dengan pembina: ${ekskulData.pembina || '-'}.`);
    }

    // Fungsikan hak akses: Sinkronkan jabatan Pembina Ekskul pada profil guru tersebut
    if (formPembinaId && onUpdateUser) {
      const assignedGuru = usersList.find(u => u.id === formPembinaId);
      if (assignedGuru) {
        const currentDibina = assignedGuru.ekskulDibina || [];
        const updatedDibina = Array.from(new Set([...currentDibina, ekskulId]));
        onUpdateUser({
          ...assignedGuru,
          isPembinaEkskul: true,
          ekskulDibina: updatedDibina,
        });
      }
    }

    setShowModal(false);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDeleteEkskul = (ekskul: Ekskul) => {
    if (window.confirm(`Yakin ingin menghapus kegiatan ekskul "${ekskul.nama}"?`)) {
      onDeleteEkskul(ekskul.id);
      setNotification(`Ekskul "${ekskul.nama}" telah dihapus.`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Toggle student participation in managingEkskul
  const handleToggleStudent = (student: User) => {
    if (!managingEkskul) return;
    const currentList = student.ekskulDiikuti || [];
    const isEnrolled = currentList.includes(managingEkskul.id) || currentList.includes(managingEkskul.nama);

    let updatedList: string[];
    if (isEnrolled) {
      updatedList = currentList.filter(id => id !== managingEkskul.id && id !== managingEkskul.nama);
    } else {
      updatedList = [...currentList, managingEkskul.id];
    }

    const updatedStudent: User = {
      ...student,
      ekskulDiikuti: updatedList,
    };
    onUpdateUser(updatedStudent);
  };

  // Update or set grade for student in managingEkskul
  const handleSetStudentGrade = (student: User, predikat: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang', keterangan: string) => {
    if (!managingEkskul) return;
    const nipdKey = student.nipd || student.nipOrNis;
    const existing = nilaiEkskulList.find(n => n.nipd === nipdKey && n.idEkskul === managingEkskul.id);

    let nextList: NilaiEkskulSiswa[];
    if (existing) {
      nextList = nilaiEkskulList.map(n => 
        (n.nipd === nipdKey && n.idEkskul === managingEkskul.id)
          ? { ...n, predikat, keterangan }
          : n
      );
    } else {
      const newGrade: NilaiEkskulSiswa = {
        id: `ne-${Date.now()}-${student.id}`,
        nipd: nipdKey,
        namaSiswa: student.nama,
        kelas: student.kelas || student.namaKelas || '',
        idEkskul: managingEkskul.id,
        namaEkskul: managingEkskul.nama,
        predikat,
        keterangan: keterangan || `Aktif dan menunjukkan kedisiplinan serta partisipasi sangat baik dalam kegiatan ${managingEkskul.nama}.`,
      };
      nextList = [...nilaiEkskulList, newGrade];
    }
    onSaveNilaiEkskul(nextList);
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Subtab Navigation: Manajemen Daftar vs Form Penilaian Nilai Ekskul */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('daftar')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'daftar'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Daftar & Agenda Ekstrakurikuler ({ekskulList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('penilaian')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'penilaian'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Form Nilai Ekstrakurikuler Rapor (Admin)</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'penilaian' ? (
        <NilaiEkskulView
          currentUser={{
            id: 'admin',
            nama: 'Super Administrator',
            username: 'admin',
            role: 'admin',
            nipOrNis: 'ADM-2026-001',
          }}
          ekskulList={ekskulList}
          usersList={usersList}
          kelasList={kelasList || []}
          nilaiEkskulList={nilaiEkskulList}
          onSaveNilaiEkskul={onSaveNilaiEkskul}
          onUpdateUser={onUpdateUser}
        />
      ) : (
        <>
          {/* Header Info */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-purple-50 text-purple-700 rounded-xl border border-purple-200">
                  <Award className="w-6 h-6" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Manajemen Ekstrakurikuler (Ekskul)</h2>
                  <p className="text-xs text-slate-500">
                    Kelola ekskul wajib & pilihan, pembina, jadwal latihan, serta penetapan anggota dan nilai rapor siswa.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-purple-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Ekskul Baru</span>
            </button>
          </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterKategori('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
              filterKategori === 'all'
                ? 'bg-purple-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({ekskulList.length})
          </button>
          <button
            onClick={() => setFilterKategori('wajib')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
              filterKategori === 'wajib'
                ? 'bg-purple-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Wajib ({ekskulList.filter(e => e.kategori === 'wajib').length})
          </button>
          <button
            onClick={() => setFilterKategori('pilihan')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
              filterKategori === 'pilihan'
                ? 'bg-purple-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pilihan ({ekskulList.filter(e => e.kategori === 'pilihan').length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama ekskul atau pembina..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Ekskul Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEkskul.map((ekskul) => {
          // Count enrolled students
          const enrolledCount = siswaList.filter(s => {
            if (ekskul.kategori === 'wajib') {
              // Pramuka is for all, Keputrian for female or enrolled
              if (ekskul.nama.toLowerCase().includes('keputrian')) {
                return s.jenisKelamin === 'Perempuan' || s.jk === 'P' || (s.ekskulDiikuti || []).includes(ekskul.id);
              }
              return true;
            }
            return (s.ekskulDiikuti || []).includes(ekskul.id) || (s.ekskulDiikuti || []).includes(ekskul.nama);
          }).length;

          return (
            <div 
              key={ekskul.id} 
              className={`rounded-2xl border p-5 bg-white shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                ekskul.kategori === 'wajib' ? 'border-amber-300 ring-1 ring-amber-200/60' : 'border-slate-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                      ekskul.kategori === 'wajib'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-teal-100 text-teal-900 border border-teal-300'
                    }`}>
                      {ekskul.kategori === 'wajib' ? 'Ekskul Wajib' : 'Ekskul Pilihan'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{ekskul.nama}</h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(ekskul)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      title="Edit Ekskul"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEkskul(ekskul)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      title="Hapus Ekskul"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2">
                  {ekskul.keterangan || 'Kegiatan pengembangan minat, bakat, serta kepribadian siswa.'}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <GraduationCap className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>Pembina: <strong className="text-slate-800 font-semibold">{ekskul.pembina || 'Belum Ditentukan'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>Jadwal: <strong className="text-slate-800 font-medium">{ekskul.hari}, {ekskul.jam}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Anggota: <strong className="text-emerald-700 font-bold">{enrolledCount} Siswa</strong></span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setManagingEkskul(ekskul)}
                  className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Kelola Siswa & Nilai Rapor</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL TAMBAH / EDIT EKSKUL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                <span>{editingEkskulId ? 'Edit Data Ekstrakurikuler' : 'Tambah Ekstrakurikuler Baru'}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEkskul} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Ekstrakurikuler *
                </label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: English Club, Palang Merah Remaja (PMR)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kategori Ekskul *
                  </label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    <option value="wajib">Wajib (Pramuka / Keputrian)</option>
                    <option value="pilihan">Pilihan (Minat & Bakat)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Guru Pembina Ekskul * (Pilih dari Dewan Guru)
                  </label>
                  <select
                    value={formPembinaId}
                    onChange={(e) => handleSelectPembina(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-xs focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="">-- Pilih Guru / Pembina Ekskul --</option>
                    {guruList.map(g => {
                      const roles: string[] = [];
                      if (g.role === 'guru') roles.push('Guru');
                      if (g.role === 'walas' || g.isWalas || g.walasKelasId || (g.walasKelasIds && g.walasKelasIds.length > 0)) roles.push('Walas');
                      if (g.isPembinaEkskul || (g.ekskulDibina && g.ekskulDibina.length > 0)) roles.push('Pembina');
                      const roleTag = roles.length > 0 ? ` [${roles.join(' + ')}]` : '';

                      return (
                        <option key={g.id} value={g.id}>
                          {g.nama} {roleTag}
                        </option>
                      );
                    })}
                  </select>
                  {formPembina ? (
                    <p className="text-[11px] text-purple-700 font-medium mt-1">
                      Pembina Aktif: <strong>{formPembina}</strong>
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Silakan pilih guru pendidik yang ditugaskan membina ekskul ini.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hari Latihan
                  </label>
                  <input
                    type="text"
                    value={formHari}
                    onChange={(e) => setFormHari(e.target.value)}
                    placeholder="Jumat / Sabtu"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Waktu / Jam
                  </label>
                  <input
                    type="text"
                    value={formJam}
                    onChange={(e) => setFormJam(e.target.value)}
                    placeholder="14:00 - 16:30 WIB"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Deskripsi & Capaian Kegiatan
                </label>
                <textarea
                  rows={3}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Keterangan singkat materi, visi pembinaan, dan target prestasi..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-md"
                >
                  Simpan Ekskul
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KELOLA ANGGOTA & NILAI RAPOR EKSKUL */}
      {managingEkskul && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                  {managingEkskul.kategori === 'wajib' ? 'Ekskul Wajib' : 'Ekskul Pilihan'}
                </span>
                <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 mt-1">
                  Anggota & Penilaian: {managingEkskul.nama}
                </h3>
                <p className="text-xs text-slate-500">
                  Pembina: {managingEkskul.pembina || '-'} • 1 Siswa dapat mengikuti lebih dari 1 ekskul.
                </p>
              </div>
              <button
                onClick={() => setManagingEkskul(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Search filter for students */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama siswa atau kelas..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Total Siswa: {siswaList.length}
              </span>
            </div>

            {/* Students Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Status Ikut</th>
                    <th className="py-2.5 px-3">NIPD / NISN</th>
                    <th className="py-2.5 px-3">Nama Siswa</th>
                    <th className="py-2.5 px-3">Kelas</th>
                    <th className="py-2.5 px-3">Predikat Rapor</th>
                    <th className="py-2.5 px-3">Catatan / Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {siswaList
                    .filter(s => 
                      s.nama.toLowerCase().includes(memberSearch.toLowerCase()) ||
                      (s.kelas || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
                      (s.nipd || '').includes(memberSearch)
                    )
                    .map((s) => {
                      const nipdKey = s.nipd || s.nipOrNis;
                      const isEnrolled = managingEkskul.kategori === 'wajib' 
                        ? (managingEkskul.nama.toLowerCase().includes('keputrian') ? (s.jenisKelamin === 'Perempuan' || s.jk === 'P') : true)
                        : (s.ekskulDiikuti || []).includes(managingEkskul.id) || (s.ekskulDiikuti || []).includes(managingEkskul.nama);

                      const gradeRecord = nilaiEkskulList.find(n => n.nipd === nipdKey && n.idEkskul === managingEkskul.id);
                      const currentPredikat = gradeRecord?.predikat || 'Sangat Baik';
                      const currentKeterangan = gradeRecord?.keterangan || 'Menunjukkan minat yang tinggi dan aktif dalam seluruh agenda kegiatan.';

                      return (
                        <tr key={s.id} className={isEnrolled ? 'bg-purple-50/40' : 'hover:bg-slate-50'}>
                          <td className="py-2.5 px-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isEnrolled}
                                onChange={() => handleToggleStudent(s)}
                                className="rounded text-purple-600 focus:ring-purple-500"
                              />
                              <span className={`text-[11px] font-bold ${isEnrolled ? 'text-purple-700' : 'text-slate-400'}`}>
                                {isEnrolled ? 'Ikut' : 'Tidak'}
                              </span>
                            </label>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {s.nipd || s.nipOrNis}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {s.nama}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {s.kelas || s.namaKelas}
                          </td>
                          <td className="py-2.5 px-3">
                            {isEnrolled ? (
                              <select
                                value={currentPredikat}
                                onChange={(e) => handleSetStudentGrade(s, e.target.value as any, currentKeterangan)}
                                className="px-2 py-1 rounded-lg border border-purple-200 text-xs font-bold text-purple-900 bg-white"
                              >
                                <option value="Sangat Baik">Sangat Baik (A)</option>
                                <option value="Baik">Baik (B)</option>
                                <option value="Cukup">Cukup (C)</option>
                                <option value="Kurang">Kurang (D)</option>
                              </select>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {isEnrolled ? (
                              <input
                                type="text"
                                value={currentKeterangan}
                                onChange={(e) => handleSetStudentGrade(s, currentPredikat, e.target.value)}
                                placeholder="Keterangan capaian siswa..."
                                className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white"
                              />
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-500">
                Nilai dan ekskul yang diikuti akan langsung sinkron dan tampil pada Rapor resmi siswa.
              </span>
              <button
                onClick={() => setManagingEkskul(null)}
                className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-md"
              >
                Selesai & Tutup
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
