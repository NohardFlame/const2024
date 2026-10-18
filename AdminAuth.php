<?php
/**
 * Admin session + credentials from gitignored admin_auth.
 *
 * admin_auth format:
 *   password: UI_PASSWORD
 *   sync_key: CRON_SHEETSYNC_KEY
 *
 * Fallback: sync_auth with "key:" used as sync_key only.
 */

function admin_auth_path() {
    return __DIR__ . "/admin_auth";
}

function admin_read_auth_file() {
    $out = ["password" => null, "sync_key" => null];
    $path = admin_auth_path();
    if (is_file($path)) {
        $raw = file_get_contents($path);
        if ($raw !== false) {
            if (strncmp($raw, "\xEF\xBB\xBF", 3) === 0) {
                $raw = substr($raw, 3);
            }
            foreach (preg_split("/\r\n|\n|\r/", $raw) as $line) {
                $line = trim($line);
                if ($line === "" || $line[0] === "#") {
                    continue;
                }
                if (stripos($line, "password:") === 0) {
                    $out["password"] = trim(substr($line, 9));
                } elseif (stripos($line, "sync_key:") === 0) {
                    $out["sync_key"] = trim(substr($line, 9));
                }
            }
        }
    }
    if ($out["sync_key"] === null || $out["sync_key"] === "") {
        $legacy = __DIR__ . "/sync_auth";
        if (is_file($legacy)) {
            $raw = file_get_contents($legacy);
            if ($raw !== false) {
                if (strncmp($raw, "\xEF\xBB\xBF", 3) === 0) {
                    $raw = substr($raw, 3);
                }
                foreach (preg_split("/\r\n|\n|\r/", $raw) as $line) {
                    $line = trim($line);
                    if (stripos($line, "key:") === 0) {
                        $out["sync_key"] = trim(substr($line, 4));
                        break;
                    }
                }
            }
        }
    }
    return $out;
}

function admin_session_start() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_name("const2024_admin");
    session_set_cookie_params([
        "lifetime" => 0,
        "path" => "/",
        "httponly" => true,
        "samesite" => "Lax",
    ]);
    session_start();
}

function admin_is_logged_in() {
    admin_session_start();
    return !empty($_SESSION["const2024_admin"]);
}

function admin_login($password) {
    admin_session_start();
    $auth = admin_read_auth_file();
    $expected = $auth["password"];
    if ($expected === null || $expected === "") {
        return ["ok" => false, "error" => "admin_auth missing password:"];
    }
    if (!hash_equals($expected, (string)$password)) {
        return ["ok" => false, "error" => "bad password"];
    }
    $_SESSION["const2024_admin"] = true;
    session_regenerate_id(true);
    return ["ok" => true];
}

function admin_logout() {
    admin_session_start();
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $p = session_get_cookie_params();
        setcookie(session_name(), "", time() - 42000, $p["path"], $p["domain"] ?? "", $p["secure"] ?? false, $p["httponly"] ?? true);
    }
    session_destroy();
    return ["ok" => true];
}

function admin_safe_next($next) {
    $next = (string)$next;
    if ($next === "" || $next[0] === "/" || preg_match('#^https?://#i', $next)) {
        return "settings.php";
    }
    if (strpos($next, "..") !== false) {
        return "settings.php";
    }
    if (!preg_match('/^[A-Za-z0-9_\.\-]+\.php(\?.*)?$/', $next)) {
        return "settings.php";
    }
    return $next;
}

/**
 * Redirect to login if not authenticated (HTML pages).
 */
function admin_require() {
    if (admin_is_logged_in()) {
        return;
    }
    $here = basename($_SERVER["SCRIPT_NAME"] ?? "settings.php");
    $qs = isset($_SERVER["QUERY_STRING"]) && $_SERVER["QUERY_STRING"] !== "" ? ("?" . $_SERVER["QUERY_STRING"]) : "";
    $next = urlencode($here . $qs);
    header("Location: login.php?next=" . $next);
    exit;
}

/**
 * JSON 401 if not authenticated (API writers).
 */
function admin_require_api() {
    if (admin_is_logged_in()) {
        return;
    }
    http_response_code(401);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode(["ok" => false, "error" => "admin login required"], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * SheetSync: session admin OR ?key=sync_key.
 */
function admin_authorize_sync_key() {
    if (admin_is_logged_in()) {
        return true;
    }
    $auth = admin_read_auth_file();
    $expected = $auth["sync_key"];
    $provided = isset($_GET["key"]) ? (string)$_GET["key"] : "";
    if ($expected === null || $expected === "") {
        http_response_code(500);
        header("Content-Type: application/json; charset=utf-8");
        echo json_encode(["ok" => false, "error" => "missing admin_auth sync_key (or sync_auth key:)"], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($provided === "" || !hash_equals($expected, $provided)) {
        http_response_code(403);
        header("Content-Type: application/json; charset=utf-8");
        echo json_encode(["ok" => false, "error" => "bad key"], JSON_UNESCAPED_UNICODE);
        exit;
    }
    return true;
}

// JSON API when this file is hit directly
if (basename($_SERVER["SCRIPT_NAME"] ?? "") === "AdminAuth.php") {
    header("Content-Type: application/json; charset=utf-8");
    $action = isset($_GET["action"]) ? (string)$_GET["action"] : (isset($_POST["action"]) ? (string)$_POST["action"] : "status");
    if ($action === "status") {
        echo json_encode(["ok" => true, "loggedIn" => admin_is_logged_in()], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($action === "logout") {
        echo json_encode(admin_logout(), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($action === "login") {
        $raw = file_get_contents("php://input");
        $data = json_decode($raw, true);
        $password = "";
        if (is_array($data) && isset($data["password"])) {
            $password = (string)$data["password"];
        } elseif (isset($_POST["password"])) {
            $password = (string)$_POST["password"];
        }
        $result = admin_login($password);
        if (!$result["ok"]) {
            http_response_code(403);
        }
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
        exit;
    }
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => "unknown action"], JSON_UNESCAPED_UNICODE);
    exit;
}
