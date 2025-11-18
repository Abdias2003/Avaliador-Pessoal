// main.js - comunicação com Supabase REST API (fetch)
// Exige que você tenha criado `config.js` com as constantes `CONFIG.SUPABASE_URL` e `CONFIG.SUPABASE_ANON_KEY`.

const { SUPABASE_URL, SUPABASE_ANON_KEY } = (typeof CONFIG !== 'undefined') ? CONFIG : { SUPABASE_URL: undefined, SUPABASE_ANON_KEY: undefined };

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Por favor configure a URL e a anon key do Supabase em config.js (baseado em config.template.js)');
}

const authTokenKey = 'supabase_access_token';
let accessToken = localStorage.getItem(authTokenKey) || null;
let currentUser = null;
let editingId = null;
let genresCache = [];

// Parse access_token se veio no hash (após redirect OAuth)
// NOTE: OAuth redirect parsing is left in place for compatibility, but
// primary login flow uses the dedicated `login.html` page.
function parseHashToken() {
  if (window.location.hash && window.location.hash.includes('access_token')) {
    const hash = new URLSearchParams(window.location.hash.replace('#','?'));
    const token = hash.get('access_token');
    if (token) {
      localStorage.setItem(authTokenKey, token);
      accessToken = token;
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }
}

async function getCurrentUser() {
  if (!accessToken) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
      }
    });
    if (!res.ok) throw new Error('Não autorizado');
    const u = await res.json();
    return u;
  } catch (e) {
    console.warn('Erro ao obter usuário:', e.message);
    return null;
  }
}

function setAuthButtons() {
  const signinBtn = document.getElementById('signin-btn');
  const signoutBtn = document.getElementById('signout-btn');
  if (currentUser) {
    signinBtn.classList.add('hidden');
    signoutBtn.classList.remove('hidden');
    signoutBtn.textContent = `Sair (${currentUser.email || currentUser.id})`;
  } else {
    signinBtn.classList.remove('hidden');
    signoutBtn.classList.add('hidden');
  }
}

function signInRedirectToLogin() {
  // Simple, robust redirect to login.html (use relative URL)
  try {
    const target = new URL('login.html', window.location.href).toString();
    window.location.href = target;
  } catch (e) {
    window.location.href = 'login.html';
  }
}

function signOut() {
  localStorage.removeItem(authTokenKey);
  accessToken = null;
  currentUser = null;
  setAuthButtons();
  fetchAndRender();
}

// Util headers para REST requests
function restHeaders() {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  return headers;
}

// --- CRUD ---
async function fetchGenres() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/genres?select=*`, { headers: restHeaders() });
  if (!res.ok) throw new Error('Falha ao buscar gêneros');
  const data = await res.json();
  genresCache = data; // keep cache so we can resolve genre_id -> name when rendering
}

// Try to find a genre by exact name (case-insensitive). If not found, create it.
async function getOrCreateGenreId(name) {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  // Try find in cache first
  const found = genresCache.find(g => g.name && g.name.toLowerCase() === trimmed.toLowerCase());
  if (found) return found.id;

  // Try server-side search (case-insensitive)
  const q = `${SUPABASE_URL}/rest/v1/genres?name=ilike.${encodeURIComponent(trimmed)}`;
  const res = await fetch(q, { headers: restHeaders() });
  if (res.ok) {
    const arr = await res.json();
    const exact = arr.find(g => g.name && g.name.toLowerCase() === trimmed.toLowerCase());
    if (exact) {
      genresCache.push(exact);
      return exact.id;
    }
  }

  // Create new genre
  const createRes = await fetch(`${SUPABASE_URL}/rest/v1/genres`, {
    method: 'POST',
    headers: restHeaders(),
    body: JSON.stringify({ name: trimmed, created_at: new Date().toISOString() }),
  });
  if (!createRes.ok) {
    console.warn('Não foi possível criar o gênero, status:', createRes.status);
    return null;
  }
  const created = await createRes.json();
  // created may be an array with the inserted row
  const row = Array.isArray(created) ? created[0] : created;
  if (row) {
    genresCache.push(row);
    return row.id;
  }
  return null;
}

async function fetchReviews() {
  // trazer reviews ordenados por created_at desc
  const res = await fetch(`${SUPABASE_URL}/rest/v1/reviews?select=*&order=created_at.desc`, { headers: restHeaders() });
  if (!res.ok) throw new Error('Falha ao buscar avaliações');
  return res.json();
}

async function createReview(payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/reviews`, {
    method: 'POST',
    headers: restHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('Erro ao criar: ' + t);
  }
  return res.json();
}

async function updateReview(id, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/reviews?id=eq.${id}`, {
    method: 'PATCH',
    headers: restHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Falha ao atualizar');
  return res.json();
}

async function deleteReview(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/reviews?id=eq.${id}`, {
    method: 'DELETE',
    headers: restHeaders(),
  });
  if (!res.ok) throw new Error('Falha ao excluir');
  return res;
}

// --- UI ---
function renderStars(n) {
  return '★'.repeat(n) + '☆'.repeat(5-n);
}

