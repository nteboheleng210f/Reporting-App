const { db, auth } = require('../config/firebase');

const register = async (req, res) => {
  console.log("📥 Received:", req.body);
  
  try {
    const { username, email, phone, password, role } = req.body;

    if (!username || !email || !password || !phone || !role) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: "Password should be at least 6 characters" });
    }

    const validRoles = ['student', 'lecturer', 'prl', 'pl'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: "Invalid role selected" });
    }

    try {
      const existingUser = await auth.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ success: false, error: "Email already registered" });
      }
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: username,
    });

    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      username: username,
      email: email,
      phone: phone,
      role: role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const customToken = await auth.createCustomToken(userRecord.uid);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token: customToken,
      user: {
        uid: userRecord.uid,
        username: username,
        email: email,
        role: role,
        phone: phone
      }
    });

  } catch (error) {
    console.error("Registration error:", error);
    
    let message = "Registration failed";
    if (error.code === 'auth/email-already-exists') message = "Email already registered";
    else if (error.code === 'auth/invalid-email') message = "Invalid email format";
    else if (error.code === 'auth/weak-password') message = "Password should be at least 6 characters";
    
    res.status(500).json({ success: false, error: message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password required" });
    }

    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (error) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "User profile not found" });
    }

    const userData = userDoc.data();
    const customToken = await auth.createCustomToken(userRecord.uid);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token: customToken,
      user: {
        uid: userRecord.uid,
        username: userData.username || userRecord.displayName,
        email: userRecord.email,
        role: userData.role,
        phone: userData.phone
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, error: "Login failed. Please try again." });
  }
};

const getMe = async (req, res) => {
  try {
    const uid = req.user.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    
    res.status(200).json({ success: true, user: userDoc.data() });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to get user data" });
  }
};

const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const allowedRoles = ['student', 'lecturer', 'prl', 'pl'];
    
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, error: "Invalid role" });
    }
    
    if (!['prl', 'pl'].includes(req.userRole)) {
      return res.status(403).json({ success: false, error: "Insufficient permissions" });
    }
    
    const usersSnapshot = await db.collection('users').where('role', '==', role).get();
    const users = [];
    usersSnapshot.forEach(doc => { users.push(doc.data()); });
    
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
};

module.exports = { register, login, getMe, getUsersByRole };