<?php
declare(strict_types=1);
session_start();

// Якщо вже залогінений — одразу на головну
if (!empty($_SESSION['is_logged_in'])) {
    header('Location: index.php');
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($_POST['username'] === 'admin' && $_POST['password'] === '12345') {
        $_SESSION['is_logged_in'] = true;
        $_SESSION['user_name']    = 'Адміністратор';
        header('Location: index.php');
        exit;
    } else {
        $error = 'Невірний логін або пароль!';
    }
}
?>
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <title>Вхід — Менеджер завдань</title>
    <style>
        body { font-family: sans-serif; max-width: 360px; margin: 80px auto; }
        .error { color: red; margin-bottom: 10px; }
        input[type=text], input[type=password] { width: 100%; padding: 8px; margin-bottom: 10px; box-sizing: border-box; }
        button { width: 100%; padding: 10px; background: #007bff; color: #fff; border: none; cursor: pointer; }
    </style>
</head>
<body>
<h1>Вхід до системи</h1>
<?php if ($error): ?>
    <p class="error"><?= htmlspecialchars($error) ?></p>
<?php endif; ?>
<form method="POST" action="login.php">
    <label>Логін: <input type="text"     name="username" required></label>
    <label>Пароль:<input type="password" name="password" required></label>
    <button type="submit">Увійти</button>
</form>
</body>
</html>
