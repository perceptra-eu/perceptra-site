/*
 * Static build for perceptra.eu (run by Vercel: `npm run build`).
 *
 * Two pages, three languages each:
 * - index.html (home: /, /en, /fr): markup with data-i18n keys plus the I18N dictionary.
 * - rating.html (data rating scale: /rating, /en/rating, /fr/rating): its own markup and
 *   dictionary (keys r_*); the home's stylesheet, header and footer are inserted here, and
 *   its texts are the home's dictionary plus its own, so shared texts live in one place.
 * For each page and language this script writes a pre-rendered file with its own head
 * (canonical, hreflang, Open Graph, JSON-LD), real text instead of empty tags, the
 * dictionary removed, links pointing to the same language, and app links tagged with
 * language and UTM. It also writes sitemap.xml, robots.txt and llms.txt, and copies brand
 * assets and root files.
 *
 * The build fails if a key used in the markup is missing in any language.
 */
import { readFileSync, writeFileSync, readdirSync, copyFileSync, cpSync, statSync, mkdirSync } from 'node:fs';

const ORIGIN = 'https://perceptra.eu';
const APP = 'https://app.perceptra.eu';
const LANGS = ['it', 'en', 'fr'];
const src = readFileSync('index.html', 'utf8');
const ratingRaw = readFileSync('rating.html', 'utf8');

/* ---------- dictionaries ---------- */
const I18N_BLOCK = /\n?<script id="i18n">[\s\S]*?<\/script>\n?/;
function readDict(html, file) {
  const start = html.indexOf('const I18N = ');
  if (start < 0) throw new Error(`I18N dictionary not found in ${file}`);
  const from = start + 'const I18N = '.length;
  const end = html.indexOf('\n};', from) + 2;
  return new Function('return ' + html.slice(from, end))();
}
const I18N = readDict(src, 'index.html');
const R_I18N = readDict(ratingRaw, 'rating.html');

/* ---------- the rating page takes the home's stylesheet, header and footer ---------- */
function part(re, what) {
  const m = src.match(re);
  if (!m) throw new Error(`index.html: ${what} not found`);
  return m[0];
}
/* in the home's header and footer, in-page links become links to the home's sections, except
   the contact section, which the rating page has too; the brand goes to the home */
const toHome = html => html
  .replace(/<a class="brand( f-brand)?" href="#top">/g, (whole, f) => `<a class="brand${f || ''}" href="/">`)
  .replace(/href="#(?!contatti")([a-z][a-z0-9-]*)"/g, 'href="/#$1"');
