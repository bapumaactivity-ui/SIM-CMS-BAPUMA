import React, { useState } from 'react';
import { PaketUjian, Siswa, Kelas, MataPelajaran, User, AbsenMengajarRecord, SchoolInfo, JadwalPelajaran, AbsensiRecord, NilaiMapelSiswa } from '../../types';
import { isSameKelas } from '../../utils/academicHelpers';
import { EditUjianModal } from '../EditUjianModal';
import { AbsenMengajarView } from '../AbsenMengajarView';
import { AdminAbsenGuruJadwalView } from './AdminAbsenGuruJadwalView';
import { AbsensiBarcodeView } from '../AbsensiBarcodeView';
import { AdminMonitoringNilaiGuruTab } from './AdminMonitoringNilaiGuruTab';
import { 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  FileSpreadsheet, 
  Printer, 
  ShieldCheck, 
  Filter, 
  HelpCircle, 
  TrendingUp, 
  Award, 
  Edit3, 
  Trash2,
  Calendar,
  Users,
  GraduationCap
} from 'lucide-react';

interface AdminMonitoringTabProps {
  ujianList: PaketUjian[];
  siswaList: Siswa[];
  kelasList: Kelas[];
  mapelList: MataPelajaran[];
  currentUser?: User;
  usersList?: User[];
  absenMengajarList?: AbsenMengajarRecord[];
  jadwalPelajaranList?: JadwalPelajaran[];
  schoolInfo?: SchoolInfo;
  absensiList?: AbsensiRecord[];
  nilaiList?: NilaiMapelSiswa[];
  onPullAllFromCloud?: () => Promise<any>;
  onAddAbsensi?: (record: AbsensiRecord) => void;
  onUpdateAbsensi?: (record: AbsensiRecord) => void;
  onDeleteAbsensi?: (id: string) => void;
  onSaveUjian?: (ujian: PaketUjian) => void;
  onDeleteUjian?: (ujianId: string) => void;
  onSaveAbsenMengajar?: (record: AbsenMengajarRecord) => void;
  onDeleteAbsenMengajar?: (id: string) => void;
  onClearAllAbsenMengajar?: () => void;
  onUpdateMapel?: (mapel: MataPelajaran) => void;
  onSaveJadwalPelajaran?: (jadwal: JadwalPelajaran) => void;
  onUpdateUser?: (user: User) => void;
  onSaveNilaiList?: (newList: NilaiMapelSiswa[]) => void;
}

