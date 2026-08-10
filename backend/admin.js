const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

/**
 * ===========================
 * Faculty Management (Admin)
 * ===========================
 */

// Get all faculty with summary stats
router.get('/faculty', async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT f.*, 
                (SELECT COUNT(*) FROM mentorships m WHERE m.faculty_id=f.id) AS studentsMentored,
                (SELECT COUNT(*) FROM opportunities o WHERE o.faculty_id=f.id AND o.type='internship') AS internships,
                (SELECT COUNT(*) FROM opportunities o WHERE o.faculty_id=f.id AND o.type='hackathon') AS hackathons,
                (SELECT COUNT(*) FROM opportunities o WHERE o.faculty_id=f.id AND o.type='competition') AS competitions,
                (SELECT COUNT(*) FROM faculty_blogs b WHERE b.faculty_id=f.id) AS blogs,
                (SELECT COUNT(*) FROM placement_participation p WHERE p.faculty_id=f.id) AS drivesParticipated
            FROM faculty f
        `);

        const faculty = results.map(f => ({
            id: f.id,
            name: f.name,
            email: f.email,
            department: f.department,
            inDrive: f.drivesParticipated > 0,
            studentsMentored: f.studentsMentored,
            opportunities: {
                internships: f.internships,
                hackathons: f.hackathons,
                competitions: f.competitions
            },
            blogs: f.blogs,
            activenessScore: Math.round((f.internships + f.hackathons + f.competitions + f.blogs) / 4 * 25)
        }));

        res.json({ success: true, faculty });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'Server error' });
    }
});

// Add new faculty
router.post('/add-faculty', async (req, res) => {
    try {
        const { name, email, department, password } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO faculty (name,email,department,password) VALUES (?,?,?,?)',
            [name, email, department, hashed]);
        res.json({ success: true });
    } catch(err) {
        console.error(err);
        res.json({ success: false, message: 'Failed to add faculty' });
    }
});

// Remove faculty
router.delete('/remove-faculty/:email', async (req, res) => {
    try {
        const { email } = req.params;
        await db.query('DELETE FROM faculty WHERE email=?', [email]);
        res.json({ success: true });
    } catch(err) {
        console.error(err);
        res.json({ success: false, message: 'Failed to remove faculty' });
    }
});

// Toggle faculty active/inactive
router.patch('/toggle-faculty/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('UPDATE faculty SET is_active = NOT is_active WHERE id=?', [id]);
        res.json({ success: true, message: 'Faculty status updated' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'Failed to toggle status' });
    }
});

// Update faculty details
router.patch('/update-faculty', async (req, res) => {
    try {
        const { email, name, department } = req.body;
        if (!email || !name || !department) {
            return res.json({ success: false, message: 'Missing required fields' });
        }

        const [result] = await db.query(
            'UPDATE faculty SET name=?, department=? WHERE email=?',
            [name, department, email]
        );

        if (result.affectedRows === 0) {
            return res.json({ success: false, message: 'No such faculty found' });
        }

        res.json({ success: true, message: 'Faculty updated successfully' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'Server error while updating faculty' });
    }
});

/**
 * ===========================
 * Faculty Performance Analytics
 * ===========================
 */
router.get('/faculty-performance', async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT f.id, f.name, f.department, f.email,
                (SELECT COUNT(*) FROM opportunities o WHERE o.faculty_id=f.id) AS totalOpportunities,
                (SELECT COUNT(*) FROM faculty_blogs b WHERE b.faculty_id=f.id) AS totalBlogs,
                (SELECT COUNT(*) FROM mentorships m WHERE m.faculty_id=f.id) AS totalMentorships,
                (SELECT COUNT(*) FROM placement_participation p WHERE p.faculty_id=f.id) AS totalPlacements,
                COALESCE(f.last_active, f.created_at) AS lastActive
            FROM faculty f
        `);

        const performance = results.map(f => ({
            id: f.id,
            name: f.name,
            email: f.email,
            department: f.department,
            totalContributions: f.totalOpportunities + f.totalBlogs + f.totalMentorships,
            lastActive: f.lastActive,
            rating: Math.min(100, (f.totalContributions * 10)) // example rating logic
        }));

        res.json({ success: true, performance });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'Failed to fetch faculty performance' });
    }
});





