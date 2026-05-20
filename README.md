# Numero 5 Beach System

Web app mobile-first per il noleggio ombrelloni e lettini a Marina di Campo, con richiesta via WhatsApp, vento automatico e foto del giorno aggiornabile dal gestore anche da tablet o cellulare.

## Diagnosi progetto

Stack rilevato:

- `React 18`
- `Vite 6`
- `Tailwind CSS`
- deploy statico su `Vercel`
- API serverless in cartella `api/`

Persistenza foto scelta:

- `Vercel Blob` per salvare online la foto del giorno
- route serverless protette da PIN admin
- fallback visivo sui dati locali di `src/data/today.js` se non esiste ancora una foto pubblicata

## Avvio progetto

```bash
npm install
npm run dev
```

Apri l'indirizzo mostrato dal terminale, di solito `http://localhost:5173`.

Nota importante:

- `npm run dev` avvia bene il frontend Vite
- le route `api/` e l'upload Blob funzionano davvero in ambiente Vercel
- per test locali completi delle API puoi usare `vercel dev`, se desideri una simulazione piu' fedele del deploy

## Foto del Giorno da tablet o cellulare

Per entrare in modalita' admin apri la web app con:

```text
https://numero5-beach-system.vercel.app/?admin=true
```

oppure in locale:

```text
http://localhost:5173/?admin=true
```

### Flusso admin

1. Apri il sito con `?admin=true`
2. Tocca la card `Foto del Giorno`
3. Inserisci il `PIN admin`
4. Tocca `Scatta o scegli dal dispositivo`
5. Seleziona o scatta la foto
6. Controlla l'anteprima compressa
7. Tocca `Conferma`

Risultato:

- la foto viene compressa lato client
- viene caricata su `Vercel Blob`
- diventa pubblica per tutti i visitatori del sito

### Compressione immagine

Prima dell'upload la foto viene:

- ridimensionata con lato massimo a circa `1600px`
- convertita in `JPEG`
- compressa con qualita' `0.82`

Questo riduce peso e tempi di caricamento senza rovinare la resa sul sito.

## Admin e sicurezza

La gestione foto non e' visibile ai visitatori normali.

La UI admin compare solo quando l'URL contiene `?admin=true` o `?admin=1`.

Protezione implementata:

- verifica PIN tramite route `api/admin-auth.js`
- sessione admin salvata in `localStorage`
- upload protetto via header `x-admin-pin`

Limite noto:

- e' una protezione leggera, adatta a una V1 senza sistema utenti completo
- per un livello piu' forte in futuro si puo' aggiungere autenticazione server-side vera

## Variabili ambiente richieste

Su Vercel aggiungi queste env var:

- `ADMIN_PIN`
- `BLOB_READ_WRITE_TOKEN`

Puoi partire dal file:

```text
.env.example
```

Esempio locale:

```bash
ADMIN_PIN=1234
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
```

Non inserire mai il token vero nel repository.

## Deploy Vercel

Configurazione gia' pronta:

- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: `dist`
- file config: `vercel.json`

### Procedura da interfaccia

1. Importa il repository su Vercel
2. Apri `Settings > Environment Variables`
3. Aggiungi:
   - `ADMIN_PIN`
   - `BLOB_READ_WRITE_TOKEN`
4. Avvia il deploy
5. Apri la URL pubblica
6. Prova l'upload da telefono con `?admin=true`

### Procedura da terminale

```bash
npm run build
npx vercel
```

Deploy produzione:

```bash
npx vercel --prod
```

## Vento automatico

La web app legge il vento automatico da `Open-Meteo` e usa i dati live per:

- direzione vento
- intensita' in nodi
- orario aggiornamento
- rotazione freccia sulla mappa del golfo

Se il dato automatico non e' disponibile, l'app usa il fallback manuale in `src/data/today.js`.

## Dati modificabili a mano

Se vuoi aggiornare manualmente i contenuti base, usa:

```text
src/data/today.js
```

Campi principali:

- `whatsappNumber`
- `heroImage`
- `dailySeaPhoto`
- `windMapImage`
- `conditionText`
- `wind.name`
- `wind.direction`
- `wind.note`
- `weather.summary`
- `availability.umbrellas`
- `availability.sunbeds`
- `availability.note`
- `meteoWind.direction`
- `meteoWind.intensity`
- `meteoWind.updatedAt`
- `meteoWind.sourceUrl`
- `status`

## File principali

Frontend:

- `src/App.jsx`
- `src/data/today.js`
- `src/data/translations.js`
- `src/index.css`

Upload foto:

- `src/utils/imageCompression.js`
- `src/services/photoService.js`
- `api/admin-auth.js`
- `api/photo-of-day.js`
- `api/photo-of-day-upload.js`

## QR code

Il QR deve sempre puntare alla URL pubblica stabile della web app, non a `localhost` e non a URL temporanee.

URL pubblica attuale:

```text
https://numero5-beach-system.vercel.app/
```

## Base multilingua

La struttura traduzioni e' pronta in:

```text
src/data/translations.js
```

Lingua attuale di default: `it`

Lingue predisposte:

- `it`
- `en`
- `de`

## Base PWA

File presenti:

- `public/manifest.json`
- `public/icons/icon-192.svg`
- `public/icons/icon-512.svg`

Nome app: `Numero 5 Beach System`  
Short name: `Numero 5`

## Colonna sonora

File audio:

- `public/audio/Cerulean_Tides.mp3`
- `public/audio/White_Stone_Terrace.mp3`
- `public/audio/Salt_on_the_Balcony.mp3`

La musica parte solo dopo interazione utente tramite `MUSIC ON`, come richiesto dai browser mobile.

## Prossimi step

- aggiungere logout admin esplicito
- mostrare mini storico foto caricate
- collegare eventuale descrizione foto del giorno modificabile da admin
- migliorare la protezione admin con auth vera se il progetto cresce
