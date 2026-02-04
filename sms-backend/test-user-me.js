require('dotenv').config({ path: './config.env' });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/userModel');
const Teacher = require('./models/teacherModel');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.DATABASE || 'mongodb://localhost:27017/SMS');

app.get('/test-user-me', async (req, res) => {
  try {
    const user = await User.findOne({ role: 'teacher' }).populate([
      {
        path: 'teacherProfile',
        select: 'name surname email phone subjects lessons classes',
      },
    ]);

    console.log('User found:', user._id);
    console.log('TeacherProfile:', user.teacherProfile);

    res.json({
      status: 'success',
      data: {
        user: user,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(9000, () => {
  console.log('Test server running on port 9000');
});
