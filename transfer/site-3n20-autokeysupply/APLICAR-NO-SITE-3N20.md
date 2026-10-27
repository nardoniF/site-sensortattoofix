# Aplicar POC Auto Key Supply no site-3n20

O Cloud Agent desta sessão rodou no ambiente do `site-sensortattoofix` e **não tinha push** em `nardoniF/site-3n20` (403). A POC está pronta; falta publicar no repo certo.

## Conteúdo neste PR (STF)

- `/autokeysupply/` — mini-site estático completo (preview)
- `transfer/site-3n20-autokeysupply/autokeysupply-poc.bundle` — branch git pronta
- `transfer/site-3n20-autokeysupply/0001-poc-autokeysupply.patch` — patch com POC + links no `index.html` e `ecommerce/`

## Aplicar no site-3n20 (recomendado)

```bash
git clone https://github.com/nardoniF/site-3n20.git && cd site-3n20
git fetch /caminho/para/autokeysupply-poc.bundle cursor/autokeysupply-poc-45cd:cursor/autokeysupply-poc-45cd
git checkout cursor/autokeysupply-poc-45cd
git push -u origin cursor/autokeysupply-poc-45cd
```

Depois abra o PR para `main`. URL alvo: `https://www.3n20.com.br/autokeysupply/`

## Alternativa rápida

Copie a pasta `/autokeysupply` deste repo para a raiz do `site-3n20` e aplique o patch (links no portfólio e na página ecommerce).

**Não é necessário mergear esta pasta no `main` do Sensor Tattoo Fix** — o destino de produção é o site da 3N20.
