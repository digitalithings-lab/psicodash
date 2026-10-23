# Florece · Panel web

Panel para psicólogos y administración de Florece. Angular 22 + Tailwind CSS 4.

## Qué incluye

**Psicólogos**
- Inicio: código de vinculación, citas de hoy, solicitudes por confirmar, respuestas recientes y alertas de riesgo.
- Pacientes: lista con avance semanal y ficha de cada paciente (retos asignados, respuestas y citas).
- Retos: crear, editar y archivar retos por paciente, con días de la semana; definir cuántos retos automáticos recibe al día.
- Agenda: citas (confirmar con enlace de videollamada, cancelar, completar), horario semanal y bloqueos.
- Mi perfil: datos profesionales, duración y precio de la sesión, código de vinculación.

**Administración** (correos incluidos en `ADMIN_EMAILS` del backend)
- Resumen, psicólogos (verificar o suspender), catálogo de retos, líneas de ayuda por país y alertas de riesgo.

## Desarrollo

Requiere Node 22.22.3 o superior (recomendado Node 24).

```bash
npm install
npm start
```

Abre http://localhost:4200.

Por defecto usa el backend de producción en Railway. Para apuntar a otro backend, ejecuta en la consola del navegador:

```js
localStorage.setItem('florece.apiUrl', 'http://localhost:3000');
```

y recarga. Para volver a producción: `localStorage.removeItem('florece.apiUrl')`.

## Compilar

```bash
npm run build
```

El resultado queda en `dist/panel/browser`, listo para publicarse como sitio estático. El servidor debe redirigir todas las rutas a `index.html`.

## Notas

- En discos externos, macOS crea archivos ocultos `._*`; están en `.gitignore`.
- Si `ng new`/`ng add` fallan con `Option "_dot" is not defined`, usa una caché de npm en el disco interno: `npm_config_cache=/tmp/npm-cache`.
