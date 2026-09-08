import { supabase } from './supabaseClient.js';
import {
  formatoMoneda, formatoFechaCorta, fechaLocalISO, toast, el,
} from './utils.js';
import { getPrendaPorId, poblarSelectPrendas, cargarPrendas, renderGridPrendas, obtenerColoresConStock } from './prendas.js';

let coloresVentaActual = [];

function poblarSelectColorVenta() {
  const prendaId = document.getElementById('venta-prenda').value;
  const select = document.getElementById('venta-color');
  select.innerHTML = '';
  coloresVentaActual = prendaId ? obtenerColoresConStock(prendaId) : [];

  if (!coloresVentaActual.length) {
    select.appendChild(el('option', { value: '' }, 'Sin stock por color'));
    return;
  }
  for (const c of coloresVentaActual) {
    select.appendChild(el('option', { value: c.color }, `${c.color} (quedan ${c.stock})`));
  }
}

export async function cargarVentas({ desde, hasta } = {}) {
  let query = supabase.from('ventas').select('*').order('fecha', { ascending: false }).order('created_at', { ascending: false });
  if (desde) query = query.gte('fecha', desde);
  if (hasta) query = query.lte('fecha', hasta);
  const { data, error } = await query;
  if (error) {
    toast('No se pudieron cargar las ventas', 'error');
    console.error(error);
    return [];
  }
  return data || [];
}

function mostrarFichaPrenda(prendaId) {
  const info = document.getElementById('venta-info-ganancia');
  const prenda = getPrendaPorId(prendaId);
  if (!prenda) {
    info.classList.add('oculto');
    return;
  }
  info.classList.remove('oculto');
  info.innerHTML = `Costo real: <b>${formatoMoneda(prenda.costo_total)}</b>
    (compra ${formatoMoneda(prenda.precio_compra)} + bolsa ${formatoMoneda(prenda.costo_bolsa)} + etiqueta ${formatoMoneda(prenda.costo_etiqueta)} + otros ${formatoMoneda(prenda.costo_otros)})
    · Precio de venta sugerido: <b>${formatoMoneda(prenda.precio_venta)}</b>`;
}

function actualizarInfoGananciaVenta() {
  const prendaId = document.getElementById('venta-prenda').value;
  const cantidad = Number(document.getElementById('venta-cantidad').value) || 0;
  const precioVenta = Number(document.getElementById('venta-precio').value) || 0;
  const info = document.getElementById('venta-info-ganancia');

  const prenda = getPrendaPorId(prendaId);
  if (!prenda) {
    info.classList.add('oculto');
    return;
  }
  if (!cantidad || !precioVenta) {
    mostrarFichaPrenda(prendaId); // mientras falta completar el form, igual mostramos el costo de referencia
    return;
  }
  const ganancia = (precioVenta - prenda.costo_total) * cantidad;
  const margen = precioVenta > 0 ? (ganancia / (precioVenta * cantidad)) * 100 : 0;
  info.classList.remove('oculto');
  info.innerHTML = `Costo real de la prenda: <b>${formatoMoneda(prenda.costo_total)}</b> por unidad · Ganancia de esta venta: <b>${formatoMoneda(ganancia)}</b> · Margen: <b>${margen.toFixed(1)}%</b>`;
}

export function renderListaVentas(ventas) {
  const cont = document.getElementById('lista-ventas');
  cont.innerHTML = '';
  if (!ventas.length) {
    cont.appendChild(el('div', { class: 'vacio' }, 'No hay ventas registradas en este período.'));
    return;
  }
  for (const v of ventas) {
    cont.appendChild(el('div', { class: 'fila-item' }, [
      el('div', { class: 'fila-item__icono fila-item__icono--venta' }, '💰'),
      el('div', { class: 'fila-item__cuerpo' }, [
        el('div', { class: 'fila-item__titulo' }, `${v.prenda_nombre}${v.color ? ' · ' + v.color : ''} × ${v.cantidad}`),
        el('div', { class: 'fila-item__detalle' }, `${formatoFechaCorta(v.fecha)} · ${v.medio_pago} · ganancia ${formatoMoneda(v.ganancia)}`),
      ]),
      el('div', { class: 'fila-item__monto fila-item__monto--pos' }, `+${formatoMoneda(v.total)}`),
      el('button', {
        class: 'fila-item__borrar',
        onclick: async () => {
          if (!confirm('¿Eliminar esta venta? El stock de la prenda se va a repone.')) return;
          const { error } = await supabase.from('ventas').delete().eq('id', v.id);
          if (error) { toast('No se pudo eliminar', 'error'); return; }
          toast('Venta eliminada');
          document.dispatchEvent(new CustomEvent('mina:datos-cambiaron'));
        },
      }, '✕'),
    ]));
  }
}

export function initVentas({ onCambio }) {
  document.getElementById('venta-fecha').value = fechaLocalISO();

  document.addEventListener('mina:prendas-actualizadas', () => {
    const select = document.getElementById('venta-prenda');
    const seleccionPrevia = select.value;
    poblarSelectPrendas(select, { soloConStock: true });
    if ([...select.options].some((o) => o.value === seleccionPrevia)) select.value = seleccionPrevia;
    poblarSelectColorVenta();
    actualizarInfoGananciaVenta();
  });

  document.getElementById('venta-prenda').addEventListener('change', () => {
    poblarSelectColorVenta();
    const prenda = getPrendaPorId(document.getElementById('venta-prenda').value);
    if (prenda) {
      document.getElementById('venta-precio').value = prenda.precio_venta;
    }
    actualizarInfoGananciaVenta();
  });
  ['venta-cantidad', 'venta-precio', 'venta-color'].forEach((idCampo) => {
    document.getElementById(idCampo).addEventListener('input', actualizarInfoGananciaVenta);
  });

  document.getElementById('form-venta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const prendaId = document.getElementById('venta-prenda').value;
    const prenda = getPrendaPorId(prendaId);
    if (!prenda) {
      toast('Elegí una prenda válida', 'error');
      return;
    }
    const color = document.getElementById('venta-color').value;
    const colorInfo = coloresVentaActual.find((c) => c.color === color);
    if (!color || !colorInfo) {
      toast('Elegí un color válido', 'error');
      return;
    }

    const cantidad = Number(document.getElementById('venta-cantidad').value);
    if (cantidad > colorInfo.stock) {
      toast(`Solo hay ${colorInfo.stock} unidades de ese color`, 'error');
      return;
    }

    const payload = {
      fecha: document.getElementById('venta-fecha').value,
      prenda_id: prenda.id,
      prenda_nombre: prenda.nombre,
      color,
      cantidad,
      precio_venta: Number(document.getElementById('venta-precio').value),
      costo_unitario: prenda.costo_total,
      medio_pago: document.getElementById('venta-medio-pago').value,
      envio: Number(document.getElementById('venta-envio').value) || 0,
    };

    const { error } = await supabase.from('ventas').insert(payload);
    if (error) {
      console.error(error);
      toast('No se pudo registrar la venta', 'error');
      return;
    }

    toast('Venta registrada 🎉');
    document.getElementById('form-venta').reset();
    document.getElementById('venta-fecha').value = fechaLocalISO();
    document.getElementById('venta-envio').value = 0;
    document.getElementById('venta-info-ganancia').classList.add('oculto');
    await cargarPrendas();
    renderGridPrendas();
    document.dispatchEvent(new CustomEvent('mina:prendas-actualizadas'));
    if (onCambio) onCambio();
  });
}
