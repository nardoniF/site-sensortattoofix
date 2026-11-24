const STORY_BANNERS = [
  { path: '/images/comissionado/stories/banner-story-1.png', filename: 'story-sensor-tattoofix-1.png' },
  { path: '/images/comissionado/stories/banner-story-2.png', filename: 'story-sensor-tattoofix-2.png' }
];

const CDN_FALLBACKS = [
  'https://cdn.jsdelivr.net/gh/nardoniF/site-sensortattoofix@main',
  'https://raw.githubusercontent.com/nardoniF/site-sensortattoofix/main'
];

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function bannerBases(siteBase) {
  const site = String(siteBase || '').replace(/\/$/, '');
  const bases = [];
  if (site) bases.push(site);
  for (const cdn of CDN_FALLBACKS) {
    if (!bases.includes(cdn)) bases.push(cdn);
  }
  return bases;
}

async function fetchBannerBytes(bases, path) {
  let lastErr = null;
  for (const base of bases) {
    try {
      const res = await fetch(`${base}${path}`);
      if (!res.ok) {
        lastErr = new Error(`Story indisponível (${res.status}) em ${base}`);
        continue;
      }
      const buf = await res.arrayBuffer();
      if (!buf || !buf.byteLength) {
        lastErr = new Error(`Story vazia em ${base}`);
        continue;
      }
      return new Uint8Array(buf);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error(`Story indisponível (${path}).`);
}

export async function generateCommissionerStoryBanners(siteBase) {
  const bases = bannerBases(siteBase);
  const attachments = [];
  const errors = [];

  for (const banner of STORY_BANNERS) {
    try {
      const bytes = await fetchBannerBytes(bases, banner.path);
      attachments.push({
        filename: banner.filename,
        content: bytesToBase64(bytes),
        content_type: 'image/png'
      });
    } catch (err) {
      errors.push(err?.message || String(err));
    }
  }

  if (!attachments.length) {
    throw new Error(errors.join(' | ') || 'Nenhuma arte de story disponível.');
  }
  return { attachments, errors };
}