// =============== Add Placement Drive ===================
router.post('/add-placement', async (req, res) => {
  try {
    const { company_name, job_role, eligibility, salary_package, location, bond, process_details, due_date, description } = req.body;

    if (!company_name || !job_role || !eligibility || !salary_package || !location || !process_details || !due_date || !description)
      return res.json({ success: false, message: 'All fields are required' });

    await db.query(`
      INSERT INTO opportunities 
      (company_name, job_role, eligibility, salary_package, location, bond, process_details, due_date, description, title, type, posted_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [company_name, job_role, eligibility, salary_package, location, bond, process_details, due_date, description, job_role, 'placement', 'admin']
    );

    res.json({ success: true, message: 'Placement drive added successfully' });
  } catch (err) {
    console.error('Error adding placement drive:', err);
    res.json({ success: false, message: 'Server error while adding placement drive' });
  }
});

// =============== View All Opportunities ===================
router.get('/all-opportunities', async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM opportunities WHERE posted_by='admin' ORDER BY created_at DESC`);
    res.json({ success: true, opportunities: rows });
  } catch (err) {
    console.error('Error fetching admin opportunities:', err);
    res.json({ success: false, message: 'Server error while fetching opportunities' });
  }
});

// =============== Delete Placement ===================
router.delete('/delete-placement/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM opportunities WHERE id=? AND posted_by="admin"', [id]);
    res.json({ success: true, message: 'Placement drive deleted successfully' });
  } catch (err) {
    console.error('Error deleting placement drive:', err);
    res.json({ success: false, message: 'Server error while deleting placement drive' });
  }
});



module.exports = router;














// const express = require('express');
// const router = express.Router();
// const db = require('../db');
// const bcrypt = require('bcrypt');

// // Get all faculty with summary stats
// router.get('/faculty', async (req, res) => {
//     try {
//         const [results] = await db.query(`
//             SELECT f.*, 
//                 (SELECT COUNT(*) FROM mentorships m WHERE m.faculty_id=f.id) AS studentsMentored,
//                 (SELECT COUNT(*) FROM opportunities o WHERE o.faculty_id=f.id AND o.type='internship') AS internships,
//                 (SELECT COUNT(*) FROM opportunities o WHERE o.faculty_id=f.id AND o.type='hackathon') AS hackathons,
//                 (SELECT COUNT(*) FROM opportunities o WHERE o.faculty_id=f.id AND o.type='competition') AS competitions,
//                 (SELECT COUNT(*) FROM faculty_blogs b WHERE b.faculty_id=f.id) AS blogs,
//                 (SELECT COUNT(*) FROM placement_participation p WHERE p.faculty_id=f.id) AS drivesParticipated
//             FROM faculty f
//         `);

//         const faculty = results.map(f => ({
//             id: f.id,
//             name: f.name,
//             email: f.email,
//             department: f.department,
//             inDrive: f.drivesParticipated > 0,
//             studentsMentored: f.studentsMentored,
//             opportunities: {
//                 internships: f.internships,
//                 hackathons: f.hackathons,
//                 competitions: f.competitions
//             },
//             blogs: f.blogs,
//             activenessScore: Math.round((f.internships+f.hackathons+f.competitions+f.blogs)/4*25)
//         }));

//         res.json({ success: true, faculty });
//     } catch (err) {
//         console.error(err);
//         res.json({ success: false, message: 'Server error' });
//     }
// });

// // Add new faculty
// router.post('/add-faculty', async (req, res) => {
//     try {
//         const { name, email, department, password } = req.body;
//         const hashed = await bcrypt.hash(password, 10);
//         await db.query('INSERT INTO faculty (name,email,department,password) VALUES (?,?,?,?)',
//             [name,email,department,hashed]);
//         res.json({ success: true });
//     } catch(err) {
//         console.error(err);
//         res.json({ success: false, message: 'Failed to add faculty' });
//     }
// });

