import { addDaysISO, diffDays, startsAt, todayISO, toMinutes } from './datetime.js';

// Mirrors the backend slot rules (SlotService). The backend remains the final judge.
export function validateSlotForm({ slotDate, startTime, endTime }) {
  const errors = {};
  if (!slotDate) errors.slotDate = 'Date is required';
  if (!startTime) errors.startTime = 'Start time is required';
  if (!endTime) errors.endTime = 'End time is required';
  if (Object.keys(errors).length) return errors;

  const length = toMinutes(endTime) - toMinutes(startTime);
  if (length <= 0) errors.endTime = 'End time must be after start time';
  else if (length < 10 || length > 180) errors.endTime = 'Slot length must be between 10 and 180 minutes';

  if (startsAt(slotDate, startTime) <= new Date()) errors.slotDate = 'Slot must start in the future';
  else if (diffDays(todayISO(), slotDate) > 90) errors.slotDate = 'Slots can be created at most 90 days ahead';
  return errors;
}

export const slotDateBounds = () => ({ min: todayISO(), max: addDaysISO(todayISO(), 90) });
