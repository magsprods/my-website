// ============ 1. SUPABASE VƏ İSTİFADƏÇİ ============
// Supabase → Project Settings → API bölməsindən götürün
const SUPABASE_URL = "https://eznroomijdzsdxdyfjru.supabase.co";
const SUPABASE_KEY = "sb_publishable_D54kU52D5ewlrGYqS8vVdA_kdditGvO";

// Açarlar yazılmayıbsa və ya kitabxana yüklənməyibsə sayt yenə də açılır
const AUTH_READY = !SUPABASE_URL.startsWith("BURA") && !SUPABASE_KEY.startsWith("BURA") && window.supabase;
const sb = AUTH_READY ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let ME = null;     // istifadəçi adı, null = qonaq
let draft = {};    // xəta olanda yazılanları itirməmək üçün

// Sessiyaya görə profili bazadan yükləyir
async function loadMe(session) {
  if (!sb || !session) { ME = null; return; }
  const { data } = await sb.from("profiles")
    .select("username, points").eq("id", session.user.id).single();
  if (data) {
    ME = data.username;
    state.points[ME] = data.points;
  }
}

// Səhifə açılanda əvvəlki sessiya varsa avtomatik daxil edir
async function initAuth() {
  if (!sb) return;
  const { data: { session } } = await sb.auth.getSession();
  await loadMe(session);
  render();
}

// ============ 2. SAHƏLƏR ============
const AREAS = [
  "Proqramlaşdırma", "Riyaziyyat", "Elm", "Dillər", "Tarix",
  "İqtisadiyyat və biznes", "Dizayn", "Kibertəhlükəsizlik", "Karyera", "Digər"
];
const AREA_INFO = {
  "Proqramlaşdırma": "Kod, alətlər, səhvlərin tapılması və öyrənmə yolları.",
  "Riyaziyyat": "Tənliklər, məntiq, statistika və məsələ həlli.",
  "Elm": "Fizika, kimya, biologiya və gündəlik hadisələrin izahı.",
  "Dillər": "Qrammatika, tərcümə, söz ehtiyatı və danışıq təcrübəsi.",
  "Tarix": "Hadisələr, şəxsiyyətlər və onların bu günə təsiri.",
  "İqtisadiyyat və biznes": "Maliyyə, startap, büdcə və bazar anlayışları.",
  "Dizayn": "Vizual dizayn, istifadəçi təcrübəsi və yaradıcı alətlər.",
  "Kibertəhlükəsizlik": "Fişinq, parol qorunması və rəqəmsal təhlükəsizlik.",
  "Karyera": "CV, müsahibə, bacarıqların inkişafı və iş axtarışı.",
  "Digər": "Yuxarıdakı sahələrə sığmayan hər şey."
};

