<?php
require_once __DIR__ . "/AdminAuth.php";
admin_require_api();

header("Content-Type: application/json; charset=utf-8");

$raw = file_get_contents("php://input");
$data = json_decode($raw);

if (!is_object($data) || !isset($data->name) || !isset($data->obj)) {
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => "invalid json"]);
    exit;
}

$name = (string)$data->name;
if (!preg_match('/^(const[0-9]|nebula_defaults|style_defaults)$/', $name)) {
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => "bad name"]);
    exit;
}

$obj = $data->obj;
if (!is_string($obj)) {
    $obj = json_encode($obj, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
if ($obj === false || $obj === "") {
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => "empty obj"]);
    exit;
}

$path = __DIR__ . "/assets/json/" . $name . ".json";
if (file_put_contents($path, $obj) === false) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => "write failed"]);
    exit;
}

echo "/json/" . $name . ".json";
echo file_get_contents($path);
