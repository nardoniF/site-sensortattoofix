/**
 * Classifica origem de tráfego (orgânico vs pago, rede, formato).
 * fbclid sozinho NÃO significa anúncio pago — comum em Reels/post orgânico no app Meta.
 */
(function (global) {
  const PAID_MEDIUMS = new Set(['cpc', 'ppc', 'paid', 'paidsearch', 'paid_social', 'display', 'banner']);
  const META_SOURCES = new Set(['facebook', 'fb', 'instagram', 'ig', 'meta']);
  const META_PAID_SOURCES = new Set(['facebook_ads', 'meta_ads', 'fb_ads', 'instagram_ads']);

  function norm(s) {
    return String(s || '').trim().toLowerCase();
  }

  function parseParams(searchOrUrl) {
    const raw = String(searchOrUrl || '');
    if (!raw) return new URLSearchParams();
    const qs = raw.includes('?') ? raw.slice(raw.indexOf('?')) : (raw.startsWith('?') ? raw : '');
    if (!qs) return new URLSearchParams();
    try {
      return new URLSearchParams(qs.split('#')[0]);
    } catch {
      return new URLSearchParams();
    }
  }

  function mediumSuffix(med, platform) {
    const m = norm(med);
    const map = {
      reels: 'Reels',
      reel: 'Reels',
      stories: 'Stories',
      story: 'Stories',
      bio: 'Bio',
      post: 'Post',
      feed: 'Feed',
      dm: 'DM',
      link: 'Link'
    };
    const fmt = map[m];
    return fmt ? `${platform} — ${fmt}` : platform;
  }

  function slugFor(platform, med) {
    const m = norm(med);
    if (m === 'reels' || m === 'reel') return `${platform}_reels`;
    if (m === 'stories' || m === 'story') return `${platform}_stories`;
    return platform;
  }

  function isGooglePaid(params, src, med) {
    return (
      params.has('gclid') || params.has('gbraid') || params.has('wbraid') ||
      params.has('gad_source') || params.has('gad_campaignid') ||
      src === 'google' || src === 'google_ads' || src === 'adwords' ||
      med === 'cpc' || med === 'ppc' || med === 'paid' || med === 'paidsearch'
    );
  }

  function isMetaPaid(params, src, med) {
    if (META_PAID_SOURCES.has(src)) return true;
    if (PAID_MEDIUMS.has(med) && META_SOURCES.has(src)) return true;
    if (med === 'paid_social' && META_SOURCES.has(src)) return true;
    return false;
  }

  function isInstagram(src, med, ref) {
    return src === 'instagram' || src === 'ig' || med === 'instagram' || ref.includes('instagram.');
  }

  function isFacebook(src, med, ref) {
    return src === 'facebook' || src === 'fb' || med === 'facebook' || ref.includes('facebook.') || ref.includes('fb.');
  }

  function classifyMetaOrganic(params, src, med, ref) {
    const hasFbclid = params.has('fbclid');

    if (isInstagram(src, med, ref)) {
      const label = mediumSuffix(med, 'Instagram');
      return {
        origem_trafego: slugFor('instagram', med),
        origem_trafego_label: label
      };
    }

    if (isFacebook(src, med, ref)) {
      const label = mediumSuffix(med, 'Facebook');
      return {
        origem_trafego: slugFor('facebook', med),
        origem_trafego_label: label
      };
    }

    if (hasFbclid) {
      const viaMed = med && mediumSuffix(med, 'Meta');
      return {
        origem_trafego: med === 'reels' || med === 'reel' ? 'meta_reels' : 'meta_organico',
        origem_trafego_label: viaMed || 'Meta (Instagram/Facebook)'
      };
    }

    return null;
  }

  function humanizeSource(src, med) {
    const s = norm(src).replace(/_/g, ' ');
    if (!s) return '';
    const m = norm(med);
    if (m && m !== 'social' && m !== 'referral') {
      return s.charAt(0).toUpperCase() + s.slice(1) + ' — ' + m.charAt(0).toUpperCase() + m.slice(1);
    }
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function classify(params, referrer) {
    const src = norm(params.get('utm_source'));
    const med = norm(params.get('utm_medium'));
    const ref = norm(referrer);

    if (isGooglePaid(params, src, med)) {
      return { origem_trafego: 'google_ads', origem_trafego_label: 'Google Ads' };
    }

    if (isMetaPaid(params, src, med)) {
      if (isInstagram(src, med, ref)) {
        return { origem_trafego: 'meta_ads', origem_trafego_label: 'Meta Ads — Instagram' };
      }
      return { origem_trafego: 'meta_ads', origem_trafego_label: 'Meta Ads — Facebook' };
    }

    const metaOrganic = classifyMetaOrganic(params, src, med, ref);
    if (metaOrganic) return metaOrganic;

    if (params.has('msclkid') || (src === 'bing' && PAID_MEDIUMS.has(med))) {
      return { origem_trafego: 'bing_ads', origem_trafego_label: 'Microsoft Ads' };
    }

    if (src === 'tiktok' || med === 'tiktok' || ref.includes('tiktok.')) {
      const label = mediumSuffix(med, 'TikTok');
      return { origem_trafego: slugFor('tiktok', med), origem_trafego_label: label === 'TikTok' ? 'TikTok' : label };
    }

    if (src === 'youtube' || src === 'yt' || ref.includes('youtube.') || ref.includes('youtu.be')) {
      const label = mediumSuffix(med, 'YouTube');
      return { origem_trafego: slugFor('youtube', med), origem_trafego_label: label };
    }

    if (src === 'whatsapp' || src === 'wa' || ref.includes('whatsapp') || ref.includes('wa.me')) {
      return { origem_trafego: 'whatsapp', origem_trafego_label: 'WhatsApp' };
    }

    if (src === 'sensortattoofix' || med === 'site') {
      return { origem_trafego: 'site', origem_trafego_label: 'Site' };
    }

    if (ref.includes('google.')) {
      return { origem_trafego: 'google_organico', origem_trafego_label: 'Google orgânico' };
    }

    if (ref.includes('t.co') || ref.includes('twitter.com') || ref.includes('x.com')) {
      return { origem_trafego: 'twitter', origem_trafego_label: 'X (Twitter)' };
    }

    if (src && !PAID_MEDIUMS.has(med)) {
      return {
        origem_trafego: src.replace(/[^a-z0-9]+/g, '_').slice(0, 32),
        origem_trafego_label: humanizeSource(src, med)
      };
    }

    if (ref && ref !== '(direto)') {
      return { origem_trafego: 'referral', origem_trafego_label: referrer || 'Outro site' };
    }

    return { origem_trafego: 'direto', origem_trafego_label: 'Acesso direto' };
  }

  function classificar(searchOrUrl, referrer) {
    return classify(parseParams(searchOrUrl), referrer);
  }

  global.stfClassificarOrigem = classificar;
  global.stfClassificarOrigemDeUrl = function (pagina, referrer) {
    return classificar(pagina, referrer);
  };
})(typeof window !== 'undefined' ? window : globalThis);