// ============ 3. BAŞLANĞIC MƏLUMATLAR ============
function seed() {
  return {
    nextId: 50,
    points: { Aysel: 120, "Rəşad": 85, Leyla: 60 },
    voted: [],
    solved: [],
    questions: [
      { id: 1, type: "open", area: "Proqramlaşdırma", author: "Leyla", votes: 3,
        title: "Python-da siyahı ilə tuple arasında fərq nədir?",
        body: "Hər ikisi element saxlayır. Nə vaxt hansını seçməliyəm?",
        answers: [
          { id: 1, author: "Aysel", votes: 2, accepted: false, text: "Siyahı dəyişdirilə bilər (element əlavə etmək, silmək olar), tuple isə yox. Dəyişməməli məlumat üçün tuple seçin." },
          { id: 2, author: "Rəşad", votes: 1, accepted: false, text: "Tuple bir az daha sürətlidir və lüğətdə açar kimi işlənə bilər, siyahı bunu bacarmır." }
        ] },
      { id: 2, type: "check", area: "Riyaziyyat", author: "Leyla", votes: 1, pts: 10, answer: "7",
        title: "2x + 6 = 20 tənliyində x neçədir?",
        body: "Cavabı yalnız rəqəmlə yazın.", answers: [] },
      { id: 3, type: "open", area: "Dillər", author: "Rəşad", votes: 2,
        title: "İngilis dilində “since” və “for” arasındakı fərq?",
        body: "Hər ikisi “-dan bəri” kimi tərcümə olunur, amma cümlədə fərqli işlənir. Sadə qayda varmı?",
        answers: [
          { id: 3, author: "Leyla", votes: 1, accepted: false, text: "“Since” başlanğıc nöqtəsini göstərir (since 2020, since Monday). “For” müddəti göstərir (for three years, for two hours)." }
        ] },
      { id: 4, type: "open", area: "Kibertəhlükəsizlik", author: "Aysel", votes: 4,
        title: "Bu SMS fişinqdir?",
        body: "“Bağlamınız saxlanılıb, linkə daxil olun” mesajı gəldi. Necə yoxlayım?",
        answers: [
          { id: 4, author: "Rəşad", votes: 3, accepted: false, text: "Linkə daxil olmayın. Rəsmi şirkətlərin saytını özünüz brauzerdə yazıb orada bağlamanı yoxlayın. Linkin domeni rəsmi saytdan fərqlidirsə, bu fişinqdir." }
        ] },
      { id: 5, type: "check", area: "Elm", author: "Aysel", votes: 2, pts: 10, answer: "100",
        title: "Su dəniz səviyyəsində neçə dərəcə Selsidə qaynayır?",
        body: "Cavabı yalnız rəqəmlə yazın.", answers: [] },
      { id: 6, type: "check", area: "Tarix", author: "Leyla", votes: 2, pts: 10, answer: "1918",
        title: "Azərbaycan Xalq Cümhuriyyəti hansı ildə qurulub?",
        body: "Cavabı yalnız ili yazaraq verin.", answers: [] },
      { id: 7, type: "open", area: "İqtisadiyyat və biznes", author: "Rəşad", votes: 3,
        title: "Aylıq büdcəni necə planlamaq olar?",
        body: "50/30/20 qaydasını eşitmişəm: gəlirin 50%-i zəruri xərclərə, 30%-i istəklərə, 20%-i yığıma. Bu real həyatda işləyirmi?",
        answers: [
          { id: 5, author: "Aysel", votes: 2, accepted: false, text: "Başlanğıc üçün yaxşı çərçivədir, amma dəqiq rəqəm hər kəsdə fərqlidir. Kirayə yüksəkdirsə, 50% çox vaxt çatmır. Əvvəl 2-3 ay xərclərinizi yazın, sonra payları özünüzə uyğunlaşdırın." }
        ] },
      { id: 8, type: "open", area: "Dizayn", author: "Aysel", votes: 1,
        title: "Bir saytda neçə şrift istifadə etmək düzdür?",
        body: "Mən üç fərqli şrift qoymuşam, amma səhifə qarışıq görünür. Nə edim?",
        answers: [] },
      { id: 9, type: "open", area: "Karyera", author: "Leyla", votes: 5,
        title: "Təcrübəsi olmayan adam CV-ni necə yazsın?",
        body: "Hələ işləməmişəm. CV-yə nəyi daxil etməliyəm ki, boş görünməsin?",
        answers: [
          { id: 6, author: "Rəşad", votes: 2, accepted: false, text: "Layihələri, könüllü işləri, kursları və bacarıqları yazın. Hər biri üçün nəticəni göstərin: nə etdiniz və nə alındı." }
        ] },
      { id: 10, type: "check", area: "Proqramlaşdırma", author: "Rəşad", votes: 2, pts: 20, answer: "22",
        title: "JavaScript-də 2 + \"2\" nəticəsi nədir?",
        body: "Brauzerin konsolunda yoxlamadan əvvəl təxmin edin. Cavabı yazın.", answers: [] },
      { id: 11, type: "open", area: "Digər", author: "Aysel", votes: 2,
        title: "Yeni vərdişi yadda saxlamağın ən asan yolu nədir?",
        body: "Hər dəfə bir həftədən sonra buraxıram. Sizdə nə kömək edib?",
        answers: [] }
    ]
  };
}

function load() { try { return JSON.parse(localStorage.getItem("birge-state-3")); } catch (e) { return null; } }
function save() { try { localStorage.setItem("birge-state-3", JSON.stringify(state)); } catch (e) {} }

let state = load() || seed();
let view = { name: "list", area: "Hamısı", id: null };
let note = null;
let lastKey = "";   // animasiyanı yalnız ekran dəyişəndə işlətmək üçün

