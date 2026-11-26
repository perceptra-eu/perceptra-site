import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ORIGIN = 'https://perceptra.eu';
const src = readFileSync('index.html', 'utf8');
const ratingSrc = readFileSync('rating.html', 'utf8');

/* pull the translation dictionary out of the inline script */
function readDict(html) {
  const start = html.indexOf('const I18N = ') + 'const I18N = '.length;
  const end = html.indexOf('\n};', start) + 2;
  return new Function('return ' + html.slice(start, end))();
}
const I18N = readDict(src);
const RATING_I18N = readDict(ratingSrc);

const META = {
  it: {
    lang: 'it-IT',
    path: '/',
    file: 'index.html',
    title: 'Perceptra \u2014 Market intelligence per PMI e B2B: dimensione del mercato, quote e concorrenti',
    desc: 'Perceptra ricostruisce i numeri del tuo mercato: dimensioni per prodotto e area, quote, operatori e previsioni. Metodologia proprietaria, ogni numero con fonte e rating di affidabilit\u00e0.'
  },
  en: {
    lang: 'en',
    path: '/en',
    file: 'en.html',
    title: 'Perceptra \u2014 Market intelligence for SMEs and B2B: market size, shares and competitors',
    desc: 'Perceptra rebuilds the numbers of your market: size by product and area, market shares, operators and forecasts. Proprietary methodology, every figure with its source and reliability rating.'
  },
  fr: {
    lang: 'fr',
    path: '/fr',
    file: 'fr.html',
    title: 'Perceptra \u2014 Market intelligence pour PME et B2B : taille du march\u00e9, parts et concurrents',
    desc: 'Perceptra reconstitue les chiffres de votre march\u00e9 : taille par produit et par zone, parts de march\u00e9, acteurs et pr\u00e9visions. M\u00e9thodologie propri\u00e9taire, chaque chiffre avec sa source et sa notation de fiabilit\u00e9.'
  }
};

/* data rating scale page (proof of method) */
const RATING = {
  it: { lang: 'it-IT', path: '/rating', file: 'rating.html', home: '/' },
  en: { lang: 'en', path: '/en/rating', file: 'en/rating.html', home: '/en' },
  fr: { lang: 'fr', path: '/fr/rating', file: 'fr/rating.html', home: '/fr' }
};
for (const [c, r] of Object.entries(RATING)) {
  r.title = RATING_I18N[c]._title;
  r.desc = RATING_I18N[c]._desc;
}

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': ORIGIN + '/#organization',
  name: 'Perceptra',
  url: ORIGIN,
  email: 'hello@perceptra.eu',
  description: 'Societ\u00e0 di market intelligence che ricostruisce dimensioni, quote e operatori dei mercati B2B con una metodologia proprietaria; conduce anche studi con audience sintetiche calibrate su panel umani.',
  slogan: 'I numeri del tuo mercato, anche dove nessuno li ha misurati.',
  logo: ORIGIN + '/brand/icon-512.png',
  image: ORIGIN + '/og.png',
  areaServed: [
    { '@type': 'Country', name: 'Italy' },
    { '@type': 'Country', name: 'France' },
    { '@type': 'Place', name: 'European Union' }
  ],
  knowsLanguage: ['it', 'en', 'fr'],
  contactPoint: [{
    '@type': 'ContactPoint',
    contactType: 'sales',
    email: 'hello@perceptra.eu',
    availableLanguage: ['Italian', 'English', 'French']
  }]
};

const AREAS = [
  { '@type': 'Country', name: 'Italy' },
  { '@type': 'Country', name: 'France' },
  { '@type': 'Place', name: 'European Union' }
];

const service = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': ORIGIN + '/#market-intelligence',
  name: 'Market Intelligence',
  serviceType: 'Ricerca di mercato quantitativa e market sizing',
  provider: { '@id': ORIGIN + '/#organization' },
  areaServed: AREAS,
  audience: {
    '@type': 'BusinessAudience',
    audienceType: 'PMI e startup B2B, produttori e distributori, agenzie di marketing, commercialisti e società di consulenza'
  },
  description: 'Dimensione del mercato per prodotto e area geografica, quote di mercato, mappa degli operatori e stime previsionali. I dati mancanti sono ricostruiti con una metodologia proprietaria; ogni numero riporta fonte, ipotesi e rating di affidabilità.',
  offers: {
    '@type': 'Offer',
    priceCurrency: 'EUR',
    availability: 'https://schema.org/InStock',
    url: ORIGIN
  }
};

const serviceAudiences = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': ORIGIN + '/#synthetic-audiences',
  name: 'Audience sintetiche',
  serviceType: 'Ricerca di mercato qualitativa',
  provider: { '@id': ORIGIN + '/#organization' },
  areaServed: AREAS,
  audience: {
    '@type': 'BusinessAudience',
    audienceType: 'Brand e agenzie nel settore dei beni di consumo'
  },
  description: 'Focus group simulati con audience sintetiche calibrate su un panel umano di controllo, per concept, claim, packaging e pricing test. Ogni studio riporta lo SHCS e non viene consegnato sotto 0,80.'
};

