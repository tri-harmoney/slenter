'use strict';

// Walking pace and the detour streets add over a straight line.
const METERS_PER_MIN = 80;
const DETOUR = 1.25;
const RADII = [10, 15, 20];

const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// Each kind: the label people see, words they might search for, and how OSM tags it.
const KINDS = {
  museum:  { nl: 'museum', words: 'museum musea museums expo tentoonstelling exhibition' },
  gallery: { nl: 'galerie', words: 'galerie gallery kunst art expo' },
  arts:    { nl: 'kunstencentrum', words: 'kunst art cultuur culture' },
  sight:   { nl: 'bezienswaardig', words: 'bezienswaardigheid sight attraction toerist tourist' },
  view:    { nl: 'uitzicht', words: 'uitzicht viewpoint view zicht' },
  zoo:     { nl: 'dierentuin', words: 'zoo dierentuin aquarium dieren animals' },
  monument:{ nl: 'monument', words: 'monument historisch historic geschiedenis history' },
  castle:  { nl: 'kasteel', words: 'kasteel castle burcht historisch historic' },
  church:  { nl: 'kerk', words: 'kerk church kathedraal cathedral abdij abbey' },
  cafe:    { nl: 'koffie', words: 'koffie coffee cafe café koffiebar espresso cappuccino thee tea lunch ontbijt breakfast brunch' },
  restaurant:{ nl: 'restaurant', words: 'restaurant eten food dinner diner lunch' },
  icecream:{ nl: 'ijs', words: 'ijs ijsje ice cream gelato dessert' },
  bakery:  { nl: 'bakker', words: 'bakker bakery brood bread taart cake gebak pastry' },
  bar:     { nl: 'bar', words: 'bar cocktail drinks wijn wine drinken' },
  pub:     { nl: 'pub', words: 'pub bier beer kroeg cafe drinken drinks' },
  theatre: { nl: 'theater', words: 'theater theatre schouwburg show musical' },
  cinema:  { nl: 'bioscoop', words: 'bioscoop cinema film movie' },
  market:  { nl: 'markt', words: 'markt market food hall' },
  park:    { nl: 'park', words: 'park groen green wandelen picnic' },
  garden:  { nl: 'tuin', words: 'tuin garden park groen green' },
  books:   { nl: 'boekhandel', words: 'boek boeken book books boekhandel bookshop' },
  chocolate:{ nl: 'chocolade', words: 'chocolade chocolate pralines snoep sweets' },
  deli:    { nl: 'delicatessen', words: 'deli delicatessen kaas cheese fijnproever' },
};

// The chips: which kinds each one shows.
const GROUPS = [
  { id: 'all', label: 'Alles' },
  { id: 'top', label: 'Aanraders' },
  { id: 'culture', label: 'Musea', kinds: ['museum', 'gallery', 'arts'] },
  { id: 'sights', label: 'Bezienswaardig', kinds: ['sight', 'view', 'zoo', 'monument', 'castle', 'church'] },
  { id: 'coffee', label: 'Koffie', kinds: ['cafe'] },
  { id: 'food', label: 'Eten', kinds: ['restaurant', 'icecream', 'bakery', 'market'] },
  { id: 'drinks', label: 'Bars', kinds: ['bar', 'pub'] },
  { id: 'stage', label: 'Theater en film', kinds: ['theatre', 'cinema'] },
  { id: 'green', label: 'Parken', kinds: ['park', 'garden'] },
  { id: 'shops', label: 'Winkels', kinds: ['books', 'chocolate', 'deli'] },
];

const CUISINE_NL = {
  italian: 'Italiaans', pizza: 'pizza', indian: 'Indiaas', japanese: 'Japans', sushi: 'sushi', chinese: 'Chinees',
  thai: 'Thais', french: 'Frans', burger: 'burgers', mexican: 'Mexicaans', vietnamese: 'Vietnamees', korean: 'Koreaans',
  british: 'Brits', belgian: 'Belgisch', seafood: 'vis', fish_and_chips: 'fish and chips', vegan: 'vegan',
  vegetarian: 'vegetarisch', spanish: 'Spaans', greek: 'Grieks', turkish: 'Turks', lebanese: 'Libanees',
  middle_eastern: 'Midden-Oosten', steak_house: 'steak', ramen: 'ramen', noodle: 'noedels', coffee_shop: 'koffie',
  sandwich: 'broodjes', breakfast: 'ontbijt', brunch: 'brunch', cake: 'taart', tapas: 'tapas', portuguese: 'Portugees',
};

