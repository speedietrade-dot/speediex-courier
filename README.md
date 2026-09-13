# SpeedieX Courier Website

Complete customer-facing courier website plus a separate protected admin control center.

## Customer pages
- `/` — long scrollable homepage
- `/track.html` — shipment tracking page
- `/send.html` — send parcel page
- `/services.html` — services
- `/about.html` — about
- `/contact.html` — support/contact

The public homepage has no Login button. The hamburger menu is clickable and opens the mobile-style navigation.

## Admin
- `/admin` — protected admin area
- `/admin-login.html` — administrator sign-in

Admin shipment data is separate from the public customer UI. Admins can create/edit/delete shipments and add tracking events.

## Run
1. Copy `.env.example` to `.env` and set your admin credentials and session secret.
2. Run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000/`.
5. Admin: `http://localhost:3000/admin-login.html`.

The included sample tracking number is `SPX123456789`.
