const p = require('phin')
const Twit = require('twit')
const dotenv = require('dotenv');
const schedule = require('node-schedule');

dotenv.config();

const T = new Twit({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET,
  timeout_ms: 60 * 1000,
});

const stream = T.stream('statuses/filter', { track: ['#150daysofalc4', '@150DaysOfALC4'] });
console.log('listening');

stream.on('tweet',
  tweet => {
    if (tweet.user.id_str !== '1142546386187182088') {
      console.log('tweet received! ', tweet.text)
      T.post('statuses/retweet/:id', {
        id: tweet.id_str
      }, function (err, response) {
        if (response) {
          console.log('Retweeted!!!');
        }
        if (err) {
          // console.log(err);
          console.log('Problem when retweeting. Possibly already retweeted this tweet!');
        }
      });
    }
  }
);
var motivate = async function () {
  console.log('trying to motivate someone');
  const res = await p({
    'url': 'http://quotes.rest/qod.json?category=inspire',
    'parse': 'json'
  })
  const quote = res.body.contents.quotes[0]
  var tweet = "\"" + quote.quote + "\"\r\n - " + quote.author;
  // console.log("motivate with: ", tweet);
  
  T.post('statuses/update', { status: tweet }, function (err, data, response) {
    console.log(data.text)
  });
}

var rule = new schedule.RecurrenceRule();
rule.hour = 10;
rule.minute = 30;
var j = schedule.scheduleJob(rule, function () {
  motivate();
});