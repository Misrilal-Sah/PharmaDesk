import { query, insert } from '../db/database.js';

// Check for expiring medicines and create notifications
export async function checkExpiryAlerts() {
  console.log('🔍 Checking medicine expiry dates...');
  
  try {
    // Get expired medicines
    const expired = await query(`
      SELECT b.id as batch_id, b.batch_number, b.expiry_date, b.remaining_quantity,
             m.id as medicine_id, m.name as medicine_name, m.medicine_code
      FROM batches b
      JOIN medicines m ON b.medicine_id = m.id
      WHERE b.remaining_quantity > 0 
        AND b.expiry_date < CURDATE()
        AND m.is_active = TRUE
      ORDER BY b.expiry_date
    `);

    // Get expiring in 30 days
    const expiringSoon = await query(`
      SELECT b.id as batch_id, b.batch_number, b.expiry_date, b.remaining_quantity,
             m.id as medicine_id, m.name as medicine_name, m.medicine_code,
             DATEDIFF(b.expiry_date, CURDATE()) as days_until_expiry
      FROM batches b
      JOIN medicines m ON b.medicine_id = m.id
      WHERE b.remaining_quantity > 0 
        AND b.expiry_date >= CURDATE()
        AND b.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        AND m.is_active = TRUE
      ORDER BY b.expiry_date
    `);

    // Get expiring in 31-60 days
    const expiringLater = await query(`
      SELECT b.id as batch_id, b.batch_number, b.expiry_date, b.remaining_quantity,
             m.id as medicine_id, m.name as medicine_name, m.medicine_code,
             DATEDIFF(b.expiry_date, CURDATE()) as days_until_expiry
      FROM batches b
      JOIN medicines m ON b.medicine_id = m.id
      WHERE b.remaining_quantity > 0 
        AND b.expiry_date > DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        AND b.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 60 DAY)
        AND m.is_active = TRUE
      ORDER BY b.expiry_date
    `);

    let notificationsCreated = 0;

    // Create notifications for expired items
    for (const item of expired) {
      const exists = await checkNotificationExists('expiry_expired', item.batch_id);
      if (!exists) {
        await createExpiryNotification(
          'error',
          'Medicine Expired',
          `${item.medicine_name} (Batch: ${item.batch_number}) has expired on ${formatDate(item.expiry_date)}. Remove from stock immediately.`,
          'expiry_expired',
          item.batch_id
        );
        notificationsCreated++;
      }
    }

    // Create notifications for items expiring soon (30 days)
    for (const item of expiringSoon) {
      const exists = await checkNotificationExists('expiry_warning', item.batch_id);
      if (!exists) {
        await createExpiryNotification(
          'warning',
          'Medicine Expiring Soon',
          `${item.medicine_name} (Batch: ${item.batch_number}) expires in ${item.days_until_expiry} days. Consider discounting or returning.`,
          'expiry_warning',
          item.batch_id
        );
        notificationsCreated++;
      }
    }

    // Create notifications for items expiring in 60 days (info only, once)
    for (const item of expiringLater) {
      const exists = await checkNotificationExists('expiry_info', item.batch_id);
      if (!exists) {
        await createExpiryNotification(
          'info',
          'Medicine Expiry Notice',
          `${item.medicine_name} (Batch: ${item.batch_number}) will expire in ${item.days_until_expiry} days.`,
          'expiry_info',
          item.batch_id
        );
        notificationsCreated++;
      }
    }

    console.log(`✅ Expiry check complete: ${expired.length} expired, ${expiringSoon.length} expiring soon, ${notificationsCreated} new notifications`);
    
    return {
      expired: expired.length,
      expiringSoon: expiringSoon.length,
      expiringLater: expiringLater.length,
      notificationsCreated
    };
  } catch (error) {
    console.error('❌ Expiry alert check failed:', error);
    throw error;
  }
}

// Check if notification already exists for this batch/type today
async function checkNotificationExists(category, batchId) {
  const existing = await query(`
    SELECT id FROM notifications 
    WHERE category = ? 
      AND reference_id = ? 
      AND DATE(created_at) = CURDATE()
    LIMIT 1
  `, [category, batchId]);
  return existing.length > 0;
}

// Create expiry notification for all admin/pharmacist users
async function createExpiryNotification(type, title, message, category, batchId) {
  // Get all admin and pharmacist users
  const users = await query(`
    SELECT id FROM users 
    WHERE role IN ('Admin', 'Pharmacist') 
      AND is_active = TRUE
  `);

  for (const user of users) {
    await insert(`
      INSERT INTO notifications (user_id, type, title, message, category, reference_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [user.id, type, title, message, category, batchId]);
  }
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Schedule this to run daily
export function scheduleExpiryAlerts() {
  // Run immediately on startup
  checkExpiryAlerts().catch(console.error);
  
  // Run every day at midnight
  const runDaily = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      checkExpiryAlerts().catch(console.error);
      // Then run every 24 hours
      setInterval(() => {
        checkExpiryAlerts().catch(console.error);
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
    
    console.log(`⏰ Expiry alerts scheduled to run daily at midnight (next run in ${Math.round(msUntilMidnight / 1000 / 60)} minutes)`);
  };
  
  runDaily();
}