/* the first link to the reliability section is the top navigation's (the mobile menu and footer come later) */
const NAV_AFF = '<a href="#affidabilita"';
const sharedCss = part(/<style>[\s\S]*?<\/style>/, 'stylesheet').replace(/^<style>|<\/style>$/g, '').trim();
const sharedHeader = part(/<header class="site-header">[\s\S]*?<\/header>/, 'header');
const sharedFooter = part(/<footer class="site-footer">[\s\S]*?<\/footer>/, 'footer');
if (sharedHeader.indexOf(NAV_AFF) < 0 || sharedHeader.indexOf(NAV_AFF) > sharedHeader.indexOf('class="menu-panel"')) {
  throw new Error('index.html: the top navigation changed, update seo.mjs');
}
for (const [marker, what] of [['/* @shared-styles', 'styles'], ['<!-- @header', 'header'], ['<!-- @footer', 'footer']]) {
  if (!ratingRaw.includes(marker)) throw new Error(`rating.html: ${what} marker missing`);
}
const ratingSrc = ratingRaw
  .replace(/\/\* @shared-styles[^*]*\*\//, () => sharedCss)
  /* the reliability item of the top navigation is the current section */
  .replace(/<!-- @header[^>]*-->/, () => toHome(sharedHeader.replace(NAV_AFF, '<a class="is-active" href="#affidabilita"')))
  /* the footer's link to this page marks the current page */
  .replace(/<!-- @footer[^>]*-->/, () => toHome(sharedFooter).replace('<a href="/rating"', '<a href="/rating" aria-current="page"'));

/* ---------- pages ---------- */
const HOME_PATH = { it: '/', en: '/en', fr: '/fr' };
const PAGES = {
  home: {
    src,
    dict: I18N,
    meta: {
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
    }
  },
  rating: {
    src: ratingSrc,
    dict: Object.fromEntries(LANGS.map(c => [c, { ...I18N[c], ...R_I18N[c] }])),
    meta: {
      it: {
        lang: 'it-IT',
        path: '/rating',
        file: 'rating.html',
        name: 'Scala di rating del dato',
        title: 'Scala di rating del dato — Perceptra',
        desc: 'Come Perceptra valuta ogni numero: due lettere da A a E per affidabilità della fonte e qualità del dato, regole di combinazione e limiti dichiarati.'
      },
      en: {
        lang: 'en',
        path: '/en/rating',
        file: 'en/rating.html',
        name: 'Data rating scale',
        title: 'Data rating scale — Perceptra',
        desc: 'How Perceptra rates every figure: two letters from A to E for source reliability and data quality, the rules that combine them and their limits.'
      },
      fr: {
        lang: 'fr',
        path: '/fr/rating',
        file: 'fr/rating.html',
        name: 'Échelle de notation de la donnée',
        title: 'Échelle de notation de la donnée — Perceptra',
        desc: 'Comment Perceptra note chaque chiffre : deux lettres de A à E pour la fiabilité de la source et la qualité de la donnée, règles de combinaison et limites.'
      }
    }
  }
};

/* ---------- validation ---------- */
const errors = [];
for (const [file, dict] of [['index.html', I18N], ['rating.html', R_I18N]]) {
  for (const code of LANGS) if (!dict[code]) errors.push(`${file}: language "${code}" missing`);
  for (const code of LANGS.slice(1)) {
    const extra = Object.keys(dict[code] || {}).filter(k => dict.it[k] === undefined);
    if (extra.length) errors.push(`${file}: ${code} has keys not in it: ${extra.join(', ')}`);
  }
}
/* the rating page's own keys must not shadow the home's */
const shadowed = Object.keys(R_I18N.it || {}).filter(k => I18N.it[k] !== undefined);
if (shadowed.length) errors.push(`rating.html: keys already in index.html: ${shadowed.join(', ')}`);
let checked = 0;
for (const [name, page] of Object.entries(PAGES)) {
  const used = new Set([...page.src.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map(m => m[1]));
  checked += used.size;
  for (const code of LANGS) {
    for (const key of used) if (page.dict[code]?.[key] === undefined) errors.push(`${name}: ${code}.${key} missing`);
  }
}
if (errors.length) {
  console.error('i18n check failed:\n  ' + errors.join('\n  '));
  process.exit(1);
}
for (const [name, page] of Object.entries(PAGES)) {
  for (const [code, m] of Object.entries(page.meta)) {
    if (m.title.length > 65) console.warn(`warning: ${name} ${code} title is ${m.title.length} chars (search engines show ~60)`);
    if (m.desc.length > 165) console.warn(`warning: ${name} ${code} description is ${m.desc.length} chars (search engines show ~160)`);
  }
}

const stripTags = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const ldScripts = objs => objs.map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');

/* ---------- structured data ---------- */
const AREAS = [
  { '@type': 'Country', name: 'Italy' },
  { '@type': 'Country', name: 'France' },
  { '@type': 'Place', name: 'European Union' }
];

function organization(code) {
  const d = I18N[code];
  return {
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
}
const website = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': ORIGIN + '/#website',
  url: ORIGIN,
  name: 'Perceptra',
  publisher: { '@id': ORIGIN + '/#organization' },
  inLanguage: LANGS
};

function homeJsonLd(code) {
  const d = I18N[code];
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
    inLanguage: PAGES.home.meta[code].lang,
    mainEntity: [1, 2, 3, 4, 5].map(i => ({
      '@type': 'Question',
      name: stripTags(d[`faq${i}_q`]),
      acceptedAnswer: { '@type': 'Answer', text: stripTags(d[`faq${i}_a`]) }
    }))
  };
  return ldScripts([organization(code), website, mi, audiences, faq]);
}

function ratingJsonLd(code) {
  const m = PAGES.rating.meta[code];
  const url = ORIGIN + m.path;
  const page = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': url,
    url,
    name: m.name,
    description: m.desc,
    inLanguage: m.lang,
    isPartOf: { '@id': ORIGIN + '/#website' },
    publisher: { '@id': ORIGIN + '/#organization' },
    breadcrumb: { '@id': url + '#breadcrumb' }
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': url + '#breadcrumb',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Perceptra', item: ORIGIN + PAGES.home.meta[code].path },
      { '@type': 'ListItem', position: 2, name: m.name, item: url }
    ]
  };
  return ldScripts([organization(code), website, page, breadcrumb]);
}
const JSONLD = { home: homeJsonLd, rating: ratingJsonLd };

function head(name, code) {
  const meta = PAGES[name].meta;
  const m = meta[code];
  const alt = LANGS
    .map(c => `<link rel="alternate" hreflang="${c}" href="${ORIGIN}${meta[c].path}">`)
    .join('\n');
  return `
<link rel="canonical" href="${ORIGIN}${m.path}">
${alt}
<link rel="alternate" hreflang="x-default" href="${ORIGIN}${meta.it.path}">
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
${JSONLD[name](code)}
`;
}