// ============ 4. KÖMƏKÇİ FUNKSİYALAR ============
// İstifadəçi mətni kod kimi işləməsin (XSS qorunması)
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function norm(s) { return String(s).trim().toLowerCase().replace(/\s+/g, " "); }
function addPoints(name, n) { state.points[name] = (state.points[name] || 0) + n; }
function level(p) { return p < 50 ? "Yeni üzv" : p < 150 ? "Araşdırıcı" : p < 400 ? "Mütəxəssis" : "Mentor"; }

// ============ 5. EKRANLAR ============
const app = document.getElementById("app");

function renderAuth() {
  const box = document.getElementById("auth");
  if (!box) return;
  if (!ME) {
    box.innerHTML = `<button class="link" data-act="go" data-view="login">Daxil ol</button>
      <button class="btn alt" data-act="go" data-view="register">Qeydiyyat</button>`;
  } else {
    box.innerHTML = `<span class="avatar" aria-hidden="true">${esc(ME[0].toUpperCase())}</span>
      <span class="me">${esc(ME)} · <b>${state.points[ME] || 0}</b> xal</span>
      <button class="link" data-act="logout">Çıxış</button>`;
  }
}

function render() {
  renderAuth();
  const n = note ? `<div class="note ${note.bad ? "bad" : ""}" role="status">${esc(note.text)}</div>` : "";
  note = null;
  if (view.name === "list") app.innerHTML = n + listHTML();
  else if (view.name === "detail") app.innerHTML = n + detailHTML();
  else if (view.name === "board") app.innerHTML = n + boardHTML();
  else if (view.name === "login") app.innerHTML = n + authHTML("login");
  else if (view.name === "register") app.innerHTML = n + authHTML("register");
  else app.innerHTML = n + newHTML();

  // Yumşaq görünmə: yalnız başqa ekrana keçəndə (səs verəndə titrəmə olmasın)
  const key = view.name + "|" + view.area + "|" + view.id;
  if (key !== lastKey) {
    app.classList.remove("fade");
    void app.offsetWidth;
    app.classList.add("fade");
  }
  lastKey = key;
}

function listHTML() {
  const all = view.area === "Hamısı";
  const chips = ["Hamısı", ...AREAS].map(a =>
    `<button class="chip ${view.area === a ? "on" : ""}" data-act="area" data-area="${esc(a)}">${esc(a)}</button>`).join("");

  const list = state.questions.filter(q => all || q.area === view.area);
  const items = list.map(q => `
    <button class="q" data-act="open" data-id="${q.id}">
      <h3>${esc(q.title)}</h3>
      <div class="meta"><span class="tag">${esc(q.area)}</span><span class="tag">${q.type === "check" ? "Tapşırıq" : "Müzakirə"}</span>
      ${esc(q.author)} · ${q.answers.length} cavab · ${q.votes} səs</div>
    </button>`).join("");

  const nQ = state.questions.length;
  const nA = state.questions.reduce((s, q) => s + q.answers.length, 0);
  const nU = Object.keys(state.points).length;

  const head = all
    ? `<div class="intro">
         <h1>Birlikdə öyrən, müzakirə et, yüksəl</h1>
         <p>Hər sahədən sual ver, başqalarının suallarına cavab yaz. Faydalı cavablar xal gətirir, xal isə səviyyəni artırır.</p>
         <div class="stats">
           <div><b>${nQ}</b><span>sual</span></div>
           <div><b>${nA}</b><span>cavab</span></div>
           <div><b>${nU}</b><span>üzv</span></div>
         </div>
       </div>`
    : `<h1>${esc(view.area)}</h1><p class="area-info">${esc(AREA_INFO[view.area] || "")}</p>`;

  const how = all
    ? `<div class="how">
         <div><h3>Sual ver</h3><p>Müzakirə sualı və ya cavabı yoxlanan tapşırıq yaz.</p></div>
         <div><h3>Cavabla</h3><p>Bildiyinizi paylaşın, fikirlərə səs verin.</p></div>
         <div><h3>Yüksəl</h3><p>Faydalı cavab +15, səs +2 xal gətirir. Xal səviyyənizi artırır.</p></div>
       </div>`
    : "";

  const cta = `<div class="cta"><p>Cavabını axtardığın sual yoxdur?</p>
      <button class="btn" data-act="go" data-view="new">Sual yaz</button></div>`;

  return `${head}<div class="chips">${chips}</div>${items || "<p>Bu sahədə hələ sual yoxdur. İlk sualı siz yazın.</p>"}${cta}${how}`;
}

