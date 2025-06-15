import type { Question } from "./page";

export async function loadQuestions(): Promise<Question[]> {
  const res = await fetch('/complete_rental_questions_with_title.json');
  const data = await res.json();
  // Map the JSON structure to a flat array of open field questions, preserving all properties
  return (data as Question[]).map((q, idx) => ({
    ...q,
    label: q.label || `אנא הזן ערך עבור ${q.name}`,
    name: q.name || `q${idx + 1}`,
    type: q.type || q.inputType || 'text',
    section: (q.section || q["סעיף"] || 'שונות').trim(),
  }));
}

export const groupedQuestions = [
  {
    group: "עליך",
    questions: [
      {
        name: "landlordName",
        label: "איך נרשום אותך בחוזה? (שם מלא כמו בתעודת זהות) 🙂",
        type: "text"
      },
      {
        name: "landlordId",
        label: "מה מספר תעודת הזהות שלך?",
        type: "text"
      },
      {
        name: "landlordPhone",
        label: "איך אפשר ליצור איתך קשר? (טלפון או אימייל)",
        type: "text"
      }
    ]
  },
  {
    group: "על הדירה",
    questions: [
      {
        name: "propertyAddress",
        label: "איפה הדירה נמצאת? (כתובת מלאה, כולל עיר ורחוב)",
        type: "text"
      },
      {
        name: "hasParking",
        label: "יש חניה שמגיעה עם הדירה?",
        type: "select",
        options: ["כן", "לא"]
      },
      {
        name: "hasStorage",
        label: "יש מחסן שמגיע עם הדירה?",
        type: "select",
        options: ["כן", "לא"]
      },
      {
        name: "furniture",
        label: "הדירה מרוהטת? אילו פריטים נשארים?",
        type: "multiselect",
        options: ["מיטה", "ספה", "מקרר", "תנור", "ארון", "אחר"]
      }
    ]
  }
];

