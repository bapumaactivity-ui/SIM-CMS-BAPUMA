import { Kelas, Mapel, User, UserRole, Ekskul, AbsensiRecord, PraktikKerjaIndustriItem, JadwalPelajaran, KejuruanDetail } from '../types';

/**
 * Helper to check if a Jurusan is active
 */
/**
 * Helper to check if a Jurusan is active
 */
export function isJurusanActive(jurusanNameOrCode?: string, kejuruanList?: KejuruanDetail[]): boolean {
  if (!jurusanNameOrCode) return true;
  if (!kejuruanList || kejuruanList.length === 0) return true;
  const norm = jurusanNameOrCode.trim().toLowerCase();

  // Check if it matches any explicitly inactive jurusan
  const isInactive = kejuruanList.some(j => {
    if (j.status !== 'nonaktif' && j.aktif !== false) return false;
    const jId = (j.id || '').toLowerCase();
    const jKode = (j.kode || '').toLowerCase();
    const jNama = (j.nama || '').toLowerCase();
    const jSingk = (j.singkatan || '').toLowerCase();
    
    // Direct matches
    if (jId === norm || jKode === norm || jNama === norm || jSingk === norm) return true;
    if (jNama && (jNama.includes(norm) || norm.includes(jNama))) return true;
    if (jSingk && (jSingk.includes(norm) || norm.includes(jSingk))) return true;
    if (jKode && (jKode.includes(norm) || norm.includes(jKode))) return true;

    // Vocational keywords
    if ((jNama.includes('farmasi') || jSingk.includes('farmasi') || jKode === 'far') && norm.includes('farmasi')) return true;
    if ((jNama.includes('keperawatan') || jNama.includes('perawat') || jSingk.includes('keperawatan') || jKode === 'kep') && (norm.includes('keperawatan') || norm.includes('perawat') || norm.includes('askep'))) return true;
    if ((jNama.includes('cantik') || jNama.includes('spa') || jSingk.includes('cantik') || jKode === 'kec') && (norm.includes('cantik') || norm.includes('spa') || norm.includes('tkk'))) return true;
    if ((jNama.includes('hotel') || jSingk.includes('hotel') || jKode === 'htl') && (norm.includes('hotel') || norm.includes('hospitality') || norm.includes('ph'))) return true;
    if (jNama.includes('kesehatan') && norm.includes('kesehatan')) return true;

    return false;
  });
  if (isInactive) return false;

  const found = kejuruanList.find(j => 
    j.id.toLowerCase() === norm ||
    j.kode.toLowerCase() === norm ||
    j.nama.toLowerCase() === norm ||
    j.singkatan.toLowerCase() === norm ||
    norm.includes(j.singkatan.toLowerCase()) ||
    norm.includes(j.nama.toLowerCase()) ||
    j.nama.toLowerCase().includes(norm) ||
    j.singkatan.toLowerCase().includes(norm)
  );
  if (found) {
    return found.status !== 'nonaktif' && found.aktif !== false;
  }
  return true;
}

/**
 * Helper to check if a Kelas is active (both rombel status and its jurusan)
 */
export function isKelasActive(kelas: Kelas | undefined | null, kejuruanList?: KejuruanDetail[]): boolean {
  if (!kelas) return false;
  if (kelas.status === 'nonaktif' || kelas.aktif === false) return false;
  if (kejuruanList && kejuruanList.length > 0) {
    if (kelas.jurusan && !isJurusanActive(kelas.jurusan, kejuruanList)) return false;
    // Check if class name references an inactive jurusan
    const inactiveJurusans = kejuruanList.filter(j => j.status === 'nonaktif' || j.aktif === false);
    for (const inact of inactiveJurusans) {
      const inactName = (inact.nama || '').toLowerCase().trim();
      const inactSingk = (inact.singkatan || '').toLowerCase().trim();
      const inactKode = (inact.kode || '').toLowerCase().trim();
      const kName = (kelas.namaKelas || '').toLowerCase();
      const kJur = (kelas.jurusan || '').toLowerCase();

      if (inactName && (kName.includes(inactName) || kJur.includes(inactName))) return false;
      if (inactSingk && (kName.includes(inactSingk) || kJur.includes(inactSingk))) return false;
      if (inactKode && (kName.includes(inactKode) || kJur.includes(inactKode))) return false;

      // Vocational keyword matches
      if ((inactName.includes('hotel') || inactSingk.includes('hotel') || inactKode === 'htl') && (kName.includes('hotel') || kJur.includes('hotel'))) return false;
      if ((inactName.includes('cantik') || inactName.includes('spa') || inactSingk.includes('cantik') || inactKode === 'kec') && (kName.includes('cantik') || kName.includes('spa') || kJur.includes('cantik') || kJur.includes('spa'))) return false;
      if ((inactName.includes('keperawatan') || inactName.includes('perawat') || inactKode === 'kep') && (kName.includes('keperawatan') || kName.includes('perawat') || kJur.includes('keperawatan') || kJur.includes('perawat'))) return false;
      if ((inactName.includes('farmasi') || inactKode === 'far') && (kName.includes('farmasi') || kJur.includes('farmasi'))) return false;
    }
  }
  return true;
}

/**
 * Filter classes to only active classes (and whose jurusan is also active)
 */
export function getActiveClasses(kelasList: Kelas[] = [], kejuruanList?: KejuruanDetail[]): Kelas[] {
  if (!Array.isArray(kelasList)) return [];
  return kelasList.filter(k => isKelasActive(k, kejuruanList));
}

/**
 * Filter kejuruan to only active programs
 */
export function getActiveKejuruan(kejuruanList: KejuruanDetail[] | undefined): KejuruanDetail[] {
  if (!Array.isArray(kejuruanList)) return [];
  return kejuruanList.filter(j => j.status !== 'nonaktif' && j.aktif !== false);
}

/**
 * Helper to check whether a grade record has any actual non-zero scores
 */
export function hasActualScores(g: any): boolean {
  if (!g) return false;
  const num = (v: any): number => {
    if (v === null || v === undefined || v === '' || typeof v === 'boolean') return 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };
  return (
    num(g.nilaiAkhir) > 0 ||
    num(g.nilaiFormatif) > 0 ||
    num(g.nilaiPts) > 0 ||
    num(g.nilaiPas) > 0 ||
    num(g.nilaiPat) > 0 ||
    num(g.lm1) > 0 ||
    num(g.lm2) > 0 ||
    num(g.lm3) > 0 ||
    num(g.lm4) > 0 ||
    num(g.tugas1) > 0 ||
    num(g.tugas2) > 0 ||
    num(g.tugas3) > 0 ||
    num(g.ulhar1) > 0 ||
    num(g.ulhar2) > 0
  );
}

/**
 * Mengembalikan nama lengkap guru/pegawai beserta gelar akademiknya.
 * Mencegah duplikasi gelar jika nama sudah mengandung gelar.
 */
export function formatTeacherNameWithDegree(
  teacherOrName: User | string | null | undefined,
  allUsers: User[] = []
): string {
  if (!teacherOrName) return '-';

  let userObj: User | undefined;
  let rawName = '';

  if (typeof teacherOrName === 'string') {
    rawName = teacherOrName.trim();
    if (!rawName || rawName === '-' || rawName.toLowerCase() === 'belum ditentukan') {
      return rawName || '-';
    }
    const norm = normalizeTeacherName(rawName) || rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
    userObj = allUsers.find(u => {
      const uNorm = normalizeTeacherName(u.nama) || (u.nama || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const uId = (u.id || '').toLowerCase();
      const uNip = (u.nipOrNis || u.idGuru || '').toLowerCase();
      return (norm && uNorm === norm) || (rawName && u.nama === rawName) || uId === rawName.toLowerCase() || uNip === rawName.toLowerCase();
    });
  } else {
    userObj = teacherOrName;
    rawName = (teacherOrName.nama || '').trim();
  }

  if (!rawName) return '-';

  const gelar = (userObj?.gelar || '').trim();
  if (!gelar) {
    return rawName;
  }

  // Cek apakah rawName sudah mengandung gelar tersebut
  const cleanGelar = gelar.replace(/[.,]/g, '').trim().toLowerCase();
  const cleanName = rawName.replace(/[.,]/g, '').trim().toLowerCase();
  if (cleanName.includes(cleanGelar)) {
    return rawName;
  }

  // Cek apakah gelar adalah gelar depan (misal: Dr., Dra., Drs., H., Hj., Prof.)
  const firstWord = gelar.split(/[\s,]+/)[0].toLowerCase().replace(/\./g, '');
  const isFrontTitle = ['dr', 'dra', 'drs', 'h', 'hj', 'prof', 'ir', 'kh', 'ust', 'apt'].includes(firstWord);
  if (isFrontTitle) {
    return `${gelar} ${rawName}`;
  }

  // Gelar belakang (misal: S.Pd., S.Farm., Apt., S.Kom., M.Pd., M.Kes., dll.)
  return `${rawName}, ${gelar}`;
}

/**
 * Filter kelas / rombel yang relevan dengan mata pelajaran yang dipilih.
 * - Mapel Kejuruan Farmasi -> Kelas Farmasi & Kesehatan
 * - Mapel Kejuruan Asisten Keperawatan -> Kelas Keperawatan & Kesehatan
 * - Mapel Kejuruan Tata Kecantikan & Spa -> Kelas Tata Kecantikan
 * - Mapel Kejuruan Perhotelan -> Kelas Perhotelan
 * - Mapel Muatan Umum (PJOK, Agama, PPKn, dll.) -> Semua Rombel
 */
export function getMatchingClassesForMapel(mapel: Mapel | undefined, allKelas: Kelas[]): Kelas[] {
  if (!allKelas || allKelas.length === 0) {
    return [];
  }

  // Filter out inactive classes
  const activeKelas = allKelas.filter(k => k.status !== 'nonaktif' && k.aktif !== false);
  if (!mapel) {
    return activeKelas;
  }

  const jur = (mapel.jurusan || '').toLowerCase();
  const nama = (mapel.namaMapel || '').toLowerCase();
  const kode = (mapel.kode || '').toLowerCase();
  const kelompok = (mapel.kelompok || '').toLowerCase();

  // 1. Kejuruan: Farmasi
  if (
    jur.includes('farmasi') ||
    nama.includes('farmasi') ||
    nama.includes('farmako') ||
    nama.includes('resep') ||
    kode.startsWith('far')
  ) {
    const matched = allKelas.filter(k => {
      const kj = (k.jurusan || '').toLowerCase();
      const kn = (k.namaKelas || '').toLowerCase();
      return kj.includes('farmasi') || kj.includes('kesehatan') || kn.includes('farmasi') || kn.includes('kesehatan');
    });
    return matched.length > 0 ? matched : allKelas;
  }

  // 2. Kejuruan: Asisten Keperawatan
  if (
    jur.includes('keperawatan') ||
    nama.includes('keperawatan') ||
    nama.includes('kdm') ||
    nama.includes('tindakan keperawatan') ||
    kode.startsWith('kep')
  ) {
    const matched = allKelas.filter(k => {
      const kj = (k.jurusan || '').toLowerCase();
      const kn = (k.namaKelas || '').toLowerCase();
      return kj.includes('keperawatan') || kj.includes('kesehatan') || kn.includes('keperawatan') || kn.includes('kesehatan');
    });
    return matched.length > 0 ? matched : allKelas;
  }

  // 3. Kejuruan: Tata Kecantikan & Spa
  if (
    jur.includes('cantik') ||
    jur.includes('spa') ||
    nama.includes('cantik') ||
    nama.includes('spa') ||
    nama.includes('kulit') ||
    nama.includes('rambut') ||
    kode.startsWith('kec')
  ) {
    const matched = allKelas.filter(k => {
      const kj = (k.jurusan || '').toLowerCase();
      const kn = (k.namaKelas || '').toLowerCase();
      return kj.includes('cantik') || kj.includes('spa') || kn.includes('kecantikan') || kn.includes('spa');
    });
    return matched.length > 0 ? matched : allKelas;
  }

  // 4. Kejuruan: Perhotelan
  if (
    jur.includes('hotel') ||
    nama.includes('hotel') ||
    nama.includes('hospitality') ||
    nama.includes('housekeeping') ||
    nama.includes('front office') ||
    kode.startsWith('htl')
  ) {
    const matched = allKelas.filter(k => {
      const kj = (k.jurusan || '').toLowerCase();
      const kn = (k.namaKelas || '').toLowerCase();
      return kj.includes('hotel') || kn.includes('perhotelan');
    });
    return matched.length > 0 ? matched : allKelas;
  }

  // 5. Muatan Umum (PJOK, PAI, PPKn, Bahasa Indonesia, Matematika, dll.)
  // Berlaku untuk semua rombel
  return allKelas;
}

// Helper to check if a class or student is in Kelas XI or XII (Fase F)
export const isClassXIorXII = (tingkatOrKelas?: string, secondCheck?: string): boolean => {
  const combined = `${tingkatOrKelas || ''} ${secondCheck || ''}`.toUpperCase();
  return /\bXII\b|\bXI\b|XII-|XI-|-XII|-XI|KELAS\s*XII|KELAS\s*XI|\b11\b|\b12\b/.test(combined);
};

/**
  * Dapatkan data praktik kerja industri (PKL/Prakerin) standar berdasarkan jurusan siswa
  */
export function getDefaultPrakerinForMajor(
  jurusan?: string, 
  namaKelas?: string
): PraktikKerjaIndustriItem[] {
  const jur = `${jurusan || ''} ${namaKelas || ''}`.toLowerCase();
  if (jur.includes('farmasi')) {
    return [
      {
        nomor: 1,
        mitra: 'Apotek Kimia Farma Parung Panjang',
        lamanya: '3 Bulan (90 Hari)',
        keterangan: 'Kompeten / Sangat Memuaskan (Nilai: 92)'
      },
      {
        nomor: 2,
        mitra: 'Instalasi Farmasi RSUD Leuwiliang',
        lamanya: '3 Bulan (90 Hari)',
        keterangan: 'Kompeten / Sangat Memuaskan (Nilai: 90)'
      }
    ];
  }
  if (jur.includes('keperawatan') || jur.includes('kesehatan')) {
    return [
      {
        nomor: 1,
        mitra: 'Puskesmas Parung Panjang',
        lamanya: '3 Bulan (90 Hari)',
        keterangan: 'Kompeten / Sangat Memuaskan (Nilai: 91)'
      },
      {
        nomor: 2,
        mitra: 'Klinik Pratama Rawat Inap BPM',
        lamanya: '3 Bulan (90 Hari)',
        keterangan: 'Kompeten / Sangat Memuaskan (Nilai: 89)'
      }
    ];
  }
  if (jur.includes('cantik') || jur.includes('spa')) {
    return [
      {
        nomor: 1,
        mitra: 'Martha Tilaar Salon & Day Spa Serpong',
        lamanya: '6 Bulan (180 Hari)',
        keterangan: 'Kompeten / Sangat Memuaskan (Nilai: 93)'
      }
    ];
  }
  if (jur.includes('hotel')) {
    return [
      {
        nomor: 1,
        mitra: 'Grand Serpong Hotel & Convention',
        lamanya: '6 Bulan (180 Hari)',
        keterangan: 'Kompeten / Sangat Memuaskan (Nilai: 91)'
      }
    ];
  }
  return [
    {
      nomor: 1,
      mitra: 'Instansi / Dunia Usaha & Industri Mitra Terpadu',
      lamanya: '3 Bulan (90 Hari)',
      keterangan: 'Kompeten / Sangat Memuaskan (Nilai: 90)'
    }
  ];
}

/**
 * Cek apakah user adalah Super Administrator
 */
export function isUserAdmin(user: User | null): boolean {
  return Boolean(user && user.role === 'admin');
}

/**
 * Dapatkan daftar kelas yang secara sah dibina oleh user sebagai Wali Kelas
 */
export function getWalasAssignedClasses(user: User | null, kelasList: Kelas[] = [], kejuruanList?: KejuruanDetail[]): Kelas[] {
  if (!user) return [];
  const activeKelas = kelasList.filter(k => isKelasActive(k, kejuruanList));
  if (user.role === 'admin') return activeKelas;

  // Jika user BUKAN walas (role !== 'walas' dan isWalas !== true), DIJAMIN BUKAN WALAS
  if (user.role !== 'walas' && !user.isWalas) {
    return [];
  }

  // Jika user secara eksplisit ditandai bukan walas
  if (user.isWalas === false) {
    return [];
  }

  const userNama = (user.nama || '').trim().toLowerCase();
  const userNip = (user.nipOrNis || '').trim().toLowerCase();
  const userId = (user.id || '').trim().toLowerCase();

  return activeKelas.filter(k => {
    const kWalasId = (k.idWalas || '').trim().toLowerCase();
    const kWalasNama = (k.namaWalas || '').trim().toLowerCase();

    // Rombel tanpa walas tidak boleh cocok
    if (!kWalasId && !kWalasNama) return false;

    const matchId = kWalasId && (kWalasId === userId || (userNip && kWalasId === userNip));
    const matchNama = kWalasNama && userNama && (
      kWalasNama === userNama ||
      kWalasNama.includes(userNama) ||
      userNama.includes(kWalasNama)
    );
    const matchExplicitId = Boolean(
      user.walasKelasId && (k.id === user.walasKelasId || user.walasKelasId.includes(k.id))
    );
    const matchExplicitIds = Boolean(
      user.walasKelasIds && user.walasKelasIds.includes(k.id)
    );
    const matchKelasWali = Boolean(
      user.kelasWali && (user.kelasWali.includes(k.id) || user.kelasWali.includes(k.namaKelas))
    );

    return matchId || matchNama || matchExplicitId || matchExplicitIds || matchKelasWali;
  });
}

/**
 * Cek apakah user adalah Wali Kelas yang sah
 * (Hanya true jika menjabat sebagai wali kelas dari salah satu kelas atau memiliki status walas resmi)
 */
export function isUserWalas(user: User | null, kelasList: Kelas[] = []): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role !== 'walas' && !user.isWalas) return false;
  if (user.isWalas === false) return false;
  if (user.role === 'walas') return true;
  
  const assigned = getWalasAssignedClasses(user, kelasList);
  return assigned.length > 0;
}

