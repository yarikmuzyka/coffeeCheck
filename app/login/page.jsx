import { redirect } from 'next/navigation'
import { getCurrentUser } from '../../lib/auth.js'
import { GoogleSignInButton } from '../components/GoogleSignInButton.jsx'
import { LogoMark } from '../components/LogoMark.jsx'

const ERROR_MESSAGES = {
  OAuthAccountNotLinked: 'Ця адреса вже привʼязана до іншого способу входу.',
  OAuthCallback: 'Google не зміг завершити вхід. Спробуй ще раз.',
  AccessDenied: 'Доступ до акаунта не підтверджено.',
  Configuration: 'Авторизація ще не налаштована на сервері.',
}

export default async function LoginPage({ searchParams }) {
  if (await getCurrentUser()) redirect('/dashboard')

  const params = await searchParams
  const error = params.error ? (ERROR_MESSAGES[params.error] ?? 'Не вдалося увійти.') : null

  return (
    <section className="login-shell">
      <div className="card login-card">
        <div className="login-brand">
          <LogoMark className="login-logo-mark" />
          <span>coffee logger</span>
        </div>
        <h1>Твоя кава. Твої рецепти.</h1>
        <p className="sub">Увійди, щоб вести власний журнал заварювань.</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <GoogleSignInButton />
      </div>
    </section>
  )
}
