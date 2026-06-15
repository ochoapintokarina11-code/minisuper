import { Hono } from 'hono';
import { getSupabase } from '../lib/supabase';

const categoriasApp = new Hono();

const obtenerCategorias = async (c: any) => {
  const { data, error } = await getSupabase(c.env)
    .from('categorias')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json(data, 200);
};

// 1. GET /api/categorias -> Retorna todas las categorías ordenadas por nombre
categoriasApp.get('/', obtenerCategorias);
categoriasApp.get('', obtenerCategorias);

// Función handler para el POST
const crearCategoria = async (c: any) => {
  try {
    const body = await c.req.json();
    const { nombre, descripcion } = body;

    if (!nombre) {
      return c.json({ success: false, error: 'El nombre de la categoría es obligatorio' }, 400);
    }

    const { data, error } = await getSupabase(c.env)
      .from('categorias')
      .insert([{ nombre, descripcion }])
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

// 2. POST /api/categorias -> Registra una nueva categoría
categoriasApp.post('/', crearCategoria);
categoriasApp.post('', crearCategoria);

// 3. PUT /api/categorias/:id -> Modifica una categoría
categoriasApp.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const { data, error } = await getSupabase(c.env)
      .from('categorias')
      .update(body)
      .eq('id_categoria', id)
      .select()
      .single();

    if (error) return c.json({ error: error.message }, 500);
    if (!data) return c.json({ error: 'Categoría no encontrada' }, 404);

    return c.json(data, 200);
  } catch (err) {
    return c.json({ error: 'Solicitud inválida' }, 400);
  }
});

// 4. DELETE /api/categorias/:id -> Elimina una categoría
categoriasApp.delete('/:id', async (c) => {
  const id = c.req.param('id');
  
  const { data, error } = await getSupabase(c.env)
    .from('categorias')
    .delete()
    .eq('id_categoria', id)
    .select();

  if (error) return c.json({ error: error.message }, 500);
  if (!data || data.length === 0) return c.json({ error: 'Categoría no encontrada' }, 404);

  return c.json({ message: 'Categoría eliminada correctamente' }, 200);
});

export default categoriasApp;
