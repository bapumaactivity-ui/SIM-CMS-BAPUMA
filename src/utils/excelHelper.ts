import * as XLSX from 'xlsx';
import { JadwalPelajaran, Kelas, Mapel, User, AbsenMengajarRecord } from '../types';

/**
 * Utility untuk menyimpan workbook XLSX sebagai unduhan berkas .xlsx di browser
 */
export function saveWorkbookAsExcel(wb: XLSX.WorkBook, filename: string): void {
  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Normalizes Excel time representations into "HH:mm" (24-hour format).
 * Handles:
 * - Excel fraction of day: e.g. 0.3020833333333333 -> "07:15"
 * - Excel time with dot: e.g. "07.15" or "7.15" -> "07:15"
 * - String numbers: e.g. "0.3645833" -> "08:45"
 * - Hours with seconds: e.g. "07:15:00" -> "07:15"
 * - Single digit hour: e.g. "7:15" -> "07:15"
 * - Plain hour numbers: e.g. 7 or "7" -> "07:00"
 */
export function normalizeExcelTime(val: any, fallback: string = '07:15'): string {
  if (val === null || val === undefined || val === '') return fallback;

  if (typeof val === 'number') {
    if (val > 0 && val < 1) {
      const totalMinutes = Math.round(val * 24 * 60);
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    } else if (val >= 1 && val <= 24) {
      const hours = Math.floor(val);
      const minutes = Math.round((val - hours) * 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  let str = String(val).trim();
  if (!str) return fallback;

  const num = Number(str);
  if (!isNaN(num) && num > 0 && num < 1) {
    const totalMinutes = Math.round(num * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  str = str.replace(/(?:wib|wita|wit|\bpagi\b|\bsiang\b|\bsore\b)/gi, '').trim();

  if (/^\d{1,2}\.\d{2}/.test(str)) {
    str = str.replace('.', ':');
  }

  const match = str.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hh = String(Number(match[1])).padStart(2, '0');
    const mm = String(match[2]);
    return `${hh}:${mm}`;
  }

  if (/^\d{1,2}$/.test(str)) {
    const hh = String(Number(str)).padStart(2, '0');
    return `${hh}:00`;
  }

  return str || fallback;
}

/**
 * Format string display Jam KBM: e.g. "07:15 - 08:45 WIB"
 */
export function formatDisplayJamKBM(jamMulai?: string, jamSelesai?: string): string {
  const start = normalizeExcelTime(jamMulai, '07:15');
  const end = normalizeExcelTime(jamSelesai, '08:45');
  return `${start} - ${end} WIB`;
}

/**
 * Parses time slot from row, supporting both separate columns (Jam Mulai, Jam Selesai)
 * and combined column (Jam KBM, e.g. "07:15 - 08:45" or "07.15-08.45").
 */
export function extractJadwalTimes(
  row: any[],
  colJamMulai: number,
  colJamSelesai: number,
  colJamKbm: number,
  colJP: number,
  defaultIndexStart: number = 2,
  defaultIndexEnd: number = 3
): { jamMulai: string; jamSelesai: string; jp: number } {
  let rawMulai = colJamMulai !== -1 ? row[colJamMulai] : undefined;
  let rawSelesai = colJamSelesai !== -1 ? row[colJamSelesai] : undefined;
  let rawKbm = colJamKbm !== -1 ? row[colJamKbm] : undefined;

  if (rawMulai === undefined && rawKbm !== undefined) {
    rawMulai = rawKbm;
  }
  if (rawMulai === undefined && defaultIndexStart !== -1) {
    rawMulai = row[defaultIndexStart];
  }
  if (rawSelesai === undefined && defaultIndexEnd !== -1) {
    rawSelesai = row[defaultIndexEnd];
  }

  let jamMulai = '07:15';
  let jamSelesai = '08:45';

  const rawMulaiStr = String(rawMulai || '').trim();
  const rangeDelimiters = /\s*(?:-|–|—|s\/d|s\.d|sampai|\sto\s)\s*/i;
  if (rawMulaiStr && rangeDelimiters.test(rawMulaiStr)) {
    const parts = rawMulaiStr.split(rangeDelimiters);
    if (parts.length >= 2) {
      jamMulai = normalizeExcelTime(parts[0], '07:15');
      jamSelesai = normalizeExcelTime(parts[1], '08:45');
    } else {
      jamMulai = normalizeExcelTime(rawMulai, '07:15');
      jamSelesai = normalizeExcelTime(rawSelesai, '08:45');
    }
  } else {
    jamMulai = normalizeExcelTime(rawMulai, '07:15');
    jamSelesai = normalizeExcelTime(rawSelesai, '08:45');
  }

  let jp = 2;
  if (colJP !== -1 && row[colJP] !== undefined && row[colJP] !== '') {
    const parsed = parseInt(String(row[colJP]), 10);
    if (!isNaN(parsed) && parsed > 0) {
      jp = parsed;
    }
  } else {
    try {
      const [sh, sm] = jamMulai.split(':').map(Number);
      const [eh, em] = jamSelesai.split(':').map(Number);
      const diffMins = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMins > 0) {
        jp = Math.max(1, Math.round(diffMins / 45));
      }
    } catch (_) {}
  }

  return { jamMulai, jamSelesai, jp };
}

/**
 * Membaca berkas Excel (.xlsx / .xls) atau CSV dari File object
 */
export async function readSpreadsheetFile(file: File): Promise<any[][]> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'xlsx' || extension === 'xls') {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    let targetSheetName = wb.SheetNames[0];
    for (const name of wb.SheetNames) {
      const lower = name.toLowerCase();
      if (lower.includes('jadwal') || lower.includes('template') || lower.includes('data')) {
        targetSheetName = name;
        break;
      }
    }
    const worksheet = wb.Sheets[targetSheetName];
    // Return as array of rows with raw: false to retain clean formatted strings
    const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '', raw: false });
    return jsonData;
  } else {
    // CSV / TSV fallback
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];

    let delim = ',';
    if (lines[0].includes(';') && lines[0].split(';').length >= 2) {
      delim = ';';
    } else if (lines[0].includes('\t') && lines[0].split('\t').length >= 2) {
      delim = '\t';
    }

    return lines.map(line => {
      // Basic CSV splitter handling quotes
      const row: string[] = [];
      let inQuotes = false;
      let cur = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delim && !inQuotes) {
          row.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      row.push(cur.trim());
      return row;
    });
  }
}

