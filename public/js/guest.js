const state = { products: [], cart: [], token: null, expiraEn: null };
const money = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2 });
const $ = (selector) => document.querySelector(selector);

document.addEventListener('DOMContentLoaded', initialize);

async function initialize() {
  bindEvents();
  
  // Obtener token de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (!token) {
    showError('Acceso no autorizado. Se requiere un token válido.');
    return;
  }
  
  state.token = token;
  
  // Validar token
  try {
    const validation = await api(`/api/guest/validar?token=${token}`);
    if (validation.valido) {
      state.expiraEn = validation.expiraEn;
      mostrarExpiracion(validation.expiraEn);
      await loadProducts();
    }
  } catch (error) {
    showError('Token inválido o expirado. Solicita un nuevo enlace de acceso.');
  }
}

function bindEvents() {
  $('#toggle-cart').addEventListener('click', toggleCart);
  $('#close-cart').addEventListener('click', () => $('#guest-cart-panel').classList.remove('open'));
  $('#clear-cart-guest').addEventListener('click', clearCart);
  $('#clear-cart-btn').addEventListener('click', clearCart);
  $('#scroll-to-contact').addEventListener('click', () => {
    $('#guest-cart-panel').classList.remove('open');
    $('#contact-section').scrollIntoView({ behavior: 'smooth' });
  });
  $('#product-search-guest').addEventListener('input', renderProducts);
  $('#product-list-guest').addEventListener('click', handleProductAction);
  $('#guest-quote-form').addEventListener('submit', submitGuestQuote);
  $('#close-success-modal').addEventListener('click', () => $('#quote-success-modal').close());
  $('#quote-success-modal').addEventListener('click', (event) => {
    if (event.target === $('#quote-success-modal')) $('#quote-success-modal').close();
  });
}

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const content = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(content.message || 'No se pudo completar la operación.');
  }
  return content;
}

function showError(message) {
  document.body.innerHTML = `
    <div style="min-height:100vh;display:grid;place-items:center;background:#f6f9fc;padding:24px;">
      <div style="max-width:480px;text-align:center;padding:32px;background:#fff;border-radius:16px;box-shadow:0 14px 40px rgba(17,48,86,.08);">
        <div style="font-size:48px;color:#c93838;margin-bottom:16px;">!</div>
        <h1 style="color:#10233f;margin:0 0 12px;font-size:24px;">Acceso Restringido</h1>
        <p style="color:#64748b;margin:0 0 24px;">${escapeHtml(message)}</p>
        <a href="/" style="display:inline-block;padding:12px 24px;background:#0b65ce;color:#fff;text-decoration:none;border-radius:10px;font-weight:750;">Ir al inicio</a>
      </div>
    </div>
  `;
}

function mostrarExpiracion(fechaISO) {
  const fecha = new Date(fechaISO);
  const opciones = { day: '2-digit', month: 'long', year: 'numeric' };
  const fechaFormateada = fecha.toLocaleDateString('es-GT', opciones);
  $('#guest-expiry').textContent = `Válido hasta: ${fechaFormateada}`;
}

async function loadProducts() {
  try {
    state.products = await api('/api/productos');
    renderProducts();
    renderCart();
  } catch (error) {
    notify('Error al cargar productos.', 'error');
  }
}

function renderProducts() {
  const query = $('#product-search-guest').value.trim().toLocaleLowerCase();
  const products = state.products.filter((product) => 
    `${product.nombre} ${product.descripcion || ''}`.toLocaleLowerCase().includes(query)
  );
  
  $('#product-total-guest').textContent = `${products.length} de ${state.products.length} productos`;
  
  $('#product-list-guest').innerHTML = products.map((product) => `
    <article class="product-card">
      <div class="product-chip-row">
        <span class="product-code">${escapeHtml(product.codigo || 'SIN-CÓDIGO')}</span>
        <span class="product-type">${escapeHtml(product.tipo || 'Producto')}</span>
      </div>
      <h2>${escapeHtml(product.nombre)}</h2>
      <p>${escapeHtml(product.descripcion || 'Sin descripción.')}</p>
      <p style="font-size: 13px; color: #64748b; margin-bottom: 8px; font-weight: 600;">
        ${product.tipo === 'Servicio' ? 'Stock: N/A' : `Stock: ${product.stock !== undefined ? product.stock : 0}`}
      </p>
      <div class="product-bottom">
        <strong class="price">${formatMoney(product.precio)}</strong>
        <div class="card-actions">
          <button class="small-button add" data-action="add" data-id="${product.id}">Agregar</button>
        </div>
      </div>
    </article>
  `).join('');
  
  $('#product-empty-guest').classList.toggle('hidden', products.length > 0);
}

function handleProductAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  
  const id = Number(button.dataset.id);
  const product = state.products.find((item) => item.id === id);
  if (!product) return;
  
  if (button.dataset.action === 'add') {
    addToCart(product);
  }
}

