#!/usr/bin/env python3
"""Render SEO guide HTML for all site languages from translations.json."""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((Path(__file__).with_name("translations.json")).read_text(encoding="utf-8"))

COM = "https://www.sensortattoofix.com"
BR = "https://www.sensortattoofix.com.br"
INTL = ["it", "de", "es", "pl", "sl", "fr", "nl", "sv", "no", "fi"]
ALL_GUIDE_LANGS = ["pt-BR", "en", *INTL]

GUIDE_FILES = {
    "smartwatch": {
        "pt": "smartwatch-tatuagem.html",
        "en": "smartwatch-tattoo.html",
    },
    "apple": {
        "pt": "apple-watch-tatuagem.html",
        "en": "apple-watch-tattoo.html",
    },
    "garmin": {
        "pt": "garmin-watch-tatuagem.html",
        "en": "garmin-watch-tattoo.html",
    },
    "wrist": {
        "pt": "desativar-deteccao-de-pulso-tatuagem.html",
        "en": "disable-wrist-detection-tattoo.html",
    },
}


def esc(s: str) -> str:
    return html.escape(s, quote=False)


def url_for(lang: str, guide: str) -> str:
    files = GUIDE_FILES[guide]
    if lang in ("pt-BR", "pt"):
        return f"{BR}/{files['pt']}"
    en_file = files["en"]
    if lang == "en":
        return f"{COM}/{en_file}"
    return f"{COM}/{lang}/{en_file}"


def home_url(lang: str) -> str:
    if lang in ("pt-BR", "pt"):
        return f"{BR}/"
    if lang == "en":
        return f"{COM}/"
    return f"{COM}/{lang}/"


def articles_url(lang: str) -> str:
    return home_url(lang) + "#guias"


def hreflang_block(guide: str) -> str:
    lines = []
    for lang in ALL_GUIDE_LANGS:
        lines.append(
            f'    <link rel="alternate" hreflang="{lang}" href="{url_for(lang, guide)}">'
        )
    lines.append(
        f'    <link rel="alternate" hreflang="x-default" href="{url_for("pt-BR", guide)}">'
    )
    return "\n".join(lines)


