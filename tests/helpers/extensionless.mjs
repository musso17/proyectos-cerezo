// Permite importar módulos de src/ que usan rutas sin extensión (estilo Next.js)
// desde las pruebas en Node: `node --import ./tests/helpers/extensionless.mjs …`.
import { register } from 'node:module';

register(
  'data:text/javascript,' +
    encodeURIComponent(`
      export async function resolve(specifier, context, next) {
        try {
          return await next(specifier, context);
        } catch (error) {
          // Rutas relativas sin extensión (estilo Next) y subrutas de paquetes
          // sin "exports" como next/server.
          if (!/\\.[cm]?js$/.test(specifier) && !specifier.startsWith('node:')) {
            for (const suffix of ['.js', '/index.js']) {
              try { return await next(specifier + suffix, context); } catch {}
            }
          }
          throw error;
        }
      }
    `),
  import.meta.url
);
