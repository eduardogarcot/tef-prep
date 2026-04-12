'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/practice', label: 'Practice' },
  { href: '/analytics', label: 'Analytics' },
]

export function Navbar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-30 h-14 bg-white border-b border-gray-200 flex items-center px-4">
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-6">

        {/* Brand */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 shrink-0"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white">
            T
          </span>
          <span className="text-sm font-semibold text-gray-900 hidden sm:block">TEF Prep</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#EFF6FF] text-[#2563EB]'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* User + sign out */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:block text-xs text-gray-400 max-w-[160px] truncate">
            {userEmail}
          </span>
          <button
            onClick={signOut}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:border-gray-300 hover:text-gray-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
