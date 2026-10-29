// Helper for embedding / previewing video links from YouTube, TikTok, Instagram, Facebook, Vimeo, Drive, or direct MP4

export interface VideoEmbedInfo {
  type: 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'direct' | 'unknown';
  embedUrl?: string;
  originalUrl: string;
}

export function parseVideoUrl(url: string | undefined): VideoEmbedInfo | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1. YouTube
  // Matches: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`,
      originalUrl: trimmed,
    };
  }

  // 2. TikTok
  // Matches: tiktok.com/@user/video/ID or vm.tiktok.com
  const tiktokMatch = trimmed.match(/tiktok\.com\/(?:@[\w.-]+\/video\/|v\/)(\d+)/);
  if (tiktokMatch && tiktokMatch[1]) {
    return {
      type: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`,
      originalUrl: trimmed,
    };
  }
  if (trimmed.includes('tiktok.com')) {
    return {
      type: 'tiktok',
      originalUrl: trimmed,
    };
  }

  // 3. Instagram Reels / Posts
  // Matches: instagram.com/p/CODE or instagram.com/reel/CODE
  const igMatch = trimmed.match(/instagram\.com\/(?:p|reel|tv)\/([^/?#&]+)/);
  if (igMatch && igMatch[1]) {
    return {
      type: 'instagram',
      embedUrl: `https://www.instagram.com/p/${igMatch[1]}/embed`,
      originalUrl: trimmed,
    };
  }
  if (trimmed.includes('instagram.com')) {
    return {
      type: 'instagram',
      originalUrl: trimmed,
    };
  }

  // 4. Facebook Video / Reel
  if (trimmed.includes('facebook.com') || trimmed.includes('fb.watch')) {
    return {
      type: 'facebook',
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}&show_text=0`,
      originalUrl: trimmed,
    };
  }

  // 5. Direct MP4, WebM, OGG
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(trimmed)) {
    return {
      type: 'direct',
      embedUrl: trimmed,
      originalUrl: trimmed,
    };
  }

  return {
    type: 'unknown',
    originalUrl: trimmed,
  };
}
