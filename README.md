# Numero 5 Beach System

Web app mobile-first per noleggio ombrelloni e lettini a Marina di Campo, con richiesta di prenotazione via WhatsApp e aggiornamento manuale delle condizioni mare/vento.

## Avvio progetto

```bash
npm install
npm run dev
```

Apri l'indirizzo mostrato dal terminale, di solito `http://localhost:5173`.

## Foto del mattino dalla app

Dentro la web app apri l'indirizzo con `?admin=1`, per esempio:

```text
http://localhost:5173/?admin=1
```

Compare la sezione `Area gestione mattina`.

Da li puoi aggiornare:

- foto spiaggia di oggi
- testo condizioni
- vento
- direzione
- meteo sintetico
- disponibilita' ombrelloni
- disponibilita' lettini
- vento Meteo Militare
- nota mare
- stato verde/rosso
- numero WhatsApp

Premi `Salva aggiornamento` per mantenere i dati nel browser.

Nota V1: senza backend, database o storage online, questo salvataggio resta nel browser/dispositivo usato per aggiornare. Per far vedere automaticamente la foto nuova a tutti i clienti serve uno step successivo: caricamento su hosting/storage oppure un piccolo pannello admin collegato a un servizio online.

## QR code per flyer

Il QR code deve puntare all'URL pubblico della web app pubblicata, non a `localhost`.

Flusso consigliato:

1. Pubblicare la web app su Vercel, Netlify o dominio dedicato.
2. Decidere l'URL finale, per esempio `https://numero5beach.it`.
3. Generare il QR code in PNG/SVG con quell'URL.
4. Inserire il QR nei flyer per hotel, reception e punti informativi.

Quando l'URL finale e' pronto, il QR puo' essere generato in pochi secondi.

## Deploy consigliato

Vercel e' la scelta consigliata per questa V1.

Configurazione gia' pronta:

- framework: Vite / React
- install command: `npm install`
- build command: `npm run build`
- output directory: `dist`
- file Vercel: `vercel.json`

Comandi utili:

```bash
npm run build
```

Il progetto e' statico: non richiede backend, database o pagamento.

Procedura consigliata da interfaccia Vercel:

1. Crea una repository GitHub con questa cartella.
2. Vai su Vercel e scegli `Add New...` > `Project`.
3. Importa la repository GitHub del progetto.
4. Controlla che Vercel legga:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
5. Premi `Deploy`.
6. Apri la URL pubblica da telefono.
7. Testa:
   - apertura pagina in 4G/5G
   - pulsante WhatsApp
   - mappa Google Maps
   - leggibilita' sotto sole
8. Solo dopo conferma usa quella URL per generare il QR.

Procedura alternativa da terminale, se usi Vercel CLI:

```bash
npm run build
npx vercel
```

Per il deploy finale di produzione:

```bash
npx vercel --prod
```

URL finale QR: da confermare dopo il deploy pubblico.

## Dati vento Meteo Militare

La V1 mostra solo il vento con fonte `Servizio Meteorologico dell'Aeronautica Militare`.

Per ora i dati sono modificabili manualmente dalla sezione `Area gestione mattina` o in `src/data/today.js`. Per un aggiornamento automatico servira' verificare una fonte tecnica ufficiale utilizzabile via API o un piccolo backend che raccolga il dato e lo pubblichi nell'app.

Direzioni supportate per la freccia sulla mappa:

- `N`
- `NE`
- `E`
- `SE`
- `S`
- `SO`
- `O`
- `NO`

Sono supportati anche nomi comuni come `Maestrale`, `Scirocco`, `Libeccio`, `Ponente` e `Grecale`.

## Base multilingua

La struttura per le lingue e' pronta in:

```js
src/data/translations.js
```

Per ora l'app usa italiano (`it`) come lingua di default. Sono gia' presenti chiavi base per `it`, `en` e `de`, cosi in futuro si puo' aggiungere un selettore lingua senza riscrivere i testi principali.

## Base PWA

La web app e' predisposta per essere installabile su telefono:

- `public/manifest.json`
- `public/icons/icon-192.svg`
- `public/icons/icon-512.svg`

Nome app: `Numero 5 Beach System`  
Short name: `Numero 5`  
Theme color: blu mare `#0a6fa3`

## Colonna sonora

La traccia audio strumentale e' in:

```text
public/audio/Cerulean_Tides.mp3
```

La musica non parte automaticamente: il cliente deve toccare `MUSIC ON`. Questo mantiene la web app elegante e compatibile con i browser mobile.

## Dove cambiare foto nei file

Le immagini sostituibili sono in:

- `src/assets/foto-giornaliere/spiaggia-ombrellone.png`
- `src/assets/foto-giornaliere/elba-dall-aereo.png`
- `src/assets/foto-giornaliere/tramonto-senza-scritte.png`
- `src/assets/mappe/golfo-marina-di-campo.png`

Per cambiare una foto, aggiungi il nuovo file nella cartella giusta e aggiorna gli import in:

```js
src/data/today.js
```

Esempio:

```js
import todaySeaPhoto from "../assets/foto-giornaliere/mare-2026-06-01.png";
```

## Dove cambiare numero WhatsApp nei file

Apri `src/data/today.js` e modifica:

```js
whatsappNumber: "393358060119",
```

Usa il prefisso internazionale senza `+`, spazi o trattini.

## Aggiornamento manuale condizioni nei file

Sempre in `src/data/today.js` puoi cambiare:

- `dailySeaPhoto`: foto del mare aggiornata al mattino
- `conditionText`: testo breve, per esempio `Foto aggiornata alle 08:00`
- `wind.name`: vento del giorno
- `wind.direction`: direzione
- `wind.note`: nota sintetica
- `weather.summary`: meteo sintetico
- `availability.umbrellas`: disponibilita' ombrelloni
- `availability.sunbeds`: disponibilita' lettini
- `availability.note`: nota disponibilita'
- `meteoWind.direction`: direzione vento Meteo Militare
- `meteoWind.intensity`: intensita' vento
- `meteoWind.updatedAt`: ora aggiornamento
- `meteoWind.sourceUrl`: link fonte
- `status`: uno tra `green-plus`, `green-minus`, `red-minus`, `red-plus`

## Prossimi step

- Collegare una vera foto giornaliera scattata dallo stabilimento.
- Aggiungere logo ufficiale in `src/assets/logo`.
- Sostituire le icone PWA placeholder con icone ufficiali.
- Disegnare overlay con frecce verdi/rosse sulla mappa vento.
- Preparare un QR code che punti alla web app pubblicata.
- Pubblicare su Vercel, Netlify o hosting statico.
