import { Router } from 'express';
import { z } from 'zod';

import { rateLimit } from '../../middleware/rate-limit';
import { AuthService } from '../../services/auth.service';

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  password: z.string().min(12).max(200),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(200),
});

const authService = new AuthService();

export const authRouter = Router();

authRouter.post('/register', rateLimit({ keyPrefix: 'register', limit: 10, windowSeconds: 60 }), async (request, response, next) => {
  try {
    const input = registerSchema.parse(request.body);
    const result = await authService.register(input);
    response.status(201).json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', rateLimit({ keyPrefix: 'login', limit: 20, windowSeconds: 60 }), async (request, response, next) => {
  try {
    const input = loginSchema.parse(request.body);
    const result = await authService.login(input);
    response.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
});
