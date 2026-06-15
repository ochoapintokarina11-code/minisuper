import { supabase } from './src/lib/supabase.ts';

async function run() {
  console.log("Testing Supabase insert...");
  const { data, error } = await supabase
      .from('usuarios')
      .insert([{ nombre_real: 'Test', username: 'test_insert@gmail.com', password_hash: 'test', rol: 'vendedor' }])
      .select('id, nombre_real, username, rol')
      .single();
  
  console.log("Data:", data);
  console.log("Error:", error);
}

run();
