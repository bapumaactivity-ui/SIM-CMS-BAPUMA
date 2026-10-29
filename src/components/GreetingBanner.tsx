import React from 'react';
import { User } from '../types';
import { getGreetingAndBirthday } from '../utils/greetingHelper';
import { Sun, Sunrise, Sunset, Moon, Cake, Sparkles, Heart } from 'lucide-react';

interface GreetingBannerProps {
  user: User;
  onDismiss?: () => void;
  variant?: 'compact' | 'expanded';
}

export const GreetingBanner: React.FC<GreetingBannerProps> = ({
  user,
  onDismiss,
  variant = 'compact',
}) => {
  const { greeting, isBirthday, birthdayMessage } = getGreetingAndBirthday(user);

  const getGreetingIcon = () => {
    switch (greeting) {
      case 'Selamat Pagi':
        return <Sunrise className="w-5 h-5 text-amber-500 animate-pulse" />;
      case 'Selamat Siang':
        return <Sun className="w-5 h-5 text-amber-500 animate-spin-slow" />;
      case 'Selamat Sore':
      case 'Selamat Petang':
        return <Sunset className="w-5 h-5 text-orange-500" />;
      case 'Selamat Malam':
      default:
        return <Moon className="w-5 h-5 text-indigo-400" />;
    }
  };

  if (isBirthday) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 p-0.5 shadow-lg shadow-pink-500/20 mb-4 animate-in fade-in duration-300">
        <div className="rounded-[14px] bg-gradient-to-r from-pink-50 via-rose-50 to-amber-50 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center text-2xl shadow-md shrink-0 ring-4 ring-pink-200">
              🎂
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 text-[11px] font-black tracking-wide uppercase border border-pink-200 flex items-center gap-1">
                  <Cake className="w-3 h-3 text-pink-600" />
                  Hari Spesial Ulang Tahun
                </span>
                <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {greeting}!
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-rose-950 mt-1">
                Selamat Ulang Tahun, {user.nama}! 🎉
              </h2>
              <p className="text-xs text-rose-800/90 mt-0.5 leading-relaxed max-w-2xl">
                {birthdayMessage || 'Barakallahu fii umrik! Semoga sehat selalu, berkah umur, serta sukses meraih cita-cita bersama SMK Bakti Putra Mandiri.'}
              </p>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-white/80 hover:bg-white px-3 py-1.5 rounded-xl border border-rose-200 shrink-0 transition-colors shadow-2xs"
            >
              Tutup Ucapan
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200/60 p-3.5 sm:p-4 mb-4 flex items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white border border-blue-200 flex items-center justify-center shrink-0 shadow-2xs">
          {getGreetingIcon()}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-extrabold text-blue-900">
              {greeting}, <span className="text-blue-700">{user.nama}</span>!
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold uppercase">
              {user.role === 'admin' ? 'Administrator' : user.role === 'kepala_sekolah' ? 'Kepala Sekolah' : user.role === 'walas' ? 'Wali Kelas' : user.role === 'siswa' ? 'Siswa Aktif' : 'Dewan Guru'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Selamat beraktivitas di Sistem Terpadu SMK Bakti Putra Mandiri.
          </p>
        </div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded-lg hover:bg-white transition-colors"
          title="Tutup"
        >
          ✕
        </button>
      )}
    </div>
  );
};
