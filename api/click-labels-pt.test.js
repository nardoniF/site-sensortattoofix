import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const { toPt, labelForAdmin } = require('../js/click-labels-pt.js');

describe('click-labels-pt', () => {
  it('traduz CTAs visíveis em vários idiomas', () => {
    assert.equal(toPt('Kup teraz'), 'Comprar agora');
    assert.equal(toPt('Jetzt kaufen'), 'Comprar agora');
    assert.equal(toPt('Buy Now'), 'Comprar agora');
    assert.equal(toPt('Acquista ora'), 'Comprar agora');
    assert.equal(toPt('Gdzie kupić'), 'Onde comprar');
    assert.equal(toPt('Wo kaufen'), 'Onde comprar');
  });

  it('traduz data-rotulo com sufixo de idioma', () => {
    assert.equal(toPt('Menu buy now PL'), 'Menu — Comprar agora');
    assert.equal(toPt('Menu buy now DE'), 'Menu — Comprar agora');
    assert.equal(toPt('Hero onde comprar PL'), 'Hero — Onde comprar');
    assert.equal(toPt('Hero where to buy EN'), 'Hero — Onde comprar');
    assert.equal(toPt('WhatsApp flutuante PL'), 'WhatsApp flutuante');
    assert.equal(toPt('Header Instagram PL'), 'Header — Instagram');
    assert.equal(toPt('Botao produto buy now PL'), 'Botão produto — Comprar agora');
    assert.equal(toPt('Guide — buy'), 'Guia — Comprar');
    assert.equal(toPt('Guide — Official store'), 'Guia — Loja oficial');
  });

  it('traduz loja oficial em rótulos estrangeiros', () => {
    assert.equal(toPt('Gdzie kupić — Oficjalny Sklep'), 'Onde comprar — Loja oficial');
    assert.equal(toPt('Wo kaufen — Offizieller Shop'), 'Onde comprar — Loja oficial');
    assert.equal(toPt('Where to buy official store EN'), 'Onde comprar — Loja oficial');
    assert.equal(toPt('Dove acquistare — Negozio ufficiale'), 'Onde comprar — Loja oficial');
  });

  it('preserva rótulos já em português', () => {
    assert.equal(toPt('Loja oficial'), 'Loja oficial');
    assert.equal(toPt('Onde comprar — Mercado Livre'), 'Onde comprar — Mercado Livre');
    assert.equal(toPt('WhatsApp flutuante'), 'WhatsApp flutuante');
  });

  it('labelForAdmin prefere rotulo traduzido e destino em pageview', () => {
    const destFn = (d, fb) => ({ mercado_livre: 'Mercado Livre', entrada_home: 'Entrada — Home' }[d] || fb || d);
    assert.equal(
      labelForAdmin({ rotulo: 'Kup teraz', destino: 'checkout', tipo: 'clique' }, destFn),
      'Comprar agora'
    );
    assert.equal(
      labelForAdmin({ rotulo: 'Home PL', destino: 'entrada_home', tipo: 'pageview', destino_label: 'Entrada — Home' }, destFn),
      'Entrada — Home'
    );
  });
});
