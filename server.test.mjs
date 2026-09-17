import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp, validateBooking } from './server.mjs';

const enquiry = { name: 'Test Guest', email: 'guest@example.com', checkin: '2099-05-10', checkout: '2099-05-12', guests: '2 guests', message: 'A quiet room, please.' };
async function start(t, transport) {
  const app = createApp({ transport, smtpUser: 'owner@gmail.com', bookingTo: 'reservations@example.com' });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { app.close(resolve); app.closeAllConnections(); }));
  const base = `http://127.0.0.1:${app.address().port}`;
  return { base, post: (body = enquiry, headers = {}) => fetch(`${base}/api/bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }) };
}
test('validates dates, types, required fields, and limits', () => {
  assert.equal(validateBooking(enquiry).email, enquiry.email);
  for (const change of [{ name: ' ' }, { name: 'a\r\nb' }, { email: 'invalid' }, { checkin: '2020-01-01' }, { checkin: '2099-02-30' }, { checkout: enquiry.checkin }, { guests: '999 guests' }, { message: 'x'.repeat(1001) }, { name: {} }]) {
    assert.throws(() => validateBooking({ ...enquiry, ...change }));
  }
});
test('sends all details to configured inbox with guest reply-to', async t => {
  let mail;
  const { post } = await start(t, { sendMail: async data => { mail = data; return { accepted: ['reservations@example.com'] }; } });
  const response = await post();
  assert.equal(response.status, 200);
  assert.equal(mail.to, 'reservations@example.com');
  assert.equal(mail.from.address, 'owner@gmail.com');
  assert.equal(mail.replyTo.address, enquiry.email);
  for (const value of Object.values(enquiry)) assert.ok(mail.text.includes(value));
});
test('rejects invalid submissions without sending', async t => {
  const { post } = await start(t, { sendMail: () => assert.fail('must not send') });
  assert.equal((await post({ ...enquiry, email: 'invalid' })).status, 400);
  assert.equal((await post(enquiry, { Origin: 'https://untrusted.example' })).status, 403);
});
test('reports missing configuration and SMTP rejection without exposing secrets', async t => {
  const unavailable = await start(t);
  assert.equal((await unavailable.post()).status, 503);
  const rejected = await start(t, { sendMail: async () => { throw new Error('secret-password'); } });
  const response = await rejected.post();
  assert.equal(response.status, 502);
  assert.ok(!(await response.text()).includes('secret-password'));
  const unaccepted = await start(t, { sendMail: async () => ({ accepted: [] }) });
  assert.equal((await unaccepted.post()).status, 502);
});
test('serves frontend and SweetAlert while protecting server files', async t => {
  const { base } = await start(t);
  for (const file of ['/', '/booking.js', '/vendor/sweetalert2.min.js', '/vendor/sweetalert2.min.css', '/assets/logo.svg']) assert.equal((await fetch(base + file)).status, 200, file);
  for (const file of ['/.env', '/.git/config', '/server.mjs', '/package.json', '/assets/generation.json']) assert.equal((await fetch(base + file)).status, 404, file);
});
test('limits repeated enquiries and rejects malformed or oversized JSON', async t => {
  const { post, base } = await start(t);
  const malformed = await fetch(base + '/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  assert.equal((await post({ ...enquiry, message: 'x'.repeat(17000) })).status, 413);
  for (let i = 0; i < 3; i++) await post();
  const response = await post();
  assert.equal(response.status, 429);
  assert.ok(response.headers.has('retry-after'));
});
