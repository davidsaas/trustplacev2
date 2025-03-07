import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
});

export async function POST(req: Request) {
  try {
    const { userId, email, returnUrl } = await req.json();
    console.log('Creating checkout for user:', userId);

    if (!userId || !email || !returnUrl) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, email, or returnUrl' 
      }, { status: 400 });
    }

    // Create or get Stripe customer
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'TrustPlace Premium Subscription',
              description: 'Access to premium safety features and reports',
            },
            unit_amount: 999, // $9.99 in cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: returnUrl,
      metadata: {
        userId,
      },
    });

    // Return the checkout URL
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to create checkout session' 
    }, { status: 500 });
  }
} 