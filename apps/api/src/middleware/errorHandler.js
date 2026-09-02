export const createApiError = (message, status = 400, code = 'API_ERROR', details = null) => {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  if (details) err.details = details;
  return err;
};

export const errorHandler = (err, req, res, next) => {
  console.error('[API Error]:', err.stack || err);
  
  let status = err.status || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  if (err.name === 'ZodError' || err.issues) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = err.issues?.[0]?.message || 'Validation failed';
    details = err.issues;
  }

  res.status(status).json({
    success: false,
    error: {
      message,
      code,
      ...(details ? { details } : {})
    }
  });
};
