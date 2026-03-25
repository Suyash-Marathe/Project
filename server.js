const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = "mongodb://127.0.0.1:27017/societyApp";

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  role: String
});
const User = mongoose.model('User', userSchema);

const pollSchema = new mongoose.Schema({
  question: String,
  options: [{ text: String, votes: { type: Number, default: 0 } }],
  comments: [{ user: String, text: String }],
  votedUsers: { type: [String], default: [] }
});
const Poll = mongoose.model('Poll', pollSchema);

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Local MongoDB Connected Successfully');
    
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) await User.create({ username: 'admin', password: 'admin123', role: 'admin' });

    const peopleExists = await User.findOne({ username: 'people' });
    if (!peopleExists) await User.create({ username: 'people', password: 'people123', role: 'people' });

    const people2Exists = await User.findOne({ username: 'people2' });
    if (!people2Exists) await User.create({ username: 'people2', password: 'people223', role: 'people' });
  })
  .catch(err => console.log('MongoDB Connection Error:', err));

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    
    if (user) {
      res.json({ success: true, role: user.role, username: user.username });
    } else {
      res.status(401).json({ success: false, message: 'Invalid Credentials' });
    }
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existing = await User.findOne({ username });
    
    if (existing) {
      return res.status(400).json({ error: "Username already exists in the system" });
    }

    const newUser = new User({ username, password, role: 'people' });
    await newUser.save();
    res.json({ success: true, user: newUser });
  } catch (err) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.get('/api/polls', async (req, res) => {
  try {
    const polls = await Poll.find();
    res.json(polls);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch polls" });
  }
});

app.post('/api/polls', async (req, res) => {
  try {
    const newPoll = new Poll(req.body);
    await newPoll.save();
    res.json(newPoll);
  } catch (err) {
    res.status(500).json({ error: "Failed to create poll" });
  }
});

app.post('/api/polls/:id/vote', async (req, res) => {
  try {
    const { optionIndex, user } = req.body;
    const poll = await Poll.findById(req.params.id);
    
    if (!poll.votedUsers) {
      poll.votedUsers = [];
    }

    if (poll.votedUsers.includes(user)) {
      return res.status(400).json({ error: "Error: You have already voted on this poll" });
    }

    poll.options[optionIndex].votes += 1;
    poll.votedUsers.push(user);
    await poll.save();
    res.json(poll);
  } catch (err) {
    res.status(500).json({ error: "Failed to register vote" });
  }
});

app.post('/api/polls/:id/comment', async (req, res) => {
  try {
    const { user, text } = req.body;
    const poll = await Poll.findById(req.params.id);
    poll.comments.push({ user, text });
    await poll.save();
    res.json(poll);
  } catch (err) {
    res.status(500).json({ error: "Failed to add comment" });
  }
});

app.delete('/api/polls/:id', async (req, res) => {
  try {
    await Poll.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete poll" });
  }
});

app.listen(5000, () => {
  console.log(`App running on http://localhost:5000`);
});