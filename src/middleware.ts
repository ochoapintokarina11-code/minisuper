import { defineMiddleware } from 'astro:middleware';

// Matriz de permisos RBAC
const RBAC_RULES: Record<string, string[]> = {
  vendedor: ['/', '/ventas/nueva', '/api'], // Puede ver inventario y vender
  almacenero: ['/', '/productos', '/productos/nuevo', '/categorias', '/proveedores', '/api'], // Puede gestionar inventario
  admin: ['*'] // Acceso total
};

function hasAccess(rol: string, path: string): boolean {
  if (rol === 'admin') return true;
  
  const rules = RBAC_RULES[rol] || [];
  
  return rules.some(rule => {
    if (rule === '*') return true;
    if (rule.endsWith('/*')) {
      const base = rule.slice(0, -2);
      return path.startsWith(base);
    }
    // Para rutas específicas o bases amplias
    if (path === rule || (path.startsWith(rule + '/') && rule !== '/')) {
      return true;
    }
    // Especial para home '/'
    if (rule === '/' && path === '/') return true;
    
    return false;
  });
}

// Simulamos la decodificación de JWT base64 (payload) ya que Astro middleware se ejecuta
// en edge/node sin hono/jwt directo a menos que importemos crypto nativo, 
// lo haremos de forma simple parseando la sección payload del JWT:
function decodeJWTPayload(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch(e) {
    return null;
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // Evitar interceptar el login o los estáticos directos (si los hubiera)
  const isAuthRoute = path.startsWith('/login') || path === '/login';
  
  // Extraer token
  const token = context.cookies.get('auth_token')?.value;

  if (!token) {
    if (path.startsWith('/api') && !path.startsWith('/api/auth')) {
      return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (!isAuthRoute && !path.startsWith('/api/auth')) {
      return context.redirect('/login');
    }
    return next();
  }

  // Parsear token
  const payload = decodeJWTPayload(token);

  if (!payload || (payload.exp && Date.now() >= payload.exp * 1000)) {
    // Token inválido o expirado
    context.cookies.delete('auth_token', { path: '/' });
    if (path.startsWith('/api') && !path.startsWith('/api/auth')) {
      return new Response(JSON.stringify({ success: false, error: 'Sesión expirada' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (!isAuthRoute && !path.startsWith('/api/auth')) {
      return context.redirect('/login');
    }
    return next();
  }

  // Inyectar usuario en locals
  context.locals.user = {
    id: payload.id,
    nombre_real: payload.nombre_real,
    username: payload.username,
    rol: payload.rol
  };

  // Redirigir si intenta ir al login estando autenticado
  if (isAuthRoute) {
    return context.redirect('/');
  }

  // Verificar Permisos (RBAC) exceptuando las APIs (las APIs se autoprotegen)
  if (!path.startsWith('/api')) {
    const canAccess = hasAccess(payload.rol, path);
    if (!canAccess) {
      // Si intenta ir a algún lugar prohibido, mandarlo al index con alerta
      return context.redirect('/?error=forbidden');
    }
  }

  return next();
});
