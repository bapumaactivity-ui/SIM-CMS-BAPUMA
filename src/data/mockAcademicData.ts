import { AbsensiRecord, NilaiMapelSiswa, RaportKurikulumMerdeka } from '../types';
import { STUDENTS_RAW_DATA } from './studentsData';

// Hari efektif KBM September 2026 (Senin - Jumat)
const septEffectiveDates: string[] = [
  '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04',
  '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11',
  '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18',
  '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25',
  '2026-09-28', '2026-09-29', '2026-09-30'
];

function generateSeptemberAttendance(): AbsensiRecord[] {
  const records: AbsensiRecord[] = [];
  
  // Today's records
  const todayStr = new Date().toISOString().split('T')[0];
  STUDENTS_RAW_DATA.slice(0, 30).forEach((s, idx) => {
    records.push({
      id: `abs-today-${s.nipd}`,
      nipd: s.nipd,
      nisn: s.nisn,
      namaSiswa: s.nama,
      kelas: s.kelas,
      tanggal: todayStr,
      waktu: `06:${String(45 + (idx % 20)).padStart(2, '0')}:15`,
      status: idx === 3 ? 'Terlambat' : idx === 4 ? 'Sakit' : 'Hadir',
      metode: 'Barcode Scan',
      keterangan: idx === 3 ? 'Terlambat 8 menit' : idx === 4 ? 'Surat dokter' : 'Tepat waktu',
      petugas: 'Petugas Presensi',
    });
  });

  // Full attendance records throughout September 2026
  STUDENTS_RAW_DATA.forEach((s, sIdx) => {
    septEffectiveDates.forEach((dateStr, dIdx) => {
      // Deterministic slight variation for realism (95% Hadir, occasional Sakit/Izin/Terlambat)
      const seed = (sIdx * 17 + dIdx * 31) % 100;
      let status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat' = 'Hadir';
      let keterangan = 'Hadir Tepat Waktu';
      let waktu = `06:${String(45 + ((sIdx + dIdx) % 25)).padStart(2, '0')}:00`;

      if (seed === 7) {
        status = 'Sakit';
        keterangan = 'Izin Sakit (Surat Terlampir)';
        waktu = '07:00:00';
      } else if (seed === 19) {
        status = 'Izin';
        keterangan = 'Izin Keperluan Keluarga';
        waktu = '07:00:00';
      } else if (seed === 42) {
        status = 'Terlambat';
        keterangan = 'Terlambat 10 menit';
        waktu = '07:12:00';
      }

      records.push({
        id: `abs-sept26-${s.nipd}-${dateStr}`,
        nipd: s.nipd,
        nisn: s.nisn,
        namaSiswa: s.nama,
        kelas: s.kelas,
        tanggal: dateStr,
        waktu,
        status,
        metode: status === 'Sakit' || status === 'Izin' ? 'Manual' : 'Barcode Scan',
        keterangan,
        petugas: 'Petugas Presensi',
      });
    });
  });

  return records;
}

export const INITIAL_ABSENSI_RECORDS: AbsensiRecord[] = generateSeptemberAttendance();

/**
 * Memastikan catatan presensi September 2026 selalu terjaga dan tidak hilang
 * saat sinkronisasi cloud atau pembersihan lokal.
 */
export function ensureSeptemberAttendance(records: AbsensiRecord[]): AbsensiRecord[] {
  if (!Array.isArray(records) || records.length === 0) {
    return [...INITIAL_ABSENSI_RECORDS];
  }
  const hasSeptember = records.some(r => r && r.tanggal && r.tanggal.startsWith('2026-09'));
  if (!hasSeptember) {
    const map = new Map<string, AbsensiRecord>();
    INITIAL_ABSENSI_RECORDS.forEach(r => {
      map.set(`${r.nipd || r.userId || r.namaSiswa}_${r.tanggal}`, r);
    });
    records.forEach(r => {
      map.set(`${r.nipd || r.userId || r.namaSiswa}_${r.tanggal}`, r);
    });
    return Array.from(map.values());
  }
  return records;
}

