import { sampleSpots, Spot, SpotDraft } from "./spots";

const STORAGE_KEY = "ikitai-tokoro-spots-v1";

export const spotStorage = {
  getSpots(): Spot[] {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleSpots));
      return sampleSpots;
    }
    try {
      return JSON.parse(raw) as Spot[];
    } catch {
      return sampleSpots;
    }
  },
  saveSpots(spots: Spot[]) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(spots));
  },
  addSpot(draft: SpotDraft): Spot {
    const timestamp = new Date().toISOString();
    return { ...draft, id: crypto.randomUUID(), createdAt: timestamp, updatedAt: timestamp };
  },
  updateSpot(spot: Spot, draft: SpotDraft): Spot {
    return { ...spot, ...draft, updatedAt: new Date().toISOString() };
  }
};