/**
 * Dapatkan daftar ekstrakurikuler yang secara sah dibina oleh user sebagai Pembina
 * Mendukung pembina murni maupun guru/walas yang merangkap jabatan sebagai pembina ekskul
 */
export function getPembinaAssignedEkskuls(user: User | null, ekskulList: Ekskul[] = []): Ekskul[] {
  if (!user) return [];
  if (user.role === 'admin') return ekskulList;

  const userNama = (user.nama || '').trim().toLowerCase();
  const userUsername = (user.username || '').trim().toLowerCase();
  const userId = (user.id || '').trim().toLowerCase();
  const userNip = (user.nipOrNis || '').trim().toLowerCase();
  const ekskulDibina = (user.ekskulDibina || []).map(id => id.trim().toLowerCase());

  return ekskulList.filter(e => {
    const eId = (e.id || '').trim().toLowerCase();
    const eNama = (e.nama || '').trim().toLowerCase();
    const idPembina = (e.idPembina || '').trim().toLowerCase();
    const pembina = (e.pembina || '').trim().toLowerCase();

    // 1. Match by direct idPembina ID or NIP
    if (idPembina && (idPembina === userId || (userNip && idPembina === userNip))) {
      return true;
    }

    // 2. Match by user.ekskulDibina list
    if (ekskulDibina.length > 0) {
      if (ekskulDibina.includes(eId) || ekskulDibina.includes(eNama)) {
        return true;
      }
    }

    // 3. Match by teacher's full name or username
    if (pembina) {
      const matchNama = userNama && (
        pembina === userNama ||
        pembina.includes(userNama) || 
        userNama.includes(pembina)
      );
      const matchUsername = userUsername && pembina.includes(userUsername);
      if (matchNama || matchUsername) return true;
    }

    return false;
  });
}

/**
 * Cek apakah user adalah Pembina Ekstrakurikuler yang sah
 * (Bisa berstatus Pembina Saja, atau Merangkap Guru + Pembina, atau Walas + Pembina)
 */
export function isUserPembina(user: User | null, ekskulList: Ekskul[] = []): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'pembina_ekskul') return true;
  if (user.isPembinaEkskul) return true;
  return getPembinaAssignedEkskuls(user, ekskulList).length > 0;
}

/**
 * Cek apakah user adalah "Guru Biasa" (Guru pengampu mapel yang tidak menjabat walas dan bukan pembina)
 */
export function isGuruBiasa(user: User | null, kelasList: Kelas[] = [], ekskulList: Ekskul[] = []): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'siswa' || user.role === 'calon_siswa') return false;
  const walas = isUserWalas(user, kelasList);
  const pembina = isUserPembina(user, ekskulList);
  return !walas && !pembina;
}

/**
 * Cek apakah user adalah Guru Biasa atau Pembina Biasa
 * (yaitu Guru atau Pembina yang BUKAN Wali Kelas dan BUKAN Administrator)
 * User dengan status ini HANYA berhak mengakses dan mencetak nilai/leger mata pelajaran yang diampunya sendiri secara pribadi.
 */
export function isGuruOrPembinaBiasa(user: User | null, kelasList: Kelas[] = []): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return false;
  const walas = isUserWalas(user, kelasList);
  return !walas;
}

/**
 * Dapatkan daftar mata pelajaran yang secara sah diampu oleh Guru / Pembina tertentu.
 * Jika Admin: mengembalikan seluruh mata pelajaran.
 * Jika Walas: mengembalikan seluruh mata pelajaran (karena walas berhak melihat/mengelola nilai rombelnya).
 * Jika Guru / Pembina biasa: HANYA mengembalikan mata pelajaran yang diampunya sendiri secara sah.
 */
export function getTeacherAssignedMapels(
  teacher: User | null,
  mapelList: Mapel[] = [],
  jadwalList: JadwalPelajaran[] = []
): Mapel[] {
  if (!teacher) return [];
  if (isUserAdmin(teacher)) return mapelList;

  const teacherMapelStrings = new Set<string>();
  (teacher.mapelDiampu || []).forEach(m => {
    if (m && typeof m === 'string') {
      teacherMapelStrings.add(m.trim().toLowerCase());
    }
  });
  if (teacher.mapel) teacherMapelStrings.add(teacher.mapel.trim().toLowerCase());
  if (teacher.mataPelajaran) teacherMapelStrings.add(teacher.mataPelajaran.trim().toLowerCase());

  const teacherName = (teacher.nama || '').trim().toLowerCase();
  const teacherId = (teacher.id || '').trim().toLowerCase();
  const teacherNip = (teacher.nipOrNis || teacher.idGuru || '').trim().toLowerCase();

  const matched: Mapel[] = [];
  const addedIds = new Set<string>();

  mapelList.forEach(m => {
    const mId = (m.id || '').toLowerCase();
    const mKode = (m.kode || '').toLowerCase();
    const mNama = (m.namaMapel || '').toLowerCase();
    const mGuru = (m.guruPengampu || '').toLowerCase();
    const mIdGuru = (m.idGuru || '').toLowerCase();

    let isMatch = false;

    // Direct match with IDs, codes, names in mapelDiampu / mapel
    if (teacherMapelStrings.has(mId) || teacherMapelStrings.has(mKode) || teacherMapelStrings.has(mNama)) {
      isMatch = true;
    }

    // Substring match
    if (!isMatch) {
      for (const str of teacherMapelStrings) {
        if (str.length > 2 && (mNama.includes(str) || str.includes(mNama))) {
          isMatch = true;
          break;
        }
      }
    }

    // Teacher name in mapel
    if (!isMatch && mGuru && teacherName) {
      if (mGuru === teacherName || mGuru.includes(teacherName) || teacherName.includes(mGuru)) {
        isMatch = true;
      }
    }

    // Teacher ID in mapel
    if (!isMatch && mIdGuru) {
      if (mIdGuru === teacherId || (teacherNip && mIdGuru === teacherNip)) {
        isMatch = true;
      }
    }

    if (isMatch && !addedIds.has(m.id)) {
      matched.push(m);
      addedIds.add(m.id);
    }
  });

  // Also check in Jadwal Pelajaran where this teacher is assigned
  jadwalList.forEach(j => {
    const jGuruId = (j.idGuru || '').toLowerCase();
    const jGuruName = (j.namaGuru || '').toLowerCase();
    const isThisTeacher = (teacherId && jGuruId === teacherId) ||
      (teacherNip && jGuruId === teacherNip) ||
      (teacherName && (jGuruName === teacherName || jGuruName.includes(teacherName) || teacherName.includes(jGuruName)));

    if (isThisTeacher && j.idMapel) {
      const found = mapelList.find(m => m.id === j.idMapel || m.kode === j.idMapel || m.namaMapel.toLowerCase() === (j.namaMapel || '').toLowerCase());
      if (found && !addedIds.has(found.id)) {
        matched.push(found);
        addedIds.add(found.id);
      }
    }
  });

  return matched;
}

/**
 * Dapatkan daftar kelas yang secara sah diajar oleh Guru tertentu
 */
export function getTeacherAssignedClasses(
  teacher: User | null,
  kelasList: Kelas[] = [],
  teacherMapels: Mapel[] = [],
  jadwalList: JadwalPelajaran[] = [],
  kejuruanList?: KejuruanDetail[]
): Kelas[] {
  if (!teacher) return [];
  const activeKelas = kelasList.filter(k => isKelasActive(k, kejuruanList));
  if (isUserAdmin(teacher)) return activeKelas;

  const matchedClassIds = new Set<string>();
  const teacherId = (teacher.id || '').toLowerCase();
  const teacherNip = (teacher.nipOrNis || teacher.idGuru || '').toLowerCase();
  const teacherName = (teacher.nama || '').toLowerCase();
  const teacherMapelIds = new Set(teacherMapels.map(m => m.id));

  // 1. Dari jadwal pelajaran
  jadwalList.forEach(j => {
    const jGuruId = (j.idGuru || '').toLowerCase();
    const jGuruName = (j.namaGuru || '').toLowerCase();
    const isThisTeacher = (teacherId && jGuruId === teacherId) ||
      (teacherNip && jGuruId === teacherNip) ||
      (teacherName && (jGuruName === teacherName || jGuruName.includes(teacherName) || teacherName.includes(jGuruName)));

    if (isThisTeacher || (j.idMapel && teacherMapelIds.has(j.idMapel))) {
      if (j.idKelas) matchedClassIds.add(j.idKelas);
      const foundK = activeKelas.find(k => k.namaKelas === j.namaKelas);
      if (foundK) matchedClassIds.add(foundK.id);
    }
  });

  // 2. Dari kecocokan tingkat & jurusan mapel yang diampu
  if (matchedClassIds.size === 0 && teacherMapels.length > 0) {
    teacherMapels.forEach(m => {
      activeKelas.forEach(k => {
        const matchTingkat = !m.tingkat || m.tingkat === 'Semua Tingkat' || m.tingkat === k.tingkat;
        const matchJurusan = !m.jurusan || m.jurusan === 'Semua Jurusan' || m.jurusan === 'Umum' ||
          k.jurusan.toLowerCase().includes(m.jurusan.toLowerCase()) ||
          m.jurusan.toLowerCase().includes(k.jurusan.toLowerCase());
        if (matchTingkat && matchJurusan) {
          matchedClassIds.add(k.id);
        }
      });
    });
  }

  const result = activeKelas.filter(k => matchedClassIds.has(k.id));
  if (result.length > 0) return result;
  // Guru biasa / pembina HANYA berhak mengakses kelas tempat mereka mengajar / bertugas
  if (isGuruOrPembinaBiasa(teacher, activeKelas)) {
    return [];
  }
  return activeKelas;
}

/**
 * Cek apakah user berhak mengakses nilai ekstrakurikuler
 * Sesuai aturan:
 * - Admin: Penuh
 * - Wali Kelas: Akses nilai ekskul siswa kelas binaannya
 * - Pembina: Hanya input nilai ekskul cabang yang dibinanya
 * - Guru Biasa: TIDAK BISA AKSES
 */
export function canAccessNilaiEkskul(user: User | null, ekskulList: Ekskul[] = [], kelasList: Kelas[] = []): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return true;
  if (isUserWalas(user, kelasList)) return true;
  if (isUserPembina(user, ekskulList)) return true;
  return false;
}

/**
 * Cek apakah user berhak mencetak kartu tanda pelajar rombel
 * (Hanya untuk Admin dan Wali Kelas)
 */
export function canPrintKartuRombel(user: User | null, kelasList: Kelas[] = []): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return true;
  return isUserWalas(user, kelasList);
}

/**
 * Cek apakah user berhak mengakses & mencetak Raport Resmi
 * Sesuai aturan:
 * - Walas: Akses rapot kelas binaannya
 * - Admin: Akses seluruh rapot
 * - Guru Biasa: TIDAK BISA AKSES
 * - Pembina: TIDAK BISA AKSES
 */
export function canAccessCetakRaport(user: User | null, kelasList: Kelas[] = []): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return true;
  return isUserWalas(user, kelasList);
}

/**
 * Cek apakah user berhak mengakses Leger Keseluruhan Kelas
 * Sesuai aturan:
 * - Walas: Akses leger keseluruhan rombel yang diampu
 * - Admin: Akses seluruh rombel
 * - Guru Biasa: TIDAK BISA AKSES (hanya leger mapel diampu)
 * - Pembina: TIDAK BISA AKSES
 */
export function canAccessLegerKeseluruhan(user: User | null, kelasList: Kelas[] = []): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return true;
  return isUserWalas(user, kelasList);
}

/**
 * Cek apakah user berhak mengakses menu Kenaikan Kelas & Kelulusan
 * Sesuai aturan:
 * - Walas: Akses kenaikan kelas & kelulusan rombel yang diampu
 * - Admin: Akses seluruh rombel
 * - Guru Biasa: TIDAK BISA AKSES
 * - Pembina: TIDAK BISA AKSES
 */
export function canAccessKenaikanKelas(user: User | null, kelasList: Kelas[] = []): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return true;
  return isUserWalas(user, kelasList);
}

/**
 * Cek apakah user berhak mengedit paket ujian & butir soal
 * Sesuai aturan:
 * - Admin: Berhak mengedit seluruh paket ujian & butir soal di sekolah
 * - Guru Mapel yang bersangkutan: Berhak mengedit paket ujian yang dibuatnya atau mapel yang diampunya
 * - Siswa / calon siswa / lainnya: TIDAK BISA AKSES
 */
