import Stripe from 'stripe';
import { supabase } from './supabase';
import { Database } from './supabase-types';

type UserDetails = Database['public']['Tables']['users']['Row'];

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
});

/**
 * Create a Stripe customer for a user
 */
export const createStripeCustomer = async (userId: string, email: string): Promise<string> => {
  try {
    // Create the customer in Stripe
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId,
      },
    });

    // Update the user with the Stripe customer ID
    await supabase
      .from('users')
      .update({ stripe_customer_id: customer.id })
      .eq('id', userId);

    return customer.id;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
};

/**
 * Create a checkout session for premium subscription
 */
export const createCheckoutSession = async (userId: string, returnUrl: string): Promise<string> => {
  try {
    const response = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, returnUrl }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create checkout session');
    }

    return data.url;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

/**
 * Handle successful subscription
 */
export const handleSuccessfulSubscription = async (sessionId: string): Promise<void> => {
  try {
    // Retrieve the session details
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (!session.metadata?.userId) {
      throw new Error('User ID missing from session metadata');
    }

    const userId = session.metadata.userId;
    const subscriptionId = session.subscription as string;

    // Update the user with premium details
    await supabase
      .from('users')
      .update({
        is_premium: true,
        premium_since: new Date().toISOString(),
        premium_until: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // 30 days from now
        stripe_subscription_id: subscriptionId,
      })
      .eq('id', userId);
  } catch (error) {
    console.error('Error handling successful subscription:', error);
    throw error;
  }
};

/**
 * Cancel a subscription
 */
export const cancelSubscription = async (userId: string): Promise<void> => {
  try {
    // Get the user's details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user || !user.stripe_subscription_id) {
      throw new Error('User or subscription not found');
    }

    // Cancel the subscription in Stripe
    await stripe.subscriptions.cancel(user.stripe_subscription_id);

    // Update the user record
    await supabase
      .from('users')
      .update({
        is_premium: false,
        premium_until: new Date().toISOString(), // End premium now
      })
      .eq('id', userId);
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
};

/**
 * Check if a user has premium access
 */
export const checkPremiumStatus = async (userId: string): Promise<boolean> => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) return false;

    // Check if user is premium and subscription is still valid
    return (
      user.is_premium &&
      user.premium_until &&
      new Date(user.premium_until) > new Date()
    );
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
}; 