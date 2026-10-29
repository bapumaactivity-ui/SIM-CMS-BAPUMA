import React, { useState } from 'react';
import { JadwalPelajaran, JadwalUjianItem, Kelas, Mapel, User, SchoolInfo } from '../../types';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  Printer, 
  Building2, 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  Filter, 
  ShieldCheck, 
  Sparkles,
  Key,
  Check,
  FileSpreadsheet,
  Download,
  Upload,
  UserCheck,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { 
  downloadTemplateJadwalExcel, 
  exportJadwalToExcel, 
  readSpreadsheetFile,
  normalizeExcelTime,
  formatDisplayJamKBM,
  extractJadwalTimes
} from '../../utils/excelHelper';
import { printDocumentArea } from '../../utils/printHelper';

interface AdminJadwalTabProps {
  jadwalPelajaranList: JadwalPelajaran[];
  jadwalUjianList: JadwalUjianItem[];
  kelasList: Kelas[];
  mapelList: Mapel[];
  usersList: User[];
  schoolInfo: SchoolInfo;
  onSaveJadwalPelajaran: (jadwal: JadwalPelajaran) => void;
  onDeleteJadwalPelajaran: (id: string) => void;
  onSaveJadwalUjian: (jadwal: JadwalUjianItem) => void;
  onDeleteJadwalUjian: (id: string) => void;
  onImportJadwal?: (jadwal: JadwalPelajaran[], mode?: 'update' | 'replace' | 'append') => void;
  onClearAllJadwalPelajaran?: () => void;
  onDeduplicateJadwalPelajaran?: () => number;
  onOpenAbsenGuru?: () => void;
}

