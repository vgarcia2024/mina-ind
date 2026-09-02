# MINA — Administración del emprendimiento

App para llevar el control de ventas, gastos, compras/stock y la ganancia real de cada prenda. Hecha en HTML + CSS + JS vanilla, pensada para usarse desde el celular, con Supabase como base de datos y storage de imágenes.

## Estructura del proyecto

```
mina/
├── index.html
├── schema.sql          ← esto va en Supabase, no se sube a Vercel
├── css/
│   └── style.css
└── js/
    ├── supabaseClient.js   ← acá van tus claves de Supabase
    ├── utils.js
    ├── prendas.js
    ├── ventas.js
    ├── gastos.js
    ├── compras.js
    ├── dashboard.js
    ├── movimientos.js
    └── app.js
```

## 1. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá un proyecto nuevo (gratis).
2. Andá a **SQL Editor** → pegá **todo** el contenido de `schema.sql` → **Run**.
   - Esto crea las 4 tablas (`prendas`, `compras`, `ventas`, `gastos`), los triggers que actualizan el stock automáticamente, las políticas de acceso y el bucket de imágenes `prendas`.
3. Andá a **Project Settings → API** y copiá:
   - **Project URL**
   - **anon public key**
4. Abrí `js/supabaseClient.js` y pegalos donde dice `PEGA_ACA_TU_SUPABASE_URL` y `PEGA_ACA_TU_SUPABASE_ANON_KEY`.

> Nota de seguridad: la app está pensada para uso personal (vos sola cargando datos), por eso las políticas quedan abiertas con la clave `anon`. No compartas el link de la app públicamente si no querés que otra persona pueda cargar o borrar datos. Si más adelante querés agregar un login, avisame y lo sumamos.

## 2. Probarlo en tu computadora antes de subirlo

Como el proyecto usa módulos de JS (`type="module"`), no podés simplemente abrir el `index.html` haciendo doble clic — el navegador bloquea los módulos si no vienen de un servidor. Opciones simples:

- Si tenés **VS Code**: instalá la extensión "Live Server" y hacé clic derecho en `index.html` → "Open with Live Server".
- Si tenés **Node**: desde la carpeta del proyecto, corré `npx serve` y abrí la URL que te muestra.

## 3. Subir a Vercel

1. Subí la carpeta `mina` a un repositorio de GitHub (podés dejar afuera `schema.sql`, es solo para Supabase).
2. Entrá a [vercel.com](https://vercel.com) → **Add New → Project** → importá el repositorio.
3. Como es un sitio estático, no hace falta ningún build command especial: dejalo con "Other" / sin framework, output directory en la raíz.
4. Deploy. Listo — te da una URL que podés abrir desde el celular y agregar a la pantalla de inicio como si fuera una app.

## Cómo funciona la ganancia

- Cada **prenda** tiene su costo real: precio de compra + bolsa + etiqueta + otros costos → **costo total**.
- Al registrar una **venta**, el sistema guarda ese costo real junto con la venta (así si después cambiás el costo de la prenda, las ventas viejas no se alteran) y calcula `ganancia = (precio de venta − costo real) × cantidad`, además de descontar el stock automáticamente.
- La **ganancia neta** del panel es la suma de esas ganancias por venta, menos los **gastos generales** del período (publicidad, envíos, etc.) — no incluye las compras de mercadería como gasto aparte, porque ese costo ya está adentro de la ganancia de cada venta. Así evitás contar el costo de la prenda dos veces.
- Las **compras** sí se muestran en el panel como referencia de cuánta plata se fue en reponer mercadería, y en "Movimientos" junto con ventas y gastos.

## Ideas para más adelante (opcional)

Cosas que no pediste pero que suelen servir en este tipo de sistema, por si en el futuro querés sumarlas:
- Exportar los movimientos a Excel/CSV para el contador.
- Un gráfico simple de ventas por mes.
- Registrar clientes recurrentes y sus datos de contacto.
- Marcar prendas por talle/color si tu stock varía por variante.
