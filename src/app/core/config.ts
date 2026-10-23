// URL del backend de Florece. Para desarrollo se puede apuntar a otro backend guardando
// la dirección en el navegador: localStorage.setItem('florece.apiUrl', 'http://localhost:3000')
const PRODUCTION_API_URL = 'https://florece-production-eb6c.up.railway.app';

function readOverride(): string | null {
  try {
    return localStorage.getItem('florece.apiUrl');
  } catch {
    return null;
  }
}

export const API_URL = readOverride() ?? PRODUCTION_API_URL;