/* ---------- page rendering ---------- */
function build(name, code) {
  const page = PAGES[name];
  const m = page.meta[code];
  const dict = page.dict[code];
  let h = page.src;

  h = h.replace('<html lang="it">', `<html lang="${code}">`);
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${m.title}</title>`);
  h = h.replace(
    /<meta name="description" id="meta-desc" content="[\s\S]*?">/,
    `<meta name="description" content="${escAttr(m.desc)}">`
  );
  h = h.replace(I18N_BLOCK, '\n');
  h = h.replace('</head>', head(name, code) + '</head>');

  /* text: fill every empty element that carries a data-i18n key */
  h = h.replace(
    /<([a-z0-9]+)([^>]*?)\sdata-i18n="([^"]+)"([^>]*)>\s*<\/\1>/g,
    (whole, tag, before, key, after) => `<${tag}${before}${after}>${dict[key]}</${tag}>`
  );
  /* accessible names */
  h = h.replace(/\sdata-i18n-aria="([^"]+)"/g, (whole, key) => ` aria-label="${escAttr(stripTags(dict[key]))}"`);
  /* links to the home, its sections and the rating page stay in the same language */
  h = h.replace(/href="\/#([a-z][a-z0-9-]*)"/g, (whole, id) => `href="${HOME_PATH[code]}#${id}"`);
  h = h.replace(/href="\/"(?![^>]*\sdata-lang=)/g, `href="${HOME_PATH[code]}"`);
  h = h.replace(/href="\/rating"/g, `href="${PAGES.rating.meta[code].path}"`);
  /* language switch: each language links to this page in that language; the current one is marked */
  h = h.replace(/<a href="[^"]*"( hreflang="([a-z]{2})"[^>]*?)\sdata-lang="\2"([^>]*)>/g, (whole, mid, lang, after) =>
    `<a href="${page.meta[lang].path}"${mid}${after}${lang === code ? ' aria-current="true"' : ''}>`);
  /* app links: language and campaign tracking (rating page campaigns are prefixed) */
  h = h.replace(/<a([^>]*?)\sdata-app="([a-z-]+)"([^>]*)>/g, (whole, before, path, after) => {
    const attrs = before + after;
    const utm = (/\sdata-utm="([a-z-]+)"/.exec(attrs) || [])[1] || 'site';
    const campaign = name === 'home' ? utm : `${name}-${utm}`;
    const href = `${APP}/${path}?lang=${code}&amp;utm_source=perceptra.eu&amp;utm_medium=site&amp;utm_campaign=${campaign}`;
    return `<a${attrs.replace(/\sdata-utm="[^"]*"/, '').replace(/\shref="[^"]*"/, ` href="${href}"`)}>`;
  });

  const leftover = h.match(/data-i18n|data-lang=|const I18N|@shared-styles|@header|@footer/);
  if (leftover) throw new Error(`${name} ${code}: untranslated markup left in output (${leftover[0]})`);
  return h;
}

mkdirSync('public/en', { recursive: true });
mkdirSync('public/fr', { recursive: true });
for (const name of Object.keys(PAGES)) {
  for (const code of LANGS) writeFileSync('public/' + PAGES[name].meta[code].file, build(name, code));
}

/* ---------- sitemap, robots, llms.txt ---------- */
const today = new Date().toISOString().slice(0, 10);
const urls = Object.entries(PAGES).flatMap(([name, page]) => LANGS.map(c => page.meta[c]).map(m => `  <url>
    <loc>${ORIGIN}${m.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${m.path === '/' ? '1.0' : name === 'home' ? '0.8' : '0.6'}</priority>
${LANGS.map(c => `    <xhtml:link rel="alternate" hreflang="${c}" href="${ORIGIN}${page.meta[c].path}"/>`).join('\n')}
  </url>`)).join('\n');

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
(A–E): affidabilità della fonte e qualità del dato. Scala completa, regole di combinazione e limiti:
${ORIGIN}/rating (inglese: ${ORIGIN}/en/rating, francese: ${ORIGIN}/fr/rating).

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
const SKIP = ['index.html', 'rating.html', 'seo.mjs', 'package.json', 'vercel.json', 'CNAME', 'README.md'];
for (const f of readdirSync('.')) {
  if (f.startsWith('.') || SKIP.includes(f)) continue;
  if (statSync(f).isFile()) copyFileSync(f, 'public/' + f);
}

console.log(`build ok — ${Object.keys(PAGES).length} pages × ${LANGS.length} languages, ${checked} keys checked`);
