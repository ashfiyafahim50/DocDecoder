import { TestItem, MedicineItem, RadiologyFinding, ExplainResponse, DocType } from "./schema";

export interface DemoSample {
  id: string;
  title: string;
  docType: DocType;
  category: string;
  description: string;
  tests: TestItem[];
  medicines: MedicineItem[];
  radiologyFindings?: RadiologyFinding[];
  cachedExplanation: Record<string, ExplainResponse>;
}

export const DEMO_SAMPLES: DemoSample[] = [
  {
    id: "prescription-complete",
    title: "Doctor Prescription (4 Medicines Routine)",
    docType: "prescription",
    category: "Prescriptions",
    description: "Decodes exact morning/night schedule, meal relation, how to take, and precautions.",
    tests: [],
    radiologyFindings: [],
    medicines: [
      {
        name: "Pan-D Capsule",
        genericName: "Pantoprazole (40mg) + Domperidone (30mg)",
        dose: "1 Capsule",
        form: "capsule",
        timing: {
          morning: true,
          afternoon: false,
          night: false,
          mealTiming: "empty_stomach",
          scheduleText: "1-0-0 (Subah Khali Pet)",
          howToTake: "Subah so kar uthte hi paani ke sath nigal lein. Iske 30-45 minute baad hi nashta karein.",
        },
        duration: "7 days",
        purpose: "Pet me gas, jalan aur acidity ko rokne ke liye.",
        precautions: "Capsule ko chabayein ya kholein nahi, poora niglein.",
      },
      {
        name: "Augmentin 625 Duo",
        genericName: "Amoxicillin (500mg) + Clavulanic Acid (125mg)",
        dose: "1 Tablet (625mg)",
        form: "tablet",
        timing: {
          morning: true,
          afternoon: false,
          night: true,
          mealTiming: "after_food",
          scheduleText: "1-0-1 (Subah aur Raat)",
          howToTake: "Subah nashte ke baad aur raat ko dinner ke baad 1 tablet paani ke sath lein.",
        },
        duration: "5 days complete course",
        purpose: "Bacterial infection ko theek karne ke liye antibiotic.",
        precautions: "Behtar feel hone par bhi 5 din ka poora course complete karein, beech me na chhorein.",
      },
      {
        name: "Dolo 650",
        genericName: "Paracetamol (650mg)",
        dose: "1 Tablet",
        form: "tablet",
        timing: {
          morning: false,
          afternoon: false,
          night: false,
          mealTiming: "as_needed",
          scheduleText: "SOS (Zaroorat padne par)",
          howToTake: "Jab tez bukhar ya sharir me dard ho, tabhi khana khane ke baad lein.",
        },
        duration: "As needed (SOS)",
        purpose: "Bukhar aur body pain kam karne ke liye.",
        precautions: "24 ghante me 3-4 se zyada tablets na lein. Do doses ke beech kam se kam 6 ghante ka gap rakhein.",
      },
      {
        name: "Becosules Z",
        genericName: "B-Complex + Vitamin C + Zinc",
        dose: "1 Capsule",
        form: "capsule",
        timing: {
          morning: false,
          afternoon: true,
          night: false,
          mealTiming: "after_food",
          scheduleText: "0-1-0 (Dopahar Lunch ke baad)",
          howToTake: "Dopahar ke khane ke baad 1 capsule paani ke sath lein.",
        },
        duration: "15 days",
        purpose: "Sharir ki immunity badhane aur kamzori door karne ke liye.",
        precautions: "Isko lene se urine thodi bright yellow ho sakti hai jo bilkul normal hai.",
      },
    ],
    cachedExplanation: {
      hinglish: {
        summary:
          "Yeh aapke doctor ki likhi hui 4 davaiyon ki prescription hai. Doctor ne infection theek karne ke liye antibiotic, acidity bachav, bukhar aur vitamin support diya hai. Har dawa ko lene ka sahi samay aur tarika neeche dekhein.",
        docType: "prescription",
        risksAndAlerts: [
          {
            title: "Antibiotic Course Warning",
            severity: "warning",
            riskDetail:
              "Augmentin 625 ek antibiotic hai. Agar aap isko beech me chhod denge toh bacteria dawayi ke khilaf resistant ho sakte hain.",
            immediateAction: "Doctor ke bataye poore 5 din tak subah-raat regular lein.",
          },
        ],
        findings: [],
        medicationRoutine: [
          {
            name: "Pan-D Capsule",
            genericName: "Pantoprazole + Domperidone",
            dose: "1 Capsule",
            form: "capsule",
            purpose: "Pet me gas, jalan aur acidity ko control karne ke liye.",
            howToTake: "Subah so kar uthte hi paani ke sath poora nigal lein. Chabana nahi hai.",
            whenToTake: "Subah (Morning)",
            mealTiming: "Khana khane se 30-40 minute pehle (Khali Pet)",
            duration: "7 din tak",
            keyPrecautions: "Ise khana khane ke baad na lein, khali pet hi sabse acha asar karti hai.",
          },
          {
            name: "Augmentin 625 Duo",
            genericName: "Amoxicillin + Clavulanic Acid",
            dose: "1 Tablet (625mg)",
            form: "tablet",
            purpose: "Bacterial infection ko khatam karne ke liye antibiotic.",
            howToTake: "Subah aur raat khane ke baad ek-ek tablet paani ke sath lein.",
            whenToTake: "Subah aur Raat (1-0-1)",
            mealTiming: "Khana khane ke baad (After Food)",
            duration: "Poore 5 din bina roke",
            keyPrecautions: "Khali pet lene se pet kharab ho sakta hai, isliye khane ke baad lein.",
          },
          {
            name: "Dolo 650",
            genericName: "Paracetamol (650mg)",
            dose: "1 Tablet",
            form: "tablet",
            purpose: "Bukhar ya sar/sharir dard hone par aaram ke liye.",
            howToTake: "Sirf tab lein jab bukhar ya dard ho. Khana khane ke baad paani ke sath lein.",
            whenToTake: "Zaroorat padne par (SOS)",
            mealTiming: "Khane ke baad (After Food)",
            duration: "Jab tak bukhar rahe",
            keyPrecautions: "24 ghante me 3-4 se zyada na lein. Do goli ke beech 6 ghante ka gap rakhein.",
          },
          {
            name: "Becosules Z",
            genericName: "Vitamin B-Complex + C + Zinc",
            dose: "1 Capsule",
            form: "capsule",
            purpose: "Immunity badhane aur antibiotic se aane wali kamzori ko rokne ke liye.",
            howToTake: "Dopahar ke khane ke baad paani ke sath lein.",
            whenToTake: "Dopahar (Lunch ke baad)",
            mealTiming: "Dopahar khane ke baad",
            duration: "15 din tak",
            keyPrecautions: "Ise lene ke baad urine yellow aana normal hai, ghabrayein nahi.",
          },
        ],
        doctorQuestions: [
          "Doctor sahab, agar 3 din me bukhar theek ho jaye, tab bhi kya Augmentin 5 din poore lene hain?",
          "Kya Pan-D lene ke baad main doodh ya chai pee sakta hoon?",
          "Mujhe follow-up checkup ke liye kitne din baad aana hai?",
        ],
        lifestyleAndCareNotes:
          "Khoob saara paani piyein, halke aur taze bane khane ka sevan karein aur paryaapt aaram karein.",
        disclaimer:
          "Important: Doc Decoder provides educational explanations to help you understand your prescription. Never alter your dosage without consulting your doctor.",
      },
    },
  },
  {
    id: "xray-chest",
    title: "Chest X-Ray (Mild Bronchitis / Normal Heart)",
    docType: "radiology_imaging",
    category: "Radiology & Scans",
    description: "Decodes lung fields, rib cage, cardiac shadow, and bronchovascular markings.",
    tests: [],
    medicines: [],
    radiologyFindings: [
      {
        bodyPart: "Chest & Lungs",
        studyType: "Digital Chest X-Ray (PA View)",
        observation:
          "Prominent bronchovascular markings seen in bilateral lower lung zones. No obvious consolidation or pneumothorax. Both costophrenic angles are clear. Cardiac silhouette is within normal limits.",
        impression: "Mild lower respiratory bronchial inflammation (Bronchitis). No active pneumonia or fluid accumulation.",
        isAbnormal: true,
        severity: "mild",
      },
    ],
    cachedExplanation: {
      hinglish: {
        summary:
          "Yeh aapka Chest (Phephdo) ka X-Ray report hai. Khushi ki baat yeh hai ki koi pneumonia, TV ya fluid (pani) nahi hai, aur heart ka size normal hai. Sirf neeche ke hisse me halki khansi ya bronchitis ki sujan dikh rahi hai.",
        docType: "radiology_imaging",
        risksAndAlerts: [
          {
            title: "Mild Bronchial Inflammation",
            severity: "warning",
            riskDetail:
              "Bronchial naliyon me halki sujan hai jo lambi khansi, viral infection ya pollution ki wajah se ho sakti hai.",
            immediateAction: "Doctor ko dikhayein taaki wo steam ya zaroori cough medication advise kar sakein.",
          },
        ],
        findings: [
          {
            parameterOrArea: "Lungs (Phephde)",
            flagOrStatus: "Mild Bronchial Markings",
            valueText: "Bilateral lower zones",
            simpleExplanation:
              "Phephdo ke neeche ke hisse me halki sujan dikh rahi hai, jo aksar seasonal khansi ya bronchitis me aati hai.",
          },
          {
            parameterOrArea: "Cardiac Silhouette (Heart Size)",
            flagOrStatus: "Normal",
            valueText: "Within normal limits",
            simpleExplanation: "Aapke dil ka aakar aur position bilkul sahi aur swasth hai.",
          },
          {
            parameterOrArea: "Costophrenic Angles",
            flagOrStatus: "Clear (Safe)",
            valueText: "Both angles clear",
            simpleExplanation: "Phephdo ke kinaro par koi paani ya pus jama nahi hai.",
          },
        ],
        medicationRoutine: [],
        doctorQuestions: [
          "Doctor, X-ray me bronchial markings aayi hain, kya mujhe koi specific syrup ya inhaler lene ki zaroorat hai?",
          "Kya mujhe steam lene se aaram milega?",
          "Kya yeh allergy ya pollution ki wajah se hai?",
        ],
        lifestyleAndCareNotes: "Gunguna paani piyein, thandi cheezein avoid karein aur dhoool-dhuyein se bachein.",
        disclaimer:
          "Important: Doc Decoder provides educational explanations. Always review X-ray films directly with your doctor.",
      },
    },
  },
  {
    id: "cbc-anemia",
    title: "Complete Blood Count (CBC Panel)",
    docType: "lab_report",
    category: "Hematology",
    description: "Low Hemoglobin (10.2 g/dL), mild fatigue indicator.",
    tests: [
      {
        name: "Hemoglobin",
        value: 10.2,
        unit: "g/dL",
        refLow: 13.0,
        refHigh: 17.0,
        flag: "low",
        confidence: "high",
      },
      {
        name: "RBC Count",
        value: 3.8,
        unit: "million/uL",
        refLow: 4.5,
        refHigh: 5.9,
        flag: "low",
        confidence: "high",
      },
      {
        name: "WBC Count",
        value: 7200,
        unit: "/uL",
        refLow: 4000,
        refHigh: 11000,
        flag: "normal",
        confidence: "high",
      },
      {
        name: "Platelet Count",
        value: 240000,
        unit: "/uL",
        refLow: 150000,
        refHigh: 450000,
        flag: "normal",
        confidence: "high",
      },
    ],
    medicines: [],
    cachedExplanation: {
      hinglish: {
        summary:
          "Yeh aapka Complete Blood Count (CBC) report hai. Platelets aur infection se ladne wale cells (WBC) bilkul normal hain, lekin oxygen carry karne wala Hemoglobin thoda kam hai jisse thakan mehsoos ho sakti hai.",
        docType: "lab_report",
        risksAndAlerts: [
          {
            title: "Mild Hemoglobin Deficiency",
            severity: "warning",
            riskDetail: "Hemoglobin 10.2 g/dL hai jo normal limit (13.0) se kam hai.",
            immediateAction: "Doctor se diet me iron badhane ya iron profile test ke baare me baat karein.",
          },
        ],
        findings: [
          {
            parameterOrArea: "Hemoglobin",
            flagOrStatus: "low",
            valueText: "10.2 g/dL (Normal: 13.0 - 17.0)",
            simpleExplanation: "Sharir me khoon aur oxygen carry karne ki kshamata thodi kam hai.",
          },
        ],
        medicationRoutine: [],
        doctorQuestions: [
          "Doctor, kya mujhe iron ki supplements shuru karni chahiye ya diet se theek hoga?",
          "Kitne mahine baad test repeat karana hai?",
        ],
        lifestyleAndCareNotes: "Palak, chana, beetroot aur purn aahar lein.",
        disclaimer: "Educational summary only. Consult your doctor.",
      },
    },
  },
  {
    id: "critical-potassium",
    title: "Critical Lab Value Alert (Emergency Rule)",
    docType: "lab_report",
    category: "Emergency Alert",
    description: "Dangerously high potassium (6.4 mEq/L) triggering urgent red-flag.",
    tests: [
      {
        name: "Serum Potassium",
        value: 6.4,
        unit: "mEq/L",
        refLow: 3.5,
        refHigh: 5.1,
        flag: "critical",
        confidence: "high",
      },
      {
        name: "Serum Sodium",
        value: 138,
        unit: "mEq/L",
        refLow: 135,
        refHigh: 145,
        flag: "normal",
        confidence: "high",
      },
    ],
    medicines: [],
    cachedExplanation: {
      hinglish: {
        summary:
          "Dhyan dein: Is report me Serum Potassium ka level critical safety limit (5.1) se kafi zyada 6.4 aaya hai. Yeh dil ki rhythm ke liye dangerous ho sakta hai aur ispar turant doctor ki salah zaroori hai.",
        docType: "lab_report",
        risksAndAlerts: [
          {
            title: "CRITICAL: Severe Hyperkalemia (Potassium > 6.2)",
            severity: "urgent",
            riskDetail:
              "Serum Potassium 6.4 mEq/L hai. Itna high potassium heart rhythm me gadbadi kar sakta hai.",
            immediateAction: "Turant emergency clinic ya treating doctor se sampark karein.",
          },
        ],
        findings: [
          {
            parameterOrArea: "Serum Potassium",
            flagOrStatus: "critical",
            valueText: "6.4 mEq/L (Critical threshold > 6.2)",
            simpleExplanation: "Potassium dil ke electrical signals ko control karta hai, iska itna badhna risky hai.",
          },
        ],
        medicationRoutine: [],
        doctorQuestions: [
          "Doctor, mera potassium 6.4 aaya hai, kya mujhe turant ECG karana chahiye?",
          "Kya meri koi ongoing medicine ya kidney function iska kaaran hai?",
        ],
        lifestyleAndCareNotes: "Kela, nariyal paani ya high potassium fruit filhal band rakhein.",
        disclaimer: "Immediate medical consultation required.",
      },
    },
  },
];
