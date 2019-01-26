const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const moment = require('moment');

const cors = require('cors')

const mongoose = require('mongoose')

mongoose.connect(process.env.MLAB_URI || 'mongodb://stevencamper:campersteven1@ds149984.mlab.com:49984/exercisetracker')
app.use(cors())
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
})

const schema = mongoose.Schema({
   //userid: String,
   username: String,
   log: [{
     description: {type: String},
     durationg: {type: Number},
     date: {type: Date, default: Date.now}
   }] 
});

const userModel = mongoose.model('userModel', schema);
const deleteAllRecs = function() {
  userModel.deleteMany({}, (err, data) => {
    if (err) console.log("err deleting all");
  })
}
app.get('/api/exercise/log?', (req, res) => {
  // console.log('log? '+req.query._id)
  var id = req.query._id
  var params = {
    id: () => {return req.query._id === ""? 'No date': req.query._id},
    from: () => {return req.query.from === undefined? '': req.query.from},
    to: () => {return req.query.to === undefined? '': req.query.to},
    limit: () => {() => {return req.query.limit === undefined? '': req.query.limit}}
  }
  console.log('get /api/exercise/log?')
  // console.log(params.id)
  userModel.findById((id), (err, data) => {
    if (err) console.log('err finding')
    if (data) {
      console.log('found data')
      console.log(data.username)
      if (params.from() !== '' && params.to() !== '') {
        const from = moment(params.from(), 'YYYY-MM-DD')
        var newData = {
          id: params.id(),
          username: data.username,
          log: []
        }
        data.log.map( (item) => {
          const thisDate = moment(item.date, 'YYYY-MM-DDTHH:mm:ss.SSSZ');
          if (thisDate.isAfter(params.from) && thisDate.isBefore(params.to)) {
              newData.log.push(item)
          }
        })
        res.send(newData);
      } 
      else res.send(data);
    }
    else {
      console.log('no data found')  
    }
  })
})

app.post('/api/exercise/new-user', (req, res) => {
   // deleteAllRecs();
  userModel.find({}, (err, data) => {
    if (err) console.log('err finding'); 
    console.log(data) 
  })
  userModel.findOne({username: req.body.username}, (err, data) => {
    console.log('new user post')
    var entry = req.body.username;
    if (err) console.log("err finding by name")
    if (entry !== "") {
      if (data) {
        res.send("user allready exists");
      }
      else {
        var newUser = new userModel({username: entry})
        newUser.save((err, data) => {
          if (err) console.log("err saving user")
          console.log(entry+" saved")
        })
      }
    }
    else console.log("entry empty");
  })  
})

app.post('/api/exercise/add', (req, res) => {
  console.log('add exercise post')
  var id = req.body.userId;
  var log = {
    description: req.body.description,
    duration: req.body.duration,
    date: req.body.date 
  }
  if (log.description === "" || id === "") {
    res.send("no id or description");  
  } 
  else {
    userModel.findByIdAndUpdate(id, {$push: {log: log}},{upsert: true,new:true}, (err,data)=>{
          if(err) {
            res.send(err);  
          }
          res.send(data)
      })
  }
    console.log("finish add exercise post")
})
// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})


// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
