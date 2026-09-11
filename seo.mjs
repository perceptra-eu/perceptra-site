import { readFileSync, writeFileSync } from 'node:fs';

const ORIGIN = 'https://perceptra.eu';
const src = readFileSync('index.html', 'utf8');

/* pull the translation dictionary out of the inline script */
const dictStart = src.indexOf('const I18N = ') + 'const I18N = '.length;
const dictEnd = src.indexOf('\nfunction setLang');
const dictSrc = src.slice(dictStart, dictEnd).trim().replace(/;$/, '');
const I18N = new Function('return ' + dictSrc)();

const META = {
  it: {
    lang: 'it-IT',
    path: '/',
    file: 'index.html',
    title: 'Perceptra \u2014 Ricerca di mercato con focus group sintetici in 72 ore',
    desc: 'Perceptra conduce studi qualitativi con audience sintetiche calibrate su panel umani reali. Report in 72 ore, ogni insight con il suo punteggio di affidabilit\u00e0 (SHCS).'
  },
  en: {
    lang: 'en',
    path: '/en',
    file: 'en.html',
    title: 'Perceptra \u2014 Market research with synthetic focus groups in 72 hours',
    desc: 'Perceptra runs qualitative studies with synthetic audiences calibrated on real human panels. Reports in 72 hours, every insight scored for reliability (SHCS).'
  },
  fr: {
    lang: 'fr',
    path: '/fr',
    file: 'fr.html',
    title: 'Perceptra \u2014 \u00c9tudes de march\u00e9 avec focus groups synth\u00e9tiques en 72 heures',
    desc: 'Perceptra m\u00e8ne des \u00e9tudes qualitatives avec des audiences synth\u00e9tiques calibr\u00e9es sur des panels humains r\u00e9els. Rapports en 72 heures, chaque insight avec son score de fiabilit\u00e9 (SHCS).'
  }
};

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': ORIGIN + '/#organization',
  name: 'Perceptra',
  url: ORIGIN,
  email: 'hello@perceptra.eu',
  description: 'Istituto di ricerca che conduce studi qualitativi con audience sintetiche calibrate su panel umani reali.',
  slogan: 'Le reazioni del tuo mercato, prima del mercato.',
  logo: ORIGIN + '/og.png',
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

const service = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': ORIGIN + '/#service',
  name: 'Focus group sintetici calibrati',
  serviceType: 'Ricerca di mercato qualitativa',
  provider: { '@id': ORIGIN + '/#organization' },
  areaServed: [
    { '@type': 'Country', name: 'Italy' },
    { '@type': 'Country', name: 'France' },
    { '@type': 'Place', name: 'European Union' }
  ],
  audience: {
    '@type': 'BusinessAudience',
    audienceType: 'Agenzie creative, brand mid-market, startup'
  },
  description: 'Studi qualitativi condotti su audience sintetiche calibrate su panel umani reali. Consegna del report in 72 ore, con punteggio di affidabilit\u00e0 SHCS per ogni insight.',
  offers: {
    '@type': 'Offer',
    priceCurrency: 'EUR',
    availability: 'https://schema.org/InStock',
    url: ORIGIN
  }
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
      name: 'Che cosa sono i focus group sintetici di Perceptra?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sono studi qualitativi in cui le risposte vengono generate da audience sintetiche: profili costruiti per rispecchiare un target reale. Ogni studio Perceptra \u00e8 calibrato su un panel di persone reali, cos\u00ec la distribuzione delle risposte sintetiche pu\u00f2 essere confrontata con quella umana.'
      }
    },
    {
      '@type': 'Question',
      name: "Che cos'\u00e8 lo SHCS?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Lo SHCS (Synthetic-Human Correlation Score) misura quanto le distribuzioni di risposta sintetiche corrispondono a quelle umane, domanda per domanda. Viene riportato in ogni studio Perceptra, cos\u00ec il cliente sa quanto fidarsi di ciascun insight.'
      }
    },
    {
      '@type': 'Question',
      name: 'Quanto tempo serve per ricevere uno studio?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Il report viene consegnato entro 72 ore dalla conferma dello studio, contro le settimane richieste da un focus group tradizionale.'
      }
    },
    {
      '@type': 'Question',
      name: 'A chi si rivolge Perceptra?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Ad agenzie creative, brand del mid-market e startup che hanno bisogno di ricerca di qualit\u00e0 enterprise con tempi e costi compatibili con la loro realt\u00e0 operativa.'
      }
    }
  ]
};

