import { sign, verify } from 'hono/jwt';

async function run() {
  const secret = 's3cr3t_m1n1sup3r_2026_k3y_v3ry_s4f3';
  const payload = {
    id: 1,
    rol: 'admin',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24
  };
  try {
    const token = await sign(payload, secret);
    console.log("Signed token:", token);
    const decoded = await verify(token, secret);
    console.log("Decoded:", decoded);
  } catch (e) {
    console.error("JWT Error:", e);
  }
}
run();
