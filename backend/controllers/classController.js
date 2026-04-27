const { db } = require('../config/firebase');

// Get all classes (for PL/PRL only - NOT for students)
const getClasses = async (req, res) => {
  try {
    const snapshot = await db.collection('classSchedules').get();
    const classes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, classes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new class (PL only)
const createClass = async (req, res) => {
  try {
    const { className, facultyName, venue, day, time } = req.body;

    if (!className || !facultyName || !venue || !day || !time) {
      return res.status(400).json({ success: false, error: 'All fields required' });
    }

    const classData = {
      className,
      facultyName,
      venue,
      day,
      time,
      createdAt: new Date().toISOString(),
      createdBy: "admin"
    };

    const docRef = await db.collection('classSchedules').add(classData);

    res.status(201).json({ 
      success: true, 
      message: 'Class created successfully',
      class: { id: docRef.id, ...classData }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get students for a class (for PL)
const getClassStudents = async (req, res) => {
  try {
    const { classId } = req.params;
    const studentsSnap = await db.collection('users').where('role', '==', 'student').get();
    const students = studentsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      assigned: doc.data().classId === classId
    }));
    res.json({ success: true, students });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Assign student to class (PL only)
const assignStudent = async (req, res) => {
  try {
    const { studentId, classId } = req.body;

    if (!studentId || !classId) {
      return res.status(400).json({ success: false, error: 'Student ID and Class ID required' });
    }

    await db.collection('users').doc(studentId).update({
      classId: classId,
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'Student assigned successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single class by ID - WITH ACCESS CONTROL
const getClassById = async (req, res) => {
  try {
    const { classId } = req.params;
    const studentId = req.headers['x-user-id'];
    
    // Get student's assigned class
    const userDoc = await db.collection('users').doc(studentId).get();
    const studentClassId = userDoc.data()?.classId;
    
    // IMPORTANT: Student can ONLY see their own class
    if (!studentClassId || studentClassId !== classId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const docSnap = await db.collection('classSchedules').doc(classId).get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    res.json({ success: true, class: { id: docSnap.id, ...docSnap.data() } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getClasses, createClass, getClassStudents, assignStudent, getClassById };