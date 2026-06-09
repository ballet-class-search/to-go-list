const KEY="want-to-go-spots-v1";
export const sampleSpots=[
{id:"cafe",name:"喫茶アネモネ",category:"ご飯",imageUrl:"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",description:"季節のプリンと深煎りコーヒーが気になる喫茶店。",area:"吉祥寺",genre:"カフェ",budget:"1,000〜3,000円",status:"今度行く",priority:"高",memo:"開店直後を狙いたい。",plannedDate:"",visitedDate:"",visitLog:"",url:"",createdAt:"2026-05-20T09:00:00Z",updatedAt:"2026-06-08T09:00:00Z"},
{id:"museum",name:"光と色の小さな美術館",category:"外出",imageUrl:"https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1200&q=80",description:"現代アートをゆっくり見られる週末限定の美術館。",area:"清澄白河",genre:"美術館",budget:"〜1,000円",status:"気になる",priority:"中",memo:"近くのベーカリーにも寄る。",plannedDate:"",visitedDate:"",visitLog:"",url:"",createdAt:"2026-05-25T09:00:00Z",updatedAt:"2026-06-05T09:00:00Z"}];
export function loadSpots(){try{const v=localStorage.getItem(KEY);if(v!==null)return JSON.parse(v);saveSpots(sampleSpots);return structuredClone(sampleSpots)}catch{return structuredClone(sampleSpots)}}
export function saveSpots(spots){localStorage.setItem(KEY,JSON.stringify(spots))}
