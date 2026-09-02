#!/usr/bin/env node
/**
 * Aplica textos estáticos DE/ES/PL nas páginas shell (loja, checkout, conta, comunidade, onde-comprar).
 * Rodar após alterar overrides: node scripts/localize-de-es-pl-shell.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['de', 'es', 'pl'];
const PAGES = ['loja.html', 'comprar.html', 'minha-conta.html', 'comunidade.html', 'onde-comprar.html'];

/** @type {Record<string, Array<[string, string]>>} */
const REPLACEMENTS = {
  de: [
    ['Peace between ink and silicon', 'Harmonie zwischen Tinte und Silizium'],
    ['Loading products...', 'Produkte werden geladen…'],
    ['Loading community…', 'Community wird geladen…'],
    ['Official Store | Sensor Tattoo Fix — Passcode, Heart Rate & Workout Fix', 'Offizieller Shop | Sensor Tattoo Fix — Code, Puls & Training'],
    ['Checkout | Sensor Tattoo Fix — Official Store', 'Kasse | Sensor Tattoo Fix — Offizieller Shop'],
    ['My Account | Sensor Tattoo Fix', 'Mein Konto | Sensor Tattoo Fix'],
    ['Community (beta) | Sensor Tattoo Fix', 'Community (Beta) | Sensor Tattoo Fix'],
    ['Where to Buy | Sensor Tattoo Fix — Passcode & Heart Rate Problems', 'Wo kaufen | Sensor Tattoo Fix — Code- & Pulsmessprobleme'],
    ['<h1 class="section-title">Official Store</h1>', '<h1 class="section-title">Offizieller Shop</h1>'],
    ['<h1>Official store</h1>', '<h1>Offizieller Shop</h1>'],
    ['<strong>Official Store</strong>', '<strong>Offizieller Shop</strong>'],
    ['<h2 class="cart-sidebar-title"><i class="fas fa-shopping-cart"></i> Your cart</h2>', '<h2 class="cart-sidebar-title"><i class="fas fa-shopping-cart"></i> Ihr Warenkorb</h2>'],
    ['<i class="fas fa-shopping-cart"></i> Cart ', '<i class="fas fa-shopping-cart"></i> Warenkorb '],
    ['<i class="fas fa-arrow-left"></i> Back</a>', '<i class="fas fa-arrow-left"></i> Zurück</a>'],
    ['<i class="fas fa-arrow-left"></i> Home</a>', '<i class="fas fa-arrow-left"></i> Startseite</a>'],
    ['<i class="fas fa-store"></i> Shop</a>', '<i class="fas fa-store"></i> Shop</a>'],
    ['<i class="fas fa-shopping-bag"></i> Where to buy</a>', '<i class="fas fa-shopping-bag"></i> Wo kaufen</a>'],
    ['<i class="fas fa-info-circle"></i> About the product</a>', '<i class="fas fa-info-circle"></i> Über das Produkt</a>'],
    ['<span class="badge">Sensor Tattoo Fix Lens</span>', '<span class="badge">Sensor Tattoo Fix Linse</span>'],
    ['<strong>5-star reviews</strong> from verified buyers.', '<strong>5-Sterne-Bewertungen</strong> von verifizierten Käufern.'],
    ['5.0 · verified buyers', '5,0 · verifizierte Käufer'],
    ['aria-label="Payment methods"', 'aria-label="Zahlungsmethoden"'],
    ['<span class="store-pay-label">Card</span>', '<span class="store-pay-label">Karte</span>'],
    ['Tracked shipping · price at checkout', 'Sendungsverfolgung · Preis beim Checkout'],
    ['<h1><i class="fas fa-user"></i> My Account</h1>', '<h1><i class="fas fa-user"></i> Mein Konto</h1>'],
    ['Sign in to see your orders or create an account for faster checkout.', 'Melden Sie sich an, um Ihre Bestellungen zu sehen, oder erstellen Sie ein Konto für einen schnelleren Checkout.'],
    ['data-conta-tab="login">Sign in</button>', 'data-conta-tab="login">Anmelden</button>'],
    ['data-conta-tab="register">Create account</button>', 'data-conta-tab="register">Konto erstellen</button>'],
    ['<label>Email<input', '<label>E-Mail<input'],
    ['<label>Password<input', '<label>Passwort<input'],
    ['<button type="submit" class="btn-primary">Sign in</button>', '<button type="submit" class="btn-primary">Anmelden</button>'],
    ['Forgot password?', 'Passwort vergessen?'],
    ['Your orders at the Official Store', 'Ihre Bestellungen im offiziellen Shop'],
    ['<button type="button" id="conta-logout" class="btn-secondary">Sign out</button>', '<button type="button" id="conta-logout" class="btn-secondary">Abmelden</button>'],
    ['data-conta-panel-tab="orders">My orders</button>', 'data-conta-panel-tab="orders">Meine Bestellungen</button>'],
    ['data-conta-panel-tab="profile">My details</button>', 'data-conta-panel-tab="profile">Meine Daten</button>'],
    ['<i class="fas fa-store"></i> Shop more</a>', '<i class="fas fa-store"></i> Weiter einkaufen</a>'],
    ['Price in USD · + shipping · Tracked shipping', 'Preis in USD · + Versand · Sendungsverfolgung'],
    ['data-store-price-frete-line="+ shipping"', 'data-store-price-frete-line="+ Versand"'],
    ['data-store-price-suffix="Tracked shipping"', 'data-store-price-suffix="Sendungsverfolgung"'],
    ['data-rotulo="Where to buy — Official store"', 'data-rotulo="Wo kaufen — Offizieller Shop"'],
    ['<script>try{sessionStorage.setItem(\'stf_lang\',\'de\');}catch(e){}</script>\n    <script>try{sessionStorage.setItem(\'stf_lang\',\'de\');}catch(e){}</script>', '<script>try{sessionStorage.setItem(\'stf_lang\',\'de\');}catch(e){}</script>'],
    ['<script src="../js/stf-page-lang.js?v=2"></script>\n    <script src="../js/stf-i18n-de-overrides.js?v=2"></script>\n    <script src="../js/stf-page-lang.js?v=2"></script>', '<script src="../js/stf-page-lang.js?v=2"></script>\n    <script src="../js/stf-i18n-de-overrides.js?v=2"></script>'],
  ],
  es: [
    ['Peace between ink and silicon', 'Paz entre tinta y silicio'],
    ['Loading products...', 'Cargando productos...'],
    ['Loading community…', 'Cargando comunidad…'],
    ['Official Store | Sensor Tattoo Fix — Passcode, Heart Rate & Workout Fix', 'Tienda Oficial | Sensor Tattoo Fix — Código, pulso y entrenamiento'],
    ['Checkout | Sensor Tattoo Fix — Official Store', 'Checkout | Sensor Tattoo Fix — Tienda Oficial'],
    ['My Account | Sensor Tattoo Fix', 'Mi cuenta | Sensor Tattoo Fix'],
    ['Community (beta) | Sensor Tattoo Fix', 'Comunidad (beta) | Sensor Tattoo Fix'],
    ['Where to Buy | Sensor Tattoo Fix — Passcode & Heart Rate Problems', 'Dónde comprar | Sensor Tattoo Fix — Código y pulso'],
    ['<h1 class="section-title">Official Store</h1>', '<h1 class="section-title">Tienda Oficial</h1>'],
    ['<h1>Official store</h1>', '<h1>Tienda Oficial</h1>'],
    ['<strong>Official Store</strong>', '<strong>Tienda Oficial</strong>'],
    ['<h2 class="cart-sidebar-title"><i class="fas fa-shopping-cart"></i> Your cart</h2>', '<h2 class="cart-sidebar-title"><i class="fas fa-shopping-cart"></i> Tu carrito</h2>'],
    ['<i class="fas fa-shopping-cart"></i> Cart ', '<i class="fas fa-shopping-cart"></i> Carrito '],
    ['<i class="fas fa-arrow-left"></i> Back</a>', '<i class="fas fa-arrow-left"></i> Volver</a>'],
    ['<i class="fas fa-arrow-left"></i> Home</a>', '<i class="fas fa-arrow-left"></i> Inicio</a>'],
    ['<i class="fas fa-store"></i> Shop</a>', '<i class="fas fa-store"></i> Tienda</a>'],
    ['<i class="fas fa-shopping-bag"></i> Where to buy</a>', '<i class="fas fa-shopping-bag"></i> Dónde comprar</a>'],
    ['<i class="fas fa-info-circle"></i> About the product</a>', '<i class="fas fa-info-circle"></i> Sobre el producto</a>'],
    ['<span class="badge">Sensor Tattoo Fix Lens</span>', '<span class="badge">Lente Sensor Tattoo Fix</span>'],
    ['<strong>5-star reviews</strong> from verified buyers.', '<strong>Reseñas de 5 estrellas</strong> de compradores verificados.'],
    ['5.0 · verified buyers', '5,0 · compradores verificados'],
    ['aria-label="Payment methods"', 'aria-label="Métodos de pago"'],
    ['<span class="store-pay-label">Card</span>', '<span class="store-pay-label">Tarjeta</span>'],
    ['Tracked shipping · price at checkout', 'Envío con seguimiento · precio en el checkout'],
    ['<h1><i class="fas fa-user"></i> My Account</h1>', '<h1><i class="fas fa-user"></i> Mi cuenta</h1>'],
    ['Sign in to see your orders or create an account for faster checkout.', 'Inicia sesión para ver tus pedidos o crea una cuenta para un checkout más rápido.'],
    ['data-conta-tab="login">Sign in</button>', 'data-conta-tab="login">Iniciar sesión</button>'],
    ['data-conta-tab="register">Create account</button>', 'data-conta-tab="register">Crear cuenta</button>'],
    ['<label>Email<input', '<label>Correo electrónico<input'],
    ['<label>Password<input', '<label>Contraseña<input'],
    ['<button type="submit" class="btn-primary">Sign in</button>', '<button type="submit" class="btn-primary">Iniciar sesión</button>'],
    ['Forgot password?', '¿Olvidaste tu contraseña?'],
    ['Your orders at the Official Store', 'Tus pedidos en la tienda oficial'],
    ['<button type="button" id="conta-logout" class="btn-secondary">Sign out</button>', '<button type="button" id="conta-logout" class="btn-secondary">Cerrar sesión</button>'],
    ['data-conta-panel-tab="orders">My orders</button>', 'data-conta-panel-tab="orders">Mis pedidos</button>'],
    ['data-conta-panel-tab="profile">My details</button>', 'data-conta-panel-tab="profile">Mis datos</button>'],
    ['<i class="fas fa-store"></i> Shop more</a>', '<i class="fas fa-store"></i> Seguir comprando</a>'],
    ['Price in USD · + shipping · Tracked shipping', 'Precio en USD · + envío · Envío con seguimiento'],
    ['data-store-price-frete-line="+ shipping"', 'data-store-price-frete-line="+ envío"'],
    ['data-store-price-suffix="Tracked shipping"', 'data-store-price-suffix="Envío con seguimiento"'],
    ['data-rotulo="Where to buy — Official store"', 'data-rotulo="Dónde comprar — Tienda Oficial"'],
    ['<script>try{sessionStorage.setItem(\'stf_lang\',\'es\');}catch(e){}</script>\n    <script>try{sessionStorage.setItem(\'stf_lang\',\'es\');}catch(e){}</script>', '<script>try{sessionStorage.setItem(\'stf_lang\',\'es\');}catch(e){}</script>'],
    ['<script src="../js/stf-page-lang.js?v=2"></script>\n    <script src="../js/stf-i18n-es-overrides.js?v=2"></script>\n    <script src="../js/stf-page-lang.js?v=2"></script>', '<script src="../js/stf-page-lang.js?v=2"></script>\n    <script src="../js/stf-i18n-es-overrides.js?v=2"></script>'],
  ],
  pl: [
    ['Peace between ink and silicon', 'Harmonia między tuszem a krzemem'],
    ['Loading products...', 'Ładowanie produktów…'],
    ['Loading community…', 'Ładowanie społeczności…'],
    ['Official Store | Sensor Tattoo Fix — Passcode, Heart Rate & Workout Fix', 'Oficjalny Sklep | Sensor Tattoo Fix — Kod, tętno i trening'],
    ['Checkout | Sensor Tattoo Fix — Official Store', 'Kasa | Sensor Tattoo Fix — Oficjalny Sklep'],
    ['My Account | Sensor Tattoo Fix', 'Moje konto | Sensor Tattoo Fix'],
    ['Community (beta) | Sensor Tattoo Fix', 'Społeczność (beta) | Sensor Tattoo Fix'],
    ['Where to Buy | Sensor Tattoo Fix — Passcode & Heart Rate Problems', 'Gdzie kupić | Sensor Tattoo Fix — Kod i tętno'],
    ['<h1 class="section-title">Official Store</h1>', '<h1 class="section-title">Oficjalny Sklep</h1>'],
    ['<h1>Official store</h1>', '<h1>Oficjalny Sklep</h1>'],
    ['<strong>Official Store</strong>', '<strong>Oficjalny Sklep</strong>'],
    ['<h2 class="cart-sidebar-title"><i class="fas fa-shopping-cart"></i> Your cart</h2>', '<h2 class="cart-sidebar-title"><i class="fas fa-shopping-cart"></i> Twój koszyk</h2>'],
    ['<i class="fas fa-shopping-cart"></i> Cart ', '<i class="fas fa-shopping-cart"></i> Koszyk '],
    ['<i class="fas fa-arrow-left"></i> Back</a>', '<i class="fas fa-arrow-left"></i> Wstecz</a>'],
    ['<i class="fas fa-arrow-left"></i> Home</a>', '<i class="fas fa-arrow-left"></i> Strona główna</a>'],
    ['<i class="fas fa-store"></i> Shop</a>', '<i class="fas fa-store"></i> Sklep</a>'],
    ['<i class="fas fa-shopping-bag"></i> Where to buy</a>', '<i class="fas fa-shopping-bag"></i> Gdzie kupić</a>'],
    ['<i class="fas fa-info-circle"></i> About the product</a>', '<i class="fas fa-info-circle"></i> O produkcie</a>'],
    ['<span class="badge">Sensor Tattoo Fix Lens</span>', '<span class="badge">Soczewka Sensor Tattoo Fix</span>'],
    ['<strong>5-star reviews</strong> from verified buyers.', '<strong>Opinie 5 gwiazdek</strong> od zweryfikowanych kupujących.'],
    ['5.0 · verified buyers', '5,0 · zweryfikowani kupujący'],
    ['aria-label="Payment methods"', 'aria-label="Metody płatności"'],
    ['<span class="store-pay-label">Card</span>', '<span class="store-pay-label">Karta</span>'],
    ['Tracked shipping · price at checkout', 'Śledzenie przesyłki · cena przy kasie'],
    ['<h1><i class="fas fa-user"></i> My Account</h1>', '<h1><i class="fas fa-user"></i> Moje konto</h1>'],
    ['Sign in to see your orders or create an account for faster checkout.', 'Zaloguj się, aby zobaczyć zamówienia, lub utwórz konto dla szybszej kasy.'],
    ['data-conta-tab="login">Sign in</button>', 'data-conta-tab="login">Zaloguj się</button>'],
    ['data-conta-tab="register">Create account</button>', 'data-conta-tab="register">Utwórz konto</button>'],
    ['<label>Email<input', '<label>E-mail<input'],
    ['<label>Password<input', '<label>Hasło<input'],
    ['<button type="submit" class="btn-primary">Sign in</button>', '<button type="submit" class="btn-primary">Zaloguj się</button>'],
    ['Forgot password?', 'Zapomniałeś hasła?'],
    ['Your orders at the Official Store', 'Twoje zamówienia w oficjalnym sklepie'],
    ['<button type="button" id="conta-logout" class="btn-secondary">Sign out</button>', '<button type="button" id="conta-logout" class="btn-secondary">Wyloguj się</button>'],
    ['data-conta-panel-tab="orders">My orders</button>', 'data-conta-panel-tab="orders">Moje zamówienia</button>'],
    ['data-conta-panel-tab="profile">My details</button>', 'data-conta-panel-tab="profile">Moje dane</button>'],
    ['<i class="fas fa-store"></i> Shop more</a>', '<i class="fas fa-store"></i> Kup więcej</a>'],
    ['Price in USD · + shipping · Tracked shipping', 'Cena w USD · + wysyłka · Śledzenie przesyłki'],
    ['data-store-price-frete-line="+ shipping"', 'data-store-price-frete-line="+ wysyłka"'],
    ['data-store-price-suffix="Tracked shipping"', 'data-store-price-suffix="Śledzenie przesyłki"'],
    ['data-rotulo="Where to buy — Official store"', 'data-rotulo="Gdzie kupić — Oficjalny Sklep"'],
    ['<script>try{sessionStorage.setItem(\'stf_lang\',\'pl\');}catch(e){}</script>\n    <script>try{sessionStorage.setItem(\'stf_lang\',\'pl\');}catch(e){}</script>', '<script>try{sessionStorage.setItem(\'stf_lang\',\'pl\');}catch(e){}</script>'],
    ['<script src="../js/stf-page-lang.js?v=2"></script>\n    <script src="../js/stf-i18n-pl-overrides.js?v=2"></script>\n    <script src="../js/stf-page-lang.js?v=2"></script>', '<script src="../js/stf-page-lang.js?v=2"></script>\n    <script src="../js/stf-i18n-pl-overrides.js?v=2"></script>'],
  ],
};

let changed = 0;
for (const lang of LANGS) {
  const rules = REPLACEMENTS[lang];
  for (const page of PAGES) {
    const file = path.join(ROOT, lang, page);
    if (!fs.existsSync(file)) continue;
    let html = fs.readFileSync(file, 'utf8');
    const before = html;
    for (const [from, to] of rules) {
      html = html.split(from).join(to);
    }
    if (html !== before) {
      fs.writeFileSync(file, html);
      changed++;
      console.log('updated', `${lang}/${page}`);
    }
  }
}
console.log(`Done — ${changed} file(s) updated.`);
