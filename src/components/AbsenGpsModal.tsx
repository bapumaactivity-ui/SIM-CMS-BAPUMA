import React, { useState, useEffect, useRef } from 'react';
import { User, SchoolInfo, AbsensiRecord } from '../types';
import { 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Sparkles, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  Building2,
  Clock,
  Camera,
  RotateCw,
  Trash2
} from 'lucide-react';
import { 
  DEFAULT_SCHOOL_LAT, 
  DEFAULT_SCHOOL_LNG, 
  DEFAULT_RADIUS_METERS, 
  DEFAULT_MAPS_URL, 
  getDistanceToSchoolMeters,
  getEffectiveDistanceMeters 
} from '../utils/geoMapsHelper';
import { isRecordForStudent, getLocalDateString, getLocalTimeString, isHariSekolahEfektif, getNamaHariIndo, getAlasanHariTidakEfektif } from '../utils/academicHelpers';

interface AbsenGpsModalProps {
  currentUser: User;
  schoolInfo: SchoolInfo;
  absensiList: AbsensiRecord[];
  onAddAbsensi: (record: AbsensiRecord) => void;
  onClose: () => void;
}

export const AbsenGpsModal: React.FC<AbsenGpsModalProps> = ({
  currentUser,
  schoolInfo,
  absensiList,
  onAddAbsensi,
  onClose,
}) => {
  const targetLat = schoolInfo.lokasiSekolah?.latitude ?? DEFAULT_SCHOOL_LAT;
  const targetLng = schoolInfo.lokasiSekolah?.longitude ?? DEFAULT_SCHOOL_LNG;
  // Radius default 250m menjamin jangkauan seluruh area kelas & laboratorium SMK Bakti Putra Mandiri
  const configuredRadius = schoolInfo.lokasiSekolah?.radiusMeters ?? DEFAULT_RADIUS_METERS;
  const maxRadius = Math.max(250, configuredRadius);
  const mapsUrl = schoolInfo.lokasiSekolah?.mapsUrl || DEFAULT_MAPS_URL;

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Optional Selfie / Bukti Foto Kehadiran
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check if student already attended today
  const todayStr = getLocalDateString();
  const studentNipd = currentUser.nipd || currentUser.nipOrNis;
  const alreadyToday = absensiList.find(a => 
    isRecordForStudent(a, currentUser) && 
    a.tanggal === todayStr
  );

  // Stop camera tracks helper
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Start camera for selfie/photo proof
  const startCamera = async (facing: 'user' | 'environment' = cameraFacing) => {
    stopCameraStream();
    setCameraError(null);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false
        });
      } catch {
        // Fallback without strict constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }
      streamRef.current = stream;
      setIsCameraOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.warn);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Kamera tidak dapat diakses atau izin ditolak. Pastikan izin kamera telah diberikan di browser Anda.');
      setIsCameraOpen(false);
    }
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    if (isCameraOpen) {
      startCamera(nextFacing);
    }
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, 240, 240);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        setCapturedPhoto(dataUrl);
        stopCameraStream();
        setIsCameraOpen(false);
      }
    } catch (err) {
      console.warn('Snapshot error:', err);
    }
  };

  // Attach stream when video element renders
  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.warn);
    }
  }, [isCameraOpen]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopWatching = () => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const handlePositionSuccess = (position: GeolocationPosition) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    
    const dist = getDistanceToSchoolMeters(lat, lng, targetLat, targetLng);
    
    setUserCoords(prev => {
      if (!prev || (accuracy && (!prev.accuracy || accuracy <= prev.accuracy))) {
        return { lat, lng, accuracy };
      }
      return prev;
    });

    setDistance(prevDist => {
      if (prevDist === null) return dist;
      return Math.min(prevDist, dist);
    });

    setIsLocating(false);
  };

  // Request high-accuracy GPS coordinates from device with continuous refinement
  const requestLocation = () => {
    setIsLocating(true);
    setLocationError(null);
    stopWatching();

    if (!navigator.geolocation) {
      setLocationError('Perangkat atau browser Anda tidak mendukung fitur Geolocation GPS.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      handlePositionSuccess,
      (error) => {
        let msg = 'Gagal mendeteksi lokasi GPS Anda.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Izin akses lokasi ditolak oleh browser/perangkat Anda. Mohon izinkan akses lokasi (GPS) pada browser/HP Anda untuk melakukan presensi mandiri.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Sinyal GPS tidak tersedia atau perangkat sedang di dalam ruangan tanpa penerimaan sinyal.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Waktu permintaan lokasi habis (timeout). Silakan coba lagi.';
        }
        setLocationError(msg);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );

    // Watch position continuously to lock GPS satellites and refine accuracy
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handlePositionSuccess,
        () => {}, // fallback quietly if watch error occurs
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 1000,
        }
      );
    } catch (e) {
      console.warn('watchPosition unavailable:', e);
    }
  };

  useEffect(() => {
    requestLocation();
    return () => {
      stopWatching();
    };
  }, []);

  const effectiveDistance = distance !== null ? getEffectiveDistanceMeters(distance, userCoords?.accuracy) : null;
  const isWithinRadius = (distance !== null && distance <= maxRadius) || 
                         (effectiveDistance !== null && effectiveDistance <= maxRadius);

  const isWeekendToday = !isHariSekolahEfektif(todayStr);

  const handleConfirmAttendance = () => {
    if (isWeekendToday) {
      const alasan = getAlasanHariTidakEfektif(todayStr) || 'Hari Libur';
      alert(`Hari ini (${getNamaHariIndo(todayStr)}, ${todayStr}) adalah ${alasan}. Sesuai kebijakan SMK Bakti Putra Mandiri, otomatis tidak ada presensi.`);
      return;
    }

    if (!isWithinRadius) {
      alert(`Presensi ditolak! Jarak Anda (${Math.round(distance || 0)}m) melebihi batas toleransi jangkauan sekolah (${maxRadius}m).`);
      return;
    }

    if (alreadyToday) {
      alert(`Anda sudah tercatat presensi hari ini (${alreadyToday.status}) pada pukul ${alreadyToday.waktu} WIB.`);
      return;
    }

    setIsSubmitting(true);
    const now = new Date();
    const timeStr = getLocalTimeString(now);
    const roundDist = Math.round(distance || 0);

    const record: AbsensiRecord = {
      id: `abs-gps-${Date.now()}-${currentUser.id}`,
      userId: currentUser.id,
      tanggal: todayStr,
      waktu: timeStr,
      nipd: studentNipd,
      nisn: currentUser.nisn || currentUser.username,
      namaSiswa: currentUser.nama,
      kelas: (currentUser.kelas || currentUser.namaKelas || 'X Farmasi 1').replace(/^Kelas\s+/i, ''),
      status: 'Hadir',
      metode: `GPS Geofence Mandiri (<${maxRadius}M)`,
      petugas: 'Siswa Mandiri (Geofence Maps SMK Bakti Putra Mandiri)',
      keterangan: `Hadir tepat waktu tervalidasi GPS Geofence SMK Bakti Putra Mandiri radius ${roundDist}m (Maks. ${maxRadius}M)${capturedPhoto ? ' [Foto Selfie Terverifikasi]' : ''}`,
      lokasi: userCoords ? `${userCoords.lat.toFixed(6)}, ${userCoords.lng.toFixed(6)} (Akurasi ~${Math.round(userCoords.accuracy || 0)}m)` : undefined,
      fotoBukti: capturedPhoto || undefined,
    };

    onAddAbsensi(record);
    setIsSubmitting(false);
    setSuccessMessage(`Alhamdulillah! Presensi Hadir Anda berhasil diverifikasi pada pukul ${timeStr} WIB pada jarak ${roundDist} meter dari SMK Bakti Putra Mandiri.`);
    
    setTimeout(() => {
      onClose();
    }, 2800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0 my-8">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-bold border border-emerald-400/40">
              <Navigation className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
              <span>GEOFENCE MAPS PRESENSI MANDIRI ({maxRadius} METER)</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white">
              Validasi Geofence SMK Bakti Putra Mandiri
            </h3>
            <p className="text-xs text-emerald-100">
              Presensi mandiri hanya dapat diajukan jika Anda berada dalam radius toleransi maksimal {maxRadius} meter dari titik resmi sekolah.
            </p>
          </div>

          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-1.5 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Success Notice */}
          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-bold flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>{successMessage}</div>
            </div>
          )}

          {/* Already Attended Warning */}
          {alreadyToday && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Anda sudah melakukan presensi hari ini: <strong>{alreadyToday.status}</strong> pada pukul {alreadyToday.waktu} WIB ({alreadyToday.metode}).
              </span>
            </div>
          )}

          {/* School Target Location Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-slate-800 text-sm">
                  {schoolInfo.nama || 'SMK Kesehatan Bakti Putra Mandiri'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {schoolInfo.alamat || 'Jl. Sawah, Kp. Sukasari RT. 06/01, Desa Kabasiran, Parungpanjang, Bogor 16360'}
              </p>
              <div className="font-mono text-[10px] text-slate-600 flex flex-wrap items-center gap-2">
                <span>Koordinat: <strong className="text-slate-800 font-bold">{targetLat.toFixed(7)}, {targetLng.toFixed(7)}</strong></span>
                <span>•</span>
                <span>Toleransi Radius: <strong className="text-emerald-700 font-bold">{maxRadius} Meter</strong></span>
              </div>
            </div>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 font-bold text-[11px] shadow-2xs transition-all shrink-0"
              title="Buka titik koordinat resmi SMK Bakti Putra Mandiri di Google Maps"
            >
              <span>Buka Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Visual Embedded Map Preview */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden relative shadow-inner bg-slate-100 h-44 sm:h-48">
            <iframe
              title="Peta Lokasi SMK Bakti Putra Mandiri"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              marginHeight={0}
              marginWidth={0}
              src={`https://maps.google.com/maps?q=${targetLat},${targetLng}&hl=id&z=18&output=embed`}
              className="w-full h-full object-cover"
            ></iframe>

            {/* Radius Overlay Badge */}
            <div className="absolute top-2.5 left-2.5 bg-slate-900/85 backdrop-blur-xs text-white px-3 py-1 rounded-xl text-[10px] font-bold border border-white/20 shadow-md flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Radius Presensi Resmi: Maksimal {maxRadius} Meter</span>
            </div>
          </div>

          {/* Live GPS Geolocation Status */}
          <div className="rounded-2xl p-4 border transition-all space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-blue-500" />
                Status Deteksi Posisi Anda
              </span>

              <button
                type="button"
                onClick={requestLocation}
                disabled={isLocating}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition-colors"
                title="Refresh Lokasi GPS"
              >
                <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                <span>Cek Ulang GPS</span>
              </button>
            </div>

            {isLocating && (
              <div className="py-4 text-center space-y-2">
                <div className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-medium text-slate-600">
                  Mengakses sensor GPS perangkat Anda dan mengukur jarak ke gerbang sekolah...
                </p>
              </div>
            )}

            {!isLocating && locationError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Akses Lokasi GPS Gagal</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  {locationError}
                </p>
              </div>
            )}

            {!isLocating && userCoords && distance !== null && (
              <div className={`p-4 rounded-xl border space-y-2 ${
                isWithinRadius 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isWithinRadius ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <span className="font-extrabold text-sm">
                      {isWithinRadius ? 'Lokasi Valid! Anda Berada di Area Sekolah' : 'Lokasi Ditolak! Anda Berada di Luar Radius'}
                    </span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                    isWithinRadius ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
                  }`}>
                    {Math.round(distance)} Meter
                  </span>
                </div>

                <div className="text-xs space-y-1 pt-1 border-t border-black/5">
                  <p>
                    Jarak Anda saat ini: <strong>{Math.round(distance)} meter</strong> dari titik koordinat resmi SMK Bakti Putra Mandiri (Batas toleransi: <strong>{maxRadius} meter</strong>).
                  </p>
                  <p className="text-[11px] opacity-85 font-mono">
                    Koordinat Terdeteksi: {userCoords.lat.toFixed(6)}, {userCoords.lng.toFixed(6)} {userCoords.accuracy ? `(Akurasi GPS ±${Math.round(userCoords.accuracy)}m)` : ''}
                  </p>
                  {!isWithinRadius && (
                    <p className="text-[11px] text-rose-700 font-bold mt-1">
                      ⚠️ Tombol presensi dinonaktifkan karena Anda berada di luar radius toleransi ({maxRadius}m). Silakan lakukan presensi saat sudah tiba di lingkungan sekolah.
                    </p>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Optional Selfie / Kamera Foto Bukti Kehadiran */}
          <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-teal-600" />
                <span>Foto Selfie Kehadiran di Sekolah (Opsional)</span>
              </span>

              {!isCameraOpen && !capturedPhoto && (
                <button
                  type="button"
                  onClick={() => startCamera('user')}
                  className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <Camera className="w-3 h-3" />
                  <span>Buka Kamera Selfie</span>
                </button>
              )}

              {isCameraOpen && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="px-2 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center gap-1"
                    title="Ganti Kamera Depan/Belakang"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>{cameraFacing === 'user' ? 'Depan' : 'Belakang'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopCameraStream();
                      setIsCameraOpen(false);
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold"
                  >
                    Tutup
                  </button>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                {cameraError}
              </div>
            )}

            {isCameraOpen && (
              <div className="relative rounded-2xl overflow-hidden bg-black max-w-xs mx-auto aspect-square border-2 border-teal-500 shadow-md">
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    if (el && streamRef.current && el.srcObject !== streamRef.current) {
                      el.srcObject = streamRef.current;
                      el.play().catch(console.warn);
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
                />
                <button
                  type="button"
                  onClick={captureSnapshot}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Ambil Foto</span>
                </button>
              </div>
            )}

            {capturedPhoto && (
              <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200 max-w-xs mx-auto">
                <img 
                  src={capturedPhoto} 
                  alt="Bukti Selfie Kehadiran" 
                  className="w-16 h-16 rounded-lg object-cover border border-slate-200 shrink-0" 
                />
                <div className="text-[11px] space-y-1">
                  <div className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Foto Siap Disimpan</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedPhoto(null);
                      startCamera('user');
                    }}
                    className="text-slate-500 hover:text-rose-600 text-[10px] font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Foto Ulang</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Validasi Geofence anti-manipulasi terhubung langsung dengan buku presensi SIM</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors w-full sm:w-auto"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={handleConfirmAttendance}
              disabled={!isWithinRadius || !!alreadyToday || isSubmitting || isWeekendToday}
              className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all w-full sm:w-auto ${
                !isWeekendToday && isWithinRadius && !alreadyToday && !isSubmitting
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transform hover:-translate-y-0.5'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isWeekendToday
                  ? (getAlasanHariTidakEfektif(todayStr) || 'Hari Libur (Otomatis Tidak Ada Absen)')
                  : isSubmitting 
                  ? 'Menyimpan Presensi...' 
                  : alreadyToday 
                  ? 'Sudah Presensi Hari Ini' 
                  : isWithinRadius 
                  ? 'Kirim Presensi Hadir Sekarang' 
                  : `Lokasi Di Luar Radius (<${maxRadius}M)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
