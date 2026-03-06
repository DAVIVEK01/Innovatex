// ============================================================
//  CampusEats — utils.js  (frontend shared utilities)
// ============================================================

/* ── Toast ── */
let _toastTimer;
function showToast(msg, type = '') {
  const el = document.getElementById('toastEl');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast' + (type ? ' ' + type : '');
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

/* ── Navbar injection (student) ── */
function injectNavbar(activePage) {
  const user  = Auth.getUser();
  const name  = user ? user.name.split(' ')[0] : 'Student';
  const count = Cart.count();

  document.getElementById('navContainer').innerHTML = `
    <nav class="navbar">
      <a href="/menu.html" class="nav-logo">Campus<span>Eats</span></a>
      <div class="nav-links">
        <a href="/menu.html"  class="nav-link ${activePage==='menu' ?'active':''}">🍽️ Menu</a>
        <a href="/cart.html"  class="nav-link ${activePage==='cart' ?'active':''}">🛒 Cart</a>
        <a href="/track.html" class="nav-link ${activePage==='track'?'active':''}">📍 Track Order</a>
      </div>
      <div class="nav-right">
        <div id="navCanteenBadge" style="display:none;background:var(--red-light);border:1.5px solid #f5c0bb;color:var(--red);padding:.25rem .75rem;border-radius:999px;font-size:.75rem;font-weight:700;align-items:center;gap:.35rem;">
          <span style="width:7px;height:7px;border-radius:50%;background:var(--red);display:inline-block;flex-shrink:0;"></span>
          Closed
        </div>
        <span class="nav-user-name">Hi, ${name}!</span>
        <a href="/cart.html" class="nav-cart-btn">
          🛒 Cart <div class="nav-cart-count" id="navCartCount">${count}</div>
        </a>
        <div class="nav-avatar" onclick="signOut()" title="Sign Out">🎓</div>
      </div>
    </nav>`;
}

/* ── Toggle the "Closed" badge in the navbar ── */
function setNavCanteenStatus(isOpen) {
  const el = document.getElementById('navCanteenBadge');
  if (!el) return;
  el.style.display = isOpen ? 'none' : 'flex';
}

function updateNavCartCount() {
  const el = document.getElementById('navCartCount');
  if (el) el.textContent = Cart.count();
}

/* ── Sign out ── */
function signOut() {
  if (confirm('Sign out of CampusEats?')) {
    Auth.clear();
    Cart.clear();
    disconnectSocket();
    window.location.href = '/index.html';
  }
}

/* ── Format helpers ── */
function fmtTime(date) {
  if (typeof date === 'string') date = new Date(date);
  if (typeof date === 'number') date = new Date(date * 1000);
  return date.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
}

function fmtPrice(n) { return '₹' + n; }

function elapsedMin(placedAt) {
  const ms = placedAt > 1e10 ? placedAt : placedAt * 1000;
  return Math.max(0, Math.floor((Date.now() - ms) / 60000));
}

function getMealGreeting() {
  const h = new Date().getHours();
  return h < 11 ? 'Morning' : h < 15 ? 'Afternoon' : 'Evening';
}

/* ── Estimate queue wait ── */
function estimateQueueWait(queueLength) {
  return queueLength * 3;
}

function estimatePickupTime(queueAheadCount, maxPrepTime) {
  const totalMin = maxPrepTime + estimateQueueWait(queueAheadCount);
  const t = new Date(Date.now() + totalMin * 60000);
  return fmtTime(t);
}