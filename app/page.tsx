"use client";

import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { useSpots } from "@/hooks/useSpots";
import {
  AREAS, emptyDraft, FOOD_BUDGETS, FOOD_GENRES, MAIN_CATEGORIES, OUTING_BUDGETS,
  OUTING_GENRES, PRIORITIES, SCENES, SEASONS, STATUSES, Spot, SpotDraft
} from "@/lib/spots";

type View = "カード" | "今度行く" | "行った場所" | "訪問日記" | "進捗ボード";
const VIEWS: View[] = ["カード", "今度行く", "行った場所", "訪問日記", "進捗ボード"];
const statusTone: Record<string, string> = {
  "気になる": "lavender", "今度行く": "blue", "予定あり": "orange", "行った": "green", "また行きたい": "pink"
};

const unique = (values: (string | undefined)[]) => [...new Set(values.filter(Boolean) as string[])];
const dateLabel = (date?: string) => date ? new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${date}T00:00:00`)) : "";
const isVisited = (spot: Spot) => Boolean(spot.visitedDate) || ["行った", "また行きたい"].includes(spot.status);

export default function Home() {
  const { spots, ready, addSpot, updateSpot, deleteSpot, replaceSpots } = useSpots();
  const [category, setCategory] = useState<"すべて" | Spot["mainCategory"]>("すべて");
  const [view, setView] = useState<View>("カード");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ area: "", genre: "", budget: "", status: "", priority: "", season: "", scene: "" });
  const [sort, setSort] = useState("更新日順");
  const [editing, setEditing] = useState<Spot | null | "new">(null);
  const importRef = useRef<HTMLInputElement>(null);

  const options = useMemo(() => ({
    areas: unique(spots.map((s) => s.area)).concat(AREAS).filter((v, i, a) => a.indexOf(v) === i),
    genres: unique(spots.flatMap((s) => s.genres)),
    budgets: unique(spots.map((s) => s.budget)),
  }), [spots]);

  const filtered = useMemo(() => {
    const q = query.toLocaleLowerCase();
    let result = spots.filter((spot) => {
      const text = [spot.name, spot.description, spot.area, spot.memo, spot.reason, spot.address, ...spot.genres, ...spot.sceneTags, ...spot.seasonTags].join(" ").toLocaleLowerCase();
      return (category === "すべて" || spot.mainCategory === category)
        && (!q || text.includes(q))
        && (!filters.area || spot.area === filters.area)
        && (!filters.genre || spot.genres.includes(filters.genre))
        && (!filters.budget || spot.budget === filters.budget)
        && (!filters.status || spot.status === filters.status)
        && (!filters.priority || spot.priority === filters.priority)
        && (!filters.season || spot.seasonTags.includes(filters.season))
        && (!filters.scene || spot.sceneTags.includes(filters.scene));
    });
    if (view === "今度行く") result = result.filter((s) => ["今度行く", "予定あり"].includes(s.status)).sort((a, b) => (a.plannedDate || "9999").localeCompare(b.plannedDate || "9999"));
    if (view === "行った場所" || view === "訪問日記") result = result.filter((s) => view === "訪問日記" ? Boolean(s.visitedDate) : ["行った", "また行きたい"].includes(s.status)).sort((a, b) => (b.visitedDate || "").localeCompare(a.visitedDate || ""));
    if (view === "カード") {
      result.sort((a, b) => {
        const visitedOrder = Number(isVisited(a)) - Number(isVisited(b));
        if (visitedOrder !== 0) return visitedOrder;
        return sort === "評価順" ? (b.rating || 0) - (a.rating || 0) : sort === "訪問日順" ? (b.visitedDate || "").localeCompare(a.visitedDate || "") : sort === "優先度順" ? PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority) : b.updatedAt.localeCompare(a.updatedAt);
      });
    }
    return result;
  }, [spots, category, query, filters, view, sort]);

  const setFilter = (key: keyof typeof filters, value: string) => setFilters((f) => ({ ...f, [key]: value }));
  const resetFilters = () => setFilters({ area: "", genre: "", budget: "", status: "", priority: "", season: "", scene: "" });
  const remove = (spot: Spot) => { if (window.confirm(`「${spot.name}」を削除しますか？`)) deleteSpot(spot.id); };
  const quickStatus = (spot: Spot, status: Spot["status"]) => updateSpot(spot.id, { ...stripMeta(spot), status });

  const exportData = () => {
    const blob = new Blob([JSON.stringify(spots, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "ikitai-tokoro.json"; a.click(); URL.revokeObjectURL(url);
  };
  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    try { replaceSpots(JSON.parse(await file.text()) as Spot[]); } catch { window.alert("JSONファイルを読み込めませんでした。"); }
    event.target.value = "";
  };

  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">MY PLACES</p>
          <h1>行きたいところリスト</h1>
          <p className="lead">行きたいご飯・外出先を保存して、予定管理や訪問記録までまとめるページ</p>
        </div>
        <button className="primary" onClick={() => setEditing("new")}>＋ 新しく追加</button>
      </header>

      <section className="overview">
        <div><strong>{spots.length}</strong><span>保存した場所</span></div>
        <div><strong>{spots.filter(s => ["今度行く", "予定あり"].includes(s.status)).length}</strong><span>次のおでかけ候補</span></div>
        <div><strong>{spots.filter(s => Boolean(s.visitedDate)).length}</strong><span>訪問の思い出</span></div>
      </section>

      <section className="toolbar">
        <div className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="名前・エリア・メモから検索" /></div>
        <div className="utility">
          <button className="subtle" onClick={exportData}>書き出す</button>
          <button className="subtle" onClick={() => importRef.current?.click()}>読み込む</button>
          <input ref={importRef} type="file" accept="application/json" hidden onChange={importData} />
        </div>
      </section>

      <nav className="category-tabs">
        {(["すべて", ...MAIN_CATEGORIES] as const).map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}<small>{item === "すべて" ? spots.length : spots.filter(s => s.mainCategory === item).length}</small></button>)}
      </nav>

      <section className="filters">
        <Filter label="エリア" value={filters.area} options={options.areas} onChange={(v) => setFilter("area", v)} />
        <Filter label="ジャンル" value={filters.genre} options={options.genres} onChange={(v) => setFilter("genre", v)} />
        <Filter label="予算" value={filters.budget} options={options.budgets} onChange={(v) => setFilter("budget", v)} />
        <Filter label="進捗" value={filters.status} options={[...STATUSES]} onChange={(v) => setFilter("status", v)} />
        <Filter label="優先度" value={filters.priority} options={[...PRIORITIES]} onChange={(v) => setFilter("priority", v)} />
        {(category === "外出" || category === "すべて") && <Filter label="季節" value={filters.season} options={SEASONS} onChange={(v) => setFilter("season", v)} />}
        {(category === "外出" || category === "すべて") && <Filter label="シーン" value={filters.scene} options={SCENES} onChange={(v) => setFilter("scene", v)} />}
        {Object.values(filters).some(Boolean) && <button className="clear" onClick={resetFilters}>クリア</button>}
      </section>

      <section className="viewbar">
        <div className="view-tabs">{VIEWS.map((item) => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{item}</button>)}</div>
        <div className="result-meta"><span>{filtered.length}件</span>{view === "カード" && <select value={sort} onChange={(e) => setSort(e.target.value)}><option>更新日順</option><option>優先度順</option><option>評価順</option><option>訪問日順</option></select>}</div>
      </section>

      {!ready ? <div className="empty">読み込み中...</div> : filtered.length === 0 ? <Empty onAdd={() => setEditing("new")} /> :
        view === "訪問日記" ? <Diary spots={filtered} onEdit={setEditing} /> :
        view === "進捗ボード" ? <Board spots={filtered} onEdit={setEditing} onStatus={quickStatus} /> :
        <section className="card-grid">{filtered.map((spot) => <SpotCard key={spot.id} spot={spot} onEdit={setEditing} onDelete={remove} onStatus={quickStatus} />)}</section>}

      {editing && <SpotForm spot={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSave={(draft) => { editing === "new" ? addSpot(draft) : updateSpot(editing.id, draft); setEditing(null); }} />}
    </main>
  );
}

function stripMeta({ id, createdAt, updatedAt, ...draft }: Spot): SpotDraft { return draft; }

function Filter({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return <label className={value ? "filter active" : "filter"}><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}><option value="">すべて</option>{options.map((o) => <option key={o}>{o}</option>)}</select></label>;
}

function SpotImage({ spot }: { spot: Spot }) {
  return spot.imageUrl ? <img src={spot.imageUrl} alt="" /> : <div className="placeholder"><span>{spot.mainCategory === "ご飯" ? "☕" : "⌖"}</span><small>写真を追加</small></div>;
}

function SpotCard({ spot, onEdit, onDelete, onStatus }: { spot: Spot; onEdit: (s: Spot) => void; onDelete: (s: Spot) => void; onStatus: (s: Spot, status: Spot["status"]) => void }) {
  return <article className={`spot-card ${isVisited(spot) ? "visited" : ""}`}>
    <div className="image-wrap"><SpotImage spot={spot} /><span className="category-pill">{spot.mainCategory}</span><span className={`priority priority-${spot.priority}`}>優先度 {spot.priority}</span></div>
    <div className="card-body">
      <div className="card-title"><div><p>{spot.area || "エリア未設定"}</p><h3>{spot.name}</h3></div><button className="icon-button" onClick={() => onEdit(spot)} aria-label="編集">✎</button></div>
      {spot.description && <p className="description">{spot.description}</p>}
      <div className="tags">{spot.genres.map((tag) => <span key={tag}>{tag}</span>)}{spot.budget && <span>{spot.budget}</span>}</div>
      {(spot.plannedDate || spot.visitedDate) && <p className="date-line">{spot.plannedDate ? `予定 ${dateLabel(spot.plannedDate)}` : `訪問 ${dateLabel(spot.visitedDate)}`}</p>}
      <div className="card-footer"><select className={`status ${statusTone[spot.status]}`} value={spot.status} onChange={(e) => onStatus(spot, e.target.value as Spot["status"])}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select><button className="delete" onClick={() => onDelete(spot)}>削除</button></div>
    </div>
  </article>;
}

function Diary({ spots, onEdit }: { spots: Spot[]; onEdit: (s: Spot) => void }) {
  return <section className="diary">{spots.map((spot) => <article key={spot.id} className="diary-entry"><div className="diary-date"><strong>{dateLabel(spot.visitedDate)}</strong><span>{spot.area}</span></div><div className="diary-photo"><SpotImage spot={spot} /></div><div className="diary-copy"><p className="eyebrow">{spot.mainCategory} / {spot.genres.join("・")}</p><h2>{spot.name}</h2><div className="stars">{"★".repeat(spot.rating || 0)}{"☆".repeat(5 - (spot.rating || 0))}</div><p>{spot.visitLog || "訪問記録はまだありません。"}</p>{spot.wantToGoAgain && <span className="again">また行きたい</span>}<button className="text-button" onClick={() => onEdit(spot)}>記録を編集</button></div></article>)}</section>;
}

function Board({ spots, onEdit, onStatus }: { spots: Spot[]; onEdit: (s: Spot) => void; onStatus: (s: Spot, status: Spot["status"]) => void }) {
  return <section className="board">{STATUSES.map(status => <div className="board-column" key={status}><header><span className={`dot ${statusTone[status]}`} />{status}<small>{spots.filter(s => s.status === status).length}</small></header>{spots.filter(s => s.status === status).map(spot => <article key={spot.id} className="board-card" onClick={() => onEdit(spot)}><strong>{spot.name}</strong><span>{spot.area || "エリア未設定"} · {spot.mainCategory}</span><select value={spot.status} onClick={(e) => e.stopPropagation()} onChange={(e) => onStatus(spot, e.target.value as Spot["status"])}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></article>)}</div>)}</section>;
}

function Empty({ onAdd }: { onAdd: () => void }) {
  return <div className="empty"><span>＋</span><h2>条件に合う場所はまだありません</h2><p>気になる場所を追加して、次のおでかけを育てましょう。</p><button className="primary" onClick={onAdd}>新しく追加</button></div>;
}

function SpotForm({ spot, onClose, onSave }: { spot: Spot | null; onClose: () => void; onSave: (draft: SpotDraft) => void }) {
  const [draft, setDraft] = useState<SpotDraft>(spot ? stripMeta(spot) : emptyDraft);
  const genres = draft.mainCategory === "ご飯" ? FOOD_GENRES : OUTING_GENRES;
  const budgets = draft.mainCategory === "ご飯" ? FOOD_BUDGETS : OUTING_BUDGETS;
  const set = <K extends keyof SpotDraft>(key: K, value: SpotDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const toggle = (key: "genres" | "sceneTags" | "seasonTags", value: string) => set(key, draft[key].includes(value) ? draft[key].filter(v => v !== value) : [...draft[key], value]);
  const submit = (e: FormEvent) => { e.preventDefault(); if (!draft.name.trim()) return; onSave({ ...draft, name: draft.name.trim() }); };
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <form className="modal" onSubmit={submit}>
      <header className="modal-head"><div><p className="eyebrow">PLACE DETAILS</p><h2>{spot ? "スポットを編集" : "新しい場所を追加"}</h2></div><button type="button" className="close" onClick={onClose}>×</button></header>
      <FormSection title="基本情報" hint="まずは名前とカテゴリだけでも保存できます。">
        <div className="form-grid"><Field label="スポット名 *" wide><input required autoFocus value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="例：喫茶 月白" /></Field>
          <Field label="大カテゴリ"><select value={draft.mainCategory} onChange={(e) => setDraft({ ...emptyDraft, name: draft.name, mainCategory: e.target.value as Spot["mainCategory"] })}>{MAIN_CATEGORIES.map(v => <option key={v}>{v}</option>)}</select></Field>
          <Field label="写真URL"><input value={draft.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://..." /></Field>
          <Field label="短い説明" wide><textarea rows={2} value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="どんな場所？" /></Field>
          <Field label="住所・アクセス" wide><input value={draft.address} onChange={(e) => set("address", e.target.value)} /></Field>
          <Field label="関連URL" wide><input type="url" value={draft.url} onChange={(e) => set("url", e.target.value)} /></Field></div>
      </FormSection>
      <FormSection title="分類・タグ" hint="あとから探しやすくなる情報です。">
        <div className="form-grid"><Field label="エリア"><input list="areas" value={draft.area} onChange={(e) => set("area", e.target.value)} placeholder="自由入力できます" /><datalist id="areas">{AREAS.map(v => <option key={v}>{v}</option>)}</datalist></Field>
          <Field label="予算"><select value={draft.budget} onChange={(e) => set("budget", e.target.value)}><option value="">未設定</option>{budgets.map(v => <option key={v}>{v}</option>)}</select></Field>
          <Field label="ジャンル" wide><TagPicker values={genres} selected={draft.genres} onToggle={(v) => toggle("genres", v)} /></Field>
          <Field label="シーン" wide><TagPicker values={SCENES} selected={draft.sceneTags} onToggle={(v) => toggle("sceneTags", v)} /></Field>
          {draft.mainCategory === "外出" && <Field label="季節・タイミング" wide><TagPicker values={SEASONS} selected={draft.seasonTags} onToggle={(v) => toggle("seasonTags", v)} /></Field>}</div>
      </FormSection>
      <FormSection title="予定管理" hint="次の休日候補を具体的な予定へ。">
        <div className="form-grid"><Field label="進捗"><select value={draft.status} onChange={(e) => set("status", e.target.value as Spot["status"])}>{STATUSES.map(v => <option key={v}>{v}</option>)}</select></Field>
          <Field label="優先度"><select value={draft.priority} onChange={(e) => set("priority", e.target.value as Spot["priority"])}>{PRIORITIES.map(v => <option key={v}>{v}</option>)}</select></Field>
          <Field label="訪問予定日"><input type="date" value={draft.plannedDate} onChange={(e) => set("plannedDate", e.target.value)} /></Field>
          <Field label="行きたい理由"><input value={draft.reason} onChange={(e) => set("reason", e.target.value)} /></Field>
          <Field label="メモ" wide><textarea rows={3} value={draft.memo} onChange={(e) => set("memo", e.target.value)} /></Field></div>
      </FormSection>
      <FormSection title="訪問後の記録" hint="行った日のことを、短い日記のように。">
        <div className="form-grid"><Field label="訪問日"><input type="date" value={draft.visitedDate} onChange={(e) => set("visitedDate", e.target.value)} /></Field>
          <Field label="評価"><select value={draft.rating || ""} onChange={(e) => set("rating", e.target.value ? Number(e.target.value) as Spot["rating"] : undefined)}><option value="">未評価</option>{[1,2,3,4,5].map(v => <option key={v} value={v}>{"★".repeat(v)}</option>)}</select></Field>
          <Field label="訪問記録" wide><textarea rows={5} value={draft.visitLog} onChange={(e) => set("visitLog", e.target.value)} placeholder="印象に残ったこと、次にしたいこと..." /></Field>
          <label className="check wide"><input type="checkbox" checked={draft.wantToGoAgain} onChange={(e) => set("wantToGoAgain", e.target.checked)} /> また行きたい</label></div>
      </FormSection>
      <footer className="modal-footer"><button type="button" className="subtle" onClick={onClose}>キャンセル</button><button className="primary" type="submit">{spot ? "変更を保存" : "リストに追加"}</button></footer>
    </form>
  </div>;
}

function FormSection({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) { return <section className="form-section"><div className="section-copy"><h3>{title}</h3><p>{hint}</p></div><div>{children}</div></section>; }
function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={`field ${wide ? "wide" : ""}`}><span>{label}</span>{children}</label>; }
function TagPicker({ values, selected, onToggle }: { values: readonly string[]; selected: string[]; onToggle: (v: string) => void }) { return <div className="tag-picker">{values.map(v => <button type="button" className={selected.includes(v) ? "selected" : ""} key={v} onClick={() => onToggle(v)}>{v}</button>)}</div>; }
