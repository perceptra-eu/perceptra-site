/*
 * Static build for perceptra.eu (run by Vercel: `npm run build`).
 *
 * index.html is the single source: markup with data-i18n keys plus the I18N dictionary.
 * For each language this script writes a pre-rendered page (/, /en, /fr) with its own
 * head (canonical, hreflang, Open Graph, JSON-LD), real text instead of empty tags, the
 * dictionary removed and app links tagged with language and UTM. It also writes
 * sitemap.xml, robots.txt and llms.txt, and copies brand assets and root files.
 *
 * The build fails if a key used in the markup is missing in any language.
 */
import { readFileSync, writeFileSync, readdirSync, copyFileSync, cpSync, statSync } from 'node:fs';

const ORIGIN = 'https://perceptra.eu';
const APP = 'https://app.perceptra.eu';
const LANGS = ['it', 'en', 'fr'];
const src = readFileSync('index.html', 'utf8');

/* ---------- dictionary ---------- */
const I18N_BLOCK = /\n?<script id="i18n">[\s\S]*?<\/script>\n?/;
function readDict(html) {
  const start = html.indexOf('const I18N = ');
  if (start < 0) throw new Error('I18N dictionary not found in index.html');
  const from = start + 'const I18N = '.length;
  const end = html.indexOf('\n};', from) + 2;
  return new Function('return ' + html.slice(from, end))();
}
const I18N = readDict(src);

/* ---------- validation: every key used in the markup exists in every language ---------- */
const used = new Set([...src.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map(m => m[1]));
const errors = [];
for (const code of LANGS) {
  if (!I18N[code]) { errors.push(`language "${code}" missing`); continue; }
  for (const key of used) if (I18N[code][key] === undefined) errors.push(`${code}.${key} missing`);
}
for (const code of LANGS.slice(1)) {
  const extra = Object.keys(I18N[code] || {}).filter(k => I18N.it[k] === undefined);
  if (extra.length) errors.push(`${code} has keys not in it: ${extra.join(', ')}`);
}
if (errors.length) {
  console.error('i18n check failed:\n  ' + errors.join('\n  '));
  process.exit(1);
}

/* ---------- per-language metadata ---------- */
const META = {
  it: {
    lang: 'it-IT',
    path: '/',
    file: 'index.html',
    title: 'Perceptra — Market intelligence: dimensione del mercato e quote',
    desc: 'Ricostruiamo i numeri del tuo mercato: dimensione per prodotto e area, quote, operatori e previsioni. Metodo proprietario, fonte e rating su ogni numero.'
  },
  en: {
    lang: 'en',
    path: '/en',
    file: 'en.html',
    title: 'Perceptra — Market intelligence: market size and market share',
    desc: 'We rebuild the numbers of your market: size by product and area, shares, operators and forecasts. Proprietary method, source and rating on every figure.'
  },
  fr: {
    lang: 'fr',
    path: '/fr',
    file: 'fr.html',
    title: 'Perceptra — Market intelligence : taille et parts de marché',
    desc: 'Nous reconstituons les chiffres de votre marché : taille, parts, acteurs et prévisions. Méthode propriétaire, source et notation sur chaque chiffre.'
  }
};
for (const [code, m] of Object.entries(META)) {
  if (m.title.length > 65) console.warn(`warning: ${code} title is ${m.title.length} chars (search engines show ~60)`);
  if (m.desc.length > 165) console.warn(`warning: ${code} description is ${m.desc.length} chars (search engines show ~160)`);
}

const stripTags = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/* ---------- structured data ---------- */
const AREAS = [
  { '@type': 'Country', name: 'Italy' },
  { '@type': 'Country', name: 'France' },
  { '@type': 'Place', name: 'European Union' }
];

function jsonLd(code) {
  const d = I18N[code];
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORIGIN + '/#organization',
    name: 'Perceptra',
    url: ORIGIN,
    email: 'hello@perceptra.eu',
    description: stripTags(d.f_desc),
    slogan: stripTags(d.h_title),
    logo: ORIGIN + '/brand/icon-512.png',
    image: ORIGIN + '/og.png',
    areaServed: AREAS,
    knowsLanguage: LANGS,
    contactPoint: [{
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'hello@perceptra.eu',
      availableLanguage: ['Italian', 'English', 'French']
    }]
  };
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': ORIGIN + '/#website',
    url: ORIGIN,
    name: 'Perceptra',
    publisher: { '@id': ORIGIN + '/#organization' },
    inLanguage: LANGS
  };
  const mi = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': ORIGIN + '/#market-intelligence',
    name: stripTags(d.sv1_t),
    serviceType: 'Market research and market sizing',
    provider: { '@id': ORIGIN + '/#organization' },
    areaServed: AREAS,
    description: stripTags(d.sv1_p)
  };
  const audiences = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': ORIGIN + '/#synthetic-audiences',
    name: stripTags(d.sv2_t),
    serviceType: 'Qualitative market research',
    provider: { '@id': ORIGIN + '/#organization' },
    areaServed: AREAS,
    description: stripTags(d.sv2_p)
  };
  /* FAQ mirrors the visible FAQ section of the same language */
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: META[code].lang,
    mainEntity: [1, 2, 3, 4, 5].map(i => ({
      '@type': 'Question',
      name: stripTags(d[`faq${i}_q`]),
      acceptedAnswer: { '@type': 'Answer', text: stripTags(d[`faq${i}_a`]) }
    }))
  };
  return [organization, website, mi, audiences, faq]
    .map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`)
    .join('\n');
}

function head(code) {
  const m = META[code];
  const alt = LANGS
    .map(c => `<link rel="alternate" hreflang="${c}" href="${ORIGIN}${META[c].path}">`)
    .join('\n');
  return `
