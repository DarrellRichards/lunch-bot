const express = require('express');
const app = express();
const fs = require('fs');
const fileName = require('./lunch.json');
const bodyParser = require('body-parser');
const axios = require('axios');
const db = require('./config/db');
const Lunch = require('./schemas/lunch.modal');
const Team = require('./schemas/team.modal');

const { WebClient } = require('@slack/client');
let web;
let fetchCount = 0;
let selectedLocation = null;
const lunchPlaces = fileName;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const setBotToken = (token) => {
  web = new WebClient(token);
  return web;
}

const withinTheLast = (date) => {
    const dateOffset = (24*60*60*1000) * 14;

    const anHourAgo = Date.now() - dateOffset;

    return date > anHourAgo;
}

app.use(async(req, res, next) => {
  const team_id = req.body.team_id;
  const results = await Team.findOne({ team_id: team_id });
  if (results === null) { next(); }
  await setBotToken(results.bot_token);
  next();
})

const refetchLocation = (req) => {
  Lunch.countDocuments().exec((err, count) => {
    const random = Math.floor(Math.random() * count)
    Lunch.findOne().skip(random).exec(
      async (err, result) => {
        if (result.last_used !== null) {
          const time = new Date(result.last_used);
          if (await withinTheLast(time)) {
            if (fetchCount < 15) {
              fetchCount++;
              await refetchLocation(req);
            } else {
              selectedLocation = result;
              await web.chat.postMessage({
                channel: req.body.channel_id,
                text: `Yo! Who Hungry? Let's eat here > ${result.name}. However, Looks like we have ate here within the last 14 days. Let's add more places!`,
                attachments: [
                  {
                    "text": "Is this where we are going?",
                    "fallback": "Yo, We going here?",
                    "callback_id": "wopr_game",
                    "color": "#3AA3E3",
                    "actions": [
                      {
                        "name": "going",
                        "text": "We going?",
                        "type": "button",
                        "style": "primary",
                        "value": "going"
                      },
                      {
                        "name": "notGoing",
                        "text": "Not This Time.",
                        "type": "button",
                        "value": "notGoing"
                      }
                    ]
                  }
                ],
                user: req.body.user_id
              });
            }
          } else {
            await web.chat.postMessage({
              channel: req.body.channel_id,
              text: `Yo! Who Hungry? Let's eat here > ${result.name}. However, Looks like we have ate here within the last 14 days. Let's add more places!`,
              attachments: [
                {
                  "text": "Is this where we are going?",
                  "fallback": "Yo, We going here?",
                  "callback_id": "wopr_game",
                  "color": "#3AA3E3",
                  "actions": [
                    {
                      "name": "going",
                      "text": "We going?",
                      "type": "button",
                      "style": "primary",
                      "value": "going"
                    },
                    {
                      "name": "notGoing",
                      "text": "Not This Time.",
                      "type": "button",
                      "value": "notGoing"
                    }
                  ]
                }
              ],
              user: req.body.user_id
            });
          }
        } else {
          await web.chat.postMessage({
            channel: req.body.channel_id,
            text: `Yo! Who Hungry? Let's eat here > ${result.name}. However, Looks like we have ate here within the last 14 days. Let's add more places!`,
            attachments: [
              {
                "text": "Is this where we are going?",
                "fallback": "Yo, We going here?",
                "callback_id": "wopr_game",
                "color": "#3AA3E3",
                "actions": [
                  {
                    "name": "going",
                    "text": "We going?",
                    "type": "button",
                    "style": "primary",
                    "value": "going"
                  },
                  {
                    "name": "notGoing",
                    "text": "Not This Time.",
                    "type": "button",
                    "value": "notGoing"
                  }
                ]
              }
            ],
            user: req.body.user_id
          });

        }
      })
    })
}

