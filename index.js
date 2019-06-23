const p = require('phin')
const Twit = require('twit')
const dotenv = require('dotenv');
const schedule = require('node-schedule');

dotenv.config();

const T = new Twit({
  consumer_key:         process.env.CONSUMER_KEY,
  consumer_secret:      process.env.CONSUMER_SECRET,
  access_token:         process.env.ACCESS_TOKEN,
  access_token_secret:  process.env.ACCESS_TOKEN_SECRET,
  timeout_ms:           60 * 1000,
});

const stream = T.stream('statuses/filter', { track: ['#150daysofalc4'] });

stream.on('tweet',
  tweet => {
    console.log('tweet received! ', tweet.text)
    T.post('statuses/retweet/:id', {
        id: tweet.id_str
    }, function (err, response) {
        if (response) {
            console.log('Retweeted!!!');
        }
        if (err) {
            console.log(err);
            console.log('Problem when retweeting. Possibly already retweeted this tweet!');
        }
    });
  }
);
var motivate = async function() {
    const res = await p({
        'url': 'http://10.150.35.18/quotes.rest/qod.json?category=inspire',
        'parse': 'json'
    })
    const quote = res.body.contents.quotes[0]
    var tweet = "\"" + quote.quote + "\"\r\n - " + quote.author;
    T.post('statuses/update', { status: tweet }, function(err, data, response) {
        console.log(data.text)
    });
}

var j = schedule.scheduleJob('* * 9 * *', function(){
    motivate();
});