import { useMemo, useRef, useState } from "react";
import { today, windLegend } from "./data/today";
import { translations } from "./data/translations";

const STORAGE_KEY = "numero5-morning-update";
const DEFAULT_LOCALE = "it";
const LOCATION_COORDS = "42.750225,10.241150";
const GOOGLE_MAP_EMBED_URL = `https://www.google.com/maps?q=${LOCATION_COORDS}&z=18&output=embed`;
const GOOGLE_MAP_DIRECTIONS_URL = `https://www.google.com/maps/search/?api=1&query=${LOCATION_COORDS}`;
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
    className: "border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-950",
    dotClassName: "bg-gradient-to-br from-emerald-300 to-emerald-500",
  },
  "green-minus": {
    label: "Verde -",
    summary: "Buona alternativa",
    className: "border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-950",
    dotClassName: "bg-gradient-to-br from-teal-300 to-emerald-500",
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
  navy: "bg-[#0a192f] text-white",
  orange: "bg-[#ff8c00] text-white",
  green: "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white",
  coral: "bg-gradient-to-br from-[#ff8c00] to-[#ef4f5e] text-white",
};

const initialForm = {
  name: "",
  phone: "",
  date: "",
  people: "2",
  notes: "",
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
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace("-", "");

  const directionAngles = {
    N: 0,
    NORD: 0,
    NE: 45,
    NORDEST: 45,
    GRECALE: 45,
    E: 90,
    EST: 90,
    SE: 135,
    SUDEST: 135,
    SCIROCCO: 135,
    S: 180,
    SUD: 180,
    SO: 225,
    SW: 225,
    SUDOVEST: 225,
    LIBECCIO: 225,
    O: 270,
    W: 270,
    OVEST: 270,
    PONENTE: 270,
    NO: 315,
    NW: 315,
    NORDOVEST: 315,
    MAESTRALE: 315,
  };

  return directionAngles[normalizedDirection] ?? 0;
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
      <path d="M48 32v42" fill="none" stroke="#0a192f" strokeLinecap="round" strokeWidth="5" />
      <path d="M16 39c7-16 19-24 32-24s25 8 32 24H16Z" fill="#ff8c00" />
      <path d="M16 39c8-6 16-6 24 0 5-6 11-6 16 0 8-6 16-6 24 0" fill="#d66f00" opacity="0.72" />
      <path d="M16 39c7-16 19-24 32-24s25 8 32 24" fill="none" stroke="#0a192f" strokeLinecap="round" strokeWidth="4" />
      <path d="M48 15c-6 7-9 15-8 24M48 15c6 7 9 15 8 24" fill="none" stroke="#0a192f" strokeLinecap="round" strokeWidth="3.5" />
      <path d="M48 74c0 7 7 10 13 5" fill="none" stroke="#0a192f" strokeLinecap="round" strokeWidth="5" />
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
    <div className="-mt-px bg-[#e9f7fb]" aria-hidden="true">
      <svg className="block h-16 w-full sm:h-24" viewBox="0 0 1440 140" preserveAspectRatio="none">
        <path
          d="M0 74 60 66.3C120 58.7 240 43.3 360 48.5 480 53.7 600 79.3 720 85.8 840 92.3 960 79.7 1080 65.2 1200 50.7 1320 34.3 1380 26.2L1440 18v122H0V74Z"
          fill="#dff3f8"
        />
        <path
          d="M0 98 80 91.8C160 85.7 320 73.3 480 78.2 640 83 800 105 960 100.3 1120 95.7 1280 64.3 1360 48.7L1440 33v107H0V98Z"
          fill="#f8fbfa"
          opacity="0.82"
        />
      </svg>
    </div>
  );
}

