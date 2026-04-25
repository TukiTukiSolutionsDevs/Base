import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService, JwtPayload } from './auth.service';

const COOKIE_NAME = 'tuki_token';

const cookieExtractor = (req: Request): string | null => {
  if (!req || !req.cookies) return null;
  const token = req.cookies[COOKIE_NAME];
  return typeof token === 'string' && token.length > 0 ? token : null;
};

export interface ReqUser {
  id: string;
  username: string;
  organization: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly auth: AuthService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET no está definido en el .env');
    super({
      // Soporta cookie HTTP-only (preferido) y Authorization: Bearer (útil para tests)
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<ReqUser> {
    // Verificar que el usuario sigue existiendo (revocación efectiva)
    const user = await this.auth.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Usuario inexistente');
    return {
      id: String(user.id),
      username: user.username,
      organization: user.organization,
    };
  }
}

export const TUKI_COOKIE_NAME = COOKIE_NAME;
