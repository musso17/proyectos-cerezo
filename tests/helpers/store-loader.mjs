// Carga el store con Supabase y toast simulados:
// `node --import ./tests/helpers/store-loader.mjs …`.
import { register } from 'node:module';

const fakeSupabase = new URL('./fakeSupabaseClient.mjs', import.meta.url).href;
const fakeToast = new URL('./fakeToast.mjs', import.meta.url).href;

register(
  'data:text/javascript,' +
    encodeURIComponent(`
      export async function resolve(specifier, context, next) {
        if (/config\\/supabase$/.test(specifier)) return { url: ${JSON.stringify(fakeSupabase)}, shortCircuit: true };
        if (specifier === 'react-hot-toast') return { url: ${JSON.stringify(fakeToast)}, shortCircuit: true };
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