function detailHTML() {
  const q = state.questions.find(x => x.id === view.id);
  if (!q) return `<p>Sual tapılmadı.</p>`;
  const solved = state.solved.includes(q.id);

  let checkBox = "";
  if (q.type === "check") {
    if (!ME) checkBox = `<p class="hint">Tapşırığı həll etmək üçün <button class="link" data-act="go" data-view="login">daxil olun</button>.</p>`;
    else if (q.author === ME) checkBox = `<p class="hint">Bu sizin tapşırığınızdır, onu həll edə bilməzsiniz.</p>`;
    else if (solved) checkBox = `<p class="note">Bu tapşırığı həll etmisiniz.</p>`;
    else checkBox = `<form data-form="check" data-id="${q.id}" class="checkform"><input name="f" placeholder="Cavabınız" autocomplete="off" aria-label="Cavabınız"><button class="btn">Yoxla (${q.pts} xal)</button></form>`;
  }

  const answers = q.answers.map(a => `
    <div class="ans ${a.accepted ? "good" : ""}">
      <div class="body" style="margin:0">${esc(a.text)}</div>
      <div class="row meta">${esc(a.author)} · ${a.votes} səs
        <button class="btn alt" data-act="votea" data-id="${q.id}" data-aid="${a.id}">Səs ver</button>
        ${ME && q.author === ME && !a.accepted && a.author !== ME ? `<button class="btn" data-act="accept" data-id="${q.id}" data-aid="${a.id}">Faydalı seç</button>` : ""}
        ${a.accepted ? "<b>Faydalı cavab</b>" : ""}
      </div>
    </div>`).join("");

  const answerForm = ME
    ? `<form data-form="answer" data-id="${q.id}">
         <label for="at">Müzakirəyə qoşulun</label><textarea id="at" name="t" required></textarea>
         <div class="row" style="margin-top:10px"><button class="btn">Cavabla</button></div>
       </form>`
    : `<p class="hint">Cavab yazmaq üçün <button class="link" data-act="go" data-view="login">daxil olun</button>.</p>`;

  return `<button class="link" data-act="go" data-view="list">Geri</button>
    <div class="card">
      <h2>${esc(q.title)}</h2>
      <div class="meta"><span class="tag">${esc(q.area)}</span>${esc(q.author)} · ${q.votes} səs</div>
      <div class="body">${esc(q.body)}</div>
      <button class="btn alt" data-act="voteq" data-id="${q.id}">Suala səs ver</button>
      ${checkBox}
    </div>
    <div class="card"><h3>${q.answers.length} cavab</h3>${answers}${answerForm}</div>`;
}

function newHTML() {
  return `<h1>Yeni sual</h1>
    <form class="card" data-form="new">
      <label for="nt">Başlıq</label><input id="nt" name="title" maxlength="120" required>
      <label for="na">Sahə</label><select id="na" name="area">${AREAS.map(a => `<option>${esc(a)}</option>`).join("")}</select>
      <label for="nk">Tip</label>
      <select id="nk" name="type">
        <option value="open">Müzakirə sualı (insanlar fikir yazır)</option>
        <option value="check">Tapşırıq (düzgün cavabı siz təyin edirsiniz)</option>
      </select>
      <label for="nb">Təsvir</label><textarea id="nb" name="body" required></textarea>
      <label for="nf">Düzgün cavab (yalnız tapşırıq üçün)</label><input id="nf" name="answer">
      <p class="hint">Qısa və dəqiq cavab seçin (rəqəm, söz). Bu prototipdə cavab brauzerin kodunda görünə bilər, növbəti mərhələdə serverdə yoxlanacaq.</p>
      <div class="row" style="margin-top:10px"><button class="btn">Yayımla</button></div>
    </form>`;
}

