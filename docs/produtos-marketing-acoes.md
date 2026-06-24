# Produtos e Marketing — mapa de ações

Documento vivo para planejar o que precisamos ter, fazer e validar.  
Atualizado em: 2026-06-20

---

## Legenda de status

| Símbolo | Significado |
|---------|-------------|
| ⬜ | Não iniciado |
| 🔄 | Em andamento |
| ✅ | Feito |
| ⏸ | Bloqueado / aguardando decisão |

---

## 1. Parcerias e distribuição

### 1.1 Parceria com tatuadores ⬜

**Por quê:** Público-alvo natural (cliente tatuado + smartwatch). Credibilidade local e indicação no momento certo (pós-tatuagem ou quando reclama do relógio).

**O que precisamos definir:**

- [ ] Modelo de parceria (comissão por venda, desconto para cliente do estúdio, kit amostra grátis, revenda no balcão)
- [ ] Percentual ou valor fixo por indicação/venda
- [ ] Material para o estúdio (flyer A5, QR code → loja com UTM `utm_campaign=tatuador_{cidade}`)
- [ ] Kit demonstração (lente + cartão explicativo “smartwatch + tatuagem”)
- [ ] Lista de estúdios-alvo (SP primeiro? por bairro?)
- [x] Script de abordagem e-mail/DM → ver `docs/email-parceria-tatuadores.md`
- [ ] Script de abordagem presencial / indicação de cliente
- [ ] Contrato ou termo simples de parceria / afiliado
- [ ] Cupom ou link rastreável por tatuador (admin / UTM / código no checkout)
- [ ] Política: estúdio pode aplicar a lente no cliente? (treinamento vs. só indicar)

**Entregáveis de marketing para tatuadores:**

- [ ] Card “Seu relógio trava na tatuagem?” para balcão
- [ ] Vídeo curto 30s para TV do estúdio / stories do tatuador
- [ ] Post modelo para o tatuador repostar (antes/depois sensor)

---

### 1.2 Outras parcerias (mapear depois) ⬜

- [ ] Academias / personal trainers (público com Apple Watch + treino pausando)
- [ ] Lojas de relógio / assistência técnica Apple/Samsung
- [ ] Influenciadores fitness + tattoo (micro 10k–100k)
- [ ] Podcasts / canais “tatuagem” e “tech”

---

## 2. Conteúdo e propaganda

### 2.1 Pilares de mensagem (já validados no site)

1. **Problema:** relógio não reconhece pulso, pede senha, pausa treino, batimentos zerados
2. **Inimigo:** paliativos (esparadrapo, resina, desativar sensor)
3. **Solução:** lente ótica Sensor Tattoo Fix — patente, à prova d’água, sem desligar funções
4. **Prova:** reviews 5★ (Google, ML, Shopee, Amazon, TikTok, Portugal)

### 2.2 Formatos a produzir ⬜

| Formato | Produto foco | Canal | Status |
|---------|--------------|-------|--------|
| Reels/TikTok 15–30s problema→solução | Kit lente | TikTok, IG | ⬜ |
| Tutorial aplicação 60–90s | Kit lente | YouTube, TikTok | ⬜ |
| UGC / depoimento cliente | Kit lente | Todos | ⬜ (já temos textos de review) |
| Carrossel “3 erros de quem tem tatuagem + relógio” | Kit lente | IG | ⬜ |
| Vídeo IA lifestyle | Pulseiras / películas | TikTok Shop upsell | ⬜ |
| Unboxing kit completo | Kit + agregados | ML, site | ⬜ |

### 2.3 Banco de legendas virais ⬜

- [ ] Criar arquivo/pasta de legendas por hook (problema, curiosidade, prova social, CTA)
- [ ] Versões PT e EN
- [ ] Hashtags por canal (`#sensortattoofix`, `#smartwatchtatuagem`, `#applewatchtatuagem`, etc.)
- [ ] CTAs por destino (site, TikTok Shop, WhatsApp)

