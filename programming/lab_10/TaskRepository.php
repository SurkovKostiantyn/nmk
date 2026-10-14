<?php
declare(strict_types=1);

require_once __DIR__ . '/Task.php';

class TaskRepository
{
    /** @var Task[] */
    private array $tasks = [];

    private string $storageFile;

    public function __construct(string $storageFile)
    {
        $this->storageFile = $storageFile;
        $this->load();
    }

    // --- Читання ---

    /** @return Task[] */
    public function findAll(): array
    {
        return $this->tasks;
    }

    public function findById(int $id): ?Task
    {
        foreach ($this->tasks as $task) {
            if ($task->getId() === $id) {
                return $task;
            }
        }
        return null;
    }

    // --- Запис ---

    public function add(string $title, ?string $deadline = null): Task
    {
        $newId  = $this->generateNextId();
        $task   = new Task($newId, $title, false, $deadline);
        $this->tasks[] = $task;
        $this->save();
        return $task;
    }

    public function complete(int $id): bool
    {
        $task = $this->findById($id);
        if ($task === null) {
            return false;
        }
        $task->complete();
        $this->save();
        return true;
    }

    public function delete(int $id): bool
    {
        foreach ($this->tasks as $key => $task) {
            if ($task->getId() === $id) {
                unset($this->tasks[$key]);
                $this->tasks = array_values($this->tasks); // Перенумерація
                $this->save();
                return true;
            }
        }
        return false;
    }

    // --- Підрахунки ---

    public function countCompleted(): int
    {
        return count(array_filter($this->tasks, fn(Task $t) => $t->isCompleted()));
    }

    public function countOverdue(): int
    {
        return count(array_filter($this->tasks, fn(Task $t) => $t->isOverdue()));
    }

    // --- Внутрішні методи ---

    private function generateNextId(): int
    {
        if (empty($this->tasks)) {
            return 1;
        }
        $maxId = max(array_map(fn(Task $t) => $t->getId(), $this->tasks));
        return $maxId + 1;
    }

    private function load(): void
    {
        if (!file_exists($this->storageFile)) {
            $this->tasks = [];
            return;
        }
        $json = file_get_contents($this->storageFile);
        $data = json_decode($json, true) ?? [];
        $this->tasks = array_map(fn(array $item) => Task::fromArray($item), $data);
    }

    private function save(): void
    {
        $data = array_map(fn(Task $t) => $t->toArray(), $this->tasks);
        file_put_contents($this->storageFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
}
