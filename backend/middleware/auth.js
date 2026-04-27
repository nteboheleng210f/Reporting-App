const { auth, db } = require('../config/firebase');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: "No token provided" });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(403).json({ success: false, error: "Invalid or expired token" });
  }
};

// ADD THIS FUNCTION
const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const uid = req.user.uid;
      const userDoc = await db.collection('users').doc(uid).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      
      const userRole = userDoc.data().role;
      
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          success: false, 
          error: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
        });
      }
      
      req.userRole = userRole;
      req.userData = userDoc.data();
      next();
    } catch (error) {
      res.status(500).json({ success: false, error: "Authorization failed" });
    }
  };
};

module.exports = { authenticateToken, checkRole };