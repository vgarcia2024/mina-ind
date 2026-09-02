// ============================================
// Utilidades compartidas
// ============================================

export function formatoMoneda(valor) {
  const n = Number(valor) || 0;
  return n.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatoNumero(valor) {
  return (Number(valor) || 0).toLocaleString('es-AR');
}

// Construye YYYY-MM-DD en horario local (evita corrimientos por UTC)
export function fechaLocalISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatoFechaCorta(fechaISO) {
  const [y, m, d] = fechaISO.split('-');
  return `${d}/${m}/${y}`;
}

// Devuelve { desde, hasta } en formato YYYY-MM-DD según el filtro elegido
export function rangoDeFechas(filtro, desdeManual, hastaManual) {
  const hoy = new Date();
  let desde, hasta;

  switch (filtro) {
    case 'hoy':
      desde = hasta = fechaLocalISO(hoy);
      break;
    case 'semana': {
      const diaSemana = (hoy.getDay() + 6) % 7; // lunes = 0
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - diaSemana);
      desde = fechaLocalISO(lunes);
      hasta = fechaLocalISO(hoy);
      break;
    }
    case 'mes': {
      const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      desde = fechaLocalISO(primerDia);
      hasta = fechaLocalISO(hoy);
      break;
    }
    case 'personalizado':
      desde = desdeManual;
      hasta = hastaManual;
      break;
    default: // 'todo'
      desde = null;
      hasta = null;
  }
  return { desde, hasta };
}

export function calcularCostoTotalPrenda(p) {
  const precioCompra = Number(p.precio_compra) || 0;
  const bolsa = Number(p.costo_bolsa) || 0;
  const etiqueta = Number(p.costo_etiqueta) || 0;
  const otros = Number(p.costo_otros) || 0;
  return precioCompra + bolsa + etiqueta + otros;
}

export function calcularGanancia(costoTotal, precioVenta) {
  return (Number(precioVenta) || 0) - (Number(costoTotal) || 0);
}

export function calcularMargen(costoTotal, precioVenta) {
  const pv = Number(precioVenta) || 0;
  if (pv <= 0) return 0;
  return ((pv - (Number(costoTotal) || 0)) / pv) * 100;
}

export function toast(mensaje, tipo = 'ok') {
  const cont = document.getElementById('toast-container');
  if (!cont) return;
  const el = document.createElement('div');
  el.className = `toast toast--${tipo}`;
  el.textContent = mensaje;
  cont.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast--visible'));
  setTimeout(() => {
    el.classList.remove('toast--visible');
    setTimeout(() => el.remove(), 250);
  }, 2800);
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}
