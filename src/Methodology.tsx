import {
  ArrowRight,
  Database,
  FileCheck2,
  Languages,
  ShieldCheck,
} from "lucide-react";
import { products, guidance, coveredProducts, sources } from "./catalogue";
import type { Language } from "./domain";
export function Methodology({ lang }: { lang: Language }) {
  const bn = lang === "bn";
  return (
    <div className="methodology">
      <div className="page-intro">
        <span className="eyebrow">
          {bn ? "স্বচ্ছতা আগে" : "TRANSPARENCY, BY DESIGN"}
        </span>
        <h1>{bn ? "তথ্য ও পদ্ধতি" : "Data & Methodology"}</h1>
        <p>
          {bn
            ? "কোন তথ্য জানা আছে, কীভাবে যাচাই করা হয়েছে এবং কোথায় সীমাবদ্ধতা আছে।"
            : "What we know, how we checked it, and where our information ends."}
        </p>
      </div>
      <div className="coverage-stats">
        <div>
          <strong>{products.length}</strong>
          <span>{bn ? "টি বাংলাদেশি পণ্য" : "Bangladesh products"}</span>
        </div>
        <div>
          <strong>{guidance.length}</strong>
          <span>
            {bn ? "টি ফর্মভিত্তিক নির্দেশনা" : "generic / formulation guides"}
          </span>
        </div>
        <div>
          <strong>{coveredProducts}</strong>
          <span>
            {bn ? "টি পণ্যের নির্দেশনা আছে" : "products with guidance"}
          </span>
        </div>
        <div>
          <strong>{products.length - coveredProducts}</strong>
          <span>
            {bn ? "টি পণ্যে তথ্য নেই" : "products with explicit abstention"}
          </span>
        </div>
      </div>
      <section className="card">
        <h2>
          <Database size={22} />
          {bn ? "পণ্যের পরিচয়" : "Bangladesh product identities"}
        </h2>
        <p>
          {bn
            ? "Beximco ও Square-এর প্রকাশিত পণ্যের লিফলেট এবং পণ্যের পৃষ্ঠা থেকে নাম, উপাদান, শক্তি ও ফর্ম হাতে বেছে নেওয়া হয়েছে। কোম্পানির নাম উৎসে যেভাবে আছে সেভাবেই রাখা হয়েছে।"
            : "Brand, ingredient, strength, form and manufacturer are manually curated from Beximco and Square product leaflets and product pages. Company names preserve the wording in the source publication."}
        </p>
        <p>
          {bn
            ? "DGDA-এর সরকারি তালিকা পরীক্ষা করা হয়েছে। নথিভুক্ত bulk API বা অনুমোদিত সম্পূর্ণ ডেটাসেট পাওয়া যায়নি। robots.txt নিরাপদে পাওয়া যায়নি (সার্টিফিকেটের মেয়াদের সমস্যা); তাই স্বয়ংক্রিয় সংগ্রহ করা হয়নি। এই প্রকল্প DGDA তালিকার অনুলিপি নয়।"
            : "We investigated the official DGDA public catalogue. No documented bulk API or authorised complete download was located during this build. The robots policy could not be retrieved securely due to a certificate validity error, so no automated DGDA crawling was attempted. This seed catalogue is not a mirror of the DGDA register."}
        </p>
        <a
          href="https://info.dgda.gov.bd/allopathic-medicines"
          target="_blank"
          rel="noreferrer"
        >
          {bn ? "DGDA সরকারি তালিকা" : "DGDA official public catalogue"} ↗
        </a>
        <p>
          {bn
            ? "রেজিস্ট্রেশন নম্বর যাচাই করা হয়নি এবং null রাখা হয়েছে। উৎসে পণ্য দেখা মানে বর্তমানে নিবন্ধিত বা বাজারে পাওয়া যায়—এমন নিশ্চয়তা নয়।"
            : "Registration numbers are unverified and stored as null. A product appearing in a publication is not confirmation of current registration, stock, or market availability. This catalogue does not contain every medicine in Bangladesh."}
        </p>
      </section>
      <section className="card">
        <h2>
          <FileCheck2 size={22} />
          {bn ? "নির্দেশনার উৎস ও মিল" : "Guidance and formulation mapping"}
        </h2>
        <p>
          {bn
            ? "স্থানীয় লিফলেট, NHS ও DailyMed-এর প্রকাশিত তথ্য থেকে সাধারণ নির্দেশনা সংক্ষেপ করা হয়েছে। জেনেরিক, ফর্ম ও রিলিজ ধরন সম্পূর্ণ মিলে গেলে নির্দেশনা দেখানো হয়। ব্র্যান্ডের ফাজি মিল শুধু সম্ভাব্য পণ্য খোঁজে; চিকিৎসা তথ্য মেলাতে ব্যবহার হয় না।"
            : "General instructions are paraphrased from manufacturer publications, NHS guidance and DailyMed labels. Guidance resolves only when the ingredient, dosage form and release type all match. Fuzzy matching finds product candidates; it never determines a medical guidance match."}
        </p>
        <div className="pipeline">
          {[
            bn ? "অনুসন্ধান" : "Search",
            bn ? "বাংলাদেশি পণ্য" : "BD product",
            bn ? "নিশ্চিতকরণ" : "Confirmation",
            bn ? "সঠিক ফর্ম" : "Exact formulation",
            bn ? "উৎসসহ নির্দেশনা" : "Cited guidance",
          ].map((x, i) => (
            <span key={x}>
              {x}
              {i < 4 && <ArrowRight size={14} />}
            </span>
          ))}
        </div>
        <p>
          {bn
            ? "বিদেশি লেবেলের সাধারণ তথ্য ব্যবহার মানে স্থানীয় ব্র্যান্ডের সমতুল্যতা বা বাংলাদেশে অনুমোদন প্রমাণ নয়। স্থানীয় প্রেসক্রিপশন ও লেবেল অগ্রাধিকার পায়।"
            : "Foreign labels support general ingredient and formulation information; they do not establish bioequivalence or Bangladesh regulatory approval for a local brand. Your local prescription and dispensing label take priority."}
        </p>
        <p>
          {bn
            ? "openFDA ও DailyMed-এর অ্যাডাপ্টার ভবিষ্যৎ পর্যালোচনার জন্য লেবেল খুঁজতে পারে। কাঁচা লেবেল স্বয়ংক্রিয়ভাবে নির্দেশনা বা VERIFIED হয় না। মূল অ্যাপে লাইভ API বা LLM প্রয়োজন নেই।"
            : "Retrieval adapters for openFDA and DailyMed can find labels for future review. Raw API results never become VERIFIED automatically. The core app uses versioned local records and has no live API or LLM dependency."}
        </p>
      </section>
      <section className="card">
        <h2>
          <ShieldCheck size={22} />
          {bn ? "যাচাই ও নিরাপত্তা" : "Verification and safety"}
        </h2>
        <ul>
          <li>
            <strong>
              VERIFIED / {bn ? "উৎস যাচাই করা" : "Source-checked"}:
            </strong>{" "}
            {bn
              ? "দেখানো তথ্য প্রকাশিত উৎসের সঙ্গে মিলিয়ে দেখা হয়েছে; চিকিৎসক বা ফার্মাসিস্টের স্বাধীন পর্যালোচনা হয়নি।"
              : "Displayed claims were checked against named publications. No independent clinician or pharmacist review has been completed."}
          </li>
          <li>
            <strong>PARTIALLY_VERIFIED:</strong>{" "}
            {bn
              ? "মডেলে সমর্থিত; কেবল উৎসসমর্থিত অংশ দেখানো যাবে এবং অনুপস্থিত অংশ স্পষ্ট থাকবে। বর্তমান seed-এ এই অবস্থার রেকর্ড নেই।"
              : "Supported by the schema: only evidenced fields may be shown and gaps stay explicit. The current seed contains no records in this state."}
          </li>
          <li>
            <strong>NOT_AVAILABLE:</strong>{" "}
            {bn
              ? "সঠিক ফর্মের যাচাই করা নির্দেশনা নেই। অনুমান করা হয় না।"
              : "No verified matching formulation record exists. The app abstains."}
          </li>
        </ul>
        <p>
          {bn
            ? "ব্যক্তিভিত্তিক ডোজ, মেয়াদ, রোগ নির্ণয়, ওষুধ শুরু/বন্ধ/বদল, শিশু বা গর্ভাবস্থার চিকিৎসা এবং অতিরিক্ত ডোজের ব্যবস্থাপনা এখানে নেই। এটি মিথস্ক্রিয়া পরীক্ষক বা পূর্ণ নিরাপত্তার লিফলেট নয়।"
            : "The app does not decide a dose, duration, diagnosis, starting, stopping or replacing a medicine, treatment for children or pregnancy, or overdose management. It is not a comprehensive interaction checker or a full safety leaflet."}
        </p>
        <p>
          {bn
            ? "কিডনি/লিভারের রোগ, গর্ভাবস্থা, স্তন্যদান বা উচ্চ ঝুঁকির ওষুধে চিকিৎসক বা ফার্মাসিস্টের নির্দেশনা প্রয়োজন।"
            : "Kidney or liver disease, pregnancy, breastfeeding and high-risk medicines require individual instructions from a clinician or pharmacist."}
        </p>
      </section>
      <section className="card">
        <h2>
          <Languages size={22} />
          {bn ? "ভাষা, গোপনীয়তা ও অফলাইন" : "Language, privacy and offline use"}
        </h2>
        <p>
          {bn
            ? "ইংরেজি ও বাংলা UI এবং মূল নির্দেশনা স্থিরভাবে লেখা; কোনো স্বয়ংক্রিয় অনুবাদ নেই। ব্র্যান্ড, জেনেরিক ও কোম্পানির নাম অনুবাদ করা হয় না। বাংলা চিকিৎসা পরিভাষার পেশাগত পর্যালোচনা ভবিষ্যতের কাজ।"
            : "English and Bangla UI and core instructions are fixed, manually authored templates. Brand, generic and company names are not translated. Professional review of Bangla medical terminology remains future work."}
        </p>
        <p>
          {bn
            ? "অনুসন্ধান এই ডিভাইসেই হয়। সংরক্ষিত ও সাম্প্রতিক তালিকায় শুধু পণ্যের ID থাকে। কোনো অ্যাকাউন্ট, অ্যানালিটিক্স বা রোগের তথ্য সংগ্রহ করা হয় না। অফলাইন ক্যাশ পুরোনো হতে পারে; উৎসের লিংক দেখতে ইন্টারনেট প্রয়োজন।"
            : "Search runs on your device. Favorites and recently confirmed medicines store only product IDs locally and can be cleared. There are no accounts, analytics, diagnosis collection or prescription uploads. Offline data may be stale; source links require internet."}
        </p>
        <p>
          {bn
            ? "Android Chrome-এ মেনু থেকে “Add to Home Screen” / “Install app” বেছে নিন।"
            : "On Android Chrome, choose “Add to Home Screen” / “Install app” from the browser menu. Once cached, the application shell and curated catalogue work offline."}
        </p>
      </section>
      <section className="card">
        <h2>{bn ? "উৎসের তালিকা" : "Source register"}</h2>
        <p>
          {bn
            ? "উৎস যাচাই: ৮ অক্টোবর ২০২৬। প্রকাশিত নথি পুরোনো হতে পারে; এটি নতুন ক্লিনিক্যাল নির্দেশিকা হওয়ার দাবি নয়।"
            : "Source check: 8 October 2026. Some publications are older; the check date does not mean the publication is new. Future work includes pharmacist review, licensed catalogue expansion and periodic source rechecking."}
        </p>
        <div className="source-register">
          {sources.map((s) => (
            <a key={s.id} href={s.url} target="_blank" rel="noreferrer">
              {s.name} <span>↗</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
