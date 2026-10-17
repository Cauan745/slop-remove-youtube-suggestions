// Copyright (C) 2026 Slop RYS contributors
// This file is an independent implementation for Slop RYS.
// SPDX-License-Identifier: MPL-2.0

const SLOP_RYS_TRANSLATION_DEFAULTS = {
  preserve_original_titles: true,
  preserve_original_descriptions: true,
  restore_original_thumbnails: true,
  force_original_audio: true,
  translation_audio_language: 'original',
  force_original_subtitles: false,
  translation_subtitles_language: 'disabled',
  translation_subtitles_allow_asr: false,
  translation_use_data_api: false,
  translation_data_api_key: '',
  translation_debug_log: false,
};

const SLOP_RYS_TRANSLATION_LANGUAGES = [
  ['en', 'English'], ['fr', 'French'], ['es', 'Spanish'], ['ar', 'Arabic'],
  ['zh', 'Chinese'], ['nl', 'Dutch'], ['de', 'German'], ['he', 'Hebrew'],
  ['hi', 'Hindi'], ['id', 'Indonesian'], ['it', 'Italian'], ['ja', 'Japanese'],
  ['ko', 'Korean'], ['pl', 'Polish'], ['pt', 'Portuguese'], ['ru', 'Russian'],
  ['th', 'Thai'], ['tr', 'Turkish'], ['uk', 'Ukrainian'], ['vi', 'Vietnamese'],
];

function slopRysBaseLanguage(code) {
  return typeof code === 'string' ? code.trim().toLowerCase().split('-')[0] : '';
}

function slopRysTextFromRuns(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value.simpleText === 'string') return value.simpleText;
  if (Array.isArray(value.runs)) return value.runs.map(run => run.text || '').join('');
  return '';
}

function slopRysExtractVideoId(value) {
  if (!value) return null;
  const raw = typeof value === 'string' ? value : value.href || value.url || '';
  if (!raw) return null;
  try {
    const url = new URL(raw, 'https://www.youtube.com');
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'youtu.be') return url.pathname.slice(1).match(/^[A-Za-z0-9_-]{11}/)?.[0] || null;
    const isYouTubeHost = hostname === 'youtube.com' || hostname.endsWith('.youtube.com') ||
      hostname === 'youtube-nocookie.com' || hostname.endsWith('.youtube-nocookie.com');
    if (!isYouTubeHost) return null;
    const queryId = url.searchParams.get('v');
    if (queryId && /^[A-Za-z0-9_-]{11}$/.test(queryId)) return queryId;
    const pathMatch = url.pathname.match(/\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/);
    return pathMatch ? pathMatch[1] : null;
  } catch (error) {
    const match = raw.match(/[?&]v=([A-Za-z0-9_-]{11})|\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/);
    return match ? (match[1] || match[2]) : null;
  }
}

function slopRysCanonicalThumbnail(videoId, quality = 'hqdefault') {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || '')) return null;
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;
}

function slopRysThumbnailFromData(thumbnail) {
  const entries = thumbnail?.thumbnails;
  if (!Array.isArray(entries) || entries.length === 0) return null;
  return entries[entries.length - 1]?.url || entries[0]?.url || null;
}

function slopRysMetadataFromRenderer(renderer) {
  if (!renderer || typeof renderer !== 'object') return null;
  const videoId = renderer.videoId || renderer.navigationEndpoint?.watchEndpoint?.videoId;
  if (!videoId) return null;
  const title = slopRysTextFromRuns(renderer.title || renderer.headline);
  const description = slopRysTextFromRuns(renderer.descriptionSnippet || renderer.detailedMetadataSnippets?.[0]?.snippetText);
  return {
    id: videoId,
    title: title || null,
    description: description || null,
    thumbnail: slopRysThumbnailFromData(renderer.thumbnail),
  };
}

