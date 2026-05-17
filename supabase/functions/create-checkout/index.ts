// Stripe Checkout Edge Function
// TODO: Activate when STRIPE_SECRET_KEY is set in Supabase dashboard
//
// Setup steps:
// 1. Set secrets: supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
// 2. Deploy: supabase functions deploy create-checkout
// 3. Set VITE_STRIPE_PUBLISHABLE_KEY in .env
// 4. Wire createCheckoutSession() in src/lib/stripe.ts
//
// import Stripe from 'https://esm.sh/stripe@14'
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
//
// Deno.serve(async (req) => {
//   const { price_id, return_url } = await req.json()
//   const authHeader = req.headers.get('Authorization')!
//   const supabase = createClient(
//     Deno.env.get('SUPABASE_URL')!,
//     Deno.env.get('SUPABASE_ANON_KEY')!,
//     { global: { headers: { Authorization: authHeader } } }
//   )
//   const { data: { user } } = await supabase.auth.getUser()
//   if (!user) return new Response('Unauthorized', { status: 401 })
//
//   const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
//   const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).single()
//
//   let customerId = profile?.stripe_customer_id
//   if (!customerId) {
//     const customer = await stripe.customers.create({ email: user.email!, metadata: { supabase_user_id: user.id } })
//     customerId = customer.id
//     await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
//   }
//
//   const session = await stripe.checkout.sessions.create({
//     customer: customerId,
//     mode: 'subscription',
//     line_items: [{ price: price_id, quantity: 1 }],
//     success_url: `${return_url}#/settings?upgrade=success`,
//     cancel_url: `${return_url}#/pricing`,
//   })
//
//   return new Response(JSON.stringify({ url: session.url }), {
//     headers: { 'Content-Type': 'application/json' }
//   })
// })

Deno.serve(() => new Response(JSON.stringify({ error: "Stripe not configured" }), {
  status: 503,
  headers: { "Content-Type": "application/json" },
}));
