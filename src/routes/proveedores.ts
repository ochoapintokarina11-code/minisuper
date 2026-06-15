import { Hono } from 'hono';
import { getSupabase } from '../lib/supabase';

const proveedoresApp = new Hono();

const obtenerProveedores = async (c: any) => {
  const { data, error } = await getSupabase(c.env)
    .from('proveedores')
    .select('*')
    .order('nombre_empresa', { ascending: true });

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json(data, 200);
};

// GET /api/proveedores
proveedoresApp.get('/', obtenerProveedores);
proveedoresApp.get('', obtenerProveedores);

const crearProveedor = async (c: any) => {
  try {
    const body = await c.req.json();
    const { nit_ci, nombre_empresa, nombre_contacto, telefono, email, direccion } = body;

    if (!nit_ci || !nombre_empresa) {
      return c.json({ success: false, error: 'NIT/CI y Nombre de la Empresa son obligatorios' }, 400);
    }

    const { data, error } = await getSupabase(c.env)
      .from('proveedores')
      .insert([{ nit_ci, nombre_empresa, nombre_contacto, telefono, email, direccion }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
         return c.json({ success: false, error: 'Ya existe un proveedor con ese NIT/CI o Email' }, 400);
      }
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true, data }, 201);
  } catch (err) {
    return c.json({ success: false, error: 'Cuerpo de solicitud inválido' }, 400);
  }
};

// POST /api/proveedores
proveedoresApp.post('/', crearProveedor);
proveedoresApp.post('', crearProveedor);

// PUT /api/proveedores/:id -> Actualizar proveedor (Bonus para escalabilidad futura)
proveedoresApp.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const { data, error } = await getSupabase(c.env)
      .from('proveedores')
      .update(body)
      .eq('id_proveedor', id)
      .select()
      .single();

    if (error) return c.json({ error: error.message }, 500);
    if (!data) return c.json({ error: 'Proveedor no encontrado' }, 404);

    return c.json(data, 200);
  } catch (err) {
    return c.json({ error: 'Solicitud inválida' }, 400);
  }
});

// DELETE /api/proveedores/:id -> Eliminar proveedor
proveedoresApp.delete('/:id', async (c) => {
  const id = c.req.param('id');
  
  const { data, error } = await getSupabase(c.env)
    .from('proveedores')
    .delete()
    .eq('id_proveedor', id)
    .select();

  if (error) return c.json({ error: error.message }, 500);
  if (!data || data.length === 0) return c.json({ error: 'Proveedor no encontrado' }, 404);

  return c.json({ message: 'Proveedor eliminado correctamente' }, 200);
});

export default proveedoresApp;
