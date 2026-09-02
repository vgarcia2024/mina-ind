import { formatoMoneda, rangoDeFechas, el } from './utils.js';
import { cargarVentas } from './ventas.js';
import { cargarGastos } from './gastos.js';
import { cargarCompras } from './compras.js';
import { getPrendas } from './prendas.js';

let filtroActual = 'mes';

function renderFiltros() {
  const cont = document.getElementById('filtros-panel');
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
        document.getElementById('filtros-personalizado-panel').classList.toggle('oculto', op.valor !== 'personalizado');
        renderFiltros();
        if (op.valor !== 'personalizado') actualizarPanel();
      },
    }, op.label));
  }
}

export function initDashboardFiltros() {
  renderFiltros();
  ['panel-fecha-desde', 'panel-fecha-hasta'].forEach((id) => {
    document.getElementById(id).addEventListener('change', () => {
      if (filtroActual === 'personalizado') actualizarPanel();
    });
  });
}

export async function actualizarPanel() {
  const desdeManual = document.getElementById('panel-fecha-desde').value;
  const hastaManual = document.getElementById('panel-fecha-hasta').value;
  const { desde, hasta } = rangoDeFechas(filtroActual, desdeManual, hastaManual);

  const [ventas, gastos, compras] = await Promise.all([
    cargarVentas({ desde, hasta }),
    cargarGastos({ desde, hasta }),
    cargarCompras({ desde, hasta }),
  ]);

  const ingresos = ventas.reduce((acc, v) => acc + Number(v.total), 0);
  const gananciaVentas = ventas.reduce((acc, v) => acc + Number(v.ganancia), 0);
  const totalGastos = gastos.reduce((acc, g) => acc + Number(g.monto), 0);
  const totalCompras = compras.reduce((acc, c) => acc + Number(c.costo_total), 0);
  const cantVentas = ventas.reduce((acc, v) => acc + Number(v.cantidad), 0);

  // Ganancia neta = ganancia real de cada venta (precio - costo de la prenda) - gastos generales
  const gananciaNeta = gananciaVentas - totalGastos;
  const egresosTotales = totalGastos + totalCompras;
  const disponible = ingresos - egresosTotales;

  document.getElementById('panel-ganancia').textContent = formatoMoneda(gananciaNeta);
  document.getElementById('panel-ingresos').textContent = formatoMoneda(ingresos);
  document.getElementById('panel-egresos').textContent = formatoMoneda(egresosTotales);
  document.getElementById('panel-compras').textContent = formatoMoneda(totalCompras);
  document.getElementById('panel-gastos').textContent = formatoMoneda(totalGastos);
  document.getElementById('panel-cant-ventas').textContent = cantVentas;
  document.getElementById('panel-disponible').textContent = formatoMoneda(disponible);

  renderStockBajo();
}

function renderStockBajo() {
  const cont = document.getElementById('panel-stock-bajo');
  cont.innerHTML = '';
  const bajas = getPrendas().filter((p) => p.stock <= 2).sort((a, b) => a.stock - b.stock);
  if (!bajas.length) {
    cont.appendChild(el('div', { class: 'vacio' }, 'Todo bien, ninguna prenda con stock crítico.'));
    return;
  }
  for (const p of bajas) {
    cont.appendChild(el('div', { class: 'fila-item' }, [
      el('div', { class: 'fila-item__icono fila-item__icono--compra' }, '👗'),
      el('div', { class: 'fila-item__cuerpo' }, [
        el('div', { class: 'fila-item__titulo' }, p.nombre),
        el('div', { class: 'fila-item__detalle' }, p.stock === 0 ? 'Sin stock' : `Quedan ${p.stock}`),
      ]),
    ]));
  }
}
