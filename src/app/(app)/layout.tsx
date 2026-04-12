import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { Navbar } from '@/components/Navbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar userEmail={user.email ?? ''} />
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  )
}
