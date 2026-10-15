import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Task {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly http = inject(HttpClient);
  tasks: Task[] = [];
  title = '';
  description = '';
  editingId: number | null = null;
  error = '';
  status = '';

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.http.get<Task[]>('/api/tasks').subscribe({
      next: (tasks) => { this.tasks = tasks; this.error = ''; },
      error: () => { this.error = 'Could not load tasks. Check that the backend and database are running.'; }
    });
  }

  saveTask(): void {
    const cleanTitle = this.title.trim();
    if (!cleanTitle) {
      this.error = 'Title is required.';
      return;
    }

    const payload = { title: cleanTitle, description: this.description.trim() || null };
    const request = this.editingId === null
      ? this.http.post<Task>('/api/tasks', payload)
      : this.http.patch<Task>(`/api/tasks/${this.editingId}`, payload);

    request.subscribe({
      next: () => {
        this.title = '';
        this.description = '';
        this.editingId = null;
        this.status = 'Saved. A task event was published to RabbitMQ.';
        this.error = '';
        this.loadTasks();
      },
      error: (err) => { this.error = err?.error?.message ?? 'Could not save task.'; }
    });
  }

  editTask(task: Task): void {
    this.editingId = task.id;
    this.title = task.title;
    this.description = task.description ?? '';
    this.status = '';
  }

  toggleTask(task: Task): void {
    this.http.patch<Task>(`/api/tasks/${task.id}`, { completed: !task.completed }).subscribe({
      next: () => this.loadTasks(),
      error: () => { this.error = 'Could not update task.'; }
    });
  }

  deleteTask(task: Task): void {
    if (!confirm(`Delete "${task.title}"?`)) return;
    this.http.delete(`/api/tasks/${task.id}`).subscribe({
      next: () => {
        this.status = 'Deleted. A task event was published to RabbitMQ.';
        if (this.editingId === task.id) this.cancelEdit();
        this.loadTasks();
      },
      error: () => { this.error = 'Could not delete task.'; }
    });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.title = '';
    this.description = '';
  }
}
