import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  if (body.type === 'LESSON')
    return NextResponse.json({ error: '레슨은 레슨 일정에서 등록하세요' }, { status: 400 })
  const { error } = await getAdmin().from('court_reservations').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await getAdmin().from('court_reservations').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
