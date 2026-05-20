import { useEffect, useMemo, useRef, useState } from "react";
import { today, windLegend } from "./data/today";
import { translations } from "./data/translations";
import { compressImageFile } from "./utils/imageCompression";
import { fetchPhotoOfTheDay, uploadPhotoOfTheDay, verifyAdminPin } from "./services/photoService";

const STORAGE_KEY = "numero5-morning-update";
const ADMIN_SESSION_KEY = "numero5-photo-admin-session";
const ADMIN_PIN_KEY = "numero5-photo-admin-pin";
const DEFAULT_LOCALE = "it";
const LOCATION_LATITUDE = 42.750225;
const LOCATION_LONGITUDE = 10.24115;
const LOCATION_COORDS = `${LOCATION_LATITUDE},${LOCATION_LONGITUDE}`;
const GOOGLE_MAP_EMBED_URL = `https://www.google.com/maps?q=${LOCATION_COORDS}&z=18&output=embed`;
const GOOGLE_MAP_DIRECTIONS_URL = `https://www.google.com/maps/search/?api=1&query=${LOCATION_COORDS}`;
const OPEN_METEO_URL = `https://api.open-meteo.com/v1/forecast?latitude=${LOCATION_LATITUDE}&longitude=${LOCATION_LONGITUDE}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code&wind_speed_unit=kn&timezone=Europe%2FRome`;
const OPEN_METEO_SOURCE_URL = "https://open-meteo.com/";
const METEO_REFRESH_MS = 60 * 60 * 1000;
const SOUNDTRACK_TRACKS = [
  {
    label: "Cerulean",
    src: "/audio/Cerulean_Tides.mp3",
  },
  {
    label: "Stone",
    src: "/audio/White_Stone_Terrace.mp3",
  },
  {
    label: "Salt",
    src: "/audio/Salt_on_the_Balcony.mp3",
  },
];

const statusStyles = {
  "green-plus": {
    label: "Verde +",
    summary: "Ottima scelta",
    className: "border-[#bac88f] bg-gradient-to-r from-[#fffdf2] to-[#f3f0df] text-[#26301e]",
    dotClassName: "bg-gradient-to-br from-[#a8c46e] to-[#5f8f42]",
  },
  "green-minus": {
    label: "Verde -",
    summary: "Buona alternativa",
    className: "border-[#c5cca4] bg-gradient-to-r from-[#fffdf2] to-[#f6f1e2] text-[#303420]",
    dotClassName: "bg-gradient-to-br from-[#b5c77d] to-[#71844c]",
  },
  "red-minus": {
    label: "Rosso -",
    summary: "Un po' mosso",
    className: "border-orange-200 bg-gradient-to-r from-orange-50 to-rose-50 text-orange-950",
    dotClassName: "bg-gradient-to-br from-orange-400 to-rose-500",
  },
  "red-plus": {
    label: "Rosso +",
    summary: "Meglio evitare",
    className: "border-rose-200 bg-gradient-to-r from-rose-50 to-red-50 text-rose-950",
    dotClassName: "bg-gradient-to-br from-orange-400 to-red-500",
  },
};

const iconToneClasses = {
  navy: "bg-[#1f2933] text-white",
  orange: "bg-[#ff8c00] text-white",
  green: "bg-gradient-to-br from-[#d8b06a] to-[#9a6a2e] text-white",
  coral: "bg-gradient-to-br from-[#ff8c00] to-[#ef4f5e] text-white",
};

const initialForm = {
  name: "",
  date: "",
  umbrellas: "1",
  sunbeds: "2",
};

function getTodayInputValue() {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
}

function normalizeWhatsAppNumber(number) {
  return number.replace(/\D/g, "");
}

function formatWhatsAppDisplay(number) {
  const digits = normalizeWhatsAppNumber(number);

  if (digits.startsWith("39") && digits.length >= 12) {
    const localNumber = digits.slice(2);
    return `+39 ${localNumber.slice(0, 3)} ${localNumber.slice(3, 6)} ${localNumber.slice(6)}`;
  }

  return digits ? `+${digits}` : "WhatsApp";
}

function getAvailabilityText(availability = {}) {
  return [availability.umbrellas, availability.sunbeds].filter(Boolean).join(" · ");
}

function getWindRotation(direction = "") {
  const normalizedDirection = direction
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  const directionAngles = {
    N: 0,
    NORD: 0,
    NNE: 22.5,
    NE: 45,
    NORDEST: 45,
    GRECALE: 45,
    ENE: 67.5,
    E: 90,
    EST: 90,
    ESE: 112.5,
    SE: 135,
    SUDEST: 135,
    SCIROCCO: 135,
    SSE: 157.5,
    S: 180,
    SUD: 180,
    SSO: 202.5,
    SSW: 202.5,
    SO: 225,
    SW: 225,
    SUDOVEST: 225,
    LIBECCIO: 225,
    OSO: 247.5,
    WSW: 247.5,
    O: 270,
    W: 270,
    OVEST: 270,
    PONENTE: 270,
    ONO: 292.5,
    WNW: 292.5,
    NO: 315,
    NW: 315,
    NORDOVEST: 315,
    MAESTRALE: 315,
    NNO: 337.5,
    NNW: 337.5,
  };

  return directionAngles[normalizedDirection] ?? 0;
}

function getCompassDirectionFromDegrees(degrees) {
  if (!Number.isFinite(degrees)) return "N";

  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
  const normalizedDegrees = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalizedDegrees / 22.5) % directions.length;
  return directions[index];
}

function formatKnots(value) {
  if (!Number.isFinite(value)) return "";
  return `${Math.round(value)} nodi`;
}

function formatWeatherTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDisplayDate(value) {
  if (!value) {
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date());
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDisplayDate();

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getWeatherSummaryFromCode(code) {
  const weatherCode = Number(code);

  if ([0].includes(weatherCode)) return "Sereno";
  if ([1, 2].includes(weatherCode)) return "Poco nuvoloso";
  if ([3].includes(weatherCode)) return "Nuvoloso";
  if ([45, 48].includes(weatherCode)) return "Nebbia";
  if ([51, 53, 55, 56, 57].includes(weatherCode)) return "Pioviggine";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) return "Pioggia";
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return "Neve";
  if ([95, 96, 99].includes(weatherCode)) return "Temporale";

  return "Meteo aggiornato automaticamente";
}

function parseOpenMeteoWind(data) {
  const current = data?.current;
  const degrees = Number(current?.wind_direction_10m);
  const windSpeed = Number(current?.wind_speed_10m);
  const gusts = Number(current?.wind_gusts_10m);

  if (!current || !Number.isFinite(degrees) || !Number.isFinite(windSpeed)) {
    throw new Error("Dati vento automatici non disponibili.");
  }

  return {
    direction: getCompassDirectionFromDegrees(degrees),
    directionDegrees: degrees,
    intensity: formatKnots(windSpeed),
    gusts: Number.isFinite(gusts) ? formatKnots(gusts) : "",
    updatedAt: formatWeatherTime(current.time) || "ora",
    weatherSummary: getWeatherSummaryFromCode(current.weather_code),
    sourceLabel: "Dati automatici",
    sourceUrl: OPEN_METEO_SOURCE_URL,
    isAutomatic: true,
  };
}

