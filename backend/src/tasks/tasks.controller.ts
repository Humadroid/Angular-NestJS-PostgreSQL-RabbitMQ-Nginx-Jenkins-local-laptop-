import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
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
  create(@Body() dto: CreateTaskDto) {
    return this.tasks.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tasks.remove(id);
  }
}
