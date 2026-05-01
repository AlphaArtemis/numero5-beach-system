import heroBeachPhoto from "../assets/foto-giornaliere/spiaggia-ombrellone.webp";
import windMapPhoto from "../assets/mappe/golfo-marina-di-campo.webp";

// Modifica questo file ogni mattina per aggiornare app, foto e numero WhatsApp.
export const today = {
  whatsappNumber: "393358060119",
  heroImage: heroBeachPhoto,
  dailySeaPhoto: heroBeachPhoto,
  windMapImage: windMapPhoto,
  conditionText: "Foto aggiornata alle 08:00",
  wind: {
    name: "Maestrale leggero",
    direction: "NO",
    note: "Mare pulito e stabile vicino riva",
  },
  weather: {
    summary: "Sole, visibilita' buona e mare tranquillo al mattino",
  },
  availability: {
    umbrellas: "Ombrelloni disponibili",
    sunbeds: "Lettini disponibili",
    note: "Conferma rapida via WhatsApp",
  },
  meteoWind: {
    direction: "NO",
    intensity: "8 nodi",
    updatedAt: "08:00",
    sourceUrl: "https://www.meteoam.it/",
  },
  status: "green-plus",
};

export const windLegend = [
  {
    key: "green-plus",
    label: "Verde +",
    meaning: "ottima scelta",
  },
  {
    key: "green-minus",
    label: "Verde -",
    meaning: "buona alternativa",
  },
  {
    key: "red-minus",
    label: "Rosso -",
    meaning: "un po' mosso",
  },
  {
    key: "red-plus",
    label: "Rosso +",
    meaning: "meglio evitare",
  },
];