const website = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': ORIGIN + '/#website',
  url: ORIGIN,
  name: 'Perceptra',
  publisher: { '@id': ORIGIN + '/#organization' },
  inLanguage: ['it', 'en', 'fr']
};

const faq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: "Che cosa fa Perceptra?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Ricostruisce i numeri di un mercato B2B: dimensione per prodotto e area geografica, quote di mercato, operatori e previsioni. Quando i dati non sono disponibili direttamente, li stima incrociando pi\u00f9 fonti e metodi."
      }
    },
    {
      '@type': 'Question',
      name: "Come stimate un mercato se i dati non esistono?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Con una metodologia proprietaria: scegliamo le fonti (statistiche ufficiali, commercio estero, registri delle imprese, bilanci, web) e pi\u00f9 approcci di stima indipendenti, poi li confrontiamo. Ipotesi e metodo sono sempre dichiarati nel report."
      }
    },
    {
      '@type': 'Question',
      name: "Che cos'\u00e8 il rating di affidabilit\u00e0?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Ogni dato riporta due lettere da A a E: la prima indica l'affidabilit\u00e0 della fonte, la seconda la qualit\u00e0 del dato. Ogni numero del report si pu\u00f2 ricondurre al calcolo, all'evidenza e alla fonte da cui deriva."
      }
    },
    {
      '@type': 'Question',
      name: "Perceptra fa ancora focus group sintetici?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "S\u00ec. Per i beni di consumo conduciamo studi con audience sintetiche calibrate su un panel umano di controllo; ogni studio riporta lo SHCS e non viene consegnato sotto 0,80."
      }
    },
    {
      '@type': 'Question',
      name: "A chi si rivolge Perceptra?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "A PMI e startup B2B, produttori e distributori, agenzie di marketing, commercialisti e societ\u00e0 di consulenza che hanno bisogno dei numeri reali del proprio mercato senza un budget da grande impresa."
      }
    }
  ]
};

const ld = [organization, website, service, serviceAudiences, faq]
  .map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`)
  .join('\n');

function head(code, pages = META, jsonld = ld) {
  const m = pages[code];
  const alt = Object.entries(pages)
    .map(([c, v]) => `<link rel="alternate" hreflang="${c}" href="${ORIGIN}${v.path}">`)
    .join('\n');
  return `
<link rel="canonical" href="${ORIGIN}${m.path}">
${alt}
<link rel="alternate" hreflang="x-default" href="${ORIGIN}${pages.it.path}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta name="author" content="Perceptra">
<meta name="geo.region" content="IT">
<meta name="geo.placename" content="Italia">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Perceptra">
<meta property="og:locale" content="${m.lang.replace('-', '_')}">
<meta property="og:url" content="${ORIGIN}${m.path}">
<meta property="og:title" content="${m.title}">
<meta property="og:description" content="${m.desc}">
<meta property="og:image" content="${ORIGIN}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${m.title}">
<meta name="twitter:description" content="${m.desc}">
<meta name="twitter:image" content="${ORIGIN}/og.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png">
<meta name="theme-color" content="#0B1D2D">
<meta property="og:image:alt" content="Perceptra — Market Intelligence">
${jsonld}
`;
}

/* Shared per-language rendering: meta, head, pre-rendered translations, sibling-URL switcher */
function render(html, code, pages, dict, jsonld) {
  const m = pages[code];
  let h = html;

  h = h.replace('<html lang="it">', `<html lang="${code}">`);
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${m.title}</title>`);
  h = h.replace(
    /<meta name="description" id="meta-desc" content="[\s\S]*?">/,
    `<meta name="description" id="meta-desc" content="${m.desc}">`
  );

  const order = ['it', 'en', 'fr'];
  let ti = 0, di = 0;
  h = h.replace(/(?<![A-Za-z0-9_])_title:"[^"]*",/g, () => `_title:${JSON.stringify(pages[order[ti++]].title)},`);
  h = h.replace(/(?<![A-Za-z0-9_])_desc:"[^"]*",/g, () => `_desc:${JSON.stringify(pages[order[di++]].desc)},`);

  h = h.replace('</head>', head(code, pages, jsonld) + '</head>');

  /* Pre-render translations so each language ships real text, not empty tags */
  h = h.replace(
    /<([a-z0-9]+)([^>]*\sdata-i18n="([^"]+)"[^>]*)>\s*<\/\1>/g,
    (whole, tag, attrs, key) =>
      dict[key] !== undefined ? `<${tag}${attrs}>${dict[key]}</${tag}>` : whole
  );

  /* Language switcher navigates to the sibling URL instead of swapping text */
  const paths = Object.fromEntries(Object.entries(pages).map(([c, v]) => [c, v.path]));
  h = h.replace(
    /\/\* Auto-detect[\s\S]*?\}\)\(\);/,
    `(function(){
  const CUR = ${JSON.stringify(code)};
  const PATHS = ${JSON.stringify(paths)};
  document.querySelectorAll('.lang button').forEach(b=>{
    const l = b.dataset.lang;
    b.classList.toggle('active', l===CUR);
    b.setAttribute('aria-pressed', l===CUR ? 'true':'false');
    b.addEventListener('click',()=>{ location.href = PATHS[l]; });
  });
})();`
  );

  return h;
}

