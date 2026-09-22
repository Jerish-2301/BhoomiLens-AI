import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { User, Role } from '../types/models';
import { randomUUID } from 'crypto';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findOneByEmail(email: string): Promise<User | null> {
    const results = await this.db.query<User>('users', 'email', '==', email);
    return results.length > 0 ? results[0] : null;
  }

  async findOneById(id: string): Promise<User | null> {
    return this.db.get<User>('users', id);
  }

  async createUser(data: Partial<User>): Promise<User> {
    const id = data.id || randomUUID();
    const user: User = {
      id,
      email: data.email!,
      name: data.name!,
      password: data.password,
      role: data.role || Role.PUBLIC,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.db.set('users', user, id);
    return user;
  }
}
