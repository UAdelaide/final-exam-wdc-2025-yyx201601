const requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    } else {
        return res.status(401).json({ error: 'Authentication required' });
    }
};

const requireRole = (role) => {
    return (req, res, next) => {
        if (req.session && req.session.user && req.session.user.role === role) {
            return next();
        } else {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
    };
};

module.exports = {
    requireAuth,
    requireRole
  };