// // Remove faculty
// router.delete('/remove-faculty/:email', async (req, res) => {
//     try {
//         const { email } = req.params;
//         await db.query('DELETE FROM faculty WHERE email=?', [email]);
//         res.json({ success: true });
//     } catch(err) {
//         console.error(err);
//         res.json({ success: false, message: 'Failed to remove faculty' });
//     }
// });

// // Get detailed faculty activity by ID
// router.get('/faculty/:id', async (req, res) => {
//     try {
//         const { id } = req.params;

//         const [facultyRes] = await db.query('SELECT * FROM faculty WHERE id=?', [id]);
//         if(facultyRes.length === 0) return res.json({ success: false, message: 'Faculty not found' });
//         const faculty = facultyRes[0];

//         const [opportunities] = await db.query('SELECT * FROM opportunities WHERE faculty_id=?', [id]);
//         const [blogs] = await db.query('SELECT * FROM faculty_blogs WHERE faculty_id=?', [id]);
//         const [mentorships] = await db.query(`
//             SELECT m.*, s.name AS studentName, s.email AS studentEmail
//             FROM mentorships m
//             JOIN students s ON s.id=m.student_id
//             WHERE m.faculty_id=?
//         `, [id]);
//         const [placements] = await db.query(`
//             SELECT p.*, s.name AS studentName
//             FROM placement_participation p
//             JOIN students s ON s.id=p.student_id
//             WHERE p.faculty_id=?
//         `, [id]);

//         res.json({ success:true, faculty, opportunities, blogs, mentorships, placements });
//     } catch(err) {
//         console.error(err);
//         res.json({ success:false, message:'Server error' });
//     }
// });

// // Get faculty by email with all activity
// router.get('/faculty-email/:email', async (req, res) => {
//     try {
//         const { email } = req.params;
//         const [facultyRes] = await db.query('SELECT * FROM faculty WHERE email=?', [email]);
//         if(facultyRes.length === 0) return res.json({ success:false, message:'Faculty not found' });
//         const faculty = facultyRes[0];

//         const [opportunities] = await db.query('SELECT * FROM opportunities WHERE faculty_id=?', [faculty.id]);
//         const [blogs] = await db.query('SELECT * FROM faculty_blogs WHERE faculty_id=?', [faculty.id]);
//         const [mentorships] = await db.query(`
//             SELECT m.*, s.name AS studentName, s.email AS studentEmail
//             FROM mentorships m
//             JOIN students s ON s.id=m.student_id
//             WHERE m.faculty_id=?
//         `, [faculty.id]);
//         const [placements] = await db.query(`
//             SELECT p.*, s.name AS studentName
//             FROM placement_participation p
//             JOIN students s ON s.id=p.student_id
//             WHERE p.faculty_id=?
//         `, [faculty.id]);

//         res.json({ success:true, faculty, opportunities, blogs, mentorships, placements });

//     } catch(err) {
//         console.error(err);
//         res.json({ success:false, message:'Server error' });
//     }
// });

// // Add opportunity for a faculty
// // router.post('/add-opportunity', async (req, res) => {
// //     try {
// //         const { facultyEmail, title, type, description } = req.body;

// //         const [facultyRes] = await db.query('SELECT * FROM faculty WHERE email=?', [facultyEmail]);
// //         if(facultyRes.length === 0) return res.json({ success:false, message:'Faculty not found' });

// //         await db.query('INSERT INTO opportunities (faculty_id,title,type,description) VALUES (?,?,?,?)', 
// //             [facultyRes[0].id, title, type, description]);

// //         res.json({ success:true });
// //     } catch(err){
// //         console.error(err);
// //         res.json({ success:false, message:'Failed to add opportunity' });
// //     }
// // });

// // // Add opportunity assigned to faculty
// // router.post('/add-opportunity', async (req,res)=>{
// //     try{
// //         const { facultyEmail, title, type, description } = req.body;
// //         if(!['internship','hackathon','competition'].includes(type)){
// //             return res.json({ success:false, message:'Invalid opportunity type' });
// //         }

