/**
 * Constants - People App
 */

// Job Categories
export const JOB_CATEGORIES = [
  'Delivery',
  'Cooking',
  'Cleaning',
  'Plumbing',
  'Electrical',
  'Mechanic',
  'Driver',
  'Care taker',
  'Tailor',
  'Barber',
  'Laundry',
  'Other',
];

// Job Statuses
export const JOB_STATUS = {
  OPEN: 'open',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  WORK_DONE: 'work_done',
  COMPLETED: 'completed',
};

// Job Status Labels
export const JOB_STATUS_LABELS = {
  [JOB_STATUS.OPEN]: 'Open',
  [JOB_STATUS.ASSIGNED]: 'Assigned',
  [JOB_STATUS.IN_PROGRESS]: 'In Progress',
  [JOB_STATUS.WORK_DONE]: 'Work Done',
  [JOB_STATUS.COMPLETED]: 'Completed',
};

// Gender Options
export const GENDER_OPTIONS = ['Male', 'Female', 'Any'];

// User Roles
export const USER_ROLES = {
  CLIENT: 'client',
  FREELANCER: 'freelancer',
  ADMIN: 'admin',
};

// Verification Status
export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// Commission Percentage
export const COMMISSION_PERCENTAGE = 10;

// Minimum Budget
export const MIN_BUDGET = 10;

// OTP Length
export const OTP_LENGTH = 6;

// Phone Number Format
export const PHONE_PREFIX = '+91 ';
export const PHONE_MAX_LENGTH = 17; // +91 XXXXX XXXXX

// Offer Cooldown (in minutes)
export const OFFER_COOLDOWN_MINUTES = 5;

// Resend OTP Cooldown (in seconds)
export const RESEND_OTP_COOLDOWN = 60;

