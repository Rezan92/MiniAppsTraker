export const requireRole = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Forbidden: No role assigned in current workspace context',
          code: 'FORBIDDEN'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Forbidden: Action requires one of [${allowedRoles.join(', ')}]`,
          code: 'FORBIDDEN'
        }
      });
    }

    next();
  };
};