// ============================================================================
// TEMPLATE BUILDERS (.XLSX)
// ============================================================================

/**
 * Template Excel Resmi untuk Jadwal Pelajaran (.xlsx)
 * Disertai kolom Jumlah Jam (JP), Hari, Kelas, Mapel, Guru, Ruangan, dan sheet petunjuk referensi
 */
export function downloadTemplateJadwalExcel(
  kelasList: Kelas[] = [],
  mapelList: Mapel[] = [],
  guruList: User[] = []
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Template Data Jadwal
  const headers = [
    'Hari',
    'Nama Kelas',
    'Jam Mulai',
    'Jam Selesai',
    'Jumlah Jam (JP)',
    'Mata Pelajaran',
    'Guru Pengampu',
    'Ruangan',
  ];

  // Buat contoh data nyata sesuai master data sekolah jika ada
  const sampleRows: any[][] = [];
  const days: ('Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu')[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

  const sampleKelas1 = kelasList[0]?.namaKelas || 'X Farmasi 1';
  const sampleKelas2 = kelasList[1]?.namaKelas || 'XI Keperawatan 1';
  const sampleMapel1 = mapelList[0]?.namaMapel || 'Farmakologi Dasar';
  const sampleMapel2 = mapelList[1]?.namaMapel || 'Anatomi Fisiologi';
  const sampleGuru1 = guruList[0]?.nama || 'apt. Hendra Kusuma, S.Farm';
  const sampleGuru2 = guruList[1]?.nama || 'Ns. Siti Fatimah, S.Kep';

  sampleRows.push([
    'Senin',
    sampleKelas1,
    '07:15',
    '08:45',
    2,
    sampleMapel1,
    sampleGuru1,
    'Lab Farmasi 1',
  ]);
  sampleRows.push([
    'Senin',
    sampleKelas1,
    '08:45',
    '10:15',
    2,
    sampleMapel2,
    sampleGuru2,
    'Lab Farmasi 1',
  ]);
  sampleRows.push([
    'Selasa',
    sampleKelas2,
    '07:15',
    '09:30',
    3,
    sampleMapel2,
    sampleGuru2,
    'Lab Keperawatan',
  ]);
  sampleRows.push([
    'Rabu',
    sampleKelas1,
    '10:30',
    '12:00',
    2,
    'Bahasa Indonesia',
    sampleGuru1,
    'R. Teori 101',
  ]);

  const sheetData = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set Column Widths
  ws['!cols'] = [
    { wch: 12 }, // Hari
    { wch: 22 }, // Nama Kelas
    { wch: 14 }, // Jam Mulai
    { wch: 14 }, // Jam Selesai
    { wch: 18 }, // Jumlah Jam (JP)
    { wch: 30 }, // Mata Pelajaran
    { wch: 32 }, // Guru Pengampu
    { wch: 20 }, // Ruangan
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Template Jadwal');

  // Sheet 2: Petunjuk & Referensi Master Data Sekolah
  const petunjukRows: any[][] = [
    ['PANDUAN PENGISIAN TEMPLATE JADWAL PELAJARAN (.XLSX)'],
    ['1. Kolom "Hari": Diisi salah satu: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu.'],
    ['2. Kolom "Nama Kelas": Sesuaikan dengan nama rombel di sistem (lihat daftar di bawah).'],
    ['3. Kolom "Jam Mulai" & "Jam Selesai": Format 24 jam HH:mm (contoh: 07:15, 08:45). Sistem otomatis mengenali format titik (07.15), titik dua (07:15), maupun satu kolom Jam KBM (07:15 - 08:45).'],
    ['4. Kolom "Jumlah Jam (JP)": Angka bulat jam tatap muka pelajaran (contoh: 2, 3, atau 4). Jika dikosongkan, sistem menghitung durasi otomatis dari Jam KBM.'],
    ['5. Kolom "Mata Pelajaran": Nama mapel sesuai kurikulum.'],
    ['6. Kolom "Guru Pengampu": Nama lengkap guru pengampu.'],
    ['7. Kolom "Ruangan": Nama lab praktik atau ruang kelas teori.'],
    [''],
    ['=== REFERENSI DAFTAR KELAS DI SISTEM ==='],
    ...kelasList.map(k => [`- ${k.namaKelas} (${k.jurusan})`]),
    [''],
    ['=== REFERENSI DAFTAR MATA PELAJARAN ==='],
    ...mapelList.map(m => [`- ${m.namaMapel} [Kode: ${m.kode}]`]),
    [''],
    ['=== REFERENSI DAFTAR GURU PENGAMPU ==='],
    ...guruList.filter(u => u.role === 'guru' || u.role === 'walas').map(g => [`- ${g.nama} (${g.nipOrNis || 'Guru'})`]),
  ];

  const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukRows);
  wsPetunjuk['!cols'] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk & Referensi');

  saveWorkbookAsExcel(wb, 'TEMPLATE_JADWAL_PELAJARAN.xlsx');
}

/**
 * Template Excel Resmi untuk Data Siswa (.xlsx)
 */
export function downloadTemplateSiswaExcel(kelasList: Kelas[] = []): void {
  const wb = XLSX.utils.book_new();

  const headers = ['NIPD', 'NISN', 'Nama Siswa', 'Kelas', 'Jenis Kelamin', 'Status Aktif'];
  const sampleKelas = kelasList[0]?.namaKelas || 'X Farmasi 1';

  const sampleRows = [
    ['2601001', '0081234567', 'Ahmad Fadillah', sampleKelas, 'Laki-laki', 'Aktif'],
    ['2601002', '0081234568', 'Siti Nur Aisyah', sampleKelas, 'Perempuan', 'Aktif'],
    ['2601003', '0081234569', 'Budi Santoso', sampleKelas, 'Laki-laki', 'Aktif'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 15 },
    { wch: 16 },
    { wch: 30 },
    { wch: 22 },
    { wch: 16 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');

  // Sheet 2: Referensi Kelas
  if (kelasList.length > 0) {
    const wsRef = XLSX.utils.aoa_to_sheet([
      ['Daftar Nama Kelas Resmi:'],
      ...kelasList.map(k => [k.namaKelas, k.jurusan]),
    ]);
    wsRef['!cols'] = [{ wch: 25 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsRef, 'Daftar Kelas');
  }

  saveWorkbookAsExcel(wb, 'TEMPLATE_IMPORT_SISWA.xlsx');
}

/**
 * Template Excel Resmi untuk Tenaga Pendidik / Guru (.xlsx)
 */
export function downloadTemplateGuruExcel(mapelList: Mapel[] = []): void {
  const wb = XLSX.utils.book_new();

  const headers = [
    'NIP',
    'Nama Guru',
    'Gelar',
    'Peran',
    'Jurusan',
    'Walas Kelas',
    'No HP',
    'Email',
    'Jenis Kelamin',
  ];

  const sampleRows = [
    ['198501012010011001', 'Drs. Hendro Wibowo', 'M.Pd', 'guru', 'Umum', '', '081234567890', 'hendro@sekolah.sch.id', 'Laki-laki'],
    ['198802022014022002', 'apt. Ratna Juwita', 'S.Farm', 'walas', 'Farmasi', 'X Farmasi 1', '081298765432', 'ratna@sekolah.sch.id', 'Perempuan'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 22 },
    { wch: 28 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 26 },
    { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Template Guru');
  saveWorkbookAsExcel(wb, 'TEMPLATE_IMPORT_GURU.xlsx');
}

/**
 * Template Excel Resmi untuk Mata Pelajaran (.xlsx)
 */
export function downloadTemplateMapelExcel(): void {
  const wb = XLSX.utils.book_new();

  const headers = ['Kode Mapel', 'Nama Mata Pelajaran', 'Kelompok', 'Jurusan', 'Tingkat', 'Jam Per Minggu'];
  const sampleRows = [
    ['FAR-101', 'Dasar-dasar Kefarmasian', 'Muatan Kejuruan', 'Farmasi', 'X', 4],
    ['KEP-101', 'Kebutuhan Dasar Manusia', 'Muatan Kejuruan', 'Asisten Keperawatan', 'X', 4],
    ['IND-001', 'Bahasa Indonesia', 'Muatan Umum', 'Umum', 'Semua', 3],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 15 },
    { wch: 32 },
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Template Mapel');
  saveWorkbookAsExcel(wb, 'TEMPLATE_IMPORT_MAPEL.xlsx');
}

/**
 * Template Excel Resmi untuk Nilai Leger Siswa (.xlsx)
 */
export function downloadTemplateNilaiExcel(kelasList: Kelas[] = [], mapelList: Mapel[] = []): void {
  const wb = XLSX.utils.book_new();

  const headers = [
    'NIPD',
    'Nama Siswa',
    'Kelas',
    'Mata Pelajaran',
    'Periode',
    'Formatif',
    'PTS',
    'PAS/PAT',
    'Nilai Akhir',
    'Predikat',
  ];

  const sampleKelas = kelasList[0]?.namaKelas || 'X Farmasi 1';
  const sampleMapel = mapelList[0]?.namaMapel || 'Farmakologi Dasar';

  const sampleRows = [
    ['2601001', 'Ahmad Fadillah', sampleKelas, sampleMapel, 'PAS', 85, 82, 88, 85, 'A'],
    ['2601002', 'Siti Nur Aisyah', sampleKelas, sampleMapel, 'PAS', 90, 88, 92, 90, 'A'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 20 },
    { wch: 26 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Template Nilai');
  saveWorkbookAsExcel(wb, 'TEMPLATE_IMPORT_NILAI.xlsx');
}

// ============================================================================
// EXPORT HANDLERS TO EXCEL (.XLSX)
// ============================================================================

/**
 * Ekspor Jadwal Pelajaran ke Berkas Excel (.xlsx)
 */
export function exportJadwalToExcel(jadwalList: JadwalPelajaran[], schoolName: string = 'SMK'): void {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Hari',
    'Nama Kelas',
    'Jam Mulai',
    'Jam Selesai',
    'Jumlah Jam (JP)',
    'Mata Pelajaran',
    'Guru Pengampu',
    'Ruangan',
    'Tahun Ajaran',
    'Semester',
  ];

  const rows = jadwalList.map(j => [
    j.hari,
    j.namaKelas,
    j.jamMulai,
    j.jamSelesai,
    j.jumlahJam || 2,
    j.namaMapel,
    j.namaGuru,
    j.ruang || '',
    j.tahunAjaran || '',
    j.semester || '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 30 },
    { wch: 30 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Pelajaran');
  const dateStr = new Date().toISOString().split('T')[0];
  saveWorkbookAsExcel(wb, `JADWAL_PELAJARAN_${schoolName.replace(/\s+/g, '_')}_${dateStr}.xlsx`);
}

/**
 * Ekspor Rekapitulasi Absensi & Jurnal Mengajar Guru ke Berkas Excel (.xlsx)
 */
export function exportAbsenMengajarToExcel(
  records: AbsenMengajarRecord[],
  schoolName: string = 'SMK',
  periodTitle: string = ''
): void {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Tanggal',
    'Hari',
    'Guru Pengampu',
    'NIP/NUPTK',
    'Kelas',
    'Mata Pelajaran',
    'Jam Ke',
    'Jumlah Jam (JP)',
    'Jam Mulai',
    'Jam Selesai',
    'Ruang',
    'Status Kehadiran',
    'Pokok Bahasan / Materi',
    'Kegiatan KBM',
    'Siswa Hadir',
    'Siswa Sakit',
    'Siswa Izin',
    'Siswa Alpa',
    'Catatan Siswa / Keterangan',
    'Pencatat Absen',
  ];

  const rows = records.map(r => {
    let jpCount = r.jumlahJam;
    if (!jpCount) {
      const match = r.jamKe.match(/(\d+)\s*JP/i);
      jpCount = match ? parseInt(match[1], 10) : 2;
    }

    return [
      r.tanggal,
      r.hari,
      r.namaGuru,
      r.nipOrNis || '-',
      r.namaKelas,
      r.namaMapel,
      r.jamKe,
      jpCount,
      r.jamMulai,
      r.jamSelesai,
      r.ruangKelas || '',
      r.statusKehadiran,
      r.materiPokok,
      r.kegiatanKBM || '',
      r.jumlahHadir ?? 0,
      r.jumlahSakit ?? 0,
      r.jumlahIzin ?? 0,
      r.jumlahAlpa ?? 0,
      r.catatanSiswa || '',
      r.recordedBy === 'admin' ? 'Administrator' : 'Mandiri Guru',
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 10 },
    { wch: 28 },
    { wch: 18 },
    { wch: 18 },
    { wch: 26 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 22 },
    { wch: 35 },
    { wch: 30 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 26 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Absen Guru');
  const dateStr = new Date().toISOString().split('T')[0];
  const titlePart = periodTitle ? `_${periodTitle.replace(/\s+/g, '_')}` : '';
  saveWorkbookAsExcel(wb, `REKAP_ABSEN_MENGAJAR_GURU${titlePart}_${dateStr}.xlsx`);
}

/**
 * Ekspor Data Pendaftar PPDB ke Berkas Excel Biasa (.xlsx)
 */
export function exportPPDBToExcel(formulirList: any[], schoolName: string = 'SMK'): void {
  const wb = XLSX.utils.book_new();

  const headers = [
    'No Registrasi',
    'Tanggal Daftar',
    'Status Pendaftaran',
    'Status Konfirmasi',
    'Pilihan Jurusan',
    'NISN',
    'NIK Siswa',
    'No KK',
    'Nama Lengkap',
    'Nama Panggilan',
    'Jenis Kelamin',
    'Tempat Lahir',
    'Tanggal Lahir',
    'Agama',
    'No HP/WhatsApp',
    'Email Siswa',
    'Alamat Lengkap',
    'RT',
    'RW',
    'Desa/Kelurahan',
    'Kecamatan/Kabupaten',
    'Kode Pos',
    'Asal Sekolah (SMP/MTs)',
    'Nama Ayah',
    'NIK Ayah',
    'Pekerjaan Ayah',
    'Nama Ibu',
    'NIK Ibu',
    'Pekerjaan Ibu',
    'No Telp Ortu',
    'Punya Wali',
    'Nama Wali',
    'Punya KIP/PKH',
    'Nomor Induk Siswa Resmi',
    'Kelas Diterima',
    'Catatan Admin',
  ];

  const rows = formulirList.map(f => [
    f.nomorRegistrasi || f.id,
    f.tanggalDaftar || '',
    f.statusPendaftaran || '',
    f.statusKonfirmasi || '',
    f.pilihanJurusan || '',
    f.nisn || '',
    f.nikSiswa || '',
    f.noKk || '',
    f.namaLengkap || '',
    f.namaPanggilan || '',
    f.jenisKelamin || '',
    f.tempatLahir || '',
    f.tanggalLahir || '',
    f.agama || '',
    f.noHp || f.nomorHp || '',
    f.email || f.emailSiswa || '',
    f.alamatLengkap || '',
    f.rt || '',
    f.rw || '',
    f.desa || '',
    f.kecKab || '',
    f.kodePos || '',
    f.asalSmp || f.asalSekolah || '',
    f.namaAyah || '',
    f.nikAyah || '',
    f.pekerjaanAyah || '',
    f.namaIbu || '',
    f.nikIbu || '',
    f.pekerjaanIbu || '',
    f.noTelpOrtu || '',
    f.punyaWali || 'Tidak',
    f.namaWali || '-',
    f.memilikiKipPkhBpjs || 'Tidak',
    f.nomorIndukSiswaResmi || '',
    f.kelasDiterima || '',
    f.catatanAdmin || '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'Pendaftar PPDB');
  const dateStr = new Date().toISOString().split('T')[0];
  saveWorkbookAsExcel(wb, `DATA_PENDAFTAR_PPDB_${schoolName.replace(/\s+/g, '_')}_${dateStr}.xlsx`);
}

/**
 * Unduh berkas template Excel (.xlsx) khusus untuk pengisian Leger Nilai Mata Pelajaran
 * Sudah terisi otomatis daftar siswa kelas yang sedang dipilih guru.
 */
export function downloadTemplateLegerMapelExcel(
  students: User[] = [],
  mapel?: Mapel,
  kelas?: Kelas,
  periode: string = 'PAS'
): void {
  const wb = XLSX.utils.book_new();
  const headers = [
    'No',
    'NIPD',
    'NISN',
    'Nama Peserta Didik',
    'Kelas',
    'Mata Pelajaran',
    'Periode',
    'LM 1',
    'LM 2',
    'LM 3',
    'LM 4',
    'Tugas 1',
    'Tugas 2',
    'Tugas 3',
    'Ulhar 1',
    'Ulhar 2',
    'Nilai PTS',
    'Nilai PAS/PAT',
    'Nilai Akhir',
    'Catatan Guru'
  ];

  const rows = students.map((s, idx) => [
    idx + 1,
    s.nipd || s.nipOrNis || '',
    s.nisn || s.username || '',
    s.nama || '',
    kelas?.namaKelas || s.kelas || '',
    mapel?.namaMapel || '',
    periode,
    '', '', '', '', '', '', '', '', '', '', '', '', ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 14 },
    { wch: 28 },
    { wch: 16 },
    { wch: 26 },
    { wch: 10 },
    { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
    { wch: 8 }, { wch: 8 }, { wch: 8 },
    { wch: 8 }, { wch: 8 },
    { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 32 }
  ];

  const safeMapel = (mapel?.namaMapel || 'Mapel').replace(/[^a-zA-Z0-9]/g, '_');
  const safeKelas = (kelas?.namaKelas || 'Kelas').replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.utils.book_append_sheet(wb, ws, 'Template Nilai');
  saveWorkbookAsExcel(wb, `Template_Nilai_${safeMapel}_${safeKelas}_${periode}.xlsx`);
}

/**
 * Parsing berkas Excel / Spreadsheet yang diimpor oleh guru ke format Nilai Leger Siswa
 */
export function parseLegerMapelSpreadsheet(
  rows: any[][],
  classStudents: User[]
): {
  importedGrades: { [nipd: string]: any };
  count: number;
  unmatchedNames: string[];
} {
  if (!rows || rows.length === 0) {
    return { importedGrades: {}, count: 0, unmatchedNames: [] };
  }

  // Cari baris header
  let headerRowIndex = -1;
  const colMap: { [key: string]: number } = {};

  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const strRow = row.map(cell => String(cell || '').trim().toLowerCase());

    const hasNama = strRow.some(c => c.includes('nama') || c.includes('siswa') || c.includes('peserta didik'));
    const hasNipd = strRow.some(c => c.includes('nipd') || c.includes('nis') || c.includes('induk'));
    const hasNilai = strRow.some(c => c.includes('nilai') || c.includes('pts') || c.includes('pas') || c.includes('pat') || c.includes('lm') || c.includes('akhir'));

    if ((hasNama || hasNipd) && hasNilai) {
      headerRowIndex = r;
      strRow.forEach((cell, cIdx) => {
        if (!cell) return;
        if (cell.includes('nipd') || (cell.includes('nis') && !cell.includes('nisn')) || cell.includes('no induk') || cell.includes('nomor induk')) {
          if (colMap.nipd === undefined) colMap.nipd = cIdx;
        } else if (cell.includes('nisn')) {
          if (colMap.nisn === undefined) colMap.nisn = cIdx;
        } else if (cell.includes('nama')) {
          if (colMap.nama === undefined) colMap.nama = cIdx;
        } else if (cell === 'lm 1' || cell === 'lm1' || cell.includes('tp 1') || cell.includes('tp1') || cell.includes('formatif 1')) {
          colMap.lm1 = cIdx;
        } else if (cell === 'lm 2' || cell === 'lm2' || cell.includes('tp 2') || cell.includes('tp2') || cell.includes('formatif 2')) {
          colMap.lm2 = cIdx;
        } else if (cell === 'lm 3' || cell === 'lm3' || cell.includes('tp 3') || cell.includes('tp3') || cell.includes('formatif 3')) {
          colMap.lm3 = cIdx;
        } else if (cell === 'lm 4' || cell === 'lm4' || cell.includes('tp 4') || cell.includes('tp4') || cell.includes('formatif 4')) {
          colMap.lm4 = cIdx;
        } else if (cell.includes('tugas 1') || cell === 't1' || cell === 'tugas1') {
          colMap.tugas1 = cIdx;
        } else if (cell.includes('tugas 2') || cell === 't2' || cell === 'tugas2') {
          colMap.tugas2 = cIdx;
        } else if (cell.includes('tugas 3') || cell === 't3' || cell === 'tugas3') {
          colMap.tugas3 = cIdx;
        } else if (cell.includes('ulhar 1') || cell.includes('uh 1') || cell === 'uh1' || cell.includes('ph 1')) {
          colMap.ulhar1 = cIdx;
        } else if (cell.includes('ulhar 2') || cell.includes('uh 2') || cell === 'uh2' || cell.includes('ph 2')) {
          colMap.ulhar2 = cIdx;
        } else if (cell.includes('pts') || cell.includes('asts') || cell.includes('uts') || cell.includes('tengah')) {
          colMap.pts = cIdx;
        } else if (cell.includes('pas') || cell.includes('pat') || cell.includes('sas') || cell.includes('asat') || cell.includes('semester')) {
          colMap.pas = cIdx;
        } else if (cell.includes('akhir') || cell === 'na' || cell === 'nilai' || cell.includes('rapor')) {
          colMap.akhir = cIdx;
        } else if (cell.includes('catatan') || cell.includes('keterangan') || cell.includes('deskripsi')) {
          colMap.catatan = cIdx;
        }
      });
      break;
    }
  }

  // Jika tidak ditemukan header baris eksplisit, gunakan fallback tebak kolom 1: NIPD, kolom 2: NISN, kolom 3: Nama
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    colMap.nipd = 1;
    colMap.nama = 2;
    colMap.akhir = 3;
  }

  const cleanNum = (val: any): number | undefined => {
    if (val === undefined || val === null || val === '') return undefined;
    const str = String(val).replace(/,/g, '.').trim();
    const parsed = parseFloat(str);
    if (isNaN(parsed)) return undefined;
    return Math.min(100, Math.max(0, Math.round(parsed)));
  };

  const normStr = (val: any): string => {
    return String(val || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const importedGrades: { [nipd: string]: any } = {};
  const unmatchedNames: string[] = [];
  let count = 0;

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rowNipd = colMap.nipd !== undefined ? String(row[colMap.nipd] || '').trim() : '';
    const rowNisn = colMap.nisn !== undefined ? String(row[colMap.nisn] || '').trim() : '';
    const rowNama = colMap.nama !== undefined ? String(row[colMap.nama] || '').trim() : '';

    if (!rowNipd && !rowNisn && !rowNama) continue;

    // Cari siswa yang cocok
    const normRowNipd = normStr(rowNipd);
    const normRowNisn = normStr(rowNisn);
    const normRowNama = normStr(rowNama);

    const matchedStudent = classStudents.find(s => {
      const sNipd = normStr(s.nipd || s.nipOrNis);
      const sNisn = normStr(s.nisn || s.username);
      const sNama = normStr(s.nama);

      if (normRowNipd && sNipd && (sNipd === normRowNipd || sNipd.endsWith(normRowNipd) || normRowNipd.endsWith(sNipd))) return true;
      if (normRowNisn && sNisn && sNisn === normRowNisn) return true;
      if (normRowNama && sNama && (sNama === normRowNama || (normRowNama.length > 5 && sNama.includes(normRowNama)) || (sNama.length > 5 && normRowNama.includes(sNama)))) return true;
      return false;
    });

    if (!matchedStudent) {
      if (rowNama) unmatchedNames.push(rowNama);
      continue;
    }

    const targetNipd = matchedStudent.nipd || matchedStudent.nipOrNis;

    const lm1 = colMap.lm1 !== undefined ? cleanNum(row[colMap.lm1]) : undefined;
    const lm2 = colMap.lm2 !== undefined ? cleanNum(row[colMap.lm2]) : undefined;
    const lm3 = colMap.lm3 !== undefined ? cleanNum(row[colMap.lm3]) : undefined;
    const lm4 = colMap.lm4 !== undefined ? cleanNum(row[colMap.lm4]) : undefined;
    const tugas1 = colMap.tugas1 !== undefined ? cleanNum(row[colMap.tugas1]) : undefined;
    const tugas2 = colMap.tugas2 !== undefined ? cleanNum(row[colMap.tugas2]) : undefined;
    const tugas3 = colMap.tugas3 !== undefined ? cleanNum(row[colMap.tugas3]) : undefined;
    const ulhar1 = colMap.ulhar1 !== undefined ? cleanNum(row[colMap.ulhar1]) : undefined;
    const ulhar2 = colMap.ulhar2 !== undefined ? cleanNum(row[colMap.ulhar2]) : undefined;
    const nilaiPts = colMap.pts !== undefined ? cleanNum(row[colMap.pts]) : undefined;
    const nilaiPas = colMap.pas !== undefined ? cleanNum(row[colMap.pas]) : undefined;
    const explicitAkhir = colMap.akhir !== undefined ? cleanNum(row[colMap.akhir]) : undefined;
    const catatan = colMap.catatan !== undefined ? String(row[colMap.catatan] || '').trim() : undefined;

    importedGrades[targetNipd] = {
      lm1,
      lm2,
      lm3,
      lm4,
      tugas1,
      tugas2,
      tugas3,
      ulhar1,
      ulhar2,
      nilaiPts,
      nilaiPas,
      nilaiPat: nilaiPas,
      nilaiAkhir: explicitAkhir,
      catatanGuru: catatan || undefined,
    };
    count++;
  }

  return { importedGrades, count, unmatchedNames };
}

/**
 * Unduh Template Excel Presensi/Absensi Siswa (Bulan September 2026 atau bulan lainnya)
 */
export function downloadTemplateAbsensiExcel(students: User[], defaultBulanTahun: string = '2026-09'): void {
  const sampleDates = [
    '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04',
    '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11',
    '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18',
    '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25',
    '2026-09-28', '2026-09-29', '2026-09-30'
  ];

  const headers = [
    'NO',
    'NIPD',
    'NISN',
    'NAMA SISWA',
    'KELAS',
    'TANGGAL (YYYY-MM-DD)',
    'STATUS (Hadir/Sakit/Izin/Alpa/Terlambat)',
    'WAKTU (HH:mm)',
    'KETERANGAN'
  ];

  const rows: any[][] = [headers];

  const studentList = students.filter(s => s.role === 'siswa');
  const targetStudents = studentList.length > 0 ? studentList : students;

  // Berikan sample baris untuk siswa
  let rowIdx = 1;
  targetStudents.slice(0, 30).forEach((s) => {
    // Berikan contoh 1-2 baris per siswa
    rows.push([
      rowIdx++,
      s.nipd || s.nipOrNis || '',
      s.nisn || '',
      s.nama,
      s.kelas || s.namaKelas || '',
      sampleDates[0] || '2026-09-01',
      'Hadir',
      '07:15',
      'Hadir Tepat Waktu'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 14 },
    { wch: 28 },
    { wch: 16 },
    { wch: 22 },
    { wch: 36 },
    { wch: 14 },
    { wch: 25 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Absensi_Siswa');

  saveWorkbookAsExcel(wb, `Template_Absensi_Siswa_September_2026.xlsx`);
}

/**
 * Parsing berkas spreadsheet (Excel .xlsx/.xls atau CSV) menjadi daftar AbsensiRecord[]
 */
export async function parseAbsensiSpreadsheet(
  file: File,
  studentsList: User[],
  petugasName: string = 'Petugas Absensi'
): Promise<{ records: any[]; count: number; unmatched: string[]; errors: string[] }> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  const firstSheetName = wb.SheetNames[0];
  const worksheet = wb.Sheets[firstSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (rawRows.length <= 1) {
    throw new Error('Berkas spreadsheet kosong atau tidak memuat baris data presensi.');
  }

  // Cari header row
  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, rawRows.length); i++) {
    const rowStr = rawRows[i].map(c => String(c || '').toLowerCase()).join(' ');
    if (rowStr.includes('nama') || rowStr.includes('nipd') || rowStr.includes('tanggal') || rowStr.includes('status')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) headerIndex = 0;

  const headerRow = rawRows[headerIndex].map(c => String(c || '').trim().toLowerCase());

  const colNipd = headerRow.findIndex(h => h.includes('nipd') || h.includes('nis'));
  const colNisn = headerRow.findIndex(h => h.includes('nisn'));
  const colNama = headerRow.findIndex(h => h.includes('nama'));
  const colKelas = headerRow.findIndex(h => h.includes('kelas') || h.includes('rombel'));
  const colTanggal = headerRow.findIndex(h => h.includes('tanggal') || h.includes('tgl') || h.includes('date'));
  const colStatus = headerRow.findIndex(h => h.includes('status') || h.includes('kehadiran') || h.includes('keterangan hadir'));
  const colWaktu = headerRow.findIndex(h => h.includes('waktu') || h.includes('jam') || h.includes('pukul') || h.includes('time'));
  const colKeterangan = headerRow.findIndex(h => h.includes('keterangan') && !h.includes('hadir'));

  const records: any[] = [];
  const unmatched: string[] = [];
  const errors: string[] = [];

  const normStr = (val: any) => String(val || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  for (let i = headerIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0 || row.every(c => c === '' || c === null || c === undefined)) continue;

    const rowNipd = colNipd !== -1 ? String(row[colNipd] || '').trim() : '';
    const rowNisn = colNisn !== -1 ? String(row[colNisn] || '').trim() : '';
    const rowNama = colNama !== -1 ? String(row[colNama] || '').trim() : '';
    const rowKelas = colKelas !== -1 ? String(row[colKelas] || '').trim() : '';

    if (!rowNipd && !rowNisn && !rowNama) continue;

    // Cari siswa yang cocok
    const normRowNipd = normStr(rowNipd);
    const normRowNisn = normStr(rowNisn);
    const normRowNama = normStr(rowNama);

    const matchedStudent = studentsList.find(s => {
      const sNipd = normStr(s.nipd || s.nipOrNis);
      const sNisn = normStr(s.nisn || s.username);
      const sNama = normStr(s.nama);

      if (normRowNipd && sNipd && (sNipd === normRowNipd || sNipd.endsWith(normRowNipd) || normRowNipd.endsWith(sNipd))) return true;
      if (normRowNisn && sNisn && sNisn === normRowNisn) return true;
      if (normRowNama && sNama && (sNama === normRowNama || (normRowNama.length > 5 && sNama.includes(normRowNama)) || (sNama.length > 5 && normRowNama.includes(sNama)))) return true;
      return false;
    });

    const targetStudentName = matchedStudent?.nama || rowNama || 'Siswa';
    const targetNipd = matchedStudent?.nipd || matchedStudent?.nipOrNis || rowNipd || `siswa-${i}`;
    const targetNisn = matchedStudent?.nisn || rowNisn || '';
    const targetKelas = matchedStudent?.kelas || matchedStudent?.namaKelas || rowKelas || 'Semua Kelas';

    if (!matchedStudent && rowNama) {
      if (!unmatched.includes(rowNama)) unmatched.push(rowNama);
    }

    // Parsing Tanggal
    let rawDateVal = colTanggal !== -1 ? row[colTanggal] : '2026-09-01';
    let tanggalIso = '2026-09-01';

    if (rawDateVal instanceof Date && !isNaN(rawDateVal.getTime())) {
      tanggalIso = rawDateVal.toISOString().split('T')[0];
    } else if (typeof rawDateVal === 'number' && rawDateVal > 20000) {
      // Excel serial date number
      const parsedDate = new Date((rawDateVal - 25569) * 86400 * 1000);
      if (!isNaN(parsedDate.getTime())) {
        tanggalIso = parsedDate.toISOString().split('T')[0];
      }
    } else {
      const strDate = String(rawDateVal || '').trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(strDate)) {
        tanggalIso = strDate;
      } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(strDate)) {
        const parts = strDate.split(/[\/\-]/);
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        tanggalIso = `${year}-${month}-${day}`;
      } else if (strDate.toLowerCase().includes('september')) {
        const match = strDate.match(/(\d{1,2})\s+september\s+(\d{4})/i);
        if (match) {
          tanggalIso = `${match[2]}-09-${match[1].padStart(2, '0')}`;
        }
      }
    }

    // Parsing Status
    const rawStatus = colStatus !== -1 ? String(row[colStatus] || '').trim().toLowerCase() : 'hadir';
    let status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat' = 'Hadir';

    if (rawStatus.includes('sakit') || rawStatus === 's') {
      status = 'Sakit';
    } else if (rawStatus.includes('izin') || rawStatus === 'i') {
      status = 'Izin';
    } else if (rawStatus.includes('alpa') || rawStatus.includes('alpha') || rawStatus === 'a' || rawStatus.includes('absen') || rawStatus.includes('tanpa keterangan')) {
      status = 'Alpa';
    } else if (rawStatus.includes('terlambat') || rawStatus.includes('telat') || rawStatus === 't') {
      status = 'Terlambat';
    } else {
      status = 'Hadir';
    }

    // Parsing Waktu
    const rawWaktu = colWaktu !== -1 ? row[colWaktu] : null;
    const waktu = rawWaktu ? normalizeExcelTime(rawWaktu, '07:15:00') : '07:15:00';
    const cleanWaktu = waktu.length === 5 ? `${waktu}:00` : waktu;

    // Parsing Keterangan
    const rawKet = colKeterangan !== -1 ? String(row[colKeterangan] || '').trim() : '';
    const keterangan = rawKet || (status === 'Hadir' ? 'Hadir via Berkas Impor' : `Keterangan: ${status}`);

    const id = `abs-imp-${targetNipd}-${tanggalIso}-${Date.now().toString(36)}-${i}`;

    records.push({
      id,
      nipd: targetNipd,
      nisn: targetNisn,
      userId: matchedStudent?.id,
      namaSiswa: targetStudentName,
      kelas: targetKelas,
      tanggal: tanggalIso,
      waktu: cleanWaktu,
      status,
      metode: 'Manual',
      keterangan,
      petugas: petugasName,
    });
  }

  return { records, count: records.length, unmatched, errors };
}


