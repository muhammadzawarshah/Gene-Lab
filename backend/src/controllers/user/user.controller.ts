import { Request, Response } from 'express';
import { UserService } from '../../services/user.service.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// JWT Secret: Isse ideally .env file mein hona chahiye
const JWT_SECRET = process.env.JWT_SECRET || 'virtue_os_secret_2026';

export class UserController {
  
  /**
   * User Registration
   */
  static async register(req: Request, res: Response) {
    try {
      // User service se user create karein
      const user = await UserService.register(req.body);
      
      // Password sensitive data hai, isliye response se delete kar rahe hain
      const userResponse = { 
        id: user.user_id, 
        email: user.email, 
        role: user.role 
      };

      return res.status(201).json({
        message: "User registered successfully",
        user: userResponse
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * User Login & Token Generation
   */
  static async login(req: Request, res: Response) {
    try {
      console.log("Login Attempt for:", req.body.email);
      const { email, password } = req.body;

      // 1. Check if user exists
      const user = await UserService.validateUser(email);

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // 2. Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (isMatch) {
        // 3. Generate JWT Token
        const token = jwt.sign(
          { 
            id: user.user_id, 
            email: user.email, 
            role: user.role 
          },
          JWT_SECRET,
          { expiresIn: '7d' } // Token 7 din tak valid rahega
        );

        // 4. Send Success Response
        // Frontend 'response.data.token' isi field ko read karega
        return res.status(200).json({ 
          success:true,
          message: "successful", 
          token: token, 
          user: { 
            id:user.user_id,
            useremail: user.email, 
            role: user.role 
          } 
        });

      } else {
        return res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (error: any) {
      console.error("Controller Error:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  /**
   * Get All Users
   */
  static async listAll(_req: Request, res: Response) {
    try {
      const users = await UserService.getAll();
      return res.status(200).json(users);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async updatePartner(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const updatedUser = await UserService.update(Number(id), req.body);
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Update Error:", error);
      res.status(500).json({ message: "Failed to update network node" });
    }
  }

  static async getuser(req:Request,res:Response){
     try {
      const id = req.params.id;
      const updatedUser = await UserService.getuserbyid(Number(id));
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Update Error:", error);
      res.status(500).json({ message: "Failed to update network node" });
    }
  }
}