export const AdminMonitoringTab: React.FC<AdminMonitoringTabProps> = ({
  ujianList,
  siswaList,
  kelasList,
  mapelList,
  currentUser,
  usersList = [],
  absenMengajarList = [],
  jadwalPelajaranList = [],
  schoolInfo,
  absensiList = [],
  nilaiList = [],
  onPullAllFromCloud,
  onAddAbsensi = () => {},
  onUpdateAbsensi = () => {},
  onDeleteAbsensi = () => {},
  onSaveUjian,
  onDeleteUjian,
  onSaveAbsenMengajar = () => {},
  onDeleteAbsenMengajar = () => {},
  onClearAllAbsenMengajar,
  onUpdateMapel,
  onSaveJadwalPelajaran,
  onUpdateUser,
  onSaveNilaiList,
}) => {
  const [subTab, setSubTab] = useState<'monitoring_nilai' | 'monitoring_guru' | 'absen_mengajar' | 'hasil_leger' | 'kehadiran_siswa'>('monitoring_nilai');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState<string>('SEMUA');
  const [selectedExamForEdit, setSelectedExamForEdit] = useState<PaketUjian | null>(null);

  const effectiveAdminUser: User = currentUser || {
    id: 'admin-root',
    username: 'admin',
    nama: 'Super Administrator',
    role: 'admin',
    nipOrNis: 'ADM-2026-001'
  };

  // Metrics for exams
  const readyCount = ujianList.filter(u => u.statusDokumen === 'READY').length;
  const draftCount = ujianList.filter(u => u.statusDokumen === 'DRAFT_PROSES').length;
  const belumCount = ujianList.filter(u => u.statusDokumen === 'BELUM_BUAT').length;

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 flex flex-wrap gap-2 shadow-sm justify-between items-center">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSubTab('monitoring_nilai')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              subTab === 'monitoring_nilai'
                ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                : 'text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-amber-500" />
            <span>Monitoring Pengisian Nilai Guru</span>
          </button>

          <button
            onClick={() => setSubTab('kehadiran_siswa')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              subTab === 'kehadiran_siswa'
                ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-300'
                : 'text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200'
            }`}
          >
            <Users className="w-4 h-4 text-teal-500" />
            <span>Riwayat Kehadiran Siswa ({absensiList.length})</span>
          </button>

          <button
            onClick={() => setSubTab('monitoring_guru')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              subTab === 'monitoring_guru'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Monitoring Progres Soal ({ujianList.length})</span>
          </button>

          <button
            onClick={() => setSubTab('absen_mengajar')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              subTab === 'absen_mengajar'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Jurnal & Absen Mengajar Guru ({absenMengajarList.length})</span>
          </button>

          <button
            onClick={() => setSubTab('hasil_leger')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              subTab === 'hasil_leger'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Rekapitulasi Nilai & Leger CAT Siswa</span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari guru / mapel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 w-48"
          />
        </div>
      </div>

      {/* 0. MONITORING INPUT NILAI GURU (PRIMARY FEATURE) */}
      {subTab === 'monitoring_nilai' && (
        <AdminMonitoringNilaiGuruTab
          usersList={usersList}
          mapelList={mapelList}
          kelasList={kelasList}
          nilaiList={nilaiList}
          jadwalPelajaranList={jadwalPelajaranList}
          ujianList={ujianList}
          schoolInfo={schoolInfo}
          currentUser={currentUser}
          onPullAllFromCloud={onPullAllFromCloud}
          onUpdateMapel={onUpdateMapel}
          onSaveJadwalPelajaran={onSaveJadwalPelajaran}
          onUpdateUser={onUpdateUser}
          onSaveNilaiList={onSaveNilaiList}
        />
      )}

      {/* 1. MONITORING PROGRES GURU */}
      {subTab === 'monitoring_guru' && (
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                {readyCount}
              </div>
              <div>
                <div className="text-xs text-emerald-900 font-bold uppercase">Paket Ujian Siap (READY)</div>
                <div className="text-[11px] text-emerald-700">Soal PG & Isian lengkap, token aktif</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-sm">
                {draftCount}
              </div>
              <div>
                <div className="text-xs text-amber-900 font-bold uppercase">Proses Penyusunan</div>
                <div className="text-[11px] text-amber-700">Draf terisi sebagian oleh guru</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-sm">
                {belumCount}
              </div>
              <div>
                <div className="text-xs text-rose-900 font-bold uppercase">Belum Upload Soal</div>
                <div className="text-[11px] text-rose-700">Memerlukan peringatan admin</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-3.5 px-4">Guru Pengampu</th>
                    <th className="py-3.5 px-4">Mata Pelajaran</th>
                    <th className="py-3.5 px-4">Jenis Ujian & Target</th>
                    <th className="py-3.5 px-4 text-center">Progress Butir Soal</th>
                    <th className="py-3.5 px-4 text-center">Token Ujian</th>
                    <th className="py-3.5 px-4 text-center">Status Pemantauan</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ujianList
                    .filter(u => (u.namaGuru || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.namaMapel || '').toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((exam) => {
                      const pgCount = exam.soalPG?.length || 0;
                      const isianCount = exam.soalIsian?.length || 0;
                      const targetPG = exam.jenisUjian === 'UJIAN_AKHIR' ? 40 : 30;

                      return (
                        <tr key={exam.id} className="hover:bg-amber-50/20 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {exam.namaGuru}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{exam.namaMapel}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Kode: {exam.kodeMapel || exam.id}</div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px] text-slate-700">
                              {exam.jenisUjian === 'UJIAN_AKHIR' ? 'PAS/PAT' : 'PTS/UTS'}
                            </span>
                            <div className="text-[11px] text-blue-700 font-semibold mt-0.5">
                              {exam.targetKelas?.join(', ')}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="font-mono font-bold text-slate-800">
                              {pgCount}/{targetPG} PG • {isianCount}/5 Isian
                            </div>
                            <div className="w-24 bg-slate-200 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                              <div
                                className={`h-full ${
                                  exam.statusDokumen === 'READY' ? 'bg-emerald-500' :
                                  exam.statusDokumen === 'DRAFT_PROSES' ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, (pgCount / targetPG) * 100)}%` }}
                              />
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center font-mono font-bold text-amber-800">
                            {exam.token || '-'}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              exam.statusDokumen === 'READY' ? 'bg-emerald-100 text-emerald-800' :
                              exam.statusDokumen === 'DRAFT_PROSES' ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {exam.statusDokumen === 'READY' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              <span>{exam.statusDokumen}</span>
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <button
                                onClick={() => setSelectedExamForEdit(exam)}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center gap-1 border border-indigo-200 transition-colors shadow-2xs"
                                title="Admin: Edit Waktu Pelaksanaan, Sesi & Butir Soal"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit Soal & Jadwal</span>
                              </button>

                              {onDeleteUjian && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Admin: Yakin ingin menghapus paket ujian "${exam.namaUjian}" dari ${exam.namaGuru}?`)) {
                                      onDeleteUjian(exam.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Hapus Ujian"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. JURNAL & ABSEN MENGAJAR DEWAN GURU SESUAI JADWAL & JAM KELAS */}
      {subTab === 'absen_mengajar' && (
        <div className="space-y-4">
          <AdminAbsenGuruJadwalView
            currentUser={effectiveAdminUser}
            jadwalPelajaranList={jadwalPelajaranList}
            absenMengajarList={absenMengajarList}
            kelasList={kelasList}
            mapelList={mapelList as any}
            usersList={usersList}
            schoolInfo={schoolInfo || ({} as any)}
            onSaveAbsenMengajar={onSaveAbsenMengajar}
            onDeleteAbsenMengajar={onDeleteAbsenMengajar}
            onClearAllAbsenMengajar={onClearAllAbsenMengajar}
          />
        </div>
      )}

      {/* 3. REKAPITULASI NILAI & LEGER */}
      {subTab === 'hasil_leger' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">Filter Rombel:</span>
              <select
                value={filterKelas}
                onChange={(e) => setFilterKelas(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold"
              >
                <option value="SEMUA">Semua Rombel (Kelas)</option>
                {kelasList.map(k => {
                  const cleanK = (k.namaKelas || '').replace(/^Kelas\s+/i, '').trim();
                  return (
                    <option key={k.id} value={cleanK}>{cleanK}</option>
                  );
                })}
              </select>
            </div>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Cetak Leger Nilai</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-3.5 px-4">No. & NISN</th>
                    <th className="py-3.5 px-4">Nama Siswa</th>
                    <th className="py-3.5 px-4">Kelas & Jurusan</th>
                    <th className="py-3.5 px-4 text-center">Nilai Rata-rata Ujian</th>
                    <th className="py-3.5 px-4 text-center">Predikat Kelulusan</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {siswaList
                    .filter(s => filterKelas === 'SEMUA' || isSameKelas(s.kelas, filterKelas))
                    .map((siswa, idx) => (
                      <tr key={siswa.id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="py-3 px-4 font-mono">
                          <span className="text-slate-400 mr-2">{idx + 1}.</span>
                          <span className="font-bold text-slate-800">{siswa.nisn || siswa.id}</span>
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900">
                          {siswa.nama}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{siswa.kelas}</div>
                          <div className="text-[10px] text-slate-500">{siswa.jurusan}</div>
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-bold text-emerald-800">
                          86.5
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            A (Sangat Baik)
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[10px]">
                            Tuntas KKM
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. RIWAYAT & REKAP KEHADIRAN SISWA REAL-TIME */}
      {subTab === 'kehadiran_siswa' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <AbsensiBarcodeView
            currentUser={effectiveAdminUser}
            usersList={usersList}
            allUsersList={usersList}
            absensiList={absensiList}
            onAddAbsensi={onAddAbsensi}
            onUpdateAbsensi={onUpdateAbsensi}
            onDeleteAbsensi={onDeleteAbsensi}
            kelasList={kelasList}
            schoolInfo={schoolInfo}
          />
        </div>
      )}

      {/* Admin Edit Ujian & Soal Modal */}
      {selectedExamForEdit && (
        <EditUjianModal
          ujian={selectedExamForEdit}
          currentUser={effectiveAdminUser}
          kelasList={kelasList}
          mapelList={mapelList as any}
          onSave={(updated) => {
            onSaveUjian?.(updated);
            setSelectedExamForEdit(null);
          }}
          onClose={() => setSelectedExamForEdit(null)}
        />
      )}
    </div>
  );
};
