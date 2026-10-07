import { useState, useEffect, useRef } from "react";
import {
  Search,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Pill,
  Check,
  BookOpen,
  Clock3,
  Utensils,
  GlassWater,
  Info,
  Bookmark,
  ExternalLink,
  Download,
  X,
  HeartPulse,
  FileCheck2,
  ChevronRight,
  CircleHelp,
} from "lucide-react";
import {
  products,
  searchProducts,
  resolveGuidance,
  sources,
  guidance,
  coveredProducts,
} from "./catalogue";
import { claimsOf, type Claim, type Product, type Language } from "./domain";
import { ui, foodLabels, releaseLabels, formLabel } from "./i18n";
import { Methodology } from "./Methodology";
import "./styles.css";
function getIds(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value)
      ? value
          .filter(
            (x) => typeof x === "string" && products.some((p) => p.id === x),
          )
          .slice(0, 12)
      : [];
  } catch {
    return [];
  }
}
function persist(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage may be disabled; the app still works. */
  }
}
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    try {
      return localStorage.getItem("mg-language") === "bn" ? "bn" : "en";
    } catch {
      return "en";
    }
  });
  const t = ui[lang];
  const [query, setQuery] = useState("");
  const [browse, setBrowse] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [page, setPage] = useState(
    location.hash === "#methodology" ? "methodology" : "search",
  );
  const [favorites, setFavorites] = useState(() => getIds("mg-favorites"));
  const [recent, setRecent] = useState(() => getIds("mg-recent"));
  const [online, setOnline] = useState(navigator.onLine);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [installHelp, setInstallHelp] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.documentElement.lang = lang === "bn" ? "bn" : "en";
    persist("mg-language", lang);
  }, [lang]);
  useEffect(() => {
    const go = () => {
      setPage(location.hash === "#methodology" ? "methodology" : "search");
      setSelected(null);
      setConfirmed(false);
    };
    const net = () => setOnline(navigator.onLine);
    const prompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener("hashchange", go);
    window.addEventListener("online", net);
    window.addEventListener("offline", net);
    window.addEventListener("beforeinstallprompt", prompt);
    return () => {
      window.removeEventListener("hashchange", go);
      window.removeEventListener("online", net);
      window.removeEventListener("offline", net);
      window.removeEventListener("beforeinstallprompt", prompt);
    };
  }, []);
  useEffect(() => {
    if (selected) {
      detailRef.current?.focus();
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selected, confirmed]);
  function choose(p: Product) {
    setSelected(p);
    setConfirmed(false);
  }
  function confirm() {
    if (!selected) return;
    setConfirmed(true);
    const ids = [
      selected.id,
      ...recent.filter((id) => id !== selected.id),
    ].slice(0, 6);
    setRecent(ids);
    persist("mg-recent", ids);
  }
  function save() {
    if (!selected) return;
    const ids = favorites.includes(selected.id)
      ? favorites.filter((id) => id !== selected.id)
      : [selected.id, ...favorites].slice(0, 12);
    setFavorites(ids);
    persist("mg-favorites", ids);
  }
  function search(q: string) {
    setQuery(q);
    setBrowse(false);
    setSelected(null);
    setConfirmed(false);
  }
  const results = browse ? products : searchProducts(query);
  const record = selected ? resolveGuidance(selected, confirmed) : null;
  const productInfo = (p: Product) => (
    <dl className="product-details">
      {[
        [t.brand, p.brand_name],
        [t.generic, p.generic_name],
        [t.strength, p.strength],
        [t.form, formLabel(p.dosage_form, lang)],
        [t.manufacturer, p.manufacturer],
        [t.release, releaseLabels[lang][p.release_type]],
      ].map(([name, value]) => (
        <div key={name}>
          <dt>{name}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
  const claim = (c: Claim) => (
    <div className="claim">
      <p>{c[lang]}</p>
      <div className="claim-citations">
        {c.source_ids.map((id) => {
          const s = sources.find((x) => x.id === id)!;
          return (
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              key={id}
              title={c.source_section}
            >
              <ExternalLink size={11} />
              {s.name}
            </a>
          );
        })}
        <span className="source-section">{c.source_section}</span>
      </div>
    </div>
  );
  const card = (
    title: string,
    icon: React.ReactNode,
    claims: Claim[],
    fallback: string,
  ) => (
    <section className="guide-card">
      <h3>
        {icon}
        {title}
      </h3>
      {claims.length ? (
        claims.map((c, i) => <div key={i}>{claim(c)}</div>)
      ) : (
        <p className="muted">{fallback}</p>
      )}
    </section>
  );
  return (
    <>
      <a className="skip-link" href="#main">
        {t.skip}
      </a>
      <header>
        <div className="header-inner">
          <a
            className="brand"
            href="#search"
            onClick={() => {
              setSelected(null);
              setConfirmed(false);
              setPage("search");
            }}
          >
            <span className="brand-symbol">
              <Pill size={25} />
            </span>
            <span>
              MediGuide <b>BD</b>
              <small>{t.tagline}</small>
            </span>
          </a>
          <nav aria-label={lang === "en" ? "Main navigation" : "মূল নেভিগেশন"}>
            <a className={page === "search" ? "active" : ""} href="#search">
              {t.searchNav}
            </a>
            <a
              className={page === "methodology" ? "active" : ""}
              href="#methodology"
            >
              {t.method}
            </a>
          </nav>
          <div className="language-switch" aria-label="Language">
            <button aria-pressed={lang === "en"} onClick={() => setLang("en")}>
              English
            </button>
            <button aria-pressed={lang === "bn"} onClick={() => setLang("bn")}>
              বাংলা
            </button>
          </div>
        </div>
      </header>
      {!online && (
        <div className="connection-note" role="status">
          {t.offlineNotice}
        </div>
      )}
      <main id="main">
        {page === "methodology" ? (
          <Methodology lang={lang} />
        ) : (
          <>
            {!selected && (
              <>
                <section className="hero">
                  <div className="hero-copy">
                    <span className="eyebrow">
                      <span className="tiny-dot" />
                      {t.eyebrow}
                    </span>
                    <h1>
                      {t.headline.split("\n").map((s, i) => (
                        <span key={s} className={i ? "accent" : ""}>
                          {s}
                          <br />
                        </span>
                      ))}
                    </h1>
                    <p>{t.intro}</p>
                  </div>
                  <div className="hero-assurance">
                    <div className="assurance-icon">
                      <ShieldCheck size={35} />
                    </div>
                    <span>
                      {lang === "en"
                        ? "Clarity starts with"
                        : "সঠিক তথ্যের শুরু"}
                    </span>
                    <strong>
                      {lang === "en"
                        ? "the right medicine."
                        : "সঠিক ওষুধ দিয়ে।"}
                    </strong>
                    <p>
                      {lang === "en"
                        ? "Exact product. Referenced guidance. Always your prescription first."
                        : "সঠিক পণ্য। উৎসসহ নির্দেশনা। আপনার প্রেসক্রিপশন সবার আগে।"}
                    </p>
                    <div className="mini-check">
                      <Check size={14} />
                      {t.sourcesChecked}
                    </div>
                  </div>
                </section>
                <section className="search-panel" aria-label={t.searchLabel}>
                  <label htmlFor="medicine-search">{t.searchLabel}</label>
                  <div className="search-input">
                    <Search size={23} />
                    <input
                      id="medicine-search"
                      autoComplete="off"
                      type="search"
                      value={query}
                      placeholder={t.placeholder}
                      onChange={(e) => search(e.target.value)}
                    />
                    {query && (
                      <button
                        className="icon-button"
                        aria-label={
                          lang === "en" ? "Clear search" : "অনুসন্ধান মুছুন"
                        }
                        onClick={() => search("")}
                      >
                        <X size={18} />
                      </button>
                    )}
                    <span className="search-key">⌕</span>
                  </div>
                  <div className="search-under">
                    <p>{t.searchHelp}</p>
                    <button
                      className="text-button"
                      onClick={() => {
                        setBrowse(!browse);
                        setQuery("");
                      }}
                    >
                      {t.showAll}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="popular">
                    <span>{t.popular}</span>
                    {[
                      "Napa 500",
                      "Esomeprazole 20 mg",
                      "Cefixime 200",
                      "Square",
                    ].map((q) => (
                      <button key={q} onClick={() => search(q)}>
                        {q}
                        <ArrowRight size={12} />
                      </button>
                    ))}
                  </div>
                </section>
                <div className="catalogue-strip">
                  <span>
                    <DatabaseIcon /> {t.catalogue}:{" "}
                    <strong>
                      {products.length} {t.coverage}
                    </strong>
                  </span>
                  <a href="#methodology">
                    {guidance.length} {t.guidance}
                    <ChevronRight size={14} />
                  </a>
                </div>
              </>
            )}
            {!selected && (query.trim() || browse) && (
              <section className="results" aria-live="polite">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">{t.results}</span>
                    <h2>
                      {results.length}{" "}
                      {lang === "en"
                        ? "products to check"
                        : "টি পণ্য মিলিয়ে দেখুন"}
                    </h2>
                    <p>{t.resultsHint}</p>
                  </div>
                  <span className="outline-badge">
                    {lang === "en" ? "Identity first" : "আগে পরিচয়"}
                  </span>
                </div>
                {results.length ? (
                  <div className="result-grid">
                    {results.map((p) => (
                      <button
                        className="product-card"
                        key={p.id}
                        onClick={() => choose(p)}
                        aria-label={`${t.choose}: ${p.brand_name} ${p.strength} ${p.dosage_form} ${p.release_type}`}
                      >
                        <div className="product-card-top">
                          <span className="pill-box">
                            <Pill size={21} />
                          </span>
                          <span className="form-tag">{p.dosage_form}</span>
                        </div>
                        <h3>
                          {p.brand_name} <span>{p.strength}</span>
                        </h3>
                        <p>{p.generic_name}</p>
                        <small>{p.manufacturer}</small>
                        <div className="product-card-bottom">
                          <span>{t.choose}</span>
                          <ArrowRight size={17} />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <CircleHelp size={36} />
                    <h3>{t.empty}</h3>
                    <p>{t.emptyBody}</p>
                  </div>
                )}
              </section>
            )}
            {selected && (
              <div className="selected-view" ref={detailRef} tabIndex={-1}>
                <button
                  className="back-button"
                  onClick={() => {
                    setSelected(null);
                    setConfirmed(false);
                  }}
                >
                  <ArrowLeft size={16} />
                  {t.back}
                </button>
                <section
                  className={`identity-card ${confirmed ? "is-confirmed" : ""}`}
                >
                  <div className="identity-heading">
                    <div>
                      <span className="eyebrow">
                        {confirmed ? (
                          <>
                            <Check size={13} /> {t.identified}
                          </>
                        ) : (
                          t.identified
                        )}
                      </span>
                      <h1>
                        {selected.brand_name} <span>{selected.strength}</span>
                      </h1>
                      <p>{confirmed ? t.general : t.check}</p>
                    </div>
                    <span className="identity-icon">
                      <Pill size={36} />
                    </span>
                  </div>
                  {productInfo(selected)}
                  <div className="identity-source">
                    <a
                      href={selected.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={13} />
                      {t.identitySource}: {selected.source}
                    </a>
                    <small>
                      {t.last}: {selected.last_verified}
                    </small>
                  </div>
                  {!confirmed ? (
                    <div className="confirm-action">
                      <p>
                        <Info size={17} />
                        {t.follow}
                      </p>
                      <button className="primary-button" onClick={confirm}>
                        <Check size={18} />
                        {t.confirm}
                      </button>
                    </div>
                  ) : (
                    <div className="confirmed-actions">
                      <p>
                        <ShieldCheck size={17} />
                        {t.follow}
                      </p>
                      <button className="secondary-button" onClick={save}>
                        <Bookmark
                          size={15}
                          fill={
                            favorites.includes(selected.id)
                              ? "currentColor"
                              : "none"
                          }
                        />
                        {favorites.includes(selected.id) ? t.saved : t.save}
                      </button>
                    </div>
                  )}
                </section>
                {confirmed && (
                  <>
                    <div className="context-note">
                      <Info size={19} />
                      <p>{selected.high_risk ? t.highRisk : t.context}</p>
                    </div>
                    {record ? (
                      <>
                        <div className="guidance-heading">
                          <h2>{t.general}</h2>
                          <span className="verified-badge">
                            <FileCheck2 size={14} />
                            {record.verification_status === "VERIFIED"
                              ? t.verified
                              : t.partial}
                          </span>
                        </div>
                        <div className="guidance-grid">
                          <section className="guide-card food-card">
                            <h3>
                              <Utensils size={21} />
                              {t.food}
                            </h3>
                            <span className="food-label">
                              {foodLabels[lang][record.food_relation]}
                            </span>
                            {record.food_guidance &&
                              claim(record.food_guidance)}
                          </section>
                          {card(
                            t.timing,
                            <Clock3 size={21} />,
                            record.timing_guidance
                              ? [record.timing_guidance]
                              : [],
                            t.noTiming,
                          )}
                          {card(
                            t.uses,
                            <HeartPulse size={21} />,
                            record.common_uses,
                            t.noNotes,
                          )}
                          {card(
                            t.instructions,
                            <BookOpen size={21} />,
                            record.administration_notes,
                            t.noNotes,
                          )}
                          {card(
                            t.drinks,
                            <GlassWater size={21} />,
                            record.food_drink_notes,
                            t.noDrinks,
                          )}
                          {card(
                            t.warnings,
                            <ShieldCheck size={21} />,
                            record.warnings,
                            t.noNotes,
                          )}
                        </div>
                        <section className="sources-card card">
                          <h2>
                            <FileCheck2 size={21} />
                            {t.sources}
                          </h2>
                          <p className="muted">{t.review}</p>
                          <p className="muted">
                            {lang === "en"
                              ? record.mapping_note
                              : "সাধারণ উপাদান ও ফর্মভিত্তিক নির্দেশনা; বাংলাদেশের প্রেসক্রিপশন ও লেবেল অগ্রাধিকার পায়। সমতুল্যতা বা স্থানীয় অনুমোদনের দাবি নয়।"}
                          </p>
                          {sources
                            .filter((s) =>
                              claimsOf(record).some((c) =>
                                c.source_ids.includes(s.id),
                              ),
                            )
                            .map((s) => (
                              <div className="source-row" key={s.id}>
                                <a
                                  href={s.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {s.name}
                                  <ExternalLink size={14} />
                                </a>
                                <span>
                                  {t.last}: {s.last_verified}
                                </span>
                              </div>
                            ))}
                        </section>
                      </>
                    ) : (
                      <section className="unavailable-card">
                        <CircleHelp size={32} />
                        <span className="outline-badge">
                          {t.unavailableBadge}
                        </span>
                        <h2>{t.unavailable}</h2>
                        <p>{t.unavailableBody}</p>
                      </section>
                    )}
                  </>
                )}
              </div>
            )}
            {!selected && !query && !browse && (
              <>
                <section className="how-it-works">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">
                        {lang === "en"
                          ? "FROM YOUR PACK TO CLEARER INSTRUCTIONS"
                          : "প্যাকেট থেকে সহজ নির্দেশনা"}
                      </span>
                      <h2>{t.steps}</h2>
                    </div>
                    <span className="soft-badge">
                      <ShieldCheck size={14} />
                      {lang === "en"
                        ? "Your prescription comes first"
                        : "প্রেসক্রিপশন সবার আগে"}
                    </span>
                  </div>
                  <div className="steps">
                    {[
                      [t.step1, t.step1body, Search],
                      [t.step2, t.step2body, Check],
                      [t.step3, t.step3body, BookOpen],
                    ].map(([title, body, Icon], i) => {
                      const I = Icon as typeof Search;
                      return (
                        <div className="step" key={i}>
                          <div className="step-top">
                            <span className="step-number">0{i + 1}</span>
                            <I size={21} />
                          </div>
                          <h3>{String(title)}</h3>
                          <p>{String(body)}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>
                {(favorites.length > 0 || recent.length > 0) && (
                  <section className="device-list card">
                    {[
                      [t.savedList, favorites],
                      [t.recent, recent],
                    ].map(
                      ([title, ids]) =>
                        (ids as string[]).length > 0 && (
                          <div key={title as string}>
                            <h3>{title as string}</h3>
                            <div className="device-buttons">
                              {(ids as string[]).map((id) => {
                                const p = products.find((x) => x.id === id)!;
                                return (
                                  <button key={id} onClick={() => choose(p)}>
                                    {p.brand_name} {p.strength} ·{" "}
                                    {p.dosage_form}
                                    <ChevronRight size={14} />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ),
                    )}
                    <p className="muted">{t.local}</p>
                    <button
                      className="text-button"
                      onClick={() => {
                        setFavorites([]);
                        setRecent([]);
                        persist("mg-favorites", []);
                        persist("mg-recent", []);
                      }}
                    >
                      {t.clear}
                    </button>
                  </section>
                )}
                <section className="trust-bar">
                  <div>
                    <FileCheck2 size={18} />
                    {t.sourcesChecked}
                  </div>
                  <div>
                    <ShieldCheck size={18} />
                    {t.noAi}
                  </div>
                  <div>
                    <Download size={18} />
                    {t.offline}
                  </div>
                </section>
              </>
            )}
          </>
        )}
        <aside className="safety-note">
          <ShieldCheck size={22} />
          <div>
            <strong>{t.follow}</strong>
            <p>{t.permanent}</p>
          </div>
        </aside>
      </main>
      <footer>
        <div>
          <a className="footer-brand" href="#search">
            MediGuide <b>BD</b>
          </a>
          <p>{t.notice}</p>
          <small>{t.safety}</small>
        </div>
        <div className="footer-links">
          <a href="#methodology">{t.method}</a>
          <button
            className="text-button"
            onClick={async () => {
              if (install) {
                await install.prompt();
                const choice = await install.userChoice;
                if (choice.outcome === "accepted") setInstall(null);
              } else setInstallHelp(!installHelp);
            }}
          >
            <Download size={14} />
            {t.install}
          </button>
          <small>{t.dataUpdate}</small>
        </div>
      </footer>
      {installHelp && (
        <div className="install-help" role="status">
          <button
            className="icon-button"
            onClick={() => setInstallHelp(false)}
            aria-label="Close"
          >
            <X size={16} />
          </button>
          <strong>{t.install}</strong>
          <p>
            {lang === "en"
              ? "On Android Chrome, open the browser menu and choose “Install app” or “Add to Home Screen”. On iPhone, use Share → Add to Home Screen."
              : "Android Chrome-এর মেনুতে “Install app” বা “Add to Home Screen” বেছে নিন। iPhone-এ Share → Add to Home Screen ব্যবহার করুন।"}
          </p>
        </div>
      )}
    </>
  );
}
function DatabaseIcon() {
  return <BookOpen size={15} />;
}
