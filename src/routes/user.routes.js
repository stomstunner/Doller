import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router = Router()

// now here we write the router ka kaam ki ham kya kaam kanrege user router se 

router.route("/register").post(registerUser)

// so hamara final url banaega
// http://localhost:8000/users/register
// and hamne register pe jaane ke kaam register user ko call kar diya hai so ager hamne next login karna pare toh ham bass 

// router.route("/login").post(loginUser)
// so hoga kya ki login route pe jaane ke bass ham url se hi loginuser method ko call kar rahe hai 

export default router