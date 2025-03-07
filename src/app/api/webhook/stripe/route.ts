import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const body = await req.text();
    const signature = req.headers.get('stripe-signature') as string;

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Get the user with this customer ID
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();
        
        if (userError) {
          console.error('Error fetching user:', userError);
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        // Update user's premium status
        const isActive = subscription.status === 'active';
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        
        await supabase
          .from('users')
          .update({
            is_premium: isActive,
            premium_since: isActive ? new Date().toISOString() : null,
            premium_until: isActive ? currentPeriodEnd : null,
            stripe_subscription_id: subscription.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
        
        break;
        
      case 'customer.subscription.deleted':
        const cancelledSubscription = event.data.object as Stripe.Subscription;
        const cancelledCustomerId = cancelledSubscription.customer as string;
        
        // Get the user with this customer ID
        const { data: cancelledUser, error: cancelledUserError } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', cancelledCustomerId)
          .single();
        
        if (cancelledUserError) {
          console.error('Error fetching user:', cancelledUserError);
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        // Update user's premium status
        await supabase
          .from('users')
          .update({
            is_premium: false,
            premium_until: new Date().toISOString(), // End premium now
            updated_at: new Date().toISOString(),
          })
          .eq('id', cancelledUser.id);
          
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
} 