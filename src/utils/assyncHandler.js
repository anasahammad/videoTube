const asyncHandler = (requestHandler)=>{
  return (req, res, next)=>{
        Promise.resolve(requestHandler(req, res, next)).catch((err)=>next(err))
    }
}

export {asyncHandler}

// or try catch
// const asyncHandler = (fn)=> async (req, res, next)=>{
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(err.message || 500).json({
//             success : false,
//             message : error.message
//         })
//     }
// }