function addToCart(product) {
  const found = state.cart.find((item) => item.productoId === product.id);
  if (found) {
    found.cantidad += 1;
  } else {
    state.cart.push({
      productoId: product.id,
      nombre: product.nombre,
      precio: Number(product.precio),
      cantidad: 1
    });
  }
  renderCart();
  notify(`${product.nombre} agregado.`, 'success');
  
  // Abrir carrito automáticamente al agregar
  $('#guest-cart-panel').classList.add('open');
}

function renderCart() {
  const totalItems = state.cart.reduce((total, item) => total + item.cantidad, 0);
  const total = state.cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  
  $('#cart-count-guest').textContent = totalItems;
  $('#cart-badge').textContent = totalItems;
  $('#cart-badge').classList.toggle('hidden', totalItems === 0);
  $('#cart-total-guest').textContent = formatMoney(total);
  
  if (state.cart.length === 0) {
    $('#cart-items-guest').innerHTML = `
      <div class="empty-cart" id="cart-empty-guest">
        <div class="empty-cart-icon">+</div>
        <strong>Tu carrito está vacío</strong>
        <p>Agrega productos del catálogo para comenzar tu cotización.</p>
      </div>
    `;
  } else {
    $('#cart-items-guest').innerHTML = state.cart.map((item) => `
      <div class="cart-item">
        <div>
          <div class="cart-item-name">${escapeHtml(item.nombre)}</div>
        </div>
        <div class="cart-item-controls">
          <button class="small-button" data-action="decrease" data-id="${item.productoId}">−</button>
          <span style="min-width:24px;text-align:center;font-weight:800;">${item.cantidad}</span>
          <button class="small-button" data-action="increase" data-id="${item.productoId}">+</button>
        </div>
      </div>
    `).join('');
    
    // Re-bind events for cart controls
    $('#cart-items-guest').addEventListener('click', handleCartAction);
  }
}

function handleCartAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  
  const id = Number(button.dataset.id);
  const item = state.cart.find((entry) => entry.productoId === id);
  if (!item) return;
  
  if (button.dataset.action === 'increase') {
    item.cantidad += 1;
  }
  if (button.dataset.action === 'decrease') {
    item.cantidad -= 1;
    if (item.cantidad < 1) {
      state.cart = state.cart.filter((entry) => entry.productoId !== id);
    }
  }
  renderCart();
}

function clearCart() {
  if (!state.cart.length) return;
  if (!confirm('¿Vaciar los productos de este carrito?')) return;
  state.cart = [];
  renderCart();
  notify('Carrito limpiado.', 'success');
}

function toggleCart() {
  $('#guest-cart-panel').classList.toggle('open');
}

async function submitGuestQuote(event) {
  event.preventDefault();
  
  if (state.cart.length === 0) {
    notify('Agrega productos al carrito antes de enviar la solicitud.', 'error');
    return;
  }
  
  // 1. GUARDAR EN EL HISTORIAL (Con corrección del ID)
  const name = $('#guest-client-name')?.value;
  const quoteData = {
    clienteNombre: `Solicitud Web - ${name || 'Cliente'}`,
    clienteTelefono: $('#guest-client-phone')?.value || '',
    clienteEmail: $('#guest-client-email')?.value || '',
    clienteDireccion: $('#guest-client-address')?.value || '',
    notas: $('#guest-quote-notes')?.value || '',
    items: state.cart.map((item) => ({
      // Corrección crítica: tu carrito usa item.id, no item.productoId
      productoId: item.id || item.productoId, 
      cantidad: item.cantidad
    })),
    token: state.token || null
  };
  
  try {
    const response = await fetch('/api/cotizaciones/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quoteData)
    });
    
    // 2. ESCUCHAR AL SERVIDOR: Si falla, detenemos el proceso
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Faltan datos o token inválido.');
    }
    
    // 3. SOLO SI SE GUARDÓ EN EL HISTORIAL, ABRIMOS WHATSAPP
    const total = state.cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    let mensaje = "Hola, me interesa solicitar la siguiente cotización:\n\n";

    state.cart.forEach(item => {
      const subtotal = item.precio * item.cantidad;
      mensaje += `- ${item.cantidad}x ${item.nombre} - ${formatMoney(subtotal)}\n`;
    });
    
    mensaje += `\nTotal: ${formatMoney(total)}`;

    const urlWhatsApp = `https://wa.me/50249397276?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, '_blank');

    // 4. Limpieza de UI
    if ($('#quote-success-modal')) $('#quote-success-modal').showModal();
    notify('Cotización procesada exitosamente.', 'success');
    
    state.cart = [];
    renderCart();
    event.target.reset();
    
  } catch (error) {
    // AHORA EL ERROR APARECERÁ EN LA PANTALLA DE TU PÁGINA
    notify(error.message, 'error');
    console.error("Fallo de registro:", error);
  }
}

function formatMoney(value) {
  return money.format(Number(value) || 0).replace('GTQ', 'Q');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[char]);
}

let toastTimer;
function notify(message, type = 'success') {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = 'toast';
  }, 3800);
}
