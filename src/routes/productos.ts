import { Hono } from 'hono';
import { getSupabase } from '../lib/supabase';

const productosApp = new Hono();

const obtenerProductos = async (c: any) => {
  const { data, error } = await getSupabase(c.env)
    .from('productos')
    .select('*, categorias (nombre)');

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  const productosTransformados = data.map((prod: any) => ({
    ...prod,
    categoria_nombre: prod.categorias?.nombre || null,
    alerta_stock: prod.stock_actual <= (prod.stock_minimo || 0)
  }));
  productosTransformados.forEach((prod: any) => delete prod.categorias);

  return c.json(productosTransformados, 200);
};

productosApp.get('/', obtenerProductos);
productosApp.get('', obtenerProductos);

const obtenerVencimientos = async (c: any) => {
  const hoy = new Date().toISOString().split('T')[0];
  const { data, error } = await getSupabase(c.env)
    .from('productos')
    .select('*')
    .gte('fecha_vencimiento', hoy)
    .order('fecha_vencimiento', { ascending: true });

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json(data, 200);
};

productosApp.get('/vencimiento', obtenerVencimientos);
productosApp.get('/vencimiento/', obtenerVencimientos);

const crearProducto = async (c: any) => {
  try {
    const body = await c.req.json();
    const { codigo_barras, nombre, precio_compra, precio_venta, stock_actual, id_categoria, stock_minimo, fecha_vencimiento } = body;

    if (!codigo_barras || !nombre || precio_compra === undefined || precio_venta === undefined || stock_actual === undefined || !id_categoria) {
      return c.json({ success: false, error: 'Faltan campos obligatorios para el producto' }, 400);
    }

    const { data, error } = await getSupabase(c.env)
      .from('productos')
      .insert([{ codigo_barras, nombre, precio_compra, precio_venta, stock_actual, id_categoria, stock_minimo, fecha_vencimiento }])
      .select()
      .single();

    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data }, 201);
  } catch (err) {
    return c.json({ success: false, error: 'Cuerpo de solicitud inválido' }, 400);
  }
};

productosApp.post('/', crearProducto);
productosApp.post('', crearProducto);

// 6. PUT /api/productos/:id -> Modifica un producto existente
productosApp.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const { data, error } = await getSupabase(c.env)
      .from('productos')
      .update(body)
      .eq('id_producto', id)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    if (!data) {
      return c.json({ error: 'Producto no encontrado' }, 404);
    }

    return c.json(data, 200);
  } catch (err) {
    return c.json({ error: 'Cuerpo de solicitud inválido' }, 400);
  }
});

// 7. DELETE /api/productos/:id -> Elimina un producto
productosApp.delete('/:id', async (c) => {
  const id = c.req.param('id');
  
  const { data, error } = await getSupabase(c.env)
    .from('productos')
    .delete()
    .eq('id_producto', id)
    .select();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  if (!data || data.length === 0) {
    return c.json({ error: 'Producto no encontrado' }, 404);
  }

  return c.json({ message: 'Producto eliminado correctamente' }, 200);
});

export default productosApp;
