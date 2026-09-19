const OFFLINE_QUEUE_KEY = 'classroom_pending_sync_queue';

/**
 * Fallback UUID generator for non-secure contexts or older browsers.
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'x4xxx-yxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Safely parses JSON string from LocalStorage.
 */
function safeJsonParse(jsonString, fallback) {
  try {
    return jsonString ? JSON.parse(jsonString) : fallback;
  } catch (err) {
    console.error('Failed parsing sync queue:', err);
    return fallback;
  }
}

/**
 * Retrieves pending attendance logs stored locally.
 */
export const getSyncQueue = () => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
  return safeJsonParse(data, []);
};

/**
 * Queues or updates an attendance payload when offline or pending sync.
 */
export const queueAttendanceForSync = (attendancePayload) => {
  if (typeof window === 'undefined') return null;

  const queue = getSyncQueue();
  const { date, course } = attendancePayload;

  // Deduplicate: Check if a payload for the exact same date & course exists
  const existingIdx = queue.findIndex(
    (item) => item.payload?.date === date && item.payload?.course === course
  );

  const updatedItem = {
    id: existingIdx >= 0 ? queue[existingIdx].id : generateUUID(),
    timestamp: new Date().toISOString(),
    payload: attendancePayload,
  };

  if (existingIdx >= 0) {
    queue[existingIdx] = updatedItem;
  } else {
    queue.push(updatedItem);
  }

  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to save offline sync queue item:', err);
  }

  return updatedItem;
};

/**
 * Pushes local queued records to your server or Supabase database sequentially.
 */
export const processPendingSyncQueue = async (apiSyncCallback) => {
  if (typeof window === 'undefined') return { success: true, syncedCount: 0 };

  let queue = getSyncQueue();
  if (queue.length === 0) return { success: true, syncedCount: 0 };

  let syncedCount = 0;
  const remainingQueue = [...queue];

  try {
    for (const item of queue) {
      if (apiSyncCallback) {
        await apiSyncCallback(item.payload);
      } else {
        // Mock network delay if no active API endpoint is attached
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Remove successfully processed item
      syncedCount++;
      remainingQueue.shift();
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
    }

    return { success: true, syncedCount };
  } catch (error) {
    console.error('Offline sync failed midway:', error);
    return { success: false, syncedCount, error };
  }
};

/**
 * Returns current pending queue count.
 */
export const getPendingCount = () => {
  return getSyncQueue().length;
};