def faq_ld(faqs: list[dict]) -> str:
    entities = []
    for item in faqs:
        entities.append(
            {
                "@type": "Question",
                "name": item["q"],
                "acceptedAnswer": {"@type": "Answer", "text": item["a"]},
            }
        )
    return json.dumps(
        {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": entities},
        ensure_ascii=False,
        indent=2,
    )


def linkify(text: str, apple_href: str, apple_label: str | None = None) -> str:
    """Replace [[APPLE]]...[[/APPLE]] and [[SUPPORT]]...[[/SUPPORT]]."""
    def apple_repl(m: re.Match) -> str:
        label = apple_label or m.group(1)
        return f'<a href="{apple_href}">{esc(label)}</a>'

    text = re.sub(r"\[\[APPLE\]\](.*?)\[\[/APPLE\]\]", apple_repl, text, flags=re.S)

    def support_repl(m: re.Match) -> str:
        # support URL injected by caller via global on wrist page
        return m.group(1)

    text = re.sub(r"\[\[SUPPORT\]\](.*?)\[\[/SUPPORT\]\]", support_repl, text, flags=re.S)
    return text


def render_brand_guide(guide: str, lang: str) -> str:
    chrome = DATA["chrome"][lang]
    g = DATA[guide][lang]
    en_file = GUIDE_FILES[guide]["en"]
    canonical = url_for(lang, guide)
    apple_file = GUIDE_FILES["apple"]["en"]
    sw_file = GUIDE_FILES["smartwatch"]["en"]
    gar_file = GUIDE_FILES["garmin"]["en"]
    wrist_file = GUIDE_FILES["wrist"]["en"]

    related = list(g["related"])
    wrist_href = GUIDE_FILES["wrist"]["en"]
    if not any(r.get("href") == wrist_href for r in related):
        related.append({"href": wrist_href, "text": DATA["wrist"][lang]["crumb"]})

    faqs_html = "\n".join(
        f"                    <details><summary>{esc(f['q'])}</summary><p>{esc(f['a'])}</p></details>"
        for f in g["faqs"]
    )
    related_html = "\n".join(
        f'                        <li><a href="{html.escape(r["href"])}">{esc(r["text"])}</a></li>'
        for r in related
    )
    symptoms = "\n".join(f"                    <li>{esc(s)}</li>" for s in g["symptoms"])

    # apple has no symptomsIntro in some packs
    symptoms_intro = g.get("symptomsIntro")
    symptoms_block = ""
    if symptoms_intro:
        symptoms_block = f"                <p>{esc(symptoms_intro)}</p>\n"
    symptoms_block += f"                <ul>\n{symptoms}\n                </ul>\n"
    symptoms_block += f"                <p>{esc(g['symptomsNote'])}</p>"

    crumb3 = g["crumb"]
    breadcrumb_ld = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": chrome["home"], "item": home_url(lang)},
            {"@type": "ListItem", "position": 2, "name": chrome["articles"], "item": articles_url(lang)},
            {"@type": "ListItem", "position": 3, "name": crumb3, "item": canonical},
        ],
    }
    article_ld = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": g["headline"],
        "description": g["description"],
        "inLanguage": chrome["langHtml"] if chrome["langHtml"] != "pt-br" else "pt-BR",
        "datePublished": "2026-10-21",
        "dateModified": "2026-10-22",
        "mainEntityOfPage": {"@type": "WebPage", "@id": canonical},
        "image": f"{BR}/images/kit-gallery/kit-03-aplicacao.jpg",
        "author": {"@type": "Organization", "name": "Sensor Tattoo Fix"},
        "publisher": {
            "@type": "Organization",
            "name": "Sensor Tattoo Fix",
            "logo": {"@type": "ImageObject", "url": f"{BR}/images/brand/logo.jpg"},
        },
    }

    assert len(g["title"]) <= 60, (lang, guide, len(g["title"]), g["title"])
    assert len(g["description"]) <= 155, (lang, guide, len(g["description"]))

    return f"""<!DOCTYPE html>
<html lang="{chrome['langHtml']}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{esc(g['title'])}</title>
    <meta name="description" content="{html.escape(g['description'], quote=True)}">
    <link rel="canonical" href="{canonical}">
{hreflang_block(guide)}
    <meta property="og:type" content="article">
    <meta property="og:locale" content="{chrome['ogLocale']}">
    <meta property="og:url" content="{canonical}">
    <meta property="og:title" content="{html.escape(g['ogTitle'], quote=True)}">
    <meta property="og:description" content="{html.escape(g['description'], quote=True)}">
    <meta property="og:image" content="{BR}/images/kit-gallery/kit-03-aplicacao.jpg">
    <link rel="stylesheet" href="../style.css?v=3.66">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <script src="../js/ad-landing.js?v=7"></script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-TFLZHJG9RN"></script>
    <script src="../js/gtag-init.js"></script>
    <script type="application/ld+json">
{json.dumps(breadcrumb_ld, ensure_ascii=False, indent=2)}
    </script>
    <script type="application/ld+json">
{json.dumps(article_ld, ensure_ascii=False, indent=2)}
    </script>
    <script type="application/ld+json">
{faq_ld(g['faqs'])}
    </script>
</head>
<body class="seo-guide-page">
        <header>
        <nav class="container site-nav">
            <input type="checkbox" id="mobile-menu-toggle" class="mobile-menu-checkbox" aria-hidden="true">
            <div class="logo-area">
                <a href="index.html" class="logo-img-link"><img src="../images/brand/logo-en.jpg?v=12" alt="Sensor Tattoo Fix" class="main-logo-img"></a>
                <div class="logo-lockup">
                    <div class="logo-text" aria-hidden="true">SENSOR<span>TATTOO FIX</span></div>
                </div>
            </div>
            <div class="nav-panel">
                <ul class="nav-links nav-main">
                    <li><a href="index.html#problema">{esc(chrome['navProblem'])}</a></li>
                    <li><a href="index.html#produtos">{esc(chrome['navProduct'])}</a></li>
                    <li><a href="index.html#faq">{esc(chrome['navFaq'])}</a></li>
                    <li><a href="comunidade.html">{esc(chrome['navCommunity'])}</a></li>
                </ul>
            </div>
            <ul class="nav-links nav-actions">
                <li data-account-nav></li>
                <li><a href="#buy" class="btn-nav btn-nav-comprar" data-evento="clique_menu_comprar" data-rotulo="Guide — buy"><i class="fas fa-shopping-bag" aria-hidden="true"></i><span class="btn-nav-label">{esc(chrome['navBuy'])}</span></a></li>
                <li class="nav-lang-stack" aria-label="{html.escape(chrome['language'], quote=True)}"></li>
            </ul>
            <label for="mobile-menu-toggle" class="mobile-menu-icon" aria-label="{html.escape(chrome['openMenu'], quote=True)}">
                <i class="fas fa-bars"></i>
            </label>
        </nav>
    </header>

    <main class="content-section">
        <div class="container">
            <article class="seo-guide">
                <nav class="seo-breadcrumb" aria-label="{html.escape(chrome['breadcrumb'], quote=True)}">
                    <ol>
                        <li><a href="index.html">{esc(chrome['home'])}</a></li>
                        <li><a href="index.html#guias">{esc(chrome['articles'])}</a></li>
                        <li aria-current="page">{esc(crumb3)}</li>
                    </ol>
                </nav>

                <p class="seo-kicker">{esc(chrome['kicker'])}</p>
                <h1>{esc(g['headline'])}</h1>
                <p class="seo-lead">{esc(g['lead'])}</p>
                <p class="seo-guide-cta">
                    <a href="#buy" class="btn-primary" data-evento="clique_menu_comprar" data-rotulo="Guide — hero buy CTA"><i class="fas fa-shopping-bag" aria-hidden="true"></i> {esc(chrome['ctaBuy'])}</a>
                    <a href="loja.html?utm_source=seo&amp;utm_medium=guide&amp;utm_campaign=intent&amp;utm_content=cta_hero_store" class="btn-secondary">{esc(chrome['ctaStore'])}</a>
                </p>
                <figure class="seo-figure">
                    <img src="../images/kit-gallery/kit-03-aplicacao.jpg" alt="{html.escape(chrome['imgAlt'], quote=True)}" width="1200" height="675" loading="lazy">
                </figure>

                <h2>{esc(g['h2symptoms'])}</h2>
{symptoms_block}
                <h2>{esc(g['h2why'])}</h2>
                <p>{esc(g['why1'])}</p>
                <p>{esc(g['why2'])}</p>
                <h2>{esc(g['h2lens'])}</h2>
                <p>{esc(g['lens1'])}</p>
                <p>{esc(g['lens2'])}</p>
                <h2>{esc(g['h2compat'])}</h2>
                <p>{esc(g['compat1'])}</p>
                <p><a href="loja.html?utm_source=seo&amp;utm_medium=guide&amp;utm_campaign=intent&amp;utm_content=compatibility">{esc(g['compatLink'])}</a></p>
                <h2>{esc(g['h2apply'])}</h2>
                <p>{esc(g['apply1'])}</p>

                <section class="seo-buy" id="buy" aria-label="{html.escape(chrome['whereToBuy'], quote=True)}">
                    <h2>{esc(chrome['buyH2'])}</h2>
                    <p class="seo-buy-lead">{esc(chrome['buyLead'])}</p>
                    <div class="stores-layout stores-layout--store-first">
                        <a href="loja.html?utm_source=seo&amp;utm_medium=guide&amp;utm_campaign=intent&amp;utm_content=loja_oficial" class="store-official-bar" data-evento="clique_loja_oficial" data-rotulo="Guide — Official store">
                            <span class="store-icon-circle">
                                <img src="../images/brand/logo-mark.png?v=1" alt="Sensor Tattoo Fix">
                            </span>
                            <span class="store-official-info">
                                <span class="store-official-head">
                                    <strong>{esc(chrome['officialStore'])}</strong>
                                    <span class="store-official-payments" aria-label="{html.escape(chrome['payments'], quote=True)}">
                                        <span class="store-pay-item"><i class="fab fa-paypal" aria-hidden="true"></i><span class="store-pay-label">PayPal</span></span>
                                        <span class="store-pay-item"><i class="fas fa-credit-card" aria-hidden="true"></i><span class="store-pay-label">{esc(chrome['card'])}</span></span>
                                    </span>
                                </span>
                                <span class="store-official-price" data-store-price-tag data-store-price-layout="split-price">62,90 + {esc(chrome['shipping'])}</span>
                                <span class="store-official-shipping" data-store-shipping-line>{esc(chrome['shippingLine'])}</span>
                            </span>
                            <i class="fas fa-chevron-right store-official-arrow"></i>
                        </a>
                        <p class="onde-comprar-trust"><i class="fas fa-star" aria-hidden="true"></i> {esc(chrome['trust'])}</p>
                    </div>
                </section>

                <section class="seo-faq" aria-label="{html.escape(chrome['faq'], quote=True)}">
                    <h2>{esc(chrome['faq'])}</h2>
{faqs_html}
                </section>
                <nav class="seo-related" aria-label="{html.escape(chrome['relatedAria'], quote=True)}">
                    <h2>{esc(chrome['alsoRead'])}</h2>
                    <ul>
{related_html}
                    </ul>
                </nav>
                <section class="seo-final-cta" aria-label="{html.escape(chrome['nextStep'], quote=True)}">
                    <h2>{esc(chrome['nextStep'])}</h2>
                    <p>{esc(chrome['nextStepBody'])}</p>
                    <p class="seo-guide-cta">
                        <a href="#buy" class="btn-primary" data-evento="clique_menu_comprar" data-rotulo="Guide — final buy CTA">{esc(chrome['goBuy'])}</a>
                        <a href="loja.html?utm_source=seo&amp;utm_medium=guide&amp;utm_campaign=intent&amp;utm_content=cta_final_store" class="btn-secondary">{esc(chrome['ctaStore'])}</a>
                    </p>
                </section>
            </article>
        </div>
    </main>

    <footer class="site-footer"><div class="container" data-site-footer="compact" data-lang="{lang}"></div></footer>
    <script src="../js/account-nav.js?v=14"></script>
    <script src="../js/stf-i18n.js?v=38"></script>
    <script src="../js/stf-lang-nav.js?v=10"></script>
    <script src="../js/config-bootstrap.js?v=2"></script>
    <script src="../js/store-loader.js"></script>
    <script src="../js/stf-money.js?v=7"></script>
    <script src="../js/store-price-tag.js?v=16"></script>
    <script src="../js/site-footer.js?v=25"></script>
    <script src="../js/site-feedback.js?v=9"></script>
    <script src="../js/stf-intl-channels.js?v=2"></script>
    <script src="../js/traffic-origin.js?v=2"></script>
    <script src="../js/analytics.js?v=52"></script>
</body>
</html>
"""


