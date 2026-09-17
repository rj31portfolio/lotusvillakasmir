# Lotus Villa website

The reservation form posts to the Node server, which sends enquiries through Gmail SMTP. SweetAlert2 shows validation, sending, success, and failure messages. Success means Gmail accepted the enquiry; it does not confirm a room booking.

## Run locally

Requires Node.js 22 or newer.

1. Run `npm install`.
2. Copy `.env.example` to `.env`.
3. Set `SMTP_USER` to your Gmail address and `SMTP_PASS` to its Google App Password. Enable 2-Step Verification first, then create an App Password at https://myaccount.google.com/apppasswords. Use the App Password, not your normal Google password. See [Nodemailer's Gmail setup](https://nodemailer.com/guides/using-gmail).
4. Set `BOOKING_TO` to the inbox that should receive enquiries (defaults to `reservations.lotusvilla@gmail.com`). Replies go to the guest's email address.
5. Run `npm start` and open http://localhost:8080.

Keep `.env` private; it is ignored by Git and cannot be downloaded through the server. Do not paste credentials into HTML or JavaScript. Without credentials, the form reports that email enquiries are unavailable and provides the telephone number.

## Hosting

Run this Node server on hosting that allows outbound SMTP to `smtp.gmail.com:465`. Set the environment variables in the hosting dashboard and use HTTPS. Set `HOST=0.0.0.0` when required by the host; `PORT` defaults to 8080. Opening the HTML directly, a static-only host, or a separate Live Server does not provide the email endpoint.

The endpoint permits five submissions per connection IP per 15 minutes. Behind a reverse proxy, that limit is shared by clients using that proxy; configure a trusted proxy-aware limiter at your hosting layer for production traffic. Multiple server instances need shared rate limiting.

## Verification

Run `npm test` for validation, HTTP, mail routing, and failure handling tests. Tests use an injected mail transport and do not send real email. After configuring Gmail, submit one enquiry in the browser and check the destination inbox to verify actual delivery.



i want to new feature in admin panel yelp generate lead, google map generate lead, yellow pages lead make seprate service feature ad by hash data api not mantion api provider name on show admin  in my tool and frontend make more good layout so i want to go live that for revenue start complete working that and business name is SEO Zentro name of thi tool so make logo and some creatives on frontend make easy to under standing all services and use can buy plan 
and email is info@seozentro.com and gamil is supports.seozentro@gmail.com and all socil meida icon show like insta, facebook, youtub, pintrest and contact number is +91- 8368487667 so complete this project all working and easy to use all features and for seo rich complete that rank on google in 5 to 6 days on top so all complete full fill seo rich and admin can post blog for seo with images and contenet so rank on first pages with seo rich so make it final update 