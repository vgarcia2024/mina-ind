import { supabase, BUCKET_PRENDAS } from './supabaseClient.js';
import {
  formatoMoneda, calcularCostoTotalPrenda, calcularGanancia,
  calcularMargen, toast, el,
} from './utils.js';

let prendas = [];
let archivoImagenSeleccionado = null;
let coloresActuales = [];
let coloresOriginales = [];

export function getPrendas() {
  return prendas;
}

export function getPrendaPorId(id) {
  return prendas.find((p) => p.id === id);
}

export async function cargarPrendas() {
  const { data, error } = await supabase
    .from('prendas')
    .select('*, prenda_colores(*)')
    .eq('activo', true)
    .order('created_at', { ascending: false });

  if (error) {
    toast('No se pudieron cargar las prendas', 'error');
    console.error(error);
    return [];
  }
  prendas = (data || []).map((p) => ({ ...p, colores: p.prenda_colores || [] }));
  return prendas;
}

export function obtenerColoresDePrenda(prendaId) {
  const p = getPrendaPorId(prendaId);
  return (p?.colores || []).slice().sort((a, b) => a.color.localeCompare(b.color));
}

export function obtenerColoresConStock(prendaId) {
  return obtenerColoresDePrenda(prendaId).filter((c) => c.stock > 0);
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
        el('div', { class: 'tarjeta-prenda__colores' },
          (p.colores || []).map((c) => el('span', { class: 'pill-color' }, `${c.color}: ${c.stock}`))),
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

function renderColoresModal() {
  const cont = document.getElementById('prenda-colores-container');
  cont.innerHTML = '';
  coloresActuales.forEach((c, i) => {
    cont.appendChild(el('div', { class: 'color-row' }, [
      el('input', {
        type: 'text',
        placeholder: 'Color (ej: negro)',
        value: c.color,
        oninput: (e) => { coloresActuales[i].color = e.target.value; },
      }),
      el('div', { class: 'color-row__stepper' }, [
        el('button', { type: 'button', onclick: () => cambiarCantidadColor(i, -1) }, '−'),
        el('span', {}, String(c.stock)),
        el('button', { type: 'button', onclick: () => cambiarCantidadColor(i, 1) }, '+'),
      ]),
      el('button', { type: 'button', class: 'color-row__quitar', onclick: () => quitarColorModal(i) }, '✕'),
    ]));
  });
}

function cambiarCantidadColor(i, delta) {
  coloresActuales[i].stock = Math.max(0, (coloresActuales[i].stock || 0) + delta);
  renderColoresModal();
}

function quitarColorModal(i) {
  coloresActuales.splice(i, 1);
  renderColoresModal();
}

function agregarColorModal() {
  coloresActuales.push({ color: '', stock: 0 });
  renderColoresModal();
}

function limpiarFormularioPrenda() {
  document.getElementById('form-prenda').reset();
  document.getElementById('prenda-id').value = '';
  document.getElementById('prenda-imagen-preview').style.display = 'none';
  document.getElementById('prenda-imagen-preview').src = '';
  archivoImagenSeleccionado = null;
  document.getElementById('btn-borrar-prenda').classList.add('oculto');
  document.getElementById('modal-prenda-titulo').textContent = 'Nueva prenda';
  coloresActuales = [{ color: '', stock: 0 }];
  coloresOriginales = [];
  renderColoresModal();
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
    coloresActuales = (p.colores || []).map((c) => ({ color: c.color, stock: c.stock }));
    if (!coloresActuales.length) coloresActuales = [{ color: '', stock: 0 }];
    coloresOriginales = coloresActuales.map((c) => c.color);
    renderColoresModal();
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
  document.getElementById('btn-agregar-color').addEventListener('click', agregarColorModal);

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

    const coloresValidos = coloresActuales
      .map((c) => ({ color: c.color.trim(), stock: Number(c.stock) || 0 }))
      .filter((c) => c.color);

    if (!coloresValidos.length) {
      toast('Agregá al menos un color con su cantidad', 'error');
      return;
    }

    const stockTotal = coloresValidos.reduce((acc, c) => acc + c.stock, 0);

    const payload = {
      nombre: document.getElementById('prenda-nombre').value.trim(),
      precio_compra: Number(document.getElementById('prenda-precio-compra').value) || 0,
      costo_bolsa: Number(document.getElementById('prenda-costo-bolsa').value) || 0,
      costo_etiqueta: Number(document.getElementById('prenda-costo-etiqueta').value) || 0,
      costo_otros: Number(document.getElementById('prenda-costo-otros').value) || 0,
      precio_venta: Number(document.getElementById('prenda-precio-venta').value) || 0,
      stock: stockTotal,
    };

    if (archivoImagenSeleccionado) {
      const url = await subirImagenPrenda(archivoImagenSeleccionado);
      if (url) payload.imagen_url = url;
    }

    let prendaId = id;
    let error;
    if (id) {
      ({ error } = await supabase.from('prendas').update(payload).eq('id', id));
    } else {
      const { data, error: insertError } = await supabase.from('prendas').insert(payload).select().single();
      error = insertError;
      if (data) prendaId = data.id;
    }

    if (error) {
      console.error(error);
      toast('No se pudo guardar la prenda', 'error');
      return;
    }

    const aBorrar = coloresOriginales.filter((nombre) => !coloresValidos.some((c) => c.color === nombre));
    if (aBorrar.length) {
      await supabase.from('prenda_colores').delete().eq('prenda_id', prendaId).in('color', aBorrar);
    }
    for (const c of coloresValidos) {
      await supabase.from('prenda_colores').upsert(
        { prenda_id: prendaId, color: c.color, stock: c.stock },
        { onConflict: 'prenda_id,color' },
      );
    }

    toast(id ? 'Prenda actualizada' : 'Prenda cargada');
    cerrarModalPrenda();
    await cargarPrendas();
    renderGridPrendas();
    document.dispatchEvent(new CustomEvent('mina:prendas-actualizadas'));
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
    document.dispatchEvent(new CustomEvent('mina:prendas-actualizadas'));
    if (onCambio) onCambio();
  });
}
