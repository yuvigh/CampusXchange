const Item = require("./models/Schema.js");

module.exports.isLoggedIn = (req,res,next) => {
    if(!req.isAuthenticated())
    {
        req.session.redirectUrl = req.originalUrl;
        req.flash("error","you must be logged in!");
        return res.redirect("/login");
    }
    next();
}

module.exports.saveRedirectUrl = (req,res,next) => {
    if(req.session.redirectUrl){
       res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
};

module.exports.isOwner = async(req,res,next) => {
    let {id} = req.params;
    let Item1 = await Item.findById(id);
    if(!Item1.owner.equals(res.locals.currUser._id))
    {
     req.flash("error","You are not the Owner of this Item");
     return res.redirect(`/Item/${id}`);
    }
    next();
}