import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
});

export async function POST(req: Request) {
  try {
    const { userId, returnUrl } = await req.json();
    console.log('Received request for user ID:', userId);

    const supabase = createRouteHandlerClient({ cookies });

    // Get the user's details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json({ error: `User not found: ${userError.message}` }, { status: 404 });
    }

    if (!user) {
      console.log('No user found for ID:', userId);
      
      // Try to create the user record if it doesn't exist
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) {
        return NextResponse.json({ error: 'No authenticated user found' }, { status: 401 });
      }

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: authUser.user.email,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user record:', createError);
        return NextResponse.json({ error: `Failed to create user record: ${createError.message}` }, { status: 500 });
      }

      user = newUser;
    }

    // If no Stripe customer ID, create one
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      console.log('Creating new Stripe customer for user:', userId);
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId,
        },
      });
      customerId = customer.id;

      // Update user with Stripe customer ID
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    console.log('Creating checkout session for customer:', customerId);
    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
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

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 