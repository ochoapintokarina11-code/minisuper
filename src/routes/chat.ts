import { Hono } from 'hono';
import { getSupabase } from '../lib/supabase';
import { getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';

const chatApp = new Hono();

// Helper to get JWT Secret dynamically
const getJwtSecret = (env: any) => env?.JWT_SECRET || 's3cr3t_m1n1sup3r_2026_k3y_v3ry_s4f3';

// Helper to verify user
const verifyUser = async (c: any) => {
  const token = getCookie(c, 'auth_token');
  if (!token) return null;
  try {
    return await verify(token, getJwtSecret(c.env), "HS256");
  } catch (e) {
    return null;
  }
};

// GET /api/chat -> Retrieve last 50 messages
chatApp.get('/', async (c) => {
  const user = await verifyUser(c);
  if (!user) return c.json({ success: false, error: 'No autorizado' }, 401);

  const supabase = getSupabase(c.env);
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .order('creado_en', { ascending: false })
    .limit(50);

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  // Reverse to show chronological order
  return c.json(data.reverse(), 200);
});

// POST /api/chat -> Send a new message
chatApp.post('/', async (c) => {
  const user: any = await verifyUser(c);
  if (!user) return c.json({ success: false, error: 'No autorizado' }, 401);

  const body = await c.req.json();
  if (!body.mensaje || body.mensaje.trim() === '') {
    return c.json({ success: false, error: 'Mensaje vacío' }, 400);
  }

  const supabase = getSupabase(c.env);
  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{ 
      usuario: user.nombre_real || user.username || 'Usuario', 
      mensaje: body.mensaje.trim() 
    }])
    .select('*')
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data }, 201);
});

export default chatApp;
