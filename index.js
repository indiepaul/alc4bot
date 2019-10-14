const p = require('phin')
const Twit = require('twit')
const dotenv = require('dotenv');
const schedule = require('node-schedule');
const MongoClient = require('mongodb').MongoClient

dotenv.config();

const ab = { user: 'skrypt', passwd: 'MayFlower' }

const client = new MongoClient(process.env.DB_CONN_STRING, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(function (err) {
  if (err !== null) {
    console.log("Connection error");
    return;
  }
  console.log("Connected to db");
  const db = client.db('test');
  const T = new Twit({
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token: process.env.ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET,
    timeout_ms: 60 * 1000,
  });
  const hashtags = process.env.HASHTAGS.split(' ');
  const mentions = process.env.MENTIONS.split(' ');
  const userId = process.env.USER_ID;
  const track = [...hashtags, ...mentions]
  const stream = T.stream('statuses/filter', { track });
  console.log('Listening...');
  let tweetIds = [];
  stream.on('tweet',
    tweet => {
      try {
        if (tweet.user.id_str !== userId && originalOrHastaggedRetweet(tweet, hashtags, mentions)) {
          db.collection('tweets').findOne({
            id_str: tweet.id_strs
          }, function (err, r) {
            if (r == null) {
              const id = tweetIds.indexOf(tweet.id_str)
              if (id == -1) {
                tweetIds.push(tweet.id_str)
                T.post('statuses/retweet/:id', {
                  id: tweet.id_str
                }, function (err, response) {
                  if (err) {
                    console.log('Problem when retweeting. Possibly already retweeted this tweet!', err);
                  }
                });
                db.collection('tweets').insertOne({
                  id_str: tweet.id_str, text: tweet.text
                }, function (err, r) {
                  if (err !== null) {
                    console.log("db write error");
                    return;
                  }
                  else {
                    tweetIds.splice(tweetIds.indexOf(tweet.id_str), 1)
                  }
                });
              }
            }
          });
        }
      }
      catch(e) {
        console.log(e);
      }
    }
  );
  var motivate = async function () {
    const res = await p({
      'url': 'http://quotes.rest/qod.json?category=inspire',
      'parse': 'json'
    })
    if (res.body.error) {
      console.log('Error: ', res.body.error);
      return;
    }
    if (res.body.contents.quotes) {
      const quote = res.body.contents.quotes[0]
      var tweet = "\"" + quote.quote + "\"\r\n - " + quote.author;
      T.post('statuses/update', { status: tweet }, function (err, data, response) {
        console.log("motivate: ***** ", data.text)
      });
    }
  }

  var rule = new schedule.RecurrenceRule();
  rule.minute = 0;
  rule.hour = 10;
  var j = schedule.scheduleJob(rule, function () {
    motivate();
  });
});

function originalOrHastaggedRetweet(tweet, hashtags, mentions) {
  if (tweet.retweeted_status) {
    const retweetText = tweet.text.slice(0, tweet.text.indexOf(tweet.retweeted_status.text.slice(0, 10)))
    if (hashtags.map(i => i.toLowerCase()).includes(retweetText.toLowerCase()))
      return true
    if(mentions.map(i => i.toLowerCase()).includes(retweetText.toLowerCase()))
      return true
    return false
  }
  if (tweet.in_reply_to_status_id
    || tweet.in_reply_to_status_id_str
    || tweet.in_reply_to_user_id
    || tweet.in_reply_to_user_id_str
    || tweet.in_reply_to_screen_name) {
    return false
  }
  return true;
}