function authHTML(mode) {
  const reg = mode === "register";
  return `<div class="auth-card">
    <h1>${reg ? "Hesab yarat" : "Daxil ol"}</h1>
    <p class="area-info">${reg ? "Sual vermək, cavablamaq və xal toplamaq üçün qeydiyyatdan keçin." : "Davam etmək üçün hesabınıza daxil olun."}</p>
    <form data-form="${mode}" novalidate>
      ${reg ? `<label for="an">İstifadəçi adı</label>
        <input id="an" name="name" maxlength="20" autocomplete="username" value="${esc(draft.name || "")}" required>` : ""}
      <label for="ae">Email</label>
      <input id="ae" name="email" type="email" autocomplete="email" value="${esc(draft.email || "")}" required>
      <label for="ap">Parol</label>
      <div class="pw">
        <input id="ap" name="pass" type="password" autocomplete="${reg ? "new-password" : "current-password"}" required>
        <button type="button" class="pw-btn" data-act="pw">Göstər</button>
      </div>
      ${reg ? `<label for="ac">Parolu təkrarlayın</label>
        <div class="pw"><input id="ac" name="pass2" type="password" autocomplete="new-password" required></div>
        <p class="hint">Ən azı 8 simvol.</p>` : ""}
      <div class="row" style="margin-top:20px"><button class="btn">${reg ? "Qeydiyyatdan keç" : "Daxil ol"}</button></div>
    </form>
    <p class="auth-switch">${reg ? "Hesabınız var?" : "Hesabınız yoxdur?"}
      <button class="link" data-act="go" data-view="${reg ? "login" : "register"}">${reg ? "Daxil ol" : "Qeydiyyat"}</button></p>
  </div>`;
}

function boardHTML() {
  const rows = Object.entries(state.points).sort((a, b) => b[1] - a[1]).map(([name, p], i) => `
    <tr class="${name === ME ? "you" : ""}"><td>${i + 1}</td><td>${esc(name)}</td><td>${level(p)}</td><td>${p}</td></tr>`).join("");
  return `<h1>Reytinq</h1><table><tr><th>#</th><th>İstifadəçi</th><th>Səviyyə</th><th>Xal</th></tr>${rows}</table>
    <p class="hint">Xal: tapşırıq həlli, faydalı cavab (+15), suala və cavaba səs (+2).</p>`;
}

// ============ 6. GİRİŞ VƏ QEYDİYYAT ============
function askLogin() {
  view = { name: "login", area: "Hamısı", id: null };
  note = { text: "Davam etmək üçün daxil olun." };
  render();
}

async function doAuth(kind, d) {
  const email = (d.email || "").trim().toLowerCase();
  draft = { name: d.name || "", email: d.email || "" };
  const fail = t => { note = { text: t, bad: true }; render(); };

  if (!sb) return fail("Giriş sistemi hələ qoşulmayıb. script.js-də Supabase açarlarını yazın.");
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Email düzgün deyil.");
  if ((d.pass || "").length < 8) return fail("Parol ən azı 8 simvol olmalıdır.");

  if (kind === "register") {
    const name = (d.name || "").trim();
    if (name.length < 3) return fail("İstifadəçi adı ən azı 3 simvol olmalıdır.");
    if (d.pass !== d.pass2) return fail("Parollar eyni deyil.");

    // Ad məşğuldurmu? (% və _ işarələri axtarışda xüsusi məna daşıyır, ona görə qaçırılır)
    const safe = name.replace(/[%_\\]/g, "\\$&");
    const { data: taken } = await sb.from("profiles").select("id").ilike("username", safe).limit(1);
    if (taken && taken.length) return fail("Bu ad artıq məşğuldur.");

    const { error } = await sb.auth.signUp({
      email, password: d.pass, options: { data: { username: name } }
    });
    if (error) return fail(error.message.toLowerCase().includes("already") ? "Bu email ilə hesab artıq var." : "Qeydiyyat alınmadı: " + error.message);

    // Email təsdiqi aktivdirsə, sessiya hələ yoxdur
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      draft = {};
      view = { name: "login", area: "Hamısı", id: null };
      note = { text: "Emailinizə təsdiq linki göndərildi. Təsdiqlədikdən sonra daxil olun." };
      return render();
    }
  } else {
    const { error } = await sb.auth.signInWithPassword({ email, password: d.pass });
    if (error) return fail("Email və ya parol səhvdir.");
  }

  const { data: { session } } = await sb.auth.getSession();
  await loadMe(session);
  draft = {};
  view = { name: "list", area: "Hamısı", id: null };
  note = { text: "Xoş gəldiniz, " + ME + "!" };
  save(); render();
}

