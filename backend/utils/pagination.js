'use strict';

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getPagination(query, defaults = { page: 1, limit: 20, maxLimit: 100 }) {
  const fallbackPage = toPositiveInteger(defaults.page, 1);
  const fallbackLimit = toPositiveInteger(defaults.limit, 20);
  const maxLimit = toPositiveInteger(defaults.maxLimit, 100);
  const page = toPositiveInteger(query && query.page, fallbackPage);
  const requestedLimit = toPositiveInteger(query && query.limit, fallbackLimit);
  const limit = Math.min(requestedLimit, maxLimit);
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    offset: skip
  };
}

function paginateArray(items, page, limit) {
  const safeItems = Array.isArray(items) ? items : [];
  const safePage = toPositiveInteger(page, 1);
  const safeLimit = toPositiveInteger(limit, 20);
  const total = safeItems.length;
  const totalPages = Math.ceil(total / safeLimit) || 1;
  const start = (safePage - 1) * safeLimit;
  const end = start + safeLimit;

  return {
    items: safeItems.slice(start, end),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1
    }
  };
}

module.exports = {
  getPagination,
  paginateArray
};
