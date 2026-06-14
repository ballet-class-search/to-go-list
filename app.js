import { deleteSpot, loadSpots, saveSpot } from "./storage.js";

const CATEGORIES = ["ご飯", "外出"];
const STATUSES = ["気になる", "行った"];
const BUDGETS = ["無料", "〜1,000円", "1,000〜2,000円", "2,000〜3,000円", "3,000〜5,000円", "5,000円以上"];
const GENRES = {
  ご飯: ["カフェ", "ランチ", "ディナー", "スイーツ", "和食", "洋食", "イタリアン", "フレンチ", "中華", "韓国料理", "居酒屋", "バー", "ベーカリー", "その他"],
  外出: ["美術館", "展覧会", "映画", "芸術", "レジャー", "体験", "ショッピング", "街歩き", "自然", "季節イベント", "旅行", "ホテル", "公園", "その他"],
};
const $ = (selector) => document.querySelector(selector);
const elements = {
  grid: $("#spotGrid"), template: $("#spotCardTemplate"), empty: $("#emptyState"), dialog: $("#spotDialog"),
  form: $("#spotForm"), search: $("#searchInput"), area: $("#areaFilter"), genre: $("#genreFilter"),
  budget: $("#budgetFilter"), status: $("#statusFilter"), tabs: $("#categoryTabs"), count: $("#resultCount"),
  heading: $("#resultHeading"), toast: $("#toast"), previews: $("#photoPreviews"), links: $("#linkEditor"),
};
let spots = [];
let activeCategory = "すべて";
let draftPhotos = [];
let toastTimer;
const objectUrls = new Set();

const options = (items, blank = "") => `${blank ? `<option value="">${blank}</option>` : ""}${items.map((item) => `<option value="${item}">${item}</option>`).join("")}`;
const stars = (value) => `<span class="stars-on">${"★".repeat(value)}</span><span class="stars-off">${"☆".repeat(5 - value)}</span>`;
const formatDate = (value) => value ? new Intl.DateTimeFormat("ja-JP").format(new Date(`${value}T00:00:00`)) : "";

function cleanupObjectUrls() {
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls.clear();
}

function imageSource(photo) {
  if (typeof photo === "string") return photo;
  if (photo instanceof Blob) {
    const url = URL.createObjectURL(photo);
    objectUrls.add(url);
    return url;
  }
  return "";
}

async function compressImage(file) {
  let source;
  if ("createImageBitmap" in window) {
    source = await createImageBitmap(file);
  } else {
    source = await new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("画像を読み込めませんでした"));
      };
      image.src = url;
    });
  }
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  const scale = Math.min(1, 1600 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close?.();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("画像を圧縮できませんでした")), "image/jpeg", 0.82));
}

function initSelects() {
  elements.form.elements.category.innerHTML = options(CATEGORIES);
  elements.form.elements.budget.innerHTML = options(BUDGETS, "選択なし");
  elements.budget.innerHTML = options(BUDGETS, "すべて");
  elements.status.innerHTML = options(STATUSES, "すべて");
  updateFormGenres();
  renderStatusSegments("気になる");
  renderStarInput(3);
}

function updateFormGenres(selected = "") {
  const category = elements.form.elements.category.value || "ご飯";
  elements.form.elements.genre.innerHTML = options(GENRES[category], "選択なし");
  elements.form.elements.genre.value = GENRES[category].includes(selected) ? selected : "";
}

function renderStatusSegments(selected) {
  const container = $("#formStatusSegments");
  container.innerHTML = STATUSES.map((status) => `<button type="button" data-status="${status}" class="${status === selected ? "is-active" : ""}">${status === "気になる" ? "♡" : "✓"}<span>${status}</span></button>`).join("");
  elements.form.elements.status.value = selected;
  container.querySelectorAll("button").forEach((button) => button.onclick = () => {
    renderStatusSegments(button.dataset.status);
    toggleVisitFields();
  });
}

