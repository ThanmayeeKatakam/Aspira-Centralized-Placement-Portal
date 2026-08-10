const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

// POST /api/login


router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    let table;
    if(role === 'student') table = 'students';
    else if(role === 'faculty') table = 'faculty';
    else if(role === 'admin') table = 'admins';
    else return res.json({ success: false, message: 'Invalid role' });

    const [results] = await db.query(`SELECT * FROM ${table} WHERE email = ?`, [email]);

    console.log('Login attempt:', { email, role });
    if (!results || results.length === 0) {
      console.log('User not found for email:', email);
      return res.json({ success: false, message: `${role} not found` });
    }

    const user = results[0];
    console.log('Stored password from DB:', user.password);   // debug
    console.log('Incoming password length:', (password || '').length);

    const match = await bcrypt.compare(password, user.password);
    console.log('bcrypt.compare result:', match);

    if (!match) return res.json({ success: false, message: 'Incorrect password' });

    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role } });
  } catch (err) {
    console.error('Login error:', err);
    res.json({ success: false, message: 'Server error' });
  }
});


module.exports = router;

// ✅ Promise-based user seeding
// async function seedUsers() {
//     try {
//         // Students
//         const studentPassword = await bcrypt.hash('student123', 10);
//         await db.query(
//             `INSERT IGNORE INTO students (name, email, password, branch, year)
//              VALUES (?, ?, ?, ?, ?)`,
//             ['John Doe', 'student@example.com', studentPassword, 'CSE', '3']
//         );

//         // Faculty
//         const facultyPassword = await bcrypt.hash('faculty123', 10);
//         await db.query(
//             `INSERT IGNORE INTO faculty (name, email, password, department)
//              VALUES (?, ?, ?, ?)`,
//             ['Jane Smith', 'faculty@example.com', facultyPassword, 'Computer Science']
//         );

//         // Admins
//         const adminPassword = await bcrypt.hash('admin123', 10);
//         await db.query(
//             `INSERT IGNORE INTO admins (name, email, password, role)
//              VALUES (?, ?, ?, ?)`,
//             ['Admin One', 'admin@example.com', adminPassword, 'super']
//         );

//         console.log('✅ Sample users created successfully!');
//     } catch (err) {
//         console.error('❌ Error seeding users:', err);
//     }
// }

// // Run seeding once (non-blocking)
// seedUsers();




// router.post('/login', async (req, res) => {
//     const { email, password, role } = req.body;

//     try {
//         let table;
//         if (role === 'student') table = 'students';
//         else if (role === 'faculty') table = 'faculty';
//         else if (role === 'admin') table = 'admins';
//         else return res.json({ success: false, message: 'Invalid role' });

//         // ✅ Promise-based query
//         const [results] = await db.query(`SELECT * FROM ${table} WHERE email = ?`, [email]);

//         if (results.length === 0) {
//             return res.json({ success: false, message: `${role} not found` });
//         }

//         const user = results[0];
//         const match = await bcrypt.compare(password, user.password);

//         if (!match) {
//             return res.json({ success: false, message: 'Incorrect password' });
//         }

//         res.json({
//             success: true,
//             user: { id: user.id, name: user.name, email: user.email, role }
//         });

//     } catch (err) {
//         console.error('Login error:', err);
//         res.json({ success: false, message: 'Server error' });
//     }
// });