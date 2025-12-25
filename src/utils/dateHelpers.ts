// Date utility functions for analytics and reporting

export const startOfDay = (date: Date): Date => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const endOfDay = (date: Date): Date => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

export const startOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const endOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
};

export const startOfWeek = (date: Date): Date => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const endOfWeek = (date: Date): Date => {
  const end = new Date(date);
  const day = end.getDay();
  const diff = end.getDate() + (7 - day) - (day === 0 ? 7 : 0); // Adjust when day is Sunday
  end.setDate(diff);
  end.setHours(23, 59, 59, 999);
  return end;
};

export const getDateRange = (period: string): { start: Date; end: Date } => {
  const end = new Date();
  let start = new Date();

  switch (period) {
    case "today":
      start = startOfDay(end);
      break;
    case "yesterday":
      start = startOfDay(new Date(end));
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "7d":
      start.setDate(end.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case "30d":
      start.setDate(end.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case "90d":
      start.setDate(end.getDate() - 90);
      start.setHours(0, 0, 0, 0);
      break;
    case "current_month":
      start = startOfMonth(end);
      break;
    case "previous_month":
      start = startOfMonth(new Date(end.getFullYear(), end.getMonth() - 1, 1));
      end.setTime(start.getTime());
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    case "1y":
      start.setFullYear(end.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      // Default to last 30 days
      start.setDate(end.getDate() - 30);
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
};

export const formatDateForQuery = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

export const calculateGrowthRate = (
  current: number,
  previous: number
): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
};

export const getDaysArray = (start: Date, end: Date): string[] => {
  const days = [];
  const current = new Date(start);

  while (current <= end) {
    days.push(formatDateForQuery(new Date(current)));
    current.setDate(current.getDate() + 1);
  }

  return days;
};

// Generate monthly labels for charts
export const getMonthlyLabels = (months: number = 12): string[] => {
  const labels = [];
  const current = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(current.getFullYear(), current.getMonth() - i, 1);
    labels.push(
      date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    );
  }

  return labels;
};
