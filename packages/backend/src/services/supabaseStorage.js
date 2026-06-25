const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL    = process.env.SUPABASE_URL;
const SERVICE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET          = process.env.SUPABASE_BUCKET || 'edutechexos';

const configured = Boolean(SUPABASE_URL && SERVICE_KEY);

let _client = null;
function getClient() {
  if (!_client) _client = createClient(SUPABASE_URL, SERVICE_KEY);
  return _client;
}

/**
 * Uploads a Buffer to Supabase Storage.
 * Returns the permanent public CDN URL, or null if Supabase is not configured
 * or the upload fails.
 */
async function uploadToSupabase(buffer, filename, contentType) {
  if (!configured) return null;
  try {
    const ext    = filename.includes('.') ? filename.split('.').pop() : 'bin';
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    const path   = `uploads/${Date.now()}-${safeName}`;

    const client = getClient();
    const { error } = await client.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: false });

    if (error) {
      console.warn('[supabase] upload error:', error.message);
      return null;
    }

    const { data } = client.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch (err) {
    console.warn('[supabase] uploadToSupabase failed:', err.message);
    return null;
  }
}

module.exports = { uploadToSupabase, configured };
