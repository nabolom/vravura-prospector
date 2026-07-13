# GitHub, dominio y autenticación

## Estado actual

- Aplicación desplegada en Sites con D1 y acceso privado mediante ChatGPT.
- El repositorio local todavía no tiene un remoto de GitHub configurado.
- Los usuarios previstos para el futuro magic link son exclusivamente:
  - `leon.ruiz17@gmail.com`
  - `milo@vravura.com`

## Publicación en GitHub

No se requiere compartir un Personal Access Token. Las opciones seguras son conectar la cuenta de GitHub en la aplicación o autenticar Git en el equipo y proporcionar la URL del repositorio vacío.

Antes del primer push:

1. Crear un repositorio privado, por ejemplo `vravura-prospector`.
2. Compartir únicamente su URL HTTPS o SSH.
3. Confirmar que `.env*`, tokens, archivos locales de Wrangler y builds están ignorados.
4. Ejecutar build, pruebas, lint y TypeScript.
5. Agregar el remoto y publicar la rama principal.

## Dominio personalizado

Sites permite conectar un dominio propio sin mover todavía la aplicación. Se recomienda un subdominio como `prospector.vravura.com`, manteniendo el dominio principal separado del producto interno.

El hostname final debe definirse antes de activar magic links porque se registra como URL autorizada de redirección.

## Migración a magic link

La barrera nativa de Sites usa ChatGPT. Para sustituirla por magic links se requiere autenticación propia dentro de la aplicación:

1. Crear un proyecto Supabase Auth separado del Supabase usado por ARL.
2. Configurar el hostname final como Site URL y redirect URL autorizada.
3. Implementar la pantalla de acceso y callback de magic link.
4. Guardar la sesión en cookies seguras `HttpOnly`, `Secure` y `SameSite=Lax`.
5. Validar la sesión y la allowlist en todas las APIs, no sólo en la interfaz.
6. Rechazar cualquier correo distinto de los dos autorizados.
7. Probar login, expiración, cierre de sesión y acceso directo a APIs.
8. Sólo después cambiar el acceso de Sites a público para que el login propio pueda mostrarse.

No debe reutilizarse el Supabase actual de ARL para autenticación hasta cerrar sus políticas de lectura anónima.

## Variables esperadas

Consultar `.env.example`. Los valores reales se administran como secretos del proveedor de hosting y nunca se versionan.

## Checklist de salida

- [ ] Repositorio privado creado y conectado.
- [ ] Dominio o subdominio final confirmado.
- [ ] Proyecto Supabase Auth separado creado.
- [ ] Redirect URLs configuradas.
- [ ] Magic link verificado con ambos correos.
- [ ] Correo no autorizado rechazado.
- [ ] Todas las APIs devuelven `401` sin sesión.
- [ ] RLS del Supabase ARL corregido.
- [ ] Backup y exportación de D1 realizados antes de migrar hosting.
