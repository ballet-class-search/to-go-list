export const MAIN_CATEGORIES = ["ご飯", "外出"] as const;
export const STATUSES = ["気になる", "今度行く", "予定あり", "行った", "また行きたい"] as const;
export const PRIORITIES = ["高", "中", "低"] as const;
export const FOOD_GENRES = ["カフェ", "スイーツ", "ランチ", "ディナー", "和食", "洋食", "イタリアン", "フレンチ", "中華", "韓国料理", "居酒屋", "バー", "ベーカリー", "その他"];
export const OUTING_GENRES = ["美術館", "展覧会", "映画", "芸術", "レジャー", "体験", "ショッピング", "街歩き", "自然", "季節イベント", "旅行", "ホテル", "公園", "その他"];
export const FOOD_BUDGETS = ["〜1,000円", "1,000〜3,000円", "3,000〜5,000円", "5,000〜10,000円", "10,000円以上"];
export const OUTING_BUDGETS = ["無料", "〜1,000円", "1,000〜3,000円", "3,000〜5,000円", "5,000円以上"];
export const SCENES = ["ひとり", "友達", "デート", "家族", "作業", "特別な日"];
export const SEASONS = ["春", "夏", "秋", "冬", "雨の日", "晴れの日", "夜", "休日"];
export const AREAS = ["渋谷", "新宿", "銀座", "東京", "上野", "浅草", "吉祥寺", "横浜", "鎌倉", "その他"];

export type Spot = {
  id: string;
  name: string;
  mainCategory: (typeof MAIN_CATEGORIES)[number];
  imageUrl?: string;
  description?: string;
  area?: string;
  genres: string[];
  budget?: string;
  sceneTags: string[];
  seasonTags: string[];
  status: (typeof STATUSES)[number];
  priority: (typeof PRIORITIES)[number];
  address?: string;
  url?: string;
  memo?: string;
  reason?: string;
  plannedDate?: string;
  visitedDate?: string;
  visitLog?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  wantToGoAgain?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SpotDraft = Omit<Spot, "id" | "createdAt" | "updatedAt">;

export const emptyDraft: SpotDraft = {
  name: "",
  mainCategory: "ご飯",
  imageUrl: "",
  description: "",
  area: "",
  genres: [],
  budget: "",
  sceneTags: [],
  seasonTags: [],
  status: "気になる",
  priority: "中",
  address: "",
  url: "",
  memo: "",
  reason: "",
  plannedDate: "",
  visitedDate: "",
  visitLog: "",
  wantToGoAgain: false,
};

const now = "2026-06-09T09:00:00.000Z";
export const sampleSpots: Spot[] = [
  {
    ...emptyDraft, id: "sample-1", name: "喫茶 月白", mainCategory: "ご飯",
    imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    description: "静かな午後に、季節のケーキと深煎りコーヒー。", area: "吉祥寺",
    genres: ["カフク", "スイーツ"], budget: "1,000〜3,000円", sceneTags: ["ひとり", "友達"],
    status: "今度行く", priority: "高", plannedDate: "2026-06-20", reason: "窓際の席でゆっくりしたい",
    createdAt: now, updatedAt: now
  },
  {
    ...emptyDraft, id: "sample-2", name: "光と影のデザイン展", mainCategory: "外出",
    imageUrl: "https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1200&q=80",
    description: "空間と光をテーマにした企画展。", area: "上野", genres: ["展覧会", "芸術"],
    budget: "1,000〜3,000円", sceneTags: ["ひとり", "デート"], seasonTags: ["雨の日", "休日"],
    status: "予定あり", priority: "高", plannedDate: "2026-06-14", createdAt: now, updatedAt: now
  },
  {
    ...emptyDraft, id: "sample-3", name: "海辺の小さなホテル", mainCategory: "外出",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    description: "朝の海を眺めて、何もしない一日。", area: "鎌倉", genres: ["旅行", "ホテル"],
    budget: "5,000円以上", sceneTags: ["特別な日"], seasonTags: ["夏", "晴れの日"],
    status: "行った", priority: "中", visitedDate: "2026-05-24", rating: 5,
    wantToGoAgain: true, visitLog: "夕暮れの散歩が最高だった。次は連泊して本も読みたい。",
    createdAt: now, updatedAt: now
  },
  {
    ...emptyDraft, id: "sample-4", name: "路地裏ビストロ", mainCategory: "ご飯",
    description: "記念日に行きたい、気取らないフレンチ。", area: "銀座", genres: ["フレンチ", "ディナー"],
    budget: "5,000〜10,000円", sceneTags: ["デート", "特別な日"], status: "気になる", priority: "中",
    createdAt: now, updatedAt: now
  }
];
