// require('dotenv').config({path : './env'})


import  dotenv  from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path : './env'
})
connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`The server is running on port ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log("Mongodb connection failed  :", err)
})



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