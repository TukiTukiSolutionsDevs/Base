import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from '../application/auth.service';
import { AuthUserDto, LoginDto } from '../application/dto/login.dto';
import { Public } from '../application/jwt-auth.guard';
import { TUKI_COOKIE_NAME } from '../application/jwt.strategy';
import { ReqUser } from '../application/jwt.strategy';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const buildCookieOptions = (config: ConfigService): CookieOptions => ({
  httpOnly: true,
  secure: (config.get<string>('COOKIE_SECURE') ?? 'false') === 'true',
  sameSite: ((config.get<string>('COOKIE_SAMESITE') as CookieOptions['sameSite']) ?? 'lax'),
  path: '/',
  maxAge: TWELVE_HOURS_MS,
});

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: AuthUserDto }> {
    const user = await this.auth.validateCredentials(body.username, body.password);
    const token = await this.auth.issueToken(user);
    await this.auth.touchLogin(user);

    res.cookie(TUKI_COOKIE_NAME, token, buildCookieOptions(this.config));
    return { user: this.auth.toDto(user) };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(TUKI_COOKIE_NAME, { ...buildCookieOptions(this.config), maxAge: 0 });
  }

  @Get('me')
  async me(@Req() req: Request): Promise<{ user: AuthUserDto }> {
    const reqUser = req.user as ReqUser | undefined;
    if (!reqUser) throw new UnauthorizedException();
    const user = await this.auth.findById(reqUser.id);
    if (!user) throw new UnauthorizedException();
    return { user: this.auth.toDto(user) };
  }
}
