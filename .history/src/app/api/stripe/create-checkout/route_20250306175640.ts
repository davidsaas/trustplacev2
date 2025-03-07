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

    // First, verify the authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (authUser.id !== userId) {
      console.error('User ID mismatch:', { authUserId: authUser.id, requestedUserId: userId });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get or create user record
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.log('Creating new user record for:', userId);
      
      // Create new user record
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: authUser.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user record:', createError);
        return NextResponse.json(
          { error: `Failed to create user record: ${createError.message}` },
          { status: 500 }
        );
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
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user with Stripe customer ID:', updateError);
        return NextResponse.json(
          { error: 'Failed to update user with Stripe customer ID' },
          { status: 500 }
        );
      }
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