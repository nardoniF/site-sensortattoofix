import { test, expect } from '@playwright/test';

const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8767';

const HOME_SECTIONS = [
  'top',
  'problema',
  'paliativos',
  'produtos',
  'avaliacoes',
  'quem-somos',
  'faq',
  'guias',
  'onde-comprar',
  'contato',
];

const GUIDES = [
  '/desativar-deteccao-de-pulso-tatuagem.html',
  '/apple-watch-tatuagem.html',
  '/smartwatch-tatuagem.html',
  '/garmin-watch-tatuagem.html',
];

test.describe('home + SEO guides smoke', () => {
  test('home keeps every section and FAQ widths match', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    for (const id of HOME_SECTIONS) {
      const el = page.locator(`#${id}`);
      await expect(el, `missing #${id}`).toHaveCount(1);
      const box = await el.boundingBox();
      expect(box?.height || 0, `#${id} collapsed`).toBeGreaterThan(40);
    }

    await expect(page.locator('#guias .section-title')).toHaveText(/Artigos|Guias/i);
    await expect(page.locator('#guias a')).toHaveCount(4);

    const margins = await page.evaluate(() => {
      return ['problema','produtos','faq','guias','quem-somos'].map((id) => {
        const el = document.getElementById(id);
        return { id, scrollMarginTop: getComputedStyle(el).scrollMarginTop };
      });
    });
    for (const row of margins) {
      expect(row.scrollMarginTop, `${row.id} got blanket scroll-margin`).not.toBe('96px');
    }


    const widths = await page.evaluate(() => {
      const items = [...document.querySelectorAll('#faq .home-faq-static details, #faq .faq-item')];
      return items.slice(0, 5).map((el) => Math.round(el.getBoundingClientRect().width));
    });
    expect(widths.length).toBeGreaterThan(1);
    const first = widths[0];
    for (const w of widths.slice(1)) {
      expect(Math.abs(w - first), `FAQ width mismatch ${first} vs ${w}`).toBeLessThanOrEqual(4);
    }
  });

  test('SEO guides keep hero carousel and buy block', async ({ page }) => {
    for (const path of GUIDES) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      await expect(page.locator('.seo-hero'), path).toHaveCount(1);
      await expect(page.locator('.seo-hero-copy'), path).toHaveCount(1);
      await expect(page.locator('.seo-figure'), path).toHaveCount(1);
      await expect(page.locator('#comprar, #buy'), path).toHaveCount(1);
      const album = page.locator('.seo-figure [data-stf-album]');
      await expect(album, path).toHaveCount(1);
      const before = await album.getAttribute('data-index');
      await page.locator('.stf-album-next').click();
      await page.waitForTimeout(300);
      const after = await album.getAttribute('data-index');
      expect(after, `carousel did not advance on ${path}`).not.toEqual(before);
    }
  });
});
