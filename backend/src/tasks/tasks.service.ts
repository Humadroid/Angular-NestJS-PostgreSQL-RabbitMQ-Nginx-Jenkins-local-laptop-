import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskEventsService } from './task-events.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    private readonly events: TaskEventsService
  ) {}

  findAll(): Promise<Task[]> {
    return this.tasks.find({ order: { id: 'DESC' } });
  }

  async findOne(id: number): Promise<Task> {
    const task = await this.tasks.findOneBy({ id });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async create(dto: CreateTaskDto): Promise<Task> {
    const task = await this.tasks.save(this.tasks.create({
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      completed: dto.completed ?? false
    }));
    await this.events.publish({ type: 'task.created', task });
    return task;
  }

  async update(id: number, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    if (dto.title !== undefined) task.title = dto.title.trim();
    if (dto.description !== undefined) task.description = dto.description?.trim() || null;
    if (dto.completed !== undefined) task.completed = dto.completed;
    const saved = await this.tasks.save(task);
    await this.events.publish({ type: 'task.updated', task: saved });
    return saved;
  }

  async remove(id: number): Promise<{ deleted: true; id: number }> {
    const task = await this.findOne(id);
    await this.tasks.remove(task);
    await this.events.publish({ type: 'task.deleted', task });
    return { deleted: true, id };
  }
}
