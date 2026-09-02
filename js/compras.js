import { supabase } from './supabaseClient.js';
import { formatoMoneda, formatoFechaCorta, fechaLocalISO, toast, el } from './utils.js';
import { getPrendas, poblarSelectPrendas, cargarPrendas, renderGridPrendas } from './prendas.js';

export async function cargarCompras({ desde, hasta } = {}) {
  let query = supabase.from('compras').select('*').order('fecha', { ascending: false }).order('created_at', { ascending: false });
  if (desde) query = query.gte('fecha', desde);
  if (hasta) query = query.lte('fecha', hasta);
  const { data, error } = await query;
  if (error) {
    toast('No se pudieron cargar las compras', 'error');
    console.error(error);
    return [];
  }
  return data || [];
}

function actualizarInfoUnitarioCompra() {
  const cantidad = Number(document.getElementById('compra-cantidad').value) || 0;
  const costoTotal = Number(document.getElementById('compra-costo-total').value) || 0;
  const info = document.getElementById('compra-info-unitario');
  if (!cantidad || !costoTotal) {
    info.classList.add('oculto');
    return;
  }
  info.classList.remove('oculto');
  info.innerHTML = `Costo por unidad: <b>${formatoMoneda(costoTotal / cantidad)}</b>`;
}

export function renderListaCompras(compras) {
  const cont = document.getElementById('lista-compras');
  cont.innerHTML = '';
  if (!compras.length) {
    cont.appendChild(el('div', { class: 'vacio' }, 'No hay compras registradas en este período.'));
    return;
  }
  for (const c of compras) {
    const nombrePrenda = getPrendas().find((p) => p.id === c.prenda_id)?.nombre || '(prenda eliminada)';
    cont.appendChild(el('div', { class: 'fila-item' }, [
      el('div', { class: 'fila-item__icono fila-item__icono--compra' }, '📦'),
      el('div', { class: 'fila-item__cuerpo' }, [
        el('div', { class: 'fila-item__titulo' }, `${nombrePrenda} × ${c.cantidad}`),
        el('div', { class: 'fila-item__detalle' }, `${formatoFechaCorta(c.fecha)}${c.proveedor ? ' · ' + c.proveedor : ''} · ${formatoMoneda(c.costo_unitario)}/u`),
      ]),
      el('div', {}, [
        el('div', { class: 'fila-item__monto fila-item__monto--neg' }, `-${formatoMoneda(c.costo_total)}`),
        el('div', { style: 'text-align:right;margin-top:4px;' }, [
          el('span', { class: `badge ${c.pagado ? 'badge--pagado' : 'badge--pendiente'}` }, c.pagado ? 'Pagado' : 'Pendiente'),
        ]),
      ]),
      el('button', {
        class: 'fila-item__borrar',
        onclick: async () => {
          if (!confirm('¿Eliminar esta compra? Se descontará el stock que había sumado.')) return;
          const { error } = await supabase.from('compras').delete().eq('id', c.id);
          if (error) { toast('No se pudo eliminar', 'error'); return; }
          toast('Compra eliminada');
          document.dispatchEvent(new CustomEvent('mina:datos-cambiaron'));
        },
      }, '✕'),
    ]));
  }
}

export function initCompras({ onCambio }) {
  document.getElementById('compra-fecha').value = fechaLocalISO();

  document.addEventListener('mina:prendas-actualizadas', () => {
    const select = document.getElementById('compra-prenda');
    const seleccionPrevia = select.value;
    poblarSelectPrendas(select);
    if ([...select.options].some((o) => o.value === seleccionPrevia)) select.value = seleccionPrevia;
  });

  ['compra-cantidad', 'compra-costo-total'].forEach((idCampo) => {
    document.getElementById(idCampo).addEventListener('input', actualizarInfoUnitarioCompra);
  });

  document.getElementById('form-compra').addEventListener('submit', async (e) => {
    e.preventDefault();
    const prendaId = document.getElementById('compra-prenda').value;
    if (!prendaId) {
      toast('Cargá una prenda antes de registrar la compra', 'error');
      return;
    }

    const payload = {
      fecha: document.getElementById('compra-fecha').value,
      proveedor: document.getElementById('compra-proveedor').value.trim() || null,
      prenda_id: prendaId,
      cantidad: Number(document.getElementById('compra-cantidad').value),
      costo_total: Number(document.getElementById('compra-costo-total').value),
      pagado: document.getElementById('compra-pagado').checked,
    };

    const { error } = await supabase.from('compras').insert(payload);
    if (error) {
      console.error(error);
      toast('No se pudo registrar la compra', 'error');
      return;
    }

    toast('Compra registrada, stock actualizado');
    document.getElementById('form-compra').reset();
    document.getElementById('compra-fecha').value = fechaLocalISO();
    document.getElementById('compra-pagado').checked = true;
    document.getElementById('compra-info-unitario').classList.add('oculto');
    await cargarPrendas();
    renderGridPrendas();
    document.dispatchEvent(new CustomEvent('mina:prendas-actualizadas'));
    if (onCambio) onCambio();
  });
}