import { buildKurikulumMerdekaCapaian } from '../utils/academicHelpers';

// Helper to compute Nilai Akhir and Capaian
export function hitungNilaiAkhir(
  item: Partial<NilaiMapelSiswa>,
  tpContext?: { lm1?: string; lm2?: string; lm3?: string; lm4?: string; mapelNama?: string; kelas?: any }
): {
  nilaiFormatif: number;
  nilaiAkhir: number;
  predikat: 'A' | 'B' | 'C' | 'D';
  ketercapaian: 'Tuntas' | 'Belum Tuntas';
  deskripsiTertinggi: string;
  deskripsiPerluBimbingan: string;
} {
  const lm1 = item.lm1 ?? item.tugas1;
  const lm2 = item.lm2 ?? item.tugas2;
  const lm3 = item.lm3 ?? item.tugas3;
  const lm4 = item.lm4;
  const ulhar1 = item.ulhar1;
  const ulhar2 = item.ulhar2;

  const validComponents = [lm1, lm2, lm3, lm4, ulhar1, ulhar2].filter((v): v is number => typeof v === 'number' && !isNaN(v));
  const formatif = validComponents.length > 0 
    ? Math.round(validComponents.reduce((a, b) => a + b, 0) / validComponents.length)
    : 0;

  const pts = item.nilaiPts ?? 0;
  const pas = item.nilaiPas ?? 0;
  const pat = item.nilaiPat ?? 0;
  const periode = item.periode || 'PAS';

  let akhir = 0;
  if (periode === 'PTS') {
    // Penilaian Tengah Semester (Formatif + PTS)
    if (formatif > 0 && pts > 0) {
      akhir = Math.round(formatif * 0.5 + pts * 0.5);
    } else {
      akhir = pts || formatif;
    }
  } else if (periode === 'PAT') {
    // Penilaian Akhir Tahun (Formatif + PAT, hilangkan PTS)
    if (formatif > 0 && pat > 0) {
      akhir = Math.round(formatif * 0.5 + pat * 0.5);
    } else {
      akhir = pat || formatif;
    }
  } else {
    // Penilaian Akhir Semester (Formatif + PAS, hilangkan PTS)
    if (formatif > 0 && pas > 0) {
      akhir = Math.round(formatif * 0.5 + pas * 0.5);
    } else {
      akhir = pas || formatif;
    }
  }

  let predikat: 'A' | 'B' | 'C' | 'D' = 'C';
  if (akhir >= 90) predikat = 'A';
  else if (akhir >= 80) predikat = 'B';
  else if (akhir >= 70) predikat = 'C';
  else if (akhir > 0) predikat = 'D';

  const ketercapaian = akhir >= 75 ? 'Tuntas' : 'Belum Tuntas';

  // Susun Capaian Kompetensi Kurikulum Merdeka berbasis Tujuan Pembelajaran (TP) yang diinput guru
  const capaianResult = buildKurikulumMerdekaCapaian({
    grade: {
      ...item,
      nilaiAkhir: akhir,
      tp1Desc: tpContext?.lm1 || item.tp1Desc,
      tp2Desc: tpContext?.lm2 || item.tp2Desc,
      tp3Desc: tpContext?.lm3 || item.tp3Desc,
      tp4Desc: tpContext?.lm4 || item.tp4Desc,
    },
    mapel: tpContext?.mapelNama || item.mapelNama || item.mapelId,
    kelas: tpContext?.kelas || item.kelas,
    displayStyle: 'narasi',
  });

  const deskripsiTertinggi = capaianResult.capaianTertinggi || capaianResult.deskripsiNarasi;
  const deskripsiPerluBimbingan = capaianResult.capaianPerluBimbingan;

  return {
    nilaiFormatif: formatif,
    nilaiAkhir: akhir,
    predikat,
    ketercapaian,
    deskripsiTertinggi,
    deskripsiPerluBimbingan,
  };
}

// Initial clean empty grades per user request (hilangkan data bawaan sistem untuk data guru dan nilai)
export const INITIAL_NILAI_MAPEL: NilaiMapelSiswa[] = [];