<link rel="canonical" href="${ORIGIN}${m.path}">
${alt}
<link rel="alternate" hreflang="x-default" href="${ORIGIN}/">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta name="author" content="Perceptra">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Perceptra">
<meta property="og:locale" content="${m.lang.replace('-', '_')}">
<meta property="og:url" content="${ORIGIN}${m.path}">
<meta property="og:title" content="${escAttr(m.title)}">
<meta property="og:description" content="${escAttr(m.desc)}">
<meta property="og:image" content="${ORIGIN}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Perceptra — Market Intelligence">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escAttr(m.title)}">
<meta name="twitter:description" content="${escAttr(m.desc)}">
<meta name="twitter:image" content="${ORIGIN}/og.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png">
${jsonLd(code)}
`;
}

/* ---------- page rendering ---------- */
function build(code) {
  const m = META[code];
  const dict = I18N[code];
  let h = src;

  h = h.replace('<html lang="it">', `<html lang="${code}">`);
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${m.title}</title>`);
  h = h.replace(
    /<meta name="description" id="meta-desc" content="[\s\S]*?">/,
    `<meta name="description" content="${escAttr(m.desc)}">`
  );
  h = h.replace(I18N_BLOCK, '\n');
  h = h.replace('</head>', head(code) + '</head>');

  /* text: fill every empty element that carries a data-i18n key */
  h = h.replace(
    /<([a-z0-9]+)([^>]*?)\sdata-i18n="([^"]+)"([^>]*)>\s*<\/\1>/g,
    (whole, tag, before, key, after) => `<${tag}${before}${after}>${dict[key]}</${tag}>`
  );
  /* accessible names */
  h = h.replace(/\sdata-i18n-aria="([^"]+)"/g, (whole, key) => ` aria-label="${escAttr(stripTags(dict[key]))}"`);
  /* language switch: mark the current language */
  h = h.replace(/<a([^>]*?)\sdata-lang="([a-z]{2})"([^>]*)>/g, (whole, before, lang, after) =>
    `<a${before}${after}${lang === code ? ' aria-current="true"' : ''}>`);
  /* app links: language and campaign tracking */
  h = h.replace(/<a([^>]*?)\sdata-app="([a-z-]+)"([^>]*)>/g, (whole, before, path, after) => {
    const attrs = before + after;
    const utm = (/\sdata-utm="([a-z-]+)"/.exec(attrs) || [])[1] || 'site';
    const href = `${APP}/${path}?lang=${code}&amp;utm_source=perceptra.eu&amp;utm_medium=site&amp;utm_campaign=${utm}`;
    return `<a${attrs.replace(/\sdata-utm="[^"]*"/, '').replace(/\shref="[^"]*"/, ` href="${href}"`)}>`;
  });

  const leftover = h.match(/data-i18n|const I18N/);
  if (leftover) throw new Error(`${code}: untranslated markup left in output (${leftover[0]})`);
  return h;
}

