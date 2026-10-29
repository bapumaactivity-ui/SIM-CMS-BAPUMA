export interface GreetingInfo {
  greeting: 'Selamat Pagi' | 'Selamat Siang' | 'Selamat Sore' | 'Selamat Petang' | 'Selamat Malam';
  isBirthday: boolean;
  birthdayMessage?: string;
  fullMessage: string;
}

/**
 * Returns time-appropriate Indonesian greeting and checks whether today is the user's birthday.
 */
export function getGreetingAndBirthday(user: { nama?: string; tanggalLahir?: string } | null): GreetingInfo {
  const now = new Date();
  const hour = now.getHours();

  let greeting: GreetingInfo['greeting'];
  if (hour >= 4 && hour < 11) {
    greeting = 'Selamat Pagi';
  } else if (hour >= 11 && hour < 15) {
    greeting = 'Selamat Siang';
  } else if (hour >= 15 && hour < 18) {
    greeting = 'Selamat Sore';
  } else if (hour >= 18 && hour < 20) {
    greeting = 'Selamat Petang';
  } else {
    greeting = 'Selamat Malam';
  }

  let isBirthday = false;
  let birthdayMessage = '';

  if (user?.tanggalLahir) {
    const todayMonth = now.getMonth() + 1; // 1-12
    const todayDate = now.getDate(); // 1-31

    let birthMonth: number | null = null;
    let birthDate: number | null = null;

    const raw = user.tanggalLahir.trim();
    if (raw.includes('-')) {
      const parts = raw.split('-');
      if (parts.length === 3) {
        birthMonth = parseInt(parts[1], 10);
        birthDate = parseInt(parts[2], 10);
      }
    } else {
      const months = [
        'januari', 'februari', 'maret', 'april', 'mei', 'juni',
        'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
      ];
      const parts = raw.toLowerCase().split(/\s+/);
      if (parts.length >= 2) {
        birthDate = parseInt(parts[0], 10);
        const mIdx = months.findIndex(m => parts[1].includes(m));
        if (mIdx !== -1) {
          birthMonth = mIdx + 1;
        }
      }
    }

    if (birthMonth === todayMonth && birthDate === todayDate) {
      isBirthday = true;
      birthdayMessage = `Selamat Ulang Tahun, ${user.nama || 'Bapak/Ibu/Ananda'}! 🎉🎂 Barakallahu fii umrik, semoga panjang umur, sehat selalu, dimurahkan rezeki dan senantiasa meraih prestasi terbaik bersama SMK Bakti Putra Mandiri.`;
    }
  }

  const name = user?.nama || '';
  const fullMessage = isBirthday
    ? `🎉 ${greeting} & Selamat Ulang Tahun, ${name}! 🎂`
    : `${greeting}, ${name}! Selamat beraktivitas di Portal Terpadu SMK Bakti Putra Mandiri.`;

  return {
    greeting,
    isBirthday,
    birthdayMessage,
    fullMessage,
  };
}