def render_wrist(lang: str) -> str:
    chrome = DATA["chrome"][lang] if lang != "en" else {
        "langHtml": "en",
        "ogLocale": "en_US",
        "navProblem": "Problem",
        "navProduct": "Product",
        "navFaq": "FAQ",
        "navCommunity": "Community",
        "navBuy": "Buy",
        "openMenu": "Open menu",
        "language": "Language",
        "home": "Home",
        "articles": "Articles",
        "kicker": "Sensor Tattoo Fix guide",
        "ctaBuy": "See where to buy",
        "ctaStore": "Open the official store",
        "imgAlt": "Applying the Sensor Tattoo Fix lens on the sensor on the back of the smartwatch",
        "whereToBuy": "Where to buy",
        "buyH2": "Buy the Sensor Tattoo Fix optical lens",
        "buyLead": "Official store only — PayPal, card, and tracked shipping. International offering is the optical lens (not the Brazilian kit accessories).",
        "officialStore": "Official Store",
        "payments": "Payment methods",
        "card": "Card",
        "shipping": "Shipping",
        "shippingLine": "Tracked shipping · price at checkout",
        "trust": "5.0 · verified buyers",
        "faq": "FAQ",
        "alsoRead": "Also read",
        "relatedAria": "Related articles",
        "nextStep": "Next step",
        "nextStepBody": "Confirm your sensor size in the official store, then complete checkout with tracked shipping.",
        "goBuy": "Go to where to buy",
        "breadcrumb": "Breadcrumb",
    }
    # Prefer chrome from DATA if en was added later
    if lang in DATA["chrome"]:
        chrome = DATA["chrome"][lang]

    g = DATA["wrist"][lang]
    canonical = url_for(lang, "wrist")
    apple_href = "apple-watch-tattoo.html"
    support = g["supportUrl"]

    def body_html(text: str) -> str:
        t = text
        t = re.sub(
            r"\[\[APPLE\]\](.*?)\[\[/APPLE\]\]",
            lambda m: f'<a href="{apple_href}">{esc(m.group(1))}</a>',
            t,
            flags=re.S,
        )
        t = re.sub(
            r"\[\[SUPPORT\]\](.*?)\[\[/SUPPORT\]\]",
            lambda m: f'<a href="{html.escape(support, quote=True)}" target="_blank" rel="noopener">{esc(m.group(1))}</a>',
            t,
            flags=re.S,
        )
        return t

    # lead may contain <strong> markers as plain — wrap wrist feature if present as ** or leave as is
    lead = g["lead"]
    # If lead has no HTML, optionally bold wristFeatureName
    if "<" not in lead and g.get("wristFeatureName") and g["wristFeatureName"] in lead:
        lead = lead.replace(
            g["wristFeatureName"],
            f"<strong>{esc(g['wristFeatureName'])}</strong>",
            1,
        )
        lead_html = lead
    else:
        lead_html = esc(lead)

    lose_items = "\n".join(f"                    <li>{esc(x)}</li>" for x in g["loseItems"])
    headers = g["tableHeaders"]
    rows_html = []
    for row in g["tableRows"]:
        cells = "".join(f"<td>{esc(c)}</td>" for c in row)
        rows_html.append(f"                        <tr>{cells}</tr>")
    table = f"""                <div class="seo-table-wrap">
                <table class="seo-compare-table">
                    <thead>
                        <tr>
                            <th>{esc(headers[0])}</th>
                            <th>{esc(headers[1])}</th>
                            <th>{esc(headers[2])}</th>
                            <th>{esc(headers[3])}</th>
                        </tr>
                    </thead>
                    <tbody>
{chr(10).join(rows_html)}
                    </tbody>
                </table>
                </div>"""

    faqs_html = []
    for f in g["faqs"]:
        faqs_html.append(
            f"""                    <details>
                        <summary>{esc(f['q'])}</summary>
                        <p>{esc(f['a'])}</p>
                    </details>"""
        )

    related_html = "\n".join(
        f'                        <li><a href="{html.escape(r["href"])}">{esc(r["text"])}</a></li>'
        for r in g["related"]
    )

    breadcrumb_ld = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": chrome["home"], "item": home_url(lang)},
            {"@type": "ListItem", "position": 2, "name": chrome["articles"], "item": articles_url(lang)},
            {"@type": "ListItem", "position": 3, "name": g["crumb"], "item": canonical},
        ],
    }
    article_ld = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": g["headline"],
        "description": g["description"],
        "inLanguage": chrome["langHtml"],
        "datePublished": "2026-10-22",
        "dateModified": "2026-10-22",
        "mainEntityOfPage": {"@type": "WebPage", "@id": canonical},
        "image": f"{BR}/images/kit-gallery/kit-03-aplicacao.jpg",
        "author": {"@type": "Organization", "name": "Sensor Tattoo Fix"},
        "publisher": {
            "@type": "Organization",
            "name": "Sensor Tattoo Fix",
            "logo": {"@type": "ImageObject", "url": f"{BR}/images/brand/logo.jpg"},
        },
    }

    assert len(g["title"]) <= 60, (lang, len(g["title"]), g["title"])
    assert len(g["description"]) <= 155, (lang, len(g["description"]))

    buy_h2 = g.get("buyH2") or chrome["buyH2"]
    buy_lead = g.get("buyLead") or chrome["buyLead"]

    return f"""<!DOCTYPE html>
<html lang="{chrome['langHtml']}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{esc(g['title'])}</title>
    <meta name="description" content="{html.escape(g['description'], quote=True)}">
    <link rel="canonical" href="{canonical}">
{hreflang_block('wrist')}
    <meta property="og:type" content="article">
    <meta property="og:locale" content="{chrome['ogLocale']}">
    <meta property="og:url" content="{canonical}">
    <meta property="og:title" content="{html.escape(g['ogTitle'], quote=True)}">
    <meta property="og:description" content="{html.escape(g['description'], quote=True)}">
    <meta property="og:image" content="{BR}/images/kit-gallery/kit-03-aplicacao.jpg">
    <link rel="stylesheet" href="{'../' if lang != 'en' else '../'}style.css?v=3.66">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <script src="../js/ad-landing.js?v=7"></script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-TFLZHJG9RN"></script>
    <script src="../js/gtag-init.js"></script>
    <script type="application/ld+json">
{json.dumps(breadcrumb_ld, ensure_ascii=False, indent=2)}
    </script>
    <script type="application/ld+json">
{json.dumps(article_ld, ensure_ascii=False, indent=2)}
    </script>
    <script type="application/ld+json">
{faq_ld(g['faqs'])}
    </script>
</head>
<body class="seo-guide-page">
        <header>
        <nav class="container site-nav">
            <input type="checkbox" id="mobile-menu-toggle" class="mobile-menu-checkbox" aria-hidden="true">
            <div class="logo-area">
                <a href="index.html" class="logo-img-link"><img src="../images/brand/logo-en.jpg?v=12" alt="Sensor Tattoo Fix" class="main-logo-img"></a>
                <div class="logo-lockup">
                    <div class="logo-text" aria-hidden="true">SENSOR<span>TATTOO FIX</span></div>
                </div>
            </div>
            <div class="nav-panel">
                <ul class="nav-links nav-main">
                    <li><a href="index.html#problema">{esc(chrome['navProblem'])}</a></li>
                    <li><a href="index.html#produtos">{esc(chrome['navProduct'])}</a></li>
                    <li><a href="index.html#faq">{esc(chrome['navFaq'])}</a></li>
                    <li><a href="comunidade.html">{esc(chrome['navCommunity'])}</a></li>
                </ul>
            </div>
            <ul class="nav-links nav-actions">
                <li data-account-nav></li>
                <li><a href="#buy" class="btn-nav btn-nav-comprar" data-evento="clique_menu_comprar" data-rotulo="Guide — buy"><i class="fas fa-shopping-bag" aria-hidden="true"></i><span class="btn-nav-label">{esc(chrome['navBuy'])}</span></a></li>
                <li class="nav-lang-stack" aria-label="{html.escape(chrome['language'], quote=True)}"></li>
            </ul>
            <label for="mobile-menu-toggle" class="mobile-menu-icon" aria-label="{html.escape(chrome['openMenu'], quote=True)}">
                <i class="fas fa-bars"></i>
            </label>
        </nav>
    </header>

    <main class="content-section">
        <div class="container">
            <article class="seo-guide">
                <nav class="seo-breadcrumb" aria-label="{html.escape(chrome['breadcrumb'], quote=True)}">
                    <ol>
                        <li><a href="index.html">{esc(chrome['home'])}</a></li>
                        <li><a href="index.html#guias">{esc(chrome['articles'])}</a></li>
                        <li aria-current="page">{esc(g['crumb'])}</li>
                    </ol>
                </nav>
                <p class="seo-kicker">{esc(chrome['kicker'])}</p>
                <h1>{esc(g['headline'])}</h1>
                <p class="seo-lead">{lead_html}</p>
                <p class="seo-guide-cta">
                    <a href="#buy" class="btn-primary" data-evento="clique_menu_comprar" data-rotulo="Guide — hero buy CTA"><i class="fas fa-shopping-bag" aria-hidden="true"></i> {esc(chrome['ctaBuy'])}</a>
                    <a href="loja.html?utm_source=seo&amp;utm_medium=guide&amp;utm_campaign=intent&amp;utm_content=cta_hero_store" class="btn-secondary">{esc(chrome['ctaStore'])}</a>
                </p>
                <figure class="seo-figure">
                    <img src="../images/kit-gallery/kit-03-aplicacao.jpg" alt="{html.escape(chrome['imgAlt'], quote=True)}" width="1200" height="675" loading="lazy">
                </figure>

                <h2>{esc(g['h2why'])}</h2>
                <p>{body_html(g['whyBody'])}</p>

                <h2>{esc(g['h2what'])}</h2>
                <p>{body_html(g['whatBody'])}</p>

                <h2>{esc(g['h2lose'])}</h2>
                <p>{esc(g['loseIntro'])}</p>
                <ul>
{lose_items}
                </ul>
                <p>{esc(g['loseApplePay'])}</p>

                <h2>{esc(g['h2alt'])}</h2>
                <p>{esc(g['altIntro'])}</p>
{table}

                <h2>{esc(g['h2how'])}</h2>
                <p>{esc(g['how1'])}</p>
                <p>{body_html(g['how2']) if '[[' in g['how2'] else esc(g['how2'])}</p>

                <h2>{esc(g['h2when'])}</h2>
                <p>{body_html(g['whenBody'])}</p>

                <section class="seo-buy" id="buy" aria-label="{html.escape(chrome['whereToBuy'], quote=True)}">
                    <h2>{esc(buy_h2)}</h2>
                    <p class="seo-buy-lead">{esc(buy_lead)}</p>
                    <div class="stores-layout stores-layout--store-first">
                        <a href="loja.html?utm_source=seo&amp;utm_medium=guide&amp;utm_campaign=intent&amp;utm_content=loja_oficial" class="store-official-bar" data-evento="clique_loja_oficial" data-rotulo="Guide — Official store">
                            <span class="store-icon-circle">
                                <img src="../images/brand/logo-mark.png?v=1" alt="Sensor Tattoo Fix">
                            </span>
                            <span class="store-official-info">
                                <span class="store-official-head">
                                    <strong>{esc(chrome['officialStore'])}</strong>
                                    <span class="store-official-payments" aria-label="{html.escape(chrome['payments'], quote=True)}">
                                        <span class="store-pay-item"><i class="fab fa-paypal" aria-hidden="true"></i><span class="store-pay-label">PayPal</span></span>
                                        <span class="store-pay-item"><i class="fas fa-credit-card" aria-hidden="true"></i><span class="store-pay-label">{esc(chrome['card'])}</span></span>
                                    </span>
                                </span>
                                <span class="store-official-price" data-store-price-tag data-store-price-layout="split-price">62,90 + {esc(chrome['shipping'])}</span>
                                <span class="store-official-shipping" data-store-shipping-line>{esc(chrome['shippingLine'])}</span>
                            </span>
                            <i class="fas fa-chevron-right store-official-arrow"></i>
                        </a>
                        <p class="onde-comprar-trust"><i class="fas fa-star" aria-hidden="true"></i> {esc(chrome['trust'])}</p>
                    </div>
                </section>

                <section class="seo-faq" aria-label="{html.escape(chrome['faq'], quote=True)}">
                    <h2>{esc(chrome['faq'])}</h2>
{chr(10).join(faqs_html)}
                </section>

                <nav class="seo-related" aria-label="{html.escape(chrome['relatedAria'], quote=True)}">
                    <h2>{esc(chrome['alsoRead'])}</h2>
                    <ul>
{related_html}
                    </ul>
                </nav>
                <section class="seo-final-cta" aria-label="{html.escape(g['finalH2'], quote=True)}">
                    <h2>{esc(g['finalH2'])}</h2>
                    <p>{esc(g['finalBody'])}</p>
                    <p class="seo-guide-cta">
                        <a href="#buy" class="btn-primary" data-evento="clique_menu_comprar" data-rotulo="Guide — final buy CTA">{esc(g['finalGo'])}</a>
                        <a href="loja.html?utm_source=seo&amp;utm_medium=guide&amp;utm_campaign=intent&amp;utm_content=cta_final_store" class="btn-secondary">{esc(g['finalStore'])}</a>
                        <a href="index.html#produtos" class="btn-secondary">{esc(g.get('finalProducts') or g.get('finalHome') or '')}</a>
                    </p>
                </section>
            </article>
        </div>
    </main>

    <footer class="site-footer"><div class="container" data-site-footer="compact" data-lang="{lang}"></div></footer>
    <script src="../js/account-nav.js?v=14"></script>
    <script src="../js/stf-i18n.js?v=38"></script>
    <script src="../js/stf-lang-nav.js?v=10"></script>
    <script src="../js/config-bootstrap.js?v=2"></script>
    <script src="../js/store-loader.js"></script>
    <script src="../js/stf-money.js?v=7"></script>
    <script src="../js/store-price-tag.js?v=16"></script>
    <script src="../js/site-footer.js?v=25"></script>
    <script src="../js/site-feedback.js?v=9"></script>
    <script src="../js/stf-intl-channels.js?v=2"></script>
    <script src="../js/traffic-origin.js?v=2"></script>
    <script src="../js/analytics.js?v=52"></script>
</body>
</html>
"""


