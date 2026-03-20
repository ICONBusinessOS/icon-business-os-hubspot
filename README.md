# ICON BusinessOS — HubSpot Integration

> Operations intelligence for HubSpot CRM. Monitor pipeline health, contact data quality, and engagement trends from within the ICON BusinessOS platform.

## Features

- **CRM Health Score**: composite score across contacts, deals, and engagement metrics
- **Pipeline Intelligence**: stale deal detection, conversion rate trends, deal velocity tracking
- **Contact Data Quality**: duplicate detection, missing field analysis, email bounce rate monitoring
- **Activity Alerts**: notifications when pipeline velocity drops below threshold

## Architecture

- **OAuth 2.0**: standard HubSpot OAuth flow for secure CRM access
- **CRM Cards**: embedded dashboard card via HubSpot App Cards API
- **Webhooks**: real-time deal stage changes and contact creation events
- **Vault Integration**: credentials stored securely in ICON Kerberos Vault

## HubSpot API Scopes

- `crm.objects.contacts.read`
- `crm.objects.deals.read`
- `crm.objects.companies.read`
- `crm.schemas.contacts.read`
- `crm.schemas.deals.read`

## Setup

1. Register app at https://developers.hubspot.com/
2. Configure OAuth redirect URI: `https://os.theicon.ai/api/oauth/hubspot/callback`
3. Enable webhook subscriptions for deal and contact events
4. Connect via ICON BusinessOS dashboard

## License
MIT
