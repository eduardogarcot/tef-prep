import { redirect } from 'next/navigation'

// The root URL is not a real page — middleware will redirect to /login or
// /dashboard based on session, but as a fallback we redirect to /dashboard here.
export default function RootPage() {
  redirect('/dashboard')
}