function kindOf(t) {
  const a = t.amenity, to = t.tourism, l = t.leisure, s = t.shop, h = t.historic;
  if (to === 'museum') return 'museum';
  if (to === 'gallery' || a === 'art_gallery') return 'gallery';
  if (to === 'zoo' || to === 'aquarium') return 'zoo';
  if (to === 'viewpoint') return 'view';
  if (a === 'arts_centre') return 'arts';
  if (a === 'theatre') return 'theatre';
  if (a === 'cinema') return 'cinema';
  if (a === 'cafe') return 'cafe';
  if (a === 'restaurant') return 'restaurant';
  if (a === 'ice_cream') return 'icecream';
  if (a === 'bar') return 'bar';
  if (a === 'pub') return 'pub';
  if (a === 'marketplace') return 'market';
  if (a === 'place_of_worship') return 'church';
  if (h === 'castle') return 'castle';
  if (h === 'monument' || h === 'city_gate' || h === 'ruins') return 'monument';
  if (to === 'attraction') return 'sight';
  if (l === 'park') return 'park';
  if (l === 'garden') return 'garden';
  if (s === 'books') return 'books';
  if (s === 'bakery' || s === 'pastry') return 'bakery';
  if (s === 'chocolate' || s === 'confectionery') return 'chocolate';
  if (s === 'deli' || s === 'cheese') return 'deli';
  return null;
}

function buildQuery(lat, lon, radius) {
  const at = `(around:${radius},${lat.toFixed(5)},${lon.toFixed(5)})`;
  return `[out:json][timeout:40];
nwr${at}[name]->.a;
(
  nwr.a[amenity~"^(cafe|restaurant|bar|pub|ice_cream|theatre|cinema|marketplace|arts_centre)$"];
  nwr.a[tourism~"^(museum|gallery|attraction|viewpoint|zoo|aquarium)$"];
  nwr.a[leisure~"^(park|garden)$"];
  nwr.a[shop~"^(books|bakery|pastry|chocolate|confectionery|deli|cheese)$"];
  nwr.a[historic~"^(castle|monument|city_gate|ruins)$"];
  nwr.a[amenity=place_of_worship][wikidata];
);
out center tags;`;
}

// ---------- state ----------
const state = {
  pos: null,          // {lat, lon}
  label: '',
  minutes: 15,
  places: [],
  loading: false,
  error: '',
  view: 'near',
  group: 'all',
  query: '',
  remote: [],         // geocoder hits for the search view
  shown: 60,
  saved: loadJSON('odh.saved', {}),
  fetchedAt: null,    // {lat, lon, radius}
  watchId: null,
};

function loadJSON(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: keep it in memory */ }
}

// ---------- geometry ----------
function meters(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const walkMin = m => Math.max(1, Math.round(m * DETOUR / METERS_PER_MIN));
const radiusFor = minutes => Math.round(minutes * METERS_PER_MIN / DETOUR);
const fmtDist = m => m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;

// ---------- places ----------
function toPlace(el) {
  const t = el.tags || {};
  const kind = kindOf(t);
  if (!kind || !t.name) return null;
  if (kind === 'church' && !t.wikidata) return null;
  const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
  if (lat == null) return null;
  const cuisine = (t.cuisine || '').split(';').map(c => c.trim()).filter(Boolean);
  const street = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ');
  const town = [t['addr:postcode'], t['addr:city']].filter(Boolean).join(' ');
  const p = {
    id: `${el.type}/${el.id}`, name: t.name, kind, lat, lon, tags: t, cuisine,
    star: !!(t.wikidata || t.wikipedia) && !t['brand:wikidata'],
    address: [street, town].filter(Boolean).join('\n'),
    website: t.website || t['contact:website'] || t.url || '',
    hours: t.opening_hours || '',
  };
  p.hay = norm([p.name, KINDS[kind].nl, KINDS[kind].words, cuisine.join(' '), cuisine.map(c => CUISINE_NL[c] || '').join(' '),
    t.diet_vegan === 'yes' ? 'vegan' : '', t['name:en'] || '', t.brand || ''].join(' '));
  return p;
}

function norm(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, '');
}

async function overpass(query) {
  let lastErr;
  for (const [i, url] of OVERPASS.entries()) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), i === 0 ? 50000 : 30000);
    try {
      const r = await fetch(url, {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      });
      if (!r.ok) throw new Error('status ' + r.status);
      const j = await r.json();
      return j.elements || [];
    } catch (e) { lastErr = e; } finally { clearTimeout(timer); }
  }
  throw lastErr || new Error('geen antwoord');
}

// Nominatim answers in about a second but caps each search at 40 hits, so it fills the list
// while the slower, complete Overpass query runs. Its usage policy allows one request a second.
const NOMINATIM_PHRASES = ['cafe', 'museum', 'restaurant', 'attraction', 'pub', 'gallery', 'park', 'bar', 'church',
  'bakery', 'ice cream', 'theatre', 'bookshop', 'cinema', 'garden', 'castle', 'viewpoint', 'chocolate shop'];