export function canUserEditExam(user: User | null, exam: { idGuru?: string; namaGuru?: string; idMapel?: string; kodeMapel?: string; namaMapel?: string }, mapelList: Mapel[] = []): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role !== 'guru' && user.role !== 'walas') return false;

  // 1. Cek jika guru adalah pembuat paket ujian
  if (exam.idGuru && (exam.idGuru === user.id || (user.nipOrNis && exam.idGuru === user.nipOrNis))) {
    return true;
  }

  // 2. Cek jika nama pembuat cocok
  const uNama = (user.nama || '').trim().toLowerCase();
  const eNamaGuru = (exam.namaGuru || '').trim().toLowerCase();
  if (uNama && eNamaGuru && (uNama === eNamaGuru || uNama.includes(eNamaGuru) || eNamaGuru.includes(uNama))) {
    return true;
  }

  // 3. Cek apakah mapel ujian termasuk mapel yang diampu oleh guru
  const examMapelId = (exam.idMapel || '').toLowerCase();
  const examMapelKode = (exam.kodeMapel || '').toLowerCase();
  const examMapelNama = (exam.namaMapel || '').toLowerCase();

  if (user.mapelDiampu && user.mapelDiampu.length > 0) {
    const isDiampu = user.mapelDiampu.some(m => {
      const val = (m || '').trim().toLowerCase();
      if (!val) return false;
      return (
        val === examMapelId ||
        val === examMapelKode ||
        val === examMapelNama ||
        examMapelNama.includes(val) ||
        val.includes(examMapelNama) ||
        (val.includes('jasmani') && examMapelNama.includes('jasmani')) ||
        (val.includes('pjok') && (examMapelNama.includes('jasmani') || examMapelKode.includes('pjok'))) ||
        (val.includes('agama') && (examMapelNama.includes('agama') || examMapelKode.includes('pai'))) ||
        (val.includes('farmasi') && examMapelNama.includes('farmasi')) ||
        (val.includes('keperawatan') && examMapelNama.includes('keperawatan')) ||
        (val.includes('kecantikan') && examMapelNama.includes('kecantikan')) ||
        (val.includes('perhotelan') && examMapelNama.includes('perhotelan'))
      );
    });
    if (isDiampu) return true;
  }

  // 4. Guru spesifik berdasarkan nama/username (e.g. Pak Pika -> PJOK)
  const uUser = (user.username || '').toLowerCase();
  if ((uNama.includes('pika') || uUser.includes('pika')) && (examMapelNama.includes('jasmani') || examMapelNama.includes('pjok') || examMapelKode.includes('pjok'))) {
    return true;
  }

  return false;
}

/**
 * Filter mata pelajaran yang relevan dengan kelas / rombel tertentu
 * (Menyaring mapel kejuruan dan muatan umum sesuai jenjang kelas & jurusan)
 */
/**
 * Filter mata pelajaran yang relevan dengan kelas tertentu berdasarkan tingkat (X, XI, XII) dan jurusan.
 * Memastikan kode mapel yang muncul di Leger per kelas adalah yang diampu oleh kelas itu sendiri.
 */
export function getMatchingMapelForKelas(
  kelas: Kelas | undefined, 
  allMapel: Mapel[],
  classStudents?: User[]
): Mapel[] {
  if (!kelas || !allMapel || allMapel.length === 0) return allMapel || [];

  const kNama = (kelas.namaKelas || '').toLowerCase();
  const kJur = (kelas.jurusan || '').toLowerCase();
  const kTingkat = (kelas.tingkat || '').toUpperCase() || 
    (kNama.includes('xii') ? 'XII' : kNama.includes('xi') ? 'XI' : kNama.includes('x') ? 'X' : '');

  // Determine active religions in this class
  const classReligions = new Set<string>();
  if (classStudents && classStudents.length > 0) {
    classStudents.forEach(s => {
      const ag = ((s as any).agama || 'Islam').toLowerCase();
      classReligions.add(ag);
    });
  } else {
    // Default to Islam
    classReligions.add('islam');
  }

  const matched = allMapel.filter(m => {
    // 1. Cek tingkat kelas (X, XI, XII) jika mapel memiliki tingkat atau kode berakhiran tingkat
    const mTingkat = (m.tingkat || '').toUpperCase();
    const mKode = (m.kode || '').toUpperCase();
    
    // Check tingkat from code if m.tingkat is missing or 'SEMUA'
    let effectiveMTingkat = mTingkat;
    if (!effectiveMTingkat || effectiveMTingkat === 'SEMUA') {
      if (mKode.endsWith('-X') || mKode.includes('-X-') || mKode.endsWith(' X')) effectiveMTingkat = 'X';
      else if (mKode.endsWith('-XI') || mKode.includes('-XI-') || mKode.endsWith(' XI')) effectiveMTingkat = 'XI';
      else if (mKode.endsWith('-XII') || mKode.includes('-XII-') || mKode.endsWith(' XII')) effectiveMTingkat = 'XII';
    }

    if (effectiveMTingkat && effectiveMTingkat !== 'SEMUA' && kTingkat && effectiveMTingkat !== kTingkat) {
      return false;
    }

    const mJur = (m.jurusan || '').toLowerCase();
    const mNama = (m.namaMapel || '').toLowerCase();

    // 2. Filter mapel Agama: hanya tampilkan agama yang dianut siswa di kelas ini
    if (mNama.includes('pendidikan agama') || mNama.includes('budi pekerti') || mNama.includes('kepercayaan terhadap tuhan')) {
      if (mNama.includes('islam') || mKode.startsWith('PAI')) {
        return classReligions.has('islam');
      }
      if (mNama.includes('kristen') || mKode.includes('KRIS')) {
        return classReligions.has('kristen') || classReligions.has('protestan');
      }
      if (mNama.includes('katolik') || mNama.includes('katholik') || mKode.includes('KAT')) {
        return classReligions.has('katolik') || classReligions.has('katholik');
      }
      if (mNama.includes('hindu') || mKode.includes('PAH')) {
        return classReligions.has('hindu');
      }
      if (mNama.includes('buddha') || mKode.includes('PAB')) {
        return classReligions.has('buddha');
      }
      if (mNama.includes('konghucu') || mKode.includes('KONG')) {
        return classReligions.has('konghucu');
      }
      if (mNama.includes('kepercayaan') || mKode.includes('YME')) {
        return false;
      }
    }

    // 3. Filter Seni Pilihan (Kurikulum Merdeka SMK memilih Seni Rupa / Musik, hilangkan opsi yang tidak dipakai)
    if (mNama.startsWith('seni ') || mNama.includes('seni teater') || mNama.includes('seni tari') || mNama.includes('seni musik')) {
      if (mNama.includes('teater') || mNama.includes('tari')) {
        return false;
      }
    }

    // 4. Filter duplikasi PPKN vs PPAN: Kurikulum Merdeka menggunakan Pendidikan Pancasila (PPAN)
    if (mKode.startsWith('PPKN-') && allMapel.some(item => item.kode === `PPAN-${kTingkat}`)) {
      return false;
    }

    // 5. Mapel Umum berlaku untuk semua rombel
    if (!m.jurusan || mJur === 'semua' || mJur === 'semua jurusan' || mJur.includes('umum')) {
      return true;
    }

    // 6. Mapel Kejuruan: Farmasi
    if (kJur.includes('farmasi') || kNama.includes('farmasi')) {
      return (mJur.includes('farmasi') || mNama.includes('farmasi') || mNama.includes('farmako') || mNama.includes('resep')) &&
             !mJur.includes('keperawatan') && !mJur.includes('cantik') && !mJur.includes('hotel');
    }

    // 7. Mapel Kejuruan: Asisten Keperawatan
    if (kJur.includes('keperawatan') || kNama.includes('keperawatan')) {
      return (mJur.includes('keperawatan') || mNama.includes('keperawatan') || mNama.includes('kdm') || mNama.includes('tindakan keperawatan')) &&
             !mJur.includes('farmasi') && !mJur.includes('cantik') && !mJur.includes('hotel');
    }

    // 8. Mapel Kejuruan: Tata Kecantikan & Spa
    if (kJur.includes('cantik') || kJur.includes('spa') || kNama.includes('cantik') || kNama.includes('spa')) {
      return (mJur.includes('cantik') || mJur.includes('spa') || mNama.includes('cantik') || mNama.includes('spa') || mNama.includes('kulit') || mNama.includes('rambut')) &&
             !mJur.includes('farmasi') && !mJur.includes('keperawatan') && !mJur.includes('hotel');
    }

    // 9. Mapel Kejuruan: Perhotelan
    if (kJur.includes('hotel') || kNama.includes('hotel')) {
      return (mJur.includes('hotel') || mNama.includes('hotel') || mNama.includes('hospitality') || mNama.includes('housekeeping') || mNama.includes('front office')) &&
             !mJur.includes('farmasi') && !mJur.includes('keperawatan') && !mJur.includes('cantik');
    }

    // 10. Mapel Rombel X Kesehatan Terpadu (Fase E): mencakup Dasar Teknologi Farmasi & Dasar Layanan Kesehatan
    if (kJur.includes('kesehatan') || kNama.includes('kesehatan')) {
      if (mJur.includes('farmasi') || mJur.includes('keperawatan') || mJur.includes('kesehatan')) {
        return !mJur.includes('cantik') && !mJur.includes('hotel');
      }
      return false;
    }

    // Default kejuruan yang cocok
    return mJur === kJur;
  });

  return matched.length > 0 ? matched : allMapel;
}

/**
 * Robust matching between an attendance record and a student user account.
 * Accounts for NIPD (with or without dots), NISN, userId, ID suffix, username, and normalized student name.
 */
export function isRecordForStudent(
  record: AbsensiRecord | null | undefined, 
  student: User | null | undefined
): boolean {
  if (!record || !student) return false;
  
  // 1. Direct ID match or record ID containing student ID
  if (record.userId && student.id && record.userId === student.id) return true;
  if (record.id && student.id && record.id.endsWith(`-${student.id}`)) return true;
  
  // 2. NIPD match (exact and dotless e.g. "24.25.10.001" vs "242510001")
  const studentNipd = (student.nipd || student.nipOrNis || '').trim();
  const recNipd = (record.nipd || '').trim();
  if (recNipd && studentNipd) {
    if (recNipd === studentNipd) return true;
    if (recNipd.replace(/\./g, '') === studentNipd.replace(/\./g, '')) return true;
    if (recNipd.toLowerCase() === studentNipd.toLowerCase()) return true;
  }
  // Match NIPD against student username (e.g. username is 242510001 or 24.25.10.001)
  if (recNipd && student.username) {
    const sUser = student.username.trim();
    if (recNipd === sUser || recNipd.replace(/\./g, '') === sUser.replace(/\./g, '')) return true;
  }
  
  // 3. NISN match
  const studentNisn = (student.nisn || student.username || '').trim();
  const recNisn = (record.nisn || '').trim();
  if (recNisn && studentNisn) {
    if (recNisn === studentNisn) return true;
    if (recNisn.toLowerCase() === studentNisn.toLowerCase()) return true;
  }
  if (student.nipOrNis && recNisn && recNisn === student.nipOrNis) return true;
  if (student.nisn && recNipd && recNipd === student.nisn) return true;
  if (studentNipd && recNisn && recNisn === studentNipd) return true;
  
  // 4. Normalized Name match (case-insensitive & stripped of punctuation/accents)
  const recNama = (record.namaSiswa || (record as any).nama || '').trim().toLowerCase();
  const studNama = (student.nama || '').trim().toLowerCase();
  if (recNama && studNama) {
    if (recNama === studNama) return true;
    const strippedRec = recNama.replace(/[^a-z0-9]/g, '');
    const strippedStud = studNama.replace(/[^a-z0-9]/g, '');
    if (strippedRec && strippedStud && strippedRec === strippedStud) return true;
  }
  
  return false;
}

/**
 * Clean and normalize scanned QR Code text from camera or barcode scanner.
 */
export function cleanScannedQrString(raw: string): string {
  if (!raw) return '';
  let str = raw.trim();
  // Strip URL query parameters if full URL was scanned
  if (str.startsWith('http://') || str.startsWith('https://')) {
    try {
      const url = new URL(str);
      const q = url.searchParams.get('id') || url.searchParams.get('nipd') || url.searchParams.get('nisn') || url.pathname.split('/').pop();
      if (q) str = q;
    } catch {}
  }
  // If formatted like BPM-SISWA|24.25.10.001|...
  if (str.includes('|')) {
    const parts = str.split('|');
    if (parts[0] === 'BPM-SISWA' && parts[1]) {
      str = parts[1];
    } else if (parts[0] === 'BPM-ABSEN') {
      // Daily QR code: keep intact or token
      return str;
    }
  }
  str = str.replace(/^(BPM-SISWA:|NIPD:|NISN:|ID:)/i, '').trim();
  return str;
}

/**
 * Normalizes class names by stripping "Kelas " prefix, collapsing whitespace, and converting to lowercase.
 */
export function normalizeKelas(k: string | undefined | null): string {
  if (!k) return '';
  return String(k).replace(/^Kelas\s+/i, '').trim().toLowerCase();
}

/**
 * Checks if two class names match, robust against "Kelas " prefix, casing, hyphens, and whitespace differences.
 */
export function isSameKelas(k1: string | undefined | null, k2: string | undefined | null): boolean {
  if (!k1 || !k2) return false;
  const n1 = normalizeKelas(k1);
  const n2 = normalizeKelas(k2);
  if (n1 === n2) return true;
  const c1 = n1.replace(/[^a-z0-9]/g, '');
  const c2 = n2.replace(/[^a-z0-9]/g, '');
  return c1.length > 0 && c1 === c2;
}

/**
 * Normalizes teacher names by stripping common Indonesian academic titles / gelar
 * (e.g., S.Pd, S.Pd.I, S.Kom, M.Pd, S.Kep, M.Kep, Dra, Drs, Ns, M.Si, S.Farm, S.Tr.Keb, S.Sos, etc.)
 * and removing punctuation so that "Mia Jamiah, S.Pd" and "Mia Jamiah" match cleanly.
 */
export function normalizeTeacherName(name?: string | null): string {
  if (!name) return '';
  let str = String(name).trim().toLowerCase();
  
  // Repeatedly strip titles until stable (handles prefixes like Drs. H., Dr. Hj., Apt. Dra., etc.)
  let prev = '';
  while (prev !== str) {
    prev = str;
    str = str
      .replace(/\b(dr|dra|drs|prof|ir|ns|h|hj|kh|ust|apt)\.?\s+/gi, '')
      .replace(/,\s*(s\.pd\.i|s\.pd|m\.pd|s\.kom|m\.kom|s\.kep|m\.kep|s\.farm|m\.farm|m\.kes|s\.kes|s\.si|m\.si|s\.t|m\.t|s\.e|m\.m|s\.sos|m\.sos|s\.h|m\.h|s\.ag|m\.ag|s\.tr\.keb|s\.tr\.par|s\.tr|s\.par|s\.keb|ns|amd|a\.md|a\.ma|gr)\b\.?/gi, '')
      .replace(/\b(s\.pd\.i|s\.pd|m\.pd|s\.kom|m\.kom|s\.kep|m\.kep|s\.farm|m\.farm|m\.kes|s\.kes|s\.si|m\.si|s\.t|m\.t|s\.e|m\.m|s\.sos|m\.sos|s\.h|m\.h|s\.ag|m\.ag|s\.tr\.keb|s\.tr\.par|s\.tr|s\.par|s\.keb|ns|apt)\b\.?/gi, '');
  }

  return str.replace(/[^a-z0-9]/gi, '');
}

/**
 * Normalizes mapel names by removing punctuation and extra whitespace for robust comparison.
 */
export function normalizeMapelName(name?: string | null): string {
  if (!name) return '';
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '');
}

/**
 * Returns the current date in YYYY-MM-DD format based on Indonesia (Asia/Jakarta / WIB) timezone,
 * with graceful fallback to user's local calendar day.
 * NEVER uses UTC toISOString() which lags behind by 1 day during Indonesian school morning hours!
 */
export function getLocalDateString(d: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
  } catch (_) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Daftar Hari Libur Nasional & Tanggal Merah Spesifik (Berdasarkan SKB 3 Menteri)
 * Format key: YYYY-MM-DD
 */