const ld = [organization, website, service, faq]
  .map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`)
  .join('\n');

function head(code) {
  const m = META[code];
  const alt = Object.entries(META)
    .map(([c, v]) => `<link rel="alternate" hreflang="${c}" href="${ORIGIN}${v.path}">`)
    .join('\n');
  return `
<link rel="canonical" href="${ORIGIN}${m.path}">
${alt}
<link rel="alternate" hreflang="x-default" href="${ORIGIN}/">
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
${ld}
`;
}

function build(code) {
  const m = META[code];
  let h = src;

  h = h.replace('<html lang="it">', `<html lang="${code}">`);
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${m.title}</title>`);
  h = h.replace(
    /<meta name="description" id="meta-desc" content="[\s\S]*?">/,
    `<meta name="description" id="meta-desc" content="${m.desc}">`
  );

  const order = ['it', 'en', 'fr'];
  let ti = 0, di = 0;
  h = h.replace(/(?<![A-Za-z0-9_])_title:"[^"]*",/g, () => `_title:${JSON.stringify(META[order[ti++]].title)},`);
  h = h.replace(/(?<![A-Za-z0-9_])_desc:"[^"]*",/g, () => `_desc:${JSON.stringify(META[order[di++]].desc)},`);

  h = h.replace('</head>', head(code) + '</head>');

  /* Pre-render translations so each language ships real text, not empty tags */
  const dict = I18N[code] || I18N.it;
  h = h.replace(
    /<([a-z0-9]+)([^>]*\sdata-i18n="([^"]+)"[^>]*)>\s*<\/\1>/g,
    (whole, tag, attrs, key) =>
      dict[key] !== undefined ? `<${tag}${attrs}>${dict[key]}</${tag}>` : whole
  );

  /* Language switcher navigates to the sibling URL instead of swapping text */
  h = h.replace(
    /\/\* Auto-detect[\s\S]*?\}\)\(\);/,
    `(function(){
  const CUR = ${JSON.stringify(code)};
  const PATHS = {it:"/", en:"/en", fr:"/fr"};
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

for (const code of Object.keys(META)) {
  writeFileSync('public/' + META[code].file, build(code));
}

const today = new Date().toISOString().slice(0, 10);
const urls = Object.values(META).map(m => `  <url>
    <loc>${ORIGIN}${m.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${m.path === '/' ? '1.0' : '0.8'}</priority>
${Object.entries(META).map(([c, v]) => `    <xhtml:link rel="alternate" hreflang="${c}" href="${ORIGIN}${v.path}"/>`).join('\n')}
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

> Perceptra \u00e8 un istituto di ricerca che conduce studi qualitativi con audience sintetiche
> calibrate su panel umani reali. I report sono consegnati in 72 ore e ogni insight riporta
> il suo punteggio di affidabilit\u00e0 (SHCS).

## Cosa fa
- Concept test, packaging test, test di claim, pricing e naming.
- Studi condotti su audience sintetiche costruite per rispecchiare un target reale.
- Ogni studio include un panel umano di controllo: la calibrazione \u00e8 una scelta di progetto, non un'opzione premium.

## SHCS (Synthetic-Human Correlation Score)
Misura la corrispondenza tra le distribuzioni di risposta sintetiche e quelle umane, domanda per domanda.
Viene riportato in ogni studio, cos\u00ec il cliente sa quanto fidarsi di ciascun insight.

## Per chi
Agenzie creative, brand del mid-market e startup: chi ha bisogno di ricerca di qualit\u00e0 enterprise
con tempi e costi sostenibili.

## Lingue e mercati
Italiano (/), inglese (/en), francese (/fr). Mercati serviti: Italia, Francia, Unione Europea.

## Contatti
Email: hello@perceptra.eu
Sito: ${ORIGIN}
`);

writeFileSync('public/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#0B1D2D"/><circle cx="16" cy="16" r="9" fill="none" stroke="#33D6E6" stroke-width="2.5"/><circle cx="16" cy="16" r="3" fill="#1FB5B6"/></svg>
`);

/* carry over any other asset sitting next to index.html (og.png, etc.) */
import { readdirSync, copyFileSync, statSync } from 'node:fs';
for (const f of readdirSync('.')) {
  if (['index.html', 'seo.mjs', 'package.json', 'vercel.json', 'public', 'node_modules', '.git', 'CNAME'].includes(f)) continue;
  if (statSync(f).isFile()) copyFileSync(f, 'public/' + f);
}

console.log('SEO build ok \u2014 flat URLs, translations pre-rendered');
