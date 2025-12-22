import { query } from '../db/database.js';

/**
 * Create an audit log entry
 * @param {Object} params - Log parameters
 * @param {number} params.userId - User ID who performed the action
 * @param {string} params.userName - User's full name
 * @param {string} params.action - Action type: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
 * @param {string} params.entityType - Entity type: Patient, Doctor, Medicine, Sale, etc.
 * @param {number} params.entityId - ID of the affected entity
 * @param {string} params.entityName - Name/identifier of the entity
 * @param {Object} params.oldValues - Previous values (for updates)
 * @param {Object} params.newValues - New values (for creates/updates)
 * @param {Object} req - Express request object for IP and user agent
 */
export async function createAuditLog({
  userId,
  userName,
  action,
  entityType,
  entityId = null,
  entityName = null,
  oldValues = null,
  newValues = null
}, req = null) {
  try {
    const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
    const userAgent = req?.get('User-Agent') || null;

    await query(
      `INSERT INTO audit_logs 
       (user_id, user_name, action, entity_type, entity_id, entity_name, old_values, new_values, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        userName,
        action,
        entityType,
        entityId,
        entityName,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent
      ]
    );
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Express middleware for automatic audit logging on mutations
 */
export function auditMiddleware(entityType) {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      // Log on successful mutations
      if (req.user && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const action = {
          'POST': 'CREATE',
          'PUT': 'UPDATE',
          'PATCH': 'UPDATE',
          'DELETE': 'DELETE'
        }[req.method];
        
        // Only log on success (2xx status)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          createAuditLog({
            userId: req.user.id,
            userName: req.user.full_name || req.user.username,
            action,
            entityType,
            entityId: req.params.id || data?.id,
            entityName: data?.name || data?.full_name || data?.invoice_number || null,
            newValues: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : null
          }, req);
        }
      }
      
      return originalJson(data);
    };
    
    next();
  };
}

export default { createAuditLog, auditMiddleware };
