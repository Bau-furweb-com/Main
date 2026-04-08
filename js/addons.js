import { supabase, requireAuth } from './supabase.js';
import { renderSidebar } from './sidebar.js';

async function requestAddon(addonName) {
  try {
    const session = await requireAuth();
    if (!session) return;

    const updates = {};
    if (addonName === 'analytics') {
      updates.req_analytics = true;
    } else if (addonName === 'reservations') {
      updates.req_reservations = true;
    } else if (addonName === 'qr_ordering') {
      updates.req_qr_ordering = true;
    } else if (addonName === 'priority_support') {
      updates.req_priority_support = true;
    } else if (addonName === 'google_maps') {
      updates.req_google_maps = true;
    } else if (addonName === 'contact_form') {
      updates.req_contact_form = true;
    } else if (addonName === 'email_receive') {
      updates.req_email_receive = true;
    } else if (addonName === 'email_send') {
      updates.req_email_send = true;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id);

    if (error) throw error;
    
    // Refresh the page to reflect changes
    window.location.reload();
  } catch (error) {
    console.error('Fehler beim Anfordern des Add-ons:', error);
    alert('Add-on konnte nicht angefordert werden. Bitte erneut versuchen.');
  }
}

export { requestAddon };
