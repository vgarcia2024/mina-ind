import { supabase, BUCKET_PRENDAS } from './supabaseClient.js';
import {
  formatoMoneda, calcularCostoTotalPrenda, calcularGanancia,
  calcularMargen, toast, el,
} from './utils.js';

let prendas = [];
let archivoImagenSeleccionado = null;

export function getPrendas() {
  return prendas;
}

export function getPrendaPorId(id) {
  return prendas.find((p) => p.id === id);
}

export async function cargarPrendas() {
  const { data, error } = await supabase
    .from('prendas')
    .select('*')
    .eq('activo', true)
    .order('created_at', { ascending: false });

  if (error) {
    toast('No se pudieron cargar las prendas', 'error');
    console.error(error);
    return [];
  }
  prendas = data || [];
  return prendas;
}

export function renderGridPrendas() {
  const grid = document.getElementById('grid-prendas');
  grid.innerHTML = '';

  if (!prendas.length) {
    grid.appendChild(el('div', { class: 'vacio' }, 'Todavía no cargaste ninguna prenda. Tocá "+ Nueva prenda" para empezar.'));
    return;
  }

  for (const p of prendas) {
    const stockBajo = p.stock <= 2;
    const tarjeta = el('div', { class: 'tarjeta-prenda', onclick: () => abrirModalPrenda(p.id) }, [
      p.imagen_url
        ? el('img', { class: 'tarjeta-prenda__img', src: p.imagen_url })
        : el('div', { class: 'tarjeta-prenda__img tarjeta-prenda__img--vacia' }, '👗'),
      el('div', { class: 'tarjeta-prenda__cuerpo' }, [
        el('div', { class: 'tarjeta-prenda__nombre' }, p.nombre),
        el('div', { class: 'tarjeta-prenda__precio' }, formatoMoneda(p.precio_venta)),
        el('div', { class: `tarjeta-prenda__stock ${stockBajo ? 'tarjeta-prenda__stock--bajo' : ''}` },
          `Stock: ${p.stock}`),
      ]),
    ]);
    grid.appendChild(tarjeta);
  }
}

export function poblarSelectPrendas(selectEl, { soloConStock = false } = {}) {
  selectEl.innerHTML = '';
  const lista = soloConStock ? prendas.filter((p) => p.stock > 0) : prendas;

  if (!lista.length) {
    selectEl.appendChild(el('option', { value: '' }, soloConStock ? 'No hay stock disponible' : 'Cargá una prenda primero'));
    return;
  }
  for (const p of lista) {
    selectEl.appendChild(el('option', { value: p.id }, `${p.nombre} (stock: ${p.stock})`));
  }
}

// ---------------- Modal ----------------

function actualizarInfoCostoModal() {
  const precioCompra = Number(document.getElementById('prenda-precio-compra').value) || 0;
  const bolsa = Number(document.getElementById('prenda-costo-bolsa').value) || 0;
  const etiqueta = Number(document.getElementById('prenda-costo-etiqueta').value) || 0;
  const otros = Number(document.getElementById('prenda-costo-otros').value) || 0;
  const precioVenta = Number(document.getElementById('prenda-precio-venta').value) || 0;

  const costoTotal = calcularCostoTotalPrenda({
    precio_compra: precioCompra, costo_bolsa: bolsa, costo_etiqueta: etiqueta, costo_otros: otros,
  });
  const ganancia = calcularGanancia(costoTotal, precioVenta);
  const margen = calcularMargen(costoTotal, precioVenta);

  document.getElementById('prenda-info-costo').innerHTML =
    `Costo total: <b>${formatoMoneda(costoTotal)}</b>`;
  document.getElementById('prenda-info-ganancia').innerHTML =
    `Ganancia por unidad: <b>${formatoMoneda(ganancia)}</b> · Margen: <b>${margen.toFixed(1)}%</b>`;
}

function limpiarFormularioPrenda() {
  document.getElementById('form-prenda').reset();
  document.getElementById('prenda-id').value = '';
  document.getElementById('prenda-imagen-preview').style.display = 'none';
  document.getElementById('prenda-imagen-preview').src = '';
  archivoImagenSeleccionado = null;
  document.getElementById('btn-borrar-prenda').classList.add('oculto');
  document.getElementById('modal-prenda-titulo').textContent = 'Nueva prenda';
  actualizarInfoCostoModal();
}