function renderReviews(list) {
  const container = document.getElementById('reviews-list');
  container.innerHTML = '';
  if (!list.length) {
    container.innerHTML = '<div class="text-gray-500">Nenhuma avaliação cadastrada.</div>';
    return;
  }
  list.forEach(r => {
    const g = genresCache.find(x => x.id === r.genre_id) || {};
    const card = document.createElement('div');
    card.className = 'border rounded p-3 flex justify-between items-start gap-3';
    card.innerHTML = `
      <div>
        <div class="font-semibold text-lg">${r.title} <span class="text-sm text-gray-500">(${r.type === 'series' && r.season ? 'S' + r.season : ''})</span></div>
        <div class="text-sm text-gray-600">${g.name || '—'} · ${new Date(r.created_at).toLocaleString()}</div>
        <div class="mt-2 text-orange-500">${renderStars(r.rating)}</div>
        <div class="mt-2 text-gray-800">${r.opinion || ''}</div>
      </div>
      <div class="flex flex-col gap-2">
        <button class="edit-btn bg-yellow-400 text-white px-3 py-1 rounded" data-id="${r.id}">Editar</button>
        <button class="delete-btn bg-red-500 text-white px-3 py-1 rounded" data-id="${r.id}">Excluir</button>
      </div>
    `;
    container.appendChild(card);
  });
  // attach events
  document.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', onEditClick));
  document.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', onDeleteClick));
}

async function fetchAndRender() {
  try {
    await fetchGenres();
    const reviews = await fetchReviews();
    renderReviews(reviews);
  } catch (e) {
    console.error(e);
    document.getElementById('reviews-list').innerHTML = `<div class="text-red-500">Erro: ${e.message}</div>`;
  }
}

// Form handlers
function toggleSeasonInput() {
  const kind = document.querySelector('input[name="kind"]:checked').value;
  const wrapper = document.getElementById('season-wrapper');
  if (kind === 'series') wrapper.classList.remove('hidden'); else wrapper.classList.add('hidden');
}

async function onSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('title').value.trim();
  const genreInput = document.getElementById('genre').value.trim();
  let genre_id = null;
  const rating = Number(document.getElementById('rating').value);
  const opinion = document.getElementById('opinion').value.trim();
  const kind = document.querySelector('input[name="kind"]:checked').value;
  const seasonVal = document.getElementById('season').value;
  const season = seasonVal ? Number(seasonVal) : null;

  if (!title) return showFormMessage('Preencha o título', true);

  try {
    // ensure genre exists and get id
    genre_id = await getOrCreateGenreId(genreInput);
  } catch (e) {
    console.warn('Erro ao resolver/generar gênero:', e.message || e);
  }

  const payload = {
    title,
    genre_id,
    rating,
    opinion,
    type: kind,
    season,
    created_at: new Date().toISOString(),
  };
  if (currentUser && currentUser.id) payload.user_id = currentUser.id;

  try {
    if (editingId) {
      await updateReview(editingId, payload);
      showFormMessage('Atualizado com sucesso');
      editingId = null;
      document.getElementById('cancel-edit-btn').classList.add('hidden');
    } else {
      await createReview(payload);
      showFormMessage('Criado com sucesso');
    }
    document.getElementById('review-form').reset();
    toggleSeasonInput();
    await fetchAndRender();
  } catch (err) {
    console.error(err);
    showFormMessage('Erro: ' + (err.message || err), true);
  }
}

function showFormMessage(msg, isError = false) {
  const el = document.getElementById('form-message');
  el.textContent = msg;
  el.className = isError ? 'text-sm text-red-600 mt-2' : 'text-sm text-green-600 mt-2';
  setTimeout(() => { el.textContent = ''; }, 4000);
}

async function onEditClick(e) {
  const id = e.currentTarget.dataset.id;
  // fetch single review
  const res = await fetch(`${SUPABASE_URL}/rest/v1/reviews?id=eq.${id}&select=*`, { headers: restHeaders() });
  const arr = await res.json();
  const r = arr[0];
  if (!r) return;
  editingId = r.id;
  document.getElementById('title').value = r.title;
  // genre input is a free-text field now; try to show the genre name (fallback to empty)
  const genreEl = document.getElementById('genre');
  const genreObj = genresCache.find(x => x.id === r.genre_id);
  genreEl.value = genreObj && genreObj.name ? genreObj.name : '';
  document.getElementById('rating').value = r.rating;
  document.getElementById('opinion').value = r.opinion || '';
  if (r.type === 'series') document.querySelector('input[name="kind"][value="series"]').checked = true; else document.querySelector('input[name="kind"][value="movie"]').checked = true;
  toggleSeasonInput();
  if (r.season) document.getElementById('season').value = r.season;
  document.getElementById('cancel-edit-btn').classList.remove('hidden');
}

async function onDeleteClick(e) {
  const id = e.currentTarget.dataset.id;
  if (!confirm('Confirma exclusão?')) return;
  try {
    await deleteReview(id);
    await fetchAndRender();
  } catch (err) {
    console.error(err);
    alert('Erro ao excluir: ' + err.message);
  }
}

function onCancelEdit() {
  editingId = null;
  document.getElementById('review-form').reset();
  toggleSeasonInput();
  document.getElementById('cancel-edit-btn').classList.add('hidden');
}

// Init
(async function init() {
  console.log('main.init starting — DOM should be ready');
  parseHashToken();
  accessToken = localStorage.getItem(authTokenKey) || accessToken;
  currentUser = await getCurrentUser();
  setAuthButtons();
  await fetchAndRender();

  // events
  const signinEl = document.getElementById('signin-btn');
  const signoutEl = document.getElementById('signout-btn');
  if (!signinEl || !signoutEl) console.warn('signin or signout element not found', {signinEl, signoutEl});
  signinEl.addEventListener('click', (e) => { console.log('signin clicked', e); signInRedirectToLogin(e); });
  signoutEl.addEventListener('click', (e) => { console.log('signout clicked', e); signOut(e); });
  document.querySelectorAll('input[name="kind"]').forEach(r => r.addEventListener('change', toggleSeasonInput));
  document.getElementById('review-form').addEventListener('submit', onSubmit);
  document.getElementById('cancel-edit-btn').addEventListener('click', onCancelEdit);
})();
