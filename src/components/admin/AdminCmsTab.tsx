import React, { useState } from 'react';
import { KontenWeb, GaleriItem, SchoolInfo } from '../../types';
import { 
  Globe, 
  Plus, 
  Trash2, 
  Edit3, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  CheckCircle2, 
  Calendar, 
  User, 
  Tag, 
  ExternalLink,
  Check,
  Upload,
  FileUp,
  Link as LinkIcon,
  PlayCircle,
  FolderPlus,
  Share2
} from 'lucide-react';
import { parseVideoUrl } from '../../utils/mediaEmbedHelper';

interface AdminCmsTabProps {
  kontenList: KontenWeb[];
  schoolInfo: SchoolInfo;
  onSaveKonten: (konten: KontenWeb) => void;
  onDeleteKonten: (kontenId: string) => void;
  onUpdateSchoolInfo: (info: SchoolInfo) => void;
}

export const DEFAULT_CONTENT_CATEGORIES = [
  'Berita',
  'Pengumuman',
  'Prestasi',
  'Fasilitas',
  'Kegiatan',
  'Praktik Kejuruan',
  'Kemitraan DUDI',
  'Informasi',
  'Artikel',
  'Ekstrakurikuler'
];

export const AdminCmsTab: React.FC<AdminCmsTabProps> = ({
  kontenList,
  schoolInfo,
  onSaveKonten,
  onDeleteKonten,
  onUpdateSchoolInfo,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'berita' | 'galeri'>('berita');
  const [notification, setNotification] = useState<string | null>(null);

  // Custom categories list stored in localStorage or default
  const [availableCategories, setAvailableCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bpm_custom_cms_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_CONTENT_CATEGORIES;
  });

  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);

  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (availableCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      alert('Kategori ini sudah ada di dalam daftar!');
      return;
    }
    const updated = [...availableCategories, trimmed];
    setAvailableCategories(updated);
    try {
      localStorage.setItem('bpm_custom_cms_categories', JSON.stringify(updated));
    } catch (_) {}
    setKategoriBerita(trimmed);
    setNewCategoryInput('');
    setShowAddCategoryInput(false);
    setNotification(`Kategori baru "${trimmed}" berhasil ditambahkan!`);
    setTimeout(() => setNotification(null), 3000);
  };

  // Berita form state
  const [showBeritaModal, setShowBeritaModal] = useState(false);
  const [editingBerita, setEditingBerita] = useState<KontenWeb | null>(null);
  const [judulBerita, setJudulBerita] = useState('');
  const [kategoriBerita, setKategoriBerita] = useState<string>('Berita');
  const [ringkasanBerita, setRingkasanBerita] = useState('');
  const [isiBerita, setIsiBerita] = useState('');
  const [fotoBerita, setFotoBerita] = useState('');
  const [videoBerita, setVideoBerita] = useState('');

  // Galeri form state
  const [showGaleriModal, setShowGaleriModal] = useState(false);
  const [editingGaleriId, setEditingGaleriId] = useState<string | null>(null);
  const [judulGaleri, setJudulGaleri] = useState('');
  const [kategoriGaleri, setKategoriGaleri] = useState<string>('Praktik Kejuruan');
  const [mediaTypeGaleri, setMediaTypeGaleri] = useState<'foto' | 'video'>('foto');
  const [urlGaleri, setUrlGaleri] = useState('');
  const [deskripsiGaleri, setDeskripsiGaleri] = useState('');

  // Mode Upload Image / Link URL
  const [uploadModeBerita, setUploadModeBerita] = useState<'upload' | 'link'>('upload');
  const [uploadModeGaleri, setUploadModeGaleri] = useState<'upload' | 'link'>('upload');

  const galeriList = schoolInfo.galeri || [];

  const handleBeritaBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran berkas gambar banner maksimal 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFotoBerita(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGaleriPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran berkas foto galeri maksimal 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUrlGaleri(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Berita Handlers
  const handleOpenAddBerita = () => {
    setEditingBerita(null);
    setJudulBerita('');
    setKategoriBerita('Berita');
    setRingkasanBerita('');
    setIsiBerita('');
    setFotoBerita('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80');
    setVideoBerita('');
    setShowBeritaModal(true);
  };

  const handleOpenEditBerita = (b: KontenWeb) => {
    setEditingBerita(b);
    setJudulBerita(b.judul);
    setKategoriBerita(b.kategori);
    setRingkasanBerita(b.ringkasan);
    setIsiBerita(b.isiTulisan || b.isi || '');
    setFotoBerita(b.gambarUrl || '');
    setVideoBerita(b.videoUrl || '');
    setShowBeritaModal(true);
  };

  const handleSaveBerita = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judulBerita || !ringkasanBerita) {
      alert('Judul dan ringkasan berita wajib diisi!');
      return;
    }

    const tgl = editingBerita 
      ? (editingBerita.tanggalPost || editingBerita.tanggal || new Date().toISOString().split('T')[0]) 
      : new Date().toISOString().split('T')[0];

    const payload: KontenWeb = {
      id: editingBerita ? editingBerita.id : `berita-${Date.now()}`,
      judul: judulBerita,
      kategori: kategoriBerita,
      ringkasan: ringkasanBerita,
      isiTulisan: isiBerita || ringkasanBerita,
      isi: isiBerita || ringkasanBerita,
      gambarUrl: fotoBerita || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
      videoUrl: videoBerita ? videoBerita.trim() : undefined,
      tanggalPost: tgl,
      tanggal: tgl,
      penulis: `Humas ${schoolInfo.nama || 'Sekolah'}`,
    };

    onSaveKonten(payload);
    setShowBeritaModal(false);
    setNotification(`Berita / Kegiatan "${judulBerita}" berhasil dipublikasikan!`);
    setTimeout(() => setNotification(null), 3500);
  };

  // Galeri Handlers
  const handleOpenAddGaleri = () => {
    setEditingGaleriId(null);
    setJudulGaleri('');
    setKategoriGaleri('Praktik Kejuruan');
    setMediaTypeGaleri('foto');
    setUrlGaleri('https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80');
    setDeskripsiGaleri('');
    setShowGaleriModal(true);
  };

  const handleOpenEditGaleri = (g: GaleriItem) => {
    setEditingGaleriId(g.id);
    setJudulGaleri(g.judul);
    setKategoriGaleri(g.kategori);
    setMediaTypeGaleri(g.mediaType);
    setUrlGaleri(g.url);
    setDeskripsiGaleri(g.deskripsi || '');
    setShowGaleriModal(true);
  };

  const handleSaveGaleri = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judulGaleri || !urlGaleri) {
      alert('Judul dan URL foto/video wajib diisi!');
      return;
    }

    let updatedList = [...galeriList];
    if (editingGaleriId) {
      updatedList = updatedList.map(g => g.id === editingGaleriId ? {
        ...g,
        judul: judulGaleri,
        kategori: kategoriGaleri,
        mediaType: mediaTypeGaleri,
        url: urlGaleri.trim(),
        deskripsi: deskripsiGaleri,
      } : g);
    } else {
      const newGaleri: GaleriItem = {
        id: `galeri-${Date.now()}`,
        judul: judulGaleri,
        kategori: kategoriGaleri,
        mediaType: mediaTypeGaleri,
        url: urlGaleri.trim(),
        deskripsi: deskripsiGaleri,
        tanggal: new Date().toISOString().split('T')[0],
      };
      updatedList = [newGaleri, ...updatedList];
    }

    const updatedSchool = { ...schoolInfo, galeri: updatedList };
    onUpdateSchoolInfo(updatedSchool);
    setShowGaleriModal(false);
    setNotification(`Media galeri "${judulGaleri}" berhasil disimpan!`);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleDeleteGaleri = (id: string, judul: string) => {
    if (window.confirm(`Hapus foto/video "${judul}" dari galeri?`)) {
      const updatedList = galeriList.filter(g => g.id !== id);
      const updatedSchool = { ...schoolInfo, galeri: updatedList };
      onUpdateSchoolInfo(updatedSchool);
      setNotification(`Media "${judul}" telah dihapus.`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900 text-xs font-semibold shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* TOP NAV SUB-TABS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 flex flex-wrap gap-2 shadow-sm justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('berita')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSubTab === 'berita'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Berita & Kegiatan Sekolah ({kontenList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('galeri')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSubTab === 'galeri'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Galeri Foto & Video Kejuruan ({galeriList.length})</span>
          </button>
        </div>

        {activeSubTab === 'berita' ? (
          <button
            onClick={handleOpenAddBerita}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Input Berita / Kegiatan</span>
          </button>
        ) : (
          <button
            onClick={handleOpenAddGaleri}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Input Video / Foto Galeri</span>
          </button>
        )}
      </div>

      {/* 1. DAFTAR BERITA & KEGIATAN */}
      {activeSubTab === 'berita' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kontenList.map((berita) => (
            <div
              key={berita.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow"
            >
              <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                <img
                  src={berita.gambarUrl}
                  alt={berita.judul}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[10px] font-bold backdrop-blur-sm">
                  {berita.kategori}
                </span>
                {berita.videoUrl && (
                  <span className="absolute top-3 right-3 px-2 py-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                    <Video className="w-3 h-3" />
                    <span>Video Medsos / Web</span>
                  </span>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{berita.tanggal || berita.tanggalPost} • Oleh {berita.penulis}</span>
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm line-clamp-2">
                    {berita.judul}
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {berita.ringkasan}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleOpenEditBerita(berita)}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Konten</span>
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`Hapus berita "${berita.judul}"?`)) {
                        onDeleteKonten(berita.id);
                        setNotification(`Berita "${berita.judul}" telah dihapus.`);
                        setTimeout(() => setNotification(null), 3000);
                      }
                    }}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {kontenList.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              Belum ada berita atau kegiatan sekolah yang dipublikasikan.
            </div>
          )}
        </div>
      )}

      {/* 2. DAFTAR GALERI FOTO & VIDEO */}
      {activeSubTab === 'galeri' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {galeriList.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col"
            >
              <div className="relative h-40 w-full bg-slate-100 overflow-hidden">
                {item.mediaType === 'video' ? (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                    <img
                      src={item.url.includes('unsplash') ? item.url : 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=400&q=80'}
                      alt={item.judul}
                      className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg">
                        <Video className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={item.url}
                    alt={item.judul}
                    className="w-full h-full object-cover"
                  />
                )}

                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-bold">
                  {item.kategori}
                </span>

                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-amber-600 text-white text-[10px] font-bold uppercase">
                  {item.mediaType}
                </span>
              </div>

              <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h5 className="font-bold text-slate-900 text-xs line-clamp-1">{item.judul}</h5>
                  {item.deskripsi && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{item.deskripsi}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleOpenEditGaleri(item)}
                    className="p-1 text-slate-600 hover:text-amber-700"
                    title="Edit Media"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteGaleri(item.id, item.judul)}
                    className="p-1 text-rose-600 hover:text-rose-700"
                    title="Hapus Media"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {galeriList.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              Belum ada foto atau video galeri yang diinput.
            </div>
          )}
        </div>
      )}

      {/* MODAL INPUT BERITA / KEGIATAN */}
      {showBeritaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>{editingBerita ? 'Edit Berita / Kegiatan Sekolah' : 'Input Berita atau Kegiatan Baru'}</span>
              </h4>
              <button
                onClick={() => setShowBeritaModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBerita} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Judul Berita / Kegiatan *
                </label>
                <input
                  type="text"
                  required
                  value={judulBerita}
                  onChange={(e) => setJudulBerita(e.target.value)}
                  placeholder="Contoh: Praktik Kerja Industri (PKL) Farmasi dan Mini Hospital di RS Hermina"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Dynamic / Custom Category Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">
                      Kategori Konten *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryInput(!showAddCategoryInput)}
                      className="text-[10px] text-amber-700 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <FolderPlus className="w-3 h-3" />
                      <span>{showAddCategoryInput ? 'Tutup' : '+ Tambah Kategori'}</span>
                    </button>
                  </div>

                  {!showAddCategoryInput ? (
                    <select
                      value={kategoriBerita}
                      onChange={(e) => setKategoriBerita(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white"
                    >
                      {availableCategories.map((kat) => (
                        <option key={kat} value={kat}>
                          {kat}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-1.5 p-2 bg-amber-50 rounded-xl border border-amber-200">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newCategoryInput}
                          onChange={(e) => setNewCategoryInput(e.target.value)}
                          placeholder="Nama kategori baru..."
                          className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 text-xs bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleAddCategory}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-[11px] shrink-0 hover:bg-amber-700"
                        >
                          Simpan
                        </button>
                      </div>
                      <span className="text-[10px] text-amber-800">
                        Kategori manual akan tersimpan dan dapat dipilih kapan saja.
                      </span>
                    </div>
                  )}
                </div>

                {/* Multichannel Video Link Support */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Tautan Video Berita (Opsional)</span>
                    <span className="text-[10px] text-slate-400 font-normal">YouTube, TikTok, IG, FB</span>
                  </label>
                  <input
                    type="text"
                    value={videoBerita}
                    onChange={(e) => setVideoBerita(e.target.value)}
                    placeholder="Contoh: https://tiktok.com/@... / youtube / reel"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-[11px]"
                  />
                  {videoBerita && (
                    <div className="mt-1 text-[10px] text-teal-700 flex items-center gap-1 font-semibold">
                      <Share2 className="w-3 h-3" />
                      <span>
                        Platform: {parseVideoUrl(videoBerita)?.type.toUpperCase() || 'Medsos / Web Video'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Gambar Utama / Foto Banner Berita */}
              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-700">
                    Gambar Utama / Foto Banner *
                  </label>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setUploadModeBerita('upload')}
                      className={`px-2 py-0.5 rounded font-bold transition-all ${
                        uploadModeBerita === 'upload' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Upload Gambar
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadModeBerita('link')}
                      className={`px-2 py-0.5 rounded font-bold transition-all ${
                        uploadModeBerita === 'link' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Link URL
                    </button>
                  </div>
                </div>

                {uploadModeBerita === 'upload' ? (
                  <div className="space-y-2">
                    {fotoBerita ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-white p-2 flex items-center gap-3">
                        <img
                          src={fotoBerita}
                          alt="Banner Preview"
                          className="w-20 h-14 object-cover rounded-lg border border-slate-200"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-slate-900 truncate">Gambar Banner Terpilih</div>
                          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">✓ Siap dipublikasikan</div>
                          <label className="inline-block mt-1 text-[10px] font-bold text-amber-700 hover:underline cursor-pointer">
                            Ganti Berkas Gambar
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleBeritaBannerUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFotoBerita('')}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                          title="Hapus gambar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-white hover:bg-amber-50/30 transition-all text-center">
                        <FileUp className="w-6 h-6 text-amber-600 mb-1" />
                        <span className="font-bold text-slate-700 text-xs">
                          Klik untuk Upload Berkas Gambar Banner
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          Mendukung JPG, PNG, WEBP (maks. 5MB)
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBeritaBannerUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={fotoBerita}
                      onChange={(e) => setFotoBerita(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-[11px] bg-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ringkasan Singkat Berita (Headline) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={ringkasanBerita}
                  onChange={(e) => setRingkasanBerita(e.target.value)}
                  placeholder="Ringkasan 1-2 kalimat untuk tampilan beranda dan warta sekolah..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Isi Berita Lengkap
                </label>
                <textarea
                  rows={5}
                  value={isiBerita}
                  onChange={(e) => setIsiBerita(e.target.value)}
                  placeholder="Tuliskan berita lengkap dokumentasi kegiatan di sini..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBeritaModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Publikasikan Berita</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INPUT GALERI FOTO & VIDEO */}
      {showGaleriModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span>{editingGaleriId ? 'Edit Media Galeri' : 'Input Foto atau Video Galeri Baru'}</span>
              </h4>
              <button
                onClick={() => setShowGaleriModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGaleri} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Judul Foto / Video Dokumentasi *
                </label>
                <input
                  type="text"
                  required
                  value={judulGaleri}
                  onChange={(e) => setJudulGaleri(e.target.value)}
                  placeholder="Contoh: Praktikum Farmasetika & Peracikan Obat"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tipe Media *
                  </label>
                  <select
                    value={mediaTypeGaleri}
                    onChange={(e) => setMediaTypeGaleri(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white"
                  >
                    <option value="foto">Foto Dokumentasi</option>
                    <option value="video">Video (YouTube / TikTok / IG / FB / Web)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kategori Kejuruan / Kegiatan *
                  </label>
                  <select
                    value={kategoriGaleri}
                    onChange={(e) => setKategoriGaleri(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white"
                  >
                    {availableCategories.map((kat) => (
                      <option key={kat} value={kat}>
                        {kat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Media File Upload or URL Input */}
              {mediaTypeGaleri === 'foto' ? (
                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-slate-700">
                      Berkas Foto Dokumentasi *
                    </label>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setUploadModeGaleri('upload')}
                        className={`px-2 py-0.5 rounded font-bold transition-all ${
                          uploadModeGaleri === 'upload' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Upload Berkas
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadModeGaleri('link')}
                        className={`px-2 py-0.5 rounded font-bold transition-all ${
                          uploadModeGaleri === 'link' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Link URL
                      </button>
                    </div>
                  </div>

                  {uploadModeGaleri === 'upload' ? (
                    <div className="space-y-2">
                      {urlGaleri ? (
                        <div className="rounded-xl border border-slate-300 bg-white p-2 flex items-center gap-3">
                          <img
                            src={urlGaleri}
                            alt="Preview Galeri"
                            className="w-16 h-14 object-cover rounded-lg border border-slate-200"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold text-slate-900 truncate">Foto Terunggah</div>
                            <div className="text-[10px] text-emerald-600 font-semibold">✓ Siap disimpan ke galeri</div>
                            <label className="inline-block mt-1 text-[10px] font-bold text-amber-700 hover:underline cursor-pointer">
                              Ganti Berkas Foto
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleGaleriPhotoUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={() => setUrlGaleri('')}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                            title="Hapus foto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-white hover:bg-amber-50/30 transition-all text-center">
                          <FileUp className="w-6 h-6 text-amber-600 mb-1" />
                          <span className="font-bold text-slate-700 text-xs">
                            Klik untuk Upload Berkas Foto Galeri
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Format JPG, PNG, WEBP (maks. 5MB)
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleGaleriPhotoUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        required
                        value={urlGaleri}
                        onChange={(e) => setUrlGaleri(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-[11px] bg-white"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>URL Video Medsos / Web *</span>
                    <span className="text-[10px] text-slate-400 font-normal">YouTube, TikTok, IG, FB</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={urlGaleri}
                    onChange={(e) => setUrlGaleri(e.target.value)}
                    placeholder="Contoh: https://www.youtube.com/watch?v=... atau link TikTok / IG"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-[11px]"
                  />
                  {urlGaleri && (
                    <div className="mt-1 text-[10px] text-teal-700 flex items-center gap-1 font-semibold">
                      <Share2 className="w-3 h-3" />
                      <span>
                        Platform Terdeteksi: {parseVideoUrl(urlGaleri)?.type.toUpperCase() || 'Medsos / Web'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Deskripsi Singkat Foto / Video
                </label>
                <textarea
                  rows={2}
                  value={deskripsiGaleri}
                  onChange={(e) => setDeskripsiGaleri(e.target.value)}
                  placeholder="Keterangan singkat momen dokumentasi kegiatan..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGaleriModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Media</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
