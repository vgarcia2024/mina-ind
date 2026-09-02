import { fechaLocalISO, formatoFechaCorta } from './utils.js';
import { cargarPrendas, renderGridPrendas, initPrendas } from './prendas.js';
import { cargarVentas, renderListaVentas, initVentas } from './ventas.js';
import { cargarGastos, renderListaGastos, initGastos } from './gastos.js';
import { cargarCompras, renderListaCompras, initCompras } from './compras.js';
import { initDashboardFiltros, actualizarPanel } from './dashboard.js';
import { initMovimientosFiltros, actualizarMovimientos } from './movimientos.js';

// ---------------- Navegación entre secciones ----------------
function irASeccion(nombre) {
  document.querySelectorAll('.seccion').forEach((s) => s.classList.remove('activa'));
  document.getElementById(`seccion-${nombre}`).classList.add('activa');

  document.querySelectorAll('.bottomnav__item').forEach((b) => b.classList.remove('activo'));
  document.querySelector(`.bottomnav__item[data-seccion="${nombre}"]`).classList.add('activo');

  window.scrollTo({ top: 0 });
}

document.querySelectorAll('.bottomnav__item').forEach((btn) => {
  btn.addEventListener('click', () => irASeccion(btn.dataset.seccion));
});

document.getElementById('fecha-hoy').textContent = formatoFechaCorta(fechaLocalISO());

// ---------------- Refresco general de datos ----------------
async function refrescarTodo() {
  await Promise.all([
    actualizarPanel(),
    (async () => renderListaVentas(await cargarVentas()))(),
    (async () => renderListaGastos(await cargarGastos()))(),
    (async () => renderListaCompras(await cargarCompras()))(),
    actualizarMovimientos(),
  ]);
}

document.addEventListener('mina:datos-cambiaron', refrescarTodo);

// ---------------- Inicialización ----------------
async function iniciar() {
  initDashboardFiltros();
  initMovimientosFiltros();
  initPrendas({ onCambio: refrescarTodo });
  initVentas({ onCambio: refrescarTodo });
  initGastos({ onCambio: refrescarTodo });
  initCompras({ onCambio: refrescarTodo });

  await cargarPrendas();
  renderGridPrendas();
  document.dispatchEvent(new CustomEvent('mina:prendas-actualizadas'));

  await refrescarTodo();
}

iniciar();
