const state = { products: [], quotes: [], cart: [], admins: [], authenticated: false, currentUser: null };
const money = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2 });
const $ = (selector) => document.querySelector(selector);

document.addEventListener('DOMContentLoaded', initialize);

async function initialize() {
  bindEvents();
  try {
    const session = await api('/api/sesion');
    await enterApplication(session.usuario);
  } catch {
    showLogin();
  }
}

async function enterApplication(user) {
  state.authenticated = true;
  state.currentUser = user;
  $('#session-user').textContent = user.correo;
  $('#login-screen').hidden = true;
  $('#app-shell').hidden = false;
  $('#quote-date').value = new Date().toISOString().slice(0, 10);
  await Promise.all([loadHealth(), loadProducts(), loadQuotes(), loadAdmins()]);
  renderCart();
}

function bindEvents() {
  $('#login-form').addEventListener('submit', login);
  $('#password-toggle').addEventListener('click', togglePasswordVisibility);
  $('#logout-button').addEventListener('click', logout);
  $('#guest-token-button').addEventListener('click', copyCatalogLink);
  $('#new-admin-button').addEventListener('click', openAdminModal);
  $('#add-admin-button').addEventListener('click', openAdminModal);
  $('#admin-form').addEventListener('submit', createAdmin);
  $('#profile-form').addEventListener('submit', updateProfile);
  $('#sidebar-toggle').addEventListener('click', toggleSidebar);
  $('#sidebar-backdrop').addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSidebar(); });
  document.querySelectorAll('[data-section]').forEach((button) => button.addEventListener('click', () => showSection(button.dataset.section)));
  document.querySelectorAll('[data-open-modal]').forEach((button) => button.addEventListener('click', () => openModal(button.dataset.openModal)));
  document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', () => closeModal(button.dataset.closeModal)));
  $('#product-search').addEventListener('input', renderProducts);
  $('#product-form').addEventListener('submit', saveProduct);
  $('#clear-cart').addEventListener('click', clearCart);
  $('#save-quote').addEventListener('click', saveQuote);
  $('#refresh-quotes').addEventListener('click', loadQuotes);
  $('#product-list').addEventListener('click', handleProductAction);
  $('#cart-body').addEventListener('click', handleCartAction);
  $('#quote-list').addEventListener('click', handleQuoteAction);
  $('#admin-table-body').addEventListener('click', handleAdminRowAction);
  $('#quote-preview-modal').addEventListener('click', (event) => { if (event.target === $('#quote-preview-modal')) $('#quote-preview-modal').close(); });
}

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const isOpen = sidebar.classList.toggle('open');
  const backdrop = $('#sidebar-backdrop');
  backdrop.classList.toggle('visible', isOpen);
  $('#sidebar-toggle').setAttribute('aria-expanded', String(isOpen));
}

function closeSidebar() {
  const sidebar = document.querySelector('.sidebar');
  sidebar.classList.remove('open');
  $('#sidebar-backdrop').classList.remove('visible');
  $('#sidebar-toggle').setAttribute('aria-expanded', 'false');
}

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const content = await response.json().catch(() => ({}));
  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && state.authenticated) showLogin('Tu sesión expiró. Ingresa nuevamente para continuar.');
    throw new Error(content.message || 'No se pudo completar la operación.');
  }
  return content;
}

async function login(event) {
  event.preventDefault();
  const button = $('#login-submit');
  const error = $('#login-error');
  button.disabled = true;
  error.classList.add('hidden');
  try {
    const session = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username: $('#login-email').value, password: $('#login-password').value }),
    });
    $('#login-password').value = '';
    await enterApplication(session.usuario);
  } catch (requestError) {
    error.textContent = requestError.message;
    error.classList.remove('hidden');
  } finally {
    button.disabled = false;
  }
}

function showLogin(message = '') {
  state.authenticated = false;
  state.currentUser = null;
  state.cart = [];
  $('#app-shell').hidden = true;
  $('#login-screen').hidden = false;
  const error = $('#login-error');
  error.textContent = message;
  error.classList.toggle('hidden', !message);
  setTimeout(() => $('#login-email').focus(), 0);
}

