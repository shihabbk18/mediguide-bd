import { coverage, guidance } from "./catalogue";
import build from "./data/coverage.json";
import type { Language } from "./domain";
export function Coverage({ lang }: { lang: Language }) {
  const bn = lang === "bn";
  const stats = [
    [coverage.products, bn ? "বাংলাদেশি পণ্য" : "Bangladesh products indexed"],
    [coverage.unique_brands, bn ? "স্বতন্ত্র ব্র্যান্ড" : "Unique brands"],
    [
      coverage.unique_formulations,
      bn ? "জেনেরিক / ফর্মুলেশন কী" : "Unique generic/formulation keys",
    ],
    [
      coverage.verified_products,
      bn ? "উৎস যাচাই করা নির্দেশনা" : "VERIFIED guidance — products",
    ],
    [
      coverage.partial_products,
      bn ? "আংশিক নির্দেশনা" : "PARTIAL guidance — products",
    ],
    [
      coverage.unavailable_products,
      bn ? "নির্দেশনা পাওয়া যায়নি" : "NOT AVAILABLE — products",
    ],
  ];
  return (
    <section
      className="card coverage-dashboard"
      aria-label={bn ? "তথ্যের পরিধি" : "Data coverage"}
    >
      <h2>{bn ? "তথ্যের পরিধি" : "Data coverage"}</h2>
      <div className="coverage-stats">
        {stats.map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <p className="muted">
        {bn ? "নির্দেশনার রেকর্ড" : "Guidance records"}: {guidance.length} ·{" "}
        {bn ? "সর্বশেষ ডেটাসেট তৈরি" : "Last dataset build"}:{" "}
        {new Intl.DateTimeFormat(bn ? "bn-BD" : "en-GB", {
          dateStyle: "medium",
          timeZone: "Asia/Dhaka",
        }).format(new Date(build.built_at))}
      </p>
      <p className="muted">
        {bn
          ? "এটি বাংলাদেশের সব ওষুধের তালিকা নয়। UNKNOWN বা পর্যালোচনা বাকি থাকা তথ্য থেকে নির্দেশনা তৈরি করা হয় না।"
          : "This is a curated catalogue, not every Bangladesh medicine. UNKNOWN and NEEDS_REVIEW records never become guessed instructions."}
      </p>
    </section>
  );
}
