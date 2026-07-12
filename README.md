# VRAVURA Prospector

MVP web privado para descubrir, priorizar y convertir organizaciones mexicanas mediante el diagnóstico ARL.

## Capacidades

- Explorador de empresas con búsqueda y filtros por estado, sector, tamaño y score.
- Fichas de prospecto con canales empresariales publicados.
- Enlaces ARL individuales con atribución mediante `lead_id`.
- Campañas y etapas comerciales persistidas en D1.
- Base demostrativa inicial y arquitectura preparada para la carga DENUE 05/2026.
- Importaciones paginadas desde la API oficial DENUE con progreso persistente.
- Normalización, deduplicación y score explicable calculado en servidor.

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
```

La carga nacional real requiere el token de la API DENUE o los archivos ZIP oficiales de INEGI. El sitio ARL debe conservar `lead_id` y los parámetros UTM junto con cada diagnóstico completado.

El token debe configurarse como secreto `DENUE_TOKEN`; nunca se envía al navegador. La primera importación real retira automáticamente los registros demostrativos.
