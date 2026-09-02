#!/usr/bin/env node
/** DE→SL em sl/comprar.html (após bootstrap-sl-pages.mjs). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {Array<[string, string]>} */
const RULES = [
  ['content="Offizieller Sensor Tattoo Fix Checkout — PayPal, Karten, Sendungsverfolgung in USD."', 'content="Uradna blagajna Sensor Tattoo Fix — PayPal, kartice, sledenje pošiljki v USD."'],
  ['Rabattcode', 'Koda za popust'],
  ['placeholder="z. B. MARIA10"', 'placeholder="npr. MARIA10"'],
  ['>Anwenden</button>', '>Uporabi</button>'],
  ['<span>Zwischensumme</span>', '<span>Vmesna vsota</span>'],
  ['<span id="summary-discount-label">Rabatt</span>', '<span id="summary-discount-label">Popust</span>'],
  ['<span id="summary-shipping-label">Versand</span>', '<span id="summary-shipping-label">Poštnina</span>'],
  ['<span id="summary-paypal-label">PayPal-Gebühr</span>', '<span id="summary-paypal-label">Provizija PayPal</span>'],
  ['<span>Gesamt</span>', '<span>Skupaj</span>'],
  ['Sichere Zahlung', 'Varno plačilo'],
  ['Sendungsverfolgung', 'Sledenje pošiljki'],
  ['Bestätigung per E-Mail', 'Potrditev po e-pošti'],
  ['Weitere Produkte hinzufügen', 'Dodaj več izdelkov'],
  ['Test bestätigen (Zahlung überspringen)', 'Potrdi test (preskoči plačilo)'],
  ['Testbestellung erkannt — ohne Zahlung bestätigen.', 'Zaznano testno naročilo — potrdite brez plačila.'],
  ['<span>1</span> Daten</div>', '<span>1</span> Podatki</div>'],
  ['<span>2</span> Zahlung</div>', '<span>2</span> Plačilo</div>'],
  ['<span>3</span> Bestätigung</div>', '<span>3</span> Potrditev</div>'],
  ['<h3>Ihre Daten</h3>', '<h3>Vaši podatki</h3>'],
  ['Hallo, <strong id="account-logged-name">Kunde</strong> — Sie sind angemeldet.', 'Pozdravljeni, <strong id="account-logged-name">Stranka</strong> — prijavljeni ste.'],
  ['Ihre Bestellungen finden Sie unter <a href="minha-conta.html">Mein Konto</a>.', 'Vaša naročila so v <a href="minha-conta.html">Moj račun</a>.'],
  ['>Marke</span>', '>Znamka</span>'],
  ['<option value="">Marke auswählen</option>', '<option value="">Izberite znamko</option>'],
  ['>Modell</span>', '>Model</span>'],
  ['<option value="">Modell auswählen</option>', '<option value="">Izberite model</option>'],
  ['Das Smartwatch-Kit wird für Ihre Uhr angepasst — bitte Marke und Modell vor dem Fortfahren auswählen.', 'Komplet pametne ure je prilagojen vaši uri — pred nadaljevanjem izberite znamko in model.'],
  ['Hinweise (optional)', 'Opombe (neobvezno)'],
  ['aria-label="Optionale Sensor-Messung"', 'aria-label="Neobvezna meritev senzorja"'],
  ['alt="Smartwatch-Sensor auf der Rückseite"', 'alt="Senzor pametne ure na hrbtni strani"'],
  ['Präzisionszuschnitt', 'Natančno prilagajanje'],
  ['Für mehr Genauigkeit den Sensor-Durchmesser auf der Rückseite der Uhr (mm) mit einem Lineal von Rand zu Rand des Kreises messen.', 'Za večjo natančnost izmerite premer senzorja na hrbtni strani ure (mm) z ravnilom, od roba do roba kroga.'],
  ['placeholder="Optional: Sensor-Durchmesser (mm), Lieferhinweise…"', 'placeholder="Neobvezno: premer senzorja (mm), navodila za dostavo…"'],
  ['Konto (optional)', 'Račun (neobvezno)'],
  ['data-checkout-account-tab="register">Konto erstellen</button>', 'data-checkout-account-tab="register">Ustvari račun</button>'],
  ['data-checkout-account-tab="login">Ich habe bereits ein Konto</button>', 'data-checkout-account-tab="login">Že imam račun</button>'],
  ['Konto erstellen, um Bestellungen zu verfolgen (empfohlen)', 'Ustvarite račun za sledenje naročil (priporočeno)'],
  ['Konto-Passwort (mind. 6 Zeichen)', 'Geslo računa (najmanj 6 znakov)'],
  ['placeholder="Passwort erstellen"', 'placeholder="Ustvarite geslo"'],
  ['aria-label="Passwort anzeigen"', 'aria-label="Prikaži geslo"'],
  ['Anmelden, um Ihre Daten automatisch auszufüllen.', 'Prijavite se za samodejno izpolnitev podatkov.'],
  ['Konto-E-Mail', 'E-pošta računa'],
  ['placeholder="ihre@email.de"', 'placeholder="vi@email.com"'],
  ['Passwort', 'Geslo'],
  ['placeholder="Ihr Passwort"', 'placeholder="Vaše geslo"'],
  ['<i class="fas fa-sign-in-alt"></i> Anmelden</button>', '<i class="fas fa-sign-in-alt"></i> Prijava</button>'],
  ['Passwort vergessen?', 'Ste pozabili geslo?'],
  ['<h3>Lieferadresse</h3>', '<h3>Naslov za dostavo</h3>'],
  ['<option value="">Land auswählen</option>', '<option value="">Izberite državo</option>'],
  ['placeholder="10 Musterstraße"', 'placeholder="Slovenska cesta 10"'],
  ['placeholder="Bundesland / Region"', 'placeholder="Regija / pokrajina"'],
  ['<h4 class="shipping-options-title">Versandart wählen</h4>', '<h4 class="shipping-options-title">Izberite pošiljko</h4>'],
  ['aria-label="Versandoptionen"', 'aria-label="Možnosti pošiljanja"'],
  ['Lieferadresse eingeben, um den Versand zu berechnen.', 'Vnesite naslov za dostavo za izračun poštnine.'],
  ['<h3>Zahlungsmethode</h3>', '<h3>Način plačila</h3>'],
  ['<strong>Kreditkarte</strong>', '<strong>Kreditna kartica</strong>'],
  ['<strong>Karte / Apple Pay / Google Pay</strong><small>Sichere Zahlung über Stripe · Abrechnung in USD</small>', '<strong>Kartica / Apple Pay / Google Pay</strong><small>Varno plačilo prek Stripe · bremenitev v USD</small>'],
  ['<small>PayPal-Guthaben, Karte oder Lastschrift · USD</small>', '<small>PayPal stanje, kartica ali debet · USD</small>'],
  ['Abrechnung in USD · Sendungsverfolgung · Bestätigung per E-Mail. Fragen? <a href="mailto:support@sensortattoofix.com">E-Mail</a>.', 'Bremenitev v USD · sledenje pošiljki · potrditev po e-pošti. Vprašanja? <a href="mailto:support@sensortattoofix.com">E-pošta</a>.'],
  ['Zahlung abschließen', 'Dokončaj plačilo'],
  ['Weiter auf Stripe.com', 'Nadaljuj na Stripe.com'],
  ['Weiter auf PayPal.com', 'Nadaljuj na PayPal.com'],
  ['<h3 id="confirm-title">Bestellung aufgegeben!</h3>', '<h3 id="confirm-title">Naročilo oddano!</h3>'],
  ['<p>Bestellung <strong id="order-id">—</strong></p>', '<p>Naročilo <strong id="order-id">—</strong></p>'],
  ['Gesamt: <strong id="pix-amount">—</strong>', 'Skupaj: <strong id="pix-amount">—</strong>'],
  ['Die Bestätigung wird automatisch per E-Mail gesendet.', 'Potrditev bo samodejno poslana po e-pošti.'],
  ['<span class="btn-checkout-label">Zurück</span>', '<span class="btn-checkout-label">Nazaj</span>'],
  ['<span class="btn-checkout-label">Weiter</span>', '<span class="btn-checkout-label">Nadaljuj</span>'],
  ['<span class="btn-checkout-label">Bestellung aufgeben</span>', '<span class="btn-checkout-label">Oddaj naročilo</span>'],
  ['aria-label="Schließen"', 'aria-label="Zapri"'],
];

const file = path.join(ROOT, 'sl', 'comprar.html');
let html = fs.readFileSync(file, 'utf8');
for (const [from, to] of RULES) {
  html = html.split(from).join(to);
}
fs.writeFileSync(file, html);
console.log('localized sl/comprar.html');
