import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')

  console.log('CALLBACK - code:', code)
  console.log('CALLBACK - token_hash:', token_hash)
  console.log('CALLBACK - type:', type)
  console.log('CALLBACK - full URL:', request.url)

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type })
    console.log('CALLBACK - verifyOtp data:', data)
    console.log('CALLBACK - verifyOtp error:', error)
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    console.log('CALLBACK - exchangeCode data:', data)
    console.log('CALLBACK - exchangeCode error:', error)
  } else {
    console.log('CALLBACK - ni code ni token_hash trouvé')
  }

  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
}