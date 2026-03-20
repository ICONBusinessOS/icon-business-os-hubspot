'use strict';
/**
 * ICON BusinessOS — HubSpot OAuth Handler
 *
 * Handles the OAuth 2.0 flow for the HubSpot integration.
 * On successful auth, provisions the hubspot-crm vault principal
 * and initializes engagement tracking for the connected account.
 */

const HUBSPOT_TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token';
const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
const REDIRECT_URI = 'https://os.theicon.ai/api/oauth/hubspot/callback';

function getAuthorizeUrl(tenantId, state) {
  const scopes = [
    'crm.objects.contacts.read', 'crm.objects.deals.read',
    'crm.objects.companies.read', 'crm.schemas.contacts.read',
    'crm.schemas.deals.read',
  ];
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: scopes.join(' '),
    state: JSON.stringify({ tenantId, nonce: state }),
  });
  return 'https://app.hubspot.com/oauth/authorize?' + params.toString();
}

async function handleCallback(code, stateJson) {
  const state = JSON.parse(stateJson);
  const tenantId = state.tenantId;

  const tokenRes = await fetch(HUBSPOT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error('HubSpot token exchange failed: ' + await tokenRes.text());
  }

  const tokens = await tokenRes.json();
  const infoRes = await fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + tokens.access_token);
  const info = await infoRes.json();

  return {
    tenantId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    hubId: info.hub_id,
    appId: info.app_id,
    userId: info.user_id,
    scopes: info.scopes,
  };
}

/**
 * Store HubSpot credentials in the Kerberos Vault after OAuth.
 */
async function provisionVaultPrincipal(vaultBridge, tenantId, tokens) {
  await vaultBridge.storeCredentials(tenantId, 'hubspot-crm', {
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    hub_id: tokens.hubId,
    expires_at: Date.now() + (tokens.expiresIn * 1000),
    connected_via: 'hubspot-integration',
    connected_at: new Date().toISOString(),
  });
}

module.exports = { getAuthorizeUrl, handleCallback, provisionVaultPrincipal };
