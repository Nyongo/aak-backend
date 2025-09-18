import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs'; // for password hashing
import { PrismaService } from '../prisma/prisma.service'; // Assuming you're using Prisma
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Validate user credentials and generate JWT
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        roleId: true,
        password: true,
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        customer: true,
      },
    });
    if (!user) {
      return null; // No user found
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return null; // Password doesn't match
    }

    // If credentials are valid, return user (exclude password)
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phoneNumber: user.phoneNumber,
      customer: user.customer,
    }; // Access the role name
  }

  // Generate JWT token
  async login(user: any) {
    // Update lastLoggedInOn timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoggedInOn: new Date() },
    });

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      roleId: user.roleId,
    };
    return {
      access_token: this.jwtService.sign(payload), // Generate and return token
    };
  }

  // Logout user (for stateless JWT, this is mainly for logging)
  async logout(userId: number) {
    // In a stateless JWT system, logout is typically handled client-side
    // by removing the token from storage. However, we can log the logout event
    // or perform any cleanup if needed.

    // Optional: Log logout event or update user status
    // For now, we'll just return a success response
    // In the future, you could implement token blacklisting if needed

    return {
      message: 'Successfully logged out',
      timestamp: new Date().toISOString(),
    };
  }
}
