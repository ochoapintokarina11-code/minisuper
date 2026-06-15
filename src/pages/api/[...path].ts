import { Hono } from 'hono';
import type { APIRoute } from 'astro';
import { getSupabase } from '../../lib/supabase';
import categoriasApp from '../../routes/categorias';
import productosApp from '../../routes/productos';
import ventasApp from '../../routes/ventas';
import proveedoresApp from '../../routes/proveedores';
import authApp from '../../routes/auth';
import chatApp from '../../routes/chat';

const app = new Hono().basePath('/api');

app.get('/test', async (c) => {
  // Un test simple para validar Hono conviviendo con Astro
  return c.json({
    message: 'Hello from Hono running inside Astro SSR!',
    status: 'success'
  });
});

app.get('/db-test', async (c) => {
  // Validando la instancia de Supabase
  const supabase = getSupabase(c.env);
  const { data, error } = await supabase.from('_dummy').select('*').limit(1).catch(() => ({ data: null, error: 'Table _dummy does not exist, but connection attempted' }));
  
  return c.json({
    message: 'Supabase instance is ready',
    supabaseUrl: (c.env?.PUBLIC_SUPABASE_URL || c.env?.SUPABASE_URL || import.meta.env.SUPABASE_URL) ? 'Loaded' : 'Missing',
    db_test: error ? 'Error expected if no tables exist' : 'Success',
  });
});

// Montar las rutas de los módulos
app.route('/categorias', categoriasApp);
app.route('/productos', productosApp);
app.route('/ventas', ventasApp);
app.route('/proveedores', proveedoresApp);
app.route('/auth', authApp);
app.route('/chat', chatApp);

export const ALL: APIRoute = (context) => {
  const env = context.locals.cloudflare?.env || process.env;
  return app.fetch(context.request, env);
};
