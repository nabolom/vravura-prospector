import { redirect } from "next/navigation";
import { getSessionUser, safeReturnPath } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  if (await getSessionUser()) redirect("/");
  const params = await searchParams;
  const returnTo = safeReturnPath(params.returnTo);

  return (
    <main className="login-shell">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand" aria-hidden="true">V</div>
        <p className="login-eyebrow">VRAVURA · INTELIGENCIA COMERCIAL</p>
        <h1 id="login-title">Acceso privado</h1>
        <p className="login-intro">Ingresa las credenciales internas para continuar al Prospector.</p>
        {params.error === "credentials" ? (
          <p className="login-error" role="alert">Usuario o contraseña incorrectos.</p>
        ) : null}
        {params.error === "config" ? (
          <p className="login-error" role="alert">El acceso aún no está configurado en el servidor.</p>
        ) : null}
        <form className="login-form" action="/api/auth/login" method="post">
          <input type="hidden" name="returnTo" value={returnTo} />
          <label htmlFor="email">Usuario</label>
          <input id="email" name="email" type="email" autoComplete="username" required autoFocus />
          <label htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          <button type="submit">Entrar al Prospector</button>
        </form>
        <p className="login-footnote">Uso exclusivo del equipo VRAVURA.</p>
      </section>
    </main>
  );
}