// ============ 7. HADİSƏLƏR ============
// Hər kəs hər şeyə yalnız bir dəfə səs verə bilər, öz yazısına verə bilməz
function vote(key, item, author) {
  if (author === ME) { note = { text: "Öz yazınıza səs verə bilməzsiniz.", bad: true }; return; }
  if (state.voted.includes(key)) { note = { text: "Artıq səs vermisiniz.", bad: true }; return; }
  state.voted.push(key); item.votes++; addPoints(author, 2);
}

function handle(e) {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const act = b.dataset.act, id = +b.dataset.id;
  const q = state.questions.find(x => x.id === id);

  // Parolu göstər/gizlət
  if (act === "pw") {
    const inp = b.parentElement.querySelector("input");
    inp.type = inp.type === "password" ? "text" : "password";
    b.textContent = inp.type === "password" ? "Göstər" : "Gizlət";
    return;
  }

  // Çıxış
  if (act === "logout") {
    const done = () => {
      ME = null; draft = {};
      view = { name: "list", area: "Hamısı", id: null };
      note = { text: "Çıxış etdiniz." };
      render();
    };
    if (sb) sb.auth.signOut().then(done); else done();
    return;
  }

  // Giriş tələb edən əməliyyatlar
  if ((["voteq", "votea", "accept"].includes(act) || (act === "go" && b.dataset.view === "new")) && !ME) {
    return askLogin();
  }

  if (act === "go") { draft = {}; view = { name: b.dataset.view, area: "Hamısı", id: null }; }
  else if (act === "area") view.area = b.dataset.area;
  else if (act === "open") view = { name: "detail", area: view.area, id };
  else if (act === "voteq" && q) vote("q" + id, q, q.author);
  else if (act === "votea" && q) { const a = q.answers.find(x => x.id === +b.dataset.aid); if (a) vote("a" + a.id, a, a.author); }
  else if (act === "accept" && q) {
    const a = q.answers.find(x => x.id === +b.dataset.aid);
    if (a) { a.accepted = true; addPoints(a.author, 15); note = { text: a.author + " +15 xal qazandı." }; }
  }
  save(); render();
}

app.addEventListener("click", handle);
document.querySelector("nav").addEventListener("click", handle);

app.addEventListener("submit", e => {
  e.preventDefault();
  const f = e.target, kind = f.dataset.form, d = Object.fromEntries(new FormData(f));
  const q = state.questions.find(x => x.id === +f.dataset.id);

  if (kind === "login" || kind === "register") return doAuth(kind, d);
  if (!ME) return askLogin();

  if (kind === "new") {
    const isCheck = d.type === "check";
    if (isCheck && !d.answer.trim()) { note = { text: "Tapşırıq üçün düzgün cavabı yazın.", bad: true }; view = { name: "new", area: "Hamısı", id: null }; return render(); }
    state.questions.unshift({ id: state.nextId++, type: d.type, area: d.area, author: ME, votes: 0,
      title: d.title.trim(), body: d.body.trim(), answers: [], answer: isCheck ? d.answer.trim() : undefined, pts: 20 });
    view = { name: "list", area: "Hamısı", id: null }; note = { text: "Sualınız yayımlandı." };
  } else if (kind === "answer" && q) {
    q.answers.push({ id: state.nextId++, author: ME, votes: 0, accepted: false, text: d.t.trim() });
    note = { text: "Cavabınız əlavə olundu." };
  } else if (kind === "check" && q) {
    if (norm(d.f) === norm(q.answer)) { state.solved.push(q.id); addPoints(ME, q.pts); note = { text: "Düzgün! +" + q.pts + " xal." }; }
    else note = { text: "Cavab düzgün deyil, bir də cəhd edin.", bad: true };
  }
  save(); render();
});

// ============ 8   . TEMA DƏYİŞDİRMƏ ============
const root = document.documentElement;
const themeBtn = document.getElementById("theme");

function setTheme(t) {
  root.dataset.theme = t;
  themeBtn.setAttribute("aria-label", t === "dark" ? "İşıqlı temaya keç" : "Qaranlıq temaya keç");
  try { localStorage.setItem("birge-theme", t); } catch (e) {}
}

let startTheme = "light";
try { startTheme = localStorage.getItem("birge-theme") || "light"; } catch (e) {}
setTheme(startTheme);

themeBtn.addEventListener("click", () => {
  setTheme(root.dataset.theme === "dark" ? "light" : "dark");
});

// ============ 9. BAŞLANĞIC ============
render();
initAuth();