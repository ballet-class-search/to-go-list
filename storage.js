const DB_NAME = "princess-to-go-list";
const DB_VERSION = 1;
const STORE_NAME = "spots";
const LEGACY_KEY = "want-to-go-spots-v1";

const sampleSpots = [
  {
    id: "sample-cafe",
    name: "サンセットテラス レア",
    category: "ご飯",
    photos: [],
    imageUrl: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1400&q=85",
    description: "海が見えるテラス席が素敵なカフェ。夕暮れの時間に行きたい。",
    areas: ["東京"],
    genre: "カフェ",
    budget: "3,000〜5,000円",
    status: "気になる",
    priority: 4,
    links: [{ label: "公式サイト", url: "https://example.com" }],
    memo: "友達の誕生日にぴったりかも。",
    visitedDate: "",
    visitLog: "",
    createdAt: "2026-05-01T09:00:00.000Z",
    updatedAt: "2026-05-12T09:00:00.000Z",
  },
  {
    id: "sample-hotel",
    name: "ラグジュアリーホテル 東京ベイ",
    category: "外出",
    photos: [],
    imageUrl: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1400&q=85",
    description: "記念日に泊まりたい憧れのホテル。お部屋からの夜景が最高らしい。",
    areas: ["千葉"],
    genre: "ホテル",
    budget: "5,000円以上",
    status: "気になる",
    priority: 5,
    links: [],
    memo: "アニバーサリープランをチェック。",
    visitedDate: "",
    visitLog: "",
    createdAt: "2026-04-20T09:00:00.000Z",
    updatedAt: "2026-05-10T09:00:00.000Z",
  },
];

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function migrateSpot(spot) {
  const priorityMap = { 高: 5, 中: 3, 低: 1 };
  const statusMap = { 今度行く: "気になる", また行きたい: "行った" };
  const areas = [...new Set((Array.isArray(spot.areas) ? spot.areas : [spot.area]).map((area) => String(area || "").trim()).filter(Boolean))];
  return {
    ...spot,
    areas,
    area: undefined,
    photos: Array.isArray(spot.photos) ? spot.photos : [],
    links: Array.isArray(spot.links)
      ? spot.links
      : spot.url ? [{ label: "関連リンク", url: spot.url }] : [],
    priority: typeof spot.priority === "number" ? spot.priority : priorityMap[spot.priority] || 3,
    status: statusMap[spot.status] || spot.status || "気になる",
  };
}

async function seedOrMigrate(db) {
  const count = await requestResult(db.transaction(STORE_NAME).objectStore(STORE_NAME).count());
  if (count > 0) return;
  let initial = sampleSpots;
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
    if (Array.isArray(legacy) && legacy.length) initial = legacy.map(migrateSpot);
  } catch {
    // Invalid legacy data should not prevent the app from opening.
  }
  const transaction = db.transaction(STORE_NAME, "readwrite");
  initial.forEach((spot) => transaction.objectStore(STORE_NAME).put(migrateSpot(spot)));
  await transactionDone(transaction);
}

export async function loadSpots() {
  const db = await openDatabase();
  await seedOrMigrate(db);
  const spots = await requestResult(db.transaction(STORE_NAME).objectStore(STORE_NAME).getAll());
  return spots.map(migrateSpot);
}

export async function saveSpot(spot) {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).put(migrateSpot(spot));
  await transactionDone(transaction);
}

export async function deleteSpot(id) {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).delete(id);
  await transactionDone(transaction);
}
