# VRAVURA Prospector

Aplicación privada para descubrir, priorizar y convertir organizaciones mexicanas mediante el diagnóstico ARL.

## Capacidades

- Explorador de empresas con búsqueda y filtros por estado, sector, tamaño y score.
- Fichas de prospecto con canales empresariales publicados.
- Enlaces ARL individuales con atribución mediante `lead_id`.
- Campañas persistidas en D1, con creación, integrantes y eliminación segura.
- Carga de bases propias mediante CSV y deduplicación contra DENUE.
- Importaciones paginadas desde la API oficial DENUE con progreso persistente.
- Normalización, deduplicación y score explicable calculado en servidor.
- Score combinado de potencial firmográfico e intención ARL.
- Acceso privado actual mediante Sign in with ChatGPT.
- Interfaz responsive, navegación por anclas y regreso flotante al inicio.

## Desarrollo

```bash
npm install
npm run dev
```

## Validación

```bash
npm run db:generate
npm run build
npm test
npm run lint
npx tsc --noEmit
```

La carga nacional real requiere el token de la API DENUE o los archivos ZIP oficiales de INEGI. El sitio ARL debe conservar `lead_id` y los parámetros UTM junto con cada diagnóstico completado.

El token debe configurarse como secreto `DENUE_TOKEN`; nunca se envía al navegador. La primera importación real retira automáticamente los registros demostrativos.

## GitHub, dominio y magic link

La guía de migración, variables y controles de seguridad está en [`docs/GITHUB_DOMAIN_AUTH.md`](docs/GITHUB_DOMAIN_AUTH.md). No se deben pegar tokens personales de GitHub ni credenciales de servidor en commits, issues o chats.
