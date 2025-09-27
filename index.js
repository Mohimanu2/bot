const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const badWords = require('./badwords');

const app = express();
app.use(bodyParser.json());

// ⚠️ Put your Page Access Token here
const PAGE_ACCESS_TOKEN = "PASTE_YOUR_PAGE_ACCESS_TOKEN_HERE";
const VERIFY_TOKEN = "mysecret123";

// Track violations
let userViolations = {};

// Send message
async function sendText(senderId, text) {
  await axios.post(
    `https://graph.facebook.com/v16.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    { recipient: { id: senderId }, message: { text } }
  ).catch(err => console.error(err.response?.data || err.message));
}

// Bad word check
function containsBadWord(text) {
  const lowerText = text.toLowerCase();
  return badWords.some(word => lowerText.includes(word));
}

// Simple chat responses
function getChatResponse(text) {
  text = text.toLowerCase();
  if(text.includes("hello") || text.includes("hi")) return "Hello! I'm watching the chat 😎";
  if(text.includes("how are you")) return "I'm just a bot, but I'm doing fine!";
  if(text.includes("capital of bangladesh")) return "The capital of Bangladesh is Dhaka.";
  return null;
}

// Handle incoming messages
async function handleMessage(senderId, text) {
  if(containsBadWord(text)) {
    if(!userViolations[senderId]) userViolations[senderId] = 0;
    userViolations[senderId] += 1;
    await sendText(senderId, `⚠️ Warning! Please avoid bad language. Violations: ${userViolations[senderId]}`);
    return;
  }
  const reply = getChatResponse(text);
  if(reply) await sendText(senderId, reply);
}

// Webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if(mode && token === VERIFY_TOKEN) res.status(200).send(challenge);
  else res.sendStatus(403);
});

// Webhook messages
app.post('/webhook', async (req, res) => {
  const body = req.body;
  if(body.object === 'page') {
    for(const entry of body.entry) {
      for(const event of entry.messaging) {
        if(event.message && event.message.text) {
          await handleMessage(event.sender.id, event.message.text);
        }
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else res.sendStatus(404);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
