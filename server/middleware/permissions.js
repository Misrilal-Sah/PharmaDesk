import { query, queryOne } from '../db/database.js';

// Permission definitions
export const PERMISSIONS = {
  // Patients
  'patients.view': 'View patients',
  'patients.create': 'Create patients',
  'patients.edit': 'Edit patients',
  'patients.delete': 'Delete patients',
  
  // Medicines
  'medicines.view': 'View medicines',
  'medicines.create': 'Create medicines',
  'medicines.edit': 'Edit medicines',
  'medicines.delete': 'Delete medicines',
  
  // Inventory
  'inventory.view': 'View inventory',
  'inventory.manage': 'Manage inventory (add stock, adjustments)',
  
  // Prescriptions
  'prescriptions.view': 'View prescriptions',
  'prescriptions.create': 'Create prescriptions',
  'prescriptions.edit': 'Edit prescriptions',
  'prescriptions.dispense': 'Dispense prescriptions',
  
  // Billing
  'billing.view': 'View sales/invoices',
  'billing.create': 'Create sales',
  'billing.refund': 'Process refunds',
  
  // Reports
  'reports.view': 'View reports',
  'reports.export': 'Export reports',
  
  // Users
  'users.view': 'View users',
  'users.create': 'Create users',
  'users.edit': 'Edit users',
  'users.delete': 'Delete users',
  
  // Settings
  'settings.view': 'View settings',
  'settings.edit': 'Edit settings',
  
  // Doctors
  'doctors.view': 'View doctors',
  'doctors.create': 'Create doctors',
  'doctors.edit': 'Edit doctors',
  'doctors.delete': 'Delete doctors',
  
  // Audit
  'audit.view': 'View audit logs'
};

// Default role permissions
const ROLE_PERMISSIONS = {
  Admin: Object.keys(PERMISSIONS), // Admin has all permissions
  
  Pharmacist: [
    'patients.view', 'patients.create', 'patients.edit',
    'medicines.view', 'medicines.create', 'medicines.edit',
    'inventory.view', 'inventory.manage',
    'prescriptions.view', 'prescriptions.create', 'prescriptions.edit', 'prescriptions.dispense',
    'billing.view', 'billing.create',
    'reports.view',
    'doctors.view', 'doctors.create', 'doctors.edit',
    'settings.view'
  ],
  
  Doctor: [
    'patients.view', 'patients.create', 'patients.edit',
    'medicines.view',
    'prescriptions.view', 'prescriptions.create', 'prescriptions.edit',
    'doctors.view',
    'settings.view'
  ],
  
  Staff: [
    'patients.view',
    'medicines.view',
    'prescriptions.view',
    'billing.view', 'billing.create',
    'settings.view'
  ]
};

// Get permissions for a role
export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.Staff;
}

// Check if role has permission
export function roleHasPermission(role, permission) {
  const permissions = getRolePermissions(role);
  
  // Check for exact permission
  if (permissions.includes(permission)) return true;
  
  // Check for wildcard (e.g., 'patients.*')
  const [module] = permission.split('.');
  if (permissions.includes(`${module}.*`)) return true;
  
  return false;
}

// Middleware to check permission
export function requirePermission(...requiredPermissions) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userRole = req.user.role;
      
      // Admin always has access
      if (userRole === 'Admin') {
        return next();
      }

      // Check if user has at least one of the required permissions
      const hasPermission = requiredPermissions.some(perm => 
        roleHasPermission(userRole, perm)
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: `You don't have permission to perform this action`,
          required: requiredPermissions
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

// Get all permissions for current user
export async function getUserPermissions(user) {
  return {
    role: user.role,
    permissions: getRolePermissions(user.role),
    allPermissions: PERMISSIONS
  };
}
