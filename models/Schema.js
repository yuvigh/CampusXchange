const mongoose = require("mongoose");
// const Schema = mongoose.Schema;

const Schema1 = new mongoose.Schema({
    title:{
        type:String,
        requires:true,
    },
    description:String,
    image:{
        type:String,
        default:"https://unsplash.com/photos/a-single-leaf-on-a-twig-in-a-forest-913aM5bLFIg",
        set:(v) => v === ""?"https://unsplash.com/photos/a-single-leaf-on-a-twig-in-a-forest-913aM5bLFIg":v,
    
    },
    price:Number,
    location:String,
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User",
    },
    // category:{
    //     type:String,
    // }
});
const Item = mongoose.model("Item",Schema1);
module.exports = Item;