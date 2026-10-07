// Manually curated factual identities from the linked manufacturer publications.
// This is an authoring adapter, not a web scraper. Never run a bulk crawl.
import { writeFileSync,mkdirSync } from 'node:fs';
import type { Product,Source,Guidance,Claim } from '../src/domain';
const date='2026-10-08';
const sources:Source[]=[
 ['napa','Beximco — Napa product leaflet','https://beximco-pharma.com/cdn/bpl/product/pdf/napa.pdf','MANUFACTURER'],
 ['amdocal','Beximco — Amdocal product leaflet','https://beximco-pharma.com/cdn/bpl/product/pdf/amdocal.pdf','MANUFACTURER'],
 ['seclo','Square — Seclo product leaflet','https://www.squarepharma.com.bd/downloads/1609925065_pdoc_Seclo.pdf','MANUFACTURER'],
 ['seclo-web','Square — Seclo administration','https://www.squarepharma.com.bd/product-details.php?pid=10','MANUFACTURER'],
 ['seclo-mups','Square — Seclo MUPS product','https://squarepharma.com.bd/product-details.php?pid=662','MANUFACTURER'],
 ['nexum','Square — Nexum product leaflet','https://www.squarepharma.com.bd/downloads/Nexum%20DS.PDF','MANUFACTURER'],
 ['comet','Square — Comet product leaflet','https://www.squarepharma.com.bd/downloads/1587478883_pdoc_Comet%20DS2.pdf','MANUFACTURER'],
 ['cef3','Square — Cef-3 product leaflet','https://www.squarepharma.com.bd/downloads/Cef%203.pdf','MANUFACTURER'],
 ['alatrol','Square — Alatrol product leaflet','https://www.squarepharma.com.bd/downloads/Alatrol.pdf','MANUFACTURER'],
 ['nhs-para','NHS — Paracetamol for adults','https://www.nhs.uk/medicines/paracetamol-for-adults/','PUBLIC_HEALTH'],
 ['nhs-amlo','NHS — Amlodipine','https://www.nhs.uk/medicines/amlodipine/','PUBLIC_HEALTH'],
 ['nhs-cet','NHS — How to take cetirizine','https://www.nhs.uk/medicines/cetirizine/how-and-when-to-take-cetirizine/','PUBLIC_HEALTH'],
 ['nhs-cet-notes','NHS — Cetirizine common questions','https://www.nhs.uk/medicines/cetirizine/common-questions-about-cetirizine/','PUBLIC_HEALTH'],
 ['dm-met','DailyMed — Metformin IR and ER label','https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=623b3bc6-1b07-4a04-bc7a-7fc695adf063','REGULATORY'],
 ['dm-cef','DailyMed — Cefixime tablet label','https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=b5a3c547-3bc7-4856-af9c-1bead294f5d9','REGULATORY'],
 ['dm-eso','DailyMed — Esomeprazole delayed-release capsule label','https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?audience=consumer&setid=43cf2754-3ec7-75f7-e063-6394a90adfeb','REGULATORY'],
].map(([id,name,url,kind])=>({id,name,url,kind:kind as Source['kind'],last_verified:date}));
const products:Product[]=[];
function add(brand:string,generic:string,strength:string,form:string,release:Product['release_type'],sourceId:string,manufacturer:string,high_risk=false){const s=sources.find(x=>x.id===sourceId)!;products.push({id:`bd-${products.length+1}`,brand_name:brand,generic_name:generic,strength,dosage_form:form,release_type:release,manufacturer,registration_number:null,source:s.name,source_url:s.url,source_section:'Composition / Commercial packs / How supplied',last_verified:date,high_risk});}
const b='Beximco Pharmaceuticals Ltd.',s='Square Pharmaceuticals Ltd.';
add('Napa','Paracetamol','500 mg','Tablet','IMMEDIATE','napa',b);
add('Napa Extra','Paracetamol + Caffeine','500 mg + 65 mg','Tablet','IMMEDIATE','napa',b);
add('Napa','Paracetamol','120 mg/5 ml','Syrup','IMMEDIATE','napa',b,true);
add('Napa','Paracetamol','120 mg/5 ml','Oral suspension','IMMEDIATE','napa',b,true);
add('Napa','Paracetamol','80 mg/ml','Paediatric drops','IMMEDIATE','napa',b,true);
for(const mg of [125,250,500])add('Napa','Paracetamol',`${mg} mg`,'Suppository','NOT_APPLICABLE','napa',b,true);
for(const mg of [20,40])add('Seclo','Omeprazole',`${mg} mg`,'Capsule','DELAYED','seclo',s);
add('Seclo MUPS','Omeprazole','20 mg','Tablet','MUPS','seclo-mups',s);
for(const form of ['Tablet','Capsule'])for(const mg of [20,40])add('Nexum','Esomeprazole',`${mg} mg`,form,'DELAYED','nexum',s);
for(const mg of [500,850])add('Comet','Metformin hydrochloride',`${mg} mg`,'Tablet','IMMEDIATE','comet',s,true);
for(const mg of [500,1000])add('Comet XR','Metformin hydrochloride',`${mg} mg`,'Tablet','EXTENDED','comet',s,true);
for(const form of ['Tablet','Capsule'])for(const mg of [200,400])add(mg===400?'Cef-3 DS':'Cef-3','Cefixime',`${mg} mg`,form,'IMMEDIATE','cef3',s);
add('Cef-3','Cefixime','100 mg/5 ml','Powder for oral suspension','IMMEDIATE','cef3',s,true);
add('Cef-3 Forte','Cefixime','200 mg/5 ml','Powder for oral suspension','IMMEDIATE','cef3',s,true);
for(const mg of [5,10])add('Amdocal','Amlodipine',`${mg} mg`,'Tablet','IMMEDIATE','amdocal',b);
add('Alatrol','Cetirizine hydrochloride','10 mg','Tablet','IMMEDIATE','alatrol',s);
add('Alatrol','Cetirizine hydrochloride','5 mg/5 ml','Syrup','IMMEDIATE','alatrol',s,true);
const claim=(en:string,bn:string,source_ids:string[],source_section:string):Claim=>({en,bn,source_ids,source_section});
const g=(id:string,generic_name:string,dosage_form:string,release_type:Product['release_type'],food_relation:Guidance['food_relation'],food_guidance:Claim,rest:Partial<Guidance>):Guidance=>({id,generic_name,dosage_form,release_type,food_relation,food_guidance,timing_guidance:null,common_uses:[],administration_notes:[],food_drink_notes:[],warnings:[],verification_status:'VERIFIED',last_verified:date,mapping_note:'General ingredient and formulation guidance; the Bangladesh dispensing label takes priority. No bioequivalence or local regulatory approval is asserted.',...rest});
const guidance:Guidance[]=[
g('paracetamol-tablet','Paracetamol','Tablet','IMMEDIATE','WITH_OR_WITHOUT_FOOD',claim('Can generally be taken with or without food.','খাবারের সঙ্গে বা ছাড়াও নেওয়া যায়।',['nhs-para'],'How to take common types — tablets'),{
 common_uses:[claim('Commonly used for pain and fever.','সাধারণত ব্যথা ও জ্বরের জন্য ব্যবহৃত হয়।',['nhs-para'],'What paracetamol is for')],
 administration_notes:[claim('Swallow the conventional tablet with water.','সাধারণ ট্যাবলেট পানি দিয়ে গিলে নিন।',['nhs-para'],'Tablets and capsules')],
 warnings:[claim('Check other medicines for paracetamol to avoid accidentally taking the same ingredient twice.','একই উপাদান ভুল করে দুবার নেওয়া এড়াতে অন্য ওষুধে paracetamol আছে কি না দেখুন।',['nhs-para'],'Important — other medicines containing paracetamol')]
}),
g('omeprazole-capsule','Omeprazole','Capsule','DELAYED','BEFORE_FOOD',claim('Generally taken before a meal.','সাধারণত খাবারের আগে নেওয়া হয়।',['seclo-web'],'Dosage & Administration'),{
 common_uses:[claim('Commonly used for acid reflux and stomach or duodenal ulcers.','সাধারণত এসিড রিফ্লাক্স এবং পাকস্থলী বা ডুওডেনামের আলসারের জন্য ব্যবহৃত হয়।',['seclo-web'],'Indication')]
}),
g('esomeprazole-capsule','Esomeprazole','Capsule','DELAYED','BEFORE_FOOD',claim('Delayed-release capsules are generally taken at least one hour before a meal.','ডিলেইড-রিলিজ ক্যাপসুল সাধারণত খাবারের অন্তত এক ঘণ্টা আগে নেওয়া হয়।',['dm-eso'],'2.3 Preparation and Administration'),{
 common_uses:[claim('Commonly used for acid reflux.','সাধারণত এসিড রিফ্লাক্সের জন্য ব্যবহৃত হয়।',['nexum'],'Indication')],
 administration_notes:[claim('Swallow whole; do not chew or crush the capsule or its pellets.','পুরো ক্যাপসুল গিলে নিন; ক্যাপসুল বা ভেতরের দানা চিবাবেন বা গুঁড়া করবেন না।',['dm-eso'],'2.3 Oral Administration')]
}),
g('metformin-ir','Metformin hydrochloride','Tablet','IMMEDIATE','WITH_FOOD',claim('Generally taken with meals.','সাধারণত খাবারের সঙ্গে নেওয়া হয়।',['comet','dm-met'],'Dosage and Administration — immediate release'),{
 common_uses:[claim('Commonly used to help control blood glucose in type 2 diabetes.','সাধারণত টাইপ ২ ডায়াবেটিসে রক্তের গ্লুকোজ নিয়ন্ত্রণে ব্যবহৃত হয়।',['comet'],'Indication and usage')],
 food_drink_notes:[claim('Avoid excessive alcohol; it increases the risk of lactic acidosis.','অতিরিক্ত অ্যালকোহল এড়িয়ে চলুন; এতে ল্যাকটিক অ্যাসিডোসিসের ঝুঁকি বাড়ে।',['dm-met'],'5.1 Lactic acidosis / Patient information')],
 warnings:[claim('Kidney function, liver disease and some contrast scans can affect safe use. Ask your prescriber or pharmacist about your instructions.','কিডনির কার্যক্ষমতা, লিভারের রোগ ও কিছু কনট্রাস্ট পরীক্ষা নিরাপদ ব্যবহারে প্রভাব ফেলতে পারে। আপনার নির্দেশনা সম্পর্কে চিকিৎসক বা ফার্মাসিস্টকে জিজ্ঞাসা করুন।',['dm-met'],'5.1 Lactic acidosis')]
}),
g('metformin-er','Metformin hydrochloride','Tablet','EXTENDED','WITH_FOOD',claim('Generally taken with the evening meal.','সাধারণত সন্ধ্যা বা রাতের খাবারের সঙ্গে নেওয়া হয়।',['comet','dm-met'],'Dosage and Administration — extended release'),{
 timing_guidance:claim('Extended-release tablets are generally taken with the evening meal. Follow the schedule on your prescription.','এক্সটেন্ডেড-রিলিজ ট্যাবলেট সাধারণত সন্ধ্যা বা রাতের খাবারের সঙ্গে নেওয়া হয়। প্রেসক্রিপশনের সময়সূচি অনুসরণ করুন।',['comet','dm-met'],'Dosage and Administration — extended release'),
 common_uses:[claim('Commonly used to help control blood glucose in type 2 diabetes.','সাধারণত টাইপ ২ ডায়াবেটিসে রক্তের গ্লুকোজ নিয়ন্ত্রণে ব্যবহৃত হয়।',['comet'],'Indication and usage')],
 administration_notes:[claim('Swallow whole. Do not crush, cut or chew extended-release tablets.','পুরো ট্যাবলেট গিলে নিন। এক্সটেন্ডেড-রিলিজ ট্যাবলেট গুঁড়া, কাটা বা চিবানো যাবে না।',['dm-met'],'2.1 Adult Dosage — extended release')],
 food_drink_notes:[claim('Avoid excessive alcohol; it increases the risk of lactic acidosis.','অতিরিক্ত অ্যালকোহল এড়িয়ে চলুন; এতে ল্যাকটিক অ্যাসিডোসিসের ঝুঁকি বাড়ে।',['dm-met'],'5.1 Lactic acidosis / Patient information')],
 warnings:[claim('Kidney function and contrast scans may require patient-specific instructions from your clinician.','কিডনির কার্যক্ষমতা ও কনট্রাস্ট পরীক্ষার ক্ষেত্রে চিকিৎসকের ব্যক্তিভিত্তিক নির্দেশনা প্রয়োজন হতে পারে।',['dm-met'],'5.1 Lactic acidosis')]
}),
g('cefixime-tablet','Cefixime','Tablet','IMMEDIATE','WITH_OR_WITHOUT_FOOD',claim('Tablets can generally be taken with or without food.','ট্যাবলেট সাধারণত খাবারের সঙ্গে বা ছাড়াও নেওয়া যায়।',['dm-cef'],'2.1 Adults / 12.3 Pharmacokinetics'),{
 common_uses:[claim('Commonly used for certain bacterial respiratory or urinary infections, when prescribed.','চিকিৎসক লিখে দিলে সাধারণত কিছু ব্যাকটেরিয়াজনিত শ্বাসতন্ত্র বা মূত্রতন্ত্রের সংক্রমণে ব্যবহৃত হয়।',['cef3'],'Indication')],
 administration_notes:[claim('Tablets and suspension are not always interchangeable. Confirm any formulation change with your pharmacist.','ট্যাবলেট ও সাসপেনশন সবসময় একটির বদলে অন্যটি ব্যবহার করা যায় না। ফর্ম বদলানোর আগে ফার্মাসিস্টের সঙ্গে নিশ্চিত করুন।',['dm-cef'],'2.2 / 12.3 — lack of bioequivalence')],
 warnings:[claim('Tell your clinician about an allergy to cephalosporin antibiotics.','সেফালোস্পোরিন অ্যান্টিবায়োটিকে অ্যালার্জি থাকলে চিকিৎসককে জানান।',['dm-cef'],'4 Contraindications')]
}),
g('amlodipine-tablet','Amlodipine','Tablet','IMMEDIATE','WITH_OR_WITHOUT_FOOD',claim('Can generally be taken before or after eating.','সাধারণত খাবারের আগে বা পরে নেওয়া যায়।',['nhs-amlo'],'How to take amlodipine'),{
 timing_guidance:claim('Take consistently at the same time of day specified on your prescription. There is no required morning or evening time in this source.','প্রেসক্রিপশনে নির্ধারিত সময়ে প্রতিদিন নিয়মিত নিন। এই উৎসে সকাল বা সন্ধ্যার নির্দিষ্ট নির্দেশনা নেই।',['nhs-amlo'],'How to take amlodipine'),
 common_uses:[claim('Commonly used for high blood pressure and to prevent angina attacks.','সাধারণত উচ্চ রক্তচাপ ও অ্যানজাইনার আক্রমণ প্রতিরোধে ব্যবহৃত হয়।',['nhs-amlo'],'What amlodipine is for')],
 food_drink_notes:[claim('Avoid grapefruit and grapefruit juice; they may increase side effects.','গ্রেপফ্রুট ও গ্রেপফ্রুটের রস এড়িয়ে চলুন; পার্শ্বপ্রতিক্রিয়া বাড়তে পারে।',['nhs-amlo'],'Food and alcohol')],
 warnings:[claim('Dizziness or sleepiness can occur. Avoid driving or machinery if affected.','মাথা ঘোরা বা ঘুম ঘুম ভাব হতে পারে। এমন হলে গাড়ি চালানো বা যন্ত্র পরিচালনা এড়িয়ে চলুন।',['nhs-amlo'],'Side effects')]
}),
...(['Tablet','Syrup'] as const).map(form=>g(`cetirizine-${form.toLowerCase()}`,'Cetirizine hydrochloride',form,'IMMEDIATE','WITH_OR_WITHOUT_FOOD',claim('Can generally be taken with or without food.','সাধারণত খাবারের সঙ্গে বা ছাড়াও নেওয়া যায়।',['alatrol'],'Dosage and Administration'),{
 timing_guidance:claim('No specific time of day is required by this leaflet. Follow the schedule written on your prescription.','এই লিফলেটে দিনের নির্দিষ্ট সময় দেওয়া নেই। প্রেসক্রিপশনের সময়সূচি অনুসরণ করুন।',['alatrol'],'Dosage and Administration — time varies to suit needs'),
 common_uses:[claim('Commonly used for allergy symptoms and hives.','সাধারণত অ্যালার্জির লক্ষণ ও আমবাতের জন্য ব্যবহৃত হয়।',['alatrol'],'Indication')],
 administration_notes:[form==='Tablet'?claim('Swallow whole with a drink. Do not chew.','পানীয় দিয়ে পুরো ট্যাবলেট গিলে নিন। চিবাবেন না।',['nhs-cet'],'How to take it'):claim('Measure the prescribed amount with a medicine spoon or syringe, not a kitchen spoon.','ওষুধ মাপার চামচ বা সিরিঞ্জ দিয়ে প্রেসক্রিপশনে লেখা পরিমাণ মাপুন; রান্নাঘরের চামচ ব্যবহার করবেন না।',['nhs-cet'],'How to take liquid')],
 food_drink_notes:[claim('Avoid alcohol because it may increase sleepiness.','অ্যালকোহল এড়িয়ে চলুন; ঘুম ঘুম ভাব বাড়তে পারে।',['nhs-cet-notes'],'Can I drink alcohol?')],
 warnings:[claim('May cause sleepiness. Avoid driving or machinery if affected.','ঘুম ঘুম ভাব হতে পারে। এমন হলে গাড়ি চালানো বা যন্ত্র পরিচালনা এড়িয়ে চলুন।',['nhs-cet-notes'],'Can I drive?')]
}))
];
mkdirSync('src/data',{recursive:true});
for(const [name,data] of Object.entries({products,guidance,sources}))writeFileSync(`src/data/${name}.json`,JSON.stringify(data,null,2)+'\n');
console.log(`Authored ${products.length} products, ${guidance.length} formulation guidance records.`);
