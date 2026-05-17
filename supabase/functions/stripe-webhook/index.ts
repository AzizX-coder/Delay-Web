// Stripe Webhook Handler Edge Function
// TODO: Activate when Stripe is configured
//
// Setup steps:
// 1. supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
// 2. supabase functions deploy stripe-webhook
// 3. Register webhook URL in Stripe dashboard:
//    https://<project>.supabase.co/functions/v1/stripe-webhook
//    Events: customer.subscription.created, customer.subscription.updated,
//            customer.subscription.deleted, checkout.session.completed
//
// import Stripe from 'https://esm.sh/stripe@14'
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
//
// const PRICE_TO_PLAN: Record<string, string> = {
//   'price_pro_monthly': 'pro',
//   'price_max_monthly': 'max',
// }
//
// Deno.serve(async (req) => {
//   const body = await req.text()
//   const sig = req.headers.get('stripe-signature')!
//   const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
//   let event: Stripe.Event
//   try {
//     event = stripe.webhooks.constructEvent(body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET')!)
//   } catch {
//     return new Response('Webhook signature invalid', { status: 400 })
//   }
//
//   const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
//
//   if (event.type === 'checkout.session.completed') {
//     const session = event.data.object as Stripe.Checkout.Session
//     const customerId = session.customer as string
//     const sub = await stripe.subscriptions.retrieve(session.subscription as string)
//     const priceId = sub.items.data[0].price.id
//     const plan = PRICE_TO_PLAN[priceId] ?? 'pro'
//     await supabase.from('profiles').update({ plan, subscription_id: sub.id, subscription_status: sub.status }).eq('stripe_customer_id', customerId)
//   }
//
//   if (event.type === 'customer.subscription.updated') {
//     const sub = event.data.object as Stripe.Subscription
//     const priceId = sub.items.data[0].price.id
//     const plan = sub.status === 'active' ? (PRICE_TO_PLAN[priceId] ?? 'pro') : 'free'
//     await supabase.from('profiles').update({ plan, subscription_status: sub.status, subscription_period_end: new Date(sub.current_period_end * 1000).toISOString() }).eq('stripe_customer_id', sub.customer as string)
//   }
//
//   if (event.type === 'customer.subscription.deleted') {
//     const sub = event.data.object as Stripe.Subscription
//     await supabase.from('profiles').update({ plan: 'free', subscription_status: 'canceled', subscription_id: null }).eq('stripe_customer_id', sub.customer as string)
//   }
//
//   return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
// })

Deno.serve(() => new Response(JSON.stringify({ error: "Stripe not configured" }), {
  status: 503,
  headers: { "Content-Type": "application/json" },
}));
