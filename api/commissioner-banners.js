import { PhotonImage, watermark } from '@cf-wasm/photon/workerd';

const COUPON_BOX = { x: 75, y: 1120, w: 874, h: 330 };
const BANNER_TEMPLATES = [
  '/site/comissionado/stories/banner-template-1.png',
  '/site/comissionado/stories/banner-template-2.png'
];

let metricsCache = null;

function bannerFontSize(code) {
  const len = String(code || '').length;
  if (len <= 6) return 160;
  if (len <= 10) return 130;
  if (len <= 14) return 105;
  return 82;
}

function fillWhiteBox(img) {
  const width = img.get_width();
  const { x, y, w, h } = COUPON_BOX;
  const imgData = img.get_image_data();
  const data = imgData.data;
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const i = (py * width + px) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  }
  img.set_imgdata(imgData);
}

async function loadMetrics(site) {
  if (metricsCache) return metricsCache;
  const res = await fetch(`${site}/site/comissionado/glyphs/metrics.json`);
  if (!res.ok) throw new Error('Métricas de fonte indisponíveis.');
  metricsCache = await res.json();
  return metricsCache;
}

async function drawCouponOnBanner(img, site, code) {
  const norm = String(code || '').trim().toUpperCase();
  const sizeKey = String(bannerFontSize(norm));
  const metrics = await loadMetrics(site);
  const sizeMetrics = metrics[sizeKey];
  if (!sizeMetrics) throw new Error(`Fonte ${sizeKey} indisponível.`);

  const { height, advances } = sizeMetrics;
  let totalWidth = 0;
  for (const ch of norm) totalWidth += advances[ch] || Number(sizeKey);

  let x = COUPON_BOX.x + Math.round((COUPON_BOX.w - totalWidth) / 2);
  const y = COUPON_BOX.y + Math.round((COUPON_BOX.h - height) / 2);

  for (const ch of norm) {
    const glyphRes = await fetch(`${site}/site/comissionado/glyphs/${sizeKey}/${ch}.png`);
    if (!glyphRes.ok) throw new Error(`Glifo ${ch} indisponível.`);
    const glyphBytes = new Uint8Array(await glyphRes.arrayBuffer());
    const glyph = PhotonImage.new_from_byteslice(glyphBytes);
    watermark(img, glyph, BigInt(x), BigInt(y));
    glyph.free();
    x += advances[ch] || Number(sizeKey);
  }
}

async function personalizeBannerTemplate(site, templateBytes, code) {
  const img = PhotonImage.new_from_byteslice(templateBytes);
  fillWhiteBox(img);
  await drawCouponOnBanner(img, site, code);
  const out = img.get_bytes();
  img.free();
  return out;
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function generateCommissionerStoryBanners(siteBase, code) {
  const site = String(siteBase || '').replace(/\/$/, '');
  const normCode = String(code || '').trim().toUpperCase();
  const attachments = [];
  const previews = [];

  for (let i = 0; i < BANNER_TEMPLATES.length; i++) {
    const url = `${site}${BANNER_TEMPLATES[i]}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Template ${i + 1} indisponível (${res.status}).`);
    const tpl = new Uint8Array(await res.arrayBuffer());
    const png = await personalizeBannerTemplate(site, tpl, normCode);
    const b64 = bytesToBase64(png);
    const filename = `story-${i + 1}-${normCode}.png`;
    attachments.push({
      filename,
      content: b64,
      content_type: 'image/png'
    });
    previews.push({ filename, dataUri: `data:image/png;base64,${b64}` });
  }

  return { attachments, previews, code: normCode };
}