for (const code of LANGS) writeFileSync('public/' + META[code].file, build(code));

/* ---------- sitemap, robots, llms.txt ---------- */
const today = new Date().toISOString().slice(0, 10);
const urls = LANGS.map(c => META[c]).map(m => `  <url>
    <loc>${ORIGIN}${m.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${m.path === '/' ? '1.0' : '0.8'}</priority>
${LANGS.map(c => `    <xhtml:link rel="alternate" hreflang="${c}" href="${ORIGIN}${META[c].path}"/>`).join('\n')}
  </url>`).join('\n');

writeFileSync('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`);

writeFileSync('public/robots.txt', `User-agent: *
Allow: /

Sitemap: ${ORIGIN}/sitemap.xml
`);

writeFileSync('public/llms.txt', `# Perceptra

> Perceptra è una società di market intelligence. Ricostruisce i numeri di un mercato
> (dimensione per prodotto e area, quote, operatori, previsioni) anche quando i dati non
> esistono già pronti, con una metodologia proprietaria. Ogni numero riporta fonte e rating.
> Secondo motore: audience sintetiche calibrate su panel umani.

## Market Intelligence (servizio principale)
- Dimensione del mercato per prodotto e area geografica.
- Quote di mercato e posizionamento.
- Mappa degli operatori: concorrenti, fornitori, canali.
- Stime previsionali e potenziale indirizzabile.
- Report decisionale con fonti, ipotesi, metodo e livello di confidenza.

## Metodo
1. Inquadramento: prodotto, classificazioni statistiche, area, orizzonte temporale.
2. Fonti e modelli: statistiche ufficiali, commercio estero, registri delle imprese, bilanci, web.
3. Ricostruzione e triangolazione: lo stesso numero stimato con approcci indipendenti.
4. Report decisionale.

## Affidabilità
Ogni numero si può ricondurre a calcolo, evidenza e fonte. Ogni dato ha un rating di due lettere
(A–E): affidabilità della fonte e qualità del dato.

## Audience sintetiche (beni di consumo)
Focus group simulati con audience sintetiche calibrate su un panel umano di controllo.
Ogni studio riporta lo SHCS (Synthetic-Human Correlation Score); sotto 0,80 non viene consegnato.

## Per chi
PMI e startup B2B, produttori e distributori, agenzie di marketing, commercialisti e società di consulenza.

## Lingue
Italiano (/), inglese (/en), francese (/fr).

## Contatti
Email: hello@perceptra.eu
Sito: ${ORIGIN}
`);

/* ---------- assets ---------- */
/* official logo pack (brand/), favicon = official symbol */
cpSync('brand', 'public/brand', { recursive: true });
copyFileSync('brand/perceptra-symbol.svg', 'public/favicon.svg');

/* any other file next to index.html (og.png, 404.html, ...) */
const SKIP = ['index.html', 'seo.mjs', 'package.json', 'vercel.json', 'CNAME', 'README.md'];
for (const f of readdirSync('.')) {
  if (f.startsWith('.') || SKIP.includes(f)) continue;
  if (statSync(f).isFile()) copyFileSync(f, 'public/' + f);
}

console.log(`build ok — ${LANGS.length} languages, ${used.size} keys checked`);