function mergeTodayData(overrides = {}) {
  return {
    ...today,
    ...overrides,
    wind: {
      ...today.wind,
      ...(overrides.wind ?? {}),
    },
    weather: {
      ...today.weather,
      ...(overrides.weather ?? {}),
    },
    availability: {
      ...today.availability,
      ...(overrides.availability ?? {}),
    },
    meteoWind: {
      ...today.meteoWind,
      ...(overrides.meteoWind ?? {}),
    },
  };
}

function loadMorningUpdate() {
  if (typeof window === "undefined") {
    return mergeTodayData();
  }

  try {
    const savedData = window.localStorage.getItem(STORAGE_KEY);
    return savedData ? mergeTodayData(JSON.parse(savedData)) : mergeTodayData();
  } catch {
    return mergeTodayData();
  }
}

function resizePhotoForStorage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxWidth = 1600;
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Impossibile preparare la foto."));
              return;
            }

            const blobReader = new FileReader();
            blobReader.onload = () => resolve(blobReader.result);
            blobReader.onerror = () => reject(new Error("Impossibile leggere la foto."));
            blobReader.readAsDataURL(blob);
          },
          "image/jpeg",
          0.86,
        );
      };

      image.onerror = () => reject(new Error("Formato immagine non valido."));
      image.src = reader.result;
    };

    reader.onerror = () => reject(new Error("Impossibile caricare la foto."));
    reader.readAsDataURL(file);
  });
}

function LogoMark({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 96 96" aria-hidden="true">
      <path d="M48 32v42" fill="none" stroke="#1f2933" strokeLinecap="round" strokeWidth="5" />
      <path d="M16 39c7-16 19-24 32-24s25 8 32 24H16Z" fill="#ff8c00" />
      <path d="M16 39c8-6 16-6 24 0 5-6 11-6 16 0 8-6 16-6 24 0" fill="#d66f00" opacity="0.72" />
      <path d="M16 39c7-16 19-24 32-24s25 8 32 24" fill="none" stroke="#1f2933" strokeLinecap="round" strokeWidth="4" />
      <path d="M48 15c-6 7-9 15-8 24M48 15c6 7 9 15 8 24" fill="none" stroke="#1f2933" strokeLinecap="round" strokeWidth="3.5" />
      <path d="M48 74c0 7 7 10 13 5" fill="none" stroke="#1f2933" strokeLinecap="round" strokeWidth="5" />
    </svg>
  );
}

