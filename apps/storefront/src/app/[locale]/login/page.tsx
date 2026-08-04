import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage() {
  const locale = await getLocale()
  return (
    <div className="bg-paper min-h-screen flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="serif text-3xl text-ink mb-2">Welcome Back</h1>
          <p className="text-stone">Sign in to your Yala Haji account</p>
        </div>
        <LoginForm locale={locale} />
        <p className="text-center text-sm text-stone mt-6">
          New to Yala Haji?{' '}
          <Link href={`/${locale}/register`} className="text-green font-semibold hover:underline">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  )
}