function TodayConditionsCard({ beachData, currentStatus, quickWhatsAppUrl, t }) {
  const availabilityText = getAvailabilityText(beachData.availability);

  return (
    <aside className="today-hero-card">
      <div className="grid grid-cols-[86px_minmax(0,1fr)] gap-3 sm:grid-cols-[0.42fr_0.58fr] sm:gap-4 lg:block">
        <div className="relative overflow-hidden rounded-2xl bg-[#dff3f8]">
          <img
            className="aspect-square h-full w-full object-cover sm:aspect-[4/3] lg:aspect-[16/9]"
            src={beachData.dailySeaPhoto}
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
              {t.todayCard.weather}: {beachData.weather.summary}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3">
              <div className="rounded-2xl bg-[#0a192f] p-2 text-white sm:p-3">
                <p className="text-[0.65rem] font-black uppercase text-white/80 sm:text-xs">{t.todayCard.wind}</p>
                <p className="mt-1 text-lg font-black sm:text-xl">{beachData.meteoWind.direction}</p>
                <p className="text-xs font-bold text-white/80 sm:text-sm">{beachData.meteoWind.intensity}</p>
              </div>
              <div className={`rounded-2xl border p-2 sm:p-3 ${currentStatus.className}`}>
                <p className="text-[0.65rem] font-black uppercase opacity-80 sm:text-xs">{t.todayCard.status}</p>
                <p className="mt-1 text-sm font-black leading-4 sm:text-lg sm:leading-tight">{currentStatus.summary}</p>
              </div>
            </div>

            <div className="mt-2 rounded-2xl border border-sky-100 bg-sky-50 p-2">
              <p className="text-[0.65rem] font-black uppercase text-sky-900 sm:text-xs">{t.todayCard.availability}</p>
              <p className="mt-1 text-xs font-black leading-4 text-beach-ink sm:text-sm">{availabilityText}</p>
              <p className="mt-1 text-xs font-bold leading-4 text-slate-800 sm:text-sm">{beachData.availability.note}</p>
            </div>

            <p className="mt-2 text-xs font-bold text-slate-800 sm:mt-3 sm:text-sm">
              {t.todayCard.updatedAt} {beachData.meteoWind.updatedAt}
            </p>
            <p className="mt-1 text-xs font-black text-beach-ink sm:text-sm">
              {t.todayCard.phone}: {formatWhatsAppDisplay(beachData.whatsappNumber)}
            </p>
          </div>

          <a
            className="premium-cta mt-3 min-h-[48px] w-full bg-[#25D366] px-3 text-sm shadow-[0_18px_38px_rgba(37,211,102,0.28)] hover:bg-[#1fb759] sm:mt-4 sm:min-h-[56px] sm:text-lg"
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

function App() {
  const [form, setForm] = useState(initialForm);
  const [beachData, setBeachData] = useState(loadMorningUpdate);
  const [saveMessage, setSaveMessage] = useState("");
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicMessage, setMusicMessage] = useState("");
  const soundtrackRef = useRef(null);
  const t = translations[DEFAULT_LOCALE];
  const activeTrack = SOUNDTRACK_TRACKS[activeTrackIndex] ?? SOUNDTRACK_TRACKS[0];
  const currentStatus = statusStyles[beachData.status] ?? statusStyles["green-minus"];
  const availabilityText = getAvailabilityText(beachData.availability);
  const windRotation = getWindRotation(beachData.meteoWind.direction);
  const isGreenStatus = beachData.status?.startsWith("green");
  const whatsappDisplay = formatWhatsAppDisplay(beachData.whatsappNumber);
  const quickWhatsAppText = encodeURIComponent(
    [
      "Ciao Numero 5 Beach System, vorrei sapere se c'e' disponibilita' per un ombrellone.",
      "",
      `Ho visto in app: ${currentStatus.summary}`,
      `Vento Meteo Militare: ${beachData.meteoWind.direction} · ${beachData.meteoWind.intensity}`,
      `Meteo: ${beachData.weather.summary}`,
      `Disponibilita': ${availabilityText}`,
    ].join("\n"),
  );
  const quickWhatsAppUrl = `https://wa.me/${normalizeWhatsAppNumber(beachData.whatsappNumber)}?text=${quickWhatsAppText}`;
  const windArrowStyle = {
    transform: `rotate(${windRotation}deg)`,
    "--wind-arrow-from": isGreenStatus ? "#34d399" : "#ff8c00",
    "--wind-arrow-to": isGreenStatus ? "#0f766e" : "#ef4f5e",
  };

  const minDate = useMemo(() => getTodayInputValue(), []);
  const showMorningAdmin = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.location.search.includes("admin=1") || window.location.hash === "#aggiorna";
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
        text: `${beachData.meteoWind.direction} · ${beachData.meteoWind.intensity}`,
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
    [availabilityText, beachData.conditionText, beachData.meteoWind.direction, beachData.meteoWind.intensity, isGreenStatus, t, whatsappDisplay],
  );

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function buildWhatsAppMessage() {
    return [
      "Ciao Numero 5 Beach System, vorrei prenotare un ombrellone.",
      "",
      `Nome: ${form.name}`,
      `Telefono: ${form.phone}`,
      `Data: ${form.date}`,
      `Numero persone: ${form.people}`,
      `Note: ${form.notes || "Nessuna nota"}`,
      "",
      `Condizioni viste in app: ${beachData.wind.name} (${currentStatus.label})`,
      `Vento Meteo Militare: ${beachData.meteoWind.direction} · ${beachData.meteoWind.intensity}`,
      `Meteo: ${beachData.weather.summary}`,
      `Disponibilita': ${availabilityText}`,
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
          isMusicPlaying ? "bg-[#0a192f]" : "bg-[#0a192f]/88"
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
          className={`min-h-[50px] rounded-2xl border border-white/80 bg-white/90 px-3 py-2 text-sm font-black text-beach-ink shadow-soft backdrop-blur outline-none transition duration-300 hover:-translate-y-0.5 focus:ring-4 focus:ring-sky-100 ${selectClassName}`}
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
      <header className="relative overflow-hidden bg-[#e9f7fb] text-beach-ink">
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src={beachData.heroImage}
          alt="Spiaggia di Marina di Campo con ombrellone e lettino"
          width="1280"
          height="960"
          decoding="async"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-sky-100/40 via-sky-200/10 to-beach-foam/90" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-beach-foam via-beach-foam/80 to-transparent" />

        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <a className="flex min-h-[50px] items-center gap-3 text-beach-ink" href="#top" aria-label="Noleggio Numero 5">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/90 text-beach-ink shadow-soft backdrop-blur">
              <LogoMark className="h-10 w-10" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-black uppercase">Noleggio</span>
              <span className="block text-xs font-black uppercase text-beach-ink/75">Numero 5</span>
            </span>
          </a>

          <div className="flex gap-2 text-sm font-black">
            {renderSoundtrackControl("hidden sm:flex", "", "w-28")}
            <a className="nav-pill" href="#prenota">
              {t.nav.book}
            </a>
            <a className="nav-pill" href="#condizioni">
              {t.nav.wind}
            </a>
          </div>
        </nav>

        <section id="top" className="relative z-10 mx-auto grid max-w-6xl gap-6 px-5 pb-12 pt-4 sm:px-8 sm:pb-16 md:pt-8 lg:min-h-[74svh] lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="text-center lg:text-left">
            <div className="mx-auto flex w-fit flex-col items-center text-beach-ink lg:mx-0">
              <LogoMark className="h-12 w-12 drop-shadow-[0_10px_18px_rgba(10,25,47,0.18)] sm:h-14 sm:w-14" />
              <p className="mt-1 text-xs font-black uppercase leading-tight sm:text-sm">Noleggio Numero 5</p>
              <p className="text-[0.65rem] font-black uppercase text-beach-ink/80 sm:text-xs">{t.hero.location}</p>
            </div>

            <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-black uppercase leading-none text-beach-ink drop-shadow-[0_3px_0_rgba(255,255,255,0.45)] sm:text-5xl md:text-6xl lg:mx-0 lg:text-[4.8rem]">
              {t.hero.title}
            </h1>
            <p className="mx-auto mt-2 max-w-2xl text-2xl font-black italic leading-none text-[#e96400] drop-shadow-[0_2px_0_rgba(255,255,255,0.42)] sm:text-4xl md:text-5xl lg:mx-0">
              {t.hero.payoff}
            </p>
            <p className="mx-auto mt-4 inline-flex max-w-2xl items-center justify-center rounded-2xl bg-[#0a192f] px-4 py-2.5 text-sm font-black uppercase leading-tight text-white shadow-[0_16px_34px_rgba(10,25,47,0.22)] sm:px-6 sm:text-lg md:text-xl lg:mx-0">
              {t.hero.subtitle}
            </p>

            <div className="mt-5 lg:hidden">
              <TodayConditionsCard beachData={beachData} currentStatus={currentStatus} quickWhatsAppUrl={quickWhatsAppUrl} t={t} />
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
            <TodayConditionsCard beachData={beachData} currentStatus={currentStatus} quickWhatsAppUrl={quickWhatsAppUrl} t={t} />
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

              <div className="mt-6 grid gap-3">
                <div className={`rounded-2xl border px-4 py-3 text-sm font-black shadow-soft ${currentStatus.className}`}>
                  <span className={`mr-2 inline-block h-3 w-3 rounded-full ${currentStatus.dotClassName}`} />
                  Oggi: {currentStatus.summary}
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm font-black text-slate-800 shadow-soft backdrop-blur">
                  Vento Meteo Militare: <span className="text-beach-ink">{beachData.meteoWind.direction} · {beachData.meteoWind.intensity}</span>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm font-black text-slate-800 shadow-soft backdrop-blur">
                  Meteo sintetico: <span className="text-beach-ink">{beachData.weather.summary}</span>
                </div>
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

                <label className="block">
                  <span className="field-label">Telefono</span>
                  <input
                    className="field-input"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className="block">
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

                <label className="block sm:col-span-2">
                  <span className="field-label">Numero persone</span>
                  <input
                    className="field-input"
                    name="people"
                    type="number"
                    min="1"
                    max="20"
                    value={form.people}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="field-label">Note</span>
                  <textarea
                    className="field-input min-h-28 resize-y"
                    name="notes"
                    value={form.notes}
                    onChange={updateField}
                    placeholder="Orario preferito, lettini, richieste particolari..."
                  />
                </label>
              </div>

              <button
                className="premium-cta mt-5 w-full bg-[#25D366] shadow-[0_14px_30px_rgba(37,211,102,0.25)] hover:bg-[#1fb759] hover:shadow-[0_18px_42px_rgba(37,211,102,0.35)]"
                type="submit"
              >
                Invia richiesta WhatsApp
              </button>
            </form>
          </div>
        </section>

        <section className="bg-[#dff3f8] py-12 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 sm:px-8 lg:grid-cols-[1fr_0.82fr] lg:items-start">
            <div>
              <p className="section-kicker">{t.howItWorks.kicker}</p>
              <h2 className="section-title">{t.howItWorks.title}</h2>
            </div>

            <div className="grid gap-3">
              {t.howItWorks.steps.map((step, index) => (
                <article className="rounded-2xl border border-white/90 bg-white/95 p-4 shadow-soft" key={step.title}>
                  <div className="flex gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#0a192f] text-lg font-black text-white">
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
                <p className="mt-2 text-base font-black text-beach-ink">WhatsApp {whatsappDisplay}</p>
              </article>
            </div>
          </div>
        </section>

        <section id="condizioni" className="bg-[#eef8f7] py-12 sm:py-16">
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

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <article className="premium-card overflow-hidden">
                <img
                  className="aspect-[4/3] w-full object-cover sm:aspect-[16/9]"
                  src={beachData.dailySeaPhoto}
                  alt="Foto aggiornata del mare di oggi"
                  width="1280"
                  height="960"
                  loading="lazy"
                  decoding="async"
                />
                <div className="p-5">
                  <p className="text-lg font-black text-beach-ink">{beachData.conditionText}</p>
                  <p className="mt-2 text-base font-bold leading-7 text-slate-800">{beachData.wind.note}</p>
                </div>
              </article>

              <aside className="premium-glass p-5 sm:p-6">
                <p className="text-sm font-black uppercase text-teal-200">Vento Meteo Militare</p>
                <h3 className="mt-3 text-4xl font-black leading-tight text-white">
                  {beachData.meteoWind.direction} · {beachData.meteoWind.intensity}
                </h3>
                <p className="mt-2 text-sm font-bold text-white/80">Aggiornato alle {beachData.meteoWind.updatedAt}</p>
                <a
                  className="mt-3 inline-block text-sm font-bold text-teal-200 underline decoration-teal-200/40 underline-offset-4"
                  href={beachData.meteoWind.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Fonte: Servizio Meteorologico dell'Aeronautica Militare
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
                  <strong className="text-emerald-700">{t.windMap.greenLabel}</strong> = {t.windMap.greenMeaning}
                </p>
                <p>
                  <strong className="text-red-700">{t.windMap.redLabel}</strong> = {t.windMap.redMeaning}
                </p>
              </div>
            </div>

            <div className="premium-card relative overflow-hidden bg-[#0a192f]">
              <img
                className="aspect-[4/3] w-full object-cover"
                src={beachData.windMapImage}
                alt="Golfo di Marina di Campo dall'alto"
                width="1200"
                height="704"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0a192f]/0 via-transparent to-[#0a192f]/58" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center" data-wind-direction={beachData.meteoWind.direction}>
                <div
                  aria-hidden="true"
                  className="wind-arrow"
                  style={windArrowStyle}
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 bg-[#0a192f]/90 px-4 py-3 text-white shadow-soft backdrop-blur-xl">
                <p className="text-xs font-black uppercase text-teal-200 sm:text-sm">Vento Meteo Militare</p>
                <p className="text-sm font-black sm:text-base">
                  {beachData.meteoWind.direction} · {beachData.meteoWind.intensity}
                </p>
                <p className="text-xs font-bold text-white/80 sm:text-sm">Aggiornato ogni ora · {beachData.meteoWind.updatedAt}</p>
                <a
                  className="text-xs font-bold text-teal-200 underline decoration-teal-200/40 underline-offset-4"
                  href={beachData.meteoWind.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Fonte MeteoAM
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="dove-siamo" className="bg-[#eef8f7] py-12 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="section-kicker">Marina di Campo</p>
              <h2 className="section-title">{t.howItWorks.whereTitle}</h2>
              <p className="mt-4 text-lg font-bold leading-8 text-slate-800">{t.howItWorks.whereText}</p>
              <p className="mt-3 text-lg font-black leading-7 text-beach-ink">{t.howItWorks.whereDetail}</p>
              <p className="mt-3 text-lg font-black text-beach-ink">WhatsApp {whatsappDisplay}</p>
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
                className="premium-cta mt-4 w-full bg-[#0a6fa3] text-center shadow-[0_16px_36px_rgba(10,111,163,0.24)] hover:bg-[#085f8c]"
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
          <section id="aggiorna" className="bg-[#e3f5f2] py-12 sm:py-16">
            <div className="mx-auto max-w-6xl px-5 sm:px-8">
              <details className="premium-card" open>
                <summary className="cursor-pointer list-none px-5 py-5 text-xl font-black text-beach-ink sm:px-6">
                  Area gestione mattina
                </summary>

                <form className="grid gap-6 border-t border-teal-900/10 p-5 sm:p-6 lg:grid-cols-[0.9fr_1.1fr]" onSubmit={saveMorningUpdate}>
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
                        className="mt-2 min-h-[50px] w-full rounded-2xl border border-teal-900/15 bg-white/90 px-4 py-3 text-sm text-beach-ink file:mr-4 file:rounded-2xl file:border-0 file:bg-beach-reef file:px-4 file:py-2 file:font-bold file:text-white"
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
                      <span className="field-label">Vento Meteo Militare</span>
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
                      <span className="field-label">Link fonte meteo</span>
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
                        className="premium-cta bg-beach-reef shadow-[0_14px_30px_rgba(15,118,110,0.22)] hover:bg-teal-800 hover:shadow-[0_18px_42px_rgba(15,118,110,0.32)]"
                        type="submit"
                      >
                        Salva aggiornamento
                      </button>
                      <button
                        className="inline-flex min-h-[50px] items-center justify-center rounded-2xl border border-teal-900/20 bg-white px-5 py-3 text-base font-black text-beach-ink transition duration-300 hover:-translate-y-0.5 hover:bg-slate-50"
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

      <footer className="bg-[#0a192f] px-5 py-8 text-center text-sm font-semibold text-white/80 sm:px-8">
        <p className="text-lg font-black uppercase text-[#ff8c00]">Noleggio Numero 5</p>
        <p className="mt-1">Marina di Campo · Prenota su WhatsApp {whatsappDisplay}</p>
      </footer>

      <div className="fixed bottom-[5.6rem] right-4 z-50 sm:hidden">
        {renderSoundtrackControl("flex-col items-end", "bg-[#0a192f]", "w-[7.75rem]")}
        {musicMessage ? (
          <p className="mt-2 max-w-[12rem] rounded-xl bg-white/95 px-3 py-2 text-xs font-black text-beach-ink shadow-soft">
            {musicMessage}
          </p>
        ) : null}
      </div>

      <a
        className="fixed bottom-4 left-4 right-4 z-50 inline-flex min-h-[58px] items-center justify-center rounded-2xl bg-[#25D366] px-5 py-3 text-lg font-black text-white shadow-[0_20px_48px_rgba(10,25,47,0.28)] sm:hidden"
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
