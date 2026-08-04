import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { RegisterForm } from '@/components/auth/register-form'

export default async function RegisterPage() {
  const locale = await getLocale()
  return (
    <div className="bg-paper min-h-screen flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="serif text-3xl text-ink mb-2">Create Account</h1>
          <p className="text-stone">Join thousands preparing for Hajj & Umrah</p>
        </div>
        <RegisterForm locale={locale} />
        <p className="text-center text-sm text-stone mt-6">
          Already have an account?{' '}
          <Link href={`/${locale}/login`} className="text-green font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
