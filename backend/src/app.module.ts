import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { TasksModule } from './tasks/tasks.module';
import { Task } from './tasks/task.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'hello',
      password: process.env.DB_PASSWORD ?? 'hello-change-this',
      database: process.env.DB_NAME ?? 'hello',
      entities: [Task],
      synchronize: true,
      retryAttempts: 20,
      retryDelay: 3000
    }),
    TasksModule
  ],
  controllers: [AppController]
})
export class AppModule {}
