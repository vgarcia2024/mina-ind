import { supabase } from './supabaseClient.js';
import {
  formatoMoneda, formatoFechaCorta, fechaLocalISO, toast, el,
} from './utils.js';
import { getPrendaPorId, poblarSelectPrendas, cargarPrendas, renderGridPrendas } from './prendas.js';

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

function actualizarInfoGananciaVenta() {
  const prendaId = document.getElementById('venta-prenda').value;
  const cantidad = Number(document.getElementById('venta-cantidad').value) || 0;
  const precioVenta = Number(document.getElementById('venta-precio').value) || 0;
  const info = document.getElementById('venta-info-ganancia');

  const prenda = getPrendaPorId(prendaId);
  if (!prenda || !cantidad || !precioVenta) {
    info.classList.add('oculto');
    return;
  }
  const ganancia = (precioVenta - prenda.costo_total) * cantidad;
  info.classList.remove('oculto');
  info.innerHTML = `Costo real de la prenda: <b>${formatoMoneda(prenda.costo_total)}</b> por unidad · Ganancia de esta venta: <b>${formatoMoneda(ganancia)}</b>`;
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
        el('div', { class: 'fila-item__titulo' }, `${v.prenda_nombre} × ${v.cantidad}`),
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
    actualizarInfoGananciaVenta();
  });

  ['venta-prenda', 'venta-cantidad', 'venta-precio'].forEach((idCampo) => {
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
    const cantidad = Number(document.getElementById('venta-cantidad').value);
    if (cantidad > prenda.stock) {
      toast(`Solo hay ${prenda.stock} unidades en stock`, 'error');
      return;
    }

    const payload = {
      fecha: document.getElementById('venta-fecha').value,
      prenda_id: prenda.id,
      prenda_nombre: prenda.nombre,
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
