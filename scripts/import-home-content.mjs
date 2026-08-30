#!/usr/bin/env node
/** Migra FAQ e elogios dos HTML estáticos para store-config.json */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(ROOT, 'data/store-config.json');

function parseFaqs(html) {
  const items = [];
  const re = /<details class="faq-item">\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g;
  let m;
  while ((m = re.exec(html))) {
    const question = m[1].replace(/<[^>]+>/g, '').trim();
    const bodyHtml = m[2].trim();
    const pMatch = bodyHtml.match(/^<p>([\s\S]*?)<\/p>/);
    const answer = pMatch ? pMatch[1].trim() : bodyHtml.replace(/<div[\s\S]*$/,'').trim();
    const rest = pMatch ? bodyHtml.slice(pMatch.index + pMatch[0].length).trim() : '';
    let media = null;
    const ig = rest.match(/data-instgrm-permalink="([^"]+)"/);
    if (ig) {
      media = { type: 'instagram', instagramPermalink: ig[1] };
    } else if (/faq-media-embed--tiktok/.test(rest)) {
      media = {
        type: 'tiktok',
        tiktokId: rest.match(/data-tiktok-id="([^"]*)"/)?.[1] || '',
        tiktokHref: rest.match(/data-tiktok-href="([^"]*)"/)?.[1] || '',
        tiktokHandle: rest.match(/data-tiktok-handle="([^"]*)"/)?.[1] || '',
        tiktokTitle: rest.match(/data-tiktok-title="([^"]*)"/)?.[1] || ''
      };
    }
    items.push({ question, answer, media });
  }
  return items;
}

function parseReviews(html) {
  const items = [];
  const re = /<article class="review-card[^"]*"[^>]*data-review-rating="(\d+)"[^>]*>[\s\S]*?<p class="review-body"[^>]*>([\s\S]*?)<\/p>[\s\S]*?data-review-author>([\s\S]*?)<\/span>[\s\S]*?class="review-sign-source review-source">([\s\S]*?)<\/span>/g;
  let m;
  while ((m = re.exec(html))) {
    items.push({
      rating: Number(m[1]) || 5,
      body: m[2].trim(),
      author: m[3].trim(),
      source: m[4].trim()
    });
  }
  return items;
}

const ptHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const enHtml = fs.readFileSync(path.join(ROOT, 'en/index.html'), 'utf8');
const itHtml = fs.readFileSync(path.join(ROOT, 'it/index.html'), 'utf8');

const ptFaq = parseFaqs(ptHtml);
const enFaq = parseFaqs(enHtml);
const itFaq = parseFaqs(itHtml);
const ptRev = parseReviews(ptHtml);
const enRev = parseReviews(enHtml);
const itRev = parseReviews(itHtml);

if (ptFaq.length !== enFaq.length || ptFaq.length !== itFaq.length) {
  console.warn('FAQ count mismatch', ptFaq.length, enFaq.length, itFaq.length);
}
if (ptRev.length !== enRev.length) {
  console.warn('Review count mismatch', ptRev.length, enRev.length);
}

const homeFaq = ptFaq.map((row, i) => ({
  id: `faq-${i + 1}`,
  active: true,
  order: i + 1,
  question: row.question,
  questionEn: enFaq[i]?.question || row.question,
  questionIt: itFaq[i]?.question || row.question,
  answer: row.answer,
  answerEn: enFaq[i]?.answer || row.answer,
  answerIt: itFaq[i]?.answer || row.answer,
  media: row.media || enFaq[i]?.media || null
}));

const homeReviews = ptRev.map((row, i) => ({
  id: `review-${i + 1}`,
  active: true,
  order: i + 1,
  rating: row.rating,
  body: row.body,
  bodyEn: enRev[i]?.body || row.body,
  bodyIt: itRev[i]?.body || row.body,
  author: row.author,
  authorEn: enRev[i]?.author || row.author,
  authorIt: itRev[i]?.author || row.author,
  source: row.source,
  sourceEn: enRev[i]?.source || row.source,
  sourceIt: itRev[i]?.source || row.source
}));

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.homeFaq = homeFaq;
config.homeReviews = homeReviews;
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
console.log('Importado:', homeFaq.length, 'FAQ,', homeReviews.length, 'elogios →', configPath);