// Busy kinds hit the 40-result cap in a city centre, so these are asked again per quarter of the area.
const NOMINATIM_DENSE = ['cafe', 'restaurant', 'pub', 'bar'];

function nominatimToElement(r) {
  const a = r.address || {};
  const tags = { ...(r.extratags || {}), name: r.name, [r.category]: r.type };
  if (a.road) tags['addr:street'] = a.road;
  if (a.house_number) tags['addr:housenumber'] = a.house_number;
  if (a.postcode) tags['addr:postcode'] = a.postcode;
  const city = a.city || a.town || a.village;
  if (city) tags['addr:city'] = city;
  return { type: r.osm_type, id: r.osm_id, lat: +r.lat, lon: +r.lon, tags };
}

async function nominatimStream(lat, lon, radius, isCurrent, onBatch) {
  const dLat = radius / 111320, dLon = radius / (111320 * Math.cos(lat * Math.PI / 180));
  const box = (w, n, e, s) => [w, n, e, s].map(x => x.toFixed(5)).join(',');
  const whole = box(lon - dLon, lat + dLat, lon + dLon, lat - dLat);
  const quarters = [
    box(lon - dLon, lat + dLat, lon, lat), box(lon, lat + dLat, lon + dLon, lat),
    box(lon - dLon, lat, lon, lat - dLat), box(lon, lat, lon + dLon, lat - dLat),
  ];
  const jobs = [
    ...NOMINATIM_PHRASES.map(p => [p, whole]),
    ...NOMINATIM_DENSE.flatMap(p => quarters.map(q => [p, q])),
  ];
  for (const [phrase, vb] of jobs) {
    if (!isCurrent()) return;
    const started = Date.now();
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(phrase)}&viewbox=${vb}&bounded=1&limit=40&addressdetails=1&extratags=1&accept-language=nl,en`);
      if (r.ok) onBatch((await r.json()).filter(x => x.name).map(nominatimToElement));
    } catch { /* next phrase */ }
    await new Promise(res => setTimeout(res, Math.max(0, 1100 - (Date.now() - started))));
  }
}

const cacheKey = (lat, lon, radius) => `odh.c.${lat.toFixed(3)},${lon.toFixed(3)},${radius}`;
let loadSeq = 0;

async function loadPlaces() {
  const { lat, lon } = state.pos;
  const radius = radiusFor(Math.max(...RADII));
  const at = { lat, lon, radius };
  const key = cacheKey(lat, lon, radius);
  const cached = loadJSON(key, null);
  if (cached && Date.now() - cached.at < 864e5) {
    applyPlaces(cached.els, at, true);
    return;
  }
  const seq = ++loadSeq;
  const isCurrent = () => seq === loadSeq;
  let complete = false;
  const quick = [];
  state.places = []; state.loading = true; state.partial = true; state.error = ''; render();

  nominatimStream(lat, lon, radius, () => isCurrent() && !complete, batch => {
    quick.push(...batch);
    applyPlaces(quick, at, false);
  });

  try {
    const els = await overpass(buildQuery(lat, lon, radius));
    if (!isCurrent()) return;
    complete = true;
    const slim = els.map(e => ({ type: e.type, id: e.id, lat: e.lat, lon: e.lon, center: e.center, tags: e.tags }));
    pruneCache();
    saveJSON(key, { at: Date.now(), els: slim });
    applyPlaces(slim, at, true);
  } catch (e) {
    if (!isCurrent()) return;
    state.partial = false;
    if (!state.places.length) { state.loading = false; state.error = 'De kaartdiensten antwoorden niet. Probeer het zo opnieuw.'; }
    render();
  }
}

function pruneCache() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('odh.c.'));
    keys.slice(0, Math.max(0, keys.length - 6)).forEach(k => localStorage.removeItem(k));
  } catch { /* nothing to prune */ }
}

function applyPlaces(els, at, complete) {
  const seenId = new Set(), seenName = new Set();
  state.places = els.map(toPlace).filter(p => {
    if (!p || seenId.has(p.id)) return false;
    seenId.add(p.id);
    // One entry per name and kind within walking range; chains keep their nearest branch.
    const k = norm(p.name) + p.kind + (p.lat * 500 | 0) + (p.lon * 300 | 0);
    if (seenName.has(k)) return false;
    seenName.add(k); return true;
  });
  state.fetchedAt = at;
  state.partial = !complete;
  if (state.places.length || complete) state.loading = false;
  render();
}

// ---------- location ----------
function setPos(lat, lon, label) {
  const prev = state.pos;
  state.pos = { lat, lon };
  const moved = !state.fetchedAt || meters(state.fetchedAt, state.pos) > 400;
  if (label) { state.label = label; } else if (!prev || meters(prev, state.pos) > 150) { reverseLabel(lat, lon); }
  if (moved) loadPlaces(); else render();
}

function startGps() {
  if (!('geolocation' in navigator)) { openPicker('Je browser deelt geen locatie. Zoek een plek of kies hieronder.'); return; }
  setDot(true);
  els.locLabel.textContent = 'Locatie zoeken…';
  if (state.watchId != null) navigator.geolocation.clearWatch(state.watchId);
  state.watchId = navigator.geolocation.watchPosition(
    p => { setDot(false); setPos(p.coords.latitude, p.coords.longitude); },
    err => {
      setDot(false);
      if (state.pos) return;
      openPicker(err.code === 1
        ? 'Je hebt locatie geweigerd. Zet het aan in je browser, of zoek een plek.'
        : 'We vinden je locatie niet. Zoek een plek of kies hieronder.');
    },
    { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
  );
}

function stopGps() {
  if (state.watchId != null) navigator.geolocation.clearWatch(state.watchId);
  state.watchId = null;
}

async function reverseLabel(lat, lon) {
  try {
    const r = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&limit=1`);
    const f = (await r.json()).features?.[0]?.properties;
    if (!f) return;
    const area = f.district || f.locality || f.street || f.name;
    state.label = [area, f.city || f.county].filter(Boolean).join(', ');
    renderHeader();
  } catch { /* the header keeps "Hier" */ }
}

