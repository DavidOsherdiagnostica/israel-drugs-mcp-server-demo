/**
 * Complete administration routes (Matan) list for Israeli healthcare system
 * This list contains all available drug administration methods with their IDs
 */

export interface MatanRoute {
  id: number;
  text: string;
}

export const MATAN_LIST: MatanRoute[] = [
  { id: 16, text: "אוזני" },
  { id: 71, text: "איבר מין" },
  { id: 194, text: "אין תכשירים כאלה" },
  { id: 51, text: "אינפוזיה תוך-ורידית" },
  { id: 87, text: "אנאלי חיצוני" },
  { id: 14, text: "אפי" },
  { id: 3, text: "אפידורל" },
  { id: 197, text: "בחלל הפה" },
  { id: 23, text: "בין-עורי" },
  { id: 83, text: "דיאליזה לחלל הבטן" },
  { id: 75, text: "דנטלי" },
  { id: 120, text: "האכלה דרך צינור" },
  { id: 168, text: "הזנה תוך ורידית" },
  { id: 53, text: "הזרקה" },
  { id: 200, text: "הזרקה לגיד או לציסטה" },
  { id: 88, text: "הזרקה שינית מוחדרת" },
  { id: 32, text: "הזרקה תת-רירית" },
  { id: 195, text: "התקן לתוך הפה" },
  { id: 25, text: "וגינלי" },
  { id: 176, text: "זריקה באזור צוואר הרחם" },
  { id: 126, text: "זריקה ליד המפרק" },
  { id: 22, text: "חיצוני" },
  { id: 178, text: "חיצוני" },
  { id: 158, text: "חיצוני בניתוח" },
  { id: 166, text: "חסם עצב דנטלי" },
  { id: 134, text: "חסמי עצב פריפריאליים" },
  { id: 198, text: "טיפות אף" },
  { id: 181, text: "טפטוף תוך-עיני" },
  { id: 174, text: "לאגן" },
  { id: 184, text: "להחדרה מקומית" },
  { id: 145, text: "להחדרה רקטלית" },
  { id: 164, text: "לזגוגית העין" },
  { id: 185, text: "לחלל הבטן" },
  { id: 179, text: "למעי" },
  { id: 157, text: "למערכת העיכול" },
  { id: 196, text: "לסביבת העצב" },
  { id: 201, text: "לסביבת הפצע" },
  { id: 175, text: "לעצבי הצלעות" },
  { id: 46, text: "לצוואר הרחם" },
  { id: 24, text: "לצינור השופכה" },
  { id: 190, text: "לצרכי רפואה" },
  { id: 193, text: "לקנה הנשימה והריאה" },
  { id: 151, text: "לרקמות רכות" },
  { id: 40, text: "לשימוש עם מכשירי המודיאליזה" },
  { id: 139, text: "לשימוש עם מפריד תאי דם" },
  { id: 155, text: "לתוך בקע" },
  { id: 154, text: "לתוך הזנב\\עצם הזנב" },
  { id: 8, text: "לתוך השד" },
  { id: 160, text: "לתוך כלי הדם" },
  { id: 84, text: "לתוך מסב השן" },
  { id: 128, text: "לתוך נוזל העצם" },
  { id: 148, text: "לתוך נוזל העצם" },
  { id: 173, text: "לתוך עצב" },
  { id: 118, text: "לתוך פצע" },
  { id: 130, text: "לתוך קרום הריאה" },
  { id: 189, text: "לתוך שלפוחית" },
  { id: 114, text: "לתוך שלפוחית השתן" },
  { id: 177, text: "מתחת לחך" },
  { id: 21, text: "מתחת ללשון" },
  { id: 62, text: "סביב פי הטבעת" },
  { id: 2, text: "עורי" },
  { id: 187, text: "עורי" },
  { id: 15, text: "עיני" },
  { id: 131, text: "ערפול" },
  { id: 17, text: "פומי" },
  { id: 180, text: "פומי" },
  { id: 109, text: "פומי באוכל" },
  { id: 170, text: "פומי בחלל הפה" },
  { id: 108, text: "פומי במי שתיה" },
  { id: 12, text: "פומי מקומי" },
  { id: 192, text: "פנים הלחי" },
  { id: 13, text: "ציפורן" },
  { id: 183, text: "ציפורניים - חיצוני" },
  { id: 90, text: "קרקפת - חיצוני" },
  { id: 11, text: "רחיצות" },
  { id: 191, text: "רירי" },
  { id: 18, text: "רקטלי" },
  { id: 48, text: "שאיפה" },
  { id: 172, text: "שאיפה באמצעות נבולייזר (מערפל)" },
  { id: 77, text: "שדרתי" },
  { id: 212, text: "שטיפת פה" },
  { id: 136, text: "שתל" },
  { id: 156, text: "תוך חדרי" },
  { id: 141, text: "תוך לבבי" },
  { id: 209, text: "תוך לבבי" },
  { id: 144, text: "תוך לימפתי" },
  { id: 89, text: "תוך מפרקי" },
  { id: 142, text: "תוך ריאתי" },
  { id: 182, text: "תוך-אפי" },
  { id: 76, text: "תוך-בטני" },
  { id: 42, text: "תוך-וגינלי" },
  { id: 6, text: "תוך-ורידי" },
  { id: 162, text: "תוך-ורידי בנוזלי אינפוזיה" },
  { id: 66, text: "תוך-עוברי" },
  { id: 30, text: "תוך-עורי" },
  { id: 122, text: "תוך-עורקי" },
  { id: 43, text: "תוך-עיני" },
  { id: 85, text: "תוך-עכוזי" },
  { id: 98, text: "תוך-פיני" },
  { id: 104, text: "תוך-קני" },
  { id: 10, text: "תוך-רחמי" },
  { id: 9, text: "תוך-שדרתי" },
  { id: 121, text: "תוך-שדרתי" },
  { id: 5, text: "תוך-שרירי" },
  { id: 19, text: "תת-עורי" },
  { id: 132, text: "תת-עורי עמוק" }
];

/**
 * Common administration routes with English translations
 */
export const COMMON_ROUTES = [
  { id: 17, hebrew: "פומי", english: "Oral" },
  { id: 2, hebrew: "עורי", english: "Topical/Skin" },
  { id: 15, hebrew: "עיני", english: "Eye" },
  { id: 16, hebrew: "אוזני", english: "Ear" },
  { id: 6, hebrew: "תוך-ורידי", english: "Intravenous" },
  { id: 5, hebrew: "תוך-שרירי", english: "Intramuscular" },
  { id: 18, hebrew: "רקטלי", english: "Rectal" },
  { id: 25, hebrew: "וגינלי", english: "Vaginal" },
  { id: 14, hebrew: "אפי", english: "Nasal" },
  { id: 48, hebrew: "שאיפה", english: "Inhalation" }
];

/**
 * Helper function to generate formatted administration routes list for tool descriptions
 */
export function generateMatanDescription(): string {
  return COMMON_ROUTES.map(route => 
    `- ${route.hebrew} (ID: ${route.id}) - ${route.english}`
  ).join('\n');
}

/**
 * Find route ID by Hebrew name
 */
export function findRouteByName(name: string): MatanRoute | undefined {
  return MATAN_LIST.find(route => route.text === name);
}

/**
 * Get all available route names
 */
export function getAllRouteNames(): string[] {
  return MATAN_LIST.map(route => route.text);
}

/**
 * Get statistics about administration routes
 */
export function getMatanStats() {
  return {
    totalRoutes: MATAN_LIST.length,
    commonRoutes: COMMON_ROUTES.length
  };
}

