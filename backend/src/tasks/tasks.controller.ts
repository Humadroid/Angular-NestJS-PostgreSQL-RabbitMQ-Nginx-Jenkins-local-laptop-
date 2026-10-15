import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { createTaskSchema, updateTaskSchema } from './dto/task.schema';
// isolatedModules + emitDecoratorMetadata requires types in decorated signatures to be type-only imports.
import type { CreateTaskInput, UpdateTaskInput } from './dto/task.schema';
import { TasksService } from './tasks.service';

@Controller('api/tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  findAll() {
    return this.tasks.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasks.findOne(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createTaskSchema)) input: CreateTaskInput) {
    return this.tasks.create(input);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateTaskSchema)) input: UpdateTaskInput
  ) {
    return this.tasks.update(id, input);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tasks.remove(id);
  }
}