def patch_existing_hreflang(path: Path, guide: str) -> None:
    html_text = path.read_text(encoding="utf-8")
    block = hreflang_block(guide)
    # replace consecutive alternate hreflang links
    new_html, n = re.subn(
        r'(    <link rel="canonical"[^\n]+\n)(?:    <link rel="alternate" hreflang="[^"]+" href="[^"]+">\n)+',
        r"\1" + block + "\n",
        html_text,
        count=1,
    )
    if n != 1:
        raise SystemExit(f"hreflang patch failed for {path} ({n})")
    # bump lang-nav cache on existing guides
    new_html = new_html.replace("stf-lang-nav.js?v=9", "stf-lang-nav.js?v=10")
    path.write_text(new_html, encoding="utf-8")


def main() -> None:
    written = []
    for guide in ("smartwatch", "apple", "garmin"):
        for lang in INTL:
            out = ROOT / lang / GUIDE_FILES[guide]["en"]
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(render_brand_guide(guide, lang), encoding="utf-8")
            written.append(str(out.relative_to(ROOT)))

    # EN + intl wrist
    for lang in ["en", *INTL]:
        out = ROOT / ("en" if lang == "en" else lang) / GUIDE_FILES["wrist"]["en"]
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(render_wrist(lang), encoding="utf-8")
        written.append(str(out.relative_to(ROOT)))

    # Patch hreflang on existing PT + EN brand guides + PT wrist
    patch_existing_hreflang(ROOT / "smartwatch-tatuagem.html", "smartwatch")
    patch_existing_hreflang(ROOT / "apple-watch-tatuagem.html", "apple")
    patch_existing_hreflang(ROOT / "garmin-watch-tatuagem.html", "garmin")
    patch_existing_hreflang(ROOT / "en/smartwatch-tattoo.html", "smartwatch")
    patch_existing_hreflang(ROOT / "en/apple-watch-tattoo.html", "apple")
    patch_existing_hreflang(ROOT / "en/garmin-watch-tattoo.html", "garmin")
    patch_existing_hreflang(ROOT / "desativar-deteccao-de-pulso-tatuagem.html", "wrist")

    # Add wrist related links on EN brand guides if missing
    for path in [
        ROOT / "en/smartwatch-tattoo.html",
        ROOT / "en/apple-watch-tattoo.html",
        ROOT / "en/garmin-watch-tattoo.html",
    ]:
        t = path.read_text(encoding="utf-8")
        if "disable-wrist-detection-tattoo.html" not in t:
            t = t.replace(
                "</ul>\n                </nav>\n                <section class=\"seo-final-cta\"",
                f'                        <li><a href="disable-wrist-detection-tattoo.html">{esc(DATA["wrist"]["en"]["crumb"])}</a></li>\n                    </ul>\n                </nav>\n                <section class="seo-final-cta"',
                1,
            )
            path.write_text(t, encoding="utf-8")

    print(f"wrote {len(written)} files")
    for w in written:
        print(" ", w)


if __name__ == "__main__":
    main()
