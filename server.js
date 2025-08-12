/********************************************************************************
* WEB322 – Assignment 06
*
* I declare that this assignment is my own work and completed based on my
* current understanding of the course concepts.
*
* The assignment was completed in accordance with:
* a. The Seneca's Academic Integrity Policy
* https://www.senecacollege.ca/about/policies/academic-integrity-policy.html
*
* b. The academic integrity policies noted in the assessment description
*
* I did NOT use generative AI tools (ChatGPT, Copilot, etc) to produce the code
* for this assessment.
*
* Name: Armin Iranpour Student ID: 173917238
*
********************************************************************************/

const HTTP_PORT = process.env.PORT || 8080;

const express = require("express");
const path = require("path");

const app = express();
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));  // css files
app.set("view engine", "ejs");      //ejs
app.use(express.urlencoded({ extended: true })); //forms

const session = require('express-session')
app.use(session({
   secret: "the quick brown fox jumped over the lazy dog 1234567890",  
   resave: false,
   saveUninitialized: true
}))

require("dotenv").config()   
const mongoose = require('mongoose')

function ensureAuth(req, res, next) {
  if (!req.session.userId) return res.redirect("/?msg=loginRequired");
  next();
}



const userSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, unique: true },
  password: { type: String, required: true }
});

const carSchema = new mongoose.Schema({
  model: { type: String, required: true },
  imageUrl: { type: String, required: true },
  returnDate: { type: String, default: "" },
  rentedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
});

const User = mongoose.model("User", userSchema);
const Car  = mongoose.model("Car", carSchema);

app.get("/", async (req, res) => {
  const info = req.query.msg === "loginRequired" ? "You need to log in to view this page." : null;
  return res.render("login", { info });
});


app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).render("login", { error: "Please enter both email and password." });
  }

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email, password });
  } else {
    if (user.password !== password) {
      return res.status(401).render("login", { error: "Username or password is incorrect." });
    }
  }
  req.session.userId = user._id.toString();
  req.session.email = user.email;
  return res.redirect("/cars");
});

app.get("/logout", async (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.get("/cars", ensureAuth, async (req, res) => {
  const cars = await Car.find({}).lean();
  return res.render("cars.ejs", { cars, userId: req.session.userId });
});

app.get("/book", ensureAuth, async (req, res) => {
  const id = req.query.id;
  if (!id) return res.redirect("/cars");
  const car = await Car.findById(id).lean();
  if (!car || car.rentedBy) return res.redirect("/cars");
  return res.render("bookingForm.ejs", { car });
});

app.post("/book", ensureAuth, async (req, res) => {
  const { carId, returnDate } = req.body;
  const car = await Car.findById(carId);
  if (!car || car.rentedBy) return res.redirect("/cars");

  car.rentedBy = req.session.userId;
  car.returnDate = (returnDate || "").trim();
  await car.save();

  return res.redirect("/cars");
});

app.post("/cars/:id/return", ensureAuth, async (req, res) => {
  const { id } = req.params;
  const car = await Car.findById(id);
  if (car && car.rentedBy && car.rentedBy.toString() === req.session.userId) {
    car.rentedBy = null;
    car.returnDate = "";
    await car.save();
  }
  return res.redirect("/cars");
});


async function startServer() {
    try {    
        await mongoose.connect(process.env.MONGO_CONNECTION_STRING, { dbName: "A6" });

        console.log("SUCCESS connecting to MONGO database")
        console.log("STARTING Express web server")        
        
        app.listen(HTTP_PORT, () => {     
            console.log(`server listening on: http://localhost:${HTTP_PORT}`) 
        })    
    }
    catch (err) {        
        console.log("ERROR: connecting to MONGO database")        
        console.log(err)
        console.log("Please resolve these errors and try again.")
    }
}
startServer()