export const DAFTAR_LIBUR_NASIONAL: Record<string, string> = {
  // Tahun 2025
  '2025-01-01': 'Tahun Baru 2025 Masehi',
  '2025-01-27': "Isra Mi'raj Nabi Muhammad SAW",
  '2025-01-29': 'Tahun Baru Imlek 2576 Kongzili',
  '2025-03-29': 'Hari Suci Nyepi (Tahun Baru Saka 1947)',
  '2025-03-31': 'Hari Raya Idul Fitri 1446 H',
  '2025-04-01': 'Hari Raya Idul Fitri 1446 H (Hari Ke-2)',
  '2025-04-18': 'Wafat Yesus Kristus',
  '2025-04-20': 'Hari Paskah',
  '2025-05-01': 'Hari Buruh Internasional',
  '2025-05-12': 'Hari Raya Waisak 2569 BE',
  '2025-05-29': 'Kenaikan Yesus Kristus',
  '2025-06-01': 'Hari Lahir Pancasila',
  '2025-06-07': 'Hari Raya Idul Adha 1446 H',
  '2025-06-27': 'Tahun Baru Islam 1447 H',
  '2025-08-17': 'Hari Kemerdekaan Republik Indonesia Ke-80',
  '2025-09-05': 'Maulid Nabi Muhammad SAW',
  '2025-12-25': 'Hari Raya Natal',

  // Tahun 2026 (Tahun Akademik Berjalan)
  '2026-01-01': 'Tahun Baru 2026 Masehi',
  '2026-01-16': "Isra Mi'raj Nabi Muhammad SAW",
  '2026-02-17': 'Tahun Baru Imlek 2577 Kongzili',
  '2026-03-19': 'Hari Suci Nyepi (Tahun Baru Saka 1948)',
  '2026-03-20': 'Hari Raya Idul Fitri 1447 H',
  '2026-03-21': 'Hari Raya Idul Fitri 1447 H (Hari Ke-2)',
  '2026-03-22': 'Cuti Bersama Hari Raya Idul Fitri 1447 H',
  '2026-03-23': 'Cuti Bersama Hari Raya Idul Fitri 1447 H',
  '2026-03-24': 'Cuti Bersama Hari Raya Idul Fitri 1447 H',
  '2026-04-03': 'Wafat Yesus Kristus',
  '2026-04-05': 'Hari Paskah',
  '2026-05-01': 'Hari Buruh Internasional',
  '2026-05-14': 'Kenaikan Yesus Kristus',
  '2026-05-27': 'Hari Raya Idul Adha 1447 H',
  '2026-05-31': 'Hari Raya Waisak 2570 BE',
  '2026-06-01': 'Hari Lahir Pancasila',
  '2026-06-16': 'Tahun Baru Islam 1448 H',
  '2026-08-17': 'Hari Kemerdekaan Republik Indonesia Ke-81',
  '2026-08-25': 'Maulid Nabi Muhammad SAW',
  '2026-12-25': 'Hari Raya Natal',
  '2026-12-26': 'Cuti Bersama Hari Raya Natal',

  // Tahun 2027
  '2027-01-01': 'Tahun Baru 2027 Masehi',
  '2027-02-06': 'Tahun Baru Imlek 2578 Kongzili',
  '2027-03-09': 'Hari Raya Idul Fitri 1448 H',
  '2027-03-10': 'Hari Raya Idul Fitri 1448 H (Hari Ke-2)',
  '2027-03-26': 'Wafat Yesus Kristus',
  '2027-05-01': 'Hari Buruh Internasional',
  '2027-05-06': 'Kenaikan Yesus Kristus',
  '2027-05-20': 'Hari Raya Waisak 2571 BE',
  '2027-06-01': 'Hari Lahir Pancasila',
  '2027-08-17': 'Hari Kemerdekaan Republik Indonesia Ke-82',
  '2027-12-25': 'Hari Raya Natal',
};

/**
 * Mendapatkan keterangan libur nasional atau cuti bersama untuk tanggal tertentu.
 * Mengembalikan string keterangan atau null jika hari biasa.
 */
export function getKeteranganLiburNasional(dateInput: string | Date = new Date()): string | null {
  try {
    const dateStr = typeof dateInput === 'string' && dateInput.includes('-')
      ? dateInput.trim()
      : getLocalDateString(dateInput instanceof Date ? dateInput : new Date());

    // Cek daftar paten libur nasional
    if (DAFTAR_LIBUR_NASIONAL[dateStr]) {
      return DAFTAR_LIBUR_NASIONAL[dateStr];
    }

    // Cek daftar custom libur sekolah tambahan dari localStorage jika ada
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem('custom_libur_sekolah_list');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object' && parsed[dateStr]) {
            return String(parsed[dateStr]);
          }
        }
      } catch (_) {}
    }

    return null;
  } catch (_) {
    return null;
  }
}

/**
 * Cek apakah tanggal merupakan hari libur nasional atau cuti bersama.
 */
export function isLiburNasional(dateInput: string | Date = new Date()): boolean {
  return getKeteranganLiburNasional(dateInput) !== null;
}

/**
 * Tambah hari libur sekolah spesifik tambahan secara dinamis
 */
export function addCustomHariLibur(tanggal: string, keterangan: string): void {
  if (!tanggal || !keterangan) return;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem('custom_libur_sekolah_list');
      const current = stored ? JSON.parse(stored) : {};
      current[tanggal] = keterangan;
      localStorage.setItem('custom_libur_sekolah_list', JSON.stringify(current));
    } catch (_) {}
  }
}

/**
 * Hapus hari libur sekolah spesifik tambahan
 */
export function removeCustomHariLibur(tanggal: string): void {
  if (!tanggal) return;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem('custom_libur_sekolah_list');
      if (stored) {
        const current = JSON.parse(stored);
        delete current[tanggal];
        localStorage.setItem('custom_libur_sekolah_list', JSON.stringify(current));
      }
    } catch (_) {}
  }
}

/**
 * Mengembalikan alasan mengapa suatu hari tidak efektif KBM (Akhir Pekan atau Libur Nasional).
 * Mengembalikan null jika hari tersebut merupakan hari sekolah efektif.
 */
export function getAlasanHariTidakEfektif(dateInput: string | Date = new Date()): string | null {
  try {
    const dateStr = typeof dateInput === 'string' && dateInput.includes('-')
      ? dateInput.trim()
      : getLocalDateString(dateInput instanceof Date ? dateInput : new Date());

    const hari = getNamaHariIndo(dateStr);
    if (hari === 'Sabtu' || hari === 'Minggu') {
      return `Libur Akhir Pekan (${hari}) - Sistem 5 Hari Sekolah`;
    }
    const liburNasional = getKeteranganLiburNasional(dateStr);
    if (liburNasional) {
      return `Hari Libur Nasional: ${liburNasional}`;
    }
    return null;
  } catch (_) {
    return null;
  }
}

/**
 * Cek apakah suatu tanggal merupakan hari sekolah efektif (Senin - Jumat dan bukan Hari Libur Nasional).
 * SMK Bakti Putra Mandiri menerapkan sistem 5 hari sekolah:
 * 1. Sabtu dan Minggu adalah libur akhir pekan.
 * 2. Tanggal merah / Hari Libur Nasional resmi adalah hari libur (otomatis tidak ada KBM dan tidak ada presensi).
 */
export function isHariSekolahEfektif(dateInput: string | Date = new Date()): boolean {
  try {
    let d: Date;
    let dateStr: string;
    if (typeof dateInput === 'string') {
      const parts = dateInput.split('-');
      if (parts.length === 3) {
        // Construct local Date noon to avoid UTC midnight drift
        d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
        dateStr = dateInput.trim();
      } else {
        d = new Date(dateInput);
        dateStr = getLocalDateString(d);
      }
    } else {
      d = dateInput;
      dateStr = getLocalDateString(d);
    }

    // 1. Cek Akhir Pekan (Sabtu & Minggu)
    const day = d.getDay(); // 0 = Minggu, 6 = Sabtu
    if (day === 0 || day === 6) {
      return false;
    }

    // 2. Cek Hari Libur Nasional Spesifik
    if (isLiburNasional(dateStr)) {
      return false;
    }

    return true;
  } catch (_) {
    return true;
  }
}

/**
 * Mengembalikan nama hari dalam bahasa Indonesia dari tanggal tertentu.
 */
export function getNamaHariIndo(dateInput: string | Date = new Date()): string {
  const hariList = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  try {
    let d: Date;
    if (typeof dateInput === 'string') {
      const parts = dateInput.split('-');
      if (parts.length === 3) {
        d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
      } else {
        d = new Date(dateInput);
      }
    } else {
      d = dateInput;
    }
    return hariList[d.getDay()] || 'Senin';
  } catch (_) {
    return 'Senin';
  }
}

/**
 * Dapatkan tanggal (format YYYY-MM-DD) untuk hari tertentu (Senin - Minggu)
 * pada minggu yang sama dengan referenceDate (default: hari ini).
 * Senin adalah awal pekan (indeks 0 atau 1).
 */
export function getDateForDayInSameWeek(
  targetDayName: string, 
  referenceDateInput: string | Date = new Date()
): string {
  const normalizedDay = (targetDayName || '').trim().toLowerCase();
  
  // Mapping nama hari ke offset dari hari Senin (0 = Senin, 1 = Selasa, ..., 6 = Minggu)
  const dayOffsetMap: Record<string, number> = {
    senin: 0,
    selasa: 1,
    rabu: 2,
    kamis: 3,
    jumat: 4,
    sabtu: 5,
    minggu: 6,
  };

  const targetOffset = dayOffsetMap[normalizedDay];
  if (targetOffset === undefined) {
    return typeof referenceDateInput === 'string' && referenceDateInput.includes('-')
      ? referenceDateInput
      : getLocalDateString(referenceDateInput instanceof Date ? referenceDateInput : new Date());
  }

  let refDate: Date;
  if (typeof referenceDateInput === 'string') {
    const parts = referenceDateInput.split('-');
    if (parts.length === 3) {
      refDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
    } else {
      refDate = new Date(referenceDateInput);
    }
  } else {
    refDate = new Date(referenceDateInput.getTime());
  }

  const currentDayOfWeek = refDate.getDay(); // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
  const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

  const mondayDate = new Date(refDate);
  mondayDate.setDate(refDate.getDate() + diffToMonday);

  const targetDate = new Date(mondayDate);
  targetDate.setDate(mondayDate.getDate() + targetOffset);

  return getLocalDateString(targetDate);
}

/**
 * Cek apakah hari atau tanggal merupakan akhir pekan (Sabtu atau Minggu).
 * SMK Bakti Putra Mandiri menerapkan sistem 5 hari sekolah: Sabtu & Minggu libur otomatis tidak ada absen.
 */
export function isWeekend(input: string | Date = new Date()): boolean {
  try {
    if (typeof input === 'string') {
      const trimmed = input.trim().toLowerCase();
      if (trimmed === 'sabtu' || trimmed === 'minggu') return true;
      if (trimmed === 'senin' || trimmed === 'selasa' || trimmed === 'rabu' || trimmed === 'kamis' || trimmed === 'jumat') return false;
      const parts = trimmed.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
        const day = d.getDay();
        return day === 0 || day === 6;
      }
    }
    const d = input instanceof Date ? input : new Date(input);
    const day = d.getDay();
    return day === 0 || day === 6;
  } catch (_) {
    return false;
  }
}

/**
 * Menyaring dan membersihkan catatan absensi secara menyeluruh:
 * 1. Mengeliminasi hari libur akhir pekan (Sabtu & Minggu libur pada sistem 5 hari sekolah).
 * 2. Mengeliminasi duplikasi: Memastikan satu siswa hanya memiliki MAKSIMAL 1 catatan presensi per tanggal sekolah efektif.
 *    Jika tercatat ganda pada tanggal yang sama, pilih catatan Hadir / waktu presensi valid dan tandai rekaman ganda lainnya sebagai obsolete untuk dibersihkan.
 */
export function sanitizeAndDeduplicateAbsensiRecords(records: AbsensiRecord[]): {
  clean: AbsensiRecord[];
  obsoleteIds: string[];
} {
  if (!Array.isArray(records) || records.length === 0) {
    return { clean: [], obsoleteIds: [] };
  }

  const obsoleteIds: string[] = [];
  const map = new Map<string, AbsensiRecord>();

  records.forEach(r => {
    if (!r || !r.id || !r.tanggal) {
      if (r?.id) obsoleteIds.push(r.id);
      return;
    }

    // 1. Eliminasi akhir pekan (Sabtu & Minggu bukan hari efektif KBM di SMK BPM)
    if (!isHariSekolahEfektif(r.tanggal)) {
      obsoleteIds.push(r.id);
      return;
    }

    // 2. Kunci unik per siswa dan per tanggal
    const nipdKey = (r.nipd || '').trim().replace(/[^a-z0-9]/gi, '').toLowerCase();
    const nisnKey = (r.nisn || '').trim().replace(/[^a-z0-9]/gi, '').toLowerCase();
    const userKey = (r.userId || '').trim().toLowerCase();
    const nameKey = (r.namaSiswa || '').trim().replace(/[^a-z0-9]/gi, '').toLowerCase();
    
    // Gunakan pengenal siswa paling spesifik
    const studentIdentifier = nipdKey || nisnKey || userKey || nameKey;
    if (!studentIdentifier) {
      obsoleteIds.push(r.id);
      return;
    }
    const dateKey = `${r.tanggal.trim()}|${studentIdentifier}`;

    if (!map.has(dateKey)) {
      map.set(dateKey, r);
    } else {
      const existing = map.get(dateKey)!;
      const isExistingHadir = existing.status === 'Hadir' || existing.status === 'Terlambat';
      const isNewHadir = r.status === 'Hadir' || r.status === 'Terlambat';

      if (!isExistingHadir && isNewHadir) {
        obsoleteIds.push(existing.id);
        map.set(dateKey, r);
      } else if (isExistingHadir && !isNewHadir) {
        obsoleteIds.push(r.id);
      } else {
        const timeExisting = existing.waktu || '99:99';
        const timeNew = r.waktu || '99:99';
        if (timeNew < timeExisting) {
          obsoleteIds.push(existing.id);
          map.set(dateKey, r);
        } else {
          obsoleteIds.push(r.id);
        }
      }
    }
  });

  return {
    clean: Array.from(map.values()),
    obsoleteIds: Array.from(new Set(obsoleteIds)),
  };
}

/**
 * Returns current local time in HH:mm or HH:mm:ss format in WIB (Asia/Jakarta).
 */
export function getLocalTimeString(d: Date = new Date(), withSeconds: boolean = false): string {
  try {
    const parts = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: withSeconds ? '2-digit' : undefined,
      hour12: false
    }).format(d);
    return parts.replace(/\./g, ':');
  } catch (_) {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return withSeconds ? `${h}:${m}:${s}` : `${h}:${m}`;
  }
}

/**
 * Helper to determine whether a teacher/walas has official PNS/P3K NIP or uses "ID Guru".
 * In rapot: use "NIP. [nip]" if PNS/P3K, otherwise use "ID Guru: [idGuru]".
 */
