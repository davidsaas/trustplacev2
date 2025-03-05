import { Purchases } from '@revenuecat/purchases-js';

// Initialize RevenueCat with your public SDK key (You'll need to replace this with your actual key)
export const initializeRevenueCat = (userId: string) => {
  try {
    // The WEB_BILLING_PUBLIC_API_KEY will need to be obtained from RevenueCat dashboard
    return Purchases.configure('YOUR_WEB_BILLING_PUBLIC_API_KEY', userId);
  } catch (error) {
    console.error('Error initializing RevenueCat:', error);
    return null;
  }
};

// Get the current subscription status
export const getCurrentSubscriptionStatus = async () => {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return null;
  }
}; 