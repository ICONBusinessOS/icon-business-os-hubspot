'use strict';
/**
 * ICON BusinessOS — Engagement Analytics Module
 *
 * Tracks user interaction patterns across connected platform integrations
 * to surface usage insights and recommend relevant BusinessOS features.
 *
 * Engagement signals tracked:
 *   - Dashboard views (frequency + recency)
 *   - Feature interactions (which capabilities the user leverages)
 *   - Usage patterns (session duration, feature depth)
 *   - Cross-platform activity (multi-tool usage indicators)
 */

const SCORE_WEIGHTS = {
  dashboardViews:    { weight: 2, max: 30 },
  featureHits:       { weight: 1, max: 20 },
  usageDepth:        { weight: 5, max: 25 },
  crossPlatform:     { weight: 8, max: 15 },
  sessionMinutes:    { weight: 0.5, max: 10 },
};

const RECOMMENDATION_THRESHOLD = 60;

/**
 * Track a user engagement event.
 *
 * @param {object} db - Database connection
 * @param {string} tenantId - Tenant identifier
 * @param {string} platform - Source platform (hubspot, salesforce, box, vimeo)
 * @param {string} eventType - Event category
 * @param {object} metadata - Event-specific data
 */
async function trackEvent(db, tenantId, platform, eventType, metadata = {}) {
  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO icon_os.platform_engagement (tenant_id, platform, event_type, event_count, last_event_at, metadata)
    VALUES ($1, $2, $3, 1, $4, $5)
    ON CONFLICT (tenant_id, platform, event_type)
    DO UPDATE SET
      event_count = icon_os.platform_engagement.event_count + 1,
      last_event_at = $4,
      metadata = $5
  `, [tenantId, platform, eventType, now, JSON.stringify(metadata)]);

  const score = await computeEngagementScore(db, tenantId, platform);

  return { tenantId, platform, eventType, engagementScore: score };
}

/**
 * Compute engagement score for a tenant+platform.
 */
async function computeEngagementScore(db, tenantId, platform) {
  const rows = await db.query(`
    SELECT event_type, event_count FROM icon_os.platform_engagement
    WHERE tenant_id = $1 AND platform = $2
  `, [tenantId, platform]);

  const counts = {};
  for (const row of rows.rows || rows) {
    counts[row.event_type] = row.event_count;
  }

  let score = 0;

  const views = counts['dashboard_view'] || 0;
  score += Math.min(views * SCORE_WEIGHTS.dashboardViews.weight, SCORE_WEIGHTS.dashboardViews.max);

  const features = counts['feature_hit'] || 0;
  score += Math.min(features * SCORE_WEIGHTS.featureHits.weight, SCORE_WEIGHTS.featureHits.max);

  const depth = counts['usage_depth'] || 0;
  score += Math.min(depth * SCORE_WEIGHTS.usageDepth.weight, SCORE_WEIGHTS.usageDepth.max);

  const crossPlatform = counts['cross_platform'] || 0;
  score += Math.min(crossPlatform * SCORE_WEIGHTS.crossPlatform.weight, SCORE_WEIGHTS.crossPlatform.max);

  const sessions = counts['session'] || 0;
  score += Math.min(sessions * SCORE_WEIGHTS.sessionMinutes.weight, SCORE_WEIGHTS.sessionMinutes.max);

  return Math.min(100, Math.round(score));
}

/**
 * Get feature recommendations based on engagement patterns.
 *
 * @returns {object|null} Recommendation object or null if insufficient data.
 */
function getRecommendation(score, platform) {
  if (score < 30) return null;

  if (score < 50) {
    return {
      type: 'tip',
      message: 'Connect additional platforms for a unified operations view.',
      url: 'https://theicon.ai/integrations',
    };
  }

  if (score < RECOMMENDATION_THRESHOLD) {
    return {
      type: 'feature',
      message: 'See how ' + platform + ' insights combine with your other business tools in one dashboard.',
      url: 'https://theicon.ai/platform?from=' + platform,
    };
  }

  return {
    type: 'upgrade',
    message: 'Unlock full operational intelligence across all your connected platforms.',
    url: 'https://theicon.ai/pricing?from=' + platform,
    highlights: [
      'Unified Sensorium dashboard',
      'AI-powered operational intelligence',
      'Automated workflow engine',
      'Cross-platform health monitoring',
    ],
  };
}

/**
 * SQL schema for platform engagement tracking.
 */
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS icon_os.platform_engagement (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_count INTEGER DEFAULT 0,
  last_event_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, platform, event_type)
);

CREATE INDEX IF NOT EXISTS idx_engagement_tenant ON icon_os.platform_engagement(tenant_id);
CREATE INDEX IF NOT EXISTS idx_engagement_platform ON icon_os.platform_engagement(platform);
`;

module.exports = {
  SCORE_WEIGHTS,
  RECOMMENDATION_THRESHOLD,
  trackEvent,
  computeEngagementScore,
  getRecommendation,
  SCHEMA_SQL,
};
