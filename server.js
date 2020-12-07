require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dns = require('dns');
// Basic Configuration
const port = process.env.PORT || 3000;
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});
const countSchema = new mongoose.Schema({index: Number});
const Short = mongoose.model('Short', urlSchema);
const Count = mongoose.model('Count', countSchema);

app.use(cors());
app.use(bodyParser.urlencoded({extended: false}))

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl/new', async function (req, res){
  try {
    const reqURL = req.body.url;
    let host;
    if(reqURL.startsWith("http://")){host = reqURL.slice(7)}
    else if(reqURL.startsWith("https://")){host = reqURL.slice(8)}
    let address = await dns.lookup(host, (err, address)=> err? console.log(err) : address);
    if(address){
      const entry = await Short.findOne({original_url: reqURL});
      if(entry){
        const {original_url, short_url} = entry;
        res.json({original_url, short_url});
      } else {
        let index = await Count.findOneAndUpdate({}, {$inc: {index: 1}},{new: true, useFindAndModify: false})
        let doc = new Short({original_url: reqURL, short_url: index.index});
        doc.save()
        res.json({original_url: reqURL, short_url: index.index})
        
      }
    } else {
      res.json({ error: 'invalid url' })
    }
  }
  catch (err) {
    console.log(err)
  }
})

app.get('/api/shorturl/:short_url', async function(req, res) {
  try {
    const destination = await Short.findOne({short_url: req.params.short_url})
    if(destination) {
      return res.redirect(destination.original_url);
    }
    else {
      return res.json({error: 'Not a valid URL'})
    }
  }
  catch (err) {
    console.log(err)
  }
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
