// API 응답 포맷 표준화
module.exports = {
  success(data, message = 'Success') {
    return {
      status: 'success',
      message,
      data,
    };
  },

  error(message, statusCode = 400, details = null) {
    return {
      status: 'error',
      message,
      statusCode,
      details,
    };
  },

  paginated(items, page, pageSize, total) {
    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    };
  },
};
