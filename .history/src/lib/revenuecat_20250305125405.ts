import * as Purchases from '@revenuecat/purchases-js';

// Initialize RevenueCat with your public SDK key (You'll need to replace this with your actual key)
export const initializeRevenueCat = (userId: string) => {
  try {
    // The WEB_BILLING_PUBLIC_API_KEY will need to be obtained from RevenueCat dashboard
    const purchases = Purchases.configure('YOUR_WEB_BILLING_PUBLIC_API_KEY', userId);
    return purchases;
  } catch (error) {
    console.error('Error initializing RevenueCat:', error);
    return null;
  }
};

// Get the current subscription status
export const getCurrentSubscriptionStatus = async () => {
  try {
    const purchases = Purchases.getSharedInstance();
    const customerInfo = await purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return null;
  }
}; 