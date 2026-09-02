#!/usr/bin/env node
/** DE→SL nas páginas shell em /sl/ (após bootstrap-sl-pages.mjs). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['loja.html', 'comprar.html', 'minha-conta.html', 'comunidade.html', 'onde-comprar.html'];

/** @type {Array<[string, string]>} */
const RULES = [
  ['Harmonie zwischen Tinte und Silizium', 'Mir med tinto in silicijem'],
  ['Produkte werden geladen…', 'Nalaganje izdelkov…'],
  ['Community wird geladen…', 'Nalaganje skupnosti…'],
  ['Offizieller Shop | Sensor Tattoo Fix — Code, Puls & Training', 'Uradna trgovina | Sensor Tattoo Fix — geslo, utrip in vadba'],
  ['Kasse | Sensor Tattoo Fix — Offizieller Shop', 'Blagajna | Sensor Tattoo Fix — Uradna trgovina'],
  ['Mein Konto | Sensor Tattoo Fix', 'Moj račun | Sensor Tattoo Fix'],
  ['Community (Beta) | Sensor Tattoo Fix', 'Skupnost (beta) | Sensor Tattoo Fix'],
  ['Wo kaufen | Sensor Tattoo Fix — Code- & Pulsmessprobleme', 'Kje kupiti | Sensor Tattoo Fix — geslo in utrip'],
  ['<h1 class="section-title">Offizieller Shop</h1>', '<h1 class="section-title">Uradna trgovina</h1>'],
  ['<h1>Offizieller Shop</h1>', '<h1>Uradna trgovina</h1>'],
  ['<strong>Offizieller Shop</strong>', '<strong>Uradna trgovina</strong>'],
  ['<h2 class="cart-sidebar-title"><i class="fas fa-shopping-cart"></i> Ihr Warenkorb</h2>', '<h2 class="cart-sidebar-title"><i class="fas fa-shopping-cart"></i> Vaša košarica</h2>'],
  ['<i class="fas fa-shopping-cart"></i> Warenkorb ', '<i class="fas fa-shopping-cart"></i> Košarica '],
  ['<i class="fas fa-arrow-left"></i> Zurück</a>', '<i class="fas fa-arrow-left"></i> Nazaj</a>'],
  ['<i class="fas fa-arrow-left"></i> Startseite</a>', '<i class="fas fa-arrow-left"></i> Domov</a>'],
  ['<i class="fas fa-store"></i> Shop</a>', '<i class="fas fa-store"></i> Trgovina</a>'],
  ['<i class="fas fa-shopping-bag"></i> Wo kaufen</a>', '<i class="fas fa-shopping-bag"></i> Kje kupiti</a>'],
  ['<i class="fas fa-info-circle"></i> Über das Produkt</a>', '<i class="fas fa-info-circle"></i> O izdelku</a>'],
  ['<span class="badge">Sensor Tattoo Fix Linse</span>', '<span class="badge">Leča Sensor Tattoo Fix</span>'],
  ['<strong>5-Sterne-Bewertungen</strong> von verifizierten Käufern.', '<strong>Ocene s 5 zvezdicami</strong> preverjenih kupcev.'],
  ['5,0 · verifizierte Käufer', '5,0 · preverjeni kupci'],
  ['aria-label="Zahlungsmethoden"', 'aria-label="Načini plačila"'],
  ['<span class="store-pay-label">Karte</span>', '<span class="store-pay-label">Kartica</span>'],
  ['Preis in USD · + Versand · Sendungsverfolgung', 'Cena v USD · + poštnina · Sledenje pošiljki'],
  ['data-store-price-frete-line="+ Versand"', 'data-store-price-frete-line="+ poštnina"'],
  ['data-store-price-suffix="Sendungsverfolgung"', 'data-store-price-suffix="Sledenje pošiljki"'],
  ['data-rotulo="Wo kaufen — Offizieller Shop"', 'data-rotulo="Kje kupiti — Uradna trgovina"'],
  ['<h1><i class="fas fa-user"></i> Mein Konto</h1>', '<h1><i class="fas fa-user"></i> Moj račun</h1>'],
  ['Melden Sie sich an, um Ihre Bestellungen zu sehen, oder erstellen Sie ein Konto für einen schnelleren Checkout.', 'Prijavite se za ogled naročil ali ustvarite račun za hitrejšo blagajno.'],
  ['data-conta-tab="login">Anmelden</button>', 'data-conta-tab="login">Prijava</button>'],
  ['data-conta-tab="register">Konto erstellen</button>', 'data-conta-tab="register">Ustvari račun</button>'],
  ['<label>E-Mail<input', '<label>E-pošta<input'],
  ['<label>Passwort<input', '<label>Geslo<input'],
  ['<button type="submit" class="btn-primary">Anmelden</button>', '<button type="submit" class="btn-primary">Prijava</button>'],
  ['Passwort vergessen?', 'Ste pozabili geslo?'],
  ['Ihre Bestellungen im offiziellen Shop', 'Vaša naročila v uradni trgovini'],
  ['<button type="button" id="conta-logout" class="btn-secondary">Abmelden</button>', '<button type="button" id="conta-logout" class="btn-secondary">Odjava</button>'],
  ['data-conta-panel-tab="orders">Meine Bestellungen</button>', 'data-conta-panel-tab="orders">Moja naročila</button>'],
  ['data-conta-panel-tab="profile">Meine Daten</button>', 'data-conta-panel-tab="profile">Moji podatki</button>'],
  ['<i class="fas fa-store"></i> Weiter einkaufen</a>', '<i class="fas fa-store"></i> Nadaljuj z nakupovanjem</a>'],
  ['<label>Vollständiger Name<input', '<label>Ime in priimek<input'],
  ['Ausweisdokument <small>(optional)</small>', 'Osebni dokument <small>(neobvezno)</small>'],
  ['Passwort (mind. 6 Zeichen)', 'Geslo (najmanj 6 znakov)'],
  ['<button type="submit" class="btn-primary">Konto erstellen</button>', '<button type="submit" class="btn-primary">Ustvari račun</button>'],
  ['<h1>Hallo, <span id="conta-user-name">Kunde</span></h1>', '<h1>Pozdravljeni, <span id="conta-user-name">Stranka</span></h1>'],
  ['Aktualisieren Sie Ihre Daten für Checkout und Bestellbenachrichtigungen. Die E-Mail kann hier nicht geändert werden.', 'Posodobite podatke za blagajno in obvestila o naročilih. E-poštnega naslova tukaj ni mogoče spremeniti.'],
  ['<h3 class="conta-form-section">Persönliche Daten</h3>', '<h3 class="conta-form-section">Osebni podatki</h3>'],
  ['<h3 class="conta-form-section">Standard-Lieferadresse</h3>', '<h3 class="conta-form-section">Privzeti naslov za dostavo</h3>'],
  ['Wird beim Checkout automatisch vorausgefüllt.', 'Uporablja se za samodejno izpolnjevanje blagajne.'],
  ['<label class="full">Land<input', '<label class="full">Država<input'],
  ['Postleitzahl<input', 'Poštna številka<input'],
  ['Straße und Hausnummer<input', 'Naslov<input'],
  ['Wohnung / Nr.<input', 'Stanovanje / številka<input'],
  ['<label>Stadt<input', '<label>Mesto<input'],
  ['Bundesland / Provinz<input', 'Država / pokrajina<input'],
  ['<h3 class="conta-form-section">Passwort ändern</h3>', '<h3 class="conta-form-section">Spremeni geslo</h3>'],
  ['Leer lassen, wenn Sie das Passwort nicht ändern möchten.', 'Pustite prazno, če ne želite spremeniti gesla.'],
  ['Aktuelles Passwort<input', 'Trenutno geslo<input'],
  ['Neues Passwort<input', 'Novo geslo<input'],
  ['<i class="fas fa-save"></i> Änderungen speichern</button>', '<i class="fas fa-save"></i> Shrani spremembe</button>'],
];

let changed = 0;
for (const page of PAGES) {
  const file = path.join(ROOT, 'sl', page);
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  for (const [from, to] of RULES) {
    html = html.split(from).join(to);
  }
  if (html !== before) {
    fs.writeFileSync(file, html);
    changed++;
    console.log('updated', `sl/${page}`);
  }
}
console.log(`Done — ${changed} file(s) updated.`);
