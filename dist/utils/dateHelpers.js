"use strict";
// Date utility functions for analytics and reporting
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMonthlyLabels = exports.getDaysArray = exports.calculateGrowthRate = exports.formatDateForQuery = exports.getDateRange = exports.endOfWeek = exports.startOfWeek = exports.endOfMonth = exports.startOfMonth = exports.endOfDay = exports.startOfDay = void 0;
const startOfDay = (date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
};
exports.startOfDay = startOfDay;
const endOfDay = (date) => {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
};
exports.endOfDay = endOfDay;
const startOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
};
exports.startOfMonth = startOfMonth;
const endOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
};
exports.endOfMonth = endOfMonth;
const startOfWeek = (date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
};
exports.startOfWeek = startOfWeek;
const endOfWeek = (date) => {
    const end = new Date(date);
    const day = end.getDay();
    const diff = end.getDate() + (7 - day) - (day === 0 ? 7 : 0); // Adjust when day is Sunday
    end.setDate(diff);
    end.setHours(23, 59, 59, 999);
    return end;
};
exports.endOfWeek = endOfWeek;
const getDateRange = (period) => {
    const end = new Date();
    let start = new Date();
    switch (period) {
        case "today":
            start = (0, exports.startOfDay)(end);
            break;
        case "yesterday":
            start = (0, exports.startOfDay)(new Date(end));
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
            start = (0, exports.startOfMonth)(end);
            break;
        case "previous_month":
            start = (0, exports.startOfMonth)(new Date(end.getFullYear(), end.getMonth() - 1, 1));
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
exports.getDateRange = getDateRange;
const formatDateForQuery = (date) => {
    return date.toISOString().split("T")[0];
};
exports.formatDateForQuery = formatDateForQuery;
const calculateGrowthRate = (current, previous) => {
    if (previous === 0)
        return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(2));
};
exports.calculateGrowthRate = calculateGrowthRate;
const getDaysArray = (start, end) => {
    const days = [];
    const current = new Date(start);
    while (current <= end) {
        days.push((0, exports.formatDateForQuery)(new Date(current)));
        current.setDate(current.getDate() + 1);
    }
    return days;
};
exports.getDaysArray = getDaysArray;
// Generate monthly labels for charts
const getMonthlyLabels = (months = 12) => {
    const labels = [];
    const current = new Date();
    for (let i = months - 1; i >= 0; i--) {
        const date = new Date(current.getFullYear(), current.getMonth() - i, 1);
        labels.push(date.toLocaleDateString("en-US", { month: "short", year: "numeric" }));
    }
    return labels;
};
exports.getMonthlyLabels = getMonthlyLabels;
