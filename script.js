'use strict';
document.documentElement.classList.add('js');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const header = document.querySelector('#header');
const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() { menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Open navigation'); navigation.classList.remove('open'); }
menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); navigation.classList.toggle('open', open); });
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('click', event => { if (!header.contains(event.target)) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); } });
const hero = document.querySelector('.hero');
const updateHeader = () => { header.classList.toggle('scrolled', window.scrollY > 70); if (!reducedMotion && window.scrollY < hero.offsetHeight) hero.style.setProperty('--hero-shift', `${Math.min(window.scrollY * .12, 55)}px`); };
window.addEventListener('scroll', updateHeader, { passive: true }); updateHeader();
if ('IntersectionObserver' in window) { const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .08 }); document.querySelectorAll('.reveal').forEach(element => observer.observe(element)); } else { document.querySelectorAll('.reveal').forEach(element => element.classList.add('visible')); }
if (!reducedMotion) { const snow = document.querySelector('.snow'); for (let i = 0; i < 24; i++) { const flake = document.createElement('i'); flake.style.left = `${Math.random() * 100}%`; flake.style.animationDuration = `${9 + Math.random() * 9}s`; flake.style.animationDelay = `${Math.random() * 15}s`; snow.append(flake); } }
const slider = document.querySelector('#destination-slider');
const cards = [...slider.children];
const dots = document.querySelector('.slider-dots');
cards.forEach((card, index) => { const dot = document.createElement('button'); dot.type = 'button'; dot.setAttribute('aria-label', `Show ${card.querySelector('h3').textContent}`); dot.classList.toggle('active', index === 0); dot.setAttribute('aria-pressed', String(index === 0)); dot.addEventListener('click', () => goToCard(index)); dots.append(dot); });
function goToCard(index) { slider.scrollTo({ left: cards[index].offsetLeft - cards[0].offsetLeft, behavior: reducedMotion ? 'instant' : 'smooth' }); }
let sliderFrame;
slider.addEventListener('scroll', () => { cancelAnimationFrame(sliderFrame); sliderFrame = requestAnimationFrame(() => { const index = cards.reduce((best, card, i) => Math.abs(card.offsetLeft - cards[0].offsetLeft - slider.scrollLeft) < Math.abs(cards[best].offsetLeft - cards[0].offsetLeft - slider.scrollLeft) ? i : best, 0);[...dots.children].forEach((dot, i) => { dot.classList.toggle('active', i === index); dot.setAttribute('aria-pressed', String(i === index)); }); }); }, { passive: true });
slider.addEventListener('keydown', event => { if (!['ArrowRight', 'ArrowLeft'].includes(event.key) || event.target !== slider) return; event.preventDefault(); const current = [...dots.children].findIndex(dot => dot.classList.contains('active')); goToCard(Math.max(0, Math.min(cards.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1)))); });
document.querySelectorAll('dialog').forEach(dialog => { dialog.querySelector('.modal-close').addEventListener('click', () => dialog.close()); dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }); });
const bookingDialog = document.querySelector('#booking-dialog');
document.querySelectorAll('[data-book]').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close()); closeMenu(); bookingDialog.showModal(); }));
const form = document.querySelector('#booking-form');
const checkin = form.elements.checkin;
const checkout = form.elements.checkout;
function localDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
checkin.min = localDate(new Date());
function updateCheckout() { const date = checkin.value ? new Date(`${checkin.value}T12:00:00`) : new Date(); date.setDate(date.getDate() + 1); checkout.min = localDate(date); if (checkout.value && checkout.value < checkout.min) checkout.value = ''; }
checkin.addEventListener('change', updateCheckout); updateCheckout();

const destinationDetails = {
  gulmarg: { title: 'Gulmarg', text: 'Snow-covered slopes, pine forests and sweeping alpine views make Gulmarg a memorable Kashmir escape. Enjoy the scenery and ask our team about planning an excursion during your stay. Activities and access depend on the season and local conditions.' },
  pahalgam: { title: 'Pahalgam', text: 'Follow the river through pine-lined valleys and open meadows. Pahalgam is a beautiful place to slow down, take in mountain views and discover Kashmir’s peaceful landscapes. Our team can help you plan a day out.' },
  sinthan: { title: 'Sinthan Top', text: 'A winding mountain road leads to expansive alpine panoramas and fresh mountain air. Ask our team about current road and weather conditions before planning your visit to this high-altitude pass.' },
  kokernag: { title: 'Kokernag Garden', text: 'Discover natural springs, flower-filled gardens and quiet paths beneath mature trees. A peaceful garden visit pairs beautifully with a relaxing stay at Lotus Villa. Ask our team for help planning your visit.' },
  betaab: { title: 'Betaab Valley', text: 'Clear streams, green meadows and forested mountain slopes create a picture-perfect Kashmir landscape. Take a gentle walk, enjoy the scenery and make time for a peaceful day in nature. Our team can help with your itinerary.' }
};
const destinationDialog = document.querySelector('#destination-dialog');
document.querySelectorAll('[data-destination]').forEach(button => button.addEventListener('click', () => { const key = button.dataset.destination; const detail = destinationDetails[key]; document.querySelector('#detail-title').textContent = detail.title; document.querySelector('#detail-description').textContent = detail.text; const image = document.querySelector('#detail-image'); image.src = `assets/${key}.jpg`; image.alt = button.closest('article').querySelector('img').alt; destinationDialog.showModal(); }));
const galleryButtons = [...document.querySelectorAll('[data-gallery]')];
const lightbox = document.querySelector('#lightbox');
let galleryIndex = 0;
function showGallery(index) { galleryIndex = (index + galleryButtons.length) % galleryButtons.length; const button = galleryButtons[galleryIndex]; const image = document.querySelector('#lightbox-image'); image.src = button.dataset.gallery; image.alt = button.querySelector('img').alt; lightbox.querySelector('figcaption').textContent = image.alt; }
galleryButtons.forEach((button, index) => button.addEventListener('click', () => { showGallery(index); lightbox.showModal(); }));
document.querySelector('.lightbox-prev').addEventListener('click', () => showGallery(galleryIndex - 1));
document.querySelector('.lightbox-next').addEventListener('click', () => showGallery(galleryIndex + 1));
lightbox.addEventListener('keydown', event => { if (event.key === 'ArrowRight') showGallery(galleryIndex + 1); if (event.key === 'ArrowLeft') showGallery(galleryIndex - 1); });
document.querySelector('#year').textContent = new Date().getFullYear();
