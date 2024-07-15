const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
//const bodyParser = require('body-parser');
const mongoose=require('mongoose');
const { ServerDescription } = require('mongodb');

mongoose.connect(process.env.MONGO_URI);

app.use(express.urlencoded({extended:true}));

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const userSchema = new mongoose.Schema({
  username: {type:String, required:true}
})
let userModel =mongoose.model("user",userSchema);

const exerciseSchema = new mongoose.Schema({
  userId:{type: String, required:true},
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date, default: new Date()} 
})
let exerciseModel=mongoose.model("exercise", exerciseSchema);

app.post('/api/users', function(req,res){
  let username = req.body.username;
  let newUser = userModel({username: username});
  newUser.save();
  res.json(newUser);
})

app.get('/api/users',function(req,res){
//return a list of all users
  userModel.find({}).then(function(users){
  res.json(users)
})
})

app.post('/api/users/:_id/exercises',function(req,res){
  let userId = req.params._id;
  let exerciseObj ={
    userId: userId,
    description: req.body.description,
    duration: req.body.duration
  }
  if (req.body.date != ''){
    exerciseObj.date=req.body.date;
  }
  let newExercise=new exerciseModel(exerciseObj);
  userModel.findById(userId).then((userFound)=>{
    newExercise.save();
    res.json({
      _id: userFound._id,
      username: userFound.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString()
    })
  });

});

app.get('/api/users/:_id/logs', function(req, res){
  //find user
  let userId = req.params._id;
  let responseObj = {};
  let limitParam = req.query.limit;
  let toParam = req.query.to;
  let fromParam=req.query.from;

  limitParam = limitParam ? parseInt(limitParam):limitParam;

  let queryObj={userId: userId};
  //need date param if have from or to parameter
  if (fromParam || toParam){
    queryObj.date = {};
    if (fromParam){
      queryObj.date['$gte'] = new Date(fromParam);
    }
    if (toParam){
      queryObj.date['$lte'] = new Date(toParam);
    }
  }
  
  userModel.findById(userId).then((userFound)=>{
    //find all exercises by username
    let username=userFound.username;
    
    responseObj={_id:userFound._id,
      username:username
    }
    exerciseModel.find(queryObj).limit(limitParam).then((exercises)=>{
      //return string date format
      exercises=exercises.map((x) => {
        return{
          description:x.description,
          duration:x.duration,
          date:x.date.toDateString()
        }
      })
      responseObj.log = exercises;
      responseObj.count=exercises.length;
      res.json(responseObj);
    })

  });
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
