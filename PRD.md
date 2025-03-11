# Airbnb Safety Report - Product Requirements Document

## Overview
The Airbnb Safety Report tool allows users to input an Airbnb listing URL for a location in NYC or LA and receive a comprehensive safety report. The tool analyzes the safety features of the listing, provides safety metrics from OpenStreetMap, extracts safety-related reviews, and suggests safer alternatives at similar price points.

## Problem Statement
Travelers are often concerned about the safety of their accommodations when booking on Airbnb, especially in large cities like NYC and LA. Currently, there is no easy way to:
1. Assess the safety of an Airbnb listing based on location
2. Find safety-focused reviews from previous guests
3. Compare safety metrics with other similar properties in the area
4. Make informed decisions about accommodation safety

## Target Users
- Travelers planning trips to NYC or LA
- Safety-conscious individuals
- Families with children or elderly members
- Solo travelers, especially women
- First-time visitors to NYC or LA

## User Interface

### Landing Page
1. Modern, clean design with emphasis on safety and trust
2. Hero section featuring:
   - Dynamic safety status indicators (Safe Areas, Risk Zones, Danger Spots)
   - Search bar for property/location input
   - Floating safety tags showing different safety aspects
3. Partner logos section showing data sources (Reddit, TripAdvisor, Airbnb, Booking.com)
4. Testimonials from real users
5. Interactive safety map preview
6. Popular destinations section featuring NYC and LA
7. FAQ section for common user questions

### Authentication Pages
1. Clean, minimalist login/signup pages
2. Support for:
   - Email/password authentication
   - Google OAuth integration
   - Password reset functionality
3. Clear navigation with "Back to homepage" option
4. Error handling and validation

## User Flows

### Main User Flow
1. User lands on the home page
2. User signs up/logs in via Supabase Auth
3. User is directed to the home page with a search input
4. User pastes an Airbnb listing URL
5. System processes the URL and generates a safety report
6. User views the safety report with metrics, reviews, and alternatives
7. User can save the report

### Authentication Flow
1. User clicks "Sign Up" or "Log In" on the landing page
2. User completes the Supabase authentication process
3. User is redirected back to the application
4. System records the user's authentication status

## Feature Requirements

### MVP Features
1. **User Authentication**
   - Sign up with email/password
   - Login with existing credentials
   - Social login options (Google)
   - Password reset functionality

2. **URL Input and Processing**
   - Input field for Airbnb listing URL
   - Validation of URL format and listing location (NYC or LA only)
   - Processing indicator during data retrieval

3. **Safety Report Generation**
   - Extract listing information from Airbnb
   - Retrieve OSM-based safety metrics for the listing location
   - Extract and analyze safety-related reviews
   - Find alternative listings with better safety ratings

4. **Safety Report Display**
   - Listing image and basic information
   - Safety score based on multiple factors
   - Map view of the area with safety overlay
   - Safety-related reviews highlighted
   - Alternative listings with better safety scores

5. **Report Management**
   - Save reports for future reference
   - Compare multiple properties
   - View saved report history<>

6. **Additional Safety Analysis**
   - Comprehensive safety metrics for the neighborhood
   - Historical safety trends where available
   - Night vs. day safety comparison

## Technical Requirements

### Frontend
- Next.js 14 with TypeScript
- Shadcn UI components
- Mobile-first responsive design
- Maplibre GL for map visualizations
- Tailwind CSS for styling

### Backend
- Next.js API routes
- Supabase for authentication and database
- External APIs for data retrieval (Airbnb, OSM, etc.)

### Authentication & Database
- Supabase Auth for user management
- Supabase Database for storing:
  - User profiles
  - Saved reports
  - Usage metrics

## Milestones
1. ✅ Project setup and basic structure
2. ✅ Authentication implementation
3. ✅ Landing page and UI components
4. URL input and basic data retrieval
5. Safety report generation logic
6. Report UI implementation
7. Testing and refinement
8. Launch

## Analytics & Metrics
- User signup rate
- Search volume
- Popular listing areas
- Average time on site
- Retention metrics

## Future Enhancements
- Additional city support beyond NYC and LA
- API access for partners
- Mobile app versions
- Safety alerts for neighborhoods
- Community-contributed safety information
- Integration with travel planning tools

## Technical Architecture
- Next.js for frontend and API routes
- Supabase for authentication and database
- Maplibre GL for map visualizations
- External APIs:
  - Airbnb data (via API or scraping)
  - OpenStreetMap for location data
  - Safety data sources

## Design System
- Color Palette:
  - Brand color: #FF385C (TrustPlace Pink)
  - Safety indicators:
    - Green: Safe Areas
    - Orange: Risk Zones
    - Red: Danger Spots
- Typography:
  - Inter font family
  - Clear hierarchy with varying weights
- Components:
  - Shadcn UI base components
  - Custom safety indicators
  - Interactive maps
  - Search inputs
  - Safety report cards 