// //         // Get faculty id by email
// //         const [facultyRes] = await db.query('SELECT id FROM faculty WHERE email=?', [facultyEmail]);
// //         if(facultyRes.length===0) return res.json({ success:false, message:'Faculty not found' });

// //         const facultyId = facultyRes[0].id;

// //         await db.query('INSERT INTO opportunities (faculty_id,title,type,description) VALUES (?,?,?,?)',
// //             [facultyId,title,type,description]);
// //         res.json({ success:true });
// //     } catch(err){
// //         console.error(err);
// //         res.json({ success:false, message:'Server error' });
// //     }
// // });

// // Add opportunity (faculty limited)
// router.post('/add-opportunity', async (req, res) => {
//   try {
//     const { facultyEmail, title, type, description } = req.body;

//     // Validation
//     if (!facultyEmail || !title || !type || !description) {
//       return res.json({ success: false, message: 'Missing required fields' });
//     }

//     // Restrict type
//     const allowedTypes = ['internship', 'hackathon', 'competition'];
//     if (!allowedTypes.includes(type.toLowerCase())) {
//       return res.json({
//         success: false,
//         message: 'Faculty can only post internship, hackathon, or competition',
//       });
//     }

//     // Find faculty ID
//     const [facultyRes] = await db.query('SELECT id FROM faculty WHERE email=?', [facultyEmail]);
//     if (facultyRes.length === 0) {
//       return res.json({ success: false, message: 'Faculty not found' });
//     }
//     const facultyId = facultyRes[0].id;

//     // Insert into opportunities
//     await db.query(
//       `INSERT INTO opportunities (faculty_id, title, type, description)
//        VALUES (?, ?, ?, ?)`,
//       [facultyId, title, type, description]
//     );

//     res.json({ success: true, message: 'Opportunity added successfully' });
//   } catch (err) {
//     console.error('Error adding opportunity:', err);
//     res.json({ success: false, message: 'Server error while posting opportunity' });
//   }
// });

// // View all opportunities by a specific faculty
// router.get('/view-opportunities/:facultyEmail', async (req, res) => {
//   try {
//     const { facultyEmail } = req.params;

//     const [facultyRes] = await db.query('SELECT id FROM faculty WHERE email=?', [facultyEmail]);
//     if (facultyRes.length === 0) {
//       return res.json({ success: false, message: 'Faculty not found' });
//     }

//     const facultyId = facultyRes[0].id;
//     const [rows] = await db.query(
//       'SELECT * FROM opportunities WHERE faculty_id=? ORDER BY created_at DESC',
//       [facultyId]
//     );

//     res.json({ success: true, opportunities: rows });
//   } catch (err) {
//     console.error('Error fetching opportunities:', err);
//     res.json({ success: false, message: 'Server error while fetching opportunities' });
//   }
// });

// // View all opportunities (public view)
// router.get('/all-opportunities', async (req, res) => {
//   try {
//     const [rows] = await db.query(`
//       SELECT o.id, o.title, o.type, o.description, o.created_at, f.name AS faculty_name
//       FROM opportunities o
//       JOIN faculty f ON o.faculty_id = f.id
//       ORDER BY o.created_at DESC
//     `);
//     res.json({ success: true, opportunities: rows });
//   } catch (err) {
//     console.error('Error fetching all opportunities:', err);
//     res.json({ success: false, message: 'Server error while fetching opportunities' });
//   }
// });


// // Update opportunity (faculty only)
// router.put('/update-opportunity/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { facultyEmail, title, type, description } = req.body;

//     if (!facultyEmail || !title || !type || !description) {
//       return res.json({ success: false, message: 'Missing required fields' });
//     }

//     // Get faculty ID
//     const [facultyRes] = await db.query('SELECT id FROM faculty WHERE email=?', [facultyEmail]);
//     if (facultyRes.length === 0) {
//       return res.json({ success: false, message: 'Faculty not found' });
//     }
//     const facultyId = facultyRes[0].id;

//     // Update only if it belongs to the faculty
//     const [result] = await db.query(
//       `UPDATE opportunities 
//        SET title=?, type=?, description=? 
//        WHERE id=? AND faculty_id=?`,
//       [title, type, description, id, facultyId]
//     );

