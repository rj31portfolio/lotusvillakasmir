'use strict';
const submitButton = form.querySelector('[type="submit"]');
const bookingStatus = document.querySelector('#booking-status');
let sendingBooking = false;
function refreshCheckinMin() {
  checkin.min = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
refreshCheckinMin();
function bookingAlert(options) {
  if (!window.Swal) {
    bookingStatus.textContent = options.text || options.title;
    return Promise.resolve();
  }
  // Native dialogs use a top layer, so alerts must live inside the dialog.
  return Swal.fire({ target: bookingDialog, heightAuto: false, confirmButtonColor: '#947538', ...options });
}
bookingDialog.addEventListener('cancel', event => {
  if (sendingBooking || window.Swal?.isVisible()) event.preventDefault();
});
bookingDialog.addEventListener('click', event => {
  if (sendingBooking && (event.target === bookingDialog || event.target.closest('.modal-close'))) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sendingBooking) return;
  refreshCheckinMin();
  form.elements.name.value = form.elements.name.value.trim();
  form.elements.email.value = form.elements.email.value.trim();
  checkout.setCustomValidity(checkout.value && checkout.value <= checkin.value ? 'Check-out must be after check-in.' : '');
  const invalid = [...form.elements].find(field => field.willValidate && !field.checkValidity());
  if (invalid) {
    await bookingAlert({ icon: 'warning', title: 'Check your details', text: invalid.validationMessage });
    invalid.focus();
    return;
  }
  const data = Object.fromEntries(new FormData(form));
  sendingBooking = true;
  submitButton.disabled = true;
  form.setAttribute('aria-busy', 'true');
  bookingStatus.textContent = 'Sending your enquiry...';
  bookingAlert({ title: 'Sending your enquiry', text: 'Please wait while we contact our reservations team.', allowOutsideClick: false, allowEscapeKey: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
  try {
    const response = await fetch('/api/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'We could not send your enquiry. Please try again later or call +91 9953555771.');
    if (!result.message) throw new Error('We could not confirm delivery. Please call +91 9953555771 before resending.');
    form.reset();
    checkout.setCustomValidity('');
    refreshCheckinMin();
    updateCheckout();
    bookingStatus.textContent = result.message;
    await bookingAlert({ icon: 'success', title: 'Enquiry sent!', text: result.message });
  } catch (error) {
    const message = error instanceof TypeError ? 'Connection interrupted. Delivery could not be confirmed. Please call +91 9953555771 before resending.' : error.message;
    bookingStatus.textContent = message;
    await bookingAlert({ icon: 'error', title: 'Enquiry not confirmed', text: message });
  } finally {
    sendingBooking = false;
    submitButton.disabled = false;
    form.removeAttribute('aria-busy');
  }
});
checkout.addEventListener('input', () => checkout.setCustomValidity(''));
checkin.addEventListener('input', () => checkout.setCustomValidity(''));