export function getTeacherIdLabel(user: User | null | undefined): { label: string; value: string; isPns: boolean } {
  if (!user) return { label: 'ID Guru', value: '-', isPns: false };

  const status = (user.statusKepegawaian || '').toUpperCase();
  const isPnsStatus = user.isPns === true || status === 'PNS' || status.includes('P3K') || status.includes('PPPK');
  const hasOfficialNip = Boolean(user.nip && user.nip.trim().length >= 10);

  if (isPnsStatus || hasOfficialNip) {
    const val = user.nip || user.nipOrNis || '-';
    return { label: 'NIP', value: val, isPns: true };
  }

  // Non-PNS (Yayasan, GTY, GTT, Honorer, etc.) -> Use Id Guru
  const val = user.idGuru || user.nipOrNis || user.username || user.id || '-';
  return { label: 'ID Guru', value: val, isPns: false };
}

/**
 * Helper to determine whether Kepala Sekolah has official PNS/P3K NIP or uses "ID Guru".
 * In rapot: use "NIP. [nip]" if PNS/P3K, otherwise use "ID Guru: [idGuru]".
 */
export function getKepsekIdLabel(
  schoolInfo: any | null | undefined,
  kepsekUser?: User | null
): { label: string; value: string; isPns: boolean } {
  const isPnsExplicit = schoolInfo?.isPnsKepsek === true || (schoolInfo?.statusPnsKepsek && String(schoolInfo.statusPnsKepsek).toUpperCase() === 'PNS');
  
  if (isPnsExplicit && schoolInfo?.nipKepalaSekolah) {
    return { label: 'NIP', value: schoolInfo.nipKepalaSekolah, isPns: true };
  }

  // Non-PNS (Yayasan SMK BPM) -> Tampilkan ID Guru resmi Kepala Sekolah (misal: 20131976070505)
  const val = schoolInfo?.idGuruKepalaSekolah || 
              kepsekUser?.idGuru || 
              (kepsekUser?.nipOrNis && kepsekUser.nipOrNis.length >= 10 ? kepsekUser.nipOrNis : '') ||
              (schoolInfo?.nipKepalaSekolah && schoolInfo.nipKepalaSekolah.startsWith('2013') ? schoolInfo.nipKepalaSekolah : '20131976070505');
  return { label: 'ID Guru', value: val, isPns: false };
}

/**
 * Returns string signature label for teacher in rapot/leger (e.g. "NIP. 1985..." if PNS/P3K or "ID Guru. 20131973040401...")
 */
export function formatTeacherIdentifier(user?: any | null): string {
  if (!user) return 'ID Guru. -';
  const { label, value } = getTeacherIdLabel(user);
  return `${label}. ${value}`;
}

/**
 * Returns string signature label for Kepala Sekolah in rapot/leger (e.g. "ID Guru. 20131976070505")
 */
export function formatKepsekIdentifier(schoolInfo?: any | null, kepsekUser?: User | null): string {
  const { label, value } = getKepsekIdLabel(schoolInfo, kepsekUser);
  return `${label}. ${value}`;
}

/**
 * Ekstrak daftar seluruh mata pelajaran yang diampu oleh seorang guru secara seragam.
 * Mendukung t.mapelDiampu (array atau string dipisah koma/titik koma), t.mapel, t.mataPelajaran, t.mapel_diampu, t.subjects.
 */
export function extractTeacherMapelList(t: User | undefined | null): string[] {
  if (!t) return [];
  const result: string[] = [];

  const addItems = (val: any) => {
    if (!val) return;
    if (Array.isArray(val)) {
      val.forEach(item => {
        if (typeof item === 'string') {
          item.split(/[,;\n]+/).forEach(s => {
            const clean = s.trim();
            if (clean && !result.includes(clean)) result.push(clean);
          });
        }
      });
    } else if (typeof val === 'string') {
      val.split(/[,;\n]+/).forEach(s => {
        const clean = s.trim();
        if (clean && !result.includes(clean)) result.push(clean);
      });
    }
  };

  addItems(t.mapelDiampu);
  addItems(t.mapel);
  addItems(t.mataPelajaran);
  addItems((t as any).mapel_diampu);
  addItems((t as any).subjects);
  addItems((t as any).subject);

  return result;
}

/**
 * Cek apakah seorang guru secara EKSPLISIT mengampu mata pelajaran tertentu di profil Data Guru-nya
 * (melalui t.mapelDiampu, t.mapel, t.mataPelajaran, t.subjects, atau t.jabatanTambahan).
 * Fungsi ini MURNI membaca data dari Data Guru (usersList / AdminGuruTab) tanpa bias dari field guruPengampu mapel.
 */
export function isTeacherExplicitlyAssignedToMapel(t: User | undefined | null, mapel: Mapel | undefined | null): boolean {
  if (!t || !mapel) return false;
  if (t.role === 'admin' || t.role === 'siswa' || t.role === 'calon_siswa' || t.statusAktif === false) return false;

  const mId = (mapel.id || '').trim().toLowerCase();
  const mKode = normalizeMapelName(mapel.kode || '');
  const mNorm = normalizeMapelName(mapel.namaMapel || '');

  // 1. Tautan melalui daftar mapelDiampu guru (mendukung ID mapel, kode mapel, nama mapel, dan varian)
  const diampuList = extractTeacherMapelList(t);
  const matchedInList = diampuList.some(item => {
    if (!item) return false;
    const itemClean = item.trim().toLowerCase();
    const itemNorm = normalizeMapelName(item);

    if (itemClean === mId) return true;
    if (mKode && itemClean === mKode) return true;
    if (itemNorm === mNorm) return true;
    if (itemClean === (mapel.namaMapel || '').trim().toLowerCase()) return true;

    if (itemNorm.length >= 4 && mNorm.length >= 4) {
      if (mNorm.includes(itemNorm) || itemNorm.includes(mNorm)) return true;
    }

    // Singkatan & akronim umum kurikulum sekolah
    const isMtk = mNorm.includes('matematika') && (itemNorm === 'mtk' || itemNorm === 'matematika');
    const isBIndo = mNorm.includes('bahasaindonesia') && (itemNorm.includes('indonesia') || itemNorm === 'bind' || itemNorm === 'bindo');
    const isBIng = mNorm.includes('bahasainggris') && (itemNorm.includes('inggris') || itemNorm === 'bing' || itemNorm === 'binggris');
    const isPjok = (mNorm.includes('jasmani') || mNorm.includes('pjok') || mNorm.includes('olahraga')) && (itemNorm.includes('pjok') || itemNorm.includes('jasmani') || itemNorm.includes('penjas') || itemNorm.includes('olahraga'));
    const isPai = (mNorm.includes('agamaislam') || mNorm.includes('pai') || mNorm.includes('agama')) && (itemNorm.includes('pai') || itemNorm.includes('agamaislam') || itemNorm === 'agama');
    const isPpkn = (mNorm.includes('pancasila') || mNorm.includes('kewarganegaraan')) && (itemNorm.includes('pancasila') || itemNorm.includes('ppkn') || itemNorm === 'pkn');
    const isSunda = mNorm.includes('sunda') && (itemNorm.includes('sunda') || itemNorm.includes('mulok'));
    const isBk = (mNorm.includes('konseling') || mNorm.includes('bk')) && (itemNorm === 'bk' || itemNorm.includes('konseling') || itemNorm.includes('konselor') || itemNorm === 'bp');
    const isInf = (mNorm.includes('informatika') || mNorm.includes('komputer')) && (itemNorm === 'informatika' || itemNorm === 'inf' || itemNorm.includes('komputer'));
    const isTik = (mNorm.includes('teknologiinformasi') || mNorm.includes('simdig') || mNorm.includes('simulasi')) && 
                  (itemNorm.includes('teknologiinformasi') || itemNorm === 'tik' || itemNorm.includes('simdig') || itemNorm.includes('simulasi'));
    const isIpas = (mNorm.includes('projekipas') || mNorm === 'ipas' || mNorm.includes('proyekipas')) && itemNorm.includes('ipas');
    const isPkk = (mNorm.includes('kewirausahaan') || mNorm.includes('pkk') || mNorm.includes('kreatif')) && (itemNorm.includes('pkk') || itemNorm.includes('kewirausahaan') || itemNorm.includes('kreatif') || itemNorm === 'pkwu');
    const isSejarah = mNorm.includes('sejarah') && itemNorm.includes('sejarah');
    const isSeni = mNorm.includes('seni') && itemNorm.includes('seni');

    // Kejuruan Farmasi
    const isFarmasi = (mNorm.includes('farmasi') || mNorm.includes('farmakologi') || mNorm.includes('resep') || mNorm.includes('obat') || mNorm.includes('farmakognosi') || mNorm.includes('kimiafarmasi')) &&
                      (itemNorm.includes('farmasi') || itemNorm.includes('farmakologi') || itemNorm.includes('resep') || itemNorm.includes('obat') || itemNorm.includes('farmakognosi') || itemNorm.includes('kimiafarmasi'));

    // Kejuruan Keperawatan
    const isKeperawatan = (mNorm.includes('keperawatan') || mNorm.includes('kebutuhandasar') || mNorm.includes('kdm') || mNorm.includes('anatomi') || mNorm.includes('penyakit') || mNorm.includes('diagnostik')) &&
                          (itemNorm.includes('keperawatan') || itemNorm.includes('kebutuhandasar') || itemNorm.includes('kdm') || itemNorm.includes('anatomi') || itemNorm.includes('penyakit') || itemNorm.includes('diagnostik'));

    // Kejuruan Kecantikan
    const isKecantikan = (mNorm.includes('kecantikan') || mNorm.includes('kulit') || mNorm.includes('wajah') || mNorm.includes('rambut') || mNorm.includes('spa') || mNorm.includes('rias') || mNorm.includes('sanggul')) &&
                         (itemNorm.includes('kecantikan') || itemNorm.includes('kulit') || itemNorm.includes('wajah') || itemNorm.includes('rambut') || itemNorm.includes('spa') || itemNorm.includes('rias') || itemNorm.includes('sanggul'));

    // Kejuruan Perhotelan
    const isHotel = (mNorm.includes('hotel') || mNorm.includes('frontoffice') || mNorm.includes('housekeeping') || mNorm.includes('laundry') || mNorm.includes('tatahidang')) &&
                    (itemNorm.includes('hotel') || itemNorm.includes('frontoffice') || itemNorm.includes('housekeeping') || itemNorm.includes('laundry') || itemNorm.includes('tatahidang'));

    return isMtk || isBIndo || isBIng || isPjok || isPai || isPpkn || isSunda || isBk || isInf || isTik || isIpas || isPkk || isSejarah || isSeni || isFarmasi || isKeperawatan || isKecantikan || isHotel;
  });

  if (matchedInList) return true;

  // 2. Tautan melalui Jabatan Tambahan di Data Guru (misal: "Guru Bahasa Inggris", "Guru PJOK", "Guru Informatika", dll)
  if (t.jabatanTambahan && t.jabatanTambahan.trim()) {
    const jabNorm = normalizeMapelName(t.jabatanTambahan);
    if (mNorm.length >= 4 && jabNorm.includes(mNorm)) return true;
    if (mNorm.includes('matematika') && jabNorm.includes('matematika')) return true;
    if (mNorm.includes('bahasainggris') && jabNorm.includes('bahasainggris')) return true;
    if (mNorm.includes('bahasaindonesia') && jabNorm.includes('bahasaindonesia')) return true;
    if (mNorm.includes('jasmani') && (jabNorm.includes('pjok') || jabNorm.includes('olahraga') || jabNorm.includes('penjas'))) return true;
    if ((mNorm.includes('agamaislam') || mNorm.includes('pai')) && (jabNorm.includes('pai') || jabNorm.includes('agama'))) return true;
    if (mNorm.includes('pancasila') && (jabNorm.includes('pancasila') || jabNorm.includes('ppkn') || jabNorm.includes('pkn'))) return true;
    if (mNorm.includes('informatika') && (jabNorm.includes('informatika') || jabNorm.includes('komputer'))) return true;
    if (mNorm.includes('sunda') && jabNorm.includes('sunda')) return true;
    if (mNorm.includes('konseling') && (jabNorm.includes('bk') || jabNorm.includes('konselor') || jabNorm.includes('konseling') || jabNorm.includes('bp'))) return true;
    if (mNorm.includes('sejarah') && jabNorm.includes('sejarah')) return true;
    if (mNorm.includes('projekipas') && jabNorm.includes('ipas')) return true;
  }

  return false;
}

/**
 * Cek apakah seorang guru mengampu mata pelajaran tertentu sesuai Data Guru (usersList / AdminGuruTab).
 * Memprioritaskan penugasan eksplisit di profil guru terlebih dahulu.
 */
export function isTeacherTeachingMapel(t: User | undefined | null, mapel: Mapel | undefined | null, fallbackToMapelField: boolean = true): boolean {
  if (!t || !mapel) return false;
  if (t.role === 'admin' || t.role === 'siswa' || t.role === 'calon_siswa' || t.statusAktif === false) return false;

  // 1. PRIORITAS UTAMA: Penugasan eksplisit di Data Guru (mapelDiampu / jabatanTambahan)
  if (isTeacherExplicitlyAssignedToMapel(t, mapel)) {
    return true;
  }

  // 2. FALLBACK OPSIONAL: Tautan eksplisit pada Mapel (idGuru atau guruPengampu cocok dengan profil guru)
  if (fallbackToMapelField) {
    if (mapel.idGuru && (mapel.idGuru === t.id || mapel.idGuru === t.idGuru || mapel.idGuru === t.nipOrNis || mapel.idGuru === t.nip)) {
      return true;
    }
    if (mapel.guruPengampu && mapel.guruPengampu.trim().length > 0 && mapel.guruPengampu.trim() !== '-' && mapel.guruPengampu.toLowerCase() !== 'guru pengampu' && mapel.guruPengampu.toLowerCase() !== 'belum ditentukan') {
      const curNorm = normalizeTeacherName(mapel.guruPengampu);
      const tNorm = normalizeTeacherName(t.nama);
      if (curNorm && tNorm && curNorm === tNorm) return true;
    }
  }

  return false;
}

/**
 * Sinkronkan master mapel dengan Data Guru (usersList).
 * Menjamin 100% penugasan mata pelajaran mengikuti guru yang memiliki mapel tersebut di Data Guru.
 */
export function syncMapelsWithTeachers(mapels: Mapel[], teachers: User[]): { updatedMapels: Mapel[]; changedCount: number } {
  if (!Array.isArray(mapels) || !Array.isArray(teachers)) {
    return { updatedMapels: mapels || [], changedCount: 0 };
  }

  const activeTeachers = teachers.filter(t => t.role !== 'admin' && t.role !== 'siswa' && t.role !== 'calon_siswa' && t.statusAktif !== false);
  let changedCount = 0;

  const updatedMapels = mapels.map(m => {
    // 1. Cari guru dari Data Guru yang secara eksplisit mengampu mapel ini di mapelDiampu-nya
    const explicitCandidates = activeTeachers.filter(t => isTeacherExplicitlyAssignedToMapel(t, m));

    let chosen: User | undefined;
    if (explicitCandidates.length === 1) {
      chosen = explicitCandidates[0];
    } else if (explicitCandidates.length > 1) {
      // Jika terdapat lebih dari 1 guru yang mengampu rumpun mapel ini:
      // a. Cek apakah ada yang namanya cocok dengan guruPengampu yang ada saat ini
      const currentMatch = explicitCandidates.find(t => 
        (m.idGuru && (t.id === m.idGuru || t.idGuru === m.idGuru || t.nipOrNis === m.idGuru)) ||
        normalizeTeacherName(t.nama) === normalizeTeacherName(m.guruPengampu)
      );
      if (currentMatch) {
        chosen = currentMatch;
      } else {
        // b. Cek kecocokan tingkat kelas jika ID mapel memuat jenjang (-x-, -xi-, -xii-)
        const mId = (m.id || '').toLowerCase();
        const ting = mId.includes('-x-') ? 'X' : (mId.includes('-xi-') ? 'XI' : (mId.includes('-xii-') ? 'XII' : ''));
        if (ting) {
          const matchTingkat = explicitCandidates.find(t => {
            const diampu = extractTeacherMapelList(t);
            return diampu.some(d => d.toLowerCase().includes(`-${ting.toLowerCase()}-`) || d.toUpperCase().includes(` ${ting}`));
          });
          if (matchTingkat) chosen = matchTingkat;
        }
        if (!chosen) chosen = explicitCandidates[0];
      }
    } else {
      // 2. Jika tidak ada guru yang secara eksplisit mencantumkan mapel ini di mapelDiampu:
      // Pertahankan guruPengampu yang sudah tercatat pada mapel jika guru tersebut terdaftar di Data Guru
      if (m.guruPengampu && m.guruPengampu.trim().length > 0 && m.guruPengampu.trim() !== '-' && m.guruPengampu.toLowerCase() !== 'guru pengampu' && m.guruPengampu.toLowerCase() !== 'belum ditentukan') {
        const matchByName = activeTeachers.find(t => 
          (m.idGuru && (t.id === m.idGuru || t.idGuru === m.idGuru || t.nipOrNis === m.idGuru)) ||
          normalizeTeacherName(t.nama) === normalizeTeacherName(m.guruPengampu)
        );
        if (matchByName) {
          chosen = matchByName;
        }
      }
    }

    if (chosen) {
      if (m.guruPengampu !== chosen.nama || m.idGuru !== chosen.id) {
        changedCount++;
        return {
          ...m,
          guruPengampu: chosen.nama,
          idGuru: chosen.id
        };
      }
    }
    return m;
  });

  return { updatedMapels, changedCount };
}

