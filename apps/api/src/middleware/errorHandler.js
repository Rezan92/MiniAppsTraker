export const errorHandler = (err, req, res, next) => {
  console.error('[API Error]:', err.stack || err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code || 'INTERNAL_ERROR'
    }
  });
};
