const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.UserAuth = async(req, res, next) => {
    try {
        const token = req.cookies.token;
        console.log("Token:", req.cookies);
        if(!token){
            return res.status(401).json({
                message:"the token has expired or not present"
            });
        }
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        if(!verified){
            return res.status(401).json({message:"Token verification failed"});
        }
        req.userId = verified.userId;
        next();
    } catch (error) {
        return res.status(500).json({
            Message: "Server Error , occured in user authorization",
            error:error.Message
        });
    }
}