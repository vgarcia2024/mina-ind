import { formatoMoneda, formatoFechaCorta, rangoDeFechas, el } from './utils.js';
import { cargarVentas } from './ventas.js';
import { cargarGastos } from './gastos.js';
import { cargarCompras } from './compras.js';
import { getPrendas } from './prendas.js';

let filtroActual = 'mes';

function renderFiltros() {
  const cont = document.getElementById('filtros-movimientos');
  const opciones = [
    { valor: 'hoy', label: 'Hoy' },
    { valor: 'semana', label: 'Esta semana' },
    { valor: 'mes', label: 'Este mes' },
    { valor: 'todo', label: 'Todo' },
    { valor: 'personalizado', label: 'Elegir fechas' },
  ];
  cont.innerHTML = '';
  for (const op of opciones) {
    cont.appendChild(el('button', {
      class: `chip ${filtroActual === op.valor ? 'activo' : ''}`,
      onclick: () => {
        filtroActual = op.valor;
        document.getElementById('filtros-personalizado-movimientos').classList.toggle('oculto', op.valor !== 'personalizado');
        renderFiltros();
        if (op.valor !== 'personalizado') actualizarMovimientos();
      },
    }, op.label));
  }
}

export function initMovimientosFiltros() {
  renderFiltros();
  ['mov-fecha-desde', 'mov-fecha-hasta'].forEach((id) => {
    document.getElementById(id).addEventListener('change', () => {
      if (filtroActual === 'personalizado') actualizarMovimientos();
    });
  });
}

export async function actualizarMovimientos() {
  const desdeManual = document.getElementById('mov-fecha-desde').value;
  const hastaManual = document.getElementById('mov-fecha-hasta').value;
  const { desde, hasta } = rangoDeFechas(filtroActual, desdeManual, hastaManual);

  const [ventas, gastos, compras] = await Promise.all([
    cargarVentas({ desde, hasta }),
    cargarGastos({ desde, hasta }),
    cargarCompras({ desde, hasta }),
  ]);

  const items = [
    ...ventas.map((v) => ({ tipo: 'venta', fecha: v.fecha, ts: v.created_at, data: v })),
    ...gastos.map((g) => ({ tipo: 'gasto', fecha: g.fecha, ts: g.created_at, data: g })),
    ...compras.map((c) => ({ tipo: 'compra', fecha: c.fecha, ts: c.created_at, data: c })),
  ].sort((a, b) => (a.fecha === b.fecha ? new Date(b.ts) - new Date(a.ts) : b.fecha.localeCompare(a.fecha)));

  const cont = document.getElementById('lista-movimientos');
  cont.innerHTML = '';

  if (!items.length) {
    cont.appendChild(el('div', { class: 'vacio' }, 'No hay movimientos en este período.'));
    return;
  }

  for (const item of items) {
    cont.appendChild(renderFilaMovimiento(item));
  }
}

function renderFilaMovimiento({ tipo, data }) {
  if (tipo === 'venta') {
    return el('div', { class: 'fila-item' }, [
      el('div', { class: 'fila-item__icono fila-item__icono--venta' }, '💰'),
      el('div', { class: 'fila-item__cuerpo' }, [
        el('div', { class: 'fila-item__titulo' }, `Venta · ${data.prenda_nombre} × ${data.cantidad}`),
        el('div', { class: 'fila-item__detalle' }, `${formatoFechaCorta(data.fecha)} · ${data.medio_pago}`),
      ]),
      el('div', { class: 'fila-item__monto fila-item__monto--pos' }, `+${formatoMoneda(data.total)}`),
    ]);
  }
  if (tipo === 'gasto') {
    return el('div', { class: 'fila-item' }, [
      el('div', { class: 'fila-item__icono fila-item__icono--gasto' }, '💸'),
      el('div', { class: 'fila-item__cuerpo' }, [
        el('div', { class: 'fila-item__titulo' }, `Gasto · ${data.descripcion}`),
        el('div', { class: 'fila-item__detalle' }, `${formatoFechaCorta(data.fecha)} · ${data.categoria}`),
      ]),
      el('div', { class: 'fila-item__monto fila-item__monto--neg' }, `-${formatoMoneda(data.monto)}`),
    ]);
  }
  const nombrePrenda = getPrendas().find((p) => p.id === data.prenda_id)?.nombre || '(prenda eliminada)';
  return el('div', { class: 'fila-item' }, [
    el('div', { class: 'fila-item__icono fila-item__icono--compra' }, '📦'),
    el('div', { class: 'fila-item__cuerpo' }, [
      el('div', { class: 'fila-item__titulo' }, `Compra · ${nombrePrenda} × ${data.cantidad}`),
      el('div', { class: 'fila-item__detalle' }, `${formatoFechaCorta(data.fecha)}${data.proveedor ? ' · ' + data.proveedor : ''}`),
    ]),
    el('div', { class: 'fila-item__monto fila-item__monto--neg' }, `-${formatoMoneda(data.costo_total)}`),
  ]);
}
