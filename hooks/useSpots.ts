"use client";

import { useEffect, useState } from "react";
import { spotStorage } from "@/lib/spotStorage";
import { Spot, SpotDraft } from "@/lib/spots";

export function useSpots() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSpots(spotStorage.getSpots());
    setReady(true);
  }, []);

  const persist = (next: Spot[]) => {
    setSpots(next);
    spotStorage.saveSpots(next);
  };

  return {
    spots,
    ready,
    addSpot: (draft: SpotDraft) => persist([spotStorage.addSpot(draft), ...spots]),
    updateSpot: (id: string, draft: SpotDraft) => persist(spots.map((spot) => spot.id === id ? spotStorage.updateSpot(spot, draft) : spot)),
    deleteSpot: (id: string) => persist(spots.filter((spot) => spot.id !== id)),
    replaceSpots: persist,
  };
}
