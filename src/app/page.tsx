"use client";

import {
  Activity,
  Archive,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Download,
  FileText,
  LoaderCircle,
  MapPin,
  Moon,
  Save,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Trash2,
  Users,
} from "lucide-react";
import { openDB } from "idb";
import { FormEvent, useEffect, useState } from "react";

type CityResult = {
  name: string;
  country: string;
  state: string | null;
  district: string | null;
  lat: number;
  lng: number;
  timezone: string;
  population?: number;
};

type BirthForm = {
  name: string;
  date: string;
  time: string;
  seconds: string;
  gender: "not_specified" | "female" | "male" | "other";
  cityQuery: string;
  city: CityResult | null;
  manualCoordinates: boolean;
  manualLat: string;
  manualLng: string;
  timezoneOverride: string;
  ayanamsha: "lahiri" | "raman" | "krishnamurti";
  house_system: "whole_sign" | "equal" | "placidus";
  node_type: "mean" | "true";
};

type ChartSettings = {
  style: "north" | "south" | "east";
  language: "en";
};

type Mode = "birth" | "matching" | "saved";

type ResultTab = "chart" | "planets" | "dasha" | "yogas" | "vargas" | "panchang" | "predictions" | "remedies";

type ReportOptions = {
  dasha: boolean;
  yogas: boolean;
  strength: boolean;
  vargas: boolean;
  panchang: boolean;
};

type Planet = {
  name: string;
  sign?: string;
  sign_id?: number;
  house?: number;
  absolute_degree?: number;
  degree_in_sign?: number;
  is_retrograde?: boolean;
  nakshatra?: string;
  nakshatra_id?: number;
  pada?: number;
  nakshatra_lord?: string;
};

type House = {
  house: number;
  sign?: string;
  sign_id?: number;
  degree_cusp?: number | null;
};

type KundliResult = {
  input: {
    label: string;
    city: string;
    timezone: string;
    lat: number;
    lng: number;
  };
  chart?: {
    ascendant?: {
      sign?: string;
      sign_id?: number;
      degree?: number;
      nakshatra?: {
        name?: string;
        pada?: number;
        lord?: string;
      };
    };
    planets?: Planet[];
    houses?: House[];
    sade_sati?: {
      active?: boolean;
      phase?: string | null;
      description?: string;
    };
    metadata?: Record<string, unknown>;
  };
  dasha?: Record<string, unknown>;
  yogas?: Record<string, unknown>;
  strength?: Record<string, unknown>;
  vargas?: Record<string, unknown>;
  panchang?: Record<string, unknown>;
  errors?: Record<string, string>;
};

type SavedChart = {
  id: string;
  label: string;
  birth: BirthForm;
  options: ReportOptions;
  settings: ChartSettings;
  result: KundliResult;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type MatchResult = {
  input?: {
    p1?: { label?: string; city?: string };
    p2?: { label?: string; city?: string };
    ayanamsha?: string;
  };
  match?: Record<string, unknown>;
};

const initialForm: BirthForm = {
  name: "Client",
  date: "1997-09-22",
  time: "23:25",
  seconds: "00",
  gender: "not_specified",
  cityQuery: "Mumbai",
  city: {
    name: "Mumbai",
    country: "IN",
    state: "Maharashtra",
    district: null,
    lat: 19.076,
    lng: 72.8777,
    timezone: "Asia/Kolkata",
    population: 12691836,
  },
  manualCoordinates: false,
  manualLat: "",
  manualLng: "",
  timezoneOverride: "",
  ayanamsha: "lahiri",
  house_system: "whole_sign",
  node_type: "mean",
};

const signGlyphs = ["", "Ar", "Ta", "Ge", "Cn", "Le", "Vi", "Li", "Sc", "Sg", "Cp", "Aq", "Pi"];

const houseCoordinates: Record<number, { x: number; y: number }> = {
  1: { x: 50, y: 18 },
  2: { x: 30, y: 12 },
  3: { x: 15, y: 29 },
  4: { x: 30, y: 52 },
  5: { x: 15, y: 73 },
  6: { x: 30, y: 89 },
  7: { x: 50, y: 82 },
  8: { x: 70, y: 89 },
  9: { x: 85, y: 73 },
  10: { x: 70, y: 52 },
  11: { x: 85, y: 29 },
  12: { x: 70, y: 12 },
};

const optionLabels: Record<keyof ReportOptions, string> = {
  dasha: "Vimshottari",
  yogas: "Yogas",
  strength: "Strength",
  vargas: "Vargas",
  panchang: "Panchang",
};

const planetShort: Record<string, string> = {
  Sun: "Su",
  Moon: "Mo",
  Mars: "Ma",
  Mercury: "Me",
  Jupiter: "Ju",
  Venus: "Ve",
  Saturn: "Sa",
  Rahu: "Ra",
  Ketu: "Ke",
};

const resultTabs: { key: ResultTab; label: string }[] = [
  { key: "chart", label: "Chart" },
  { key: "planets", label: "Planets" },
  { key: "dasha", label: "Dasha" },
  { key: "yogas", label: "Yogas" },
  { key: "vargas", label: "Vargas" },
  { key: "panchang", label: "Panchang" },
  { key: "predictions", label: "Predictions" },
  { key: "remedies", label: "Remedies" },
];

const signLords: Record<string, string> = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Mars",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Saturn",
  Pisces: "Jupiter",
};

const combustThresholds: Record<string, number> = {
  Moon: 12,
  Mars: 17,
  Mercury: 14,
  Jupiter: 11,
  Venus: 10,
  Saturn: 15,
};

const chartDescriptions: Record<ChartSettings["style"], string> = {
  north: "North Indian diamond",
  south: "South Indian fixed signs",
  east: "East Indian square",
};

const southSignCells: Record<number, { x: number; y: number }> = {
  12: { x: 0, y: 0 },
  1: { x: 25, y: 0 },
  2: { x: 50, y: 0 },
  3: { x: 75, y: 0 },
  11: { x: 0, y: 25 },
  4: { x: 75, y: 25 },
  10: { x: 0, y: 50 },
  5: { x: 75, y: 50 },
  9: { x: 0, y: 75 },
  8: { x: 25, y: 75 },
  7: { x: 50, y: 75 },
  6: { x: 75, y: 75 },
};

const eastHouseCoordinates: Record<number, { x: number; y: number }> = {
  1: { x: 50, y: 14 },
  2: { x: 24, y: 18 },
  3: { x: 15, y: 38 },
  4: { x: 25, y: 56 },
  5: { x: 15, y: 81 },
  6: { x: 31, y: 83 },
  7: { x: 50, y: 61 },
  8: { x: 69, y: 83 },
  9: { x: 85, y: 81 },
  10: { x: 75, y: 56 },
  11: { x: 85, y: 38 },
  12: { x: 76, y: 18 },
};

const eastHouseAnchors: Partial<Record<number, "start" | "middle" | "end">> = {
  6: "end",
  8: "start",
};

