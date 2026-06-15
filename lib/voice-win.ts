// أغاني الفوز — يرفعها صانع المحتوى، وتُشغَّل واحدة عشوائياً عند إعلان الفوز

export type WinSong = { key: string; label: string };

export const WIN_SONGS: WinSong[] = Array.from({ length: 5 }, (_, i) => ({
  key: `win_${i + 1}`,
  label: `أغنية الفوز ${i + 1}`,
}));

export const WIN_KEYS = WIN_SONGS.map((w) => w.key);
