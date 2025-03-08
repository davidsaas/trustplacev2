# AirSafe - Airbnb Safety Report Tool

AirSafe is a web application that helps travelers make informed decisions about their accommodations by providing comprehensive safety reports for Airbnb listings in NYC and LA.

## Features

- **User Authentication**: Secure signup and login with Supabase Auth
- **Airbnb URL Analysis**: Input any Airbnb listing URL from NYC or LA 
- **Comprehensive Safety Reports**:
  - Listing information and safety score
  - OSM-based safety metrics for the neighborhood
  - Safety-related reviews from previous guests
  - Safer alternatives at similar price points
- **Premium Subscription**:
  - Detailed safety metrics and analysis
  - Unlimited saved reports
  - Priority access to new features
  - Integration with Stripe for payment processing

## Tech Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS, Shadcn UI
- **Authentication & Database**: Supabase
- **Map Visualization**: MapLibre GL
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A Supabase account and project
- A Stripe account for premium subscriptions

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/airsafe.git
   cd airsafe
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file in the root directory and add your credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   ```

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
├── src/
│   ├── app/                  # Next.js app router
│   │   ├── api/              # API routes
│   │   ├── auth/             # Auth-related routes
│   │   ├── dashboard/        # Dashboard page
│   │   ├── login/            # Login page
│   │   ├── premium/          # Premium subscription page
│   │   ├── report/           # Safety report page
│   │   ├── signup/           # Signup page
│   │   ├── globals.css       # Global styles
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Landing page
│   ├── components/           # Reusable components
│   │   ├── providers/        # Context providers
│   │   └── ui/               # UI components (shadcn)
│   └── lib/                  # Utility functions and configs
│       ├── supabase.ts       # Supabase client
│       └── stripe.ts         # Stripe utilities
├── public/                   # Static assets
└── PRD.md                    # Product Requirements Document
```

## Deployment

The application can be deployed to Vercel:

1. Push your code to a GitHub repository
2. Connect your repository to Vercel
3. Add your environment variables
4. Deploy!

## Future Enhancements

- Support for additional cities
- Integration with crime statistics APIs
- User feedback on safety reports
- Mobile app versions
- Community-contributed safety information
- Tiered premium subscription levels

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Shadcn UI for the component library
- Supabase for authentication and database
- MapLibre GL for map visualizations
- Stripe for payment processing