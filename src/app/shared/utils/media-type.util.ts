/**
 * Detects the kind of media a URL points to based on its extension or
 * naming conventions used across the upload pipeline.
 *
 * NOTE: There are two older inline implementations (in post-media-carousel
 * and profile.page) that should eventually be migrated to use this helper.
 */
export type MediaKind = 'image' | 'video' | 'audio';

export function getMediaKind(url: string | null | undefined): MediaKind {
  if (!url) {
    return 'image';
  }

  const lower = url.toLowerCase();

  const isAudio =
    lower.includes('audi-') ||
    /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(lower) ||
    lower.includes('type=audio') ||
    lower.includes('grabacion') ||
    lower.includes('voice') ||
    (lower.includes('audio') && !lower.includes('video'));

  if (isAudio) {
    return 'audio';
  }

  const isVideo =
    lower.includes('vid-') ||
    /\.(mp4|webm|ogv|mov|avi)(\?|$)/i.test(lower) ||
    lower.includes('type=video');

  return isVideo ? 'video' : 'image';
}
