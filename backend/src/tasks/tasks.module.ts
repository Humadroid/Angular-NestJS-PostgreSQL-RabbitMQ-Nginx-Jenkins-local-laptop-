import { Module } from '@nestjs/common';
import { TaskEventsService } from './task-events.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService, TaskEventsService]
})
export class TasksModule {}