function build(code) {
  let h = render(src, code, META, I18N[code] || I18N.it, ld);
  /* links to the rating scale point to the page in the same language */
  h = h.replaceAll('href="/rating"', `href="${RATING[code].path}"`);
  return h;
}

function buildRating(code) {
  const r = RATING[code];
  const page = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': ORIGIN + r.path,
    url: ORIGIN + r.path,
    name: r.title,
    description: r.desc,
    inLanguage: r.lang,
    isPartOf: { '@id': ORIGIN + '/#website' },
    publisher: { '@id': ORIGIN + '/#organization' }
  };
  const jsonld = [organization, website, page]
    .map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`)
    .join('\n');
  let h = render(ratingSrc, code, RATING, RATING_I18N[code], jsonld);
  /* links back to the home page in the same language */
  h = h.replace(/data-home="([^"]*)" href="[^"]*"/g, (_, hash) => `data-home="${hash}" href="${r.home}${hash}"`);
  /* app links carry the language and campaign without waiting for JS */
  const appLang = code === 'fr' ? 'fr' : 'en';
  h = h.replace(
    /href="https:\/\/app\.perceptra\.eu\/([a-z]+)" ([^>]*data-utm="([^"]*)")/g,
    (_, path, rest, utm) =>
      `href="https://app.perceptra.eu/${path}?lang=${appLang}&amp;utm_source=perceptra.eu&amp;utm_medium=site&amp;utm_campaign=${utm}" ${rest}`
  );
  return h;
}

for (const code of Object.keys(META)) {
  writeFileSync('public/' + META[code].file, build(code));
}
mkdirSync('public/en', { recursive: true });
mkdirSync('public/fr', { recursive: true });
for (const code of Object.keys(RATING)) {
  writeFileSync('public/' + RATING[code].file, buildRating(code));
}

const today = new Date().toISOString().slice(0, 10);
const sitemapEntries = (pages, priority, freq) => Object.values(pages).map(m => `  <url>
    <loc>${ORIGIN}${m.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${priority(m)}</priority>
${Object.entries(pages).map(([c, v]) => `    <xhtml:link rel="alternate" hreflang="${c}" href="${ORIGIN}${v.path}"/>`).join('\n')}
  </url>`).join('\n');
const urls = [
  sitemapEntries(META, m => (m.path === '/' ? '1.0' : '0.8'), 'weekly'),
  sitemapEntries(RATING, () => '0.6', 'monthly')
].join('\n');

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

> Perceptra è una società di market intelligence per il B2B europeo. Ricostruisce i numeri
> di un mercato (dimensione per prodotto e area, quote, operatori, previsioni) anche quando i dati
> non esistono già pronti, con una metodologia proprietaria. Ogni numero riporta fonte e rating.

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
(A–E): affidabilità della fonte e qualità del dato. Scala completa e regole di combinazione:
${ORIGIN}/rating (inglese: ${ORIGIN}/en/rating, francese: ${ORIGIN}/fr/rating).

## Audience sintetiche (beni di consumo)
Focus group simulati con audience sintetiche calibrate su un panel umano di controllo.
Ogni studio riporta lo SHCS (Synthetic-Human Correlation Score); sotto 0,80 non viene consegnato.

## Per chi
PMI e startup B2B, produttori e distributori, agenzie di marketing, commercialisti e società di consulenza.

## Lingue e mercati
Italiano (/), inglese (/en), francese (/fr). Mercati serviti: Italia, Francia, Unione Europea.

## Contatti
Email: hello@perceptra.eu
Sito: ${ORIGIN}
`);

/* brand assets: official logo pack (brand/), favicon = official symbol */
cpSync('brand', 'public/brand', { recursive: true });
copyFileSync('brand/perceptra-symbol.svg', 'public/favicon.svg');


/* carry over any other asset sitting next to index.html (og.png, etc.) */
import { readdirSync, copyFileSync, cpSync, statSync } from 'node:fs';
for (const f of readdirSync('.')) {
  if (['index.html', 'rating.html', 'seo.mjs', 'package.json', 'vercel.json', 'public', 'node_modules', '.git', 'CNAME'].includes(f)) continue;
  if (statSync(f).isFile()) copyFileSync(f, 'public/' + f);
}

console.log('SEO build ok \u2014 flat URLs, translations pre-rendered');
