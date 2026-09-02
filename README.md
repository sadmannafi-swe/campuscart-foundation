# DIU CampusCart Foundation

Build the initial foundation of a modern, responsive multi-vendor university marketplace called DIU CampusCart.

IMPORTANT:

Do not build the entire application in this prompt.

This is Phase 1 only.

Focus on project architecture, visual design system, reusable components, responsive layout, and basic public pages.

Do not add fake backend logic or fake authentication.

Keep the codebase clean, modular, scalable, and easy to extend in future phases.

BRAND

Product name:
DIU CampusCart

Tagline:
"Your Campus. Your Marketplace."

I have an existing DIU CampusCart logo. I will upload the logo to Lovable. Use the uploaded logo as the official brand logo. Do not redesign or replace it.

The logo uses blue and green. Build the overall design system around the logo's blue/green identity while keeping the UI modern and clean.

DESIGN DIRECTION

The UI should feel like a professional modern e-commerce marketplace designed specifically for university students.

Reference style:

Clean

Modern

Minimal

Friendly

Professional

Student-focused

Premium but not overly flashy

Plenty of whitespace

Rounded cards

Subtle shadows

Clear typography

Strong visual hierarchy

Use the provided DIU CampusCart logo as the primary visual reference.

Do NOT make the website look like a generic template.

RESPONSIVE DESIGN

The website must be fully responsive.

Desktop/Laptop:

Wide content layout

Proper navigation/header

Sidebar where appropriate

Multi-column product grids

Tablet:

Adaptive layouts

Reduced columns

Comfortable spacing

Mobile:

Mobile-first responsive behavior

Compact header

Mobile search

Bottom navigation where appropriate

Cards optimized for small screens

No horizontal overflow

Buttons must be easy to tap

Do not simply shrink the desktop UI

Every page must work properly at:

Mobile

Tablet

Laptop

Large desktop

COLOR SYSTEM

Create reusable design tokens.

Primary:

DIU-inspired deep blue

Secondary/accent:

Fresh green

Supporting:

White

Very light gray backgrounds

Dark navy/gray text

Soft borders

Subtle neutral shadows

Use blue for primary actions and important navigation.
Use green selectively for success, active states, availability, and positive indicators.

Avoid excessive gradients.

TYPOGRAPHY

Use a modern, highly readable sans-serif font.

Headings:

Strong

Clean

Modern

Body:

Highly readable

Comfortable line height

Prices and important numbers should have strong visual hierarchy.

GLOBAL COMPONENTS

Create reusable components for:

Header

Logo

Search bar

Navigation

Category navigation

Buttons

Product card

Store card

Rating component

Badge

Status badge

Modal/dialog

Dropdown

Tabs

Breadcrumb

Pagination

Empty state

Loading state

Error state

Toast/notification

Footer

Mobile bottom navigation

Do not duplicate components unnecessarily.

INITIAL PUBLIC PAGES

Create the following pages with realistic UI content only for visual development:

1. Landing/Home page

Sections:

Header

Search

Hero section

Popular categories

Featured stores

Featured products

Trending products

New arrivals

Promotional section

Top-rated stores

Footer

The homepage should look like a real university marketplace.

2. Stores page

Show:

Search stores

Store cards

Store logo

Store name

Category

Rating

Number of products

Store status

3. Store details page

Show:

Store banner/logo

Store name

Rating

Description

Store information

Store categories

Products from that store

4. Products/search page

Show:

Search input

Categories

Filters

Sort options

Product grid

Product cards

Product card should include:

Product image

Product name

Price

Discount if available

Rating

Store name

Wishlist button

5. Product details page

Show:

Large product image

Product name

Price

Discount

Rating

Reviews count

Store information

Description

Available variants if applicable

Quantity selector

Add to Cart

Buy Now

Wishlist

NAVIGATION

Desktop header should contain:

DIU CampusCart logo

Search

Categories

Stores

Offers

New Arrivals

Wishlist

Cart

Account

Mobile header:

Logo

Search

Cart

Profile/menu

Mobile bottom navigation:

Home

Categories

Cart

Orders

Profile

IMPORTANT ARCHITECTURE RULES

Use:

React

TypeScript

Next.js-compatible architecture

Tailwind CSS

Reusable components

Keep business logic separate from UI components.

Do not hardcode the application architecture in a way that makes future Supabase integration difficult.

Prepare the project so that future phases can add:

Supabase authentication

Buyer accounts

Seller accounts

Admin accounts

Stores

Products

Orders

Reviews

Wishlist

Notifications

Seller subscriptions

Admin moderation

Featured content management

Do NOT implement those backend features yet.

QUALITY REQUIREMENTS

No broken links

No console errors

No TypeScript errors

No horizontal scrolling

Responsive on mobile and desktop

Accessible buttons and form controls

Consistent spacing

Consistent typography

Reusable components

Clean folder structure

At the end of this phase, provide a polished frontend foundation that looks like a real product, not a prototype.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8b804af4-58bb-4d66-bfc7-7c32cec05ae6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
