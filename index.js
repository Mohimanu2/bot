const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const badWords = require('./badwords');

const app = express();
app.use(bodyParser.json());


const PAGE_ACCESS_TOKEN = "EAAS5huj0IjUBPhqs1XI34w8Vz2x9D78oRK7dfXsN00OFjQKa9UKQbKNBR6lBf9NSSVojX7aoI7hPhhtRRsPe0i7rFBXAv59hWCP4LlJUZCpQFAoGKfiIx05ep719JEz2VE3HzPGzA31I3ttgLpVbqNRHv3XggZBtRM2HhmZB1HQgKqEq3h9idoUt4tYkqWYlpjYzQZDZD";
const VERIFY_TOKEN = "cod57";

// Track violations
let userViolations = {};

// Send message to user
async function sendText(senderId, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v16.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      { recipient: { id: senderId }, message: { text } }
    );
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}

// Check for bad words
function containsBadWord(text) {
  const lowerText = text.toLowerCase();
  return badWords.some(word => lowerText.includes(word));
}

// Simple chat responses
function getChatResponse(text) {
  text = text.toLowerCase();
  if (text.includes("hello") || text.includes("hi")) return "Hello! I'm watching the chat 😎";
  if (text.includes("how are you")) return "I'm just a bot, but I'm doing fine!";
  if (text.includes("capital of bangladesh")) return "The capital of Bangladesh is Dhaka.";
  if (text.includes("who created you?")) return "Mohimanul Islam";
  return null;
}

// Handle incoming messages
async function handleMessage(senderId, text) {
  if (containsBadWord(text)) {
    if (!userViolations[senderId]) userViolations[senderId] = 0;
    userViolations[senderId] += 1;
    await sendText(senderId, `⚠️ Warning! Please avoid bad language. Violations: ${userViolations[senderId]}`);
    return;
  }
  const reply = getChatResponse(text);
  if (reply) await sendText(senderId, reply);
}

// Webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) res.status(200).send(challenge);
  else res.sendStatus(403);
});

// Webhook to receive messages
app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.object === 'page') {
    for (const entry of body.entry) {
      for (const event of entry.messaging) {
        if (event.message && event.message.text) {
          await handleMessage(event.sender.id, event.message.text);
        }
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else res.sendStatus(404);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
