import { User, Kelas } from '../types';

export interface RawStudentInput {
  no: number;
  nipd: string;
  nisn: string;
  nama: string;
  jk: 'P' | 'L';
  tempatLahir: string;
  tanggalLahir: string;
  kelas: string;
  jabatanKelas?: string;
}

export const RAW_STUDENTS_77: RawStudentInput[] = [
  { no: 1, nipd: "24.25.10.001", nisn: "0094701443", nama: "A'inun Latifah", jk: "P", tempatLahir: "Jepara", tanggalLahir: "2009-01-20", kelas: "XII Asisten Farmasi", jabatanKelas: "Ketua Kelas" },
  { no: 2, nipd: "24.25.10.002", nisn: "3087159255", nama: "Alin Putri Utami", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2008-10-07", kelas: "XII Asisten Keperawatan", jabatanKelas: "Ketua Kelas" },
  { no: 3, nipd: "24.25.10.004", nisn: "0092132446", nama: "Dewi Habsyah", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-03-03", kelas: "XII Asisten Keperawatan", jabatanKelas: "Sekretaris" },
  { no: 4, nipd: "24.25.10.005", nisn: "0095314358", nama: "Dinda Julliantiny Wijaya", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-07-13", kelas: "XII Asisten Farmasi", jabatanKelas: "Sekretaris" },
  { no: 5, nipd: "24.25.10.006", nisn: "0154396877", nama: "Dira Pratiwi", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-01-13", kelas: "XII Asisten Keperawatan", jabatanKelas: "Bendahara" },
  { no: 6, nipd: "24.25.10.007", nisn: "0081407803", nama: "Dwi Sarah", jk: "P", tempatLahir: "Blora", tanggalLahir: "2008-07-07", kelas: "XII Asisten Farmasi", jabatanKelas: "Bendahara" },
  { no: 7, nipd: "24.25.10.008", nisn: "3090638963", nama: "Erlin", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-06-13", kelas: "XII Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 8, nipd: "24.25.10.009", nisn: "0099043847", nama: "Hilma Aulia", jk: "P", tempatLahir: "Tangerang", tanggalLahir: "2009-07-26", kelas: "XII Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 9, nipd: "24.25.10.010", nisn: "3092699705", nama: "Hurul A'ini Putri", jk: "P", tempatLahir: "Tangerang", tanggalLahir: "2009-08-10", kelas: "XII Asisten Farmasi", jabatanKelas: "Anggota" },
  { no: 10, nipd: "24.25.10.012", nisn: "0091944364", nama: "Jihan Julistia", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-05-16", kelas: "XII Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 11, nipd: "24.25.10.013", nisn: "0088714003", nama: "Joy Ulina Stevany Munthe", jk: "P", tempatLahir: "Sarolangun", tanggalLahir: "2008-07-28", kelas: "XII Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 12, nipd: "24.25.10.014", nisn: "0097799282", nama: "Keiyla Utami Lutfifah", jk: "P", tempatLahir: "Tangerang", tanggalLahir: "2009-09-28", kelas: "XII Asisten Farmasi", jabatanKelas: "Anggota" },
  { no: 13, nipd: "24.25.10.015", nisn: "0097982143", nama: "Keizha Septiani", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-12-24", kelas: "XII Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 14, nipd: "24.25.10.016", nisn: "0097731645", nama: "Keysha Putri", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-02-23", kelas: "XII Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 15, nipd: "24.25.10.017", nisn: "0073980248", nama: "Khoirun Nisa", jk: "P", tempatLahir: "Jakarta", tanggalLahir: "2007-10-22", kelas: "XII Asisten Farmasi", jabatanKelas: "Anggota" },
  { no: 16, nipd: "24.25.10.018", nisn: "3093738813", nama: "Masayu Alma Qvira", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-01-17", kelas: "XII Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 17, nipd: "24.25.10.019", nisn: "0091657994", nama: "Melisa Andini", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-05-05", kelas: "XII Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 18, nipd: "24.25.10.020", nisn: "0099559631", nama: "Munawaroh", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-02-20", kelas: "XII Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 19, nipd: "24.25.10.021", nisn: "0083183812", nama: "Nabila Khairani Ramadhanti", jk: "P", tempatLahir: "Lebong", tanggalLahir: "2008-09-17", kelas: "XII Asisten Farmasi", jabatanKelas: "Anggota" },
  { no: 20, nipd: "24.25.10.022", nisn: "0091204399", nama: "Nayzira Yona Vortuna Putri", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-03-01", kelas: "XII Asisten Farmasi", jabatanKelas: "Anggota" },
  { no: 21, nipd: "24.25.10.023", nisn: "0092740208", nama: "Neisya Nur Aulia", jk: "P", tempatLahir: "Jakarta", tanggalLahir: "2009-03-22", kelas: "XII Asisten Farmasi", jabatanKelas: "Anggota" },
  { no: 22, nipd: "24.25.10.024", nisn: "3101498021", nama: "Nesa Anggraeni", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2010-10-25", kelas: "XII Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 23, nipd: "24.25.10.025", nisn: "3093584005", nama: "Ninda Aulia", jk: "P", tempatLahir: "Tangerang", tanggalLahir: "2009-12-19", kelas: "XII Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 24, nipd: "24.25.10.026", nisn: "0098840056", nama: "Nurul Maulinda Putri", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-04-20", kelas: "XII Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 25, nipd: "24.25.10.028", nisn: "0092625422", nama: "Putri Anugrah Khumaeroh", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-07-30", kelas: "XII Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 26, nipd: "24.25.10.029", nisn: "0081860104", nama: "Raficca Rahma", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2008-11-28", kelas: "XII Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 27, nipd: "24.25.10.030", nisn: "0093232136", nama: "Rahma Listiani", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-01-09", kelas: "XII Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 28, nipd: "24.25.10.031", nisn: "0092040539", nama: "Silviatu Assyifa", jk: "P", tempatLahir: "Jakarta", tanggalLahir: "2009-01-11", kelas: "XII Asisten Farmasi", jabatanKelas: "Anggota" },
  { no: 29, nipd: "24.25.10.032", nisn: "0092094297", nama: "Siti Zahra Yulianingsih", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-05-10", kelas: "XII Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 30, nipd: "24.25.10.033", nisn: "0097964334", nama: "Sri Mustika Rahayu", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-08-27", kelas: "XII Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 31, nipd: "24.25.10.034", nisn: "0098489136", nama: "Tazkiatul Aulia", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-04-14", kelas: "XII Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 32, nipd: "24.25.10.035", nisn: "0081650207", nama: "Tiara Muslimah", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2008-09-25", kelas: "XII Asisten Farmasi", jabatanKelas: "Anggota" },
  { no: 33, nipd: "24.25.10.036", nisn: "0099113676", nama: "Ummu Aulia Rahma", jk: "P", tempatLahir: "Tangerang Selatan", tanggalLahir: "2009-02-22", kelas: "XII Asisten Farmasi", jabatanKelas: "Anggota" },
  { no: 34, nipd: "25.26.10.001", nisn: "3102094423", nama: "Airin Tazkiatul Ummah", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2010-01-06", kelas: "XI Asisten Keperawatan", jabatanKelas: "Ketua Kelas" },
  { no: 35, nipd: "25.26.10.002", nisn: "3105067428", nama: "Alin Nur Aprilia", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2010-04-22", kelas: "XI Asisten Keperawatan", jabatanKelas: "Sekretaris" },
  { no: 36, nipd: "25.26.10.003", nisn: "0106060074", nama: "Andita Al-Fitriani", jk: "P", tempatLahir: "Tangerang", tanggalLahir: "2010-09-10", kelas: "XI Asisten Keperawatan", jabatanKelas: "Bendahara" },
  { no: 37, nipd: "25.26.10.004", nisn: "3091963666", nama: "Anggraini", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-07-19", kelas: "XI Asisten Farmasi", jabatanKelas: "Ketua Kelas" },
  { no: 38, nipd: "25.26.10.005", nisn: "0108095599", nama: "Atina Nahya Arumwangi", jk: "P", tempatLahir: "Jakarta", tanggalLahir: "2010-06-15", kelas: "XI Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 39, nipd: "25.26.10.006", nisn: "0099704594", nama: "Dinda Khoirunnisa Hidayat", jk: "P", tempatLahir: "Tangerang", tanggalLahir: "2009-09-07", kelas: "XI Asisten Farmasi", jabatanKelas: "Sekretaris" },
  { no: 40, nipd: "25.26.10.007", nisn: "0109200323", nama: "Elia Aprilia", jk: "P", tempatLahir: "Tangerang", tanggalLahir: "2010-04-07", kelas: "XI Asisten Farmasi", jabatanKelas: "Bendahara" },
  { no: 41, nipd: "25.26.10.008", nisn: "0104904474", nama: "Fidya Aura Febrina", jk: "P", tempatLahir: "Jakarta", tanggalLahir: "2010-02-28", kelas: "XI Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 42, nipd: "25.26.10.009", nisn: "0103226391", nama: "Fiska Agustin", jk: "P", tempatLahir: "Tangerang", tanggalLahir: "2010-08-06", kelas: "XI Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 43, nipd: "25.26.10.010", nisn: "0103566716", nama: "Greace Febrisela Aring", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2010-02-02", kelas: "XI Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 44, nipd: "25.26.10.012", nisn: "0098934924", nama: "Imellia Nur Bakhri", jk: "P", tempatLahir: "Brebes", tanggalLahir: "2009-10-08", kelas: "XI Asisten Farmasi", jabatanKelas: "Anggota" },
  { no: 45, nipd: "25.26.10.013", nisn: "3107215634", nama: "Indira Candra Maolidia", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2010-02-20", kelas: "XI Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 46, nipd: "25.26.10.014", nisn: "0103635979", nama: "Jessica Ami Nugraha", jk: "P", tempatLahir: "Jakarta", tanggalLahir: "2010-04-05", kelas: "XI Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 47, nipd: "25.26.10.015", nisn: "0095257645", nama: "Jihan Aulya Putri", jk: "P", tempatLahir: "Jakarta", tanggalLahir: "2009-09-10", kelas: "XI Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 48, nipd: "25.26.10.017", nisn: "0097114577", nama: "Kayla Mutia Handayani", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2010-12-21", kelas: "XI Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 49, nipd: "25.26.10.018", nisn: "0105863749", nama: "Kinanti Airrani Purwanto", jk: "P", tempatLahir: "Jakarta", tanggalLahir: "2010-01-22", kelas: "XI Asisten Farmasi", jabatanKelas: "Anggota" },
  { no: 50, nipd: "25.26.10.019", nisn: "0101124340", nama: "Marsya Dwi Riyanti", jk: "P", tempatLahir: "Tangerang", tanggalLahir: "2010-03-28", kelas: "XI Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 51, nipd: "25.26.10.021", nisn: "3103919729", nama: "Nabila Azzahra", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2010-05-06", kelas: "XI Asisten Farmasi", jabatanKelas: "Anggota" },
  { no: 52, nipd: "25.26.10.022", nisn: "0093990285", nama: "Nadiva", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-12-02", kelas: "XI Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 53, nipd: "25.26.10.023", nisn: "3101209433", nama: "Najwatun Nafis", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2010-08-12", kelas: "XI Asisten Farmasi", jabatanKelas: "Anggota" },
  { no: 54, nipd: "25.26.10.024", nisn: "0107868497", nama: "Nazwa Aprilia", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2010-04-25", kelas: "XI Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 55, nipd: "25.26.10.025", nisn: "0093198847", nama: "Nazwa Putri Aisyah", jk: "P", tempatLahir: "Pati", tanggalLahir: "2009-10-02", kelas: "XI Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 56, nipd: "25.26.10.026", nisn: "0107675662", nama: "Neysha Andriani", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2010-06-17", kelas: "XI Asisten Farmasi", jabatanKelas: "Anggota" },
  { no: 57, nipd: "25.26.10.027", nisn: "0101742334", nama: "Niki Dhitia Handayani", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2010-05-21", kelas: "XI Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 58, nipd: "25.26.10.028", nisn: "3095468000", nama: "Oktavia Amalia", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-10-31", kelas: "XI Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 59, nipd: "25.26.10.029", nisn: "0099410863", nama: "Putri Syakila", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-09-23", kelas: "XI Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 60, nipd: "25.26.10.031", nisn: "0099327499", nama: "Rezky Angraeni Panjaitan", jk: "P", tempatLahir: "Paniaran", tanggalLahir: "2009-10-03", kelas: "XI Asisten Farmasi", jabatanKelas: "Anggota" },
  { no: 61, nipd: "25.26.10.032", nisn: "3105218085", nama: "Silvy Aulia Rahma", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2010-06-29", kelas: "XI Asisten Farmasi", jabatanKelas: "Anggota" },
  { no: 62, nipd: "25.26.10.033", nisn: "0099077689", nama: "Suci Elka Kirana", jk: "P", tempatLahir: "Jakarta", tanggalLahir: "2009-03-24", kelas: "XI Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 63, nipd: "25.26.10.034", nisn: "0091352087", nama: "Vanesya Putri Amandari", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2009-10-23", kelas: "XI Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 64, nipd: "25.26.10.035", nisn: "0108902030", nama: "Nurmila Anggita", jk: "P", tempatLahir: "Tangerang", tanggalLahir: "2010-01-13", kelas: "XI Asisten Keperawatan", jabatanKelas: "Anggota" },
  { no: 65, nipd: "25.26.10.036", nisn: "0094496503", nama: "Aisyah Nur Fauziah", jk: "P", tempatLahir: "Tangerang", tanggalLahir: "2009-07-28", kelas: "XI Asisten Farmasi", jabatanKelas: "Anggota" },
  { no: 66, nipd: "26.27.10.002", nisn: "0117573036", nama: "Cinta Dwi Shavira", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2011-02-02", kelas: "X Kesehatan", jabatanKelas: "Ketua Kelas" },
  { no: 67, nipd: "26.27.10.003", nisn: "0101519178", nama: "Desvita Nur Oktaviani", jk: "P", tempatLahir: "Jakarta", tanggalLahir: "2010-10-26", kelas: "X Kesehatan", jabatanKelas: "Sekretaris" },
  { no: 68, nipd: "26.27.10.004", nisn: "0109884223", nama: "Dira Rahma Aulia", jk: "P", tempatLahir: "Tangerang", tanggalLahir: "2010-10-11", kelas: "X Kesehatan", jabatanKelas: "Bendahara" },
  { no: 69, nipd: "26.27.10.005", nisn: "3119518560", nama: "Hala Hayati Afifah", jk: "P", tempatLahir: "Tangerang", tanggalLahir: "2011-05-26", kelas: "X Kesehatan", jabatanKelas: "Anggota" },
  { no: 70, nipd: "26.27.10.006", nisn: "0115731832", nama: "Indah Nazwa Salsabila", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2011-02-14", kelas: "X Kesehatan", jabatanKelas: "Anggota" },
  { no: 71, nipd: "26.27.10.007", nisn: "0118683745", nama: "Indriyanti", jk: "P", tempatLahir: "Tangerang", tanggalLahir: "2011-06-06", kelas: "X Kesehatan", jabatanKelas: "Anggota" },
  { no: 72, nipd: "26.27.10.008", nisn: "0111574151", nama: "Kharisa Octaviani", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2011-10-19", kelas: "X Kesehatan", jabatanKelas: "Anggota" },
  { no: 73, nipd: "26.27.10.009", nisn: "0119205058", nama: "Putri Aliya", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2011-06-14", kelas: "X Kesehatan", jabatanKelas: "Anggota" },
  { no: 74, nipd: "26.27.10.010", nisn: "0108321011", nama: "Salsabila Anindya Putri", jk: "P", tempatLahir: "Cirebon", tanggalLahir: "2010-10-03", kelas: "X Kesehatan", jabatanKelas: "Anggota" },
  { no: 75, nipd: "26.27.10.011", nisn: "0112875155", nama: "Shabrina Najwa Kamila", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2011-03-15", kelas: "X Kesehatan", jabatanKelas: "Anggota" },
  { no: 76, nipd: "26.27.10.012", nisn: "3103116310", nama: "Shalwa Nurdiansyah", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2010-10-08", kelas: "X Kesehatan", jabatanKelas: "Anggota" },
  { no: 77, nipd: "26.27.10.013", nisn: "0111892889", nama: "Zahra Diningrum", jk: "P", tempatLahir: "Bogor", tanggalLahir: "2011-07-13", kelas: "X Kesehatan", jabatanKelas: "Anggota" },
];

export const RAW_STUDENTS_78 = RAW_STUDENTS_77;

export const KELAS_ID_MAP: Record<string, string> = {
  "X Kesehatan": "k-x-kes",
  "XI Asisten Keperawatan": "k-xi-kep",
  "XI Asisten Farmasi": "k-xi-far",
  "XII Asisten Keperawatan": "k-xii-kep",
  "XII Asisten Farmasi": "k-xii-far",
  "Kelas X Kesehatan": "k-x-kes",
  "Kelas XI Asisten Keperawatan": "k-xi-kep",
  "Kelas XI Asisten Farmasi": "k-xi-far",
  "Kelas XII Asisten Keperawatan": "k-xii-kep",
  "Kelas XII Asisten Farmasi": "k-xii-far",
};

export const KELAS_JURUSAN_MAP: Record<string, string> = {
  "X Kesehatan": "Kesehatan",
  "XI Asisten Keperawatan": "Asisten Keperawatan",
  "XI Asisten Farmasi": "Farmasi",
  "XII Asisten Keperawatan": "Asisten Keperawatan",
  "XII Asisten Farmasi": "Farmasi",
  "Kelas X Kesehatan": "Kesehatan",
  "Kelas XI Asisten Keperawatan": "Asisten Keperawatan",
  "Kelas XI Asisten Farmasi": "Farmasi",
  "Kelas XII Asisten Keperawatan": "Asisten Keperawatan",
  "Kelas XII Asisten Farmasi": "Farmasi",
};

// Convert raw students to system User objects
export const GENERATED_STUDENT_USERS: User[] = RAW_STUDENTS_77.map((s, idx) => {
  const cleanKelas = s.kelas.replace(/^Kelas\s+/i, '').trim();
  const kelasId = KELAS_ID_MAP[cleanKelas] || KELAS_ID_MAP[s.kelas] || `k-auto-${cleanKelas.toLowerCase().replace(/\s+/g, '-')}`;
  const jurusan = KELAS_JURUSAN_MAP[cleanKelas] || KELAS_JURUSAN_MAP[s.kelas] || (cleanKelas.includes('Farmasi') ? 'Farmasi' : 'Asisten Keperawatan');
  
  return {
    id: `u-siswa-${String(idx + 1).padStart(3, '0')}`,
    username: s.nipd, // NIPD as main username/ID
    nama: s.nama,
    role: 'siswa' as const,
    nipOrNis: s.nipd,
    nipd: s.nipd,
    nisn: s.nisn,
    tempatLahir: s.tempatLahir,
    tanggalLahir: s.tanggalLahir,
    password: 'siswa', // Default password for students
    idKelas: kelasId,
    namaKelas: cleanKelas,
    kelas: cleanKelas,
    jurusan: jurusan,
    jenisKelamin: 'Perempuan',
    statusAktif: true,
    telepon: `0812${String(10000000 + idx * 12345).slice(0, 8)}`,
    email: `${s.nama.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}${idx + 1}@siswa.bpm.sch.id`,
    alamat: `Kp. Parung Panjang RT 02/RW 03, ${s.tempatLahir}`,
    fotoProfilUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(s.nama)}&glassesProbability=30`,
    jabatanKelas: s.jabatanKelas || 'Anggota',
  };
});

export const STUDENTS_RAW_DATA = RAW_STUDENTS_77;
