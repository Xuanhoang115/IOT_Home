import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { FirebaseService, firebaseService, VerifiedUser } from '../services/firebaseService';
import { ApiError } from './errorHandler';

declare global {
  namespace Express {
    interface Request {
      user?: VerifiedUser;
      homeId?: string;
    }
  }
}

export function createAuthMiddleware(
  store: FirebaseService = firebaseService,
  defaultHomeId: string = env.HOME_ID
) {
  return async function authMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new ApiError(
          401,
          'Thiếu hoặc sai định dạng header Authorization: Bearer <ID_Token>',
          'UNAUTHORIZED'
        );
      }

      const rawToken = authHeader.slice('Bearer '.length).trim();
      if (!rawToken) {
        throw new ApiError(401, 'Firebase ID Token không được để trống', 'UNAUTHORIZED');
      }

      let verifiedUser: VerifiedUser;
      try {
        verifiedUser = await store.verifyIdToken(rawToken);
      } catch {
        throw new ApiError(
          401,
          'Firebase ID Token không hợp lệ hoặc đã hết hạn',
          'UNAUTHORIZED'
        );
      }

      const targetHomeId = (req.query.homeId as string | undefined) || defaultHomeId;
      const allowed = await store.hasHomeAccess(verifiedUser.uid, targetHomeId);
      if (!allowed) {
        throw new ApiError(
          403,
          `Tài khoản '${verifiedUser.uid}' không có quyền truy cập ngôi nhà '${targetHomeId}'`,
          'FORBIDDEN_HOME_ACCESS'
        );
      }

      req.user = verifiedUser;
      req.homeId = targetHomeId;
      next();
    } catch (err) {
      next(err);
    }
  };
}
