const jwt = require("jsonwebtoken");
const User = require("../models/user");

const authMiddleware = async (req, res, next) => {
   try {

      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
         return res.status(401).json({
            success: false,
            message: "No token provided"
         });
      }

      const token = authHeader.split(" ")[1];

      try {
         const decoded = jwt.verify(token, process.env.JWT_SECRET);
         req.user = decoded;
         req.user.isGoogleUser = false;
         next();
      } catch (err) {
         // Attempt to decode as Firebase / Google token
         const decodedFirebase = jwt.decode(token);
         if (decodedFirebase && decodedFirebase.email) {
            let user = await User.findOne({ email: decodedFirebase.email });
            if (!user) {
               const generatedUsername = (decodedFirebase.name || decodedFirebase.email.split('@')[0])
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, '') + Math.floor(100 + Math.random() * 900);
               user = await User.create({
                  username: generatedUsername,
                  email: decodedFirebase.email,
                  password: "google_auth_placeholder_password",
                  displayName: decodedFirebase.name || "",
                  profilePhoto: decodedFirebase.picture || ""
               });
            }
            req.user = { id: user._id, isGoogleUser: true };
            return next();
         }
         return res.status(401).json({
            success: false,
            message: "Invalid token"
         });
      }

   } catch (error) {
      return res.status(401).json({
         success: false,
         message: "Invalid token"
      });
   }
};

module.exports = authMiddleware;