function slopRysCollectVideoMetadata(data, output = new Map(), seen = new Set()) {
  if (!data || typeof data !== 'object' || seen.has(data)) return output;
  seen.add(data);
  if (Array.isArray(data)) {
    data.forEach(item => slopRysCollectVideoMetadata(item, output, seen));
    return output;
  }
  const candidate = slopRysMetadataFromRenderer(data);
  if (candidate && !output.has(candidate.id)) output.set(candidate.id, candidate);
  Object.keys(data).forEach(key => slopRysCollectVideoMetadata(data[key], output, seen));
  return output;
}

function slopRysDecodeAudioTrackId(id) {
  if (typeof id !== 'string') return { language: '', original: false };
  const encoded = id.split(';')[1];
  if (!encoded) return { language: '', original: false };
  try {
    const decoded = atob(encoded).replace(/[^\x20-\x7E]/g, '');
    const languageMatch = decoded.match(/lang[^A-Za-z]+([A-Za-z]{2,3}(?:-[A-Za-z]{2,4})?)/i);
    return {
      language: languageMatch ? slopRysBaseLanguage(languageMatch[1]) : '',
      original: /original/i.test(decoded),
    };
  } catch (error) {
    return { language: '', original: false };
  }
}

function slopRysChooseAudioTrack(tracks, preference = 'original') {
  if (!Array.isArray(tracks) || tracks.length === 0) return null;
  if (preference === 'original') {
    return tracks.find(track => slopRysDecodeAudioTrackId(track?.id).original) || null;
  }
  const wanted = slopRysBaseLanguage(preference);
  return tracks.find(track => slopRysDecodeAudioTrackId(track?.id).language === wanted) || null;
}

function slopRysChooseSubtitleTrack(tracks, preference, originalLanguage, allowAsr) {
  if (!Array.isArray(tracks) || preference === 'disabled') return null;
  const wanted = preference === 'original' ? slopRysBaseLanguage(originalLanguage) : slopRysBaseLanguage(preference);
  const manual = tracks.find(track => !track?.kind && !track?.translationLanguage && slopRysBaseLanguage(track.languageCode) === wanted);
  if (manual) return { track: manual, translated: false };
  if (!allowAsr) return null;
  const asr = tracks.find(track => track?.kind === 'asr' && slopRysBaseLanguage(track.languageCode) === wanted);
  if (asr) return { track: asr, translated: false };
  if (preference !== 'original') {
    const source = tracks.find(track => track?.kind === 'asr' && !track?.translationLanguage);
    if (source) {
      return {
        track: { ...source, translationLanguage: { languageCode: preference, languageName: preference } },
        translated: true,
      };
    }
  }
  return null;
}

function slopRysBuildDataApiUrl(resource, ids, apiKey) {
  if (!resource || !Array.isArray(ids) || ids.length === 0 || !apiKey) return null;
  const allowed = resource === 'videos' || resource === 'channels';
  if (!allowed) return null;
  const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('id', ids.join(','));
  url.searchParams.set('key', apiKey);
  return url.toString();
}

function slopRysSanitizeTranslationSettings(settings) {
  const result = { ...SLOP_RYS_TRANSLATION_DEFAULTS };
  const input = settings && typeof settings === 'object' ? settings : {};
  Object.keys(result).forEach(key => {
    if (typeof input[key] === typeof result[key]) result[key] = input[key];
  });
  if (result.translation_audio_language !== 'original' && !SLOP_RYS_TRANSLATION_LANGUAGES.some(([code]) => code === result.translation_audio_language)) {
    result.translation_audio_language = 'original';
  }
  const subtitleLanguage = result.translation_subtitles_language;
  if (subtitleLanguage !== 'original' && subtitleLanguage !== 'disabled' && !SLOP_RYS_TRANSLATION_LANGUAGES.some(([code]) => code === subtitleLanguage)) {
    result.translation_subtitles_language = 'disabled';
  }
  return result;
}
