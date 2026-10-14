<?php
declare(strict_types=1);
session_start();

require_once __DIR__ . '/Task.php';
require_once __DIR__ . '/TaskRepository.php';

// Захист від несанкціонованого доступу
if (!isset($_SESSION['is_logged_in']) || $_SESSION['is_logged_in'] !== true) {
    header('Location: login.php');
    exit;
}

$repo = new TaskRepository(__DIR__ . '/tasks.json');

// Обробка дій
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'add') {
        $title    = trim($_POST['title'] ?? '');
        $deadline = trim($_POST['deadline'] ?? '') ?: null;
        if (!empty($title)) {
            $repo->add($title, $deadline);
        }
    }

    if ($action === 'complete') {
        $repo->complete((int) ($_POST['id'] ?? 0));
    }

    if ($action === 'delete') {
        $repo->delete((int) ($_POST['id'] ?? 0));
    }

    header('Location: index.php');
    exit;
}

$tasks = $repo->findAll();
?>
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <title>Менеджер завдань</title>
    <style>
        body { font-family: sans-serif; max-width: 700px; margin: 40px auto; }
        .task { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #ddd; }
        .badge { padding: 2px 8px; border-radius: 10px; font-size: 0.8em; color: #fff; }
        .badge-success  { background: #28a745; }
        .badge-danger   { background: #dc3545; }
        .badge-primary  { background: #007bff; }
        .actions button { margin-left: 4px; cursor: pointer; }
        .stats { margin-bottom: 20px; color: #555; }
    </style>
</head>
<body>
<h1>Менеджер завдань</h1>
<p>Привіт, <strong><?= htmlspecialchars($_SESSION['user_name'] ?? 'Користувач') ?></strong>!
   <a href="login.php">Вийти</a></p>

<div class="stats">
    Всього: <?= count($tasks) ?> |
    Виконано: <?= $repo->countCompleted() ?> |
    Прострочено: <?= $repo->countOverdue() ?>
</div>

<h2>Додати завдання</h2>
<form method="POST" action="index.php">
    <input type="hidden" name="action" value="add">
    <input type="text" name="title" placeholder="Назва завдання" required>
    <input type="date" name="deadline">
    <button type="submit">Додати</button>
</form>

<h2>Список завдань</h2>
<?php foreach ($tasks as $task): ?>
    <?php
    $statusClass = match($task->getStatusLabel()) {
        'Виконано'    => 'badge-success',
        'Прострочено' => 'badge-danger',
        default       => 'badge-primary',
    };
    ?>
    <div class="task">
        <div>
            <strong><?= htmlspecialchars($task->getTitle()) ?></strong>
            <?php if ($task->getDeadline()): ?>
                <small>(до <?= htmlspecialchars($task->getDeadline()) ?>)</small>
            <?php endif; ?>
            <span class="badge <?= $statusClass ?>"><?= $task->getStatusLabel() ?></span>
        </div>
        <div class="actions">
            <?php if (!$task->isCompleted()): ?>
                <form method="POST" action="index.php" style="display:inline">
                    <input type="hidden" name="action" value="complete">
                    <input type="hidden" name="id" value="<?= $task->getId() ?>">
                    <button type="submit">✓</button>
                </form>
            <?php endif; ?>
            <form method="POST" action="index.php" style="display:inline">
                <input type="hidden" name="action" value="delete">
                <input type="hidden" name="id" value="<?= $task->getId() ?>">
                <button type="submit">✕</button>
            </form>
        </div>
    </div>
<?php endforeach; ?>
</body>
</html>