export const AdminJadwalTab: React.FC<AdminJadwalTabProps> = ({
  jadwalPelajaranList,
  jadwalUjianList,
  kelasList,
  mapelList,
  usersList,
  schoolInfo,
  onSaveJadwalPelajaran,
  onDeleteJadwalPelajaran,
  onSaveJadwalUjian,
  onDeleteJadwalUjian,
  onImportJadwal,
  onClearAllJadwalPelajaran,
  onDeduplicateJadwalPelajaran,
  onOpenAbsenGuru,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'pelajaran' | 'ujian'>('pelajaran');
  const [notification, setNotification] = useState<string | null>(null);

  // Filters for Jadwal Pelajaran
  const [filterHari, setFilterHari] = useState<string>('Semua');
  const [filterKelasPelajaran, setFilterKelasPelajaran] = useState<string>('Semua');

  // Filters for Jadwal Ujian
  const [filterKelasUjian, setFilterKelasUjian] = useState<string>('Semua');
  const [filterJenisUjian, setFilterJenisUjian] = useState<string>('Semua');

  // Modal Jadwal Pelajaran
  const [showPelajaranModal, setShowPelajaranModal] = useState(false);
  const [editingPelajaran, setEditingPelajaran] = useState<JadwalPelajaran | null>(null);
  const [formPelajaranHari, setFormPelajaranHari] = useState<JadwalPelajaran['hari']>('Senin');
  const [formPelajaranJamMulai, setFormPelajaranJamMulai] = useState('07:15');
  const [formPelajaranJamSelesai, setFormPelajaranJamSelesai] = useState('08:45');
  const [formPelajaranJumlahJam, setFormPelajaranJumlahJam] = useState<number>(2);
  const [formPelajaranIdKelas, setFormPelajaranIdKelas] = useState(kelasList[0]?.id || '');
  const [formPelajaranIdMapel, setFormPelajaranIdMapel] = useState(mapelList[0]?.id || '');
  const [formPelajaranIdGuru, setFormPelajaranIdGuru] = useState('');
  const [formPelajaranRuang, setFormPelajaranRuang] = useState('Lab Farmasi 1');

  // Modal Jadwal Ujian
  const [showUjianModal, setShowUjianModal] = useState(false);
  const [editingUjian, setEditingUjian] = useState<JadwalUjianItem | null>(null);
  const [formUjianNama, setFormUjianNama] = useState('');
  const [formUjianJenis, setFormUjianJenis] = useState<JadwalUjianItem['jenisUjian']>('UAS CAT');
  const [formUjianTanggal, setFormUjianTanggal] = useState('2026-06-15');
  const [formUjianJamMulai, setFormUjianJamMulai] = useState('08:00');
  const [formUjianJamSelesai, setFormUjianJamSelesai] = useState('09:30');
  const [formUjianSesi, setFormUjianSesi] = useState('Sesi 1');
  const [formUjianIdKelas, setFormUjianIdKelas] = useState(kelasList[0]?.id || '');
  const [formUjianIdMapel, setFormUjianIdMapel] = useState(mapelList[0]?.id || '');
  const [formUjianRuang, setFormUjianRuang] = useState('Lab CBT Komputer 1');
  const [formUjianPengawas, setFormUjianPengawas] = useState('');
  const [formUjianProktor, setFormUjianProktor] = useState('Tim IT BAPUMA');
  const [formUjianToken, setFormUjianToken] = useState('BAKTI26X');

  // Modal Hapus Semua & Deduplikasi
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [showImportOptionsModal, setShowImportOptionsModal] = useState(false);
  const [pendingImportList, setPendingImportList] = useState<JadwalPelajaran[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [selectedImportMode, setSelectedImportMode] = useState<'update' | 'replace' | 'append'>('update');

  // Print Preview Modal & Paper Settings State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printType, setPrintType] = useState<'pelajaran' | 'ujian'>('pelajaran');
  const [paperSize, setPaperSize] = useState<'A4' | 'F4' | 'Legal' | 'Letter'>('A4');
  const [paperOrientation, setPaperOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [paperMargin, setPaperMargin] = useState<'normal' | 'sempit' | 'minimal'>('sempit');

  const teachersList = usersList.filter(u => u.role === 'guru' || u.role === 'walas');

  const duplicateCount = React.useMemo(() => {
    const seen = new Set<string>();
    let count = 0;
    jadwalPelajaranList.forEach(j => {
      const key = `${(j.hari || 'Senin').toLowerCase()}|${(j.namaKelas || j.idKelas || '').trim().toLowerCase()}|${(j.jamMulai || '07:15').trim()}`;
      if (seen.has(key)) {
        count++;
      } else {
        seen.add(key);
      }
    });
    return count;
  }, [jadwalPelajaranList]);

  const [isPrintingDoc, setIsPrintingDoc] = useState(false);
  const handlePrintDokumen = async () => {
    setIsPrintingDoc(true);
    try {
      const docEl = document.getElementById('printable-jadwal-doc');
      if (docEl) {
        await printDocumentArea(docEl, {
          title: `Jadwal Pelajaran Resmi ${schoolInfo.namaSekolah || schoolInfo.nama}`,
          paperSize,
          orientation: paperOrientation,
          margin: paperMargin,
        });
      } else {
        window.print();
      }
    } finally {
      setIsPrintingDoc(false);
    }
  };

  const handleTriggerDeduplicate = () => {
    let removedCount = 0;
    if (onDeduplicateJadwalPelajaran) {
      removedCount = onDeduplicateJadwalPelajaran();
    }
    if (removedCount > 0) {
      setNotification(`Sukses! Berhasil membersihkan ${removedCount} jadwal ganda. Data jadwal kini rapi & tidak ada duplikat.`);
    } else {
      setNotification('Jadwal pelajaran sudah rapi, tidak ditemukan data jadwal ganda.');
    }
    setTimeout(() => setNotification(null), 4500);
  };

  const handleConfirmClearAll = () => {
    if (onClearAllJadwalPelajaran) {
      onClearAllJadwalPelajaran();
    }
    setShowClearAllModal(false);
    setNotification('Seluruh jadwal pelajaran berhasil dihapus dari sistem.');
    setTimeout(() => setNotification(null), 3500);
  };

  const handleApplyPendingImport = () => {
    if (pendingImportList.length === 0) return;
    if (onImportJadwal) {
      onImportJadwal(pendingImportList, selectedImportMode);
    } else {
      pendingImportList.forEach(j => onSaveJadwalPelajaran(j));
    }
    const modeLabel = selectedImportMode === 'replace' ? 'mengganti seluruh' : selectedImportMode === 'append' ? 'menambahkan' : 'memperbarui/menimpa tanpa ganda';
    setNotification(`Sukses! Berhasil ${modeLabel} ${pendingImportList.length} sesi jadwal pelajaran dari Excel!`);
    setShowImportOptionsModal(false);
    setPendingImportList([]);
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtered lists
  const filteredPelajaran = jadwalPelajaranList.filter(j => {
    const matchHari = filterHari === 'Semua' || j.hari === filterHari;
    const matchKelas = filterKelasPelajaran === 'Semua' || j.idKelas === filterKelasPelajaran;
    return matchHari && matchKelas;
  });

  const filteredUjian = jadwalUjianList.filter(u => {
    const matchKelas = filterKelasUjian === 'Semua' || u.idKelas === filterKelasUjian;
    const matchJenis = filterJenisUjian === 'Semua' || u.jenisUjian === filterJenisUjian;
    return matchKelas && matchJenis;
  });

  // Pelajaran Handlers
  const handleOpenAddPelajaran = () => {
    setEditingPelajaran(null);
    setFormPelajaranHari('Senin');
    setFormPelajaranJamMulai('07:15');
    setFormPelajaranJamSelesai('08:45');
    setFormPelajaranJumlahJam(2);
    setFormPelajaranIdKelas(kelasList[0]?.id || '');
    setFormPelajaranIdMapel(mapelList[0]?.id || '');
    setFormPelajaranIdGuru(teachersList[0]?.id || '');
    setFormPelajaranRuang('Lab Farmasi 1');
    setShowPelajaranModal(true);
  };

  const handleOpenEditPelajaran = (j: JadwalPelajaran) => {
    setEditingPelajaran(j);
    setFormPelajaranHari(j.hari);
    setFormPelajaranJamMulai(normalizeExcelTime(j.jamMulai, '07:15'));
    setFormPelajaranJamSelesai(normalizeExcelTime(j.jamSelesai, '08:45'));
    setFormPelajaranJumlahJam(j.jumlahJam || 2);
    setFormPelajaranIdKelas(j.idKelas);
    setFormPelajaranIdMapel(j.idMapel);
    setFormPelajaranIdGuru(j.idGuru);
    setFormPelajaranRuang(j.ruang);
    setShowPelajaranModal(true);
  };

  const handleSavePelajaran = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedKelas = kelasList.find(k => k.id === formPelajaranIdKelas);
    const matchedMapel = mapelList.find(m => m.id === formPelajaranIdMapel);
    const matchedGuru = teachersList.find(g => g.id === formPelajaranIdGuru);

    const cleanJamMulai = normalizeExcelTime(formPelajaranJamMulai, '07:15');
    const cleanJamSelesai = normalizeExcelTime(formPelajaranJamSelesai, '08:45');

    const jadwalItem: JadwalPelajaran = {
      id: editingPelajaran ? editingPelajaran.id : `jp-${Date.now()}`,
      hari: formPelajaranHari,
      jamMulai: cleanJamMulai,
      jamSelesai: cleanJamSelesai,
      jumlahJam: Number(formPelajaranJumlahJam) || 2,
      jamKe: `${formPelajaranJumlahJam || 2} JP`,
      idKelas: formPelajaranIdKelas,
      namaKelas: matchedKelas?.namaKelas || 'Kelas',
      idMapel: formPelajaranIdMapel,
      namaMapel: matchedMapel?.namaMapel || 'Mapel',
      idGuru: formPelajaranIdGuru,
      namaGuru: matchedGuru?.nama || 'Guru',
      ruang: formPelajaranRuang,
      tahunAjaran: schoolInfo.tahunAjaranPembelajaran,
      semester: schoolInfo.semesterPembelajaran,
    };

    onSaveJadwalPelajaran(jadwalItem);
    setShowPelajaranModal(false);
    setNotification('Jadwal pelajaran berhasil disimpan!');
    setTimeout(() => setNotification(null), 3000);
  };

  // Import Jadwal Excel (.xlsx / .xls / .csv)
  const handleImportExcelJadwal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rawRows = await readSpreadsheetFile(file);
      if (rawRows.length <= 1) throw new Error('Berkas Excel kosong atau tidak ada data baris.');

      const headerRow = rawRows[0].map((h: any) => String(h || '').trim().toLowerCase());
      const colHari = headerRow.findIndex((h: string) => h.includes('hari'));
      const colKelas = headerRow.findIndex((h: string) => h.includes('kelas') || h.includes('rombel'));
      const colJamMulai = headerRow.findIndex((h: string) => h.includes('mulai') || h.includes('awal'));
      const colJamSelesai = headerRow.findIndex((h: string) => h.includes('selesai') || h.includes('akhir'));
      const colJamKBM = headerRow.findIndex((h: string) => 
        h.includes('jam kbm') || h.includes('waktu kbm') || h.includes('jam pelajaran') || 
        h.includes('waktu pelajaran') || h.includes('jam / waktu') || 
        (h.includes('jam') && !h.includes('jp') && !h.includes('jumlah') && !h.includes('ke'))
      );
      const colJP = headerRow.findIndex((h: string) => h.includes('jp') || h.includes('jumlah jam') || h.includes('durasi') || h.includes('jam ke'));
      const colMapel = headerRow.findIndex((h: string) => h.includes('mapel') || h.includes('mata pelajaran') || h.includes('pelajaran'));
      const colGuru = headerRow.findIndex((h: string) => h.includes('guru') || h.includes('pengampu') || h.includes('pendidik'));
      const colRuang = headerRow.findIndex((h: string) => h.includes('ruang') || h.includes('lab') || h.includes('tempat'));

      const imported: JadwalPelajaran[] = [];
      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;

        const rawHari = String(row[colHari !== -1 ? colHari : 0] || 'Senin').trim();
        const validHari: ('Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu') =
          ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].includes(rawHari as any)
            ? (rawHari as any)
            : 'Senin';

        const namaKelas = String(row[colKelas !== -1 ? colKelas : 1] || 'X Farmasi 1').trim();
        const { jamMulai, jamSelesai, jp } = extractJadwalTimes(row, colJamMulai, colJamSelesai, colJamKBM, colJP, 2, 3);
        
        const namaMapel = String(
          (colMapel !== -1 ? row[colMapel] : null) || 
          (row.length > 5 ? row[5] : null) || 
          row[4] || 
          'Mata Pelajaran'
        ).trim();

        const namaGuru = String(
          (colGuru !== -1 ? row[colGuru] : null) || 
          (row.length > 6 ? row[6] : null) || 
          row[5] || 
          'Guru Pengampu'
        ).trim();

        const ruang = String(
          (colRuang !== -1 ? row[colRuang] : null) || 
          (row.length > 7 ? row[7] : null) || 
          row[6] || 
          'Lab Praktik'
        ).trim();

        const matchedKelas = kelasList.find(k => k.namaKelas.toLowerCase() === namaKelas.toLowerCase()) || kelasList[0];
        const matchedMapel = mapelList.find(m => m.namaMapel.toLowerCase() === namaMapel.toLowerCase());
        const matchedGuru = usersList.find(u => u.nama.toLowerCase().includes(namaGuru.toLowerCase()));

        const cleanClassStr = (s: string) => (s || '')
          .toLowerCase()
          .replace(/^kelas\s+/i, '')
          .replace(/\b10\b/g, 'x')
          .replace(/\b11\b/g, 'xi')
          .replace(/\b12\b/g, 'xii')
          .replace(/[^a-z0-9]/g, '');

        const targetClassKey = cleanClassStr(namaKelas);
        const normJamMulai = normalizeExcelTime(jamMulai, '07:15');

        // Check if there is already an existing schedule in the same class, day, and time slot
        const existing = jadwalPelajaranList.find(j => 
          j.hari === validHari &&
          (j.idKelas === matchedKelas?.id || cleanClassStr(j.namaKelas) === targetClassKey) &&
          (normalizeExcelTime(j.jamMulai, '07:15') === normJamMulai || (matchedMapel && j.idMapel === matchedMapel.id))
        );

        imported.push({
          id: existing ? existing.id : `jp-imp-${Date.now()}-${i}`,
          hari: validHari,
          jamMulai,
          jamSelesai,
          jumlahJam: jp,
          jamKe: `${jp} JP`,
          idKelas: matchedKelas?.id || `k-${Date.now()}`,
          namaKelas: matchedKelas?.namaKelas || namaKelas,
          idMapel: matchedMapel?.id || `m-${Date.now()}`,
          namaMapel: matchedMapel?.namaMapel || namaMapel,
          idGuru: matchedGuru?.id || `g-${Date.now()}`,
          namaGuru: matchedGuru?.nama || namaGuru,
          ruang,
          tahunAjaran: schoolInfo.tahunAjaranPembelajaran,
          semester: schoolInfo.semesterPembelajaran,
        });
      }

      if (imported.length === 0) {
        alert('Tidak ada baris jadwal yang valid dalam berkas Excel ini.');
        return;
      }

      setPendingImportList(imported);
      setImportFileName(file.name);
      setSelectedImportMode('replace');
      setShowImportOptionsModal(true);
    } catch (err: any) {
      alert(`Gagal membaca berkas Excel jadwal: ${err.message}`);
    }
  };

  // Ujian Handlers
  const handleOpenAddUjian = () => {
    setEditingUjian(null);
    setFormUjianNama('UAS Semester Genap CBT');
    setFormUjianJenis('UAS CAT');
    setFormUjianTanggal('2026-06-15');
    setFormUjianJamMulai('08:00');
    setFormUjianJamSelesai('09:30');
    setFormUjianSesi('Sesi 1');
    setFormUjianIdKelas(kelasList[0]?.id || '');
    setFormUjianIdMapel(mapelList[0]?.id || '');
    setFormUjianRuang('Lab CBT Komputer 1');
    setFormUjianPengawas(teachersList[0]?.nama || 'Pengawas Ruang');
    setFormUjianProktor('Tim IT BAPUMA');
    setFormUjianToken(`BAKTI${Math.floor(10 + Math.random() * 90)}X`);
    setShowUjianModal(true);
  };

  const handleOpenEditUjian = (u: JadwalUjianItem) => {
    setEditingUjian(u);
    setFormUjianNama(u.namaUjian);
    setFormUjianJenis(u.jenisUjian);
    setFormUjianTanggal(u.tanggal);
    setFormUjianJamMulai(u.jamMulai);
    setFormUjianJamSelesai(u.jamSelesai);
    setFormUjianSesi(u.sesi);
    setFormUjianIdKelas(u.idKelas);
    setFormUjianIdMapel(u.idMapel);
    setFormUjianRuang(u.ruang);
    setFormUjianPengawas(u.pengawas);
    setFormUjianProktor(u.proktor || 'Tim IT');
    setFormUjianToken(u.token || 'BPM26X');
    setShowUjianModal(true);
  };

  const handleSaveUjian = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedKelas = kelasList.find(k => k.id === formUjianIdKelas);
    const matchedMapel = mapelList.find(m => m.id === formUjianIdMapel);

    const ujianItem: JadwalUjianItem = {
      id: editingUjian ? editingUjian.id : `ju-${Date.now()}`,
      namaUjian: formUjianNama,
      jenisUjian: formUjianJenis,
      tanggal: formUjianTanggal,
      jamMulai: formUjianJamMulai,
      jamSelesai: formUjianJamSelesai,
      sesi: formUjianSesi,
      idKelas: formUjianIdKelas,
      namaKelas: matchedKelas?.namaKelas || 'Kelas',
      idMapel: formUjianIdMapel,
      namaMapel: matchedMapel?.namaMapel || 'Mapel',
      ruang: formUjianRuang,
      pengawas: formUjianPengawas,
      proktor: formUjianProktor,
      token: formUjianToken,
    };

    onSaveJadwalUjian(ujianItem);
    setShowUjianModal(false);
    setNotification('Jadwal ujian berhasil disimpan!');
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900 text-xs font-semibold shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* TOP SUB-TAB NAV */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 flex flex-wrap gap-2 shadow-sm justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('pelajaran')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSubTab === 'pelajaran'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Jadwal Pelajaran Mingguan ({jadwalPelajaranList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('ujian')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSubTab === 'ujian'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Jadwal Ujian CAT & UKK LSP ({jadwalUjianList.length})</span>
          </button>
        </div>

        <button
          onClick={() => {
            setPrintType(activeSubTab);
            setShowPrintModal(true);
          }}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Printer className="w-4 h-4 text-amber-700" />
          <span>Cetak Dokumen Resmi (KOP)</span>
        </button>
      </div>

      {/* 1. JADWAL PELAJARAN TAB */}
      {activeSubTab === 'pelajaran' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Filter Hari:</span>
              <div className="flex items-center gap-1">
                {['Semua', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((h) => (
                  <button
                    key={h}
                    onClick={() => setFilterHari(h)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                      filterHari === h ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>

              <select
                value={filterKelasPelajaran}
                onChange={(e) => setFilterKelasPelajaran(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold bg-white ml-2"
              >
                <option value="Semua">Semua Kelas</option>
                {kelasList.map(k => (
                  <option key={k.id} value={k.id}>{k.namaKelas} ({k.jurusan}){k.status === 'nonaktif' ? ' [Nonaktif]' : ''}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Unduh Template Excel (.xlsx) */}
              <button
                type="button"
                onClick={() => downloadTemplateJadwalExcel(kelasList, mapelList, teachersList)}
                className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Unduh format template jadwal pelajaran Microsoft Excel (.xlsx) bukan CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                <span>Unduh Template Excel (.xlsx)</span>
              </button>

              {/* Ekspor Excel */}
              <button
                type="button"
                onClick={() => exportJadwalToExcel(jadwalPelajaranList, schoolInfo.nama)}
                className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Ekspor seluruh jadwal pelajaran ke berkas Excel (.xlsx)"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Ekspor Excel (.xlsx)</span>
              </button>

              {/* Impor Excel */}
              <label className="px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm">
                <Upload className="w-4 h-4" />
                <span>Impor Jadwal (.xlsx)</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleImportExcelJadwal}
                />
              </label>

              {/* Tombol Perbarui Jadwal & Bersihkan Duplikat */}
              <button
                type="button"
                onClick={handleTriggerDeduplicate}
                className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Pindai dan hilangkan slot jadwal yang ganda/duplikat secara otomatis"
              >
                <RefreshCw className="w-4 h-4 text-amber-600" />
                <span>Perbarui Jadwal (Anti Ganda)</span>
              </button>

              {/* Tombol Hapus Semua Jadwal Pelajaran */}
              <button
                type="button"
                onClick={() => setShowClearAllModal(true)}
                disabled={jadwalPelajaranList.length === 0}
                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Hapus seluruh jadwal pelajaran untuk mereset data jadwal"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Hapus Semua Jadwal</span>
              </button>

              {/* Tambah Jadwal Manual */}
              <button
                onClick={handleOpenAddPelajaran}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jadwal</span>
              </button>

              {/* Shortcut Absen Guru */}
              {onOpenAbsenGuru && (
                <button
                  type="button"
                  onClick={onOpenAbsenGuru}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  title="Buka modul absensi guru sesuai jadwal dan jumlah jam"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Absen Guru Hari Ini</span>
                </button>
              )}
            </div>
          </div>

          {/* PERINGATAN & SOLUSI JADWAL GANDA OTOMATIS */}
          {duplicateCount > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-950 flex items-center gap-2">
                    <span>Terdeteksi {duplicateCount} Sesi Jadwal Pelajaran Ganda / Duplikat</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-extrabold">
                      Perlu Dirapikan
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Terdapat sesi jadwal dengan hari, kelas, dan jam pelajaran yang bertumpuk. Klik tombol <strong>"Update Jadwal (Cegah Ganda)"</strong> untuk menyatukan &amp; menghilangkan jadwal ganda secara instan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTriggerDeduplicate}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shrink-0 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 animate-spin-hover" />
                <span>Update &amp; Bersihkan {duplicateCount} Jadwal Ganda</span>
              </button>
            </div>
          )}

          {/* TABLE JADWAL PELAJARAN */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-3.5 px-4">Hari & Jam KBM</th>
                    <th className="py-3.5 px-4 text-center">Durasi (JP)</th>
                    <th className="py-3.5 px-4">Kelas & Rombel</th>
                    <th className="py-3.5 px-4">Mata Pelajaran</th>
                    <th className="py-3.5 px-4">Guru Pengampu</th>
                    <th className="py-3.5 px-4">Ruangan / Lab Praktik</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPelajaran.map((j) => (
                    <tr key={j.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold text-[11px]">
                          {j.hari}
                        </span>
                        <div className="font-mono text-slate-600 text-[11px] mt-1">
                          {formatDisplayJamKBM(j.jamMulai, j.jamSelesai)}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 font-extrabold text-xs">
                          {j.jumlahJam || 2} JP
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-800">
                        {j.namaKelas}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{j.namaMapel}</div>
                        <span className="text-[10px] text-slate-400">T.A. {j.tahunAjaran} ({j.semester})</span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-emerald-800">
                        {j.namaGuru}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-medium">
                          {j.ruang}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditPelajaran(j)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-amber-600 transition-colors cursor-pointer"
                            title="Edit Jadwal"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Hapus jadwal pelajaran ini?')) {
                                onDeleteJadwalPelajaran(j.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Jadwal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPelajaran.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        Belum ada jadwal pelajaran untuk kriteria filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. JADWAL UJIAN TAB */}
      {activeSubTab === 'ujian' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterJenisUjian}
                onChange={(e) => setFilterJenisUjian(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold bg-white"
              >
                <option value="Semua">Semua Jenis Ujian</option>
                <option value="Ujian Tulis ASTS">Ujian Tulis ASTS</option>
                <option value="Ujian Tulis ASAS">Ujian Tulis ASAS</option>
                <option value="Ujian Tulis ASAT">Ujian Tulis ASAT</option>
                <option value="UAS CAT">UAS CAT</option>
                <option value="UTS CAT">UTS CAT</option>
                <option value="Tryout UKK">Tryout UKK</option>
                <option value="UKK LSP Kejuruan">UKK LSP Kejuruan</option>
              </select>

              <select
                value={filterKelasUjian}
                onChange={(e) => setFilterKelasUjian(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold bg-white"
              >
                <option value="Semua">Semua Kelas Peserta</option>
                {kelasList.map(k => (
                  <option key={k.id} value={k.id}>{k.namaKelas}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleOpenAddUjian}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jadwal Ujian</span>
            </button>
          </div>

          {/* TABLE JADWAL UJIAN */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-3.5 px-4">Nama Ujian & Jenis</th>
                    <th className="py-3.5 px-4">Tanggal & Waktu</th>
                    <th className="py-3.5 px-4">Kelas & Mapel</th>
                    <th className="py-3.5 px-4">Ruang CBT & Sesi</th>
                    <th className="py-3.5 px-4">Pengawas & Proktor</th>
                    <th className="py-3.5 px-4">Token CAT</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUjian.map((u) => (
                    <tr key={u.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{u.namaUjian}</div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 inline-block ${
                          u.jenisUjian === 'Ujian Tulis ASTS' ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' :
                          u.jenisUjian === 'Ujian Tulis ASAS' ? 'bg-sky-100 text-sky-900 border border-sky-200' :
                          u.jenisUjian === 'Ujian Tulis ASAT' ? 'bg-teal-100 text-teal-900 border border-teal-200' :
                          u.jenisUjian === 'UAS CAT' ? 'bg-blue-100 text-blue-800' :
                          u.jenisUjian === 'UTS CAT' ? 'bg-amber-100 text-amber-800' :
                          u.jenisUjian === 'UKK LSP Kejuruan' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {u.jenisUjian}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{u.tanggal}</div>
                        <div className="font-mono text-slate-500 text-[11px]">
                          {u.jamMulai} - {u.jamSelesai} WIB
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-purple-900">{u.namaKelas}</div>
                        <div className="text-slate-600 text-[11px]">{u.namaMapel}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{u.ruang}</div>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700">
                          {u.sesi}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-semibold">{u.pengawas}</div>
                        <div className="text-slate-400 text-[10px]">Proktor: {u.proktor || 'Tim IT'}</div>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <span className="px-2.5 py-1 rounded bg-amber-50 border border-amber-300 text-amber-900 font-black tracking-wider text-xs">
                          {u.token || 'BPM26X'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditUjian(u)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-amber-600 transition-colors"
                            title="Edit Jadwal Ujian"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Hapus jadwal ujian ini?')) {
                                onDeleteJadwalUjian(u.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Hapus Jadwal Ujian"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUjian.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        Belum ada jadwal ujian yang dijadwalkan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT JADWAL PELAJARAN */}
      {showPelajaranModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>{editingPelajaran ? 'Edit Jadwal Pelajaran' : 'Tambah Jadwal Pelajaran Baru'}</span>
              </h4>
              <button
                onClick={() => setShowPelajaranModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePelajaran} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hari *
                  </label>
                  <select
                    value={formPelajaranHari}
                    onChange={(e) => setFormPelajaranHari(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    <option value="Senin">Senin</option>
                    <option value="Selasa">Selasa</option>
                    <option value="Rabu">Rabu</option>
                    <option value="Kamis">Kamis</option>
                    <option value="Jumat">Jumat</option>
                    <option value="Sabtu">Sabtu</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jam Mulai *
                  </label>
                  <input
                    type="time"
                    required
                    value={formPelajaranJamMulai}
                    onChange={(e) => setFormPelajaranJamMulai(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jam Selesai *
                  </label>
                  <input
                    type="time"
                    required
                    value={formPelajaranJamSelesai}
                    onChange={(e) => setFormPelajaranJamSelesai(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Durasi (JP) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={formPelajaranJumlahJam}
                    onChange={(e) => setFormPelajaranJumlahJam(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-purple-900"
                    placeholder="2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kelas / Rombel *
                  </label>
                  <select
                    value={formPelajaranIdKelas}
                    onChange={(e) => setFormPelajaranIdKelas(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    {kelasList.map(k => (
                      <option key={k.id} value={k.id}>{k.namaKelas} ({k.jurusan}){k.status === 'nonaktif' ? ' [Nonaktif]' : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ruang / Lab Praktik *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPelajaranRuang}
                    onChange={(e) => setFormPelajaranRuang(e.target.value)}
                    placeholder="Lab Farmasi / Lab Mini Hospital"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mata Pelajaran *
                </label>
                <select
                  value={formPelajaranIdMapel}
                  onChange={(e) => setFormPelajaranIdMapel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                >
                  {mapelList.map(m => (
                    <option key={m.id} value={m.id}>{m.namaMapel} ({m.kelompok})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Guru Pengampu *
                </label>
                <select
                  value={formPelajaranIdGuru}
                  onChange={(e) => setFormPelajaranIdGuru(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-emerald-900"
                >
                  <option value="">-- Pilih Tenaga Pendidik --</option>
                  {teachersList.map(g => (
                    <option key={g.id} value={g.id}>{g.nama} ({g.nipOrNis})</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPelajaranModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Jadwal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT JADWAL UJIAN */}
      {showUjianModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>{editingUjian ? 'Edit Jadwal Ujian' : 'Tambah Jadwal Ujian Baru'}</span>
              </h4>
              <button
                onClick={() => setShowUjianModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUjian} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Agenda Ujian *
                </label>
                <input
                  type="text"
                  required
                  value={formUjianNama}
                  onChange={(e) => setFormUjianNama(e.target.value)}
                  placeholder="Contoh: UAS Semester Genap CBT"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jenis Evaluasi Ujian *
                  </label>
                  <select
                    value={formUjianJenis}
                    onChange={(e) => setFormUjianJenis(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    <option value="Ujian Tulis ASTS">Ujian Tulis ASTS (Asesmen Sumatif Tengah Semester)</option>
                    <option value="Ujian Tulis ASAS">Ujian Tulis ASAS (Asesmen Sumatif Akhir Semester)</option>
                    <option value="Ujian Tulis ASAT">Ujian Tulis ASAT (Asesmen Sumatif Akhir Tahun)</option>
                    <option value="UAS CAT">UAS CAT (Akhir Semester Online)</option>
                    <option value="UTS CAT">UTS CAT (Tengah Semester Online)</option>
                    <option value="Tryout UKK">Tryout UKK</option>
                    <option value="UKK LSP Kejuruan">UKK LSP Kejuruan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Pelaksanaan *
                  </label>
                  <input
                    type="date"
                    required
                    value={formUjianTanggal}
                    onChange={(e) => setFormUjianTanggal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jam Mulai *
                  </label>
                  <input
                    type="time"
                    required
                    value={formUjianJamMulai}
                    onChange={(e) => setFormUjianJamMulai(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jam Selesai *
                  </label>
                  <input
                    type="time"
                    required
                    value={formUjianJamSelesai}
                    onChange={(e) => setFormUjianJamSelesai(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Sesi Ujian *
                  </label>
                  <select
                    value={formUjianSesi}
                    onChange={(e) => setFormUjianSesi(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    <option value="Sesi 1">Sesi 1 (Pagi)</option>
                    <option value="Sesi 2">Sesi 2 (Siang)</option>
                    <option value="Sesi 3">Sesi 3 (Sore)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kelas / Rombel Peserta *
                  </label>
                  <select
                    value={formUjianIdKelas}
                    onChange={(e) => setFormUjianIdKelas(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    {kelasList.map(k => (
                      <option key={k.id} value={k.id}>{k.namaKelas}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mata Pelajaran Diujikan *
                  </label>
                  <select
                    value={formUjianIdMapel}
                    onChange={(e) => setFormUjianIdMapel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    {mapelList.map(m => (
                      <option key={m.id} value={m.id}>{m.namaMapel}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ruang CBT / Lab Komputer *
                  </label>
                  <input
                    type="text"
                    required
                    value={formUjianRuang}
                    onChange={(e) => setFormUjianRuang(e.target.value)}
                    placeholder="Lab CBT Komputer 1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Token Rilis Soal *
                  </label>
                  <input
                    type="text"
                    required
                    value={formUjianToken}
                    onChange={(e) => setFormUjianToken(e.target.value)}
                    placeholder="BPM26X"
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-amber-50/50 font-mono font-bold text-amber-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Pengawas Ruangan
                  </label>
                  <input
                    type="text"
                    value={formUjianPengawas}
                    onChange={(e) => setFormUjianPengawas(e.target.value)}
                    placeholder="Nama Pengawas"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Proktor Ruang / Teknisi
                  </label>
                  <input
                    type="text"
                    value={formUjianProktor}
                    onChange={(e) => setFormUjianProktor(e.target.value)}
                    placeholder="Tim IT BAPUMA"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUjianModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Jadwal Ujian</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: KONFIRMASI HAPUS SEMUA JADWAL */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-bold text-slate-900">Hapus Seluruh Jadwal Pelajaran?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Anda akan menghapus seluruh <strong>{jadwalPelajaranList.length} sesi jadwal pelajaran</strong> dari sistem dan database cloud Firestore. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Semua</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PILIHAN MODE IMPOR EXCEL (ANTI GANDA) */}
      {showImportOptionsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-purple-200 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Konfirmasi Impor Jadwal Excel</h4>
                  <p className="text-[11px] text-slate-500">
                    Berkas <strong>{importFileName}</strong> memuat <strong>{pendingImportList.length} sesi jadwal</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportOptionsModal(false);
                  setPendingImportList([]);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-700 block">
                Pilih Metode Penerapan Jadwal:
              </label>

              {/* Pilihan 1: Ganti Seluruh Jadwal (Replace All) - Rekomendasi Bebas Duplikat */}
              <div
                onClick={() => setSelectedImportMode('replace')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  selectedImportMode === 'replace'
                    ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  checked={selectedImportMode === 'replace'}
                  onChange={() => setSelectedImportMode('replace')}
                  className="mt-0.5 text-purple-600"
                />
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Ganti Seluruh Jadwal (Replace All)</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      ★ Rekomendasi Bebas Duplikat
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Mengosongkan jadwal lama dan <strong>hanya memakai seluruh jadwal baru</strong> dari file Excel ini. Menjamin 100% tidak ada jadwal ganda.
                  </p>
                </div>
              </div>

              {/* Pilihan 2: Perbarui Slot yang Ada */}
              <div
                onClick={() => setSelectedImportMode('update')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  selectedImportMode === 'update'
                    ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  checked={selectedImportMode === 'update'}
                  onChange={() => setSelectedImportMode('update')}
                  className="mt-0.5 text-purple-600"
                />
                <div className="flex-1 space-y-0.5">
                  <span className="text-xs font-bold text-slate-900 block">Perbarui &amp; Timpa Slot yang Sama</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Mencocokkan slot hari, kelas, dan jam KBM. Jika jadwal di jam tersebut sudah ada, sistem akan <strong>memperbarui datanya tanpa menduplikat</strong>.
                  </p>
                </div>
              </div>

              {/* Pilihan 3: Tambahkan Saja (Append) */}
              <div
                onClick={() => setSelectedImportMode('append')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  selectedImportMode === 'append'
                    ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  checked={selectedImportMode === 'append'}
                  onChange={() => setSelectedImportMode('append')}
                  className="mt-0.5 text-purple-600"
                />
                <div className="flex-1 space-y-0.5">
                  <span className="text-xs font-bold text-slate-900 block">Tambahkan Saja (Append)</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Menambahkan semua sesi dari file Excel tanpa menghapus atau menimpa sesi yang ada.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowImportOptionsModal(false);
                  setPendingImportList([]);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyPendingImport}
                className="flex-1 py-2.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Terapkan Impor Jadwal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CETAK DOKUMEN RESMI DENGAN PENGATURAN KERTAS & ORIENTASI */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          {/* Dynamic Print CSS for chosen paper size, orientation, and margin */}
          <style>{`
            @media print {
              @page {
                size: ${paperSize === 'F4' ? '215mm 330mm' : paperSize.toLowerCase()} ${paperOrientation};
                margin: ${paperMargin === 'minimal' ? '5mm' : paperMargin === 'sempit' ? '10mm' : '15mm'};
              }
              body {
                background: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              #printable-jadwal-doc {
                width: 100% !important;
                max-width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
              }
              .no-print-area {
                display: none !important;
              }
            }
          `}</style>

          <div className="bg-white rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[94vh] overflow-y-auto animate-scaleUp border border-slate-200">
            {/* Header Toolbar: Pengaturan Kertas, Orientasi & Margin (Hanya di layar, sembunyikan saat cetak) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4 print:hidden no-print-area">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Printer className="w-4 h-4 text-amber-600" />
                  <span>Pengaturan Cetak Dokumen Kedinasan Resmi</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Hanya area lembar dokumen di bawah yang akan dicetak ke printer / PDF
                </p>
              </div>

              {/* Controls: Kertas, Orientasi, Margin, Tombol Cetak */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Ukuran Kertas */}
                <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-500 pl-1.5 text-[11px]">Kertas:</span>
                  <select
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as any)}
                    className="bg-white px-2 py-1 rounded-lg font-bold text-slate-800 border border-slate-200 text-xs cursor-pointer"
                  >
                    <option value="A4">A4 (210 × 297 mm)</option>
                    <option value="F4">F4 / Folio (215 × 330 mm)</option>
                    <option value="Legal">Legal (216 × 356 mm)</option>
                    <option value="Letter">Letter (216 × 279 mm)</option>
                  </select>
                </div>

                {/* 2. Orientasi */}
                <div className="inline-flex rounded-xl bg-slate-50 p-1 border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaperOrientation('landscape')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      paperOrientation === 'landscape'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Mendatar (Landscape) - Sangat cocok untuk tabel jadwal yang memiliki banyak kolom"
                  >
                    Landscape
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperOrientation('portrait')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      paperOrientation === 'portrait'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Tegak (Portrait)"
                  >
                    Portrait
                  </button>
                </div>

                {/* 3. Margin Kertas */}
                <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-500 pl-1.5 text-[11px]">Margin:</span>
                  <select
                    value={paperMargin}
                    onChange={(e) => setPaperMargin(e.target.value as any)}
                    className="bg-white px-2 py-1 rounded-lg font-bold text-slate-800 border border-slate-200 text-xs cursor-pointer"
                  >
                    <option value="sempit">Sempit (10 mm)</option>
                    <option value="normal">Normal (15 mm)</option>
                    <option value="minimal">Minimal (5 mm)</option>
                  </select>
                </div>

                {/* Tombol Cetak Sekarang: Mengisolasi dokumen, tidak mencetak halaman web */}
                <button
                  type="button"
                  onClick={handlePrintDokumen}
                  disabled={isPrintingDoc}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ml-1 disabled:opacity-60"
                  title="Cetak lembar dokumen jadwal saja ke printer/PDF (tanpa elemen halaman web/aplikasi)"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isPrintingDoc ? 'Menyiapkan Lembar...' : 'Cetak Dokumen Saja'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
                  title="Tutup Pratinjau"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* DOKUMEN CETAK TUNGGAL: HANYA AREA INI YANG TAMPIL DI PRINTER/PDF */}
            <div id="printable-jadwal-doc" className="printable-document p-6 sm:p-8 border border-slate-200 rounded-2xl bg-white text-slate-950 space-y-4">
              {/* KOP RESMI SEKOLAH */}
              <div className="flex items-center justify-between gap-4 pb-3 border-b-2 border-slate-900">
                <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                  <img
                    src={schoolInfo.logoUrl || '/logo_bpm.png'}
                    alt="Logo Sekolah"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo_bpm.png';
                    }}
                  />
                </div>
                <div className="text-center flex-1">
                  <p className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                    {schoolInfo.kopSekolah?.yayasan || 'YAYASAN PENDIDIKAN BAKTI PUTRA MANDIRI'}
                  </p>
                  <h3 className="text-lg font-black uppercase text-slate-950 tracking-wide">
                    {schoolInfo.kopSekolah?.instansi || schoolInfo.nama}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-700">
                    {schoolInfo.kopSekolah?.subJudul || 'Kompetensi Keahlian: Farmasi • Asisten Keperawatan • Tata Kecantikan • Perhotelan'}
                  </p>
                  <p className="text-[9.5px] text-slate-500">
                    {schoolInfo.kopSekolah?.teleponEmail || `${schoolInfo.alamatLengkap || schoolInfo.alamat} • Telp: ${schoolInfo.telepon}`}
                  </p>
                </div>
                {/* Spacer or Right Logo if enabled */}
                <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                  {schoolInfo.kopSekolah?.tampilkanLogoKanan && schoolInfo.kopSekolah?.logoKananUrl ? (
                    <img
                      src={schoolInfo.kopSekolah.logoKananUrl}
                      alt="Logo Kanan"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full invisible" aria-hidden="true" />
                  )}
                </div>
              </div>

              {/* JUDUL DOKUMEN */}
              <div className="text-center py-1.5">
                <h4 className="font-extrabold text-sm uppercase underline tracking-wide">
                  {printType === 'pelajaran'
                    ? `JADWAL PELAJARAN SEMESTER ${schoolInfo.semesterPembelajaran.toUpperCase()}`
                    : 'JADWAL PELAKSANAAN UJIAN CAT & UKK KEJURUAN'}
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Tahun Pelajaran {schoolInfo.tahunAjaranPembelajaran}
                </p>
              </div>

              {/* TABEL DATA PRINT */}
              <table className="w-full text-[11px] border border-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-700 font-bold text-slate-900">
                    <th className="border border-slate-400 p-2 text-center w-10">No</th>
                    {printType === 'pelajaran' ? (
                      <>
                        <th className="border border-slate-400 p-2 text-left">Hari & Jam KBM</th>
                        <th className="border border-slate-400 p-2 text-center w-14">JP</th>
                        <th className="border border-slate-400 p-2 text-left">Kelas / Rombel</th>
                        <th className="border border-slate-400 p-2 text-left">Mata Pelajaran</th>
                        <th className="border border-slate-400 p-2 text-left">Guru Pengampu</th>
                        <th className="border border-slate-400 p-2 text-left">Ruang / Lab</th>
                      </>
                    ) : (
                      <>
                        <th className="border border-slate-400 p-2 text-left">Agenda Ujian</th>
                        <th className="border border-slate-400 p-2 text-left">Tanggal & Waktu</th>
                        <th className="border border-slate-400 p-2 text-left">Kelas & Mapel</th>
                        <th className="border border-slate-400 p-2 text-left">Ruangan</th>
                        <th className="border border-slate-400 p-2 text-left">Pengawas</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {printType === 'pelajaran' ? (
                    filteredPelajaran.map((j, idx) => (
                      <tr key={j.id} className="border-b border-slate-300">
                        <td className="border border-slate-300 p-2 text-center font-semibold">{idx + 1}</td>
                        <td className="border border-slate-300 p-2 font-medium">
                          <strong>{j.hari}</strong>, {formatDisplayJamKBM(j.jamMulai, j.jamSelesai)}
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold">{j.jumlahJam || 2} JP</td>
                        <td className="border border-slate-300 p-2 font-semibold">{j.namaKelas}</td>
                        <td className="border border-slate-300 p-2">{j.namaMapel}</td>
                        <td className="border border-slate-300 p-2">{j.namaGuru}</td>
                        <td className="border border-slate-300 p-2">{j.ruang}</td>
                      </tr>
                    ))
                  ) : (
                    filteredUjian.map((u, idx) => (
                      <tr key={u.id} className="border-b border-slate-300">
                        <td className="border border-slate-300 p-2 text-center font-semibold">{idx + 1}</td>
                        <td className="border border-slate-300 p-2 font-semibold">{u.namaUjian} ({u.jenisUjian})</td>
                        <td className="border border-slate-300 p-2">{u.tanggal} ({u.jamMulai} - {u.jamSelesai})</td>
                        <td className="border border-slate-300 p-2">{u.namaKelas} - {u.namaMapel}</td>
                        <td className="border border-slate-300 p-2">{u.ruang} ({u.sesi})</td>
                        <td className="border border-slate-300 p-2">{u.pengawas}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* TANDA TANGAN KEPALA SEKOLAH RESMI */}
              <div className="pt-6 flex justify-end">
                <div className="text-center text-xs space-y-12">
                  <div>
                    <p>{schoolInfo.kabupaten || 'Bogor'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="font-semibold">Kepala Sekolah,</p>
                  </div>
                  <div>
                    <p className="font-bold underline text-slate-900">{schoolInfo.kepalaSekolah || 'Dr. Nurul Husnul Lail, M.Kes.'}</p>
                    <p className="text-[10px] text-slate-600">NIP. {schoolInfo.nipKepalaSekolah || '197108151998021004'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
