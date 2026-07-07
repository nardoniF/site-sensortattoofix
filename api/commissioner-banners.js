const STORY_BANNERS = [
  { path: '/site/comissionado/stories/banner-story-1.png', filename: 'story-sensor-tattoofix-1.png' }
];

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function generateCommissionerStoryBanners(siteBase) {
  const site = String(siteBase || '').replace(/\/$/, '');
  const attachments = [];

  for (const banner of STORY_BANNERS) {
    const res = await fetch(`${site}${banner.path}`);
    if (!res.ok) throw new Error(`Story indisponível (${res.status}).`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    attachments.push({
      filename: banner.filename,
      content: bytesToBase64(bytes),
      content_type: 'image/png'
    });
  }

  return { attachments };
}