export function abrirModalPrenda(id = null) {
  limpiarFormularioPrenda();
  if (id) {
    const p = getPrendaPorId(id);
    if (!p) return;
    document.getElementById('modal-prenda-titulo').textContent = p.nombre;
    document.getElementById('prenda-id').value = p.id;
    document.getElementById('prenda-nombre').value = p.nombre;
    document.getElementById('prenda-precio-compra').value = p.precio_compra;
    document.getElementById('prenda-costo-bolsa').value = p.costo_bolsa;
    document.getElementById('prenda-costo-etiqueta').value = p.costo_etiqueta;
    document.getElementById('prenda-costo-otros').value = p.costo_otros;
    document.getElementById('prenda-precio-venta').value = p.precio_venta;
    document.getElementById('prenda-stock').value = p.stock;
    if (p.imagen_url) {
      const prev = document.getElementById('prenda-imagen-preview');
      prev.src = p.imagen_url;
      prev.style.display = 'block';
    }
    document.getElementById('btn-borrar-prenda').classList.remove('oculto');
    actualizarInfoCostoModal();
  }
  document.getElementById('modal-prenda').classList.remove('oculto');
}

export function cerrarModalPrenda() {
  document.getElementById('modal-prenda').classList.add('oculto');
}

async function subirImagenPrenda(file) {
  const nombreArchivo = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
  const { error } = await supabase.storage.from(BUCKET_PRENDAS).upload(nombreArchivo, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) {
    console.error(error);
    toast('No se pudo subir la imagen', 'error');
    return null;
  }
  const { data } = supabase.storage.from(BUCKET_PRENDAS).getPublicUrl(nombreArchivo);
  return data.publicUrl;
}

export function initPrendas({ onCambio }) {
  document.getElementById('btn-nueva-prenda').addEventListener('click', () => abrirModalPrenda());
  document.getElementById('modal-prenda-cerrar').addEventListener('click', cerrarModalPrenda);

  ['prenda-precio-compra', 'prenda-costo-bolsa', 'prenda-costo-etiqueta', 'prenda-costo-otros', 'prenda-precio-venta']
    .forEach((idCampo) => {
      document.getElementById(idCampo).addEventListener('input', actualizarInfoCostoModal);
    });

  document.getElementById('prenda-imagen').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    archivoImagenSeleccionado = file;
    const prev = document.getElementById('prenda-imagen-preview');
    prev.src = URL.createObjectURL(file);
    prev.style.display = 'block';
  });

  document.getElementById('form-prenda').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('prenda-id').value || null;

    const payload = {
      nombre: document.getElementById('prenda-nombre').value.trim(),
      precio_compra: Number(document.getElementById('prenda-precio-compra').value) || 0,
      costo_bolsa: Number(document.getElementById('prenda-costo-bolsa').value) || 0,
      costo_etiqueta: Number(document.getElementById('prenda-costo-etiqueta').value) || 0,
      costo_otros: Number(document.getElementById('prenda-costo-otros').value) || 0,
      precio_venta: Number(document.getElementById('prenda-precio-venta').value) || 0,
      stock: Number(document.getElementById('prenda-stock').value) || 0,
    };

    if (archivoImagenSeleccionado) {
      const url = await subirImagenPrenda(archivoImagenSeleccionado);
      if (url) payload.imagen_url = url;
    }

    let error;
    if (id) {
      ({ error } = await supabase.from('prendas').update(payload).eq('id', id));
    } else {
      ({ error } = await supabase.from('prendas').insert(payload));
    }

    if (error) {
      console.error(error);
      toast('No se pudo guardar la prenda', 'error');
      return;
    }

    toast(id ? 'Prenda actualizada' : 'Prenda cargada');
    cerrarModalPrenda();
    await cargarPrendas();
    renderGridPrendas();
    if (onCambio) onCambio();
  });

  document.getElementById('btn-borrar-prenda').addEventListener('click', async () => {
    const id = document.getElementById('prenda-id').value;
    if (!id) return;
    if (!confirm('¿Eliminar esta prenda? No se va a mostrar más en el catálogo.')) return;

    const { error } = await supabase.from('prendas').update({ activo: false }).eq('id', id);
    if (error) {
      toast('No se pudo eliminar', 'error');
      return;
    }
    toast('Prenda eliminada');
    cerrarModalPrenda();
    await cargarPrendas();
    renderGridPrendas();
    if (onCambio) onCambio();
  });
}
