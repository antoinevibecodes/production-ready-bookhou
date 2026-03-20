// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// BUG #8: This middleware should block employees from admin-only routes,
// but the export endpoint does NOT use this middleware (intentional bug)
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.session.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Token-based or session-based access for waiver routes
function requireAuthOrToken(req, res, next) {
  // Check for a valid token query param first
  const token = req.query.token || req.params.token;
  if (token) {
    // Look up invitation by token to validate access
    req.prisma.invitation.findUnique({ where: { token } })
      .then(invitation => {
        if (invitation) {
          req.tokenInvitation = invitation;
          return next();
        }
        // Also check waiver tokens
        return req.prisma.waiver.findUnique({ where: { token } })
          .then(waiver => {
            if (waiver) {
              req.tokenWaiver = waiver;
              return next();
            }
            // Token not found, fall back to session auth
            if (!req.session || !req.session.userId) {
              return res.status(401).json({ error: 'Authentication required' });
            }
            next();
          });
      })
      .catch(() => {
        if (!req.session || !req.session.userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        next();
      });
  } else {
    // No token provided, require session auth
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  }
}

module.exports = { requireAuth, requireAdmin, requireAuthOrToken };
