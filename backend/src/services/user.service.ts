import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';

export class UserService {
  // User Registration
  static async register(userData: any) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    return await prisma.user.create({
      data: {
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        role: userData.role || 'STAFF',
      },
      select: { // Password wapis nahi bhejni response mein
        user_id: true,
        username: true,
        email: true,
        role: true
      }
    });
  }

  // Find user for Login
  static async validateUser(email: string) {
    return await prisma.user.findUnique({
      where: { email }
    });
  }

  static async getAll() {
    return await prisma.user.findMany({
      select: { user_id: true, username: true, email: true, role: true, is_active: true }
    });
  }
  static async update(id: number, data: any) {
    return await prisma.user.update({
      where: { user_id: id },
      data: {
        username: data.username,
        email: data.email,
        is_active: data.is_active,
        // Role update ko restrict karna behtar hai, par agar karna ho:
        // role: data.role 
      },
      select: { user_id: true, username: true, email: true, role: true, is_active: true }
    });
  }

  static async getuserbyid(id:number){
    return prisma.user.findUnique({
      where:{
        user_id:id
      },
      select: { user_id: true, username: true, email: true, role: true, is_active: true }
    })
  }

  static async changePassword(id: number, currentPassword: string, newPassword: string) {
    // Fetch user with password for verification
    const user = await prisma.user.findUnique({ where: { user_id: id } });
    if (!user) throw new Error('User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new Error('CURRENT_PASSWORD_WRONG');

    const hashed = await bcrypt.hash(newPassword, 10);
    return await prisma.user.update({
      where: { user_id: id },
      data: { password: hashed },
      select: { user_id: true, username: true, email: true, role: true }
    });
  }
}