export default function Home() {
  const [mode, setMode] = useState<Mode>("birth");
  const [activeTab, setActiveTab] = useState<ResultTab>("chart");
  const [settings, setSettings] = useState<ChartSettings>({ style: "north", language: "en" });
  const [form, setForm] = useState<BirthForm>(initialForm);
  const [matchP1, setMatchP1] = useState<BirthForm>({ ...initialForm, name: "Person 1" });
  const [matchP2, setMatchP2] = useState<BirthForm>({
    ...initialForm,
    name: "Person 2",
    date: "1999-08-20",
    time: "14:15",
    cityQuery: "Delhi",
    city: {
      name: "Delhi",
      country: "IN",
      state: "Delhi",
      district: null,
      lat: 28.6139,
      lng: 77.209,
      timezone: "Asia/Kolkata",
    },
  });
  const [options, setOptions] = useState<ReportOptions>({
    dasha: true,
    yogas: true,
    strength: true,
    vargas: true,
    panchang: true,
  });
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityError, setCityError] = useState("");
  const [result, setResult] = useState<KundliResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [notes, setNotes] = useState("");
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([]);
  const [savedSearch, setSavedSearch] = useState("");
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState("");

  useEffect(() => {
    loadSavedCharts().then(setSavedCharts).catch(() => setSavedCharts([]));
  }, []);

  useEffect(() => {
    const q = form.cityQuery.trim();
    if (q.length < 2 || form.city?.name === q) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCityLoading(true);
      setCityError("");
      try {
        const response = await fetch(`/api/geo/search?q=${encodeURIComponent(q)}&limit=8`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "City search failed");
        }
        setCityResults(payload.results ?? []);
      } catch (error) {
        if (!controller.signal.aborted) {
          setCityError(error instanceof Error ? error.message : "City search failed");
        }
      } finally {
        if (!controller.signal.aborted) {
          setCityLoading(false);
        }
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [form.cityQuery, form.city?.name]);

  async function submitKundli(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    if (!form.city) {
      setSubmitError("Select a city from search so the chart uses verified coordinates and timezone.");
      return;
    }

    const [year, month, day] = form.date.split("-").map(Number);
    const [hour, minute] = form.time.split(":").map(Number);
    const lat = form.manualCoordinates && form.manualLat.trim() ? Number(form.manualLat) : form.city.lat;
    const lng = form.manualCoordinates && form.manualLng.trim() ? Number(form.manualLng) : form.city.lng;
    const timezone = form.timezoneOverride.trim() || form.city.timezone;

    setSubmitting(true);
    try {
      const response = await fetch("/api/kundli", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birth: {
            label: form.name,
            year,
            month,
            day,
            hour,
            minute,
            second: Number(form.seconds) || 0,
            gender: form.gender,
            city: form.city.name,
            lat,
            lng,
            tz_str: timezone,
            ayanamsha: form.ayanamsha,
            house_system: form.house_system,
            node_type: form.node_type,
          },
          options,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to calculate Kundli");
      }
      setResult(payload);
      setActiveTab("chart");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to calculate Kundli");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMatchError("");
    setMatching(true);
    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p1: birthPayload(matchP1),
          p2: birthPayload(matchP2),
          ayanamsha: form.ayanamsha,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to calculate match");
      }
      setMatchResult(payload);
    } catch (error) {
      setMatchError(error instanceof Error ? error.message : "Unable to calculate match");
    } finally {
      setMatching(false);
    }
  }

  async function saveCurrentChart() {
    if (!result) return;
    const now = new Date().toISOString();
    const saved: SavedChart = {
      id: crypto.randomUUID(),
      label: result.input.label,
      birth: form,
      options,
      settings,
      result,
      notes,
      createdAt: now,
      updatedAt: now,
    };
    await putSavedChart(saved);
    setSavedCharts(await loadSavedCharts());
  }

  async function deleteSavedChart(id: string) {
    await removeSavedChart(id);
    setSavedCharts(await loadSavedCharts());
  }

  function loadSavedChart(chart: SavedChart) {
    setForm(chart.birth);
    setOptions(chart.options);
    setSettings(chart.settings);
    setResult(chart.result);
    setNotes(chart.notes);
    setMode("birth");
    setActiveTab("chart");
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ form, options, settings, result, notes }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${result?.input.label ?? "kundli"}-chart.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fffaf0] text-stone-950">
      <header className="border-b border-[#e4c978] bg-[#8d1f1f] text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded bg-[#f6c85f] text-[#681414]">
              <Sun size={24} strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f8dea0]">
                Jyotish Desk
              </p>
              <h1 className="text-2xl font-semibold tracking-normal">Kundli Birth Chart</h1>
            </div>
          </div>
        </div>
      </header>

      <section className="border-b border-[#efd99d] bg-[#fff3cf]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-semibold text-[#681414]">
              Cast, interpret, match, save, and print client-ready Kundli reports.
            </h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-stone-700">
              The workspace now includes Varga charts, Shadbala, Ashtakavarga, doshas, rule-based readings,
              browser-only client records, and print-ready reports.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-[#efd99d] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 py-3 sm:px-6">
          <ModeButton active={mode === "birth"} icon={<Sun size={16} />} label="Birth Chart" onClick={() => setMode("birth")} />
          <ModeButton active={mode === "matching"} icon={<Users size={16} />} label="Kundli Matching" onClick={() => setMode("matching")} />
          <ModeButton active={mode === "saved"} icon={<Archive size={16} />} label="Saved Clients" onClick={() => setMode("saved")} />
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[390px_1fr]">
        <aside className="space-y-4">
          {mode === "birth" ? (
          <form onSubmit={submitKundli} className="rounded border border-[#e1c878] bg-white shadow-sm">
            <div className="border-b border-[#f0dfae] px-4 py-3">
              <div className="flex items-center gap-2 text-[#681414]">
                <CalendarDays size={18} />
                <h2 className="font-semibold">Birth Details</h2>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <label className="block">
                <span className="field-label">Client name</span>
                <input
                  className="field-input"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Client name"
                />
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="field-label">Date</span>
                  <input
                    className="field-input"
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm({ ...form, date: event.target.value })}
                    required
                  />
                </label>
                <label className="block">
                  <span className="field-label">Time</span>
                  <input
                    className="field-input"
                    type="time"
                    value={form.time}
                    onChange={(event) => setForm({ ...form, time: event.target.value })}
                    required
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="field-label">Seconds</span>
                  <input
                    className="field-input"
                    type="number"
                    min="0"
                    max="59"
                    value={form.seconds}
                    onChange={(event) => setForm({ ...form, seconds: event.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="field-label">Gender</span>
                  <select
                    className="field-input field-select"
                    value={form.gender}
                    onChange={(event) => setForm({ ...form, gender: event.target.value as BirthForm["gender"] })}
                  >
                    <option value="not_specified">Not specified</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>

              <div className="relative">
                <label className="block">
                  <span className="field-label">Birth place</span>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                      size={17}
                    />
                    <input
                      className="field-input field-input-with-icon"
                      value={form.cityQuery}
                      onChange={(event) => {
                        const cityQuery = event.target.value;
                        if (cityQuery.trim().length < 2) {
                          setCityResults([]);
                          setCityError("");
                        }
                        setForm({ ...form, cityQuery, city: null });
                      }}
                      placeholder="Search city or locality"
                      required
                    />
                    {cityLoading ? (
                      <LoaderCircle
                        className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#a53b21]"
                        size={17}
                      />
                    ) : null}
                  </div>
                </label>

                {cityResults.length > 0 ? (
                  <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded border border-[#dbbf70] bg-white shadow-lg">
                    {cityResults.map((city) => (
                      <button
                        key={`${city.name}-${city.lat}-${city.lng}`}
                        type="button"
                        className="flex w-full items-start gap-3 border-b border-stone-100 px-3 py-2 text-left last:border-0 hover:bg-[#fff3cf]"
                        onClick={() => {
                          setForm({
                            ...form,
                            city,
                            cityQuery: city.name,
                          });
                          setCityResults([]);
                        }}
                      >
                        <MapPin className="mt-0.5 shrink-0 text-[#8d1f1f]" size={16} />
                        <span>
                          <span className="block text-sm font-medium text-stone-950">
                            {city.name}
                            {city.district ? `, ${city.district}` : ""}
                          </span>
                          <span className="block text-xs text-stone-600">
                            {[city.state, city.country, city.timezone].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {cityError ? <p className="mt-2 text-xs text-[#a53b21]">{cityError}</p> : null}
                {form.city ? (
                  <div className="mt-2 rounded border border-[#ead596] bg-[#fffaf0] px-3 py-2 text-xs text-stone-700">
                    <div className="font-medium text-stone-950">
                      {form.city.name}, {form.city.country}
                    </div>
                    <div>
                      {form.city.lat.toFixed(4)}, {form.city.lng.toFixed(4)} · {form.city.timezone}
                    </div>
                  </div>
                ) : null}
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded border border-[#ecd89d] bg-[#fffaf0] px-3 py-2 text-sm">
                <span>Manual coordinates / timezone</span>
                <span className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={form.manualCoordinates}
                    onChange={(event) => setForm({ ...form, manualCoordinates: event.target.checked })}
                  />
                  <span className="h-5 w-9 rounded-full bg-stone-300 transition peer-checked:bg-[#a53b21]" />
                  <span className="absolute left-0.5 size-4 rounded-full bg-white transition peer-checked:translate-x-4" />
                </span>
              </label>

              {form.manualCoordinates ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="field-label">Latitude</span>
                    <input
                      className="field-input"
                      value={form.manualLat}
                      onChange={(event) => setForm({ ...form, manualLat: event.target.value })}
                      placeholder={form.city ? String(form.city.lat) : "28.6139"}
                    />
                  </label>
                  <label className="block">
                    <span className="field-label">Longitude</span>
                    <input
                      className="field-input"
                      value={form.manualLng}
                      onChange={(event) => setForm({ ...form, manualLng: event.target.value })}
                      placeholder={form.city ? String(form.city.lng) : "77.2090"}
                    />
                  </label>
                  <label className="block">
                    <span className="field-label">Timezone</span>
                    <input
                      className="field-input"
                      value={form.timezoneOverride}
                      onChange={(event) => setForm({ ...form, timezoneOverride: event.target.value })}
                      placeholder={form.city?.timezone ?? "Asia/Kolkata"}
                    />
                  </label>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="field-label">Ayanamsha</span>
                  <select
                    className="field-input field-select"
                    value={form.ayanamsha}
                    onChange={(event) =>
                      setForm({ ...form, ayanamsha: event.target.value as BirthForm["ayanamsha"] })
                    }
                  >
                    <option value="lahiri">Lahiri</option>
                    <option value="raman">Raman</option>
                    <option value="krishnamurti">KP</option>
                  </select>
                </label>
                <label className="block">
                  <span className="field-label">Houses</span>
                  <select
                    className="field-input field-select"
                    value={form.house_system}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        house_system: event.target.value as BirthForm["house_system"],
                      })
                    }
                  >
                    <option value="whole_sign">Whole</option>
                    <option value="equal">Equal</option>
                    <option value="placidus">Placidus</option>
                  </select>
                </label>
                <label className="block">
                  <span className="field-label">Nodes</span>
                  <select
                    className="field-input field-select"
                    value={form.node_type}
                    onChange={(event) =>
                      setForm({ ...form, node_type: event.target.value as BirthForm["node_type"] })
                    }
                  >
                    <option value="mean">Mean</option>
                    <option value="true">True</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="border-t border-[#f0dfae] p-4">
              <button
                type="submit"
                className="flex h-11 w-full items-center justify-center gap-2 rounded bg-[#8d1f1f] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#711818] disabled:cursor-not-allowed disabled:bg-stone-400"
                disabled={submitting}
              >
                {submitting ? <LoaderCircle className="animate-spin" size={18} /> : null}
                Generate Kundli
              </button>
              {submitError ? <p className="mt-3 text-sm text-[#a53b21]">{submitError}</p> : null}
            </div>
          </form>
          ) : null}

          {mode === "matching" ? (
            <MatchPanel
              p1={matchP1}
              p2={matchP2}
              setP1={setMatchP1}
              setP2={setMatchP2}
              onSubmit={submitMatch}
              loading={matching}
              error={matchError}
            />
          ) : null}

          {mode === "saved" ? (
            <SavedSearchPanel search={savedSearch} setSearch={setSavedSearch} count={savedCharts.length} />
          ) : null}

          {mode === "birth" ? (
          <section className="rounded border border-[#e1c878] bg-white shadow-sm">
            <div className="border-b border-[#f0dfae] px-4 py-3">
              <div className="flex items-center gap-2 text-[#681414]">
                <Settings2 size={18} />
                <h2 className="font-semibold">Analysis Modules</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 p-4">
              {(Object.keys(options) as (keyof ReportOptions)[]).map((key) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between rounded border border-[#ecd89d] bg-[#fffaf0] px-3 py-2 text-sm"
                >
                  <span>{optionLabels[key]}</span>
                  <span className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={options[key]}
                      onChange={(event) => setOptions({ ...options, [key]: event.target.checked })}
                    />
                    <span className="h-5 w-9 rounded-full bg-stone-300 transition peer-checked:bg-[#a53b21]" />
                    <span className="absolute left-0.5 size-4 rounded-full bg-white transition peer-checked:translate-x-4" />
                  </span>
                </label>
              ))}
            </div>
          </section>
          ) : null}

          {mode === "birth" ? (
            <ChartSettingsPanel settings={settings} setSettings={setSettings} />
          ) : null}
        </aside>

        <section className="min-w-0 space-y-5">
          {mode === "birth" && result ? (
            <KundliDashboard
              result={result}
              settings={settings}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              notes={notes}
              setNotes={setNotes}
              onSave={saveCurrentChart}
              onExportJson={exportJson}
            />
          ) : null}
          {mode === "birth" && !result ? (
            <EmptyState />
          ) : null}
          {mode === "matching" ? <MatchingDashboard result={matchResult} /> : null}
          {mode === "saved" ? (
            <SavedClientsView
              charts={savedCharts}
              search={savedSearch}
              onLoad={loadSavedChart}
              onDelete={deleteSavedChart}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="grid min-h-[620px] place-items-center rounded border border-[#e1c878] bg-white p-8 text-center shadow-sm">
      <div className="max-w-lg">
        <div className="mx-auto flex size-16 items-center justify-center rounded bg-[#fff3cf] text-[#8d1f1f]">
          <Moon size={30} />
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-[#681414]">Enter birth details to cast the Kundli.</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Results will appear as a consultation dashboard with a North Indian chart, planet table,
          active dasha stack, yoga highlights, strength metrics, divisional charts, and Panchang.
        </p>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-sm font-semibold ${
        active
          ? "border-[#8d1f1f] bg-[#8d1f1f] text-white"
          : "border-[#d8bd72] bg-[#fffaf0] text-[#681414] hover:bg-[#fff3cf]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ChartSettingsPanel({
  settings,
  setSettings,
}: {
  settings: ChartSettings;
  setSettings: (settings: ChartSettings) => void;
}) {
  return (
    <section className="rounded border border-[#e1c878] bg-white shadow-sm">
      <div className="border-b border-[#f0dfae] px-4 py-3">
        <div className="flex items-center gap-2 text-[#681414]">
          <Compass size={18} />
          <h2 className="font-semibold">Chart Settings</h2>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <label className="block">
          <span className="field-label">Chart style</span>
          <select
            className="field-input field-select"
            value={settings.style}
            onChange={(event) => setSettings({ ...settings, style: event.target.value as ChartSettings["style"] })}
          >
            <option value="north">North Indian</option>
            <option value="south">South Indian</option>
            <option value="east">East Indian</option>
          </select>
        </label>
        <div className="rounded border border-[#ecd89d] bg-[#fffaf0] px-3 py-2 text-xs text-stone-600">
          English report language · {chartDescriptions[settings.style]}
        </div>
      </div>
    </section>
  );
}

function MatchPanel({
  p1,
  p2,
  setP1,
  setP2,
  onSubmit,
  loading,
  error,
}: {
  p1: BirthForm;
  p2: BirthForm;
  setP1: (form: BirthForm) => void;
  setP2: (form: BirthForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded border border-[#e1c878] bg-white shadow-sm">
      <div className="border-b border-[#f0dfae] px-4 py-3">
        <div className="flex items-center gap-2 text-[#681414]">
          <Users size={18} />
          <h2 className="font-semibold">Kundli Matching</h2>
        </div>
      </div>
      <div className="space-y-4 p-4">
        <MiniBirthFields label="Person 1" form={p1} setForm={setP1} />
        <MiniBirthFields label="Person 2" form={p2} setForm={setP2} />
      </div>
      <div className="border-t border-[#f0dfae] p-4">
        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded bg-[#8d1f1f] px-4 text-sm font-semibold text-white shadow-sm disabled:bg-stone-400"
        >
          {loading ? <LoaderCircle className="animate-spin" size={18} /> : null}
          Calculate Match
        </button>
        {error ? <p className="mt-3 text-sm text-[#a53b21]">{error}</p> : null}
      </div>
    </form>
  );
}

function MiniBirthFields({
  label,
  form,
  setForm,
}: {
  label: string;
  form: BirthForm;
  setForm: (form: BirthForm) => void;
}) {
  return (
    <div className="rounded border border-[#ecd89d] bg-[#fffaf0] p-3">
      <h3 className="mb-3 font-semibold text-[#681414]">{label}</h3>
      <div className="space-y-3">
        <input className="field-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className="field-input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          <input className="field-input" type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} />
        </div>
        <input className="field-input" value={form.city?.name ?? form.cityQuery} onChange={(event) => setForm({ ...form, cityQuery: event.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className="field-input" value={form.manualLat || String(form.city?.lat ?? "")} onChange={(event) => setForm({ ...form, manualCoordinates: true, manualLat: event.target.value })} placeholder="Latitude" />
          <input className="field-input" value={form.manualLng || String(form.city?.lng ?? "")} onChange={(event) => setForm({ ...form, manualCoordinates: true, manualLng: event.target.value })} placeholder="Longitude" />
        </div>
        <input className="field-input" value={form.timezoneOverride || form.city?.timezone || ""} onChange={(event) => setForm({ ...form, timezoneOverride: event.target.value })} placeholder="Timezone" />
      </div>
    </div>
  );
}

function SavedSearchPanel({ search, setSearch, count }: { search: string; setSearch: (value: string) => void; count: number }) {
  return (
    <section className="rounded border border-[#e1c878] bg-white shadow-sm">
      <div className="border-b border-[#f0dfae] px-4 py-3">
        <div className="flex items-center gap-2 text-[#681414]">
          <Archive size={18} />
          <h2 className="font-semibold">Saved Clients</h2>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <input className="field-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search saved charts" />
        <div className="rounded border border-[#ecd89d] bg-[#fffaf0] px-3 py-2 text-sm text-stone-600">
          {count} browser-saved chart{count === 1 ? "" : "s"}
        </div>
      </div>
    </section>
  );
}

function KundliDashboard({
  result,
  settings,
  activeTab,
  setActiveTab,
  notes,
  setNotes,
  onSave,
  onExportJson,
}: {
  result: KundliResult;
  settings: ChartSettings;
  activeTab: ResultTab;
  setActiveTab: (tab: ResultTab) => void;
  notes: string;
  setNotes: (notes: string) => void;
  onSave: () => void;
  onExportJson: () => void;
}) {
  const planets = result.chart?.planets ?? [];
  const houses = result.chart?.houses ?? [];
  const asc = result.chart?.ascendant;
  const panchang = result.panchang ?? {};
  const errors = result.errors ?? {};
  const d1Chart = { division: 1, name: "Rashi", ascendant: result.chart?.ascendant, planets, houses };
  const d9Chart = getVargaChart(result.vargas, "D9");

  return (
    <>
      <section className="min-w-0 rounded border border-[#e1c878] bg-white shadow-sm">
        <div className="grid gap-4 border-b border-[#f0dfae] p-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-[#681414]">{result.input.label}</h2>
              <span className="rounded bg-[#fff3cf] px-2 py-1 text-xs font-semibold text-[#8d1f1f]">
                {asc?.sign ?? "Ascendant"} Lagna
              </span>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600">
              <span className="inline-flex items-center gap-1">
                <MapPin size={15} /> {result.input.city}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 size={15} /> {result.input.timezone}
              </span>
              <span className="inline-flex items-center gap-1">
                <Compass size={15} /> {result.input.lat.toFixed(4)}, {result.input.lng.toFixed(4)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded border border-[#caa24d] bg-[#fffaf0] px-4 text-sm font-semibold text-[#681414] hover:bg-[#fff3cf]"
          >
            <Download size={17} />
            Print
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-[#f0dfae] px-4 py-3">
          {resultTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded border px-3 py-2 text-sm font-semibold ${
                activeTab === tab.key
                  ? "border-[#8d1f1f] bg-[#8d1f1f] text-white"
                  : "border-[#d8bd72] bg-[#fffaf0] text-[#681414] hover:bg-[#fff3cf]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {Object.keys(errors).length > 0 ? (
        <section className="rounded border border-[#d98f6b] bg-[#fff4ed] p-4 text-sm text-[#8a2a13]">
          <div className="font-semibold">Some modules did not return data</div>
          <div className="mt-2 grid gap-1">
            {Object.entries(errors).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium">{key}:</span> {value}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "chart" ? (
        <>
          <div className="grid items-start gap-5 xl:grid-cols-2">
            <ChartRenderer chart={d1Chart} settings={settings} title="D1 Rashi" />
            {d9Chart ? (
              <ChartRenderer chart={d9Chart} settings={settings} title="D9 Navamsha" />
            ) : (
              <MutedMessage label="D9 Navamsha was not returned by the Vargas endpoint." />
            )}
          </div>
          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <div className="grid rounded border border-[#ecd89d] bg-[#fffdf7] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:grid-cols-2">
              <MetricCard label="Lagna" value={asc?.sign ?? "N/A"} detail={formatDegree(asc?.degree)} />
              <MetricCard label="Nakshatra" value={asc?.nakshatra?.name ?? "N/A"} detail={asc?.nakshatra?.pada ? `Pada ${asc.nakshatra.pada}` : "Ascendant"} />
              <MetricCard label="Sade Sati" value={result.chart?.sade_sati?.active ? "Active" : "Not active"} detail={result.chart?.sade_sati?.phase ?? result.chart?.sade_sati?.description ?? "Saturn context"} />
              <MetricCard label="Ruleset" value={String(result.chart?.metadata?.ayanamsha ?? "lahiri")} detail={humanize(String(result.chart?.metadata?.house_system ?? "whole_sign"))} />
            </div>
            <ChartContext planets={planets} metadata={result.chart?.metadata} />
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            <DataPanel title="Strength" icon={<Activity size={18} />}>
              <StrengthView strength={result.strength} />
            </DataPanel>
            <DataPanel title="Dasha Snapshot" icon={<Activity size={18} />}>
              <DashaView dasha={result.dasha} />
            </DataPanel>
            <DataPanel title="Yoga Snapshot" icon={<Sparkles size={18} />}>
              <YogaView yogas={result.yogas} />
            </DataPanel>
          </div>
          <DataPanel title="Report Actions" icon={<FileText size={18} />}>
            <ReportActions result={result} notes={notes} setNotes={setNotes} onSave={onSave} onExportJson={onExportJson} />
          </DataPanel>
        </>
      ) : null}

      {activeTab === "planets" ? (
        <div className="grid gap-5">
          <DataPanel title="Detailed Planetary Calculations" icon={<Sun size={18} />}>
            <PlanetDetails planets={planets} houses={houses} />
          </DataPanel>
          <DataPanel title="Bhava / Chalit Reference" icon={<Compass size={18} />}>
            <BhavaTable houses={houses} planets={planets} />
          </DataPanel>
        </div>
      ) : null}

      {activeTab === "panchang" ? (
        <DataPanel title="Panchang" icon={<CalendarDays size={18} />}>
          {result.panchang ? (
            <div className="grid gap-3">
              <InfoRow label="Weekday" value={objectPath(panchang, "weekday.name")} />
              <InfoRow label="Tithi" value={objectPath(panchang, "request_time_panchang.tithi.name") ?? objectPath(panchang, "tithi.name")} />
              <InfoRow label="Nakshatra" value={objectPath(panchang, "request_time_panchang.nakshatra.name") ?? objectPath(panchang, "nakshatra.name")} />
              <InfoRow label="Yoga" value={objectPath(panchang, "request_time_panchang.yoga.name") ?? objectPath(panchang, "yoga.name")} />
              <InfoRow label="Rahu Kalam" value={formatRahu(panchang)} />
              <InfoRow label="Sunrise" value={String(panchang.sunrise ?? "N/A")} />
            </div>
          ) : (
            <MutedMessage label="Panchang module is off." />
          )}
        </DataPanel>
      ) : null}

      {activeTab === "dasha" ? (
        <DataPanel title="Active Dasha" icon={<Activity size={18} />}>
          <DashaView dasha={result.dasha} />
        </DataPanel>
      ) : null}

      {activeTab === "yogas" ? (
        <DataPanel title="Yoga Highlights" icon={<Sparkles size={18} />}>
          <YogaView yogas={result.yogas} />
        </DataPanel>
      ) : null}

      {activeTab === "vargas" ? (
        <DataPanel title="Divisional Charts" icon={<Compass size={18} />}>
          <VargasView vargas={result.vargas} settings={settings} />
        </DataPanel>
      ) : null}

      {activeTab === "predictions" ? (
        <DataPanel title="Rule-Based Interpretations" icon={<BookOpen size={18} />}>
          <PredictionsView result={result} />
        </DataPanel>
      ) : null}

      {activeTab === "remedies" ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <DataPanel title="Dosha Detection" icon={<Activity size={18} />}>
            <DoshaView result={result} />
          </DataPanel>
          <DataPanel title="Remedy Notes" icon={<BookOpen size={18} />}>
            <RemediesView result={result} />
          </DataPanel>
        </div>
      ) : null}
    </>
  );
}

function getChartPlanetTokens(planets: Planet[], includeAscendant = false) {
  return [
    ...(includeAscendant ? ["Asc"] : []),
    ...planets.map((planet) => planetShort[planet.name] ?? planet.name.slice(0, 2)),
  ];
}

function splitChartPlanetLines(tokens: string[], maxTokensPerLine = 3) {
  if (!tokens.length) return [];
  const lines: string[] = [];
  for (let index = 0; index < tokens.length; index += maxTokensPerLine) {
    lines.push(tokens.slice(index, index + maxTokensPerLine).join(" "));
  }
  return lines;
}

function ChartHouseLabel({
  x,
  y,
  label,
  planetTokens,
  anchor = "middle",
  labelSize = 3,
  planetSize = 2.75,
  maxTokensPerLine = 3,
}: {
  x: number;
  y: number;
  label: string;
  planetTokens: string[];
  anchor?: "start" | "middle" | "end";
  labelSize?: number;
  planetSize?: number;
  maxTokensPerLine?: number;
}) {
  const planetLines = splitChartPlanetLines(planetTokens, maxTokensPerLine);
  const labelY = planetLines.length > 1 ? y - 4.8 : y - 3.4;
  const planetStartY = planetLines.length > 1 ? y - 0.4 : y + 2;

  return (
    <g className="pointer-events-none">
      <text
        x={x}
        y={labelY}
        textAnchor={anchor}
        dominantBaseline="middle"
        paintOrder="stroke"
        stroke="#fffdf7"
        strokeWidth="0.9"
        strokeLinejoin="round"
        className="fill-[#8d1f1f] font-bold"
        style={{ fontSize: labelSize }}
      >
        {label}
      </text>
      {planetLines.map((line, index) => (
        <text
          key={`${line}-${index}`}
          x={x}
          y={planetStartY + index * 3.5}
          textAnchor={anchor}
          dominantBaseline="middle"
          paintOrder="stroke"
          stroke="#fffdf7"
          strokeWidth="0.95"
          strokeLinejoin="round"
          className="fill-stone-950 font-semibold"
          style={{ fontSize: planetSize }}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function NorthIndianChart({
  planets,
  houses,
  ascendantSign,
  title = "Rashi Chart",
  subtitle = "North Indian layout",
}: {
  planets: Planet[];
  houses: House[];
  ascendantSign?: number;
  title?: string;
  subtitle?: string;
}) {
  const planetByHouse = new Map<number, Planet[]>();
  planets.forEach((planet) => {
    if (!planet.house) return;
    planetByHouse.set(planet.house, [...(planetByHouse.get(planet.house) ?? []), planet]);
  });

  const signByHouse = new Map<number, number | undefined>();
  houses.forEach((house) => signByHouse.set(house.house, house.sign_id));

  return (
    <div className="min-w-0 overflow-hidden rounded border border-[#d7b860] bg-[#fffaf0] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[#681414]">{title}</h3>
          <p className="text-xs text-stone-600">{subtitle}</p>
        </div>
        <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-[#8d1f1f]">
          D1
        </span>
      </div>
      <svg viewBox="0 0 100 100" role="img" aria-label="North Indian Kundli chart" className="aspect-square w-full max-w-full">
        <rect x="1" y="1" width="98" height="98" fill="#fffdf7" stroke="#8d1f1f" strokeWidth="0.8" />
        <path
          d="M1 1 L99 99 M99 1 L1 99 M50 1 L99 50 L50 99 L1 50 Z"
          fill="none"
          stroke="#c08a2c"
          strokeWidth="0.7"
        />
        <path d="M1 1 L50 50 L99 1 M99 99 L50 50 L1 99" fill="none" stroke="#c08a2c" strokeWidth="0.55" />
        {Array.from({ length: 12 }, (_, index) => index + 1).map((house) => {
          const coord = houseCoordinates[house];
          const housePlanets = planetByHouse.get(house) ?? [];
          const sign = signByHouse.get(house) ?? (house === 1 ? ascendantSign : undefined);
          const label = `${house}${sign ? ` · ${signGlyphs[sign]}` : ""}`;
          return (
            <ChartHouseLabel
              key={house}
              x={coord.x}
              y={coord.y}
              label={label}
              planetTokens={getChartPlanetTokens(housePlanets, house === 1)}
            />
          );
        })}
      </svg>
    </div>
  );
}

function ChartRenderer({
  chart,
  settings,
  title,
}: {
  chart: {
    division?: number;
    name?: string;
    ascendant?: { sign?: string; sign_id?: number } | undefined;
    planets?: Planet[];
    houses?: House[];
  };
  settings: ChartSettings;
  title: string;
}) {
  const planets = chart.planets ?? [];
  const houses = chart.houses ?? [];
  if (settings.style === "north") {
    return <NorthIndianChart planets={planets} houses={houses} ascendantSign={chart.ascendant?.sign_id} title={title} subtitle={chart.name ?? chartDescriptions[settings.style]} />;
  }
  if (settings.style === "south") {
    return <SouthIndianChart chart={chart} title={title} />;
  }
  return <EastIndianChart chart={chart} title={title} />;
}

function SouthIndianChart({
  chart,
  title,
}: {
  chart: {
    division?: number;
    name?: string;
    ascendant?: { sign?: string; sign_id?: number } | undefined;
    planets?: Planet[];
    houses?: House[];
  };
  title: string;
}) {
  const planets = chart.planets ?? [];
  const ascSign = chart.ascendant?.sign_id;
  const signToHouse = new Map<number, number>();
  (chart.houses ?? []).forEach((house) => {
    if (house.sign_id) signToHouse.set(house.sign_id, house.house);
  });

  return (
    <div className="min-w-0 overflow-hidden rounded border border-[#d7b860] bg-[#fffaf0] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[#681414]">{title}</h3>
          <p className="text-xs text-stone-600">South Indian fixed-sign layout</p>
        </div>
        <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-[#8d1f1f]">
          D{chart.division ?? 1}
        </span>
      </div>
      <svg viewBox="0 0 100 100" role="img" aria-label="South Indian Kundli chart" className="aspect-square w-full max-w-full">
        <rect x="1" y="1" width="98" height="98" fill="#fffdf7" stroke="#8d1f1f" strokeWidth="0.8" />
        {[25, 50, 75].map((value) => (
          <g key={`grid-${value}`}>
            <line x1={value} y1="1" x2={value} y2="99" stroke="#c08a2c" strokeWidth="0.45" />
            <line x1="1" y1={value} x2="99" y2={value} stroke="#c08a2c" strokeWidth="0.45" />
          </g>
        ))}
        <rect x="26" y="26" width="48" height="48" fill="#fffaf0" stroke="#c08a2c" strokeWidth="0.5" />
        <text x="50" y="47" textAnchor="middle" className="fill-[#681414] text-[4px] font-bold">
          South
        </text>
        <text x="50" y="53" textAnchor="middle" className="fill-stone-500 text-[2.8px]">
          Fixed signs
        </text>
        {Object.entries(southSignCells).map(([signIdText, cell]) => {
          const signId = Number(signIdText);
          const house = signToHouse.get(signId);
          const signPlanets = planets.filter((planet) => planet.sign_id === signId);
          const isAsc = ascSign === signId;
          const label = `${house ? `${house} · ` : ""}${signGlyphs[signId]}`;
          return (
            <g key={signId}>
              <rect
                x={cell.x + 1}
                y={cell.y + 1}
                width="23"
                height="23"
                fill={isAsc ? "#fff3cf" : "#fffdf7"}
                stroke={isAsc ? "#8d1f1f" : "transparent"}
                strokeWidth="0.8"
              />
              <ChartHouseLabel
                x={cell.x + 12.5}
                y={cell.y + 11.3}
                label={label}
                planetTokens={getChartPlanetTokens(signPlanets, isAsc)}
                labelSize={2.8}
                planetSize={2.45}
                maxTokensPerLine={2}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function EastIndianChart({
  chart,
  title,
}: {
  chart: {
    division?: number;
    name?: string;
    ascendant?: { sign?: string; sign_id?: number } | undefined;
    planets?: Planet[];
    houses?: House[];
  };
  title: string;
}) {
  const planets = chart.planets ?? [];
  const houses = chart.houses ?? [];
  const planetByHouse = new Map<number, Planet[]>();
  planets.forEach((planet) => {
    if (!planet.house) return;
    planetByHouse.set(planet.house, [...(planetByHouse.get(planet.house) ?? []), planet]);
  });
  const signByHouse = new Map<number, number | undefined>();
  houses.forEach((house) => signByHouse.set(house.house, house.sign_id));

  return (
    <div className="min-w-0 overflow-hidden rounded border border-[#d7b860] bg-[#fffaf0] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[#681414]">{title}</h3>
          <p className="text-xs text-stone-600">East Indian square-diamond layout</p>
        </div>
        <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-[#8d1f1f]">
          D{chart.division ?? 1}
        </span>
      </div>
      <svg viewBox="0 0 100 100" role="img" aria-label="East Indian Kundli chart" className="aspect-square w-full max-w-full">
        <rect x="1" y="1" width="98" height="98" fill="#fffdf7" stroke="#8d1f1f" strokeWidth="0.9" />
        <g stroke="#c08a2c" strokeWidth="0.44" opacity="0.82">
          <line x1="1" y1="33.33" x2="99" y2="33.33" />
          <line x1="1" y1="66.66" x2="99" y2="66.66" />
          <line x1="33.33" y1="1" x2="33.33" y2="99" />
          <line x1="66.66" y1="1" x2="66.66" y2="99" />
          <path d="M33.33 1 L66.66 33.33 L33.33 66.66 L1 33.33 Z" fill="none" />
          <path d="M66.66 1 L99 33.33 L66.66 66.66 L33.33 33.33 Z" fill="none" />
          <path d="M33.33 33.33 L66.66 66.66 L33.33 99 L1 66.66 Z" fill="none" />
          <path d="M66.66 33.33 L99 66.66 L66.66 99 L33.33 66.66 Z" fill="none" />
        </g>
        {Array.from({ length: 12 }, (_, index) => index + 1).map((house) => {
          const coord = eastHouseCoordinates[house];
          const housePlanets = planetByHouse.get(house) ?? [];
          const sign = signByHouse.get(house);
          const label = `${house}${sign ? ` · ${signGlyphs[sign]}` : ""}`;
          return (
            <ChartHouseLabel
              key={house}
              x={coord.x}
              y={coord.y}
              label={label}
              planetTokens={getChartPlanetTokens(housePlanets, house === 1)}
              anchor={eastHouseAnchors[house] ?? "middle"}
              labelSize={2.85}
              planetSize={2.5}
              maxTokensPerLine={2}
            />
          );
        })}
      </svg>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-h-28 border-b border-r border-[#f0dfae] bg-[#fffaf0] p-4 last:border-r-0 sm:[&:nth-child(2n)]:border-r-0 sm:[&:nth-child(n+3)]:border-b-0">
      <div className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-stone-500">{label}</div>
      <div className="mt-3 text-2xl font-semibold leading-7 text-[#681414]">{value}</div>
      <div className="mt-2 min-h-5 text-sm leading-5 text-stone-600">{detail}</div>
    </div>
  );
}

function ChartContext({
  planets,
  metadata,
}: {
  planets: Planet[];
  metadata?: Record<string, unknown>;
}) {
  const moon = planets.find((planet) => planet.name === "Moon");
  const sun = planets.find((planet) => planet.name === "Sun");
  const saturn = planets.find((planet) => planet.name === "Saturn");

  return (
    <div className="rounded border border-[#ecd89d] bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#681414]">
        <Moon size={16} />
        Chart Context
      </div>
      <div className="grid gap-2 text-sm">
        <InfoRow label="Moon" value={formatPlanetContext(moon)} />
        <InfoRow label="Sun" value={formatPlanetContext(sun)} />
        <InfoRow label="Saturn" value={saturn?.house ? `${saturn.sign}, house ${saturn.house}` : saturn?.sign} />
        <InfoRow label="Timezone" value={String(metadata?.timezone_used ?? "N/A")} />
      </div>
    </div>
  );
}

function ReportActions({
  result,
  notes,
  setNotes,
  onSave,
  onExportJson,
}: {
  result: KundliResult;
  notes: string;
  setNotes: (notes: string) => void;
  onSave: () => void;
  onExportJson: () => void;
}) {
  const shareUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}${window.location.pathname}?chart=${encodeURIComponent(
          btoa(JSON.stringify({ label: result.input.label, city: result.input.city })),
        )}`;
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
      <label className="block">
        <span className="field-label">Consultation notes</span>
        <textarea
          className="min-h-28 w-full rounded border border-[#d8bd72] bg-[#fffdf7] p-3 text-sm outline-none focus:border-[#8d1f1f]"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Private notes are saved only in this browser."
        />
      </label>
      <div className="grid content-start gap-2">
        <button type="button" onClick={onSave} className="inline-flex h-10 items-center justify-center gap-2 rounded bg-[#8d1f1f] px-4 text-sm font-semibold text-white">
          <Save size={16} /> Save chart
        </button>
        <button type="button" onClick={onExportJson} className="inline-flex h-10 items-center justify-center gap-2 rounded border border-[#caa24d] bg-[#fffaf0] px-4 text-sm font-semibold text-[#681414]">
          <Download size={16} /> Export JSON
        </button>
        <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center justify-center gap-2 rounded border border-[#caa24d] bg-[#fffaf0] px-4 text-sm font-semibold text-[#681414]">
          <FileText size={16} /> Save as PDF
        </button>
        <div className="max-w-72 rounded border border-[#ecd89d] bg-[#fffaf0] p-2 text-xs text-stone-600">
          Share input link: {shareUrl ? <span className="break-all">{shareUrl}</span> : "Available in browser"}
        </div>
      </div>
    </div>
  );
}

function PlanetDetails({ planets, houses }: { planets: Planet[]; houses: House[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table min-w-[980px]">
        <thead>
          <tr>
            <th>Graha</th>
            <th>Sign</th>
            <th>DMS</th>
            <th>House</th>
            <th>Rashi Lord</th>
            <th>Nakshatra Lord</th>
            <th>House Lord</th>
            <th>Motion</th>
            <th>Combust</th>
          </tr>
        </thead>
        <tbody>
          {planets.map((planet) => {
            const house = houses.find((item) => item.house === planet.house);
            return (
              <tr key={planet.name}>
                <td className="font-semibold text-stone-950">{planet.name}</td>
                <td>{planet.sign ?? "N/A"}</td>
                <td>{formatDms(planet.degree_in_sign ?? planet.absolute_degree)}</td>
                <td>{planet.house ?? "N/A"}</td>
                <td>{planet.sign ? signLords[planet.sign] ?? "N/A" : "N/A"}</td>
                <td>{planet.nakshatra_lord ?? "N/A"}</td>
                <td>{house?.sign ? signLords[house.sign] ?? "N/A" : "N/A"}</td>
                <td>{planet.is_retrograde ? "Retrograde" : "Direct"}</td>
                <td>{combustStatus(planet, planets)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BhavaTable({ houses, planets }: { houses: House[]; planets: Planet[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table min-w-[720px]">
        <thead>
          <tr>
            <th>Bhava</th>
            <th>Sign</th>
            <th>Lord</th>
            <th>Cusp</th>
            <th>Occupants</th>
          </tr>
        </thead>
        <tbody>
          {houses.map((house) => (
            <tr key={house.house}>
              <td className="font-semibold text-stone-950">{house.house}</td>
              <td>{house.sign ?? "N/A"}</td>
              <td>{house.sign ? signLords[house.sign] ?? "N/A" : "N/A"}</td>
              <td>{formatDegree(house.degree_cusp ?? undefined)}</td>
              <td>{planets.filter((planet) => planet.house === house.house).map((planet) => planet.name).join(", ") || "None"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PredictionsView({ result }: { result: KundliResult }) {
  const planets = result.chart?.planets ?? [];
  const asc = result.chart?.ascendant;
  const moon = planets.find((planet) => planet.name === "Moon");
  const activeDashas = arrayValue(result.dasha?.active_periods);
  const sections = [
    {
      title: "Ascendant Reading",
      text: `${asc?.sign ?? "The ascendant"} Lagna emphasizes the life path through ${asc?.nakshatra?.name ?? "the birth nakshatra"}. The first priority is to judge the Lagna lord, Moon, and current dasha together before making a prediction.`,
    },
    {
      title: "Moon and Mind",
      text: `Moon in ${moon?.sign ?? "its sign"} ${moon?.nakshatra ? `in ${moon.nakshatra}` : ""} shows the emotional lens, habits, and daily decision rhythm. Pada ${moon?.pada ?? "N/A"} refines the temperament.`,
    },
    ...planets.slice(0, 7).map((planet) => ({
      title: `${planet.name} in ${planet.sign}`,
      text: `${planet.name} placed in house ${planet.house ?? "N/A"} gives results through ${planet.sign ?? "its rashi"} themes. ${planet.is_retrograde ? "Retrograde motion asks for repeated review before the planet matures." : "Direct motion makes the result easier to express outwardly."}`,
    })),
    ...activeDashas.map((period) => ({
      title: `${String(period.level ?? "Dasha")} ${String(period.lord ?? "")}`,
      text: `This period runs from ${String(period.start ?? "N/A")} to ${String(period.end ?? "N/A")}. Judge the lord's sign, house, strength, and yogas before timing specific events.`,
    })),
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {sections.map((section) => (
        <div key={section.title} className="rounded border border-[#ecd89d] bg-[#fffaf0] p-4">
          <h3 className="font-semibold text-[#681414]">{section.title}</h3>
          <p className="mt-2 text-sm leading-6 text-stone-700">{section.text}</p>
        </div>
      ))}
    </div>
  );
}

function DoshaView({ result }: { result: KundliResult }) {
  const yogas = [...arrayValue(result.yogas?.active_yogas), ...arrayValue(result.yogas?.yogas)];
  const doshas = yogas.filter((row) => String(row.type ?? row.category ?? "").toLowerCase().includes("dosha") || String(row.category ?? "").toLowerCase().includes("affliction"));
  const sadeSati = result.chart?.sade_sati;
  return (
    <div className="space-y-3">
      {doshas.length ? doshas.slice(0, 8).map((dosha) => (
        <div key={String(dosha.id ?? dosha.name)} className="rounded border border-[#ecd89d] bg-[#fffaf0] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-[#681414]">{String(dosha.name ?? "Dosha")}</div>
              <div className="mt-1 text-xs text-stone-600">{String(dosha.description ?? "Detected from yoga endpoint.")}</div>
            </div>
            <span className="rounded bg-[#fff3cf] px-2 py-1 text-xs font-semibold text-[#8d1f1f]">{String(dosha.strength ?? "Review")}</span>
          </div>
        </div>
      )) : <MutedMessage label="No active dosha combinations returned by the yoga endpoint." />}
      <InfoRow label="Sade Sati" value={sadeSati?.active ? `Active · ${sadeSati.phase ?? "phase not specified"}` : "Not active"} />
    </div>
  );
}

function RemediesView({ result }: { result: KundliResult }) {
  const yogas = [...arrayValue(result.yogas?.active_yogas), ...arrayValue(result.yogas?.yogas)];
  const activeDoshaNames = yogas.filter((row) => row.active !== false).map((row) => String(row.name ?? ""));
  const remedies = [
    "Use remedies as supportive spiritual practice, not as a substitute for professional medical, legal, or financial advice.",
    result.chart?.sade_sati?.active ? "For Sade Sati, emphasize Saturn discipline: routine, service, accountability, and patience." : "Saturn pressure is not flagged by Sade Sati; still review Saturn's house and strength.",
    activeDoshaNames.some((name) => name.toLowerCase().includes("manglik")) ? "For Manglik Dosha, verify compatibility and counsel patience in conflict response." : "Manglik Dosha is not a primary active warning in the returned yoga data.",
    "For weak planets, strengthen behavior first: consistency for Saturn, clarity for Sun, emotional hygiene for Moon, and ethical speech for Mercury.",
  ];
  return (
    <div className="space-y-2">
      {remedies.map((item, index) => (
        <div key={item} className="flex gap-2 rounded border border-[#ecd89d] bg-[#fffaf0] p-3 text-sm text-stone-700">
          <span className="font-semibold text-[#681414]">{index + 1}.</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function MatchingDashboard({ result }: { result: MatchResult | null }) {
  if (!result?.match) {
    return (
      <div className="grid min-h-[620px] place-items-center rounded border border-[#e1c878] bg-white p-8 text-center shadow-sm">
        <div className="max-w-lg">
          <div className="mx-auto flex size-16 items-center justify-center rounded bg-[#fff3cf] text-[#8d1f1f]">
            <Users size={30} />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-[#681414]">Enter two birth profiles to calculate matching.</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Results include Ashtakoota score, Nadi, Bhakoot, Mangal compatibility, and a print-ready summary.
          </p>
        </div>
      </div>
    );
  }

  const match = result.match;
  const scores = recordValue(match.scores) ?? recordValue(match.details) ?? {};
  const doshas = recordValue(match.doshas);
  return (
    <div className="space-y-5">
      <section className="rounded border border-[#e1c878] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-[#681414]">
              {result.input?.p1?.label ?? "Person 1"} + {result.input?.p2?.label ?? "Person 2"}
            </h2>
            <p className="mt-1 text-sm text-stone-600">{String(match.recommendation ?? "Compatibility report")}</p>
          </div>
          <div className="rounded bg-[#fff3cf] px-4 py-3 text-center">
            <div className="text-3xl font-semibold text-[#8d1f1f]">{String(match.total_score ?? "N/A")}</div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-600">of {String(match.max_score ?? 36)}</div>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-stone-700">{String(match.interpretation ?? "Review individual koota scores and dosha notes before final judgment.")}</p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <DataPanel title="Ashtakoota Scores" icon={<Users size={18} />}>
          <div className="grid gap-2">
            {Object.entries(scores).map(([key, value]) => {
              const row = recordValue(value) ?? {};
              return <InfoRow key={key} label={humanize(key)} value={`${String(row.score ?? "N/A")} / ${String(row.max ?? "N/A")}`} />;
            })}
          </div>
        </DataPanel>
        <DataPanel title="Matching Doshas" icon={<Activity size={18} />}>
          {doshas ? (
            <div className="grid gap-3">
              {Object.entries(doshas).map(([key, value]) => (
                <InfoRow key={key} label={humanize(key)} value={typeof value === "object" ? JSON.stringify(value) : String(value)} />
              ))}
            </div>
          ) : (
            <MutedMessage label="No dosha data returned for this match." />
          )}
        </DataPanel>
      </div>

      <DataPanel title="Match PDF" icon={<FileText size={18} />}>
        <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center justify-center gap-2 rounded bg-[#8d1f1f] px-4 text-sm font-semibold text-white">
          <FileText size={16} /> Save matching report as PDF
        </button>
      </DataPanel>
    </div>
  );
}

function SavedClientsView({
  charts,
  search,
  onLoad,
  onDelete,
}: {
  charts: SavedChart[];
  search: string;
  onLoad: (chart: SavedChart) => void;
  onDelete: (id: string) => void;
}) {
  const filtered = charts.filter((chart) =>
    `${chart.label} ${chart.result.input.city} ${chart.notes}`.toLowerCase().includes(search.toLowerCase()),
  );
  if (!filtered.length) {
    return <EmptyState />;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {filtered.map((chart) => (
        <div key={chart.id} className="rounded border border-[#e1c878] bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#681414]">{chart.label}</h3>
              <p className="mt-1 text-sm text-stone-600">{chart.result.input.city} · {new Date(chart.updatedAt).toLocaleString()}</p>
            </div>
            <button type="button" onClick={() => onDelete(chart.id)} className="rounded border border-[#d8bd72] p-2 text-[#8d1f1f]">
              <Trash2 size={16} />
            </button>
          </div>
          {chart.notes ? <p className="mt-3 line-clamp-3 text-sm text-stone-700">{chart.notes}</p> : null}
          <button type="button" onClick={() => onLoad(chart)} className="mt-4 inline-flex h-10 items-center justify-center rounded bg-[#8d1f1f] px-4 text-sm font-semibold text-white">
            Open chart
          </button>
        </div>
      ))}
    </div>
  );
}

function DataPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded border border-[#e1c878] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#f0dfae] px-4 py-3 text-[#681414]">
        {icon}
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function DashaView({ dasha }: { dasha?: Record<string, unknown> }) {
  if (!dasha) return <MutedMessage label="Dasha module is off." />;
  const active = arrayValue(dasha.active_periods);
  const timeline = arrayValue(dasha.timeline).slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {active.length ? (
          active.map((period, index) => (
            <div key={`${String(period.lord)}-${index}`} className="rounded border border-[#ecd89d] bg-[#fffaf0] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[#681414]">{String(period.level ?? "Period")}</span>
                <span className="rounded bg-white px-2 py-1 text-xs text-stone-600">
                  {percent(period.progress_fraction)}
                </span>
              </div>
              <div className="mt-1 text-lg font-semibold">{String(period.lord ?? "N/A")}</div>
              <div className="mt-1 text-xs text-stone-600">
                {String(period.start ?? "N/A")} to {String(period.end ?? "N/A")}
              </div>
            </div>
          ))
        ) : (
          <MutedMessage label="No active dasha periods returned." />
        )}
      </div>

      {timeline.length ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-stone-800">Mahadasha timeline</h3>
          <div className="space-y-2">
            {timeline.map((period, index) => (
              <div key={`${String(period.lord)}-${index}`} className="flex items-center gap-2 text-sm">
                <ChevronRight className="text-[#a53b21]" size={15} />
                <span className="font-medium">{String(period.lord ?? "N/A")}</span>
                <span className="text-stone-500">
                  {String(period.start ?? "")} - {String(period.end ?? "")}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function YogaView({ yogas }: { yogas?: Record<string, unknown> }) {
  if (!yogas) return <MutedMessage label="Yoga module is off." />;
  const rows = [
    ...arrayValue(yogas.active_yogas),
    ...arrayValue(yogas.yogas).filter((row) => row.active === true),
  ].slice(0, 6);

  if (!rows.length) {
    return <MutedMessage label="No active yogas were returned for this chart." />;
  }

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={`${String(row.id ?? row.name)}-${index}`} className="rounded border border-[#ecd89d] bg-[#fffaf0] p-3">
          <div className="flex items-start gap-2">
            <Check className="mt-0.5 shrink-0 text-[#1b7f56]" size={16} />
            <div>
              <div className="font-semibold text-[#681414]">{String(row.name ?? "Yoga")}</div>
              <div className="mt-1 text-xs leading-5 text-stone-600">
                {[row.category, row.type, row.strength].filter(Boolean).map(String).join(" · ") || "Active combination"}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StrengthView({ strength }: { strength?: Record<string, unknown> }) {
  if (!strength) return <MutedMessage label="Strength module is off." />;
  const shadbala = recordValue(strength.shadbala);
  const entries = Object.entries(shadbala ?? {})
    .map(([planet, value]) => ({ planet, metrics: recordValue(value) }))
    .filter((row): row is { planet: string; metrics: Record<string, unknown> } => Boolean(row.metrics))
    .slice(0, 7);
  const ashtakavarga = recordValue(strength.ashtakavarga);
  const sav = numberArray(ashtakavarga?.sarvashtakavarga ?? strength.sarvashtakavarga);
  const strongest = strongestHouse(sav);
  const weakest = weakestHouse(sav);

  return (
    <div className="space-y-4">
      {entries.length ? (
        <div className="space-y-3">
          {entries.map(({ planet, metrics }) => {
            const ratio = numberValue(metrics.ratio);
            const rupas = numberValue(metrics.shadbala_in_rupas);
            const minimum = numberValue(metrics.minimum_requirements);
            const status = strengthStatus(ratio);
            const width = ratio === null ? 18 : Math.min(100, Math.max(12, ratio * 72));

            return (
              <div key={planet} className="rounded border border-[#ecd89d] bg-[#fffaf0] p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#681414]">{planet}</div>
                    <div className="mt-1 text-xs leading-5 text-stone-600">
                      {formatNumber(rupas)} rupas / min {formatNumber(minimum)}
                    </div>
                  </div>
                  <span className={`rounded px-2 py-1 text-xs font-semibold ${status.className}`}>
                    {status.label}
                  </span>
                </div>
                <div className="mb-1 flex justify-between text-xs text-stone-600">
                  <span>Ratio</span>
                  <span className="font-semibold text-stone-800">{formatNumber(ratio)}</span>
                </div>
                <div className="h-2 rounded bg-[#f3e4bd]">
                  <div
                    className={`h-2 rounded ${status.barClassName}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <MutedMessage label="Shadbala strength data is unavailable for this chart." />
      )}
      {sav.length ? (
        <div className="rounded border border-[#ecd89d] bg-[#fffaf0] p-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-[#681414]">Sarvashtakavarga</div>
              <div className="mt-1 text-xs text-stone-600">
                Strongest H{strongest.house}: {strongest.value} · Weakest H{weakest.house}: {weakest.value}
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {sav.map((value, index) => (
              <div
                key={`sav-${index}`}
                className={`rounded border px-2 py-1 text-center text-xs ${
                  value === strongest.value
                    ? "border-[#1b7f56] bg-[#edf8f2] text-[#155f42]"
                    : value === weakest.value
                      ? "border-[#c77a45] bg-[#fff1e8] text-[#8a3d12]"
                      : "border-[#ead596] bg-white text-stone-700"
                }`}
              >
                <div className="font-semibold">H{index + 1}</div>
                <div>{value}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VargasView({ vargas, settings }: { vargas?: Record<string, unknown>; settings: ChartSettings }) {
  if (!vargas) return <MutedMessage label="Varga module is off." />;
  const charts = recordValue(vargas.vargas) ?? vargas;
  const preferred = ["D1", "D9", "D10", "D7", "D12", "D30", "D60"];
  const entries = Object.entries(charts)
    .filter(([, chart]) => typeof chart === "object" && chart !== null)
    .sort(([a], [b]) => preferred.indexOf(a) - preferred.indexOf(b));

  if (!entries.length) return <MutedMessage label="No divisional charts returned." />;

  return (
    <div className="grid gap-5">
      {entries.filter(([key]) => preferred.includes(key)).map(([key, chart]) => {
        const row = recordValue(chart) ?? {};
        return (
          <ChartRenderer
            key={key}
            chart={{
              division: Number(row.division) || Number(key.replace("D", "")),
              name: String(row.name ?? "Divisional chart"),
              ascendant: recordValue(row.ascendant) as { sign?: string; sign_id?: number } | undefined,
              planets: arrayValue(row.planets) as Planet[],
              houses: arrayValue(row.houses) as House[],
            }}
            settings={settings}
            title={`${key} ${String(row.name ?? "")}`}
          />
        );
      })}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f2e4bd] pb-2 text-sm last:border-0 last:pb-0">
      <span className="text-stone-500">{label}</span>
      <span className="text-right font-semibold text-stone-950">{String(value ?? "N/A")}</span>
    </div>
  );
}

function MutedMessage({ label }: { label: string }) {
  return <div className="rounded border border-dashed border-[#dbc075] bg-[#fffaf0] p-4 text-sm text-stone-600">{label}</div>;
}

function formatDegree(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return `${value.toFixed(2)} deg`;
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

function formatDms(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  const degrees = Math.floor(value);
  const minutesFloat = (value - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = Math.round((minutesFloat - minutes) * 60);
  return `${degrees}° ${minutes}' ${seconds}"`;
}

function combustStatus(planet: Planet, planets: Planet[]) {
  if (planet.name === "Sun") return "Source";
  const threshold = combustThresholds[planet.name];
  const sun = planets.find((item) => item.name === "Sun");
  if (!threshold || typeof planet.absolute_degree !== "number" || typeof sun?.absolute_degree !== "number") {
    return "N/A";
  }
  const distance = angularDistance(planet.absolute_degree, sun.absolute_degree);
  return distance <= threshold ? `Combust (${distance.toFixed(1)}°)` : "No";
}

function angularDistance(a: number, b: number) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function getVargaChart(vargas: Record<string, unknown> | undefined, key: string) {
  const charts = recordValue(vargas?.vargas) ?? vargas;
  const row = recordValue(charts?.[key]);
  if (!row) return null;
  return {
    division: Number(row.division) || Number(key.replace("D", "")),
    name: String(row.name ?? key),
    ascendant: recordValue(row.ascendant) as { sign?: string; sign_id?: number } | undefined,
    planets: arrayValue(row.planets) as Planet[],
    houses: arrayValue(row.houses) as House[],
  };
}

function birthPayload(form: BirthForm) {
  const [year, month, day] = form.date.split("-").map(Number);
  const [hour, minute] = form.time.split(":").map(Number);
  const lat = form.manualCoordinates && form.manualLat.trim() ? Number(form.manualLat) : (form.city?.lat ?? Number(form.manualLat));
  const lng = form.manualCoordinates && form.manualLng.trim() ? Number(form.manualLng) : (form.city?.lng ?? Number(form.manualLng));
  return {
    label: form.name,
    year,
    month,
    day,
    hour,
    minute,
    second: Number(form.seconds) || 0,
    city: form.city?.name ?? form.cityQuery,
    lat,
    lng,
    tz_str: form.timezoneOverride.trim() || form.city?.timezone || "AUTO",
  };
}

async function savedDb() {
  return openDB("kundli-chart-desk", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("charts")) {
        db.createObjectStore("charts", { keyPath: "id" });
      }
    },
  });
}

async function loadSavedCharts() {
  const db = await savedDb();
  const rows = await db.getAll("charts");
  return (rows as SavedChart[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function putSavedChart(chart: SavedChart) {
  const db = await savedDb();
  await db.put("charts", chart);
}

async function removeSavedChart(id: string) {
  const db = await savedDb();
  await db.delete("charts", id);
}

function percent(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "N/A";
  return `${Math.round(numeric * 100)}%`;
}

function numberValue(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function numberArray(value: unknown) {
  return Array.isArray(value)
    ? value.map(numberValue).filter((item): item is number => item !== null)
    : [];
}

function formatNumber(value: number | null) {
  if (value === null) return "N/A";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function strengthStatus(ratio: number | null) {
  if (ratio === null) {
    return {
      label: "Unknown",
      className: "bg-white text-stone-600",
      barClassName: "bg-stone-400",
    };
  }
  if (ratio >= 1.25) {
    return {
      label: "Strong",
      className: "bg-[#edf8f2] text-[#155f42]",
      barClassName: "bg-[#1b7f56]",
    };
  }
  if (ratio >= 1) {
    return {
      label: "Adequate",
      className: "bg-[#fff3cf] text-[#7a4b00]",
      barClassName: "bg-[#c08a2c]",
    };
  }
  return {
    label: "Needs attention",
    className: "bg-[#fff1e8] text-[#8a3d12]",
    barClassName: "bg-[#c77a45]",
  };
}

function strongestHouse(values: number[]) {
  return values.reduce(
    (best, value, index) => (value > best.value ? { house: index + 1, value } : best),
    { house: 1, value: values[0] ?? 0 },
  );
}

function weakestHouse(values: number[]) {
  return values.reduce(
    (best, value, index) => (value < best.value ? { house: index + 1, value } : best),
    { house: 1, value: values[0] ?? 0 },
  );
}

function formatRahu(value: Record<string, unknown>) {
  const rahu = recordValue(value.rahu_kalam);
  if (!rahu) return "N/A";
  return `${String(rahu.start ?? "N/A")} - ${String(rahu.end ?? "N/A")}`;
}

function formatPlanetContext(planet?: Planet) {
  if (!planet) return "N/A";
  const nakshatra = planet.nakshatra ? `, ${planet.nakshatra}` : "";
  const pada = planet.pada ? ` pada ${planet.pada}` : "";
  return `${planet.sign ?? "N/A"}${nakshatra}${pada}`;
}

function objectPath(source: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, source);
}

function arrayValue(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value.filter((item) => typeof item === "object" && item !== null) as Record<string, unknown>[]) : [];
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
