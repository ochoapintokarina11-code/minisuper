import { Hono } from 'hono';
import { getSupabase } from '../lib/supabase';

const ventasApp = new Hono();

const crearVenta = async (c: any) => {
  try {
    const body = await c.req.json();
    const { cliente, id_usuario, metodo_pago, items } = body;

    // Validación básica de payload
    if (!metodo_pago || !items || !Array.isArray(items) || items.length === 0) {
      return c.json({ success: false, error: 'Datos de venta incompletos o carrito vacío' }, 400);
    }

    // 0. Procesar Cliente
    let final_id_cliente = null;
    if (cliente && cliente.nombre) {
      if (cliente.nit_ci) {
        const { data: existingClient } = await getSupabase(c.env).from('clientes').select('id_cliente').eq('nit_ci', cliente.nit_ci).single();
        if (existingClient) {
          final_id_cliente = existingClient.id_cliente;
        } else {
          const { data: newClient } = await getSupabase(c.env).from('clientes').insert([{ nombre: cliente.nombre, nit_ci: cliente.nit_ci }]).select('id_cliente').single();
          if (newClient) final_id_cliente = newClient.id_cliente;
        }
      } else {
        const { data: newClient } = await getSupabase(c.env).from('clientes').insert([{ nombre: cliente.nombre }]).select('id_cliente').single();
        if (newClient) final_id_cliente = newClient.id_cliente;
      }
    }

    // 1. Obtener los productos actuales de la DB
    const productIds = items.map((item: any) => item.id_producto);
    const { data: dbProductos, error: prodError } = await getSupabase(c.env)
      .from('productos')
      .select('id_producto, nombre, stock_actual, precio_venta')
      .in('id_producto', productIds);

    if (prodError || !dbProductos) {
      console.error("DB Error (Productos):", prodError);
      return c.json({ success: false, error: 'Error al consultar productos: ' + (prodError?.message || 'Data is null') }, 500);
    }

    let totalVenta = 0;
    const detallesParaInsertar = [];
    const actualizacionesStock = [];

    // 2. Validar stock
    for (const item of items) {
      const dbProd = dbProductos.find((p) => p.id_producto === item.id_producto);
      if (!dbProd) {
        return c.json({ success: false, error: `El producto con ID ${item.id_producto} no existe o fue eliminado` }, 400);
      }
      if (dbProd.stock_actual < item.cantidad) {
        return c.json({ success: false, error: `No hay stock suficiente para: ${dbProd.nombre}. Stock actual: ${dbProd.stock_actual}` }, 400);
      }
      const subtotal = dbProd.precio_venta * item.cantidad;
      totalVenta += subtotal;
      detallesParaInsertar.push({ id_producto: item.id_producto, cantidad: item.cantidad, precio_venta_historico: dbProd.precio_venta, subtotal: subtotal });
      actualizacionesStock.push({ id_producto: dbProd.id_producto, nuevo_stock: dbProd.stock_actual - item.cantidad });
    }

    // 3. Insertar la cabecera de la Venta
    const { data: ventaGenerada, error: ventaError } = await getSupabase(c.env)
      .from('ventas')
      .insert([{ id_cliente: final_id_cliente, id_usuario: id_usuario || null, metodo_pago, total_venta: totalVenta }])
      .select('id_venta, total_venta, fecha_venta')
      .single();

    if (ventaError) return c.json({ success: false, error: 'Error al registrar la cabecera de la venta: ' + ventaError.message }, 500);

    const idVenta = ventaGenerada.id_venta;
    const detallesConVenta = detallesParaInsertar.map(d => ({ ...d, id_venta: idVenta }));

    // 4. Insertar los Detalles de Venta
    const { error: detallesError } = await getSupabase(c.env).from('detalle_ventas').insert(detallesConVenta);
    if (detallesError) return c.json({ success: false, error: 'Venta creada pero ocurrió un error al registrar el detalle' }, 500);

    // 5. Descontar Stock
    for (const act of actualizacionesStock) {
      await getSupabase(c.env).from('productos').update({ stock_actual: act.nuevo_stock }).eq('id_producto', act.id_producto);
    }

    return c.json({ success: true, message: 'Venta consolidada exitosamente', venta: ventaGenerada }, 201);
  } catch (err) {
    return c.json({ success: false, error: 'Error interno o formato de solicitud inválido' }, 400);
  }
};

ventasApp.post('/', crearVenta);
ventasApp.post('', crearVenta);

export default ventasApp;
