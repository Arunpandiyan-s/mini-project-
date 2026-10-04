# StayEase Guest Hub

Design a **mobile-first hotel guest web application** called **StayEase Guest Portal** for a Smart Hotel Operations Platform. The design should feel like a modern hotel mobile app, not a traditional multi-page website. Use a clean premium hospitality style with white, soft blue, gray, and subtle gold accents, rounded cards, large touch-friendly buttons, and simple navigation.

# IMPORTANT DESIGN RULE

Create only **3 main screens**:

1. Welcome / Login

2. Guest Dashboard (main app)

3. Pre-Registration

All other features must open inside the dashboard as **bottom sheets, slide-over panels, tabs, modals, or expandable cards**, not separate pages.

---

# SCREEN 1 – Welcome & Login

Show:

* Hotel logo

* Hero image

* Welcome text: “Your Stay, Simplified”

* Login with Email or Phone Number

* Password field

* Login button

* Register link

* Pre-Register Stay button

* Forgot Password link

Keep this screen centered and minimal.

---

# SCREEN 2 – Guest Dashboard (Main Application)

This is the primary screen after login. Everything should be accessible here.

## Top Header

Display:

* Guest profile photo

* Guest name

* Room number

* Check-in and check-out dates

* Notification bell icon

* Settings icon

Add a small “Current Stay Status” card showing room status and active requests.

---

## Quick Action Grid (2 columns)

Create large icon buttons:

* Request Service

* Housekeeping

* Maintenance

* Food Order

* Laundry

* Extra Bed

* Extra Towels

* Wake-Up Call

Tapping a button opens a **bottom sheet form** without leaving the dashboard.

---

## My Requests Section

Show recent requests as cards with:

* Request type

* Time submitted

* Current status

* Status color:

  * Gray = Pending

  * Blue = In Progress

  * Green = Completed

  * Red = Attention Needed

Include a “View All” button that opens a slide-over panel with full request history.

---

## Room Information Card (Expandable)

Collapsed by default. When expanded, show:

* Room type

* Wi-Fi name

* Wi-Fi password with copy button

* TV instructions

* AC instructions

* Water/utility information

* Emergency information

* Hotel policies

---

## Food Ordering Section

Inside the dashboard create horizontal category tabs:

* Breakfast

* Lunch

* Dinner

* Snacks

* Beverages

Show food cards with image, name, price, and Add button. Opening a food item should use a modal/cart drawer instead of a new page.

Include:

* Cart summary

* Place Order button

* Estimated delivery time

---

## Hotel Contacts Card

Show quick contact buttons:

* Reception

* Housekeeping

* Restaurant

* Maintenance

* Manager

* Emergency

Each button should support Call, WhatsApp, and Email actions.

---

## Feedback Card

Add a compact feedback section:

* 5-star rating

* Comment box

* Submit button

Submit should show a success toast message.

---

## Notifications Panel

The bell icon opens a right-side panel showing:

* Service assigned

* Maintenance on the way

* Food order dispatched

* Housekeeping completed

* Checkout reminder

Include unread indicators.

---

## Profile & Settings Panel

The settings icon opens a slide-over panel with:

* Profile photo

* Name

* Phone number

* Email

* Preferred language

* Notification preferences

* Change password

* Logout button

---

# SCREEN 3 – Pre-Registration

Single clean form with:

* Full name

* Phone number

* Email

* Number of adults

* Number of children

* Arrival date

* Departure date

* Parking required

* Special requirements

* Room preference

* Submit button

Show a confirmation card after submission.

---

# NAVIGATION

Use a **bottom navigation bar** with only:

* Home

* Requests

* Food

* Profile

No sidebar and no complex menu.

---

# UX REQUIREMENTS

* Mobile-first responsive layout

* Everything accessible within **3 taps**

* Minimal typing

* Large buttons for hotel guests

* Clear icons and labels

* Smooth card-based scrolling

* Sticky bottom navigation

* Floating “Request Service” button

* Loading states and success toasts

* Accessible contrast and readable fonts

---

# VISUAL STYLE

* Premium hotel app

* Spacious layout

* Soft shadows

* Rounded 16–20px cards

* Elegant blue + gold highlights

* Consistent icon set

* Realistic hotel images and sample data

Generate a **high-fidelity single-dashboard guest experience** that feels intuitive for first-time hotel guests and is suitable for a semester project demo and future backend integration.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d51dc309-a77a-4f67-be3e-5f02d9d8355b).

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