app.get('/', async (req, res) => {
  res.status(200).json({ message: "Successfully added bot" });
  const token = await axios.post(`https://slack.com/api/oauth.access?client_id=17007469173.588732505815&client_secret=600d44b316cb0c2ac0ed1c595db1f999&code=${req.query.code}`)
  const newTeam = new Team({ team_name: token.data.team_name, team_id: token.data.team_id, bot_token: token.data.bot.bot_access_token });
  await newTeam.save();
});

app.post('/get-lunch', (req, res) => {
  Lunch.countDocuments().exec( async(err, count) => {
    if (count === 0) {
      res.status(200)
      await web.chat.postMessage({ channel: req.body.channel_id, text: 'Looks as if we have no lunchs. Say What!', user: req.body.user_id});
      return;
    }
    const random = Math.floor(Math.random() * count)
    Lunch.findOne().skip(random).exec(
      async (err, result) => {
        if (result.last_used !== null) {
          const time = new Date(result.last_used);
          if (await withinTheLast(time)) {
            await refetchLocation(req);
          }
        } else {
          res.status(200).json();
          selectedLocation = result;
          await web.chat.postMessage({ channel: req.body.channel_id, text: 'Look as if we are going! See ya at 12.', replace_orginal: true, user: req.body.user_id});
        }
      })
    })
});

app.post('/get-places', (req, res) => {
  Lunch.find({}).exec( async (err, results) => {
    res.status(200).json();
    const newResults = [];
    await results.map(result => {
      newResults.push({
        "type": "plain_text",
        "text": result.name
      })
    });
    await web.chat.postEphemeral({ channel: req.body.channel_id, text: 'Here is a list of places saved:', attachments: newResults, user: req.body.user_id});
  });
});

app.post('/remove-place', (req, res) => {
  res.status(200);
  Lunch.deleteOne({ name: req.body.text }, async (err) => {
    if (err) { return await web.chat.postEphemeral({ channel: req.body.channel_id, text: 'There was a error with deleting the location, please pass back the full name of the place', user: req.body.user_id }) };
    return await web.chat.postEphemeral({ channel: req.body.channel_id, text: `The following location was removed ${req.body.text}`, user: req.body.user_id })
  });
});

app.post('/post-lunch', async (req, res) => {
  const location = JSON.parse(req.body.payload);
  res.status(200);
  if (location.type === "interactive_message") {
      if (location.actions[0].name === "going") {
        Lunch.findOne({ _id: selectedLocation._id }, async (err, place) => {
          place.last_used = new Date();
          await place.save();
        });
        await web.chat.postMessage({ channel: location.channel.id, text: 'Confirmed! Looks as if we are going! See ya at 12.', user: location.user.id})
      } else {
        await web.chat.postMessage({ channel: location.channel.id, text: 'Ouch that hurts! Looks as if we are not going! Find somewhere else /get-lunch', user: location.user.id})
      }
  } else {
    const newLunch = new Lunch({ name: location.submission.loc_name,  address: location.submission.loc_address });
    await newLunch.save(async (err) => {
      if (err) { return await web.chat.postEphemeral({ channel: location.channel.id, text: 'There was a error adding that location. Could be there was internal error or already created.', user: location.user.id }) }
      await web.chat.postEphemeral({ channel: location.channel.id, text: `You added the following location: ${location.submission.loc_name} located at: ${location.submission.loc_address}`, user: location.user.id})
    });
  }
});

app.post('/add-lunch', (req, res) => {
  if (req.body.trigger_id) {
    web.dialog.open({
      "trigger_id": req.body.trigger_id,
      "dialog": {
        "callback_id": "add-lunch",
        "title": "Add a place to eat!",
        "submit_label": "Save",
        "notify_on_cancel": false,
        "state": "Limo",
        "elements": [
            {
                "type": "text",
                "label": "Location Name",
                "name": "loc_name"
            },
            {
                "type": "text",
                "label": "Location Address",
                "name": "loc_address"
            }
        ]
      }
    });
  }
  res.status(200).json();
});

app.listen(process.env.PORT || 5000, () => console.log(`Gator app listening on port ${process.env.PORT}!`));
