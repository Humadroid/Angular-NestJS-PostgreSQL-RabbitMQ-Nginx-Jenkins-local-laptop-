import { Injectable, NotFoundException } from '@nestjs/common';
import type { Task } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskInput, UpdateTaskInput } from './dto/task.schema';
import { TaskEventsService } from './task-events.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: TaskEventsService
  ) {}

  findAll(): Promise<Task[]> {
    return this.prisma.task.findMany({ orderBy: { id: 'desc' } });
  }

  async findOne(id: number): Promise<Task> {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const task = await this.prisma.task.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        completed: input.completed ?? false
      }
    });
    await this.events.publish({ type: 'task.created', task });
    return task;
  }

  async update(id: number, input: UpdateTaskInput): Promise<Task> {
    await this.findOne(id);
    const task = await this.prisma.task.update({ where: { id }, data: input });
    await this.events.publish({ type: 'task.updated', task });
    return task;
  }

  async remove(id: number): Promise<{ deleted: true; id: number }> {
    const task = await this.findOne(id);
    await this.prisma.task.delete({ where: { id } });
    await this.events.publish({ type: 'task.deleted', task });
    return { deleted: true, id };
  }
}
