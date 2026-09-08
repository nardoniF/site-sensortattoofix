import { test, expect } from '@playwright/test';

const SNIPPETS = ['Official Store', 'Peace between ink and silicon', 'Your cart', 'Loading products...'];

/** Every .com locale: path, expected checkout currency, loja/checkout native markers. */
const LOCALES = [
  {
    lang: 'de',
    currency: 'EUR',
    lojaTitle: /Optische Linse|Smartband-Linse|Schutzfolie/i,
    checkout: /Ihre Daten|Zahlungsmethode/,
  },
  {
    lang: 'es',
    currency: 'EUR',
    lojaTitle: /óptica|Smartband|Protector de pantalla/i,
    checkout: /Tus datos|Método de pago/,
  },
  {
    lang: 'pl',
    currency: 'EUR',
    lojaTitle: /Soczewka|Smartband|Folia ochronna/i,
    checkout: /Twoje dane|Metoda płatności/,
  },
  {
    lang: 'sl',
    currency: 'EUR',
    lojaTitle: /Optična leča|Smartband|Zaščitna folija/i,
    checkout: /Vaši podatki|Način plačila/,
  },
  {
    lang: 'fr',
    currency: 'EUR',
    lojaTitle: /optique|Smartband|protecteur|écran/i,
    checkout: /Vos coordonnées|Vos informations|Mode de paiement|Paiement/i,
  },
  {
    lang: 'nl',
    currency: 'EUR',
    lojaTitle: /optische|Smartband|screenprotector|beschermfolie/i,
    checkout: /Uw gegevens|Betaalmethode|Betaling/i,
  },
  {
    lang: 'fi',
    currency: 'EUR',
    lojaTitle: /optinen|Smartband|näytönsuoja/i,
    checkout: /Tiedot|Maksutapa|Maksu/i,
  },
  {
    lang: 'sv',
    currency: 'SEK',
    lojaTitle: /optisk|Smartband|skärmskydd/i,
    checkout: /Dina uppgifter|Betalningsmetod|Betalning/i,
  },
  {
    lang: 'no',
    currency: 'NOK',
    lojaTitle: /optisk|Smartband|skjermbeskytter/i,
    checkout: /Dine opplysninger|Betalingsmetode|Betaling/i,
  },
  {
    lang: 'it',
    currency: 'EUR',
    lojaTitle: /ottica|Smartband|Pellicola|Proteggi/i,
    checkout: /I tuoi dati|Metodo di pagamento|Pagamento/i,
  },
  {
    lang: 'en',
    currency: 'USD',
    lojaTitle: /Optical Lens|Smartband|Screen protector/i,
    checkout: /Your details|Payment method|Payment/i,
    allowEnShell: true,
  },
];

function currencyPattern(code) {
  if (code === 'EUR') return /€|EUR/i;
  if (code === 'USD') return /\$|USD|US\$/i;
  if (code === 'SEK' || code === 'NOK') return /\bkr\b|SEK|NOK/i;
  return new RegExp(code, 'i');
}

function pathFor(locale, page) {
  return `/${locale.lang}/${page}`;
}

for (const locale of LOCALES) {
  const { lang, currency } = locale;

  test(`${lang}/loja.html: título nativo e sem flash EN no shell`, async ({ page }) => {
    await page.goto(pathFor(locale, 'loja.html'));
    await expect(page.locator('h1.section-title')).toBeVisible({ timeout: 15_000 });
    if (!locale.allowEnShell) {
      await expect(page.locator('h1.section-title')).not.toHaveText(/Official Store/i);
    }
    await page.waitForFunction(() => {
      const h3 = document.querySelector('.loja-card h3');
      return h3 && h3.textContent && !/Kit Sensor Tattoo Fix/.test(h3.textContent);
    }, { timeout: 45_000 });
    const titles = await page.locator('.loja-card h3').allTextContents();
    expect(titles.join(' | ')).toMatch(locale.lojaTitle);
    if (!locale.allowEnShell) {
      const html = await page.content();
      for (const s of SNIPPETS) {
        expect(html.includes(s), `shell ainda contém "${s}"`).toBe(false);
      }
    }
  });

  test(`${lang}/loja.html: preço em ${currency}, não R$`, async ({ page }) => {
    await page.goto(pathFor(locale, 'loja.html'));
    await page.waitForSelector('.loja-price', { timeout: 45_000 });
    await page.waitForFunction(() => {
      const el = document.querySelector('.loja-price');
      const t = el && el.textContent ? el.textContent : '';
      return t && !/R\$/.test(t);
    }, { timeout: 45_000 });
    const priceText = await page.locator('.loja-price').allTextContents().then((xs) => xs.join(' | '));
    expect(priceText, `loja ${lang} ainda em BRL: ${priceText}`).not.toMatch(/R\$/);
    expect(priceText, `loja ${lang} sem ${currency}: ${priceText}`).toMatch(currencyPattern(currency));
  });

  test(`${lang}/comprar.html: shell nativo + moeda ${currency}`, async ({ page }) => {
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
    await page.goto(pathFor(locale, 'comprar.html'), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#summary-product, .cart-line-price, h3', { timeout: 20_000 });

    if (!locale.allowEnShell) {
      const html = await page.content();
      expect(html.includes('Your cart')).toBe(false);
      expect(html.includes('Your details')).toBe(false);
      expect(html.includes('Discount code')).toBe(false);
      expect(html.includes('Peace between ink and silicon')).toBe(false);
      expect(html).toMatch(locale.checkout);
    } else {
      const html = await page.content();
      expect(html).toMatch(locale.checkout);
    }

    await page.waitForFunction(() => {
      const el = document.querySelector('.cart-line-price, #summary-product');
      const t = el && el.textContent ? el.textContent.trim() : '';
      return t && t !== '—' && t !== '-';
    }, { timeout: 30_000 });

    const cartPrice = (await page.locator('.cart-line-price').first().textContent().catch(() => '')) || '';
    const summary = (await page.locator('#summary-product').textContent().catch(() => '')) || '';
    const shown = `${cartPrice} | ${summary}`;
    expect(shown, `checkout ${lang} ainda em BRL: ${shown}`).not.toMatch(/R\$/);
    expect(shown, `checkout ${lang} sem ${currency}: ${shown}`).toMatch(currencyPattern(currency));
  });
}
