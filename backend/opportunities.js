const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * ===========================
 * Placement / Job Opportunities Management
 * ===========================
 */

// Get all placements
router.get('/all-opportunities', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT * FROM opportunities 
      WHERE posted_by='admin' 
      ORDER BY created_at DESC
    `);
    res.json({ success: true, opportunities: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error while fetching opportunities' });
  }
});

// Add placement
router.post('/add', async (req, res) => {
  try {
    const { company_name, title, eligibility, salary_package, process_details, due_date, description, type, posted_by } = req.body;

    if (!company_name || !title) {
      return res.status(400).json({ success: false, message: 'Title and Company Name are required' });
    }

    await db.query(`
      INSERT INTO opportunities 
      (company_name, title, type, description, eligibility, salary_package, process_details, due_date, posted_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [company_name, title, type || 'placement', description || null, eligibility || null, salary_package || null, process_details || null, due_date || null, posted_by || 'admin']
    );

    res.json({ success: true, message: 'Placement drive added successfully' });
  } catch (err) {
    console.error('Error adding placement drive:', err);
    res.status(500).json({ success: false, message: 'Server error while adding placement drive' });
  }
});

// Delete placement
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM opportunities WHERE id=? AND posted_by="admin"', [id]);
    res.json({ success: true, message: 'Placement drive deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error while deleting placement drive' });
  }
});


module.exports = router;
