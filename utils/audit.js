const db = require('../config/db');

const insertLog = db.prepare(`
  INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details)
  VALUES (@user_id, @user_name, @action, @entity_type, @entity_id, @details)
`);

/**
 * Records an audit trail entry. Call this after every create/update/delete/
 * approve/reject action across all modules.
 */
function logAction({ user, action, entityType, entityId, details }) {
  insertLog.run({
    user_id: user ? user.id : null,
    user_name: user ? user.name : 'System',
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
  });
}

module.exports = { logAction };
