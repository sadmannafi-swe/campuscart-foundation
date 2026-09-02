/**
 * Platform-wide configuration for CampusCart.
 * Keep operational values here so they are changed in one place.
 */

/** Admin WhatsApp number used for student verification (international format, digits only). */
export const ADMIN_WHATSAPP_NUMBER = "8801700000000";

export function adminWhatsAppLink(message: string): string {
  return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
