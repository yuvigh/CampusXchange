const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const Item = require("./models/Schema.js");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
let {ItemSchema} = require("./schema.js");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const{isLoggedIn,isOwner} = require("./middleware.js");
const{saveRedirectUrl} = require("./middleware.js");

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine('ejs',ejsMate);
app.use(express.static(path.join(__dirname,"/public")));

const sessionOptions = {
    secret:"mysupersecretcode",
    resave:"false",
    saveUninitialized:true,
    cookie:{
      expires:Date.now() + 7 *24*60*60*1000,
      maxAge: 7 *24*60*60*1000,
      httpOnly:true,//prevent from crossScripting attacks
    }
}


// const userRouter = require("./routes/user.js");


app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next) => {
 res.locals.success = req.flash("success");
 res.locals.error = req.flash("error");
 res.locals.currUser = req.user;
 next();
 });


main().then((req,res) => {
    console.log("DB is Connected");
}).catch((err) =>{
    console.log(err);
})

async function main(){
    await mongoose.connect('mongodb://127.0.0.1:27017/CampusXchange');
}
// const Item1 = new Item({
//     title:"Shoes",
//     description:"Bata shoes",
//     image:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSpMYAIp4_hZTW17-XIawvaKdtdXhRxXACaew&s",
//     price:2000,
//     location:"Hostel D Thapar University"
// });
//  Item1.save();
//index route

const validateItem = (req,res,next) => {
    let {error} = ItemSchema.validate(req.body);
    if(error){
        let errmsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400,errmsg);
    }
    else{
        next();
    }
}


//buy Route
app.get("/Item/:id/buy",isLoggedIn,async(req,res) => {

    const itemid = req.params.id;

    const item1 = await Item.findById(itemid);

    if(!item1)
    {
        return res.status(404).send("Item not found");
    }
    res.render('./listing/buy2.ejs',{item1});
})

app.get("/confirm-purchase/:id",async(req,res) => {
  const itemid = req.params.id;
 let  item1 =  await Item.findById(itemid);
  res.render("./listing/payment_confirm.ejs",{item1})
});


app.post("/confirm-purchase/:id",isLoggedIn,async(req,res) => {
    const itemid = req.params.id;
    const { paymentMethod, cardNumber, expiryDate, cvv, upiId } = req.body;

    // Validate payment method
    if (!paymentMethod) {
        return res.status(400).send('Payment method is required.');
    }

    if (paymentMethod === 'creditCard') {
        if (!cardNumber || !expiryDate || !cvv) {
            return res.status(400).send('All credit card details are required.');
        }
        // Additional validation for credit card details (e.g., format, length)
        if (cardNumber.length !== 16 || !/^\d{16}$/.test(cardNumber)) {
            return res.status(400).send('Invalid credit card number.');
        }
        if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
            return res.status(400).send('Invalid expiry date format. Use MM/YY.');
        }
        if (cvv.length !== 3 || !/^\d{3}$/.test(cvv)) {
            return res.status(400).send('Invalid CVV.');
        }
    } else if (paymentMethod === 'upi') {
        if (!upiId) {
            return res.status(400).send('UPI ID is required.');
        }
        // Additional validation for UPI ID (e.g., format)
        if (!/^\w+@\w+$/.test(upiId)) {
            return res.status(400).send('Invalid UPI ID format.');
        }
    } else if (paymentMethod === 'cod') {
        // No additional details needed for COD
    } else {
        return res.status(400).send('Invalid payment method selected.');
    }

    // If validation passes, proceed with purchase logic
   
    await Item.findByIdAndDelete(itemid);
    req.flash("success","Item got purchased!");
    res.redirect("/Item");
});


//--------------------Categories Routes---------------------------
app.get("/clothes",(req,res) => {
    res.send("clothes");
});



//User Routes
app.get("/signup",(req,res) => {
  res.render("./users/signup.ejs");
});


app.post("/signup",async(req,res) => {
    try{
    let{username,email,password} = req.body;
    const newUser = new User({username,email});
    const regiteredUser = await User.register(newUser,password);
    console.log(regiteredUser);
    req.flash("success","Welcome to CampusXchange");
    res.redirect("/Item");
    }catch(err){
           req.flash("error",err.message);
           res.redirect("/signup");
    }
});


app.get("/login",(req,res) => {
    res.render("./users/login.ejs");
})

app.post("/login",saveRedirectUrl,passport.authenticate('local',{failureRedirect:'/login',failureFlash:true}),async(req,res) =>{
    req.flash("success","welcome back to CampusXchange");
    let redirectUrl = res.locals.redirectUrl || "Item";
    res.redirect(redirectUrl);
})

app.get("/logout",(req,res) => {
    req.logout((err) => {
        if(err)
        {
            next(err);
        }
        req.flash("success","you are logged out now");
        res.redirect("/Item");
    })
})



//--------------------Item Routes-------------------------------
app.get("/Item",wrapAsync(async(req,res) => {
    const Items = await Item.find({});
    res.render("./listing/index.ejs",{Items});
}))

//new route
app.get("/Item/new",isLoggedIn,(req,res) => {
   res.render("./listing/new.ejs");
})

//show route
app.get("/Items/:id",wrapAsync(async (req,res) => {
    let {id} = req.params;
   const Item1 = await Item.findById(id);
   if(!Item1){
    req.flash("error","Item you Requested does not exist");
   }
   res.render("./listing/show.ejs",{Item1});
}))

//Create Route
app.post("/Item",isLoggedIn,wrapAsync(async (req,res,next) => {
   
        let Item1 = req.body.Item;
        const newItem = new Item(Item1);
        newItem.owner = req.user._id;
        await newItem.save();
       req.flash("success","New Listing Created!");
        res.redirect("/Item");
   
}))

//edit route
app.get("/Item/:id/edit",isLoggedIn,isOwner,wrapAsync(async (req,res) => {
    let {id} = req.params;
    const Item1 = await Item.findById(id);
    if(!Item1){
        req.flash("error","Item you Requested does not exist");
       }
      
    res.render("./listing/edit.ejs",{Item1});
}))

//Update route
app.put("/Item/:id",isOwner,wrapAsync(async(req,res) => {
    let {id} = req.params;
    await Item.findByIdAndUpdate(id,{...req.body.Item});
    req.flash("success","Item Updated");
    res.redirect("/Item");
}))

//Delete Route
app.delete("/Item/:id",isOwner,isLoggedIn,wrapAsync(async(req,res) => {
    let {id} = req.params;
    await  Item.findByIdAndDelete(id);
    req.flash("success","Item Deleted");
    res.redirect("/Item");
}))
// app.delete("/Item/:id",async(req,res) => {
//    let {id} = req.params;
//    await Item.findByIdAndDelete(id);
// })


// app.get("/mannat",(req,res) => {
//     res.send("hello");
// })

app.all("*",(req,res,next) => {
    next(new ExpressError(404,"page Not Found"));
})

app.use((err,req,res,next) => {
    //res.send("Something went wrong");
  let{status = 500,message = "Something is Wrong"} = err;
   res.status(status).render("Error.ejs",{message});
})


app.listen(8080,(req,res) => {
    console.log("server is listening");
})