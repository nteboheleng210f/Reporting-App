// Update createClass - remove venue, day, time, add semester
const createClass = async (req, res) => {
  try {
    const { className, facultyName, semester } = req.body;

    if (!className || !facultyName || !semester) {
      return res.status(400).json({ success: false, error: 'Class Name, Faculty, and Semester are required' });
    }

    const classData = {
      className,
      facultyName,
      semester,
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
    };

    const docRef = await db.collection('classSchedules').add(classData);

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      class: { id: docRef.id, ...classData },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update class
const updateClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { className, facultyName, semester } = req.body;

    const classRef = db.collection('classSchedules').doc(classId);
    const docSnap = await classRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    await classRef.update({
      className,
      facultyName,
      semester,
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'Class updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete class
const deleteClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const classRef = db.collection('classSchedules').doc(classId);
    const docSnap = await classRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    await classRef.delete();

    res.json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Unassign student from class
const unassignStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const userDoc = await db.collection('users').doc(studentId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    await db.collection('users').doc(studentId).update({
      classId: null,
      updatedAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'Student unassigned successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};