/**
 * Deduplicate user list ensuring teachers and staff are not duplicated when uploading backup.
 * Merges official data from canonical teacher list (INITIAL_GURU_USERS) so roles, jabatan, and mapelDiampu are kept accurate and clean.
 */
export function deduplicateUserAccounts(
  users: User[],
  initialGuruList: User[] = []
): { uniqueUsers: User[]; obsoleteIds: string[] } {
  if (!Array.isArray(users)) return { uniqueUsers: [], obsoleteIds: [] };

  const obsoleteIds: string[] = [];
  const studentMap = new Map<string, User>();
  const adminMap = new Map<string, User>();
  const candidateMap = new Map<string, User>();
  const teacherIdentMap = new Map<string, User>();

  const normTeacher = (name?: string): string => {
    return (name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const getTeacherKey = (u: User): string => {
    // 1. Direct ID in initialGuruList
    const matchCanon = initialGuruList.find(g => 
      g.id === u.id || 
      (g.idGuru && (g.idGuru === u.idGuru || g.idGuru === u.nipOrNis)) ||
      (g.nipOrNis && (g.nipOrNis === u.nipOrNis || g.nipOrNis === u.idGuru))
    );
    if (matchCanon) return `canon_${matchCanon.id}`;

    // 2. ID Guru or NIP (digits)
    const idDigits = (u.idGuru || u.nipOrNis || '').trim().replace(/[^0-9]/g, '');
    if (idDigits.length >= 8) {
      const canonWithDigits = initialGuruList.find(g => (g.idGuru || g.nipOrNis || '').replace(/[^0-9]/g, '') === idDigits);
      if (canonWithDigits) return `canon_${canonWithDigits.id}`;
      return `nip_${idDigits}`;
    }

    // 3. Normalized Name without honorifics
    const norm = normalizeTeacherName(u.nama) || normTeacher(u.nama);
    if (norm) {
      const canonWithName = initialGuruList.find(g => normalizeTeacherName(g.nama) === norm || normTeacher(g.nama) === norm);
      if (canonWithName) return `canon_${canonWithName.id}`;
      return `nama_${norm}`;
    }

    return `id_${u.id}`;
  };

  users.forEach(u => {
    if (!u) return;

    if (u.id === 'u-admin' || u.role === 'admin') {
      adminMap.set(u.id, u);
      return;
    }

    if (u.role === 'siswa') {
      const nipdKey = (u.nipd || u.nipOrNis || '').trim().replace(/[^a-z0-9]/gi, '').toLowerCase();
      const nisnKey = (u.nisn || u.username || '').trim().replace(/[^a-z0-9]/gi, '').toLowerCase();
      const key = nipdKey || nisnKey || u.id;
      if (studentMap.has(key)) {
        const existing = studentMap.get(key)!;
        if (existing.id !== u.id) obsoleteIds.push(u.id);
        studentMap.set(key, { ...existing, ...u, id: existing.id });
      } else {
        studentMap.set(key, u);
      }
      return;
    }

    if (u.role === 'calon_siswa') {
      const nisnKey = (u.nisn || u.nipOrNis || u.username || u.id).trim().toLowerCase();
      if (candidateMap.has(nisnKey)) {
        const existing = candidateMap.get(nisnKey)!;
        if (existing.id !== u.id) obsoleteIds.push(u.id);
        candidateMap.set(nisnKey, { ...existing, ...u, id: existing.id });
      } else {
        candidateMap.set(nisnKey, u);
      }
      return;
    }

    // Teachers, Staff, Walas, Kepala Sekolah, Operator, Bendahara
    const key = getTeacherKey(u);
    const existing = teacherIdentMap.get(key);

    if (existing) {
      const matchedCanon = initialGuruList.find(g => 
        g.id === existing.id || g.id === u.id ||
        (g.idGuru && (g.idGuru === existing.idGuru || g.idGuru === u.idGuru || g.idGuru === existing.nipOrNis || g.idGuru === u.nipOrNis)) ||
        (g.nipOrNis && (g.nipOrNis === existing.nipOrNis || g.nipOrNis === u.nipOrNis || g.nipOrNis === existing.idGuru || g.nipOrNis === u.idGuru)) ||
        (g.nama && (normTeacher(g.nama) === normTeacher(existing.nama) || normTeacher(g.nama) === normTeacher(u.nama)))
      );
      
      // Determine which record has newer / user-edited information
      let isUNewer = false;
      if (u.updatedAt && existing.updatedAt) {
        isUNewer = u.updatedAt >= existing.updatedAt;
      } else if (u.updatedAt && !existing.updatedAt) {
        isUNewer = true;
      } else if (existing.updatedAt && !u.updatedAt) {
        isUNewer = false;
      } else {
        // If neither has updatedAt, retain existing record as primary to prevent unedited background records from overwriting
        isUNewer = false;
      }

      const primary = isUNewer ? u : existing;
      const secondary = isUNewer ? existing : u;

      const preferredId = primary.id || secondary.id || (matchedCanon ? matchedCanon.id : '');
      if (primary.id && secondary.id && primary.id !== secondary.id) {
        const obsoleteId = primary.id === preferredId ? secondary.id : primary.id;
        if (obsoleteId && obsoleteId !== preferredId && !obsoleteIds.includes(obsoleteId) && !obsoleteId.startsWith('canon_')) {
          obsoleteIds.push(obsoleteId);
        }
      }

      // Preserve user-edited jabatanTambahan (crucial: empty string '' means intentionally cleared)
      // NEVER fallback to matchedCanon template when teacher has been saved
      let preferredJabatan = '';
      if (typeof primary.jabatanTambahan === 'string') {
        preferredJabatan = primary.jabatanTambahan;
      } else if (typeof secondary.jabatanTambahan === 'string') {
        preferredJabatan = secondary.jabatanTambahan;
      }

      const preferredGelar = primary.gelar !== undefined ? primary.gelar : (secondary.gelar !== undefined ? secondary.gelar : (matchedCanon?.gelar || ''));
      const preferredJurusan = primary.jurusan || secondary.jurusan || matchedCanon?.jurusan || 'Umum';
      const preferredFoto = typeof primary.fotoProfilUrl === 'string' ? primary.fotoProfilUrl : (typeof secondary.fotoProfilUrl === 'string' ? secondary.fotoProfilUrl : (matchedCanon?.fotoProfilUrl || ''));
      const primaryDiampuList = extractTeacherMapelList(primary);
      const secondaryDiampuList = extractTeacherMapelList(secondary);
      const preferredMapel = primaryDiampuList.length > 0 
        ? primaryDiampuList 
        : (secondaryDiampuList.length > 0 ? secondaryDiampuList : (matchedCanon?.mapelDiampu || []));

      // Prefer user-edited role and assignment flags over template
      const rawRole = (primary.role || secondary.role || matchedCanon?.role || 'guru').toString().toLowerCase();
      const preferredRole = (rawRole === 'walas' || rawRole === 'kepala_sekolah' || rawRole === 'operator' || rawRole === 'bendahara' || rawRole === 'staf' || rawRole === 'pembina_ekskul' || rawRole === 'kesiswaan')
        ? rawRole as UserRole
        : 'guru';
      const preferredIsKesiswaan = typeof primary.isKesiswaan === 'boolean' 
        ? primary.isKesiswaan 
        : (typeof secondary.isKesiswaan === 'boolean' ? secondary.isKesiswaan : Boolean(matchedCanon?.isKesiswaan));
      const preferredIsWalas = typeof primary.isWalas === 'boolean' 
        ? primary.isWalas 
        : (typeof secondary.isWalas === 'boolean' ? secondary.isWalas : Boolean(matchedCanon?.isWalas));
      const preferredIsPembina = typeof primary.isPembinaEkskul === 'boolean' 
        ? primary.isPembinaEkskul 
        : (typeof secondary.isPembinaEkskul === 'boolean' ? secondary.isPembinaEkskul : Boolean(matchedCanon?.isPembinaEkskul));

      const mergedTeacher: User = {
        ...(matchedCanon || {}),
        ...secondary,
        ...primary,
        id: preferredId,
        nama: primary.nama || secondary.nama || matchedCanon?.nama || '',
        gelar: preferredGelar,
        nipOrNis: primary.nipOrNis || secondary.nipOrNis || matchedCanon?.nipOrNis || '',
        idGuru: primary.idGuru || secondary.idGuru || matchedCanon?.idGuru || '',
        tempatLahir: primary.tempatLahir || secondary.tempatLahir || matchedCanon?.tempatLahir || 'Bogor',
        tanggalLahir: primary.tanggalLahir || secondary.tanggalLahir || matchedCanon?.tanggalLahir || '1985-01-01',
        tahunMasuk: primary.tahunMasuk || secondary.tahunMasuk || matchedCanon?.tahunMasuk || 2020,
        role: preferredRole,
        jabatanTambahan: preferredJabatan,
        isKesiswaan: preferredIsKesiswaan,
        isWalas: preferredIsWalas,
        walasKelasId: primary.walasKelasId !== undefined ? primary.walasKelasId : secondary.walasKelasId,
        walasKelasIds: primary.walasKelasIds !== undefined ? primary.walasKelasIds : secondary.walasKelasIds,
        walasNamaKelas: primary.walasNamaKelas !== undefined ? primary.walasNamaKelas : secondary.walasNamaKelas,
        walasNamaKelasList: primary.walasNamaKelasList !== undefined ? primary.walasNamaKelasList : secondary.walasNamaKelasList,
        isPembinaEkskul: preferredIsPembina,
        ekskulDibina: primary.ekskulDibina !== undefined ? primary.ekskulDibina : secondary.ekskulDibina,
        mapelDiampu: preferredMapel,
        jurusan: preferredJurusan,
        fotoProfilUrl: preferredFoto,
        telepon: primary.telepon !== undefined ? primary.telepon : (secondary.telepon || ''),
        email: primary.email !== undefined ? primary.email : (secondary.email || ''),
        username: primary.username || secondary.username || matchedCanon?.username || '',
        password: primary.password || secondary.password || matchedCanon?.password || 'guru123',
        statusAktif: primary.statusAktif !== false && secondary.statusAktif !== false,
        updatedAt: primary.updatedAt || secondary.updatedAt || new Date().toISOString(),
      };

      teacherIdentMap.set(key, mergedTeacher);
    } else {
      const matchedCanon = initialGuruList.find(g => 
        g.id === u.id || 
        (g.idGuru && (g.idGuru === u.idGuru || g.idGuru === u.nipOrNis)) ||
        (g.nipOrNis && (g.nipOrNis === u.nipOrNis || g.nipOrNis === u.idGuru)) ||
        (g.nama && (normTeacher(g.nama) === normTeacher(u.nama) || (u.nama && g.nama && normalizeTeacherName(g.nama) === normalizeTeacherName(u.nama))))
      );

      const uDiampuList = extractTeacherMapelList(u);
      const rawRole = (u.role || matchedCanon?.role || 'guru').toString().toLowerCase();
      const finalRole = (rawRole === 'walas' || rawRole === 'kepala_sekolah' || rawRole === 'operator' || rawRole === 'bendahara' || rawRole === 'staf' || rawRole === 'pembina_ekskul' || rawRole === 'kesiswaan')
        ? rawRole as UserRole
        : 'guru';

      // Do NOT push to obsoleteIds here, since u is the only record seen so far
      const finalTeacher: User = {
        ...(matchedCanon || {}),
        ...u,
        id: u.id || (matchedCanon ? matchedCanon.id : u.id),
        nama: u.nama || matchedCanon?.nama || '',
        gelar: typeof u.gelar === 'string' ? u.gelar : (matchedCanon?.gelar || ''),
        nipOrNis: u.nipOrNis || matchedCanon?.nipOrNis || '',
        idGuru: u.idGuru || matchedCanon?.idGuru || '',
        role: finalRole,
        // Crucial: preserve empty string '' if user cleared jabatanTambahan; NEVER revert back to matchedCanon
        jabatanTambahan: typeof u.jabatanTambahan === 'string' ? u.jabatanTambahan : '',
        isKesiswaan: typeof u.isKesiswaan === 'boolean' ? u.isKesiswaan : Boolean(matchedCanon?.isKesiswaan),
        isWalas: typeof u.isWalas === 'boolean' ? u.isWalas : Boolean(matchedCanon?.isWalas),
        isPembinaEkskul: typeof u.isPembinaEkskul === 'boolean' ? u.isPembinaEkskul : Boolean(matchedCanon?.isPembinaEkskul),
        walasKelasId: u.walasKelasId !== undefined ? u.walasKelasId : matchedCanon?.walasKelasId,
        walasKelasIds: u.walasKelasIds !== undefined ? u.walasKelasIds : matchedCanon?.walasKelasIds,
        walasNamaKelas: u.walasNamaKelas !== undefined ? u.walasNamaKelas : matchedCanon?.walasNamaKelas,
        walasNamaKelasList: u.walasNamaKelasList !== undefined ? u.walasNamaKelasList : matchedCanon?.walasNamaKelasList,
        ekskulDibina: u.ekskulDibina !== undefined ? u.ekskulDibina : matchedCanon?.ekskulDibina,
        mapelDiampu: uDiampuList.length > 0 ? uDiampuList : (Array.isArray(u.mapelDiampu) ? u.mapelDiampu : (matchedCanon?.mapelDiampu || [])),
        jurusan: u.jurusan || matchedCanon?.jurusan || 'Umum',
        fotoProfilUrl: typeof u.fotoProfilUrl === 'string' ? u.fotoProfilUrl : (matchedCanon?.fotoProfilUrl || ''),
        telepon: u.telepon !== undefined ? u.telepon : (matchedCanon?.telepon || ''),
        email: u.email !== undefined ? u.email : (matchedCanon?.email || ''),
        statusAktif: u.statusAktif !== false,
        updatedAt: u.updatedAt,
      };
      teacherIdentMap.set(key, finalTeacher);
    }
  });

  const deletedIds: string[] = typeof localStorage !== 'undefined'
    ? (() => {
        try {
          return JSON.parse(localStorage.getItem('saved_deleted_user_ids') || '[]');
        } catch (_) {
          return [];
        }
      })()
    : [];

  // Ensure all canonical teachers from initialGuruList are present ONLY if not deleted and NOT already registered
  initialGuruList.forEach(cg => {
    if (deletedIds.includes(cg.id) || (cg.idGuru && deletedIds.includes(cg.idGuru)) || (cg.nipOrNis && deletedIds.includes(cg.nipOrNis))) {
      return;
    }
    const key = `canon_${cg.id}`;
    if (!teacherIdentMap.has(key)) {
      const nameKey = `nama_${normalizeTeacherName(cg.nama) || normTeacher(cg.nama)}`;
      if (!teacherIdentMap.has(nameKey)) {
        // Also check if ANY teacher in teacherIdentMap matches this canonical teacher by ID, idGuru, nipOrNis, or name
        const alreadyExists = Array.from(teacherIdentMap.values()).some(t => 
          t.id === cg.id ||
          (cg.idGuru && (t.idGuru === cg.idGuru || t.nipOrNis === cg.idGuru)) ||
          (cg.nipOrNis && (t.nipOrNis === cg.nipOrNis || t.idGuru === cg.nipOrNis)) ||
          (cg.nama && t.nama && (normalizeTeacherName(t.nama) === normalizeTeacherName(cg.nama) || normTeacher(t.nama) === normTeacher(cg.nama)))
        );
        if (!alreadyExists) {
          teacherIdentMap.set(key, { ...cg });
        }
      }
    }
  });

  const uniqueUsers: User[] = [
    ...Array.from(adminMap.values()),
    ...Array.from(teacherIdentMap.values()),
    ...Array.from(studentMap.values()),
    ...Array.from(candidateMap.values())
  ];

  return {
    uniqueUsers,
    obsoleteIds: Array.from(new Set(obsoleteIds.filter(id => id !== 'u-admin')))
  };
}

/**
 * Mengkategorikan dan menentukan prioritas urutan Mata Pelajaran sesuai
 * Peraturan Resmi Kurikulum Merdeka SMK (Kepmendikbudristek No. 262/M/2022 & Permendikbudristek No. 12 Tahun 2024):
 *
 * A. KELOMPOK MATA PELAJARAN UMUM (Kelompok A):
 *    1. Pendidikan Agama dan Budi Pekerti
 *    2. Pendidikan Pancasila (PPKn / PPAN)
 *    3. Bahasa Indonesia
 *    4. Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)
 *    5. Sejarah
 *    6. Seni Budaya (Seni Rupa, Seni Musik, Seni Teater, Seni Tari)
 *    7. Muatan Lokal (Bahasa Daerah / Bahasa Sunda, Potensi Daerah)
 *
 * B. KELOMPOK MATA PELAJARAN KEJURUAN (Kelompok B):
 *    (Pada SMK, Matematika & Bahasa Inggris secara resmi dialokasikan pada Kelompok Kejuruan)
 *    1. Matematika (Umum / Terapan)
 *    2. Bahasa Inggris
 *    3. Informatika
 *    4. Projek IPAS (Ilmu Pengetahuan Alam dan Sosial)
 *    5. Dasar-Dasar Program Keahlian (Kelas X) / Konsentrasi Keahlian (Kelas XI & XII)
 *       (Teknologi Farmasi, Layanan Kesehatan, KDM, Tindakan Keperawatan, Tata Kecantikan, Perhotelan, dll)
 *    6. Projek Kreatif dan Kewirausahaan (PKK)
 *    7. Praktik Kerja Lapangan (PKL)
 *    8. Mata Pelajaran Pilihan (Bahasa Asing Pilihan seperti Jepang, Arab, Mandarin, Jerman, dll)
 *    9. Muatan Lokal Kejuruan
 */
export function getMapelRaportCategory(mapel: any): {
  group: 'A' | 'B';
  groupName: string;
  priority: number;
} {
  if (!mapel) {
    return { group: 'B', groupName: 'Kelompok Mata Pelajaran Kejuruan', priority: 99 };
  }

  const rawNama = (mapel.namaMapel || mapel.nama || mapel.mapelNama || '').toLowerCase().trim();
  const rawKode = (mapel.kode || mapel.mapelKode || mapel.mapelId || '').toUpperCase().trim();
  const rawKelompok = (mapel.kelompok || '').toLowerCase().trim();

  // -------------------------------------------------------------
  // KELOMPOK A: MATA PELAJARAN UMUM
  // -------------------------------------------------------------

  // 1. Pendidikan Agama dan Budi Pekerti
  if (
    rawNama.includes('pendidikan agama') ||
    rawNama.includes('budi pekerti') ||
    rawNama.includes('kepercayaan terhadap tuhan') ||
    rawKode.startsWith('PAI') ||
    rawKode.startsWith('PAK') ||
    rawKode.startsWith('PAH') ||
    rawKode.startsWith('PAB')
  ) {
    return { group: 'A', groupName: 'A. Kelompok Mata Pelajaran Umum', priority: 1 };
  }

  // 2. Pendidikan Pancasila (PPKn / PPAN)
  if (
    rawNama.includes('pancasila') ||
    rawNama.includes('kewarganegaraan') ||
    rawKode.startsWith('PPAN') ||
    rawKode.startsWith('PPKN')
  ) {
    return { group: 'A', groupName: 'A. Kelompok Mata Pelajaran Umum', priority: 2 };
  }

  // 3. Bahasa Indonesia (bukan Bahasa Inggris)
  if (
    (rawNama.includes('bahasa indonesia') || rawKode.startsWith('BIND') || rawKode === 'BI') &&
    !rawNama.includes('inggris')
  ) {
    return { group: 'A', groupName: 'A. Kelompok Mata Pelajaran Umum', priority: 3 };
  }

  // 4. Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)
  if (
    rawNama.includes('jasmani') ||
    rawNama.includes('olahraga') ||
    rawNama.includes('pjok') ||
    rawKode.startsWith('PJOK')
  ) {
    return { group: 'A', groupName: 'A. Kelompok Mata Pelajaran Umum', priority: 4 };
  }

  // 5. Sejarah
  if (
    rawNama.includes('sejarah') ||
    rawKode.startsWith('SEJ')
  ) {
    return { group: 'A', groupName: 'A. Kelompok Mata Pelajaran Umum', priority: 5 };
  }

  // 6. Seni Budaya (Seni Musik, Seni Rupa, Seni Teater, Seni Tari)
  if (
    rawNama.includes('seni ') ||
    rawNama.includes('seni budaya') ||
    rawNama.includes('seni musik') ||
    rawNama.includes('seni rupa') ||
    rawNama.includes('seni tari') ||
    rawNama.includes('seni teater') ||
    rawKode.startsWith('SB-') ||
    rawKode.startsWith('SM-') ||
    rawKode.startsWith('SR-') ||
    rawKode.startsWith('STR-') ||
    rawKode.startsWith('ST-')
  ) {
    return { group: 'A', groupName: 'A. Kelompok Mata Pelajaran Umum', priority: 6 };
  }

  // 7. Muatan Lokal (Bahasa Daerah / Bahasa Sunda, Potensi Daerah)
  if (
    rawNama.includes('muatan lokal') ||
    rawNama.includes('mulok') ||
    rawNama.includes('bahasa daerah') ||
    rawNama.includes('sunda') ||
    rawNama.includes('potensi daerah') ||
    rawKode.startsWith('ML-')
  ) {
    return { group: 'A', groupName: 'A. Kelompok Mata Pelajaran Umum', priority: 7 };
  }

  // -------------------------------------------------------------
  // KELOMPOK B: MATA PELAJARAN KEJURUAN (SMK)
  // (Menurut Kepmendikbudristek No 262/M/2022 & Permendikbudristek No 12 Tahun 2024)
  // -------------------------------------------------------------

  // B1. Matematika (pada SMK ditempatkan pada Kelompok Kejuruan urutan pertama)
  if (
    rawNama.includes('matematika') ||
    rawKode.startsWith('MTK') ||
    rawKode === 'MAT'
  ) {
    return { group: 'B', groupName: 'B. Kelompok Mata Pelajaran Kejuruan', priority: 10 };
  }

  // B2. Bahasa Inggris (pada SMK ditempatkan pada Kelompok Kejuruan urutan kedua)
  if (
    rawNama.includes('bahasa inggris') ||
    rawNama.includes('english') ||
    rawKode.startsWith('BING') ||
    rawKode === 'ENG'
  ) {
    return { group: 'B', groupName: 'B. Kelompok Mata Pelajaran Kejuruan', priority: 11 };
  }

  // B3. Informatika
  if (
    rawNama.includes('informatika') ||
    rawNama.includes('teknologi informasi') ||
    rawNama.includes('tik') ||
    rawKode.startsWith('INF') ||
    rawKode.startsWith('TIK')
  ) {
    return { group: 'B', groupName: 'B. Kelompok Mata Pelajaran Kejuruan', priority: 12 };
  }

  // B4. Projek IPAS (Ilmu Pengetahuan Alam dan Sosial)
  if (
    rawNama.includes('ipas') ||
    rawNama.includes('ilmu pengetahuan alam dan sosial') ||
    rawKode.startsWith('IPAS')
  ) {
    return { group: 'B', groupName: 'B. Kelompok Mata Pelajaran Kejuruan', priority: 13 };
  }

  // B6. Produk / Projek Kreatif dan Kewirausahaan (PKK)
  if (
    rawNama.includes('kewirausahaan') ||
    rawNama.includes('kreatif') ||
    rawNama.includes('pkk') ||
    rawKode.startsWith('PKK')
  ) {
    return { group: 'B', groupName: 'B. Kelompok Mata Pelajaran Kejuruan', priority: 20 };
  }

  // B7. Praktik Kerja Lapangan (PKL) / Praktik Kerja Industri (Prakerin)
  if (
    rawNama.includes('praktik kerja') ||
    rawNama.includes('pkl') ||
    rawNama.includes('prakerin') ||
    rawKode.startsWith('PKL')
  ) {
    return { group: 'B', groupName: 'B. Kelompok Mata Pelajaran Kejuruan', priority: 21 };
  }

  // B8. Mata Pelajaran Pilihan (Bahasa Asing Pilihan seperti Bahasa Arab, Jepang, Mandarin, Jerman, Korea, Perancis, dll.)
  if (
    rawNama.includes('bahasa jepang') ||
    rawNama.includes('bahasa arab') ||
    rawNama.includes('bahasa mandarin') ||
    rawNama.includes('bahasa jerman') ||
    rawNama.includes('bahasa korea') ||
    rawNama.includes('bahasa perancis') ||
    rawNama.includes('bahasa cina') ||
    rawNama.includes('bahasa belanda') ||
    rawKode.startsWith('BJPN') ||
    rawKode.startsWith('BARAB') ||
    rawKode.startsWith('BMND') ||
    rawKode.startsWith('BJRM') ||
    rawKode.startsWith('BKOR') ||
    rawKode.startsWith('BPRC') ||
    rawKode.startsWith('BCIN') ||
    rawKode.startsWith('BBLD') ||
    rawNama.includes('pilihan')
  ) {
    return { group: 'B', groupName: 'B. Kelompok Mata Pelajaran Kejuruan', priority: 25 };
  }

  // B5. Dasar-Dasar Program Keahlian / Konsentrasi Keahlian (Farmasi, Keperawatan, Tata Kecantikan, Perhotelan, dll)
  if (
    rawKelompok.includes('kejuruan') ||
    rawKelompok.includes('kompetensi keahlian') ||
    rawKelompok.includes('c3') ||
    rawKelompok.includes('c2') ||
    rawNama.includes('dasar') ||
    rawNama.includes('farmasi') ||
    rawNama.includes('obat') ||
    rawNama.includes('sediaan') ||
    rawNama.includes('keperawatan') ||
    rawNama.includes('kesehatan') ||
    rawNama.includes('kdm') ||
    rawNama.includes('penyakit') ||
    rawNama.includes('kecantikan') ||
    rawNama.includes('kulit') ||
    rawNama.includes('rambut') ||
    rawNama.includes('perhotelan') ||
    rawNama.includes('hotel') ||
    rawNama.includes('hospitality') ||
    rawKode.startsWith('FAR') ||
    rawKode.startsWith('KEP') ||
    rawKode.startsWith('DDTF') ||
    rawKode.startsWith('DDLK')
  ) {
    return { group: 'B', groupName: 'B. Kelompok Mata Pelajaran Kejuruan', priority: 15 };
  }

  // Layanan Tambahan (BP/BK, Bimbingan Konseling)
  if (rawNama.includes('bimbingan') || rawNama.includes('konseling') || rawKode.startsWith('BK')) {
    return { group: 'B', groupName: 'B. Kelompok Mata Pelajaran Kejuruan', priority: 30 };
  }

  // Fallback berdasarkan kelompok
  if (rawKelompok.includes('umum') || rawKelompok.includes('nasional') || rawKelompok.includes('kewilayahan')) {
    return { group: 'A', groupName: 'A. Kelompok Mata Pelajaran Umum', priority: 8 };
  }

  return { group: 'B', groupName: 'B. Kelompok Mata Pelajaran Kejuruan', priority: 16 };
}

/**
 * Mengurutkan Mata Pelajaran persis sesuai Peraturan Kurikulum Merdeka SMK:
 * Kelompok Umum (A.1 s/d A.7) disusul Kelompok Kejuruan (B.1 s/d B.9).
 */
export function sortMapelForRaport<T extends Record<string, any>>(
  mapels: T[]
): T[] {
  if (!Array.isArray(mapels)) return [];

  return [...mapels].sort((a, b) => {
    const cat = getMapelRaportCategory(a);
    const catB = getMapelRaportCategory(b);

    // 1. Urutkan berdasarkan Kelompok A (Umum) dulu, baru Kelompok B (Kejuruan)
    if (cat.group !== catB.group) {
      return cat.group === 'A' ? -1 : 1;
    }

    // 2. Urutkan berdasarkan prioritas regulasi resmi di dalam kelompok
    if (cat.priority !== catB.priority) {
      return cat.priority - catB.priority;
    }

    // 3. Jika sama-sama sub-kejuruan atau pilihan, urutkan nama secara alfabetis
    const nameA = a.namaMapel || a.nama || a.mapelNama || '';
    const nameB = b.namaMapel || b.nama || b.mapelNama || '';
    return nameA.localeCompare(nameB);
  });
}

export interface RaportSubjectGroup<T> {
  groupKey: 'A' | 'B';
  groupName: string;
  mapels: T[];
}

/**
 * Memisahkan dan mengelompokkan Mata Pelajaran menjadi Kelompok A (Umum)
 * dan Kelompok B (Kejuruan) yang masing-masing sudah diurutkan sesuai regulasi.
 */
export function getRaportMapelGroups<T extends Record<string, any>>(
  mapels: T[]
): RaportSubjectGroup<T>[] {
  const sorted = sortMapelForRaport(mapels);

  const umumMapels: T[] = [];
  const kejuruanMapels: T[] = [];

  sorted.forEach(m => {
    const cat = getMapelRaportCategory(m);
    if (cat.group === 'A') {
      umumMapels.push(m);
    } else {
      kejuruanMapels.push(m);
    }
  });

  const groups: RaportSubjectGroup<T>[] = [];
  if (umumMapels.length > 0) {
    groups.push({
      groupKey: 'A',
      groupName: 'A. Kelompok Mata Pelajaran Umum',
      mapels: umumMapels,
    });
  }
  if (kejuruanMapels.length > 0) {
    groups.push({
      groupKey: 'B',
      groupName: 'B. Kelompok Mata Pelajaran Kejuruan',
      mapels: kejuruanMapels,
    });
  }

  return groups;
}

/**
 * Sorts Mata Pelajaran based on statutory curriculum regulations and tingkat
 */
export function sortMapelByKelas(mapels: any[]): any[] {
  if (!Array.isArray(mapels)) return [];
  return sortMapelForRaport(mapels);
}

/**
 * Mengurutkan rombel / kelas secara terstruktur dan alfabetis resmi:
 * 1. Urutan Tingkat: X (Fase E) -> XI (Fase F) -> XII (Fase F)
 * 2. Di dalam tingkat yang sama, urutkan sesuai abjad nama kelas (A - Z):
 *    Contoh Tingkat X: X Kesehatan (K) -> X Perhotelan (P) -> X Tata Kecantikan & Spa (T)
 */
export function sortKelasAlphabetical(kelasList: Kelas[]): Kelas[] {
  if (!Array.isArray(kelasList)) return [];
  const tingkatPriority: Record<string, number> = {
    'X': 1,
    '10': 1,
    'XI': 2,
    '11': 2,
    'XII': 3,
    '12': 3,
  };

  return [...kelasList].sort((a, b) => {
    const rawA = (a.namaKelas || '').trim();
    const rawB = (b.namaKelas || '').trim();

    const matchA = rawA.match(/^(XII|XI|X|\d+)\b/i);
    const matchB = rawB.match(/^(XII|XI|X|\d+)\b/i);

    const tingkatA = ((a.tingkat || matchA?.[0]) || '').toUpperCase();
    const tingkatB = ((b.tingkat || matchB?.[0]) || '').toUpperCase();

    const prioA = tingkatPriority[tingkatA] || 99;
    const prioB = tingkatPriority[tingkatB] || 99;

    if (prioA !== prioB) {
      return prioA - prioB;
    }

    // Urutkan abjad alfabetis resmi Indonesia
    return rawA.localeCompare(rawB, 'id', { numeric: true, sensitivity: 'base' });
  });
}

/**
 * Membersihkan awalan kalimat TP seperti 'TP 1:', 'LM 1:', nomor butir, dan spasi berlebih
 */
export function cleanTpPhrase(raw: string): string {
  if (!raw) return '';
  let str = raw.trim();
  // Hapus awalan seperti "TP 1:", "LM 1 -", "Tujuan Pembelajaran 1:", "1.", dll
  str = str.replace(/^(\s*(?:TP|LM|Tujuan\s*Pembelajaran|Lingkup\s*Materi)\s*\d+[\s:.-]*)+/i, '');
  str = str.replace(/^\s*\d+[\.\)\-]\s*/, '');
  str = str.replace(/^[\*\•\-\–\—\s]+/, '');
  str = str.trim();
  if (!str) return '';
  // Pastikan huruf pertama menyesuaikan (jika kata kerja, buat huruf kecil untuk sambungan kalimat mengalir)
  const firstWord = str.split(' ')[0];
  const isCapitalizedVerb = /^(Memahami|Menerapkan|Menganalisis|Mengomunikasikan|Mengidentifikasi|Melakukan|Menjelaskan|Mengevaluasi|Menyusun|Merancang|Membuat|Menggunakan|Menghitung)/i.test(firstWord);
  if (isCapitalizedVerb) {
    str = str.charAt(0).toLowerCase() + str.slice(1);
  }
  // Hapus titik di akhir jika ada
  str = str.replace(/[\.\s]+$/, '');
  return str;
}

/**
 * Meringkas TP menjadi inti esensial (memangkas kata-kata pelengkap berlebih agar tidak terlalu panjang di rapor)
 */
export function condenseTpPhrase(raw: string): string {
  let str = cleanTpPhrase(raw);
  if (!str) return '';
  // Potong kata-kata klise atau keterangan pelengkap panjang jika kalimat > 40 karakter
  str = str.replace(/\s+(secara|dengan|pada|dalam|di)\s+(baik|benar|tepat|mandiri|terstruktur|konsisten|efektif|menyeluruh|optimal|sekolah|lingkup|kehidupan|dunia kerja|industri).*/i, '');
  // Jika masih ada tanda baca koma atau titik koma yang panjang, potong di klausa pertama
  if (str.length > 50) {
    const commaSplit = str.split(/[,;]/);
    if (commaSplit[0].length >= 18) {
      str = commaSplit[0].trim();
    }
  }
  return str.trim();
}

/**
 * Membaca data Lingkup Materi & TP yang tersimpan di localStorage atau state
 */
export function getSavedLingkupMateriTpMap(): Record<string, { lm1: string; lm2: string; lm3: string; lm4: string }> {
  try {
    const raw = localStorage.getItem('saved_lingkup_materi_tp');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Mengambil konfigurasi TP untuk suatu mata pelajaran & kelas secara cerdas
 */
export function getTpForSubjectAndClass(
  mapel: any,
  kelas?: any,
  customTpMap?: Record<string, any>
): { lm1: string; lm2: string; lm3: string; lm4: string } {
  const tpMap = customTpMap || getSavedLingkupMateriTpMap();
  const mapelId = typeof mapel === 'object' && mapel ? (mapel.id || mapel.kode || '') : String(mapel || '');
  const mapelNama = typeof mapel === 'object' && mapel ? (mapel.namaMapel || '') : '';
  const mapelNameKey = mapelNama.toLowerCase();
  const kelasId = typeof kelas === 'object' && kelas ? (kelas.id || '') : String(kelas || '');
  const tingkat = typeof kelas === 'object' && kelas ? (kelas.tingkat || '') : '';

  // 1. Direct match by kelas + mapel
  if (kelasId && mapelId && tpMap[`${kelasId}_${mapelId}`]) {
    return tpMap[`${kelasId}_${mapelId}`];
  }
  // 2. Direct match by mapelId
  if (mapelId && tpMap[mapelId]) {
    return tpMap[mapelId];
  }
  // 3. Match by tingkat + mapelNama
  if (tingkat && mapelNameKey && tpMap[`tingkat_${tingkat}_${mapelNameKey}`]) {
    return tpMap[`tingkat_${tingkat}_${mapelNameKey}`];
  }
  // 4. Match by mapelNameKey
  if (mapelNameKey && tpMap[mapelNameKey]) {
    return tpMap[mapelNameKey];
  }

  // 5. Default TP dikosongkan agar guru menginput manual
  return {
    lm1: '',
    lm2: '',
    lm3: '',
    lm4: '',
  };
}

export interface CapaianKompetensiResult {
  deskripsiLengkap: string;
  deskripsiRingkas: string;
  deskripsiNarasi: string;
  deskripsiPoin: string;
  capaianTertinggi: string;
  capaianPerluBimbingan: string;
  allTps: { kode: string; label: string; cleanedLabel: string; score?: number; status: 'tercapai' | 'perlu_bimbingan' }[];
}

/**
 * Menyusun Capaian Kompetensi Kurikulum Merdeka yang komprehensif dari Tujuan Pembelajaran (TP)
 * yang diinput oleh guru, disesuaikan dengan nilai/ketercapaian masing-masing peserta didik.
 * Mendukung mode 'ringkas' (inti esensial 1-2 baris), 'narasi' (gabungan seluruh TP), dan 'poin' (butir TP 1-4).
 */
export function buildKurikulumMerdekaCapaian(params: {
  grade?: any;
  mapel?: any;
  kelas?: any;
  tpMap?: Record<string, any>;
  displayStyle?: 'ringkas' | 'narasi' | 'poin';
}): CapaianKompetensiResult {
  const { grade, mapel, kelas, tpMap, displayStyle = 'ringkas' } = params;
  const tpConfig = getTpForSubjectAndClass(mapel, kelas, tpMap);

  // Ambil TP yang tersimpan di grade atau di tpConfig
  const rawTp1 = grade?.tp1Desc || tpConfig.lm1 || '';
  const rawTp2 = grade?.tp2Desc || tpConfig.lm2 || '';
  const rawTp3 = grade?.tp3Desc || tpConfig.lm3 || '';
  const rawTp4 = grade?.tp4Desc || tpConfig.lm4 || '';

  const candidates: { kode: string; raw: string; score?: number }[] = [
    { kode: 'TP 1', raw: rawTp1, score: grade?.lm1 ?? grade?.tugas1 },
    { kode: 'TP 2', raw: rawTp2, score: grade?.lm2 ?? grade?.tugas2 },
    { kode: 'TP 3', raw: rawTp3, score: grade?.lm3 ?? grade?.tugas3 },
    { kode: 'TP 4', raw: rawTp4, score: grade?.lm4 ?? grade?.ulhar1 },
  ];

  // Kumpulkan TP yang memiliki isi teks
  const activeTps: {
    kode: string;
    label: string;
    cleanedLabel: string;
    score?: number;
    status: 'tercapai' | 'perlu_bimbingan';
  }[] = [];

  const nilaiAkhir = typeof grade?.nilaiAkhir === 'number' && grade.nilaiAkhir > 0 ? grade.nilaiAkhir : 80;

  candidates.forEach(c => {
    if (c.raw && c.raw.trim().length > 0) {
      const cleaned = cleanTpPhrase(c.raw);
      if (cleaned.length > 0) {
        // Tentukan status ketercapaian per TP:
        // Jika siswa memiliki nilai individual TP: cek apakah >= 75
        // Jika belum ada nilai per-TP tapi nilai akhir >= 75: tercapai
        // Jika nilai individual TP < 75 atau nilai akhir < 70: perlu bimbingan
        let isMastered = true;
        if (typeof c.score === 'number' && c.score > 0) {
          isMastered = c.score >= 75;
        } else {
          isMastered = nilaiAkhir >= 75;
        }

        activeTps.push({
          kode: c.kode,
          label: c.raw.trim(),
          cleanedLabel: cleaned,
          score: c.score,
          status: isMastered ? 'tercapai' : 'perlu_bimbingan',
        });
      }
    }
  });

  // Jika tidak ada TP yang terdeteksi sama sekali, fallback ke default
  if (activeTps.length === 0) {
    const fallbackText = 'Menunjukkan penguasaan kompetensi pembelajaran yang baik pada materi pokok.';
    return {
      deskripsiLengkap: fallbackText,
      deskripsiRingkas: fallbackText,
      deskripsiNarasi: fallbackText,
      deskripsiPoin: fallbackText,
      capaianTertinggi: fallbackText,
      capaianPerluBimbingan: 'Pertahankan prestasi belajar dan konsistensi kompetensi.',
      allTps: [],
    };
  }

  const tercapaiList = activeTps.filter(t => t.status === 'tercapai');
  const bimbinganList = activeTps.filter(t => t.status === 'perlu_bimbingan');

  // Format penggabungan kata dengan koma dan 'serta'
  const joinPhrases = (phrases: string[]): string => {
    if (phrases.length === 0) return '';
    if (phrases.length === 1) return phrases[0];
    if (phrases.length === 2) return `${phrases[0]} serta ${phrases[1]}`;
    const allExceptLast = phrases.slice(0, -1).join(', ');
    return `${allExceptLast}, serta ${phrases[phrases.length - 1]}`;
  };

  // 1. Susun Deskripsi Ringkas (Inti Esensial - Sangat Rapi & Padat untuk Kolom Tabel Raport)
  let deskripsiRingkas = '';
  const topTercapai = tercapaiList.slice(0, 2);
  const topBimbingan = bimbinganList.slice(0, 1);

  if (tercapaiList.length > 0 && bimbinganList.length === 0) {
    const predikatKata = nilaiAkhir >= 90 ? 'Sangat menguasai' : nilaiAkhir >= 80 ? 'Menguasai' : 'Cukup menguasai';
    const intiTercapai = topTercapai.map(t => condenseTpPhrase(t.label));
    deskripsiRingkas = `${predikatKata} ${joinPhrases(intiTercapai)}.`;
  } else if (tercapaiList.length > 0 && bimbinganList.length > 0) {
    const intiTercapai = topTercapai.slice(0, 1).map(t => condenseTpPhrase(t.label));
    const intiBimbingan = topBimbingan.map(t => condenseTpPhrase(t.label));
    deskripsiRingkas = `Menguasai ${joinPhrases(intiTercapai)}, namun perlu peningkatan dalam ${joinPhrases(intiBimbingan)}.`;
  } else {
    const intiBimbingan = topBimbingan.map(t => condenseTpPhrase(t.label));
    deskripsiRingkas = `Perlu bimbingan intensif dalam ${joinPhrases(intiBimbingan)}.`;
  }

  // 2. Susun Narasi Mengalir Lengkap (Seluruh TP)
  let deskripsiNarasi = '';
  if (tercapaiList.length > 0 && bimbinganList.length === 0) {
    const tingkatPenguasaan = nilaiAkhir >= 90 ? 'sangat istimewa' : nilaiAkhir >= 80 ? 'sangat baik' : 'baik';
    deskripsiNarasi = `Menunjukkan penguasaan yang ${tingkatPenguasaan} dalam ${joinPhrases(tercapaiList.map(t => t.cleanedLabel))}.`;
  } else if (tercapaiList.length > 0 && bimbinganList.length > 0) {
    deskripsiNarasi = `Menunjukkan penguasaan yang baik dalam ${joinPhrases(tercapaiList.map(t => t.cleanedLabel))}. Perlu bimbingan dan peningkatan dalam ${joinPhrases(bimbinganList.map(t => t.cleanedLabel))}.`;
  } else {
    deskripsiNarasi = `Cukup memahami materi pokok pembelajaran. Perlu bimbingan dan pendampingan intensif dalam ${joinPhrases(bimbinganList.map(t => t.cleanedLabel))}.`;
  }

  // 3. Susun Butir Poin Rinci (Sangat terstruktur menampilkan seluruh butir TP)
  let deskripsiPoin = '';
  if (tercapaiList.length > 0 && bimbinganList.length === 0) {
    deskripsiPoin = `Menunjukkan penguasaan kompetensi yang baik dalam:\n` +
      tercapaiList.map(t => `• ${t.kode}: ${t.cleanedLabel}`).join('\n');
  } else if (tercapaiList.length > 0 && bimbinganList.length > 0) {
    deskripsiPoin = `Tercapai Optimal:\n` +
      tercapaiList.map(t => `• ${t.kode}: ${t.cleanedLabel}`).join('\n') +
      `\nPerlu Peningkatan / Bimbingan:\n` +
      bimbinganList.map(t => `• ${t.kode}: ${t.cleanedLabel}`).join('\n');
  } else {
    deskripsiPoin = `Perlu Pendampingan & Bimbingan Khusus:\n` +
      bimbinganList.map(t => `• ${t.kode}: ${t.cleanedLabel}`).join('\n');
  }

  const capaianTertinggi = tercapaiList.length > 0
    ? `Menunjukkan penguasaan yang baik dalam ${joinPhrases(tercapaiList.map(t => t.cleanedLabel))}.`
    : `Menguasai materi pokok dengan bimbingan pendidik.`;

  const capaianPerluBimbingan = bimbinganList.length > 0
    ? `Perlu peningkatan dalam ${joinPhrases(bimbinganList.map(t => t.cleanedLabel))}.`
    : `Pertahankan capaian kompetensi dan konsistensi belajar.`;

  const deskripsiLengkap = displayStyle === 'poin'
    ? deskripsiPoin
    : displayStyle === 'narasi'
    ? deskripsiNarasi
    : deskripsiRingkas;

  return {
    deskripsiLengkap,
    deskripsiRingkas,
    deskripsiNarasi,
    deskripsiPoin,
    capaianTertinggi,
    capaianPerluBimbingan,
    allTps: activeTps,
  };
}




