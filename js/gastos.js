import { supabase } from './supabaseClient.js';
import { formatoMoneda, formatoFechaCorta, fechaLocalISO, toast, el } from './utils.js';

const ETIQUETAS_CATEGORIA = {
  packaging: 'Packaging',
  etiquetas: 'Etiquetas / bolsas',
  publicidad: 'Publicidad',
  envios: 'Envíos',
  insumos: 'Insumos',
  servicios: 'Servicios',
  otros: 'Otros',
};

export async function cargarGastos({ desde, hasta } = {}) {
  let query = supabase.from('gastos').select('*').order('fecha', { ascending: false }).order('created_at', { ascending: false });
  if (desde) query = query.gte('fecha', desde);
  if (hasta) query = query.lte('fecha', hasta);
  const { data, error } = await query;
  if (error) {
    toast('No se pudieron cargar los gastos', 'error');
    console.error(error);
    return [];
  }
  return data || [];
}

export function renderListaGastos(gastos) {
  const cont = document.getElementById('lista-gastos');
  cont.innerHTML = '';
  if (!gastos.length) {
    cont.appendChild(el('div', { class: 'vacio' }, 'No hay gastos registrados en este período.'));
    return;
  }
  for (const g of gastos) {
    cont.appendChild(el('div', { class: 'fila-item' }, [
      el('div', { class: 'fila-item__icono fila-item__icono--gasto' }, '💸'),
      el('div', { class: 'fila-item__cuerpo' }, [
        el('div', { class: 'fila-item__titulo' }, g.descripcion),
        el('div', { class: 'fila-item__detalle' }, `${formatoFechaCorta(g.fecha)} · ${ETIQUETAS_CATEGORIA[g.categoria] || g.categoria} · ${g.medio_pago}`),
      ]),
      el('div', { class: 'fila-item__monto fila-item__monto--neg' }, `-${formatoMoneda(g.monto)}`),
      el('button', {
        class: 'fila-item__borrar',
        onclick: async () => {
          if (!confirm('¿Eliminar este gasto?')) return;
          const { error } = await supabase.from('gastos').delete().eq('id', g.id);
          if (error) { toast('No se pudo eliminar', 'error'); return; }
          toast('Gasto eliminado');
          document.dispatchEvent(new CustomEvent('mina:datos-cambiaron'));
        },
      }, '✕'),
    ]));
  }
}

export function initGastos({ onCambio }) {
  document.getElementById('gasto-fecha').value = fechaLocalISO();

  document.getElementById('form-gasto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      fecha: document.getElementById('gasto-fecha').value,
      descripcion: document.getElementById('gasto-descripcion').value.trim(),
      categoria: document.getElementById('gasto-categoria').value,
      monto: Number(document.getElementById('gasto-monto').value),
      medio_pago: document.getElementById('gasto-medio-pago').value,
      observacion: document.getElementById('gasto-observacion').value.trim() || null,
    };

    const { error } = await supabase.from('gastos').insert(payload);
    if (error) {
      console.error(error);
      toast('No se pudo registrar el gasto', 'error');
      return;
    }

    toast('Gasto registrado');
    document.getElementById('form-gasto').reset();
    document.getElementById('gasto-fecha').value = fechaLocalISO();
    if (onCambio) onCambio();
  });
}
