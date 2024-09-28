// require('dotenv').config({path : './env'})


import  dotenv  from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path : './env'
})
connectDB()



//this is the first approach to connect with database
/*

const app = express()

(async ()=>{
    try {
       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

       app.on("error", (error)=>{
        console.log("Error: ", error)
        throw error
       })

       app.listen(port, ()=>{
        console.log(`The server is running on port ${port}`)
       })
    } catch (error) {
        console.error("Error: ", error)
        throw error
    }
})()

*/