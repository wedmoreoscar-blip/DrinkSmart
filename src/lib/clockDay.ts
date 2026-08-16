const startOfDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** Whole calendar days from `reference` to `date`; negative when earlier. */
export const calendarDaysAfter = (reference: Date, date: Date): number =>
  Math.round((startOfDay(date) - startOfDay(reference)) / 86_400_000);

/**
 * A qualifier for a bare HH:mm clock that may have crossed midnight. A 21:00
 * last drink plus nineteen hours reads "16:00", which is ambiguous on its own
 * and looks like it has already happened. Returns null while the time is still
 * on the reference day, so same-night readings stay unadorned.
 */
export const clockDayNote = (date: Date | null, reference: Date): string | null => {
  if (!date) return null;
  const days = calendarDaysAfter(reference, date);
  if (days <= 0) return null;
  return days === 1 ? "tomorrow" : `+${days}d`;
};