function IconCamera({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" aria-hidden="true">
      <path d="M4 8.5h3l1.5-2h7l1.5 2h3v10H4v-10Z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  );
}

function IconWind({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" aria-hidden="true">
      <path d="M3 8h11.5a2.5 2.5 0 1 0-2.2-3.7" />
      <path d="M3 12h16a2.5 2.5 0 1 1-2.2 3.7" />
      <path d="M3 16h8" />
    </svg>
  );
}

function IconWhatsApp({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" aria-hidden="true">
      <path d="M5.5 19.2 6.7 16A7.1 7.1 0 1 1 9 18.2l-3.5 1Z" />
      <path d="M9.8 8.7c.3 3 1.8 4.7 4.8 5.5l1.4-1.4" />
      <path d="M9.8 8.7 8.6 10" />
    </svg>
  );
}

function IconHeart({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 20.4 10.9 19.4C5.8 14.9 2.5 11.9 2.5 8.2 2.5 5.3 4.8 3 7.7 3c1.7 0 3.3.8 4.3 2 1-1.2 2.6-2 4.3-2 2.9 0 5.2 2.3 5.2 5.2 0 3.7-3.3 6.7-8.4 11.2L12 20.4Z" />
    </svg>
  );
}

function WaveDivider() {
  return (
    <div className="-mt-px bg-[#fff4e5]" aria-hidden="true">
      <svg className="block h-16 w-full sm:h-24" viewBox="0 0 1440 140" preserveAspectRatio="none">
        <path
          d="M0 74 60 66.3C120 58.7 240 43.3 360 48.5 480 53.7 600 79.3 720 85.8 840 92.3 960 79.7 1080 65.2 1200 50.7 1320 34.3 1380 26.2L1440 18v122H0V74Z"
          fill="#efe1cf"
        />
        <path
          d="M0 98 80 91.8C160 85.7 320 73.3 480 78.2 640 83 800 105 960 100.3 1120 95.7 1280 64.3 1360 48.7L1440 33v107H0V98Z"
          fill="#fff8ed"
          opacity="0.82"
        />
      </svg>
    </div>
  );
}

function TodayConditionsCard({ beachData, currentStatus, quickWhatsAppUrl, t, weatherSummary, windData, photoUrl }) {
  const availabilityText = getAvailabilityText(beachData.availability);

  return (
    <aside className="today-hero-card">
      <div className="grid grid-cols-[86px_minmax(0,1fr)] gap-3 sm:grid-cols-[0.42fr_0.58fr] sm:gap-4 lg:block">
        <div className="relative overflow-hidden rounded-2xl bg-[#efe1cf]">
          <img
            className="aspect-square h-full w-full object-cover sm:aspect-[4/3] lg:aspect-[16/9]"
            src={photoUrl}
            alt="Foto del mare di oggi"
            width="1280"
            height="960"
            decoding="async"
          />
          <span className={`absolute left-3 top-3 hidden rounded-full border px-3 py-1 text-xs font-black shadow-soft sm:inline-flex sm:items-center ${currentStatus.className}`}>
            <span className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-full ${currentStatus.dotClassName}`} />
            {currentStatus.label}
          </span>
        </div>

        <div className="flex flex-col justify-between">
          <div>
            <p className="text-xs font-black uppercase text-[#e97900] sm:text-sm">{t.todayCard.kicker}</p>
            <h2 className="mt-1 text-xl font-black leading-tight text-beach-ink sm:text-3xl">{t.todayCard.title}</h2>
            <p className="mt-1 text-sm font-black leading-5 text-beach-ink sm:mt-2 sm:text-base">{beachData.conditionText}</p>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-800 sm:text-sm">
              {t.todayCard.weather}: {weatherSummary}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3">
              <div className="rounded-2xl bg-[#1f2933] p-2 text-white sm:p-3">
                <p className="text-[0.65rem] font-black uppercase text-white/80 sm:text-xs">{t.todayCard.wind}</p>
                <p className="mt-1 text-lg font-black sm:text-xl">{windData.direction}</p>
                <p className="text-xs font-bold text-white/80 sm:text-sm">{windData.intensity}</p>
              </div>
              <div className={`rounded-2xl border p-2 sm:p-3 ${currentStatus.className}`}>
                <p className="text-[0.65rem] font-black uppercase opacity-80 sm:text-xs">{t.todayCard.status}</p>
                <p className="mt-1 text-sm font-black leading-4 sm:text-lg sm:leading-tight">{currentStatus.summary}</p>
              </div>
            </div>

            <div className="mt-2 rounded-2xl border border-[#ecd9bf] bg-[#fff7eb] p-2">
              <p className="text-[0.65rem] font-black uppercase text-[#7a4d18] sm:text-xs">{t.todayCard.availability}</p>
              <p className="mt-1 text-xs font-black leading-4 text-beach-ink sm:text-sm">{availabilityText}</p>
              <p className="mt-1 text-xs font-bold leading-4 text-slate-800 sm:text-sm">{beachData.availability.note}</p>
            </div>

            <p className="mt-2 text-xs font-bold text-slate-800 sm:mt-3 sm:text-sm">
              {windData.isAutomatic ? "Aggiornato automaticamente alle" : t.todayCard.updatedAt} {windData.updatedAt}
            </p>
            <p className="mt-1 text-xs font-black text-beach-ink sm:text-sm">
              {t.todayCard.phone}: {formatWhatsAppDisplay(beachData.whatsappNumber)}
            </p>
          </div>

          <a
            className="premium-cta mt-3 min-h-[48px] w-full px-3 text-sm sm:mt-4 sm:min-h-[56px] sm:text-lg"
            href={quickWhatsAppUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t.todayCard.whatsappCta}
          </a>
        </div>
      </div>
    </aside>
  );
}

function PhotoOfDaySection({
  altText,
  dateLabel,
  description,
  imageUrl,
  isAdminAuthenticated,
  isAdminMode,
  isUploading,
  onChangePhoto,
  onOpenAdmin,
}) {
  const canManagePhoto = isAdminMode && isAdminAuthenticated;

  return (
    <article className="premium-card overflow-hidden">
      <button
        className={`group relative block w-full text-left ${isAdminMode ? "cursor-pointer" : "cursor-default"}`}
        type="button"
        onClick={canManagePhoto ? onChangePhoto : isAdminMode ? onOpenAdmin : undefined}
      >
        {imageUrl ? (
          <img
            className="aspect-[4/3] w-full object-cover sm:aspect-[16/9]"
            src={imageUrl}
            alt={altText}
            width="1280"
            height="960"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="grid aspect-[4/3] w-full place-items-center bg-[#efe1cf] px-6 text-center sm:aspect-[16/9]">
            <div>
              <p className="text-lg font-black text-beach-ink">Foto del Giorno</p>
              <p className="mt-2 text-sm font-bold text-slate-700">Nessuna immagine disponibile al momento.</p>
            </div>
          </div>
        )}

        {canManagePhoto ? (
          <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3 rounded-2xl bg-[#1f2933]/82 px-4 py-3 text-white shadow-soft backdrop-blur">
            <div>
              <p className="text-sm font-black uppercase text-orange-200">Foto del Giorno</p>
              <p className="text-xs font-bold text-white/80">{dateLabel}</p>
            </div>
            <span className="inline-flex min-h-[46px] items-center justify-center rounded-2xl bg-white/92 px-4 py-2 text-sm font-black text-beach-ink">
              {isUploading ? "Caricamento..." : "Cambia foto"}
            </span>
          </div>
        ) : null}
      </button>

      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-kicker">Foto del Giorno</p>
            <h3 className="mt-2 text-2xl font-black text-beach-ink">Scatto di oggi</h3>
          </div>
          <p className="rounded-2xl border border-[#ecd9bf] bg-[#fff7eb] px-4 py-2 text-sm font-black text-[#7a4d18]">{dateLabel}</p>
        </div>
        <p className="mt-4 text-base font-bold leading-7 text-slate-800">{description}</p>
      </div>
    </article>
  );
}

function App() {
  const [form, setForm] = useState(initialForm);
  const [beachData, setBeachData] = useState(loadMorningUpdate);
  const [saveMessage, setSaveMessage] = useState("");
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicMessage, setMusicMessage] = useState("");
  const [automaticWind, setAutomaticWind] = useState(null);
  const [automaticWindError, setAutomaticWindError] = useState("");
  const [photoOfDayUrl, setPhotoOfDayUrl] = useState(null);
  const [photoOfDayUploadedAt, setPhotoOfDayUploadedAt] = useState(null);
  const [photoUploadMessage, setPhotoUploadMessage] = useState("");
  const [photoUploadState, setPhotoUploadState] = useState("idle");
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [isPhotoManagerOpen, setIsPhotoManagerOpen] = useState(false);
  const [isAdminVerifying, setIsAdminVerifying] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState("");
  const [publicPhotoError, setPublicPhotoError] = useState("");
  const [adminPin, setAdminPin] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(ADMIN_PIN_KEY) || "";
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(ADMIN_SESSION_KEY) === "true";
  });
  const soundtrackRef = useRef(null);
  const photoInputRef = useRef(null);
  const photoSectionRef = useRef(null);
  const t = translations[DEFAULT_LOCALE];
  const activeTrack = SOUNDTRACK_TRACKS[activeTrackIndex] ?? SOUNDTRACK_TRACKS[0];
  const currentStatus = statusStyles[beachData.status] ?? statusStyles["green-minus"];
  const availabilityText = getAvailabilityText(beachData.availability);
  const isGreenStatus = beachData.status?.startsWith("green");
  const whatsappDisplay = formatWhatsAppDisplay(beachData.whatsappNumber);
  const fallbackWind = {
    direction: beachData.meteoWind.direction,
    directionDegrees: getWindRotation(beachData.meteoWind.direction),
    intensity: beachData.meteoWind.intensity,
    gusts: "",
    updatedAt: beachData.meteoWind.updatedAt,
    weatherSummary: beachData.weather.summary,
    sourceLabel: "Dato manuale",
    sourceUrl: beachData.meteoWind.sourceUrl,
    isAutomatic: false,
  };
  const displayedWind = automaticWind ?? fallbackWind;
  const weatherSummary = automaticWind?.weatherSummary ?? beachData.weather.summary;
  const windRotation = displayedWind.directionDegrees;
  const displayedDailyPhoto = photoOfDayUrl ?? beachData.dailySeaPhoto;
  const displayedPhotoDate = formatDisplayDate(photoOfDayUploadedAt);
  const quickWhatsAppText = encodeURIComponent(
    [
      "Ciao Noleggio Numero 5, vorrei prenotare attrezzatura da spiaggia.",
      "",
      "Nome:",
      "Data:",
      "Numero ombrelloni:",
      "Numero lettini:",
    ].join("\n"),
  );
  const quickWhatsAppUrl = `https://wa.me/${normalizeWhatsAppNumber(beachData.whatsappNumber)}?text=${quickWhatsAppText}`;
  const windArrowStyle = {
    "--wind-arrow-rotation": `${windRotation}deg`,
    "--wind-arrow-from": isGreenStatus ? "#34d399" : "#ff8c00",
    "--wind-arrow-to": isGreenStatus ? "#0f766e" : "#ef4f5e",
  };

  const minDate = useMemo(() => getTodayInputValue(), []);
  const showMorningAdmin = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.location.search.includes("admin=1") || window.location.hash === "#aggiorna";
  }, []);
  const isAdminMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.location.search.includes("admin=true") || window.location.search.includes("admin=1");
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadAutomaticWind() {
      try {
        const response = await fetch(OPEN_METEO_URL);

        if (!response.ok) {
          throw new Error("Meteo automatico non raggiungibile.");
        }

        const data = await response.json();
        const parsedWind = parseOpenMeteoWind(data);

        if (!isActive) return;
        setAutomaticWind(parsedWind);
        setAutomaticWindError("");
      } catch (error) {
        if (!isActive) return;
        setAutomaticWind(null);
        setAutomaticWindError(error.message || "Dati automatici non disponibili.");
      }
    }

    loadAutomaticWind();
    const refreshId = window.setInterval(loadAutomaticWind, METEO_REFRESH_MS);

    return () => {
      isActive = false;
      window.clearInterval(refreshId);
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadPublicPhoto() {
      try {
        const data = await fetchPhotoOfTheDay();
        if (!isActive) return;

        setPhotoOfDayUrl(data.photoUrl || null);
        setPhotoOfDayUploadedAt(data.uploadedAt || null);
        setPublicPhotoError(data.error || "");
      } catch (error) {
        if (!isActive) return;
        setPublicPhotoError(error.message || "Errore recupero foto pubblica.");
      }
    }

    loadPublicPhoto();

    return () => {
      isActive = false;
    };
  }, []);

  const featureHighlights = useMemo(
    () => [
      {
        title: t.highlights.photo,
        text: beachData.conditionText,
        icon: IconCamera,
        tone: "navy",
      },
      {
        title: t.highlights.wind,
        text: `${displayedWind.direction} · ${displayedWind.intensity}`,
        icon: IconWind,
        tone: isGreenStatus ? "green" : "coral",
      },
      {
        title: t.highlights.availability,
        text: availabilityText,
        icon: IconHeart,
        tone: isGreenStatus ? "green" : "coral",
      },
      {
        title: t.highlights.whatsapp,
        text: `Prenota con ${whatsappDisplay}`,
        icon: IconWhatsApp,
        tone: "orange",
      },
    ],
    [availabilityText, beachData.conditionText, displayedWind.direction, displayedWind.intensity, isGreenStatus, t, whatsappDisplay],
  );

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetPendingPhotoSelection() {
    setPendingPhoto((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return null;
    });

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }

  function closePhotoManager() {
    setIsPhotoManagerOpen(false);
    resetPendingPhotoSelection();
    setPhotoUploadMessage("");
    setPhotoUploadState("idle");
    setAdminPinInput("");
  }

  function clearPendingPhoto() {
    resetPendingPhotoSelection();
    setPhotoUploadMessage("");
    setPhotoUploadState("idle");
  }

  function openPhotoManager() {
    setIsPhotoManagerOpen(true);
    setPhotoUploadMessage("");
  }

  function openPhotoManagerFromAnywhere() {
    openPhotoManager();

    window.setTimeout(() => {
      photoSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 40);
  }

  function requestPhotoSelection() {
    setIsPhotoManagerOpen(true);
    photoInputRef.current?.click();
  }

  async function handlePhotoFileChange(event) {
    const [file] = event.target.files || [];
    if (!file) return;

    setPhotoUploadState("preparing");
    setPhotoUploadMessage("Preparazione immagine...");

    try {
      const compressedPhoto = await compressImageFile(file);

      setPendingPhoto((current) => {
        if (current?.previewUrl) {
          URL.revokeObjectURL(current.previewUrl);
        }

        return compressedPhoto;
      });
      setPhotoUploadState("ready");
      setPhotoUploadMessage("Anteprima pronta. Conferma per aggiornare.");
    } catch (error) {
      setPhotoUploadState("error");
      setPhotoUploadMessage(error.message || "Errore caricamento");
    }
  }

  async function confirmPhotoUpload() {
    if (!pendingPhoto) return;

    setPhotoUploadState("uploading");
    setPhotoUploadMessage("Caricamento in corso...");

    try {
      let effectivePin = adminPin;

      if (!effectivePin) {
        if (!adminPinInput.trim()) {
          throw new Error("Inserisci il PIN admin prima della conferma.");
        }

        setIsAdminVerifying(true);
        await verifyAdminPin(adminPinInput.trim());
        effectivePin = adminPinInput.trim();
        setAdminPin(effectivePin);
        setIsAdminAuthenticated(true);
        window.localStorage.setItem(ADMIN_SESSION_KEY, "true");
        window.localStorage.setItem(ADMIN_PIN_KEY, effectivePin);
      }

      const result = await uploadPhotoOfTheDay({
        blob: pendingPhoto.blob,
        fileName: pendingPhoto.fileName,
        pin: effectivePin,
      });

      setPhotoOfDayUrl(result.url);
      setPhotoOfDayUploadedAt(new Date().toISOString());
      setPublicPhotoError("");
      resetPendingPhotoSelection();
      setPhotoUploadState("success");
      setPhotoUploadMessage("Foto aggiornata correttamente");
    } catch (error) {
      setPhotoUploadState("error");
      setPhotoUploadMessage(error.message || "Errore durante il caricamento");
    } finally {
      setIsAdminVerifying(false);
    }
  }

  function buildWhatsAppMessage() {
    return [
      "Ciao Noleggio Numero 5, vorrei prenotare attrezzatura da spiaggia.",
      "",
      `Nome: ${form.name}`,
      `Data: ${form.date}`,
      `Numero ombrelloni: ${form.umbrellas}`,
      `Numero lettini: ${form.sunbeds}`,
    ].join("\n");
  }

  function handleSubmit(event) {
    event.preventDefault();
    const phoneNumber = normalizeWhatsAppNumber(beachData.whatsappNumber);
    const text = encodeURIComponent(buildWhatsAppMessage());
    window.open(`https://wa.me/${phoneNumber}?text=${text}`, "_blank", "noopener,noreferrer");
  }

  function updateMorningField(event) {
    const { name, value } = event.target;

    setBeachData((current) => {
      if (name.startsWith("wind.")) {
        const windKey = name.replace("wind.", "");
        return {
          ...current,
          wind: {
            ...current.wind,
            [windKey]: value,
          },
        };
      }

      if (name.startsWith("meteoWind.")) {
        const windKey = name.replace("meteoWind.", "");
        return {
          ...current,
          meteoWind: {
            ...current.meteoWind,
            [windKey]: value,
          },
        };
      }

      if (name.startsWith("weather.")) {
        const weatherKey = name.replace("weather.", "");
        return {
          ...current,
          weather: {
            ...current.weather,
            [weatherKey]: value,
          },
        };
      }

      if (name.startsWith("availability.")) {
        const availabilityKey = name.replace("availability.", "");
        return {
          ...current,
          availability: {
            ...current.availability,
            [availabilityKey]: value,
          },
        };
      }

      return {
        ...current,
        [name]: value,
      };
    });

    setSaveMessage("");
  }

  async function updateMorningPhoto(event) {
    const [file] = event.target.files;
    if (!file) return;

    try {
      const photoDataUrl = await resizePhotoForStorage(file);
      setBeachData((current) => ({
        ...current,
        dailySeaPhoto: photoDataUrl,
      }));
      setSaveMessage("Foto caricata. Salva per mantenerla.");
    } catch (error) {
      setSaveMessage(error.message);
    }
  }

  function saveMorningUpdate(event) {
    event.preventDefault();

    const dataToSave = {
      whatsappNumber: beachData.whatsappNumber,
      dailySeaPhoto: beachData.dailySeaPhoto,
      conditionText: beachData.conditionText,
      wind: beachData.wind,
      weather: beachData.weather,
      availability: beachData.availability,
      meteoWind: beachData.meteoWind,
      status: beachData.status,
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      setSaveMessage("Aggiornamento salvato.");
    } catch {
      setSaveMessage("La foto e' troppo pesante. Prova con un'immagine piu' leggera.");
    }
  }

  function resetMorningUpdate() {
    window.localStorage.removeItem(STORAGE_KEY);
    setBeachData(mergeTodayData());
    setSaveMessage("Dati iniziali ripristinati.");
  }

  function toggleSoundtrack() {
    const soundtrack = soundtrackRef.current;
    if (!soundtrack) return;

    if (!soundtrack.paused) {
      soundtrack.pause();
      setIsMusicPlaying(false);
      setMusicMessage("");
      return;
    }

    soundtrack.volume = 0.36;
    setMusicMessage("");

    soundtrack
      .play()
      .then(() => {
        setIsMusicPlaying(true);
      })
      .catch(() => {
        setIsMusicPlaying(false);
        setMusicMessage("Tocca il pulsante per attivare la musica.");
      });
  }

  function changeSoundtrack(event) {
    const nextTrackIndex = Number(event.target.value);
    const soundtrack = soundtrackRef.current;
    const shouldResume = Boolean(soundtrack && !soundtrack.paused);

    if (soundtrack) {
      soundtrack.pause();
      soundtrack.currentTime = 0;
    }

    setActiveTrackIndex(nextTrackIndex);
    setIsMusicPlaying(false);
    setMusicMessage("");

    if (!shouldResume) return;

    window.setTimeout(() => {
      const nextSoundtrack = soundtrackRef.current;
      if (!nextSoundtrack) return;

      nextSoundtrack.volume = 0.36;
      nextSoundtrack
        .play()
        .then(() => {
          setIsMusicPlaying(true);
        })
        .catch(() => {
          setIsMusicPlaying(false);
          setMusicMessage("Tocca MUSIC ON per cambiare traccia.");
        });
    }, 60);
  }

  function renderMusicButton(extraClassName = "") {
    return (
      <button
        aria-label={isMusicPlaying ? "Ferma la musica" : "Avvia la musica"}
        aria-pressed={isMusicPlaying}
        className={`inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-white/80 px-4 py-2 text-sm font-black text-white shadow-soft backdrop-blur transition duration-300 hover:-translate-y-0.5 ${
          isMusicPlaying ? "bg-[#1f2933]" : "bg-[#1f2933]/88"
        } ${extraClassName}`}
        type="button"
        onClick={toggleSoundtrack}
      >
        <span className="flex h-4 w-5 items-end justify-center gap-[3px]" aria-hidden="true">
          <span className={`w-1 rounded-full bg-current ${isMusicPlaying ? "h-4 animate-pulse" : "h-2"}`} />
          <span className={`w-1 rounded-full bg-current ${isMusicPlaying ? "h-3 animate-pulse" : "h-3"}`} />
          <span className={`w-1 rounded-full bg-current ${isMusicPlaying ? "h-5 animate-pulse" : "h-2"}`} />
        </span>
        {isMusicPlaying ? "MUSIC OFF" : "MUSIC ON"}
      </button>
    );
  }

  function renderSoundtrackControl(wrapperClassName = "", buttonClassName = "", selectClassName = "") {
    return (
      <div className={`flex items-center gap-2 ${wrapperClassName}`}>
        {renderMusicButton(buttonClassName)}
        <select
          aria-label="Scegli colonna sonora"
          className={`min-h-[50px] rounded-2xl border border-white/80 bg-white/90 px-3 py-2 text-sm font-black text-beach-ink shadow-soft backdrop-blur outline-none transition duration-300 hover:-translate-y-0.5 focus:ring-4 focus:ring-orange-100 ${selectClassName}`}
          value={activeTrackIndex}
          onChange={changeSoundtrack}
        >
          {SOUNDTRACK_TRACKS.map((track, index) => (
            <option key={track.src} value={index}>
              {track.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-beach-foam pb-24 text-beach-ink sm:pb-0">
      <audio
        ref={soundtrackRef}
        src={activeTrack.src}
        loop
        preload="none"
        onPause={() => setIsMusicPlaying(false)}
        onPlay={() => setIsMusicPlaying(true)}
      />
      <header className="relative overflow-hidden bg-[#fff4e5] text-beach-ink">
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src={beachData.heroImage}
          alt="Spiaggia di Marina di Campo con ombrellone e lettino"
          width="1280"
          height="960"
          decoding="async"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff5e4]/55 via-[#fff8ed]/12 to-beach-foam/92" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-beach-foam via-beach-foam/80 to-transparent" />

        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-end gap-3 px-5 py-5 sm:px-8">
          <div className="flex flex-1 justify-start gap-2 text-sm font-black sm:justify-end">
            {renderSoundtrackControl("hidden sm:flex", "", "w-28")}
            {isAdminMode ? (
              <button
                className="nav-pill hidden sm:inline-flex"
                type="button"
                onClick={openPhotoManagerFromAnywhere}
              >
                {isAdminAuthenticated ? "Aggiungi foto" : "Admin foto"}
              </button>
            ) : null}
            <a className="nav-pill" href="#prenota">
              {t.nav.book}
            </a>
            <a className="nav-pill" href="#condizioni">
              {t.nav.wind}
            </a>
          </div>

          <a className="flex min-h-[50px] items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 text-beach-ink shadow-soft backdrop-blur sm:gap-3" href="#top" aria-label="Noleggio Numero 5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/90 text-beach-ink">
              <LogoMark className="h-8 w-8" />
            </span>
            <span className="leading-tight">
              <span className="block text-xs font-black uppercase sm:text-sm">Noleggio</span>
              <span className="block text-[0.65rem] font-black uppercase text-beach-ink/75 sm:text-xs">Numero 5</span>
            </span>
          </a>
        </nav>

        <section id="top" className="relative z-10 mx-auto grid max-w-6xl gap-6 px-5 pb-12 pt-4 sm:px-8 sm:pb-16 md:pt-8 lg:min-h-[74svh] lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="text-center lg:text-left">
            <h1 className="wind-title mx-auto mt-10 max-w-3xl text-3xl font-black uppercase leading-none sm:mt-12 sm:text-4xl md:text-5xl lg:mx-0 lg:text-[3.65rem] xl:text-[4rem]">
              {t.hero.title}
            </h1>
            <p className="mx-auto mt-2 max-w-2xl text-2xl font-black italic leading-none text-[#e96400] drop-shadow-[0_2px_0_rgba(255,255,255,0.42)] sm:text-4xl md:text-5xl lg:mx-0">
              {t.hero.payoff}
            </p>
            <p className="mx-auto mt-4 inline-flex max-w-2xl items-center justify-center rounded-2xl bg-[#1f2933] px-4 py-2.5 text-sm font-black uppercase leading-tight text-white shadow-[0_16px_34px_rgba(31,41,51,0.22)] sm:px-6 sm:text-lg md:text-xl lg:mx-0">
              {t.hero.subtitle}
            </p>

            <div className="mt-5 lg:hidden">
              <TodayConditionsCard beachData={beachData} currentStatus={currentStatus} quickWhatsAppUrl={quickWhatsAppUrl} t={t} weatherSummary={weatherSummary} windData={displayedWind} photoUrl={displayedDailyPhoto} />
            </div>

            <p className="mx-auto mt-4 max-w-xl text-base font-bold leading-7 text-slate-900 sm:text-lg lg:mx-0">
              {t.hero.body}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
              <a className="premium-cta" href="#prenota">
                {t.hero.primaryCta}
              </a>
              <a className="inline-flex min-h-[54px] items-center justify-center rounded-2xl border border-white/90 bg-white/90 px-5 py-3 text-base font-black text-beach-ink shadow-soft backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:bg-white" href="#condizioni">
                {t.hero.secondaryCta}
              </a>
            </div>
          </div>

          <div className="hidden justify-self-end pt-7 lg:block lg:w-[350px] xl:w-[360px]">
            <TodayConditionsCard beachData={beachData} currentStatus={currentStatus} quickWhatsAppUrl={quickWhatsAppUrl} t={t} weatherSummary={weatherSummary} windData={displayedWind} photoUrl={displayedDailyPhoto} />
          </div>
        </section>
      </header>

      <WaveDivider />

      <main>
        <section className="relative z-20 bg-beach-foam pb-12 pt-2">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-5 sm:px-8 lg:grid-cols-4">
            {featureHighlights.map((item) => {
              const Icon = item.icon;

              return (
                <article className="feature-tile" key={item.title}>
                  <span className={`icon-bubble ${iconToneClasses[item.tone]}`}>
                    <Icon className="h-7 w-7" />
                  </span>
                  <h2 className="mt-4 text-base font-black uppercase leading-tight text-beach-ink">{item.title}</h2>
                  <p className="mt-2 min-h-[3rem] text-sm font-bold leading-6 text-slate-800">{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="prenota" className="bg-beach-foam pb-12 sm:pb-16">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <p className="section-kicker">{t.booking.kicker}</p>
              <h2 className="section-title">{t.booking.title}</h2>
              <p className="mt-4 max-w-prose text-lg font-bold leading-8 text-slate-800">
                {t.booking.body}
              </p>

              <div className="mt-6 rounded-2xl border border-[#ecd9bf] bg-white/95 p-4 shadow-soft backdrop-blur">
                <p className="text-sm font-black uppercase text-[#e97900]">{t.booking.equipmentNoteTitle}</p>
                <p className="mt-2 text-base font-bold leading-7 text-beach-ink">
                  {t.booking.equipmentNoteText}
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                <div className={`rounded-2xl border px-4 py-3 text-sm font-black shadow-soft ${currentStatus.className}`}>
                  <span className={`mr-2 inline-block h-3 w-3 rounded-full ${currentStatus.dotClassName}`} />
                  Oggi: {currentStatus.summary}
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm font-black text-slate-800 shadow-soft backdrop-blur">
                  Vento automatico: <span className="text-beach-ink">{displayedWind.direction} · {displayedWind.intensity}</span>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm font-black text-slate-800 shadow-soft backdrop-blur">
                  Meteo sintetico: <span className="text-beach-ink">{weatherSummary}</span>
                </div>
                {automaticWindError ? (
                  <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-black text-orange-950 shadow-soft">
                    Dato automatico non disponibile: uso il vento manuale.
                  </div>
                ) : null}
                <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm font-black text-slate-800 shadow-soft backdrop-blur">
                  Disponibilita': <span className="text-beach-ink">{availabilityText} · {beachData.availability.note}</span>
                </div>
              </div>
            </div>

            <form className="premium-card p-5 sm:p-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="field-label">Nome</span>
                  <input
                    className="field-input"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="field-label">Data</span>
                  <input
                    className="field-input"
                    name="date"
                    type="date"
                    min={minDate}
                    value={form.date}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className="block">
                  <span className="field-label">Numero ombrelloni</span>
                  <input
                    className="field-input"
                    name="umbrellas"
                    type="number"
                    min="0"
                    max="20"
                    value={form.umbrellas}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className="block">
                  <span className="field-label">Numero lettini</span>
                  <input
                    className="field-input"
                    name="sunbeds"
                    type="number"
                    min="0"
                    max="40"
                    value={form.sunbeds}
                    onChange={updateField}
                    required
                  />
                </label>
              </div>

              <button
                className="premium-cta mt-5 w-full"
                type="submit"
              >
                Invia richiesta WhatsApp
              </button>
            </form>
          </div>
        </section>

        <section className="bg-[#f2e7d8] py-12 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 sm:px-8 lg:grid-cols-[1fr_0.82fr] lg:items-start">
            <div>
              <p className="section-kicker">{t.howItWorks.kicker}</p>
              <h2 className="section-title">{t.howItWorks.title}</h2>
            </div>

            <div className="grid gap-3">
              {t.howItWorks.steps.map((step, index) => (
                <article className="rounded-2xl border border-white/90 bg-white/95 p-4 shadow-soft" key={step.title}>
                  <div className="flex gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#1f2933] text-lg font-black text-white">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-black text-beach-ink">{step.title}</h3>
                      <p className="mt-1 text-base font-bold leading-7 text-slate-800">{step.text}</p>
                    </div>
                  </div>
                </article>
              ))}

              <article className="rounded-2xl border border-white/90 bg-white/95 p-4 shadow-soft">
                <h3 className="text-lg font-black text-beach-ink">{t.howItWorks.whereTitle}</h3>
                <p className="mt-1 text-base font-bold leading-7 text-slate-800">{t.howItWorks.whereText}</p>
                <a
                  className="premium-cta mt-4 w-full text-center text-base"
                  href={quickWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.howItWorks.whatsappCta}
                </a>
              </article>
            </div>
          </div>
        </section>

        <section id="condizioni" className="bg-[#fff6e8] py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="section-kicker">{t.sea.kicker}</p>
                <h2 className="section-title">{t.sea.title}</h2>
              </div>
              <div className={`w-fit rounded-2xl border px-4 py-3 text-sm font-black shadow-soft ${currentStatus.className}`}>
                <span className={`mr-2 inline-block h-3 w-3 rounded-full ${currentStatus.dotClassName}`} />
                {currentStatus.label} · {currentStatus.summary}
              </div>
            </div>

            <div ref={photoSectionRef} className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <PhotoOfDaySection
                  altText="Foto aggiornata del mare di oggi"
                  dateLabel={displayedPhotoDate}
                  description={beachData.wind.note}
                  imageUrl={displayedDailyPhoto}
                  isAdminAuthenticated={isAdminAuthenticated}
                  isAdminMode={isAdminMode}
                  isUploading={photoUploadState === "uploading"}
                  onChangePhoto={requestPhotoSelection}
                  onOpenAdmin={openPhotoManager}
                />

                {isAdminMode ? (
                  <div className="premium-card p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black uppercase text-[#e97900]">Gestione foto</p>
                        <p className="mt-1 text-sm font-bold text-slate-700">
                          {isAdminAuthenticated ? "Modalita' admin attiva" : "Accesso admin richiesto"}
                        </p>
                      </div>
                      <button
                        className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-[#ecd9bf] bg-[#fff7eb] px-4 py-2 text-sm font-black text-beach-ink transition duration-300 hover:-translate-y-0.5 hover:bg-white"
                        type="button"
                        onClick={openPhotoManager}
                      >
                        {isAdminAuthenticated ? "Carica nuova foto" : "Accesso admin"}
                      </button>
                    </div>

                    {isPhotoManagerOpen ? (
                      <div className="mt-4 space-y-4">
                        <input
                          ref={photoInputRef}
                          className="hidden"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoFileChange}
                        />

                        <div className="rounded-2xl border border-dashed border-[#d8b06a] bg-[#fffaf3] p-4 text-center">
                          {pendingPhoto ? (
                            <>
                              <img
                                className="mx-auto aspect-[4/3] w-full max-w-xl rounded-2xl object-cover"
                                src={pendingPhoto.previewUrl}
                                alt="Anteprima nuova foto del giorno"
                              />
                              <p className="mt-3 text-sm font-bold text-slate-700">Anteprima compressa pronta per la pubblicazione.</p>
                            </>
                          ) : (
                            <>
                              <p className="text-base font-black text-beach-ink">Scatta o scegli dal dispositivo</p>
                              <p className="mt-2 text-sm font-bold text-slate-700">Tablet, cellulare o computer. La foto verra' compressa prima del caricamento.</p>
                            </>
                          )}
                        </div>

                        {!isAdminAuthenticated ? (
                          <label className="block">
                            <span className="field-label">PIN admin</span>
                            <input
                              className="field-input"
                              type="password"
                              inputMode="numeric"
                              value={adminPinInput}
                              onChange={(event) => setAdminPinInput(event.target.value)}
                              placeholder="Inserisci il PIN prima della conferma"
                            />
                          </label>
                        ) : (
                          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-900">
                            Accesso admin gia' attivo su questo dispositivo.
                          </p>
                        )}

                        <div className="flex flex-col gap-3 sm:flex-row">
                          <button className="premium-cta" type="button" onClick={() => photoInputRef.current?.click()}>
                            {pendingPhoto ? "Carica nuova foto" : "Scatta o scegli dal dispositivo"}
                          </button>
                          <button
                            className="inline-flex min-h-[50px] items-center justify-center rounded-2xl border border-stone-900/20 bg-white px-5 py-3 text-base font-black text-beach-ink transition duration-300 hover:-translate-y-0.5 hover:bg-stone-50"
                            type="button"
                            onClick={pendingPhoto ? clearPendingPhoto : closePhotoManager}
                          >
                            Annulla
                          </button>
                          <button className="premium-cta" type="button" disabled={!pendingPhoto || photoUploadState === "uploading" || isAdminVerifying} onClick={confirmPhotoUpload}>
                            {photoUploadState === "uploading" || isAdminVerifying ? "Caricamento..." : "Conferma"}
                          </button>
                        </div>

                        {photoUploadMessage ? (
                          <p className={`text-sm font-black ${photoUploadState === "error" ? "text-red-700" : "text-beach-reef"}`}>
                            {photoUploadMessage}
                          </p>
                        ) : null}
                        {publicPhotoError ? <p className="text-sm font-bold text-slate-600">{publicPhotoError}</p> : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <aside className="premium-glass p-5 sm:p-6">
                <p className="text-sm font-black uppercase text-orange-200">Vento automatico</p>
                <h3 className="mt-3 text-4xl font-black leading-tight text-white">
                  {displayedWind.direction} · {displayedWind.intensity}
                </h3>
                <p className="mt-2 text-sm font-bold text-white/80">
                  {displayedWind.isAutomatic ? "Aggiornato automaticamente alle" : "Aggiornato alle"} {displayedWind.updatedAt}
                </p>
                {displayedWind.gusts ? <p className="mt-1 text-sm font-bold text-white/70">Raffiche: {displayedWind.gusts}</p> : null}
                <a
                  className="mt-3 inline-block text-sm font-bold text-orange-200 underline decoration-orange-200/40 underline-offset-4"
                  href={displayedWind.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Fonte: {displayedWind.sourceLabel}
                </a>

                <div className="mt-6 grid gap-3">
                  {windLegend.map((item) => {
                    const isActive = item.key === beachData.status;
                    const style = statusStyles[item.key];

                    return (
                      <div
                        className={`flex min-h-[50px] items-center justify-between rounded-2xl border px-4 py-3 text-sm transition duration-300 ${
                          isActive ? style.className : "border-white/15 bg-white/10 text-white/80"
                        }`}
                        key={item.key}
                      >
                        <span className="font-black">{item.label}</span>
                        <span className="font-semibold">{item.meaning}</span>
                      </div>
                    );
                  })}
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section id="mappa-vento" className="bg-beach-foam py-12 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-7 px-5 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
            <div>
              <p className="section-kicker">{t.windMap.kicker}</p>
              <h2 className="section-title">{t.windMap.title}</h2>
              <div className="mt-5 space-y-3 text-lg font-bold leading-8 text-slate-800">
                <p>
                  <strong className="text-[#5f8f42]">{t.windMap.greenLabel}</strong> = {t.windMap.greenMeaning}
                </p>
                <p>
                  <strong className="text-red-700">{t.windMap.redLabel}</strong> = {t.windMap.redMeaning}
                </p>
              </div>
            </div>

            <div className="premium-card relative overflow-hidden bg-[#1f2933]">
              <img
                className="aspect-[4/3] w-full object-cover"
                src={beachData.windMapImage}
                alt="Golfo di Marina di Campo dall'alto"
                width="1200"
                height="704"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#1f2933]/0 via-transparent to-[#1f2933]/58" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center" data-wind-direction={displayedWind.direction}>
                <div
                  aria-label={`Direzione vento ${displayedWind.direction}`}
                  className="wind-arrow"
                  style={windArrowStyle}
                >
                  <span>{displayedWind.direction}</span>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 bg-[#1f2933]/90 px-4 py-3 text-white shadow-soft backdrop-blur-xl">
                <p className="text-xs font-black uppercase text-orange-200 sm:text-sm">Vento automatico</p>
                <p className="text-sm font-black sm:text-base">
                  {displayedWind.direction} · {displayedWind.intensity}
                </p>
                <p className="text-xs font-bold text-white/80 sm:text-sm">
                  {displayedWind.isAutomatic ? "Aggiornato ogni ora" : "Dato manuale"} · {displayedWind.updatedAt}
                </p>
                <a
                  className="text-xs font-bold text-orange-200 underline decoration-orange-200/40 underline-offset-4"
                  href={displayedWind.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Fonte automatica
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="dove-siamo" className="bg-[#fff6e8] py-12 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="section-kicker">Marina di Campo</p>
              <h2 className="section-title">{t.howItWorks.whereTitle}</h2>
              <p className="mt-4 text-lg font-bold leading-8 text-slate-800">{t.howItWorks.whereText}</p>
              <p className="mt-3 text-lg font-black leading-7 text-beach-ink">{t.howItWorks.whereDetail}</p>
              <a
                className="premium-cta mt-5 w-full text-center sm:w-auto"
                href={quickWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
              >
                {t.howItWorks.whatsappCta}
              </a>
            </div>

            <div className="premium-card overflow-hidden p-3 sm:p-4">
              <iframe
                title="Dove siamo - Noleggio Numero 5"
                src={GOOGLE_MAP_EMBED_URL}
                width="100%"
                height="280"
                className="block w-full rounded-2xl"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a
                className="premium-cta mt-4 w-full text-center"
                href={GOOGLE_MAP_DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.howItWorks.mapsCta}
              </a>
            </div>
          </div>
        </section>

        {showMorningAdmin ? (
          <section id="aggiorna" className="bg-[#f2e7d8] py-12 sm:py-16">
            <div className="mx-auto max-w-6xl px-5 sm:px-8">
              <details className="premium-card" open>
                <summary className="cursor-pointer list-none px-5 py-5 text-xl font-black text-beach-ink sm:px-6">
                  Area gestione mattina
                </summary>

                <form className="grid gap-6 border-t border-stone-900/10 p-5 sm:p-6 lg:grid-cols-[0.9fr_1.1fr]" onSubmit={saveMorningUpdate}>
                  <div>
                    <img
                      className="aspect-[4/3] w-full rounded-2xl object-cover"
                      src={beachData.dailySeaPhoto}
                      alt="Anteprima foto della spiaggia caricata"
                      width="1280"
                      height="960"
                      loading="lazy"
                      decoding="async"
                    />

                    <label className="mt-4 block">
                      <span className="field-label">Foto spiaggia di oggi</span>
                      <input
                        className="mt-2 min-h-[50px] w-full rounded-2xl border border-stone-900/15 bg-white/90 px-4 py-3 text-sm text-beach-ink file:mr-4 file:rounded-2xl file:border-0 file:bg-beach-reef file:px-4 file:py-2 file:font-bold file:text-white"
                        type="file"
                        accept="image/*"
                        onChange={updateMorningPhoto}
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="field-label">Testo condizioni</span>
                      <input
                        className="field-input"
                        name="conditionText"
                        value={beachData.conditionText}
                        onChange={updateMorningField}
                      />
                    </label>

                    <label className="block">
                      <span className="field-label">Vento</span>
                      <input
                        className="field-input"
                        name="wind.name"
                        value={beachData.wind.name}
                        onChange={updateMorningField}
                      />
                    </label>

                    <label className="block">
                      <span className="field-label">Direzione</span>
                      <input
                        className="field-input"
                        name="wind.direction"
                        value={beachData.wind.direction}
                        onChange={updateMorningField}
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="field-label">Nota mare</span>
                      <textarea
                        className="field-input min-h-24 resize-y"
                        name="wind.note"
                        value={beachData.wind.note}
                        onChange={updateMorningField}
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="field-label">Meteo sintetico</span>
                      <input
                        className="field-input"
                        name="weather.summary"
                        value={beachData.weather.summary}
                        onChange={updateMorningField}
                      />
                    </label>

                    <label className="block">
                      <span className="field-label">Disponibilita' ombrelloni</span>
                      <input
                        className="field-input"
                        name="availability.umbrellas"
                        value={beachData.availability.umbrellas}
                        onChange={updateMorningField}
                      />
                    </label>

                    <label className="block">
                      <span className="field-label">Disponibilita' lettini</span>
                      <input
                        className="field-input"
                        name="availability.sunbeds"
                        value={beachData.availability.sunbeds}
                        onChange={updateMorningField}
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="field-label">Nota disponibilita'</span>
                      <input
                        className="field-input"
                        name="availability.note"
                        value={beachData.availability.note}
                        onChange={updateMorningField}
                      />
                    </label>

                    <label className="block">
                      <span className="field-label">Vento manuale fallback</span>
                      <input
                        className="field-input"
                        name="meteoWind.direction"
                        value={beachData.meteoWind.direction}
                        onChange={updateMorningField}
                      />
                    </label>

                    <label className="block">
                      <span className="field-label">Intensita'</span>
                      <input
                        className="field-input"
                        name="meteoWind.intensity"
                        value={beachData.meteoWind.intensity}
                        onChange={updateMorningField}
                      />
                    </label>

                    <label className="block">
                      <span className="field-label">Ora aggiornamento</span>
                      <input
                        className="field-input"
                        name="meteoWind.updatedAt"
                        value={beachData.meteoWind.updatedAt}
                        onChange={updateMorningField}
                      />
                    </label>

                    <label className="block">
                      <span className="field-label">Link fonte fallback</span>
                      <input
                        className="field-input"
                        name="meteoWind.sourceUrl"
                        value={beachData.meteoWind.sourceUrl}
                        onChange={updateMorningField}
                      />
                    </label>

                    <label className="block">
                      <span className="field-label">Stato</span>
                      <select className="field-input" name="status" value={beachData.status} onChange={updateMorningField}>
                        {windLegend.map((item) => (
                          <option key={item.key} value={item.key}>
                            {item.label} - {item.meaning}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="field-label">Numero WhatsApp</span>
                      <input
                        className="field-input"
                        name="whatsappNumber"
                        value={beachData.whatsappNumber}
                        onChange={updateMorningField}
                      />
                    </label>

                    <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
                      <button
                        className="premium-cta bg-beach-reef shadow-[0_14px_30px_rgba(154,106,46,0.24)] hover:bg-[#7a4d18] hover:shadow-[0_18px_42px_rgba(154,106,46,0.34)]"
                        type="submit"
                      >
                        Salva aggiornamento
                      </button>
                      <button
                        className="inline-flex min-h-[50px] items-center justify-center rounded-2xl border border-stone-900/20 bg-white px-5 py-3 text-base font-black text-beach-ink transition duration-300 hover:-translate-y-0.5 hover:bg-stone-50"
                        type="button"
                        onClick={resetMorningUpdate}
                      >
                        Ripristina
                      </button>
                    </div>

                    {saveMessage ? <p className="text-sm font-bold text-beach-reef sm:col-span-2">{saveMessage}</p> : null}
                  </div>
                </form>
              </details>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="bg-[#1f2933] px-5 py-8 text-center text-sm font-semibold text-white/80 sm:px-8">
        <p className="text-lg font-black uppercase text-[#ff8c00]">Noleggio Numero 5</p>
        <p className="mt-1">Marina di Campo · Prenota su WhatsApp {whatsappDisplay}</p>
      </footer>

      <div className="fixed bottom-[5.6rem] right-4 z-50 sm:hidden">
        {renderSoundtrackControl("flex-col items-end", "bg-[#1f2933]", "w-[7.75rem]")}
        {musicMessage ? (
          <p className="mt-2 max-w-[12rem] rounded-xl bg-white/95 px-3 py-2 text-xs font-black text-beach-ink shadow-soft">
            {musicMessage}
          </p>
        ) : null}
      </div>

      {isAdminMode ? (
        <button
          className="fixed bottom-[11.5rem] right-4 z-50 inline-flex min-h-[54px] items-center justify-center rounded-2xl bg-[#1f2933] px-4 py-3 text-sm font-black text-white shadow-[0_20px_48px_rgba(31,41,51,0.28)] sm:right-8 sm:bottom-8 sm:min-h-[50px] sm:px-5"
          type="button"
          onClick={openPhotoManagerFromAnywhere}
        >
          {isAdminAuthenticated ? "Aggiungi foto" : "Admin foto"}
        </button>
      ) : null}

      <a
        className="fixed bottom-4 left-4 right-4 z-50 inline-flex min-h-[58px] items-center justify-center rounded-2xl bg-[#ff8c00] px-5 py-3 text-lg font-black text-white shadow-[0_20px_48px_rgba(31,41,51,0.28)] sm:hidden"
        href={quickWhatsAppUrl}
        target="_blank"
        rel="noreferrer"
      >
        WhatsApp {whatsappDisplay}
      </a>
    </div>
  );
}

export default App;