//     if (result.affectedRows === 0) {
//       return res.json({ success: false, message: 'No such opportunity or unauthorized update' });
//     }

//     res.json({ success: true, message: 'Opportunity updated successfully' });
//   } catch (err) {
//     console.error('Error updating opportunity:', err);
//     res.json({ success: false, message: 'Server error while updating opportunity' });
//   }
// });


// // Delete opportunity (faculty or admin)
// router.delete('/delete-opportunity/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { facultyEmail, role } = req.body; // role can be 'faculty' or 'admin'

//     // Admin can delete directly
//     if (role === 'admin') {
//       await db.query('DELETE FROM opportunities WHERE id=?', [id]);
//       return res.json({ success: true, message: 'Opportunity deleted by admin' });
//     }

//     // Otherwise, check ownership
//     const [facultyRes] = await db.query('SELECT id FROM faculty WHERE email=?', [facultyEmail]);
//     if (facultyRes.length === 0) {
//       return res.json({ success: false, message: 'Faculty not found' });
//     }
//     const facultyId = facultyRes[0].id;

//     const [result] = await db.query('DELETE FROM opportunities WHERE id=? AND faculty_id=?', [
//       id,
//       facultyId,
//     ]);

//     if (result.affectedRows === 0) {
//       return res.json({ success: false, message: 'No such opportunity or unauthorized delete' });
//     }

//     res.json({ success: true, message: 'Opportunity deleted successfully' });
//   } catch (err) {
//     console.error('Error deleting opportunity:', err);
//     res.json({ success: false, message: 'Server error while deleting opportunity' });
//   }
// });


// // Faculty performance analytics for admin dashboard
// router.get('/faculty-performance', async (req, res) => {
//     try {
//         const [results] = await db.query(`
//             SELECT f.id, f.name, f.department, f.email,
//                 (SELECT COUNT(*) FROM opportunities o WHERE o.faculty_id=f.id) AS totalOpportunities,
//                 (SELECT COUNT(*) FROM faculty_blogs b WHERE b.faculty_id=f.id) AS totalBlogs,
//                 (SELECT COUNT(*) FROM mentorships m WHERE m.faculty_id=f.id) AS totalMentorships,
//                 (SELECT COUNT(*) FROM placement_participation p WHERE p.faculty_id=f.id) AS totalPlacements,
//                 COALESCE(f.last_active, f.created_at) AS lastActive
//             FROM faculty f
//         `);

//         const performance = results.map(f => ({
//             id: f.id,
//             name: f.name,
//             email: f.email,
//             department: f.department,
//             totalContributions: f.totalOpportunities + f.totalBlogs + f.totalMentorships,
//             lastActive: f.lastActive,
//             rating: Math.min(100, (f.totalContributions * 10)) // example rating logic
//         }));

//         res.json({ success: true, performance });
//     } catch (err) {
//         console.error(err);
//         res.json({ success: false, message: 'Failed to fetch faculty performance' });
//     }
// });


// router.patch('/toggle-faculty/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         await db.query('UPDATE faculty SET is_active = NOT is_active WHERE id=?', [id]);
//         res.json({ success: true, message: 'Faculty status updated' });
//     } catch (err) {
//         console.error(err);
//         res.json({ success: false, message: 'Failed to toggle status' });
//     }
// });


// // Update faculty details
// router.patch('/update-faculty', async (req, res) => {
//     try {
//         const { email, name, department } = req.body;
//         if (!email || !name || !department) {
//             return res.json({ success: false, message: 'Missing required fields' });
//         }

//         const [result] = await db.query(
//             'UPDATE faculty SET name=?, department=? WHERE email=?',
//             [name, department, email]
//         );

//         if (result.affectedRows === 0) {
//             return res.json({ success: false, message: 'No such faculty found' });
//         }

//         res.json({ success: true, message: 'Faculty updated successfully' });
//     } catch (err) {
//         console.error(err);
//         res.json({ success: false, message: 'Server error while updating faculty' });
//     }
// });


// module.exports = router;
