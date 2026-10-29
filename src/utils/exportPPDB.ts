import { FormulirPPDB, SchoolInfo } from '../types';
import * as XLSX from 'xlsx';

/**
 * Utility untuk mengekspor data pendaftar PPDB ke file Excel / CSV (UTF-8 BOM)
 * Aman dibuka di Microsoft Excel, WPS Office, dan Google Sheets.
 */
export function exportPPDBToCSV(
  formulirList: FormulirPPDB[],
  schoolName: string = 'SMK'
): void {
  if (!formulirList || formulirList.length === 0) {
    alert('Tidak ada data pendaftar untuk diunduh.');
    return;
  }

  // Header Kolom CSV Lengkap
  const headers = [
    'No Registrasi',
    'Tanggal Daftar',
    'Status Pendaftaran',
    'Status Konfirmasi',
    'Pilihan Jurusan',
    'NISN',
    'NIK Siswa',
    'No KK',
    'No Akta Kelahiran',
    'Nama Lengkap',
    'Nama Panggilan',
    'Jenis Kelamin',
    'Tempat Lahir',
    'Tanggal Lahir',
    'Agama',
    'No HP/WhatsApp',
    'Email Siswa',
    'Medsos Siswa',
    'Alamat Domisili',
    'Alamat KK',
    'Alamat Sama Dengan KK',
    'Alamat Lengkap',
    'RT',
    'RW',
    'Desa/Kelurahan',
    'Kecamatan/Kabupaten',
    'Kode Pos',
    'Asal Sekolah (SMP/MTs)',
    'No Seri Ijazah/SKL',
    'Nama Ayah',
    'NIK Ayah',
    'Pekerjaan Ayah',
    'Nama Ibu',
    'NIK Ibu',
    'Pekerjaan Ibu',
    'No Telp Ortu',
    'Punya Wali',
    'Nama Wali',
    'NIK Wali',
    'Hubungan Wali',
    'Pekerjaan Wali',
    'No Telp Wali',
    'Punya KIP/PKH',
    'Nomor KIP/PKH',
    'Notifikasi Email Terkirim',
    'NIS Resmi Diterbitkan',
    'Kelas Diterima',
    'Catatan Admin'
  ];

  // Helper untuk escape format CSV (mengatasi tanda koma, kutip dua, atau baris baru)
  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = formulirList.map((f) => {
    const noReg = f.nomorRegistrasi || `REG-${f.id?.substring(0, 8).toUpperCase()}`;
    return [
      escapeCSV(noReg),
      escapeCSV(f.tanggalDaftar || ''),
      escapeCSV(f.statusPendaftaran || ''),
      escapeCSV(f.statusKonfirmasi || ''),
      escapeCSV(f.pilihanJurusan || ''),
      escapeCSV(f.nisn || ''),
      escapeCSV(f.nikSiswa || ''),
      escapeCSV(f.noKk || ''),
      escapeCSV(f.noAktaKelahiran || ''),
      escapeCSV(f.namaLengkap || ''),
      escapeCSV(f.namaPanggilan || ''),
      escapeCSV(f.jenisKelamin || ''),
      escapeCSV(f.tempatLahir || ''),
      escapeCSV(f.tanggalLahir || ''),
      escapeCSV(f.agama === 'Lainnya' ? (f.agamaLainnya || 'Lainnya') : f.agama || ''),
      escapeCSV(f.noHp || f.nomorHp || ''),
      escapeCSV(f.email || f.emailSiswa || ''),
      escapeCSV(f.medsosSiswa || ''),
      escapeCSV(f.alamatDomisili || f.alamatLengkap || ''),
      escapeCSV(f.alamatKk || f.alamatLengkap || ''),
      escapeCSV(f.alamatSamaDenganKk ? 'Ya' : 'Tidak'),
      escapeCSV(f.alamatLengkap || ''),
      escapeCSV(f.rt || ''),
      escapeCSV(f.rw || ''),
      escapeCSV(f.desa || ''),
      escapeCSV(f.kecKab || ''),
      escapeCSV(f.kodePos || ''),
      escapeCSV(f.asalSmp || f.asalSekolah || ''),
      escapeCSV(f.noSeriIjazah || ''),
      escapeCSV(f.namaAyah || ''),
      escapeCSV(f.nikAyah || ''),
      escapeCSV(f.pekerjaanAyah === 'LAINNYA' || f.pekerjaanAyah === 'Lainnya' ? (f.pekerjaanAyahLainnya || 'Lainnya') : f.pekerjaanAyah || ''),
      escapeCSV(f.namaIbu || ''),
      escapeCSV(f.nikIbu || ''),
      escapeCSV(f.pekerjaanIbu === 'LAINNYA' || f.pekerjaanIbu === 'Lainnya' ? (f.pekerjaanIbuLainnya || 'Lainnya') : f.pekerjaanIbu || ''),
      escapeCSV(f.noTelpOrtu || ''),
      escapeCSV(f.punyaWali || (f.namaWali && f.namaWali !== '-' ? 'Ya' : 'Tidak')),
      escapeCSV(f.namaWali || '-'),
      escapeCSV(f.nikWali || '-'),
      escapeCSV(f.hubunganWali || '-'),
      escapeCSV(f.pekerjaanWali || '-'),
      escapeCSV(f.noTelpWali || '-'),
      escapeCSV(f.memilikiKipPkhBpjs || 'Tidak'),
      escapeCSV(f.nomorKipPkhBpjs || ''),
      escapeCSV(f.emailNotifikasiTerkirim ? 'Sudah Terkirim' : 'Belum'),
      escapeCSV(f.nomorIndukSiswaResmi || ''),
      escapeCSV(f.kelasDiterima || ''),
      escapeCSV(f.catatanAdmin || '')
    ].join(',');
  });

  const csvContent = [headers.map(escapeCSV).join(','), ...rows].join('\r\n');

  // Prefix dengan UTF-8 Byte Order Mark (\uFEFF) untuk compatibility Microsoft Excel
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const cleanSchool = schoolName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `Data_Pendaftar_PPDB_${cleanSchool}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Utility untuk mengekspor data pendaftar PPDB langsung ke format berkas Excel (.xlsx)
 * Sangat rapi dibuka di Microsoft Excel, WPS, dan Google Sheets tanpa kendala pemisah koma/titik-koma
 */
export function exportPPDBToExcel(
  formulirList: FormulirPPDB[],
  schoolName: string = 'SMK'
): void {
  if (!formulirList || formulirList.length === 0) {
    alert('Tidak ada data pendaftar untuk diunduh.');
    return;
  }

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
    'No Akta Kelahiran',
    'Nama Lengkap',
    'Nama Panggilan',
    'Jenis Kelamin',
    'Tempat Lahir',
    'Tanggal Lahir',
    'Agama',
    'No HP/WhatsApp',
    'Email Siswa',
    'Medsos Siswa',
    'Alamat Domisili',
    'Alamat KK',
    'Alamat Lengkap',
    'RT',
    'RW',
    'Desa/Kelurahan',
    'Kecamatan/Kabupaten',
    'Kode Pos',
    'Asal Sekolah (SMP/MTs)',
    'No Seri Ijazah/SKL',
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
    f.noAktaKelahiran || '',
    f.namaLengkap || '',
    f.namaPanggilan || '',
    f.jenisKelamin || '',
    f.tempatLahir || '',
    f.tanggalLahir || '',
    f.agama === 'Lainnya' ? (f.agamaLainnya || 'Lainnya') : f.agama || '',
    f.noHp || f.nomorHp || '',
    f.email || f.emailSiswa || '',
    f.medsosSiswa || '',
    f.alamatDomisili || f.alamatLengkap || '',
    f.alamatKk || f.alamatLengkap || '',
    f.alamatLengkap || '',
    f.rt || '',
    f.rw || '',
    f.desa || '',
    f.kecKab || '',
    f.kodePos || '',
    f.asalSmp || f.asalSekolah || '',
    f.noSeriIjazah || '',
    f.namaAyah || '',
    f.nikAyah || '',
    f.pekerjaanAyah || '',
    f.namaIbu || '',
    f.nikIbu || '',
    f.pekerjaanIbu || '',
    f.noTelpOrtu || '',
    f.punyaWali || (f.namaWali && f.namaWali !== '-' ? 'Ya' : 'Tidak'),
    f.namaWali || '-',
    f.memilikiKipPkhBpjs || 'Tidak',
    f.nomorIndukSiswaResmi || '',
    f.kelasDiterima || '',
    f.catatanAdmin || '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = headers.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Data Pendaftar PPDB');

  const cleanSchool = schoolName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Data_Pendaftar_PPDB_${cleanSchool}_${dateStr}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Utility untuk mengekspor Formulir Pendaftaran Siswa Baru langsung ke format Microsoft Word (.doc)
 * Dokumen lengkap dengan Kop Surat Sekolah Resmi, data A/B/C/D, tabel rapi, dan tanda tangan.
 */
export function exportFormulirToWord(
  form: FormulirPPDB,
  schoolInfo?: SchoolInfo
): void {
  const schoolName = schoolInfo?.nama || 'SMK Bakti Putra Mandiri';
  const yayasan = schoolInfo?.kopSekolah?.yayasan || 'YAYASAN BAKTI PUTRA MANDIRI';
  const instansi = schoolInfo?.kopSekolah?.instansi || 'SMK BAKTI PUTRA MANDIRI';
  const subJudul = schoolInfo?.kopSekolah?.subJudul || 'FARMASI - ASISTEN KEPERAWATAN - TATA KECANTIKAN & SPA - PERHOTELAN';
  const alamat = schoolInfo?.alamatLengkap || 'Jl. Sawah, Kp. Sukasari, RT. 06/01, Desa Kabasiran, Kec. Parung Panjang, Kab. Bogor';
  const schoolEmail = schoolInfo?.email || 'bpmkesparungpanjang.action@gmail.com';
  const kontak = schoolInfo?.kopSekolah?.teleponEmail || `Telp: ${schoolInfo?.telepon || '(021) 5978-2345'} | Email: ${schoolEmail} | Website: ${schoolInfo?.website || 'www.smkbaktiputramandiri.sch.id'}`;
  const noReg = form.nomorRegistrasi || `REG-${form.id?.substring(0, 8).toUpperCase()}`;
  const tahunAjaran = schoolInfo?.tahunAjaranSPMB || '2026/2027';
  const cleanName = (form.namaLengkap || 'Siswa').replace(/[^a-zA-Z0-9]/g, '_');

  const pekerjaanAyahStr = form.pekerjaanAyah === 'LAINNYA' || form.pekerjaanAyah === 'Lainnya' 
    ? (form.pekerjaanAyahLainnya || 'Lainnya') 
    : form.pekerjaanAyah || '-';

  const pekerjaanIbuStr = form.pekerjaanIbu === 'LAINNYA' || form.pekerjaanIbu === 'Lainnya' 
    ? (form.pekerjaanIbuLainnya || 'Lainnya') 
    : form.pekerjaanIbu || '-';

  const pekerjaanWaliStr = form.pekerjaanWali === 'LAINNYA' || form.pekerjaanWali === 'Lainnya' 
    ? (form.pekerjaanWaliLainnya || 'Lainnya') 
    : form.pekerjaanWali || '-';

  const wordHtml = `
  <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset='utf-8'>
    <title>Formulir PPDB - ${form.namaLengkap}</title>
    <!--[if gte mso 9]>
    <xml>
      <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
      </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
      body {
        font-family: 'Times New Roman', Times, serif;
        font-size: 11pt;
        color: #000;
        margin: 20mm 20mm 20mm 20mm;
      }
      .kop-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 8px;
      }
      .kop-text {
        text-align: center;
      }
      .kop-yayasan {
        font-size: 11pt;
        font-weight: bold;
        letter-spacing: 1px;
      }
      .kop-instansi {
        font-size: 16pt;
        font-weight: bold;
        margin: 2px 0;
      }
      .kop-sub {
        font-size: 9pt;
        font-weight: bold;
      }
      .kop-alamat {
        font-size: 8.5pt;
        margin-top: 3px;
      }
      .kop-garis {
        border-top: 2px solid #000;
        border-bottom: 1px solid #000;
        height: 3px;
        margin: 6px 0 16px 0;
      }
      .judul-dokumen {
        text-align: center;
        font-size: 13pt;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 4px;
        text-decoration: underline;
      }
      .subjudul-dokumen {
        text-align: center;
        font-size: 9.5pt;
        margin-bottom: 14px;
      }
      .section-title {
        font-size: 10.5pt;
        font-weight: bold;
        background-color: #eaeaea;
        padding: 4px 6px;
        margin-top: 12px;
        margin-bottom: 6px;
        border-left: 4px solid #333;
      }
      table.data-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 8px;
        font-size: 10pt;
      }
      table.data-table td {
        padding: 3.5px 4px;
        vertical-align: top;
      }
      .td-label {
        width: 32%;
        color: #222;
      }
      .td-colon {
        width: 2%;
        text-align: center;
      }
      .td-val {
        width: 66%;
        font-weight: normal;
      }
      .bold {
        font-weight: bold;
      }
      .signatures-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 30px;
        page-break-inside: avoid;
        font-size: 10pt;
      }
      .signatures-table td {
        text-align: center;
        vertical-align: top;
        width: 33.3%;
      }
      .signature-space {
        height: 65px;
      }
    </style>
  </head>
  <body>
    <!-- KOP SURAT RESMI -->
    <table class="kop-table">
      <tr>
        <td class="kop-text">
          <div class="kop-yayasan">${yayasan}</div>
          <div class="kop-instansi">${instansi}</div>
          <div class="kop-sub">${subJudul}</div>
          <div class="kop-alamat">${alamat}</div>
          <div class="kop-alamat">${kontak}</div>
        </td>
      </tr>
    </table>
    <div class="kop-garis"></div>

    <!-- JUDUL -->
    <div class="judul-dokumen">FORMULIR PENDAFTARAN PESERTA DIDIK BARU (PPDB)</div>
    <div class="subjudul-dokumen">
      Tahun Ajaran ${tahunAjaran} &bull; No. Registrasi: <strong>${noReg}</strong> &bull; Gelombang: <strong>${form.gelombang || 'Gelombang 1'}</strong> &bull; Status: <strong>${form.statusPendaftaran}</strong>
    </div>

    <!-- PILIHAN JURUSAN -->
    <table class="data-table" style="background-color: #f7f9fa; border: 1px solid #ccc; margin-bottom: 12px;">
      <tr>
        <td class="td-label" style="font-weight: bold;">KOMPETENSI KEAHLIAN / JURUSAN</td>
        <td class="td-colon">:</td>
        <td class="td-val" style="font-size: 11pt; font-weight: bold; color: #0f4c5c;">${form.pilihanJurusan}</td>
      </tr>
      <tr>
        <td class="td-label">Tanggal Pengisian Pendaftaran</td>
        <td class="td-colon">:</td>
        <td class="td-val">${form.tanggalDaftar || '-'}</td>
      </tr>
    </table>

    <!-- BAGIAN A -->
    <div class="section-title">A. IDENTITAS CALON PESERTA DIDIK</div>
    <table class="data-table">
      <tr>
        <td class="td-label">Nama Lengkap Siswa</td>
        <td class="td-colon">:</td>
        <td class="td-val bold">${(form.namaLengkap || '').toUpperCase()}</td>
      </tr>
      <tr>
        <td class="td-label">Nama Panggilan</td>
        <td class="td-colon">:</td>
        <td class="td-val">${form.namaPanggilan || '-'}</td>
      </tr>
      <tr>
        <td class="td-label">Nomor Induk Siswa Nasional (NISN)</td>
        <td class="td-colon">:</td>
        <td class="td-val bold">${form.nisn}</td>
      </tr>
      <tr>
        <td class="td-label">Nomor Induk Kependudukan (NIK)</td>
        <td class="td-colon">:</td>
        <td class="td-val">${form.nikSiswa || '-'}</td>
      </tr>
      <tr>
        <td class="td-label">Nomor Kartu Keluarga (KK)</td>
        <td class="td-colon">:</td>
        <td class="td-val">${form.noKk || '-'}</td>
      </tr>
      <tr>
        <td class="td-label">Nomor Akta Kelahiran Siswa</td>
        <td class="td-colon">:</td>
        <td class="td-val bold">${form.noAktaKelahiran || '-'}</td>
      </tr>
      <tr>
        <td class="td-label">Tempat, Tanggal Lahir</td>
        <td class="td-colon">:</td>
        <td class="td-val">${form.tempatLahir}, ${form.tanggalLahir}</td>
      </tr>
      <tr>
        <td class="td-label">Jenis Kelamin</td>
        <td class="td-colon">:</td>
        <td class="td-val">${form.jenisKelamin} (Tinggi: ${form.tinggiBadan || '-'} cm, Berat: ${form.beratBadan || '-'} kg)</td>
      </tr>
      <tr>
        <td class="td-label">Agama</td>
        <td class="td-colon">:</td>
        <td class="td-val">${form.agama === 'Lainnya' ? (form.agamaLainnya || 'Lainnya') : form.agama}</td>
      </tr>
      <tr>
        <td class="td-label">Email Siswa (Pendaftar)</td>
        <td class="td-colon">:</td>
        <td class="td-val bold">${form.email || form.emailSiswa || '-'}</td>
      </tr>
      <tr>
        <td class="td-label">Media Sosial Siswa (Medsos)</td>
        <td class="td-colon">:</td>
        <td class="td-val">${form.medsosSiswa || '-'}</td>
      </tr>
      <tr>
        <td class="td-label">Nomor HP / WhatsApp Calon Siswa</td>
        <td class="td-colon">:</td>
        <td class="td-val">${form.noHp || form.nomorHp || '-'}</td>
      </tr>
      <tr>
        <td class="td-label">Alamat Tinggal Berdasarkan KK</td>
        <td class="td-colon">:</td>
        <td class="td-val">${form.alamatKk || form.alamatLengkap || '-'} ${form.rt ? `RT ${form.rt}` : ''} ${form.rw ? `RW ${form.rw}` : ''} ${form.desa ? `Desa ${form.desa}` : ''} ${form.kecKab ? `Kec. ${form.kecKab}` : ''}</td>
      </tr>
      <tr>
        <td class="td-label">Alamat Tinggal Domisili Saat Ini</td>
        <td class="td-colon">:</td>
        <td class="td-val">${form.alamatSamaDenganKk ? `${form.alamatKk || form.alamatLengkap || '-'} (Sama dengan Alamat KK)` : (form.alamatDomisili || form.alamatLengkap || '-')}</td>
      </tr>
      <tr>
        <td class="td-label">Cita-cita & Hobi</td>
        <td class="td-colon">:</td>
        <td class="td-val">Cita-cita: ${form.citaCita === 'Lainnya' ? (form.citaCitaLainnya || 'Lainnya') : form.citaCita} | Hobi: ${form.hobi === 'Lainnya' ? (form.hobiLainnya || 'Lainnya') : form.hobi}</td>
      </tr>
      <tr>
        <td class="td-label">Asal SMP/MTs & No. Seri Ijazah</td>
        <td class="td-colon">:</td>
        <td class="td-val">${form.asalSmp || form.asalSekolah || '-'} (No. Ijazah: ${form.noSeriIjazah || '-'})</td>
      </tr>
    </table>

    <!-- BAGIAN B -->
    <div class="section-title">B. DATA ORANG TUA / WALI MURID</div>
    <table class="data-table">
      <tr>
        <td class="td-label">Nama Ayah Kandung (NIK)</td>
        <td class="td-colon">:</td>
        <td class="td-val bold">${form.namaAyah || '-'} (NIK: ${form.nikAyah || '-'})</td>
      </tr>
      <tr>
        <td class="td-label">Pendidikan & Pekerjaan Ayah</td>
        <td class="td-colon">:</td>
        <td class="td-val">${form.pendidikanAyah || '-'} | Pekerjaan: <strong>${pekerjaanAyahStr}</strong></td>
      </tr>
      <tr>
        <td class="td-label">Pendapatan Ayah per Bulan</td>
        <td class="td-colon">:</td>
        <td class="td-val">${form.pendapatanAyah || '-'}</td>
      </tr>
      <tr>
        <td class="td-label">Nama Ibu Kandung (NIK)</td>
        <td class="td-colon">:</td>
        <td class="td-val bold">${form.namaIbu || '-'} (NIK: ${form.nikIbu || '-'})</td>
      </tr>
      <tr>
        <td class="td-label">Pendidikan & Pekerjaan Ibu</td>
        <td class="td-colon">:</td>
        <td class="td-val">${form.pendidikanIbu || '-'} | Pekerjaan: <strong>${pekerjaanIbuStr}</strong></td>
      </tr>
      <tr>
        <td class="td-label">Pendapatan Ibu per Bulan</td>
        <td class="td-colon">:</td>
        <td class="td-val">${form.pendapatanIbu || '-'}</td>
      </tr>
      <tr>
        <td class="td-label">Nomor Telepon / HP Orang Tua</td>
        <td class="td-colon">:</td>
        <td class="td-val bold">${form.noTelpOrtu || '-'}</td>
      </tr>
      <tr>
        <td class="td-label">Alamat Orang Tua</td>
        <td class="td-colon">:</td>
        <td class="td-val">${form.alamatOrtu || '-'}</td>
      </tr>
      ${(form.punyaWali === 'Ya' || (form.namaWali && form.namaWali !== '-')) ? `
      <tr>
        <td class="td-label bold" style="background-color: #fdf2e9;">Data Wali Murid</td>
        <td class="td-colon" style="background-color: #fdf2e9;">:</td>
        <td class="td-val" style="background-color: #fdf2e9;">
          Nama Wali: <strong>${form.namaWali}</strong> (NIK: ${form.nikWali || '-'})<br/>
          Hubungan dengan Siswa: <strong>${form.hubunganWali || '-'}</strong><br/>
          Pekerjaan Wali: <strong>${pekerjaanWaliStr}</strong> | Pendidikan: ${form.pendidikanWali || '-'}<br/>
          No. HP Wali: <strong>${form.noTelpWali || '-'}</strong> | Alamat: ${form.alamatWali || '-'}
        </td>
      </tr>
      ` : ''}
    </table>

    <!-- BAGIAN C -->
    <div class="section-title">C. BANTUAN SOSIAL & KESEJAHTERAAN</div>
    <table class="data-table">
      <tr>
        <td class="td-label">Memiliki KIP / PKH / BPJS</td>
        <td class="td-colon">:</td>
        <td class="td-val bold">${form.memilikiKipPkhBpjs === 'Ya' ? `Ya (${form.jenisBantuan?.join(', ') || 'KIP/PKH/BPJS'}) - No: ${form.nomorKipPkhBpjs || '-'}` : 'Tidak Memiliki'}</td>
      </tr>
      <tr>
        <td class="td-label">Status Verifikasi Panitia</td>
        <td class="td-colon">:</td>
        <td class="td-val bold">${form.statusPendaftaran} ${form.nomorIndukSiswaResmi ? `(NIS Resmi: ${form.nomorIndukSiswaResmi})` : ''}</td>
      </tr>
      <tr>
        <td class="td-label">Catatan Panitia Verifikator</td>
        <td class="td-colon">:</td>
        <td class="td-val"><em>${form.catatanAdmin || 'Berkas telah tersimpan di sistem SPMB.'}</em></td>
      </tr>
    </table>

    <!-- LEMBAR TANDA TANGAN -->
    <table class="signatures-table">
      <tr>
        <td></td>
        <td></td>
        <td>Bogor, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
      </tr>
      <tr>
        <td>
          Calon Peserta Didik Baru,
          <div class="signature-space"></div>
          <strong><u>${(form.namaLengkap || '').toUpperCase()}</u></strong><br/>
          NISN: ${form.nisn}
        </td>
        <td>
          Orang Tua / Wali Murid,
          <div class="signature-space"></div>
          <strong><u>${(form.namaAyah || form.namaIbu || form.namaWali || '..................................').toUpperCase()}</u></strong><br/>
          Tanda Tangan & Nama Jelas
        </td>
        <td>
          Panitia SPMB / Kepala Sekolah,
          <div class="signature-space"></div>
          <strong><u>${schoolInfo?.kepalaSekolah || 'Dr. Nurul Husnul Lail, M.Kes.'}</u></strong><br/>
          NIP. ${schoolInfo?.nipKepalaSekolah || '197108151998021004'}
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const blob = new Blob([wordHtml], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Formulir_PPDB_${cleanName}_${form.nisn || form.id}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

