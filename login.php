<?php
require_once __DIR__ . "/AdminAuth.php";

$next = admin_safe_next(isset($_GET["next"]) ? $_GET["next"] : "settings.php");
$error = "";

if (admin_is_logged_in()) {
    header("Location: " . $next);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $password = isset($_POST["password"]) ? (string)$_POST["password"] : "";
    $next = admin_safe_next(isset($_POST["next"]) ? $_POST["next"] : $next);
    $result = admin_login($password);
    if ($result["ok"]) {
        header("Location: " . $next);
        exit;
    }
    $error = "Неверный пароль";
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Вход — Школьный зодиак</title>
  <link rel="stylesheet" href="style.css" />
  <style>
    .admin-login {
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: radial-gradient(ellipse at 30% 20%, #1a2744, #070a12 70%);
      color: #e8eef8;
      font: 15px/1.4 system-ui, sans-serif;
    }
    .admin-login__card {
      width: min(360px, calc(100vw - 32px));
      padding: 24px 22px 20px;
      border-radius: 12px;
      background: rgba(12, 16, 28, 0.92);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
    }
    .admin-login__card h1 {
      margin: 0 0 8px;
      font-size: 1.25rem;
    }
    .admin-login__card p {
      margin: 0 0 16px;
      opacity: 0.7;
      font-size: 0.9rem;
    }
    .admin-login__card label {
      display: grid;
      gap: 6px;
      margin-bottom: 14px;
      font-size: 0.85rem;
    }
    .admin-login__card input[type="password"] {
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 8px;
      padding: 10px 12px;
      background: rgba(0, 0, 0, 0.35);
      color: #e8eef8;
      font: inherit;
    }
    .admin-login__card button {
      width: 100%;
      border: 0;
      border-radius: 8px;
      padding: 10px 12px;
      background: #3a6ea5;
      color: #fff;
      font: inherit;
      cursor: pointer;
    }
    .admin-login__error {
      color: #ffb4b4;
      margin: 0 0 12px;
      font-size: 0.9rem;
    }
    .admin-login__back {
      display: inline-block;
      margin-top: 14px;
      color: #9eb6d4;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <div class="admin-login">
    <form class="admin-login__card" method="post" action="login.php">
      <h1>Админ-вход</h1>
      <p>Настройки по умолчанию, обводка и расстановка звёзд.</p>
      <?php if ($error !== ""): ?>
        <p class="admin-login__error"><?php echo htmlspecialchars($error, ENT_QUOTES, "UTF-8"); ?></p>
      <?php endif; ?>
      <input type="hidden" name="next" value="<?php echo htmlspecialchars($next, ENT_QUOTES, "UTF-8"); ?>" />
      <label>
        <span>Пароль</span>
        <input type="password" name="password" autocomplete="current-password" required autofocus />
      </label>
      <button type="submit">Войти</button>
      <a class="admin-login__back" href="index.html">← На доску</a>
    </form>
  </div>
</body>
</html>
