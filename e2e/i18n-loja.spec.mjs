import { test, expect } from '@playwright/test';

const SNIPPETS = ['Official Store', 'Peace between ink and silicon', 'Your cart', 'Loading products...'];

for (const lang of ['de', 'es', 'pl', 'sl']) {
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
    if (lang === 'sl') expect(joined).toMatch(/Optična leča|Smartband|Zaščitna folija/i);
    const html = await page.content();
    for (const s of SNIPPETS) {
      expect(html.includes(s), `shell ainda contém "${s}"`).toBe(false);
    }
  });

  test(`${lang}/comprar.html: shell checkout nativo`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('stf_cart', JSON.stringify([{
        productId: 'optical-lens-intl',
        slug: 'optical-lens-intl',
        name: 'Lens',
        price: 62.9,
        image: '/images/lens-gallery/01-optical-correction-lens.png',
        qty: 1,
        requiresSmartwatch: true,
        deviceType: 'smartwatch',
      }]));
    });
    await page.goto(`/${lang}/comprar.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h3', { timeout: 15_000 });
    const html = await page.content();
    expect(html.includes('Your cart')).toBe(false);
    expect(html.includes('Your details')).toBe(false);
    expect(html.includes('Discount code')).toBe(false);
    expect(html.includes('Peace between ink and silicon')).toBe(false);
    if (lang === 'de') expect(html).toMatch(/Ihre Daten|Zahlungsmethode/);
    if (lang === 'es') expect(html).toMatch(/Tus datos|Método de pago/);
    if (lang === 'pl') expect(html).toMatch(/Twoje dane|Metoda płatności/);
    if (lang === 'sl') expect(html).toMatch(/Vaši podatki|Način plačila/);
  });
}
