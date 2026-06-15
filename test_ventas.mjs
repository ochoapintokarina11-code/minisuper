import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('productos')
    .select('id_producto, nombre, stock_actual, precio_venta')
    .in('id_producto', [2]);
  
  console.log("Error:", error);
  console.log("Data:", data);
}

test();
