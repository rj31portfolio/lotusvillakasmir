import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import nodemailer from 'nodemailer';

const root = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const publicFiles = new Map([
  ['/', 'index.html'], ['/index.html', 'index.html'], ['/style.css', 'style.css'],
  ['/refinements.css', 'refinements.css'], ['/script.js', 'script.js'], ['/booking.js', 'booking.js'],
  ['/vendor/sweetalert2.min.js', 'node_modules/sweetalert2/dist/sweetalert2.min.js'],
  ['/vendor/sweetalert2.min.css', 'node_modules/sweetalert2/dist/sweetalert2.min.css'],
]);
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const guests = new Set(['1 guest', '2 guests', '3 guests', '4 guests', '5+ guests']);
const todayInIndia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validateBooking(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Please provide your enquiry details.');
  const data = {};
  for (const field of ['name', 'email', 'checkin', 'checkout', 'guests', 'message']) {
    if (body[field] !== undefined && typeof body[field] !== 'string') throw new Error('Please check your enquiry details.');
    data[field] = (body[field] || '').trim();
  }
  if (!data.name || data.name.length > 100 || /[\r\n\x00]/.test(data.name)) throw new Error('Please enter your name (up to 100 characters).');
  if (data.email.length > 254 || !emailPattern.test(data.email)) throw new Error('Please enter a valid email address.');
  if (!validDate(data.checkin) || data.checkin < todayInIndia()) throw new Error('Please choose today or a future check-in date.');
  if (!validDate(data.checkout) || data.checkout <= data.checkin) throw new Error('Check-out must be after check-in.');
  if (!guests.has(data.guests)) throw new Error('Please select the number of guests.');
  if (data.message.length > 1000) throw new Error('Please keep your message under 1,000 characters.');
  return data;
}
function json(response, status, message) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify({ message }));
}
export function createApp({ transport, smtpUser, bookingTo } = {}) {
  const attempts = new Map();
  return createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname === '/api/bookings') {
        if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); return json(response, 405, 'Please submit the reservation form.'); }
        if (request.headers['sec-fetch-site'] === 'cross-site' || (request.headers.origin && new URL(request.headers.origin).host !== request.headers.host)) return json(response, 403, 'Please submit the form from this website.');
        if (request.headers['content-type']?.split(';')[0].trim() !== 'application/json') return json(response, 415, 'Please send a JSON enquiry.');
        const now = Date.now();
        for (const [key, value] of attempts) if (value.expires <= now) attempts.delete(key);
        const ip = request.socket.remoteAddress;
        const rate = attempts.get(ip) || { count: 0, expires: now + 15 * 60 * 1000 };
        if (rate.count >= 5) { response.setHeader('Retry-After', String(Math.ceil((rate.expires - now) / 1000))); return json(response, 429, 'Too many enquiries. Please wait 15 minutes or call +91 9953555771.'); }
        rate.count++;
        attempts.set(ip, rate);
        const chunks = [];
        let size = 0;
        for await (const chunk of request) {
          size += chunk.length;
          if (size > 16 * 1024) { json(response, 413, 'Your enquiry is too large. Please shorten it.'); return; }
          chunks.push(chunk);
        }
        let body;
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return json(response, 400, 'Please send a valid enquiry.'); }
        let data;
        try { data = validateBooking(body); } catch (error) { return json(response, 400, error.message); }
        if (!transport || !smtpUser || !bookingTo) return json(response, 503, 'Email enquiries are temporarily unavailable. Please call +91 9953555771.');
        try {
          const result = await transport.sendMail({
            from: { name: 'Lotus Villa Reservations', address: smtpUser },
            to: bookingTo,
            replyTo: { name: data.name, address: data.email },
            subject: `Lotus Villa reservation enquiry: ${data.checkin} to ${data.checkout}`,
            text: `New reservation enquiry\n\nName: ${data.name}\nEmail: ${data.email}\nCheck-in: ${data.checkin}\nCheck-out: ${data.checkout}\nGuests: ${data.guests}\n\nAdditional details:\n${data.message || 'None'}\n\nPlease reply to the guest with availability and rates. This enquiry is not a confirmed booking.`,
            disableFileAccess: true,
            disableUrlAccess: true,
          });
          if (!result.accepted?.length) throw new Error('SMTP recipient was not accepted');
          return json(response, 200, 'Your enquiry has been sent. Our team will reply with availability and rates. Your booking is confirmed only after our team responds.');
        } catch (error) {
          console.error('Booking SMTP failure:', error.code || 'DELIVERY_FAILED');
          return json(response, 502, 'We could not send your enquiry. Please try again later or call +91 9953555771.');
        }
      }
      if (!['GET', 'HEAD'].includes(request.method)) { response.setHeader('Allow', 'GET, HEAD'); return json(response, 405, 'Method not allowed.'); }
      let file = publicFiles.get(pathname);
      if (!file && /^\/assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:jpg|png|svg)$/.test(pathname)) file = pathname.slice(1);
      if (!file) return json(response, 404, 'Not found.');
      const content = await readFile(path.join(root, file));
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch { if (!response.headersSent) json(response, 404, 'Not found.'); else response.end(); }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.replace(/\s/g, '');
  const bookingTo = process.env.BOOKING_TO?.trim() || 'reservations.lotusvilla@gmail.com';
  const configured = smtpUser && emailPattern.test(smtpUser) && smtpPass && emailPattern.test(bookingTo);
  const transport = configured ? nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
  }) : null;
  if (!configured) console.warn('Gmail SMTP is not configured. Set SMTP_USER and SMTP_PASS in .env to enable enquiries.');
  const port = Number(process.env.PORT || 8080);
  const host = process.env.HOST || '127.0.0.1';
  createApp({ transport, smtpUser, bookingTo }).listen(port, host, () => console.log(`Lotus Villa: http://${host}:${port}`));
}
