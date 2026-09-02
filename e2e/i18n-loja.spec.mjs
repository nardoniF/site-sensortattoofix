import { test, expect } from '@playwright/test';

const SNIPPETS = ['Official Store', 'Peace between ink and silicon', 'Your cart', 'Loading products...'];

for (const lang of ['de', 'es', 'pl']) {
  test(`${lang}/loja.html: título nativo e sem flash EN no shell`, async ({ page }) => {
    await page.goto(`/${lang}/loja.html`);
    await expect(page.locator('h1.section-title')).not.toHaveText(/Official Store/i);
    await page.waitForFunction(() => {
      const h3 = document.querySelector('.loja-card h3');
      return h3 && h3.textContent && !/Kit Sensor Tattoo Fix/.test(h3.textContent);
    }, { timeout: 45_000 });
    const titles = await page.locator('.loja-card h3').allTextContents();
    const joined = titles.join(' | ');
    if (lang === 'de') expect(joined).toMatch(/Optische Linse|Smartband-Linse|Schutzfolie/i);
    if (lang === 'es') expect(joined).toMatch(/óptica|Smartband|Protector de pantalla/i);
    if (lang === 'pl') expect(joined).toMatch(/Soczewka|Smartband|Folia ochronna/i);
    const html = await page.content();
    for (const s of SNIPPETS) {
      expect(html.includes(s), `shell ainda contém "${s}"`).toBe(false);
    }
  });

  test(`${lang}/comprar.html: shell sem "Your cart"`, async ({ page }) => {
    await page.goto(`/${lang}/comprar.html`);
    const html = await page.content();
    expect(html.includes('Your cart')).toBe(false);
    expect(html.includes('Peace between ink and silicon')).toBe(false);
  });
}
