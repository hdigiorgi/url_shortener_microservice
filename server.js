'use strict';

var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser')
var validUrl = require('valid-url');
var cors = require('cors');
var app = express();
var port = process.env.PORT || 3000;

// db
require('dotenv').config()
mongoose.connect(process.env.MONGOLAB_URI, { useMongoClient: true });

const CounterSchema = mongoose.Schema({
  name: {type: String, required: true},
  count: {type: Number, default: 0, required: true}
});
const Counter = mongoose.model('urlshortener_counter', CounterSchema);

const LinkSchema = mongoose.Schema({
  _id: {type: Number, required: true},
  url: {type: String, required: true}
})
const Link = mongoose.model('urlshortener_link', LinkSchema);


function getNextCounter() {
    return Counter.findOneAndUpdate({name: 'counter'}, 
      {$inc: {count: 1}},
      {new: true, upsert: true, setDefaultsOnInsert: true})
    .exec()
    .then(update => update.count)
}

function saveUrl(url) {
  return getNextCounter()
    .then(_id => ({_id, url}))
    .then(link =>  Link.create(link))
    .then(link => link._id)
}

function isValidUrl(url) {
  return validUrl.isWebUri(url)
}

function getUrl(id) {
  return Link.findOne({_id: id}).exec().then(x => x && x.url)
}


// base requests
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }))
app.use('/public', express.static(process.cwd() + '/public'));
app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

// create
app.post("/api/shorturl/new", (req, res) => {
  const url = req.body.url;
  if(!isValidUrl(url)){
    res.json({error: 'invalid URL'})
  } else {
    saveUrl(url).then(saved =>{
      if(saved) 
        res.json({original_url: url, short_url: saved})
      else
      res.json({error: 'not saved'})
    })
  }
});

// redirect
app.get("/api/shorturl/:shortUrl", (req, res) => {
  const shortUrl = req.params.shortUrl;
  getUrl(shortUrl).then(fullUrl => {
    if(!fullUrl) {
      res.json({error: 'url not found'});
    } else {
      res.redirect(301, fullUrl);
    }
  })
});

app.listen(port, () =>  console.log('Node.js listening ...') );