export const questions = [
  { label: "בוא נתחיל בשמך – איך נכתוב אותך בתור בעל הבית? 🙂", name: "fullName", type: "text", placeholder: "כמו בתעודת זהות – שם פרטי + שם משפחה" },
  { label: "מה מספר תעודת הזהות של בעל הדירה?", name: "idNumber", type: "text", placeholder: "מספר ת.ז. של בעל הדירה" },
  { label: "ואיך אפשר לפנות אליך אם נצטרך?", name: "phone", type: "text", placeholder: "מספר טלפון שיש לך עליו וואטסאפ 📱" },
  { label: "ולמקרה שנצטרך – איפה אתה גר ביומיום?", name: "homeAddress", type: "text", placeholder: "רק לצורך ניסוח החוזה. לא נשתמש בזה מעבר" },
  { label: "איפה נמצא הנכס שאתה משכיר? (כתובת מלאה)", name: "propertyAddress", type: "text", placeholder: "עיר, רחוב, מספר, דירה, כניסה – כמה שיותר מדויק 🏠" },
  { label: "מה שם הרחוב של הדירה?", name: "street", type: "text", placeholder: "לדוגמה: גאולים" },
  { label: "מה מספר הדירה?", name: "apartmentNumber", type: "text", placeholder: "לדוגמה: 14" },
  { label: "באיזו קומה הדירה?", name: "floor", type: "text", placeholder: "לדוגמה: 7 או קרקע" },
  { label: "מה מספר הכניסה?", name: "entrance", type: "text", placeholder: "לדוגמה: 1" },
  { label: "באיזו עיר הדירה?", name: "city", type: "text", placeholder: "לדוגמה: תל אביב" },
  { label: "יש חניה ששייכת לדירה?", name: "parking", type: "select", options: ["כן", "לא"], placeholder: "אם כן – נכניס אותה לחוזה" },
  { label: "מה מספר החניה?", name: "parkingNumber", type: "text", placeholder: "לדוגמה: 70" },
  { label: "יש גם מחסן שמגיע עם הדירה?", name: "storage", type: "select", options: ["כן", "לא"], placeholder: "לא חובה, אבל שווה לציין אם יש" },
  { label: "מה מספר המחסן?", name: "storageNumber", type: "text", placeholder: "לדוגמה: 29" },
  { label: "מי השוכר שאתה סוגר איתו את החוזה?", name: "tenantName", type: "text", placeholder: "שם מלא של כל שוכר" },
  { label: "מה מספר תעודת הזהות של השוכר?", name: "tenantIdNumber", type: "text", placeholder: "מספר ת.ז. של השוכר" },
  { label: "מה מספר הטלפון של השוכר?", name: "tenantPhone", type: "text", placeholder: "לדוגמה: 052-7654321" },
  { label: "מה הכתובת הנוכחית של הדייר שלך?", name: "tenantAddress", type: "text", placeholder: "כתובת נוכחית של השוכר, לצרכי החוזה בלבד" },
  { label: "מתי השוכר שלך נכנס לגור בדירה?", name: "moveInDate", type: "date", placeholder: "תאריך התחלה של השכירות" },
  { label: "מה תאריך הסיום של תקופת השכירות?", name: "rentEndDate", type: "date", placeholder: "תאריך סיום השכירות" },
  { label: "כמה שכר דירה אתה גובה כל חודש?", name: "monthlyRent", type: "text", placeholder: "כמה ייכנס לך לחשבון כל חודש 💸" },
  { label: "יש תוספת לשכר הדירה באופציה?", name: "optionAmount", type: "text", placeholder: "לדוגמה: 6,100" },
  { label: "מה סכום הפיקדון?", name: "depositAmount", type: "text", placeholder: "לדוגמה: 12,000" },
  { label: "מה סכום שטר החוב?", name: "guaranteeAmount", type: "text", placeholder: "לדוגמה: 70,000" },
  { label: "מה סכום הערבות הבנקאית?", name: "bankGuaranteeAmount", type: "text", placeholder: "לדוגמה: 25,000" },
  { label: "כמה ערבים יהיו?", name: "guarantorsCount", type: "text", placeholder: "לדוגמה: 2" },
  { label: "יש מישהו אחר שמשלם בשבילו?", name: "otherPayer", type: "select", options: ["כן", "לא"], placeholder: "למשל הורה או גוף תומך" },
  { label: "לכמה זמן אתם סוגרים את החוזה?", name: "contractDuration", type: "number", placeholder: "רוב החוזים הם לשנה – אבל זה לגמרי תלוי בך" },
  { label: "באיזה תאריך בכל חודש תרצה לקבל את התשלום?", name: "rentDueDay", type: "text", placeholder: "למשל: בכל 1 לחודש" },
  { label: "מה הדרך הכי נוחה לך לקבל את התשלום?", name: "preferredPaymentMethod", type: "select", options: ["העברה בנקאית", "שיקים", "אחר"], placeholder: "מה שהכי נוח לך" },
  { label: "איך השוכר יעביר את התשלום?", name: "paymentDetails", type: "text", placeholder: "למשל: צ׳קים, העברה בנקאית, פיקדון" },
  { label: "מתי אתה מצפה לקבל את התשלום הראשון?", name: "firstPaymentDate", type: "date", placeholder: "מתי יועבר התשלום הראשון בפועל" },
  { label: "רוצה להשאיר אופציה להארכת חוזה?", name: "extensionOption", type: "select", options: ["כן", "לא"], placeholder: "כדי לאפשר לשוכר להמשיך בלי חוזה חדש" },
  { label: "יש תוספות לשכר הדירה בהארכה?", name: "extensionRentAddition", type: "text", placeholder: "אם יש אופציה – תוכל לציין סכום חדש" },
  { label: "מה משאיר אותך רגוע?", name: "guarantees", type: "multiselect", options: ["צ׳ק ביטחון", "שטר חוב", "ערבות בנקאית", "ערב"], placeholder: "בחר את הבטחונות שתרצה לקבל" },
  { label: "רשום כמה כל בטחון שווה – לדוגמה: 10,000 ש״ח לצ׳ק ביטחון", name: "guaranteeAmounts", type: "text", placeholder: "לדוגמה: 10,000 ש״ח לצ׳ק ביטחון" },
  { label: "יש לך דרישה לערב בחוזה?", name: "requireGuarantor", type: "select", options: ["כן", "לא"], placeholder: "אם כן – נבקש את פרטיו" },
  { label: "אם יש ערב – איזה סוג אתה מעדיף?", name: "guarantorType", type: "select", options: ["ערבות רגילה", "ערבות אוואל"], placeholder: "למשל: ערבות אוואל, ערבות רגילה" },
  { label: "תן לנו את הפרטים של הערב – שם, טלפון, תעודת זהות וכתובת", name: "guarantorDetails", type: "text", placeholder: "שם, טלפון, כתובת, תעודת זהות" },
  { label: "אם השוכר מתעכב בפינוי – כמה זה עולה?", name: "lateEvictionPenalty", type: "text", placeholder: "פיצוי יומי – לפי שיקולך" },
  { label: "מאפשר להכניס בעלי חיים לדירה?", name: "allowPets", type: "select", options: ["כן", "לא"], placeholder: "שיהיה ברור לכולם מראש 🐶" },
  { label: "צפוי שיפוץ או תמ״א בזמן השכירות?", name: "expectedRenovation", type: "select", options: ["כן", "לא"], placeholder: "כדי למנוע הפתעות – עדיף להכניס לחוזה" },
  { label: "יש משהו מיוחד שתרצה שנכניס לחוזה?", name: "specialClause", type: "text", placeholder: "כל דבר שתרצה להבהיר מראש – זו ההזדמנות" },
  { label: "רוצה שנכניס סעיף על ביטוח למקרה של נזק בדירה?", name: "insuranceClause", type: "select", options: ["כן", "לא"], placeholder: "במקרים של נזק לדירה או לתכולה" },
  { label: "יש כללים שאתה רוצה להבהיר מראש?", name: "houseRules", type: "text", placeholder: "למשל: לא לעשן, לא לארח, לא להכניס בעלי חיים" },
  { label: "איך תרצה לקבל את החוזה לחתימה?", name: "contractDelivery", type: "multiselect", options: ["שלח לי PDF", "חתימה דיגיטלית", "שליחה לשוכר"], placeholder: "PDF למייל? חתימה דיגיטלית? שליחה לשוכר?" },
  { label: "איך לשלוח לך את החוזה כשהוא מוכן?", name: "contractSendMethod", type: "select", options: ["מייל", "וואטסאפ", "שניהם"], placeholder: "מייל, וואטסאפ, או שניהם" },
  { label: "יש משהו נוסף שחשוב לך להוסיף לפני שנסיים?", name: "finalNotes", type: "text", placeholder: "כל דבר נוסף שאתה רוצה שייכנס למסמך" },
  // ... (continue for all questions in the CSV, matching order and type)
]; 