function setDot(waiting) { els.locDot.classList.toggle('wait', waiting); }

// ---------- search ----------
const SYNONYMS = { koffie: 'cafe', coffee: 'cafe', eten: 'restaurant', food: 'restaurant', beer: 'pub', bier: 'pub', drinks: 'bar' };

function matches(p, words) {
  return words.every(w => p.hay.includes(w) || (SYNONYMS[w] && p.kind === SYNONYMS[w]));
}

let remoteTimer = null;
function searchRemote(q) {
  clearTimeout(remoteTimer);
  state.remote = [];
  if (q.length < 3 || !state.pos) return;
  remoteTimer = setTimeout(async () => {
    try {
      const { lat, lon } = state.pos;
      const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${lat}&lon=${lon}&limit=15`);
      const j = await r.json();
      if (norm(els.q.value.trim()) !== norm(q)) return;
      const limit = radiusFor(Math.max(...RADII)) * 1.1;
      const local = new Set(state.places.map(p => norm(p.name)));
      state.remote = (j.features || []).map(f => {
        const pr = f.properties, [plon, plat] = f.geometry.coordinates;
        const street = [pr.street, pr.housenumber].filter(Boolean).join(' ');
        const town = [pr.postcode, pr.city].filter(Boolean).join(' ');
        return {
          id: `photon/${pr.osm_type}${pr.osm_id}`, name: pr.name || street, lat: plat, lon: plon,
          kind: null, kindLabel: (pr.osm_value || '').replace(/_/g, ' '), tags: {}, cuisine: [],
          address: [street, town].filter(Boolean).join('\n'), website: '', hours: '', star: false,
        };
      }).filter(p => p.name && !local.has(norm(p.name)) && meters(state.pos, p) <= limit);
      render();
    } catch { /* local results still show */ }
  }, 350);
}

// ---------- view model ----------
function withDistance(list) {
  return list.map(p => { const m = meters(state.pos, p); return { ...p, m, min: walkMin(m) }; });
}

function visible() {
  if (!state.pos) return [];
  const maxMin = state.minutes;
  let list = withDistance(state.places).filter(p => p.min <= maxMin);
  if (state.view === 'saved') {
    return withDistance(Object.values(state.saved)).sort((a, b) => a.m - b.m);
  }
  const q = norm(state.query.trim());
  if (q) {
    const words = q.split(/\s+/);
    list = withDistance(state.places).filter(p => p.min <= Math.max(maxMin, 20) && matches(p, words));
  }
  const g = GROUPS.find(x => x.id === state.group);
  if (!q && g.kinds) list = list.filter(p => g.kinds.includes(p.kind));
  if (!q && g.id === 'top') list = list.filter(isTop);
  return list.sort((a, b) => a.m - b.m);
}

const isTop = p => p.star || ['museum', 'sight', 'view', 'castle', 'zoo'].includes(p.kind);

function groupCounts() {
  const near = withDistance(state.places).filter(p => p.min <= state.minutes);
  const c = { all: near.length, top: near.filter(isTop).length };
  for (const g of GROUPS) if (g.kinds) c[g.id] = near.filter(p => g.kinds.includes(p.kind)).length;
  return c;
}

function kindLabel(p) {
  if (!p.kind) return p.kindLabel || 'plek';
  const c = p.cuisine.map(x => CUISINE_NL[x]).filter(Boolean)[0];
  return c && p.kind === 'restaurant' ? `${KINDS[p.kind].nl} · ${c}` : KINDS[p.kind].nl;
}

// ---------- render ----------
const $ = id => document.getElementById(id);
const els = {
  locBtn: $('loc-btn'), locDot: $('loc-dot'), locLabel: $('loc-label'), radius: $('radius-btn'), headline: $('headline'),
  q: $('q'), clear: $('clear'), chips: $('chips'), list: $('list'),
  detail: $('detail'), dMap: $('d-map'), dTags: $('d-tags'), dName: $('d-name'), dFacts: $('d-facts'),
  dWalk: $('d-walk'), dSave: $('d-save'), dWeb: $('d-web'), dClose: $('d-close'),
  mapview: $('mapview'), bigMap: $('big-map'), mapChips: $('map-chips'), mapStatus: $('map-status'), mapCard: $('map-card'), recenter: $('recenter'),
  picker: $('picker'), pWhy: $('p-why'), pQ: $('p-q'), pResults: $('p-results'), pClose: $('p-close'), pGps: $('p-gps'),
};

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v != null && v !== false) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
}

function renderHeader() {
  els.locLabel.textContent = state.pos ? (state.label || 'Hier') : 'Locatie zoeken…';
  els.radius.textContent = `${state.minutes} min te voet`;
  const n = state.loading ? 0 : visible().length;
  // The pulsing dot says the list is still filling in.
  setDot(!state.pos || state.loading || state.partial);
  let first, second;
  if (state.view === 'saved') { first = 'Bewaard'; second = 'voor straks'; }
  else if (state.view === 'search') { first = state.query ? `${n} gevonden` : 'Zoeken'; second = 'op naam of soort'; }
  else if (!state.pos) { first = 'Slenter'; second = 'waar ben je?'; }
  else if (state.loading) { first = 'Even rondkijken'; second = 'om de hoek'; }
  else { first = `${n} ${n === 1 ? 'plek' : 'plekken'}`; second = 'om de hoek'; }
  els.headline.replaceChildren(h('span', {}, first), h('span', { class: 'sub' }, second));
}

function chipButtons() {
  const counts = state.places.length ? groupCounts() : {};
  return GROUPS.filter(g => g.id === 'all' || !state.places.length || counts[g.id] > 0).map(g =>
    h('button', { class: 'chip' + (g.id === state.group ? ' on' : ''), type: 'button', onclick: () => {
      state.group = g.id; state.shown = 60; render();
      if (state.view !== 'map') window.scrollTo({ top: 0 });
    } },
      g.label, counts[g.id] != null ? h('span', { class: 'n' }, String(counts[g.id])) : null));
}

function renderChips() {
  const show = state.view === 'near' && !state.query;
  els.chips.hidden = !show;
  if (show) els.chips.replaceChildren(...chipButtons());
}

function row(p, withAddress) {
  const initial = p.name.replace(/^(the|de|het|la|le|het)\s+/i, '').trim()[0]?.toUpperCase() || '·';
  const fav = state.saved[p.id];
  return h('button', { class: 'row', type: 'button', onclick: () => openDetail(p) },
    h('span', { class: 'mark' + (p.star ? ' star' : '') }, initial),
    h('span', { class: 'r-main' },
      h('span', { class: 'r-name' }, p.name),
      withAddress && p.address ? h('span', { class: 'r-addr' }, p.address.replace('\n', ', ')) : null,
      h('span', { class: 'r-tags' },
        h('span', { class: 'cap' }, kindLabel(p)),
        p.star ? h('span', { class: 'cap fav' }, 'aanrader') : null,
        fav ? h('span', { class: 'cap fav' }, 'bewaard') : null)),
    h('span', { class: 'mins' }, h('b', {}, String(p.min)), h('span', { class: 'cap' }, 'min')));
}

function note(title, text, action) {
  return h('div', { class: 'note' }, h('p', { class: 'disp' }, title), text ? h('p', {}, text) : null, action || null);
}

function renderList() {
  const L = els.list;
  if (!state.pos) {
    L.replaceChildren(note('Waar ben je?', 'Slenter gebruikt je locatie om te tonen wat er te voet bereikbaar is.',
      h('button', { class: 'btn fill', type: 'button', style: 'padding:0 24px', onclick: startGps }, 'Gebruik mijn locatie')));
    return;
  }
  if (state.view === 'saved') {
    const list = visible();
    L.replaceChildren(...(list.length ? list.map(p => row(p, true))
      : [note('Nog niets bewaard', 'Open een plek en tik op Bewaar. Je lijst blijft op deze telefoon.')]));
    return;
  }
  if (state.loading) {
    L.replaceChildren(...Array.from({ length: 7 }, () => h('div', { class: 'skel' }, h('i'), h('div', {}, h('i'), h('i')))));
    return;
  }
  if (state.error) {
    L.replaceChildren(note('Even geen kaart', state.error, h('button', { class: 'btn soft', type: 'button', style: 'padding:0 24px', onclick: () => { state.fetchedAt = null; loadPlaces(); } }, 'Opnieuw')));
    return;
  }
  const list = visible();
  const searching = state.view === 'search' || !!state.query;
  const kids = list.slice(0, state.shown).map(p => row(p, searching));
  if (list.length > state.shown) kids.push(h('button', { class: 'more', type: 'button', onclick: () => { state.shown += 60; renderList(); } }, `Toon meer (${list.length - state.shown})`));
  if (searching && state.remote.length) {
    kids.push(h('div', { class: 'section-h cap' }, 'Ook in de buurt'));
    kids.push(...withDistance(state.remote).sort((a, b) => a.m - b.m).map(p => row(p, true)));
  }
  if (!kids.length) {
    kids.push(searching
      ? note(state.query ? 'Niets gevonden' : 'Wat zoek je?', state.query ? `Geen "${state.query}" binnen wandelafstand. Probeer een soort, zoals koffie, museum of pizza.` : 'Typ een naam of een soort: koffie, museum, pizza, park, boekhandel.')
      : note('Hier is het stil', 'Kies meer wandeltijd bovenaan, of een andere soort.'));
  }
  L.replaceChildren(...kids);
}

function renderTabs() {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.view === state.view));
}

function render() {
  els.clear.hidden = !state.query;
  renderHeader(); renderChips(); renderList(); renderTabs(); renderMapView();
}

// ---------- map view ----------
// Every place the list would show, as a dot; the dashed circle is the chosen walking time.
let bigMap, bigLayer, bigCircle, bigMe, selectedId = null, lastFitKey = '';

function nearForMap() {
  const g = GROUPS.find(x => x.id === state.group);
  let list = withDistance(state.places).filter(p => p.min <= state.minutes);
  if (g.kinds) list = list.filter(p => g.kinds.includes(p.kind));
  if (g.id === 'top') list = list.filter(isTop);
  return list;
}

function renderMapView() {
  const show = state.view === 'map';
  els.mapview.hidden = !show;
  document.body.style.overflow = show || !els.detail.hidden ? 'hidden' : '';
  if (!show) return;
  els.mapChips.replaceChildren(...chipButtons());
  if (!state.pos) {
    els.mapStatus.textContent = 'Kies eerst waar je bent';
    els.mapCard.hidden = true;
    return;
  }
  if (!window.L) { els.mapStatus.textContent = 'De kaart laadt niet. Controleer je verbinding.'; return; }
  const list = nearForMap();
  els.mapStatus.textContent = state.loading ? 'Even rondkijken…'
    : `${list.length} ${list.length === 1 ? 'plek' : 'plekken'} binnen ${state.minutes} min${state.partial ? ', zoekt verder…' : ''}`;

  if (!bigMap) {
    bigMap = L.map(els.bigMap, { zoomControl: false, preferCanvas: true, zoomSnap: 0.25 });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap', className: 'tiles' }).addTo(bigMap);
    bigLayer = L.layerGroup().addTo(bigMap);
    bigMap.on('click', () => selectOnMap(null));
  }
  const css = getComputedStyle(document.documentElement);
  const color = name => css.getPropertyValue(name).trim();
  const here = [state.pos.lat, state.pos.lon];
  const radius = radiusFor(state.minutes);
  if (!lastFitKey) bigMap.setView(here, 15);

  if (!bigCircle) {
    bigCircle = L.circle(here, { radius, color: color('--blue'), weight: 2, dashArray: '6 6', fillColor: color('--blue'), fillOpacity: 0.06, interactive: false }).addTo(bigMap);
    bigMe = L.marker(here, { icon: L.divIcon({ className: 'pin-me', iconSize: [18, 18] }), interactive: false, zIndexOffset: 1000 }).addTo(bigMap);
  } else {
    bigCircle.setLatLng(here).setRadius(radius);
    bigMe.setLatLng(here);
  }

  bigLayer.clearLayers();
  // Picks are drawn last so they sit on top.
  const ordered = [...list].sort((a, b) => (a.star === b.star ? 0 : a.star ? 1 : -1));
  for (const p of ordered) {
    const sel = p.id === selectedId;
    const dot = L.circleMarker([p.lat, p.lon], {
      radius: sel ? 11 : p.star ? 8 : 6.5,
      color: color('--card'), weight: sel ? 4 : 2.5,
      fillColor: sel ? color('--ink') : p.star ? color('--blue-deep') : color('--blue'), fillOpacity: 1,
    });
    dot.on('click', e => { L.DomEvent.stopPropagation(e); selectOnMap(p.id); });
    bigLayer.addLayer(dot);
  }
  renderMapCard(list);

  // Fit to the walking circle once per place and walking time, not on every refresh.
  const fitKey = `${state.pos.lat.toFixed(4)},${state.pos.lon.toFixed(4)},${state.minutes}`;
  setTimeout(() => {
    bigMap.invalidateSize();
    if (fitKey !== lastFitKey) {
      lastFitKey = fitKey;
      bigMap.fitBounds(L.latLng(here).toBounds(radius * 2), { paddingTopLeft: [16, 110], paddingBottomRight: [16, 20] });
    }
  }, 30);
}

function selectOnMap(id) {
  selectedId = id;
  renderMapView();
}

function renderMapCard(list) {
  const p = list.find(x => x.id === selectedId);
  els.mapCard.hidden = !p;
  // Leave the card alone while the list fills in, so a tap on it is never lost.
  const key = p ? `${p.id}|${p.min}|${!!state.saved[p.id]}` : '';
  if (!p || els.mapCard.dataset.key === key) return;
  els.mapCard.dataset.key = key;
  els.mapCard.replaceChildren(
    row(p, true),
    h('div', { class: 'pair' },
      h('a', { class: 'btn fill', href: walkUrl(p), target: '_blank', rel: 'noopener' }, 'Wandel erheen'),
      h('button', { class: 'btn soft', type: 'button', onclick: () => openDetail(p) }, 'Meer info')));
}

const walkUrl = p => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}&travelmode=walking`;

// ---------- detail ----------
let map, layer;
async function openDetail(p) {
  els.detail.hidden = false;
  document.body.style.overflow = 'hidden';
  history.pushState({ detail: true }, '');
  const m = state.pos ? meters(state.pos, p) : 0;
  els.dTags.replaceChildren(
    h('span', { class: 'tag' }, kindLabel(p)),
    state.pos ? h('span', { class: 'tag blue' }, `${walkMin(m)} min · ${fmtDist(m)}`) : null,
    p.star ? h('span', { class: 'tag star' }, 'aanrader') : null);
  els.dName.textContent = p.name;
  els.dWalk.href = walkUrl(p);
  els.dWeb.hidden = !p.website;
  if (p.website) els.dWeb.href = /^https?:/.test(p.website) ? p.website : 'https://' + p.website;
  renderSave(p);
  els.dSave.onclick = () => {
    if (state.saved[p.id]) delete state.saved[p.id];
    else state.saved[p.id] = { id: p.id, name: p.name, kind: p.kind, kindLabel: p.kindLabel, lat: p.lat, lon: p.lon, tags: {}, cuisine: p.cuisine, address: p.address, website: p.website, hours: p.hours, star: p.star };
    saveJSON('odh.saved', state.saved);
    renderSave(p); render();
  };
  renderFacts(p, p.address);
  drawMap(p);
  if (!p.address) {
    const addr = await reverseAddress(p.lat, p.lon);
    if (addr && els.dName.textContent === p.name) { p.address = addr + '\n(dichtstbijzijnde adres)'; renderFacts(p, p.address); }
  }
}

function renderSave(p) {
  const on = !!state.saved[p.id];
  els.dSave.textContent = on ? 'Bewaard' : 'Bewaar';
  els.dSave.classList.toggle('on', on);
}

function renderFacts(p, address) {
  const t = p.tags || {};
  const facts = [['Adres', address || 'Adres zoeken…']];
  if (p.hours) facts.push(['Openingsuren', fmtHours(p.hours), 'small']);
  if (p.cuisine.length) facts.push(['Keuken', p.cuisine.map(c => CUISINE_NL[c] || c.replace(/_/g, ' ')).join(', ')]);
  const extra = [t.fee === 'no' && 'gratis toegang', t.wheelchair === 'yes' && 'rolstoeltoegankelijk', t.outdoor_seating === 'yes' && 'terras', t.diet_vegan === 'yes' && 'vegan opties', t.internet_access === 'wlan' && 'wifi'].filter(Boolean);
  if (extra.length) facts.push(['Goed om te weten', extra.join(' · ')]);
  els.dFacts.replaceChildren(...facts.map(([k, v, cls]) => h('div', { class: 'fact' }, h('span', { class: 'cap' }, k), h('span', { class: 'v' + (cls ? ' ' + cls : '') }, v))));
}

const DAYS = { Mo: 'ma', Tu: 'di', We: 'wo', Th: 'do', Fr: 'vr', Sa: 'za', Su: 'zo', PH: 'feestdagen' };
function fmtHours(s) {
  return s.split(';').map(x => x.trim()).filter(Boolean)
    .map(x => x.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, d => DAYS[d]).replace(/\boff\b|\bclosed\b/g, 'gesloten').replace(/,(?=\S)/g, ', '))
    .join('\n');
}

const addrCache = {};
async function reverseAddress(lat, lon) {
  const key = lat.toFixed(5) + ',' + lon.toFixed(5);
  if (addrCache[key]) return addrCache[key];
  try {
    const r = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&limit=1`);
    const f = (await r.json()).features?.[0]?.properties;
    if (!f) return '';
    const street = [f.street || f.name, f.housenumber].filter(Boolean).join(' ');
    return (addrCache[key] = [street, [f.postcode, f.city].filter(Boolean).join(' ')].filter(Boolean).join('\n'));
  } catch { return ''; }
}

function drawMap(p) {
  if (!window.L) return;
  if (!map) {
    map = L.map(els.dMap, { zoomControl: false, attributionControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap', className: 'tiles',
    }).addTo(map);
    layer = L.layerGroup().addTo(map);
  }
  layer.clearLayers();
  const it = L.marker([p.lat, p.lon], { icon: L.divIcon({ className: 'pin-it', iconSize: [22, 22] }) });
  layer.addLayer(it);
  setTimeout(() => {
    map.invalidateSize();
    if (state.pos) {
      layer.addLayer(L.marker([state.pos.lat, state.pos.lon], { icon: L.divIcon({ className: 'pin-me', iconSize: [16, 16] }) }));
      map.fitBounds(L.latLngBounds([[p.lat, p.lon], [state.pos.lat, state.pos.lon]]), { paddingTopLeft: [60, 70], paddingBottomRight: [40, 60], maxZoom: 17 });
    } else map.setView([p.lat, p.lon], 16);
  }, 30);
}

function closeDetail(fromPop) {
  if (els.detail.hidden) return;
  els.detail.hidden = true;
  document.body.style.overflow = state.view === 'map' ? 'hidden' : '';
  if (!fromPop && history.state?.detail) history.back();
}

// ---------- picker ----------
function openPicker(why) {
  els.pWhy.textContent = why || 'Zoek een straat, plein of buurt, of kies hieronder.';
  els.picker.hidden = false;
  els.pResults.replaceChildren();
}
function closePicker() { els.picker.hidden = true; }

let pickTimer;
els.pQ.addEventListener('input', () => {
  clearTimeout(pickTimer);
  const q = els.pQ.value.trim();
  if (q.length < 3) { els.pResults.replaceChildren(); return; }
  pickTimer = setTimeout(async () => {
    try {
      const bias = state.pos ? `&lat=${state.pos.lat}&lon=${state.pos.lon}` : '';
      const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6${bias}`);
      const j = await r.json();
      els.pResults.replaceChildren(...(j.features || []).map(f => {
        const pr = f.properties, [lon, lat] = f.geometry.coordinates;
        const name = pr.name || [pr.street, pr.housenumber].filter(Boolean).join(' ');
        const where = [pr.district || pr.locality, pr.city, pr.country].filter(Boolean).join(', ');
        return h('button', { type: 'button', onclick: () => choose(lat, lon, [name, pr.city].filter(Boolean).join(', ')) },
          h('span', { style: 'font-weight:600' }, name), h('span', { class: 'cap' }, where));
      }));
    } catch { /* keep typing */ }
  }, 300);
});

