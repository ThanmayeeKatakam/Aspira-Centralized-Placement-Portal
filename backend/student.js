// routes/student.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// ✅ 1. Get student details by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [student] = await db.query(
      'SELECT id, name, email, branch, year, cgpa, backlogs FROM students WHERE id = ?',
      [id]
    );

    if (!student.length)
      return res.json({ success: false, message: 'Student not found' });

    res.json({ success: true, student: student[0] });
  } catch (err) {
    console.error('Error fetching student data:', err);
    res.json({ success: false, message: 'Server error' });
  }
});


// ✅ 2. Fetch recent applications (latest 5)
router.get('/:id/applications', async (req, res) => {
  const { id } = req.params;
  try {
    const [apps] = await db.query(
      `SELECT a.id, o.company_name, o.title, a.status, a.applied_on
       FROM applications a 
       JOIN opportunities o ON a.opportunity_id = o.id 
       WHERE a.student_id = ? 
       ORDER BY a.applied_on DESC LIMIT 5`,
      [id]
    );
    res.json({ success: true, applications: apps });
  } catch (err) {
    console.error('Error fetching applications:', err);
    res.json({ success: false, message: 'Server error' });
  }
});


// ✅ 3. Fetch all opportunities (placement + internship) — only upcoming
router.get('/:id/opportunities', async (req, res) => {
  const { id } = req.params;
  try {
    const [[student]] = await db.query(
      'SELECT branch, cgpa, backlogs FROM students WHERE id = ?',
      [id]
    );
    if (!student) return res.json({ success: false, message: 'Student not found' });

    const [opportunities] = await db.query(
      `SELECT * FROM opportunities 
       WHERE (eligibility IS NULL OR eligibility LIKE CONCAT('%', ? ,'%'))
       AND (due_date IS NULL OR due_date >= CURDATE())
       ORDER BY due_date ASC`,
      [student.branch]
    );

    res.json({ success: true, opportunities });
  } catch (err) {
    console.error('Error fetching opportunities:', err);
    res.json({ success: false, message: 'Server error' });
  }
});


// ✅ 4. Apply for an opportunity
router.post('/:id/apply', async (req, res) => {
  const { id } = req.params;
  const { opportunity_id } = req.body;

  if (!opportunity_id)
    return res.json({ success: false, message: 'Missing opportunity_id' });

  try {
    // Check if already applied
    const [existing] = await db.query(
      'SELECT id FROM applications WHERE student_id = ? AND opportunity_id = ?',
      [id, opportunity_id]
    );
    if (existing.length > 0)
      return res.json({ success: false, message: 'Already applied' });

    await db.query(
      'INSERT INTO applications (student_id, opportunity_id) VALUES (?, ?)',
      [id, opportunity_id]
    );

    res.json({ success: true, message: 'Applied successfully!' });
  } catch (err) {
    console.error('Error applying to opportunity:', err);
    res.json({ success: false, message: 'Server error' });
  }
});


// ============================
// 1️⃣  Get all active opportunities for a student
// ============================
// ✅ Fetch placement opportunities only (for student-jobs.html)
router.get('/:id/opportunities', async (req, res) => {
  const { id } = req.params;
  try {
    // Fetch student's details for eligibility matching
    const [[student]] = await db.query(
      'SELECT branch, cgpa, backlogs FROM students WHERE id = ?',
      [id]
    );

    if (!student) {
      return res.json({ success: false, message: 'Student not found' });
    }

    // Fetch only PLACEMENT opportunities (category='Placement')
    const [opportunities] = await db.query(
      `SELECT * FROM opportunities 
       WHERE category = 'Placement'
         AND (eligibility IS NULL OR eligibility LIKE CONCAT('%', ?, '%'))
         AND (due_date IS NULL OR due_date >= CURDATE())
       ORDER BY due_date ASC`,
      [student.branch]
    );

    res.json({ success: true, opportunities });
  } catch (err) {
    console.error('Error fetching placement opportunities:', err);
    res.json({ success: false, message: 'Server error' });
  }
});



// ============================
// 2️⃣  Apply for an opportunity
// ============================
router.post('/:student_id/apply', async (req, res) => {
    const student_id = req.params.student_id;
    const { opportunity_id } = req.body;

    if (!opportunity_id) {
        return res.json({ success: false, message: 'Opportunity ID is required' });
    }

    try {
        // ✅ Check if student already applied
        const [existing] = await db.query(
            'SELECT * FROM applications WHERE student_id = ? AND opportunity_id = ?',
            [student_id, opportunity_id]
        );

        if (existing.length > 0) {
            return res.json({ success: false, message: 'You have already applied for this opportunity' });
        }

        // ✅ Insert new application
        await db.query(
            `INSERT INTO applications (student_id, opportunity_id, status) VALUES (?, ?, 'applied')`,
            [student_id, opportunity_id]
        );

        res.json({ success: true, message: 'Application submitted successfully' });
    } catch (err) {
        console.error('Error applying for opportunity:', err);
        res.status(500).json({ success: false, message: 'Server error while applying' });
    }
});



// ✅ Fetch internship opportunities only (for student-internships.html)
router.get('/:id/internships', async (req, res) => {
  const { id } = req.params;
  try {
    // Fetch student details for eligibility match
    const [[student]] = await db.query(
      'SELECT branch, cgpa, backlogs FROM students WHERE id = ?',
      [id]
    );

    if (!student) {
      return res.json({ success: false, message: 'Student not found' });
    }

    // Fetch only INTERNSHIP opportunities (category='Internship')
    const [opportunities] = await db.query(
      `SELECT * FROM opportunities 
       WHERE category = 'Internship'
         AND (eligibility IS NULL OR eligibility LIKE CONCAT('%', ?, '%'))
         AND (due_date IS NULL OR due_date >= CURDATE())
       ORDER BY due_date ASC`,
      [student.branch]
    );

    res.json({ success: true, opportunities });
  } catch (err) {
    console.error('Error fetching internship opportunities:', err);
    res.json({ success: false, message: 'Server error' });
  }
});


module.exports = router;
