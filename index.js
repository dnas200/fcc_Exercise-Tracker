const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const { MongoClient, UUID } = require('mongodb');
const bodyParser = require('body-parser');

const client = new MongoClient(process.env.DB_connect);
const dbName = client.db("Exercise_tracker");
const collection = dbName.collection("exercisetracker");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', async (req, res) => {
  const _id = new UUID().toString();
  const { username } = req.body;
  try {
    const user = await collection.insertOne({ _id: _id, username: username });
    res.json({ username: username, _id: user.insertedId });
  } catch (error) {
    console.error(error);
    res.json({ error: 'Was not able to create user' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await collection.find().toArray();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.json({ error: 'Was not able to get users' });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const userId = req.params._id;

  if (!description || !duration) {
    res.status(400).json({ error: 'Description and duration are required' });
    return;
  }

  try {
    const user = await collection.findOne({ _id: userId });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const formatEmptyDate = new Date();

    const newExercise = {
      description,
      duration: parseInt(duration),
      date: date ? new Date(date).toDateString() : formatEmptyDate.toDateString(),
    };

    await collection.updateOne(
      { _id: userId },
      { $push: { exercises: newExercise } },
      { upsert: true }
    );

    return res.json({
      _id: userId,
      username: user.username,
      ...newExercise,
    });
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  try {
    const user = await collection.findOne({ _id: userId });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    let logs = Array.isArray(user.exercises) ? user.exercises : [];

    // Apply date filters
    if (from) {
      const fromDate = new Date(from);
      logs = logs.filter(log => new Date(log.date) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      logs = logs.filter(log => new Date(log.date) <= toDate);
    }

    // Apply limit
    if (limit) {
      logs = logs.slice(0, parseInt(limit));
    }

    res.json({
      _id: user._id,
      username: user.username,
      count: logs.length,
      log: logs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
