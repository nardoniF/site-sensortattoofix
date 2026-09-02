#!/usr/bin/env node
/**
 * Substitui blocos em inglês (forgot/reset/profile) em minha-conta DE/ES/PL/SL
 * pelos textos já definidos nos overrides i18n.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const REPLACEMENTS = {
  de: {
    'Enter your account email. We’ll send a link to choose a new password.':
      'Geben Sie Ihre Konto-E-Mail ein. Wir senden einen Link zum Festlegen eines neuen Passworts.',
    'Send reset link': 'Link senden',
    'Back to sign in': 'Zurück zur Anmeldung',
    'Choose a new password for your account.':
      'Wählen Sie ein neues Passwort für Ihr Konto.',
    'Confirm password': 'Passwort bestätigen',
    'Save new password': 'Neues Passwort speichern',
    'Full name': 'Vollständiger Name',
  },
  es: {
    'Enter your account email. We’ll send a link to choose a new password.':
      'Introduce el email de tu cuenta. Te enviaremos un enlace para elegir una nueva contraseña.',
    'Send reset link': 'Enviar enlace',
    'Back to sign in': 'Volver a iniciar sesión',
    'Choose a new password for your account.':
      'Elige una nueva contraseña para tu cuenta.',
    'Confirm password': 'Confirmar contraseña',
    'Save new password': 'Guardar nueva contraseña',
    'Full name': 'Nombre completo',
  },
  pl: {
    'Enter your account email. We’ll send a link to choose a new password.':
      'Podaj e-mail konta. Wyślemy link do ustawienia nowego hasła.',
    'Send reset link': 'Wyślij link',
    'Back to sign in': 'Wróć do logowania',
    'Choose a new password for your account.':
      'Wybierz nowe hasło do konta.',
    'Confirm password': 'Potwierdź hasło',
    'Save new password': 'Zapisz nowe hasło',
    'Full name': 'Imię i nazwisko',
  },
  sl: {
    'Enter your account email. We’ll send a link to choose a new password.':
      'Vnesite e-pošto računa. Poslali vam bomo povezavo za nastavitev novega gesla.',
    'Send reset link': 'Pošlji povezavo',
    'Back to sign in': 'Nazaj na prijavo',
    'Choose a new password for your account.':
      'Izberite novo geslo za račun.',
    'Confirm password': 'Potrdi geslo',
    'Save new password': 'Shrani novo geslo',
    'Full name': 'Ime in priimek',
  },
};

for (const [lang, map] of Object.entries(REPLACEMENTS)) {
  const file = path.join(ROOT, lang, 'minha-conta.html');
  let html = fs.readFileSync(file, 'utf8');
  let n = 0;
  for (const [from, to] of Object.entries(map)) {
    const before = html;
    html = html.split(from).join(to);
    if (html !== before) n += (before.split(from).length - 1);
  }
  fs.writeFileSync(file, html);
  console.log(`${lang}/minha-conta.html — ${n} substituição(ões)`);
}