async function logout() {
  try { await api('/api/logout', { method: 'POST' }); } catch { /* La interfaz se cierra aunque la red falle. */ }
  showLogin();
}

function togglePasswordVisibility() {
  const password = $('#login-password');
  const visible = password.type === 'text';
  password.type = visible ? 'password' : 'text';
  $('#password-toggle').setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
}

function openAdminModal() {
  $('#admin-form').reset();
  $('#admin-modal').showModal();
}

async function createAdmin(event) {
  event.preventDefault();
  const name = $('#admin-name').value.trim();
  const email = $('#admin-email').value.trim();
  const password = $('#admin-password').value;
  const confirmation = $('#admin-password-confirm').value;

  if (!name) {
    notify('El nombre completo es obligatorio.', 'error');
    $('#admin-name').focus();
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    notify('Ingresa un correo electrónico válido.', 'error');
    $('#admin-email').focus();
    return;
  }
  if (password.length < 6) {
    notify('La contraseña debe tener al menos 6 caracteres.', 'error');
    $('#admin-password').focus();
    return;
  }
  if (password !== confirmation) {
    notify('Las contraseñas no coinciden.', 'error');
    $('#admin-password-confirm').focus();
    return;
  }

  const button = $('#admin-form .primary');
  button.disabled = true;
  try {
    const result = await api('/api/usuarios', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    closeModal('admin-modal');
    await loadAdmins();
    notify(result.mensaje || 'Administrador creado correctamente.', 'success');
  } catch (error) {
    notify(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

async function loadHealth() {
  try {
    const health = await api('/api/health');
    const badge = $('#connection-status');
    badge.className = `connection ${health.mode}`;
    badge.textContent = health.mode === 'mysql' ? `MySQL · ${health.database}` : 'Modo local · MySQL no disponible';
  } catch { $('#connection-status').textContent = 'Sin conexión'; }
}

async function loadProducts() {
  try { state.products = await api('/api/productos'); renderProducts(); renderCart(); } catch (error) { notify(error.message, 'error'); }
}

async function loadQuotes() {
  try { state.quotes = await api('/api/cotizaciones'); renderQuotes(); } catch (error) { notify(error.message, 'error'); }
}

async function loadAdmins() {
  if (!state.authenticated) return;
  try {
    const response = await api('/api/usuarios');
    state.admins = Array.isArray(response.usuarios) ? response.usuarios : [];
    renderAdmins();
  } catch (error) {
    notify(error.message, 'error');
  }
}

function maskEmail(email) {
  const raw = String(email || '').trim();
  if (!raw || !raw.includes('@')) return '—';
  const [local, domain] = raw.split('@');
  if (!local || !domain) return '—';
  if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function renderAdmins() {
  const currentUserId = Number(state.currentUser?.id || 0);
  $('#admin-count').textContent = String(state.admins.length);
  $('#admin-table-body').innerHTML = state.admins.map((user) => {
    const isOwnAccount = Number(user.id) === currentUserId;
    const displayEmail = isOwnAccount ? (user.correo || user.email || '—') : (String(user.correo || '').includes('***') ? user.correo : maskEmail(user.correo));
    return `
      <tr>
        <td>${escapeHtml(user.nombre || 'Administrador')}</td>
        <td>${escapeHtml(displayEmail || '—')}</td>
        <td>${escapeHtml(user.rol || 'Administrador')}</td>
        <td>${escapeHtml(formatDate(user.creado_en || user.creadoEn || new Date().toISOString()))}</td>
        <td>
          ${isOwnAccount ? `<button class="small-button" data-action="profile" data-id="${user.id}">Mi perfil</button>` : ''}
        </td>
      </tr>`;
  }).join('');
}

function handleAdminRowAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  if (button.dataset.action === 'profile') {
    const admin = state.admins.find((user) => Number(user.id) === Number(button.dataset.id));
    if (!admin) return;
    openProfileModal(admin);
  }
}

function openProfileModal(admin) {
  if (!state.currentUser || Number(admin.id) !== Number(state.currentUser.id)) return;
  $('#profile-name').value = admin.nombre || '';
  $('#profile-email').value = admin.correo || '';
  $('#profile-password').value = '';
  $('#profile-password-confirm').value = '';
  $('#profile-form').dataset.userId = String(admin.id);
  $('#profile-modal').showModal();
}

async function updateProfile(event) {
  event.preventDefault();
  const userId = Number($('#profile-form').dataset.userId || state.currentUser?.id || 0);
  const name = $('#profile-name').value.trim();
  const email = $('#profile-email').value.trim();
  const password = $('#profile-password').value.trim();
  const confirmation = $('#profile-password-confirm').value.trim();

  if (!name) { notify('El nombre completo es obligatorio.', 'error'); return; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { notify('Ingresa un correo válido.', 'error'); return; }
  if (password && password.length < 6) { notify('La contraseña debe tener al menos 6 caracteres.', 'error'); return; }
  if (password && password !== confirmation) { notify('Las contraseñas no coinciden.', 'error'); return; }

  try {
    const payload = { name, email, password: password || undefined };
    const updated = await api(`/api/usuarios/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    state.currentUser = { ...state.currentUser, correo: updated.usuario.correo };
    $('#session-user').textContent = updated.usuario.correo;
    closeModal('profile-modal');
    await loadAdmins();
    notify(updated.mensaje || 'Perfil actualizado.', 'success');
  } catch (error) {
    notify(error.message, 'error');
  }
}

function showSection(section) {
  document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view.id === section));
  document.querySelectorAll('.nav-link').forEach((link) => link.classList.toggle('active', link.dataset.section === section));
  if (section === 'historial') loadQuotes();
  if (section === 'administradores') loadAdmins();
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openModal(modalId) {
  if (modalId === 'product-modal') $('#product-form').reset();
  const modal = $(`#${modalId}`);
  if (!modal.open) modal.showModal();
}

function closeModal(modalId) { const modal = $(`#${modalId}`); if (modal.open) modal.close(); }

function renderProducts() {
  const query = $('#product-search').value.trim().toLocaleLowerCase();
  const products = state.products.filter((product) => `${product.nombre} ${product.descripcion || ''}`.toLocaleLowerCase().includes(query));
  $('#product-total').textContent = `${products.length} de ${state.products.length} productos`;
  $('#product-list').innerHTML = products.map((product) => `
    <article class="product-card">
      <h2>${escapeHtml(product.nombre)}</h2>
      <p>${escapeHtml(product.descripcion || 'Sin descripción.')}</p>
      <div class="product-bottom"><strong class="price">${formatMoney(product.precio)}</strong>
        <div class="card-actions"><button class="small-button add" data-action="add" data-id="${product.id}">Agregar</button><button class="small-button danger" data-action="delete" data-id="${product.id}" title="Eliminar producto">Eliminar</button></div>
      </div>
    </article>`).join('');
  $('#product-empty').classList.toggle('hidden', products.length > 0);
}

async function handleProductAction(event) {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const id = Number(button.dataset.id); const product = state.products.find((item) => item.id === id); if (!product) return;
  if (button.dataset.action === 'add') { addToCart(product); return; }
  if (button.dataset.action === 'delete') {
    if (!confirm(`¿Eliminar “${product.nombre}” del catálogo?`)) return;
    try { await api(`/api/productos/${id}`, { method: 'DELETE' }); state.cart = state.cart.filter((item) => item.productoId !== id); await loadProducts(); notify('Producto eliminado.', 'success'); }
    catch (error) { notify(error.message, 'error'); }
  }
}

async function saveProduct(event) {
  event.preventDefault();
  const button = $('#product-form .primary'); button.disabled = true;
  try {
    await api('/api/productos', { method: 'POST', body: JSON.stringify({ nombre: $('#product-name').value, descripcion: $('#product-description').value, precio: $('#product-price').value }) });
    closeModal('product-modal'); await loadProducts(); notify('Producto agregado al catálogo.', 'success');
  } catch (error) { notify(error.message, 'error'); } finally { button.disabled = false; }
}

function addToCart(product) {
  const found = state.cart.find((item) => item.productoId === product.id);
  if (found) found.cantidad += 1;
  else state.cart.push({ productoId: product.id, nombre: product.nombre, precio: Number(product.precio), cantidad: 1 });
  renderCart(); notify(`${product.nombre} agregado.`, 'success');
}

function renderCart() {
  const totalItems = state.cart.reduce((total, item) => total + item.cantidad, 0);
  const total = state.cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  $('#cart-count').textContent = totalItems;
  $('#item-total').textContent = `${totalItems} artículo${totalItems === 1 ? '' : 's'}`;
  $('#quote-total').textContent = formatMoney(total);
  $('#cart-body').innerHTML = state.cart.map((item) => `<tr><td><span class="cart-product">${escapeHtml(item.nombre)}</span></td><td class="center"><div class="quantity-control"><button data-action="decrease" data-id="${item.productoId}">−</button><span>${item.cantidad}</span><button data-action="increase" data-id="${item.productoId}">+</button></div></td><td class="right">${formatMoney(item.precio)}</td><td class="right"><strong>${formatMoney(item.precio * item.cantidad)}</strong></td><td class="right"><button class="remove-item" data-action="remove" data-id="${item.productoId}">Quitar</button></td></tr>`).join('');
  $('#cart-empty').classList.toggle('hidden', state.cart.length > 0);
}

function handleCartAction(event) {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const id = Number(button.dataset.id); const item = state.cart.find((entry) => entry.productoId === id); if (!item) return;
  if (button.dataset.action === 'increase') item.cantidad += 1;
  if (button.dataset.action === 'decrease') item.cantidad -= 1;
  if (button.dataset.action === 'remove' || item.cantidad < 1) state.cart = state.cart.filter((entry) => entry.productoId !== id);
  renderCart();
}

function clearCart() {
  if (!state.cart.length) return;
  if (!confirm('¿Vaciar los productos de esta cotización?')) return;
  state.cart = []; renderCart();
}

async function ensureQuoteClientId(nombreCliente) {
  const safeName = nombreCliente.trim() || 'Cliente general';
  try {
    const clientes = await api('/api/clientes');
    const existente = clientes.find((cliente) => cliente.nombre.toLowerCase() === safeName.toLowerCase());
    if (existente) return existente.id;
  } catch {
    // Si no se puede listar, se crea directamente.
  }

  const creado = await api('/api/clientes', {
    method: 'POST',
    body: JSON.stringify({ nombre: safeName, telefono: '', correo: '', direccion: '' }),
  });
  return creado.id;
}

async function saveQuote() {
  const button = $('#save-quote'); button.disabled = true;
  try {
    const nombreCliente = $('#quote-client-name').value.trim() || 'Cliente general';
    const clienteId = await ensureQuoteClientId(nombreCliente);
    const quote = await api('/api/cotizaciones', { method: 'POST', body: JSON.stringify({ clienteId, fechaCotizacion: $('#quote-date').value, estado: $('#quote-status').value, notas: $('#quote-notes').value, items: state.cart.map((item) => ({ productoId: item.productoId, cantidad: item.cantidad })) }) });
    state.cart = []; $('#quote-notes').value = ''; $('#quote-status').value = 'Borrador'; $('#quote-client-name').value = nombreCliente; renderCart(); await loadQuotes(); notify(`Cotización ${quote.codigoCotizacion} guardada.`, 'success'); openQuotePreview(quote);
  } catch (error) { notify(error.message, 'error'); } finally { button.disabled = false; }
}

function renderQuotes() {
  $('#quote-list').innerHTML = state.quotes.map((quote) => `<article class="history-card"><div><div class="history-code">${escapeHtml(quote.codigoCotizacion)}</div><h2>${escapeHtml(quote.clienteNombre)}</h2><div class="history-meta">${formatDate(quote.fechaCotizacion)} · ${quote.items.length} artículo${quote.items.length === 1 ? '' : 's'}${quote.notas ? ` · ${escapeHtml(truncate(quote.notas, 65))}` : ''}</div></div><div class="history-right"><span class="status ${escapeHtml(quote.estado)}">${escapeHtml(quote.estado)}</span><strong class="history-total">${formatMoney(quote.total)}</strong><div class="history-actions"><button class="small-button" data-action="preview" data-id="${quote.id}">Ver / imprimir</button><button class="small-button danger" data-action="delete" data-id="${quote.id}">Eliminar</button></div></div></article>`).join('');
  $('#quote-empty').classList.toggle('hidden', state.quotes.length > 0);
}

async function handleQuoteAction(event) {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const quote = state.quotes.find((item) => item.id === Number(button.dataset.id)); if (!quote) return;
  if (button.dataset.action === 'preview') return openQuotePreview(quote);
  if (button.dataset.action === 'delete') {
    if (!confirm(`¿Eliminar la cotización ${quote.codigoCotizacion}?`)) return;
    try { await api(`/api/cotizaciones/${quote.id}`, { method: 'DELETE' }); await loadQuotes(); notify('Cotización eliminada.', 'success'); } catch (error) { notify(error.message, 'error'); }
  }
}

function openQuotePreview(quote) {
  $('#quote-preview').innerHTML = `<div class="preview-top"><div><div class="preview-brand">TECNISOLUCIONES</div><span>Soluciones tecnológicas · Cotización comercial</span></div><div class="preview-code">${escapeHtml(quote.codigoCotizacion)}<br><small>${escapeHtml(quote.estado)}</small></div></div><div class="preview-client"><div><span class="preview-label">Cliente</span><strong>${escapeHtml(quote.clienteNombre)}</strong><br><span>${escapeHtml(quote.clienteTelefono || '')}</span></div><div><span class="preview-label">Fecha</span><strong>${formatDate(quote.fechaCotizacion)}</strong></div></div><table class="preview-items"><thead><tr><th>Producto</th><th class="center">Cant.</th><th class="right">Precio</th><th class="right">Subtotal</th></tr></thead><tbody>${quote.items.map((item) => `<tr><td>${escapeHtml(item.nombre)}</td><td class="center">${item.cantidad}</td><td class="right">${formatMoney(item.precioUnitario)}</td><td class="right">${formatMoney(item.subtotal)}</td></tr>`).join('')}</tbody></table><div class="preview-total">Total: ${formatMoney(quote.total)}</div>${quote.notas ? `<div class="preview-notes"><strong>Notas</strong><br>${escapeHtml(quote.notas)}</div>` : ''}<div class="preview-actions"><button class="button secondary" id="close-preview">Cerrar</button><button class="button primary" id="print-quote">Imprimir / Guardar PDF</button></div>`;
  const modal = $('#quote-preview-modal'); if (!modal.open) modal.showModal();
  $('#close-preview').addEventListener('click', () => modal.close()); $('#print-quote').addEventListener('click', () => window.print());
}

async function copyCatalogLink() {
  const catalogUrl = `${window.location.origin}/catalogo.html`;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(catalogUrl);
    } else {
      const helper = document.createElement('textarea');
      helper.value = catalogUrl;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.top = '-9999px';
      document.body.appendChild(helper);
      helper.select();
      document.execCommand('copy');
      document.body.removeChild(helper);
    }
    notify('Enlace del catálogo copiado al portapapeles.', 'success');
  } catch (error) {
    notify('No se pudo copiar el enlace del catálogo.', 'error');
  }
}

function formatMoney(value) { return money.format(Number(value) || 0).replace('GTQ', 'Q'); }
function formatDate(value) { if (!value) return 'Sin fecha'; const [year, month, day] = String(value).slice(0, 10).split('-'); return new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(Number(year), Number(month) - 1, Number(day))); }
function truncate(value, max) { return value.length > max ? `${value.slice(0, max - 1)}…` : value; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }
let toastTimer;
function notify(message, type = 'success') { const toast = $('#toast'); toast.textContent = message; toast.className = `toast ${type} show`; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3800); }
