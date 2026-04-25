import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from '../domain/user.entity';
import { AuthUserDto } from './dto/login.dto';

interface SeedUserConfig {
  username: string;
  password: string;
  displayName: string;
  organization: string;
}

export interface JwtPayload {
  sub: string;        // user id
  username: string;
  organization: string;
}

const BCRYPT_COST = 12;

/**
 * Schema bootstrap idempotente para `users`.
 * Vive acá (y no en el ETL) porque la tabla `users` es responsabilidad del API,
 * no del loader del .xlsx. CREATE TABLE IF NOT EXISTS hace que sea seguro.
 */
const USERS_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
      id              BIGSERIAL PRIMARY KEY,
      username        VARCHAR(64) NOT NULL UNIQUE,
      password_hash   VARCHAR(255) NOT NULL,
      display_name    VARCHAR(128) NOT NULL,
      organization    VARCHAR(64)  NOT NULL,
      last_login_at   TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_users_org ON users (organization);
`;

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Al arranque:
   *  1) Asegura que la tabla `users` existe (idempotente).
   *  2) Si los 2 usuarios autorizados (TukiTuki y Expertia) no existen,
   *     los crea con las credenciales del .env.
   */
  async onApplicationBootstrap(): Promise<void> {
    await this.ensureSchema();
    const seeds = this.collectSeeds();
    for (const seed of seeds) {
      await this.ensureUser(seed);
    }
  }

  private async ensureSchema(): Promise<void> {
    await this.dataSource.query(USERS_SCHEMA_SQL);
    this.logger.log('users schema OK');
  }

  private collectSeeds(): SeedUserConfig[] {
    const tuki: SeedUserConfig | null = this.tryReadSeed('TUKI');
    const expertia: SeedUserConfig | null = this.tryReadSeed('EXPERTIA');
    return [tuki, expertia].filter((s): s is SeedUserConfig => s !== null);
  }

  private tryReadSeed(prefix: 'TUKI' | 'EXPERTIA'): SeedUserConfig | null {
    const username = this.config.get<string>(`${prefix}_USERNAME`);
    const password = this.config.get<string>(`${prefix}_PASSWORD`);
    const displayName = this.config.get<string>(`${prefix}_DISPLAY_NAME`) ?? username ?? prefix;
    const organization = this.config.get<string>(`${prefix}_ORG`) ?? prefix.toLowerCase();
    if (!username || !password) {
      this.logger.warn(`Seed user ${prefix} skipped: missing ${prefix}_USERNAME or ${prefix}_PASSWORD`);
      return null;
    }
    return { username, password, displayName, organization };
  }

  private async ensureUser(seed: SeedUserConfig): Promise<void> {
    const existing = await this.users.findOne({ where: { username: seed.username } });
    if (existing) {
      this.logger.log(`Seed user "${seed.username}" already exists — left untouched`);
      return;
    }
    const passwordHash = await hash(seed.password, BCRYPT_COST);
    const created = this.users.create({
      username: seed.username,
      passwordHash,
      displayName: seed.displayName,
      organization: seed.organization,
    });
    await this.users.save(created);
    this.logger.log(`Seeded user "${seed.username}" (org=${seed.organization})`);
  }

  // --------------------------------------------------------------------------
  // Login flow
  // --------------------------------------------------------------------------

  async validateCredentials(username: string, password: string): Promise<UserEntity> {
    const user = await this.users.findOne({ where: { username } });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    const ok = await compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');
    return user;
  }

  async issueToken(user: UserEntity): Promise<string> {
    const payload: JwtPayload = {
      sub: String(user.id),
      username: user.username,
      organization: user.organization,
    };
    return this.jwt.signAsync(payload);
  }

  async touchLogin(user: UserEntity): Promise<void> {
    user.lastLoginAt = new Date();
    await this.users.save(user);
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.users.findOne({ where: { id } });
  }

  toDto(user: UserEntity): AuthUserDto {
    return {
      id: String(user.id),
      username: user.username,
      displayName: user.displayName,
      organization: user.organization,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    };
  }
}
