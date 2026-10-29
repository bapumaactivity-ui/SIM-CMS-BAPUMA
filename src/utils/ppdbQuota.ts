import { FormulirPPDB, SchoolInfo } from '../types';

export interface JurusanQuotaStat {
  nama: string;
  key: 'farmasi' | 'keperawatan' | 'kecantikan' | 'perhotelan';
  kapasitas: number;
  terisi: number;
  sisa: number;
  persen: number;
}

export interface QuotaSummary {
  totalKapasitas: number;
  totalTerisi: number;
  totalSisa: number;
  persenTerisi: number;
  jurusan: {
    farmasi: JurusanQuotaStat;
    keperawatan: JurusanQuotaStat;
    kecantikan: JurusanQuotaStat;
    perhotelan: JurusanQuotaStat;
  };
}

/**
 * Memeriksa apakah calon siswa sudah diverifikasi atau diterima resmi.
 * Ketika status ini terpenuhi, maka kuota siswa baru otomatis berkurang.
 */
export function isStudentVerifiedOrAccepted(f: FormulirPPDB): boolean {
  if (!f) return false;
  const status = (f.statusPendaftaran || '').trim().toLowerCase();
  const konfirmasi = (f.statusKonfirmasi || '').trim().toLowerCase();
  return (
    status === 'diterima' ||
    status === 'terverifikasi' ||
    status === 'lulus_tes' ||
    konfirmasi === 'diterima' ||
    konfirmasi === 'terverifikasi'
  );
}

/**
 * Menghitung kuota SPMB secara real-time dan reaktif:
 * Kuota berkurang otomatis saat calon siswa diverifikasi atau diterima.
 */
export function calculatePPDBQuota(
  schoolInfo?: SchoolInfo,
  formulirList: FormulirPPDB[] = []
): QuotaSummary {
  const findKejuruan = (keywords: string[]) => {
    if (schoolInfo?.kejuruanList && Array.isArray(schoolInfo.kejuruanList)) {
      const match = schoolInfo.kejuruanList.find(k => {
        const text = `${k.nama || ''} ${k.singkatan || ''} ${k.kode || ''}`.toLowerCase();
        return keywords.some(kw => text.includes(kw));
      });
      if (match && typeof match.kuotaSiswa === 'number' && match.kuotaSiswa > 0) {
        return Number(match.kuotaSiswa);
      }
    }
    return null;
  };

  const capFarmasi = Number(
    schoolInfo?.kuotaJurusan?.farmasi ??
    findKejuruan(['farmasi']) ??
    schoolInfo?.kuotaPerJurusan?.farmasi ??
    72
  );
  const capKeperawatan = Number(
    schoolInfo?.kuotaJurusan?.keperawatan ??
    findKejuruan(['perawat', 'keperawatan']) ??
    schoolInfo?.kuotaPerJurusan?.asistenKeperawatan ??
    72
  );
  const capKecantikan = Number(
    schoolInfo?.kuotaJurusan?.kecantikan ??
    findKejuruan(['cantik', 'kecantikan', 'spa']) ??
    schoolInfo?.kuotaPerJurusan?.tataKecantikan ??
    36
  );
  const capPerhotelan = Number(
    schoolInfo?.kuotaJurusan?.perhotelan ??
    findKejuruan(['hotel', 'perhotelan']) ??
    schoolInfo?.kuotaPerJurusan?.perhotelan ??
    36
  );

  const calculatedTotal = capFarmasi + capKeperawatan + capKecantikan + capPerhotelan;
  const totalKapasitas = calculatedTotal || schoolInfo?.kuotaSPMB || 216;

  let terisiFarmasi = 0;
  let terisiKeperawatan = 0;
  let terisiKecantikan = 0;
  let terisiPerhotelan = 0;

  for (const f of formulirList) {
    if (isStudentVerifiedOrAccepted(f)) {
      const jur = (f.pilihanJurusan || '').toLowerCase();
      if (jur.includes('farmasi')) {
        terisiFarmasi++;
      } else if (jur.includes('perawat') || jur.includes('keperawatan')) {
        terisiKeperawatan++;
      } else if (
        jur.includes('cantik') ||
        jur.includes('kecantikan') ||
        jur.includes('spa')
      ) {
        terisiKecantikan++;
      } else if (jur.includes('hotel') || jur.includes('perhotelan')) {
        terisiPerhotelan++;
      }
    }
  }

  const totalTerisi =
    terisiFarmasi + terisiKeperawatan + terisiKecantikan + terisiPerhotelan;
  const sisaFarmasi = Math.max(0, capFarmasi - terisiFarmasi);
  const sisaKeperawatan = Math.max(0, capKeperawatan - terisiKeperawatan);
  const sisaKecantikan = Math.max(0, capKecantikan - terisiKecantikan);
  const sisaPerhotelan = Math.max(0, capPerhotelan - terisiPerhotelan);
  const totalSisa = Math.max(0, totalKapasitas - totalTerisi);

  return {
    totalKapasitas,
    totalTerisi,
    totalSisa,
    persenTerisi:
      totalKapasitas > 0
        ? Math.min(100, Math.round((totalTerisi / totalKapasitas) * 100))
        : 0,
    jurusan: {
      farmasi: {
        nama: 'Farmasi Klinis & Komunitas',
        key: 'farmasi',
        kapasitas: capFarmasi,
        terisi: terisiFarmasi,
        sisa: sisaFarmasi,
        persen:
          capFarmasi > 0
            ? Math.min(100, Math.round((terisiFarmasi / capFarmasi) * 100))
            : 0,
      },
      keperawatan: {
        nama: 'Asisten Keperawatan',
        key: 'keperawatan',
        kapasitas: capKeperawatan,
        terisi: terisiKeperawatan,
        sisa: sisaKeperawatan,
        persen:
          capKeperawatan > 0
            ? Math.min(100, Math.round((terisiKeperawatan / capKeperawatan) * 100))
            : 0,
      },
      kecantikan: {
        nama: 'Tata Kecantikan & Spa',
        key: 'kecantikan',
        kapasitas: capKecantikan,
        terisi: terisiKecantikan,
        sisa: sisaKecantikan,
        persen:
          capKecantikan > 0
            ? Math.min(100, Math.round((terisiKecantikan / capKecantikan) * 100))
            : 0,
      },
      perhotelan: {
        nama: 'Perhotelan (Hospitality)',
        key: 'perhotelan',
        kapasitas: capPerhotelan,
        terisi: terisiPerhotelan,
        sisa: sisaPerhotelan,
        persen:
          capPerhotelan > 0
            ? Math.min(100, Math.round((terisiPerhotelan / capPerhotelan) * 100))
            : 0,
      },
    },
  };
}
