import { supabaseAdmin } from '../../../../lib/supabase'

export async function POST(req) {
  try {
    const { name, email, department, phone, password } = await req.json()
    if (!name || !email || !department) return Response.json({ success: false, error: 'Name, email and department are required' }, { status: 400 })

    const admin = supabaseAdmin()

    // Check if email already exists
    const { data: existing } = await admin.from('users').select('id').eq('email', email.toLowerCase()).single()
    if (existing) return Response.json({ success: false, error: 'Email already registered' }, { status: 400 })

    // Create auth user
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password || Math.random().toString(36).slice(-10) + 'Aa1!',
      email_confirm: true,
    })
    if (authErr) return Response.json({ success: false, error: authErr.message }, { status: 400 })

    // Create profile
    const { data: profile, error: profileErr } = await admin.from('users').insert({
      id:         authUser.user.id,
      name:       name.trim(),
      email:      email.toLowerCase().trim(),
      role:       'faculty',
      department: department.trim(),
      phone:      phone?.trim() || null,
    }).select().single()

    if (profileErr) {
      await admin.auth.admin.deleteUser(authUser.user.id)
      return Response.json({ success: false, error: profileErr.message }, { status: 400 })
    }

    return Response.json({ success: true, faculty: profile })
  } catch (e) {
    return Response.json({ success: false, error: e.message }, { status: 500 })
  }
}
