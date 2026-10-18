<?php
require_once __DIR__ . "/AdminAuth.php";
admin_logout();
header("Location: index.html");
exit;
