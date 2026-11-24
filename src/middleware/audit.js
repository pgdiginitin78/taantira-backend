const { AdminAuditLog } = require('../models');

const recordAuditLog = async ({
  actorId,
  action,
  entityType,
  entityId = null,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  transaction = null,
}) => {
  if (!actorId) return null;
  return AdminAuditLog.create(
    {
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId !== null ? String(entityId) : null,
      old_values_json: oldValues,
      new_values_json: newValues,
      ip_address: ipAddress,
    },
    { transaction }
  );
};

module.exports = { recordAuditLog };
