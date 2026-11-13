/**
 * Traduz rótulos de cliques (data-rotulo / texto visível) para português — uso no Admin.
 * Visitantes continuam vendo o site no idioma deles; só a leitura dos cliques fica em PT.
 */
(function (root) {
  'use strict';

  const LANG_SUFFIX = /\s+(pt|br|en|it|de|es|pl|sl|fr|nl|sv|no|fi|da|nb|nn)$/i;

  /** Texto de CTA / link visível → PT */
  const VISIBLE = {
    'buy': 'Comprar',
    'buy now': 'Comprar agora',
    'comprar': 'Comprar',
    'comprar ahora': 'Comprar agora',
    'acquista ora': 'Comprar agora',
    'acheter': 'Comprar',
    'jetzt kaufen': 'Comprar agora',
    'kup teraz': 'Comprar agora',
    'kupi zdaj': 'Comprar agora',
    'kjøp nå': 'Comprar agora',
    'köp nu': 'Comprar agora',
    'nu kopen': 'Comprar agora',
    'osta nyt': 'Comprar agora',
    'gdzie kupić': 'Onde comprar',
    'gdzie kupic': 'Onde comprar',
    'where to buy': 'Onde comprar',
    'wo kaufen': 'Onde comprar',
    'dónde comprar': 'Onde comprar',
    'donde comprar': 'Onde comprar',
    'dove acquistare': 'Onde comprar',
    'où acheter': 'Onde comprar',
    'ou acheter': 'Onde comprar',
    'waar te koop': 'Onde comprar',
    'var man köper': 'Onde comprar',
    'var man koper': 'Onde comprar',
    'hvor å kjøpe': 'Onde comprar',
    'hvor a kjope': 'Onde comprar',
    'mistä ostaa': 'Onde comprar',
    'mista ostaa': 'Onde comprar',
    'kje kupiti': 'Onde comprar',
    'official store': 'Loja oficial',
    'loja oficial': 'Loja oficial',
    'tienda oficial': 'Loja oficial',
    'negozio ufficiale': 'Loja oficial',
    'offizieller shop': 'Loja oficial',
    'oficjalny sklep': 'Loja oficial',
    'uradna trgovina': 'Loja oficial'
  };

  /** data-rotulo canônico (sem sufixo de idioma) → PT */
  const ROTULO = {
    'menu buy now': 'Menu — Comprar agora',
    'menu onde comprar': 'Menu — Onde comprar',
    'hero where to buy': 'Hero — Onde comprar',
    'hero onde comprar': 'Hero — Onde comprar',
    'hero official store': 'Hero — Loja oficial',
    'botao produto buy now': 'Botão produto — Comprar agora',
    'botao produto onde comprar': 'Botão produto — Onde comprar',
    'whatsapp flutuante': 'WhatsApp flutuante',
    'whatsapp checkout': 'WhatsApp checkout',
    'header instagram': 'Header — Instagram',
    'header tiktok': 'Header — TikTok',
    'header youtube': 'Header — YouTube',
    'guide — buy': 'Guia — Comprar',
    'guide — hero buy cta': 'Guia — CTA hero comprar',
    'guide — final buy cta': 'Guia — CTA final comprar',
    'guide — official store': 'Guia — Loja oficial',
    'guia — comprar': 'Guia — Comprar',
    'guia — cta hero comprar': 'Guia — CTA hero comprar',
    'guia — cta final comprar': 'Guia — CTA final comprar',
    'guia — loja oficial': 'Guia — Loja oficial',
    'guia — mercado livre': 'Guia — Mercado Livre',
    'guia — amazon': 'Guia — Amazon',
    'guia — shopee': 'Guia — Shopee',
    'guia — tiktok shop': 'Guia — TikTok Shop',
    'where to buy official store': 'Onde comprar — Loja oficial',
    'where to buy — official store': 'Onde comprar — Loja oficial',
    'onde comprar loja oficial': 'Onde comprar — Loja oficial',
    'onde comprar — loja oficial': 'Onde comprar — Loja oficial',
    'onde comprar — mercado livre': 'Onde comprar — Mercado Livre',
    'onde comprar mercado livre': 'Onde comprar — Mercado Livre',
    'onde comprar — amazon': 'Onde comprar — Amazon',
    'onde comprar amazon': 'Onde comprar — Amazon',
    'onde comprar — shopee': 'Onde comprar — Shopee',
    'onde comprar shopee': 'Onde comprar — Shopee',
    'onde comprar — tiktok shop': 'Onde comprar — TikTok Shop',
    'onde comprar tiktok shop': 'Onde comprar — TikTok Shop',
    'loja mercado livre': 'Loja — Mercado Livre',
    'loja amazon': 'Loja — Amazon',
    'loja shopee': 'Loja — Shopee',
    'loja tiktok shop': 'Loja — TikTok Shop',
    'dónde comprar — tienda oficial': 'Onde comprar — Loja oficial',
    'donde comprar — tienda oficial': 'Onde comprar — Loja oficial',
    'dove acquistare — negozio ufficiale': 'Onde comprar — Loja oficial',
    'wo kaufen — offizieller shop': 'Onde comprar — Loja oficial',
    'gdzie kupić — oficjalny sklep': 'Onde comprar — Loja oficial',
    'gdzie kupic — oficjalny sklep': 'Onde comprar — Loja oficial',
    'kje kupiti — uradna trgovina': 'Onde comprar — Loja oficial',
    'où acheter — official store': 'Onde comprar — Loja oficial',
    'ou acheter — official store': 'Onde comprar — Loja oficial',
    'où acheter official store': 'Onde comprar — Loja oficial',
    'ou acheter official store': 'Onde comprar — Loja oficial',
    'waar te koop — official store': 'Onde comprar — Loja oficial',
    'waar te koop official store': 'Onde comprar — Loja oficial',
    'var man köper — official store': 'Onde comprar — Loja oficial',
    'var man koper — official store': 'Onde comprar — Loja oficial',
    'var man köper official store': 'Onde comprar — Loja oficial',
    'var man koper official store': 'Onde comprar — Loja oficial',
    'hvor å kjøpe — official store': 'Onde comprar — Loja oficial',
    'hvor a kjope — official store': 'Onde comprar — Loja oficial',
    'hvor å kjøpe official store': 'Onde comprar — Loja oficial',
    'hvor a kjope official store': 'Onde comprar — Loja oficial',
    'mistä ostaa — official store': 'Onde comprar — Loja oficial',
    'mista ostaa — official store': 'Onde comprar — Loja oficial',
    'mistä ostaa official store': 'Onde comprar — Loja oficial',
    'mista ostaa official store': 'Onde comprar — Loja oficial',
    'troca idioma': 'Troca de idioma',
    'logo': 'Logo',
    'carrinho': 'Carrinho',
    'comprar produto': 'Comprar produto',
    'adicionar ao carrinho': 'Adicionar ao carrinho',
    'loja oficial': 'Loja oficial'
  };

  function fold(s) {
    return String(s || '')
      .trim()
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function stripLang(s) {
    return String(s || '').trim().replace(LANG_SUFFIX, '').trim();
  }

  function lookup(map, key) {
    if (!key) return '';
    if (map[key]) return map[key];
    const folded = fold(key);
    if (map[folded]) return map[folded];
    for (const [k, v] of Object.entries(map)) {
      if (fold(k) === folded) return v;
    }
    return '';
  }

  /**
   * @param {string} rotulo
   * @returns {string} rótulo em português (ou original se desconhecido)
   */
  function toPt(rotulo) {
    const raw = String(rotulo || '').trim().replace(/\s+/g, ' ');
    if (!raw) return '';

    const stripped = stripLang(raw);
    const fromRotulo = lookup(ROTULO, stripped) || lookup(ROTULO, raw);
    if (fromRotulo) return fromRotulo;

    const fromVisible = lookup(VISIBLE, stripped) || lookup(VISIBLE, raw);
    if (fromVisible) return fromVisible;

    // "Something — Official store" / variantes estrangeiras de loja oficial
    if (/official store|offizieller shop|tienda oficial|negozio ufficiale|oficjalny sklep|uradna trgovina/i.test(raw)) {
      if (/mercado\s*livre|mercadolivre/i.test(raw)) return 'Onde comprar — Mercado Livre';
      if (/amazon/i.test(raw)) return 'Onde comprar — Amazon';
      if (/shopee/i.test(raw)) return 'Onde comprar — Shopee';
      if (/tiktok/i.test(raw)) return 'Onde comprar — TikTok Shop';
      return 'Onde comprar — Loja oficial';
    }

    // Já parece português canônico (Hero —, Menu —, Guia —, Onde comprar)
    if (/^(hero|menu|guia|onde comprar|botão produto|header|whatsapp)\b/i.test(stripped)) {
      return stripped
        .replace(/^botao\b/i, 'Botão')
        .replace(/^hero onde comprar$/i, 'Hero — Onde comprar')
        .replace(/^menu onde comprar$/i, 'Menu — Onde comprar');
    }

    return raw;
  }

  /**
   * Rótulo para exibir no Admin: prioriza tradução do rotulo; se ainda estrangeiro, usa destino PT.
   * @param {{ rotulo?: string, destino?: string, destino_label?: string, tipo?: string }} click
   * @param {(destino: string, fallback?: string) => string} [destinoLabelFn]
   */
  function labelForAdmin(click, destinoLabelFn) {
    const c = click || {};
    const destKey = String(c.destino || '');
    const isEntrada = c.tipo === 'pageview' || destKey.startsWith('entrada_');
    const destPt = typeof destinoLabelFn === 'function'
      ? destinoLabelFn(destKey, c.destino_label)
      : (c.destino_label || destKey || '—');

    if (isEntrada) return destPt || 'Entrada';

    const rotuloPt = toPt(c.rotulo || '');
    if (rotuloPt) return rotuloPt;
    return destPt || '—';
  }

  const api = { toPt, labelForAdmin, stripLang, fold, VISIBLE, ROTULO };
  root.STF_CLICK_LABELS_PT = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