### 2.4 Vídeos de IA ⬜

- [ ] Definir ferramentas (Kling, Runway, Pika, etc.)
- [ ] Prompts padrão: pulso tatuado, close sensor, aplicação lente, batimentos na tela
- [ ] Regras: sempre marcar como conteúdo promocional quando for IA; misturar com vídeo real
- [ ] Biblioteca de takes aprovados por produto (kit, película, pulseira)

---

## 3. Produtos e catálogo

### 3.1 Kit Sensor Tattoo Fix (herói) ✅ catálogo · ⬜ marketing

- Preço: R$ 62,90
- [ ] Fotos lifestyle (pulso tatuado, aplicação, antes/depois na tela do relógio)
- [ ] Vídeo hero para site e anúncios
- [ ] Criativos por marca de relógio (Apple, Samsung, Garmin)

### 3.2 Agregados — películas (15 SKUs ativos) ⬜

- Preço: R$ 20,00 · upsell no checkout
- [ ] Substituir SVGs genéricos por fotos reais em todos os anúncios
- [ ] Criativo “proteja a tela no mesmo frete”
- [ ] Campanha por formato (squircle Apple vs redonda Garmin)

### 3.3 Agregados — pulseiras (11 SKUs ativos) ⬜

- Preço: R$ 40,00 · upsell no checkout
- [ ] Fotos já melhores que películas — falta lifestyle no pulso
- [ ] Ativar SKUs inativos? (alpine, link-luxo, trail…) ou manter foco nos 11
- [ ] Destaque TikTok Shop: combo kit + pulseira

### 3.4 Organização de assets ⬜

```
marketing/
  kit-lente/
  peliculas/
  pulseiras/
  parcerias-tatuadores/
  legendas/
  videos-ia/
```

- [ ] Padronizar nomes: `{produto}_{formato}_{canal}_{data}.ext`
- [ ] Planilha ou JSON ligando SKU → arquivos → campanhas

---

## 4. Canais de venda

| Canal | Ação pendente | Status |
|-------|---------------|--------|
| Site oficial | Criativos alinhados ao checkout upsell | ⬜ |
| Mercado Livre | Fotos + vídeo no anúncio principal | ⬜ |
| Shopee | Ofertas combo / flash sale | ⬜ |
| TikTok Shop | Conteúdo viral → produto (principal descoberta) | ⬜ |
| Amazon BR | A+ content / vídeo | ⬜ |
| WhatsApp | Script resposta + link compra | ⬜ |

---

## 5. Operação e medição

- [ ] UTMs padronizadas (`utm_campaign=tatuador`, `utm_content=reels_hook_senha`, etc.)
- [ ] Metas: CAC por canal, taxa de upsell película/pulseira no checkout
- [ ] Pixel/eventos GA4 para cliques “onde comprar” e add-to-cart agregados
- [ ] Rotina semanal: 3 posts + 1 vídeo + revisão comentários/DM

---

## 6. Próximos passos sugeridos (ordem)

1. **Fechar modelo de parceria com tatuadores** (comissão + material + link rastreável)
2. **Montar pasta `marketing/`** e subir 5 legendas + 3 roteiros de vídeo do kit lente
3. **Gravar ou gerar 1 vídeo problema→solução** para TikTok/Reels
4. **Flyer + QR** para primeiros 5 estúdios piloto em SP
5. **Criativos de upsell** (“mesmo frete: película R$ 20 / pulseira R$ 40”)

---

## Notas e ideias soltas

- Review real: *“Achei no TikTok, comprei, funcionou”* → dobrar aposta em TikTok Shop
- Cliente Portugal (PayPal) → conteúdo EN para diasporas / EUA
- Tagline: *“A paz entre a tinta e o silício”* — usar em parcerias com tatuadores

---

*Adicionar novas ações abaixo conforme formos mapeando.*
