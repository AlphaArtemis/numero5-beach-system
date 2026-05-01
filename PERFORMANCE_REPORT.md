# Performance report - Numero 5 Beach System

Data: 2026-05-02

## Prima

- Lighthouse segnalato: Performance 22.
- Riferimento a host temporaneo di test trovato in `vite.config.js`.
- Immagini importate nella build:
  - `src/assets/foto-giornaliere/spiaggia-ombrellone.png`: 1448 x 1086, circa 2.3 MB.
  - `src/assets/mappe/golfo-marina-di-campo.png`: 1637 x 961, circa 2.5 MB.
- Build precedente:
  - `dist/assets/spiaggia-ombrellone-Bld_exln.png`: circa 2.3 MB.
  - `dist/assets/golfo-marina-di-campo-DHlbIfdf.png`: circa 2.5 MB.
  - Totale immagini principali nella build: circa 4.8 MB.
- Immagini non above-the-fold: alcune erano gia' `loading="lazy"`, ma mancavano `width`, `height`, `decoding` e la preview admin non era lazy.
- Dipendenze: nessuna libreria runtime inutilizzata evidente. Il progetto usa solo React, React DOM, Vite e Tailwind/PostCSS.

## Dopo

- Rimosso riferimento a host temporaneo; `allowedHosts` ora usa `numero5-beach-system.vercel.app`.
- Convertite le due immagini realmente importate dalla app in WebP:
  - `src/assets/foto-giornaliere/spiaggia-ombrellone.webp`: 1280 x 960, 133 KB sorgente.
  - `src/assets/mappe/golfo-marina-di-campo.webp`: 1200 x 704, 155 KB sorgente.
- Build ottimizzata:
  - `dist/assets/spiaggia-ombrellone-DsbI2aV0.webp`: 135.96 KB.
  - `dist/assets/golfo-marina-di-campo-DDqfTZla.webp`: 158.59 KB.
  - Totale immagini principali nella build: circa 294.55 KB.
- Risparmio immagini principali stimato: da circa 4.8 MB a circa 295 KB, cioe' circa -94%.
- Hero image:
  - aggiunti `width`, `height`, `decoding="async"` e `fetchPriority="high"`.
- Immagini non above-the-fold:
  - aggiunti `loading="lazy"`, `decoding="async"`, `width` e `height` dove mancavano.
- Vercel:
  - aggiunti header cache per `/assets`, `/audio`, `/icons` e `manifest.json`.
  - gli asset hashed in `/assets` sono marcati `public, max-age=31536000, immutable`.
- Pulizia codice:
  - rimossi campi `title` non usati nella configurazione delle tracce audio.

## File modificati

- `src/data/today.js`
- `src/App.jsx`
- `vite.config.js`
- `vercel.json`
- `src/assets/foto-giornaliere/spiaggia-ombrellone.webp`
- `src/assets/mappe/golfo-marina-di-campo.webp`
- `PERFORMANCE_REPORT.md`

## Note

- Le vecchie immagini PNG non importate nella build sono state lasciate nella cartella sorgente per non eliminare materiale fotografico senza conferma.
- La cartella `stampa/` resta fuori dal commit della web app: contiene asset operativi per flyer/QR, non necessari al deploy Vercel.
- Il layout e i testi visibili non sono stati modificati.

## Verifica post-deploy

- `https://numero5-beach-system.vercel.app/assets/spiaggia-ombrellone-DsbI2aV0.webp`: HTTP 200, `Cache-Control: public, max-age=31536000, immutable`.
- `https://numero5-beach-system.vercel.app/assets/golfo-marina-di-campo-DDqfTZla.webp`: HTTP 200, `Cache-Control: public, max-age=31536000, immutable`.
- `https://numero5-beach-system.vercel.app/audio/Cerulean_Tides.mp3`: HTTP 200, `Cache-Control: public, max-age=31536000, immutable`.
