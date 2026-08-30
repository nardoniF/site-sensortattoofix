#!/usr/bin/env node
/**
 * Gera PDF a partir de HTML de carta (A4). Usa Chrome headless.
 * Uso: node scripts/render-letter-pdf.mjs <entrada.html> <saida.pdf>
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const input = resolve(process.argv[2] || '');
const output = resolve(process.argv[3] || '');

if (!input || !output) {
  console.error('Uso: node scripts/render-letter-pdf.mjs <entrada.html> <saida.pdf>');
  process.exit(1);
}
if (!existsSync(input)) {
  console.error('Arquivo não encontrado:', input);
  process.exit(1);
}

mkdirSync(dirname(output), { recursive: true });

const chrome = process.env.CHROME_BIN || 'google-chrome';
const url = 'file://' + input;

const profileDir = '/tmp/stf-letter-pdf-' + Date.now();

execFileSync(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  `--user-data-dir=${profileDir}`,
  '--print-to-pdf=' + output,
  '--no-pdf-header-footer',
  url
], { stdio: 'inherit' });

console.log('PDF gerado:', output);