function renderStarInput(selected) {
  const container = $("#starInput");
  container.innerHTML = [1, 2, 3, 4, 5].map((value) => `<button type="button" data-value="${value}" aria-label="優先度 ${value}">${value <= selected ? "★" : "☆"}</button>`).join("");
  elements.form.elements.priority.value = selected;
  container.querySelectorAll("button").forEach((button) => button.onclick = () => renderStarInput(Number(button.dataset.value)));
}

function updateFilterOptions() {
  const areas = [...new Set(spots.map((spot) => spot.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"));
  const area = elements.area.value;
  elements.area.innerHTML = options(areas, "すべて");
  elements.area.value = areas.includes(area) ? area : "";
  const genres = activeCategory === "すべて" ? [...new Set([...GENRES.ご飯, ...GENRES.外出])] : GENRES[activeCategory];
  const genre = elements.genre.value;
  elements.genre.innerHTML = options(genres, "すべて");
  elements.genre.value = genres.includes(genre) ? genre : "";
}

function filteredSpots() {
  const keyword = elements.search.value.trim().toLowerCase();
  return spots.filter((spot) => activeCategory === "すべて" || spot.category === activeCategory)
    .filter((spot) => !elements.area.value || spot.area === elements.area.value)
    .filter((spot) => !elements.genre.value || spot.genre === elements.genre.value)
    .filter((spot) => !elements.budget.value || spot.budget === elements.budget.value)
    .filter((spot) => !elements.status.value || spot.status === elements.status.value)
    .filter((spot) => !keyword || ["name", "area", "genre", "description", "memo"].some((key) => String(spot[key] || "").toLowerCase().includes(keyword)))
    .sort((a, b) => Number(a.status === "行った") - Number(b.status === "行った") || new Date(b.updatedAt) - new Date(a.updatedAt));
}

function createGallery(card, spot) {
  const gallery = card.querySelector(".gallery");
  const image = gallery.querySelector(".gallery-image");
  const placeholder = gallery.querySelector(".gallery-placeholder");
  const photoItems = [...(spot.photos || [])];
  if (!photoItems.length && spot.imageUrl) photoItems.push(spot.imageUrl);
  let index = 0;
  const show = () => {
    const photo = photoItems[index];
    image.hidden = !photo;
    placeholder.hidden = Boolean(photo);
    if (photo) image.src = imageSource(photo);
    gallery.querySelector(".gallery-count").textContent = photoItems.length > 1 ? `${index + 1} / ${photoItems.length}` : "";
    gallery.querySelector(".gallery-dots").innerHTML = photoItems.length > 1 ? photoItems.map((_, i) => `<i class="${i === index ? "is-active" : ""}"></i>`).join("") : "";
    gallery.querySelectorAll(".gallery-arrow").forEach((button) => button.hidden = photoItems.length < 2);
  };
  gallery.querySelector(".gallery-prev").onclick = () => { index = (index - 1 + photoItems.length) % photoItems.length; show(); };
  gallery.querySelector(".gallery-next").onclick = () => { index = (index + 1) % photoItems.length; show(); };
  show();
}

function createCard(spot) {
  const card = elements.template.content.firstElementChild.cloneNode(true);
  createGallery(card, spot);
  const chips = card.querySelector(".chips");
  [spot.category, spot.area, spot.genre].filter(Boolean).forEach((text) => {
    const chip = document.createElement("span");
    chip.textContent = text;
    chips.append(chip);
  });
  card.querySelector("h3").textContent = spot.name;
  card.querySelector(".budget-text").textContent = spot.budget ? `▣ 予算　${spot.budget}` : "";
  card.querySelector(".priority-stars").innerHTML = `★ 優先度　${stars(Number(spot.priority) || 3)}`;
  card.querySelector(".description").textContent = spot.description || "";
  const status = card.querySelector(".card-status");
  status.innerHTML = STATUSES.map((item) => `<button type="button" class="${spot.status === item ? "is-active" : ""}">${item === "気になる" ? "♡" : "✓"}<span>${item}</span></button>`).join("");
  status.querySelectorAll("button").forEach((button, index) => button.onclick = async () => {
    const next = { ...spot, status: STATUSES[index], updatedAt: new Date().toISOString() };
    await commitSpot(next, "進捗を更新しました");
  });
  const links = card.querySelector(".links");
  (spot.links || []).forEach((link) => {
    if (!/^https?:\/\//i.test(link.url)) return;
    const anchor = document.createElement("a");
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.textContent = `↗ ${link.label || "リンク"}`;
    links.append(anchor);
  });
  const meta = card.querySelector(".card-meta");
  [
    `追加日　${formatDate(spot.createdAt.slice(0, 10))}`,
    `更新日　${formatDate(spot.updatedAt.slice(0, 10))}`,
    spot.memo ? `メモ　${spot.memo}` : "",
    spot.visitedDate ? `訪問日　${formatDate(spot.visitedDate)}` : "",
  ].filter(Boolean).forEach((text) => {
    const span = document.createElement("span");
    span.textContent = text;
    meta.append(span);
  });
  card.querySelector(".edit-button").onclick = () => openForm(spot);
  card.querySelector(".delete-button").onclick = async () => {
    if (!confirm(`「${spot.name}」を削除しますか？`)) return;
    await deleteSpot(spot.id);
    spots = spots.filter((item) => item.id !== spot.id);
    render();
    showToast("削除しました");
  };
  return card;
}

function render() {
  cleanupObjectUrls();
  updateFilterOptions();
  const filtered = filteredSpots();
  elements.grid.replaceChildren(...filtered.map(createCard));
  elements.grid.hidden = filtered.length === 0;
  elements.empty.hidden = filtered.length > 0;
  elements.heading.textContent = activeCategory === "すべて" ? "すべてのスポット" : `${activeCategory}のスポット`;
  elements.count.textContent = `${filtered.length}件 / 全${spots.length}件`;
}

function renderPhotoPreviews() {
  elements.previews.replaceChildren(...draftPhotos.map((photo, index) => {
    const item = document.createElement("div");
    item.className = "photo-preview";
    item.innerHTML = `<img src="${imageSource(photo)}" alt="写真 ${index + 1}"><span>${index === 0 ? "代表写真" : index + 1}</span><div><button type="button" data-move="-1">←</button><button type="button" data-move="1">→</button><button type="button" data-delete>×</button></div>`;
    item.querySelector("[data-delete]").onclick = () => { draftPhotos.splice(index, 1); renderPhotoPreviews(); };
    item.querySelectorAll("[data-move]").forEach((button) => button.onclick = () => {
      const next = index + Number(button.dataset.move);
      if (next < 0 || next >= draftPhotos.length) return;
      [draftPhotos[index], draftPhotos[next]] = [draftPhotos[next], draftPhotos[index]];
      renderPhotoPreviews();
    });
    return item;
  }));
}

function addLinkRow(link = { label: "", url: "" }) {
  const row = document.createElement("div");
  row.className = "link-row";
  row.innerHTML = `<input name="linkLabel" placeholder="表示名（公式サイトなど）"><input name="linkUrl" type="url" placeholder="https://..."><button type="button">×</button>`;
  row.querySelector('[name="linkLabel"]').value = link.label || "";
  row.querySelector('[name="linkUrl"]').value = link.url || "";
  row.querySelector("button").onclick = () => row.remove();
  elements.links.append(row);
}

function toggleVisitFields() {
  elements.form.querySelectorAll(".visit-field").forEach((field) => field.hidden = elements.form.elements.status.value !== "行った");
}

function openForm(spot = null) {
  elements.form.reset();
  elements.links.replaceChildren();
  draftPhotos = [...(spot?.photos || [])];
  elements.form.elements.category.value = spot?.category || (activeCategory === "すべて" ? "ご飯" : activeCategory);
  updateFormGenres(spot?.genre);
  if (spot) Object.entries(spot).forEach(([key, value]) => {
    if (elements.form.elements[key] && !["priority", "status"].includes(key)) elements.form.elements[key].value = value || "";
  });
  renderStatusSegments(spot?.status || "気になる");
  renderStarInput(Number(spot?.priority) || 3);
  (spot?.links || []).forEach(addLinkRow);
  if (!(spot?.links || []).length) addLinkRow();
  renderPhotoPreviews();
  toggleVisitFields();
  $("#formTitle").textContent = spot ? "スポットを編集" : "スポットを追加";
  elements.dialog.showModal();
}

async function commitSpot(spot, message) {
  try {
    await saveSpot(spot);
    const index = spots.findIndex((item) => item.id === spot.id);
    if (index >= 0) spots[index] = spot; else spots.unshift(spot);
    render();
    showToast(message);
    return true;
  } catch (error) {
    console.error(error);
    showToast("保存できませんでした。写真の枚数や容量をご確認ください。");
    return false;
  }
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
}

elements.form.onsubmit = async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(elements.form));
  const existing = spots.find((spot) => spot.id === data.id);
  const now = new Date().toISOString();
  const labels = [...elements.links.querySelectorAll('[name="linkLabel"]')];
  const urls = [...elements.links.querySelectorAll('[name="linkUrl"]')];
  const links = urls.map((input, index) => ({ label: labels[index].value.trim(), url: input.value.trim() })).filter((link) => link.url);
  const spot = {
    id: existing?.id || crypto.randomUUID(), name: data.name.trim(), category: data.category, photos: draftPhotos,
    imageUrl: existing?.imageUrl || "", description: data.description.trim(), area: data.area.trim(), genre: data.genre,
    budget: data.budget, status: data.status, priority: Number(data.priority) || 3, links, memo: data.memo.trim(),
    visitedDate: data.visitedDate, visitLog: data.visitLog.trim(), createdAt: existing?.createdAt || now, updatedAt: now,
  };
  const saved = await commitSpot(spot, existing ? "更新しました" : "追加しました");
  if (saved) elements.dialog.close();
};

$("#photoInput").onchange = async (event) => {
  const files = [...event.target.files].slice(0, 10 - draftPhotos.length);
  if (!files.length) return;
  showToast("写真を準備しています…");
  try {
    const compressed = await Promise.all(files.map(compressImage));
    draftPhotos.push(...compressed);
    renderPhotoPreviews();
    showToast(`${compressed.length}枚の写真を追加しました`);
  } catch {
    showToast("写真を読み込めませんでした");
  }
  event.target.value = "";
};
$("#addLinkButton").onclick = () => addLinkRow();
$("#openCreateButton").onclick = () => openForm();
$("#closeDialogButton").onclick = () => elements.dialog.close();
$("#cancelFormButton").onclick = () => elements.dialog.close();
elements.form.elements.category.onchange = () => updateFormGenres();
elements.tabs.onclick = (event) => {
  const tab = event.target.closest("[data-category]");
  if (!tab) return;
  activeCategory = tab.dataset.category;
  elements.tabs.querySelectorAll("button").forEach((button) => button.classList.toggle("is-active", button === tab));
  elements.genre.value = "";
  render();
};
[elements.search, elements.area, elements.genre, elements.budget, elements.status].forEach((control) => control.addEventListener(control === elements.search ? "input" : "change", render));
$("#resetFiltersButton").onclick = () => { elements.search.value = ""; [elements.area, elements.genre, elements.budget, elements.status].forEach((control) => control.value = ""); render(); };

initSelects();
try {
  spots = await loadSpots();
  render();
} catch (error) {
  console.error(error);
  showToast("データを読み込めませんでした");
}