function choose(lat, lon, label) {
  stopGps();
  closePicker();
  state.fetchedAt = null;
  setPos(lat, lon, label);
}

document.querySelectorAll('.p-presets [data-lat]').forEach(b =>
  b.addEventListener('click', () => choose(+b.dataset.lat, +b.dataset.lon, b.dataset.label)));
els.pGps.addEventListener('click', () => { closePicker(); state.label = ''; startGps(); });
els.pClose.addEventListener('click', closePicker);
els.picker.addEventListener('click', e => { if (e.target === els.picker) closePicker(); });

// ---------- wiring ----------
els.locBtn.addEventListener('click', () => openPicker());
els.radius.addEventListener('click', () => {
  state.minutes = RADII[(RADII.indexOf(state.minutes) + 1) % RADII.length];
  saveJSON('odh.minutes', state.minutes);
  state.shown = 60; render();
});
els.q.addEventListener('input', () => {
  state.query = els.q.value;
  state.shown = 60;
  if (state.query && state.view === 'near') state.view = 'search';
  searchRemote(state.query.trim());
  render();
});
els.q.addEventListener('keydown', e => { if (e.key === 'Enter') els.q.blur(); });
els.clear.addEventListener('click', () => { els.q.value = ''; state.query = ''; state.remote = []; render(); els.q.focus(); });
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  state.view = t.dataset.view; state.shown = 60;
  if (state.view !== 'search') { els.q.value = ''; state.query = ''; state.remote = []; }
  render(); window.scrollTo({ top: 0 });
  if (state.view === 'search') els.q.focus();
}));
els.dClose.addEventListener('click', () => closeDetail(false));
els.recenter.addEventListener('click', () => { lastFitKey = ''; selectedId = null; renderMapView(); });
window.addEventListener('popstate', () => closeDetail(true));
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDetail(false); closePicker(); } });

state.minutes = loadJSON('odh.minutes', 15);
if (!RADII.includes(state.minutes)) state.minutes = 15;
render();
startGps();
