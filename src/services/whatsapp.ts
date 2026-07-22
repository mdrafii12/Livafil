/**
 * Opens a WhatsApp deep link with the given phone number and message.
 * Formats the phone number to ensure it has the correct country code if necessary.
 */
export function sendWhatsAppMessage(phone: string, message: string): void {
  const encodedMessage = encodeURIComponent(message);
  let formattedPhone = phone.replace(/\D/g, '');
  if (formattedPhone.length === 10) {
    formattedPhone = `91${formattedPhone}`;
  }
  
  const waUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  window.open(waUrl, '_blank');
}
