// Reviewed bilingual facts only. Retrieval candidates never enter this file automatically.
import { readFileSync, writeFileSync } from "node:fs";
const read = (n) => JSON.parse(readFileSync(`src/data/${n}.json`, "utf8"));
const guides = read("guidance"),
  sources = read("sources");
const date = "2026-10-08";
function source(id, name, url, kind = "PUBLIC_HEALTH") {
  if (!sources.some((s) => s.id === id))
    sources.push({ id, name, url, kind, last_verified: date });
  return id;
}
const claim = (en, bn, id, section) => ({
  en,
  bn,
  source_ids: [id],
  source_section: section,
});
function add(generic, form, route, release, food, id, section, options = {}) {
  const key = [generic.toLowerCase(), form.toLowerCase(), route, release].join(
    "|",
  );
  const record = {
    id: key.replaceAll("|", "-"),
    generic_key: key,
    generic_name: generic,
    dosage_form: form,
    route,
    release_type: release,
    meal_relevance: food === "NOT_APPLICABLE" ? "NOT_APPLICABLE" : "RELEVANT",
    food_relation: food,
    food_guidance: claim(
      options.foodEn ?? "Can generally be taken with or without food.",
      options.foodBn ?? "খাবারের সঙ্গে বা ছাড়াও নেওয়া যায়।",
      id,
      section,
    ),
    timing_type: options.timing ? "CONSISTENT_TIME" : "PRESCRIPTION_DEPENDENT",
    timing_guidance: options.timing ?? null,
    common_uses: options.uses ?? [],
    administration_notes: options.notes ?? [],
    food_drink_notes: options.drinks ?? [],
    warnings: [],
    verification_status: options.partial ? "PARTIALLY_VERIFIED" : "VERIFIED",
    last_verified: date,
    evidence_note: options.partial
      ? "Meal relevance is classified from the cited non-oral route. Only the cited fields are reviewed; timing and other missing fields remain prescription-dependent."
      : "Concise administration facts checked against the cited source; no dose or frequency is reproduced.",
    mapping_note:
      "Exact ingredient, form, route and release mapping required. Local dispensing label takes priority; no bioequivalence or current registration is asserted.",
  };
  const existing = guides.findIndex((g) => g.generic_key === key);
  if (existing < 0) guides.push(record);
  else guides[existing] = record;
}
const nap = source(
  "nhs-naproxen",
  "NHS — Naproxen",
  "https://www.nhs.uk/medicines/naproxen/",
);
add(
  "Naproxen Sodium",
  "Tablet",
  "ORAL",
  "IMMEDIATE",
  "WITH_FOOD",
  nap,
  "How to take naproxen",
  {
    foodEn: "Generally taken with or after food to help protect the stomach.",
    foodBn: "পাকস্থলীর অস্বস্তি কমাতে সাধারণত খাবারের সঙ্গে বা পরে নেওয়া হয়।",
    uses: [
      claim(
        "Commonly used for pain and inflammation.",
        "সাধারণত ব্যথা ও প্রদাহের জন্য ব্যবহৃত হয়।",
        nap,
        "What naproxen is for",
      ),
    ],
    notes: [
      claim(
        "Swallow the tablet whole with water.",
        "ট্যাবলেট পানি দিয়ে সম্পূর্ণ গিলে নিন।",
        nap,
        "How to take naproxen",
      ),
    ],
    drinks: [
      claim(
        "Alcohol can increase the risk of stomach ulcers or bleeding.",
        "অ্যালকোহল পাকস্থলীর আলসার বা রক্তক্ষরণের ঝুঁকি বাড়াতে পারে।",
        nap,
        "Food, drink and alcohol",
      ),
    ],
  },
);
const los = source(
  "nhs-losartan",
  "NHS — Losartan",
  "https://www.nhs.uk/medicines/losartan/",
);
add(
  "Losartan Potassium",
  "Tablet",
  "ORAL",
  "IMMEDIATE",
  "WITH_OR_WITHOUT_FOOD",
  los,
  "How to take losartan",
  {
    timing: claim(
      "No fixed morning or evening rule; try to take it at a consistent time according to your prescription.",
      "সকাল বা সন্ধ্যার নির্দিষ্ট নিয়ম নেই; প্রেসক্রিপশন অনুযায়ী প্রতিদিন একই সময়ে নেওয়ার চেষ্টা করুন।",
      los,
      "How to take losartan",
    ),
    uses: [
      claim(
        "Commonly used for high blood pressure and heart failure.",
        "সাধারণত উচ্চ রক্তচাপ ও হার্ট ফেইলিউরের জন্য ব্যবহৃত হয়।",
        los,
        "What losartan is for",
      ),
    ],
    drinks: [
      claim(
        "Avoid grapefruit juice; ask a pharmacist about potassium-containing salt substitutes.",
        "গ্রেপফ্রুটের রস এড়িয়ে চলুন; পটাশিয়ামযুক্ত লবণের বিকল্প নিয়ে ফার্মাসিস্টকে জিজ্ঞাসা করুন।",
        los,
        "Taking losartan with other medicines, food and drink",
      ),
    ],
  },
);
const lor = source(
  "nhs-loratadine",
  "NHS — Loratadine",
  "https://www.nhs.uk/medicines/loratadine/how-and-when-to-take-loratadine/",
);
add(
  "Loratadine",
  "Tablet",
  "ORAL",
  "IMMEDIATE",
  "WITH_OR_WITHOUT_FOOD",
  lor,
  "How to take it",
  {
    notes: [
      claim(
        "Swallow with a drink of water. Do not chew the tablet.",
        "পানি দিয়ে গিলে নিন। ট্যাবলেট চিবাবেন না।",
        lor,
        "How to take it",
      ),
    ],
  },
);
const amox = source(
  "nhs-amoxicillin",
  "NHS — Amoxicillin",
  "https://www.nhs.uk/medicines/amoxicillin/how-and-when-to-take-amoxicillin/",
);
add(
  "Amoxicillin",
  "Capsule",
  "ORAL",
  "IMMEDIATE",
  "WITH_OR_WITHOUT_FOOD",
  amox,
  "How to take it",
  {
    notes: [
      claim(
        "Swallow the capsule whole with water; do not chew or break it.",
        "ক্যাপসুল পানি দিয়ে সম্পূর্ণ গিলে নিন; চিবাবেন বা ভাঙবেন না।",
        amox,
        "How to take it",
      ),
    ],
  },
);
const a = guides.find(
  (g) => g.generic_key === "amoxicillin|capsule|ORAL|IMMEDIATE",
);
a.timing_type = "EVENLY_SPACED";
a.timing_guidance = claim(
  "Space the doses already prescribed evenly through the day. Follow the frequency on your dispensing label.",
  "প্রেসক্রিপশনে লেখা ডোজগুলো দিনের মধ্যে সমান ব্যবধানে নিন। কতবার নিতে হবে তা ওষুধের লেবেল অনুযায়ী অনুসরণ করুন।",
  amox,
  "How to take it",
);
function local(page) {
  return source(
    `square-guide-${page}`,
    `Square product guide — PDF page ${page}`,
    `https://squarepharma.com.bd/product_guide/Product%20Guide%209th_SPL.pdf#page=${page}`,
    "MANUFACTURER",
  );
}
const na = {
  partial: true,
  foodEn: "Meal timing is not applicable to this dosage form.",
  foodBn:
    "এই ধরনের ওষুধের ক্ষেত্রে খাবারের আগে বা পরে নেওয়ার বিষয়টি প্রযোজ্য নয়।",
};
add(
  "Ketotifen Fumarate",
  "Eye Drops",
  "OPHTHALMIC",
  "NOT_APPLICABLE",
  "NOT_APPLICABLE",
  local(29),
  "Ocular administration and Preparation",
  {
    ...na,
    uses: [
      claim(
        "Commonly used for symptoms of allergic conjunctivitis.",
        "সাধারণত অ্যালার্জিজনিত চোখের প্রদাহের উপসর্গে ব্যবহৃত হয়।",
        "square-guide-29",
        "Indication",
      ),
    ],
  },
);
add(
  "Mupirocin",
  "Ointment",
  "TOPICAL",
  "NOT_APPLICABLE",
  "NOT_APPLICABLE",
  local(50),
  "Topical administration and Preparation",
  {
    ...na,
    uses: [
      claim(
        "Commonly used for certain bacterial skin infections, including impetigo.",
        "সাধারণত ইমপেটিগোসহ কিছু ব্যাকটেরিয়াজনিত ত্বকের সংক্রমণে ব্যবহৃত হয়।",
        "square-guide-50",
        "Indication",
      ),
    ],
    notes: [
      claim(
        "Avoid contact with the eyes.",
        "চোখের সংস্পর্শ এড়িয়ে চলুন।",
        "square-guide-50",
        "Contraindication & Precaution",
      ),
    ],
  },
);
add(
  "Furosemide",
  "Injection",
  "INJECTION",
  "NOT_APPLICABLE",
  "NOT_APPLICABLE",
  local(144),
  "Injection (IM/IV) and Preparation",
  na,
);
const inh = source(
  "nhs-salbutamol",
  "NHS — Salbutamol inhaler",
  "https://www.nhs.uk/medicines/salbutamol-inhaler/how-and-when-to-use-salbutamol-inhalers/",
);
add(
  "Salbutamol",
  "Inhaler",
  "INHALATION",
  "NOT_APPLICABLE",
  "NOT_APPLICABLE",
  local(274),
  "Inhaler administration and Preparation",
  {
    ...na,
    notes: [
      claim(
        "Read the leaflet for your exact inhaler device and ask a pharmacist to check your technique.",
        "আপনার নির্দিষ্ট ইনহেলারের লিফলেট পড়ুন এবং ব্যবহার করার পদ্ধতি ফার্মাসিস্টকে দেখিয়ে নিন।",
        inh,
        "How to use your inhaler",
      ),
    ],
  },
);
writeFileSync("src/data/guidance.json", JSON.stringify(guides, null, 2) + "\n");
writeFileSync("src/data/sources.json", JSON.stringify(sources, null, 2) + "\n");
console.log(`Reviewed guidance: ${guides.length}; sources: ${sources.length}`);
