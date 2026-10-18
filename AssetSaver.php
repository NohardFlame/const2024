<?php

require_once __DIR__ . "/AdminAuth.php";
admin_require_api();

header("Content-Type: application/json; charset=utf-8");

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => "invalid json"]);
    exit;
}

function allowed_const_name($name) {
    return is_string($name) && preg_match('/^const([0-9])$/', $name);
}

function allowed_tex_name($name) {
    return is_string($name) && preg_match('/^tex([0-9])$/', $name);
}

function allowed_archive_id($id) {
    return is_string($id) && preg_match('/^[A-Za-z0-9_\-\x{0400}-\x{04FF}]+$/u', $id) && strpos($id, "..") === false;
}

function write_json_file($name, $objString) {
    if (!allowed_const_name($name)) {
        return "bad json name";
    }
    if (!is_string($objString) || $objString === "") {
        return "empty obj";
    }
    $path = __DIR__ . "/assets/json/" . $name . ".json";
    if (file_put_contents($path, $objString) === false) {
        return "write failed";
    }
    return null;
}

function write_png_file($name, $base64) {
    if (!allowed_tex_name($name)) {
        return "bad tex name";
    }
    if (!is_string($base64) || $base64 === "") {
        return "empty png";
    }
    $bin = base64_decode($base64, true);
    if ($bin === false) {
        return "bad base64";
    }
    if (strlen($bin) < 8 || substr($bin, 0, 8) !== "\x89PNG\r\n\x1a\n") {
        return "not a png";
    }
    $path = __DIR__ . "/assets/textures/" . $name . ".png";
    if (file_put_contents($path, $bin) === false) {
        return "png write failed";
    }
    return null;
}

function read_classes() {
    $path = __DIR__ . "/assets/json/classes.json";
    if (!file_exists($path)) {
        return null;
    }
    $json = json_decode(file_get_contents($path), true);
    if (!is_array($json) || !isset($json["classes"]) || !is_array($json["classes"])) {
        return null;
    }
    return $json;
}

function animal_for_index($classIndex) {
    $json = read_classes();
    if (!$json) {
        return "";
    }
    foreach ($json["classes"] as $cls) {
        if (isset($cls["gridIndex"]) && (int)$cls["gridIndex"] === (int)$classIndex) {
            return isset($cls["animal"]) ? (string)$cls["animal"] : "";
        }
    }
    return "";
}

function update_animal($classIndex, $animal) {
    if (!is_int($classIndex) && !ctype_digit((string)$classIndex)) {
        return "bad classIndex";
    }
    $classIndex = (int)$classIndex;
    $path = __DIR__ . "/assets/json/classes.json";
    $json = read_classes();
    if ($json === null) {
        return "classes.json missing or invalid";
    }
    $found = false;
    foreach ($json["classes"] as &$cls) {
        if (isset($cls["gridIndex"]) && (int)$cls["gridIndex"] === $classIndex) {
            $cls["animal"] = (string)$animal;
            $found = true;
            break;
        }
    }
    unset($cls);
    if (!$found) {
        return "class not found";
    }
    $encoded = json_encode($json, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($encoded === false || file_put_contents($path, $encoded . "\n") === false) {
        return "classes write failed";
    }
    return null;
}

function safe_slug($text) {
    $text = trim((string)$text);
    if ($text === "") {
        return "unnamed";
    }
    $text = preg_replace('/[^\p{L}\p{N}_-]+/u', "_", $text);
    $text = trim($text, "_");
    if ($text === "") {
        return "unnamed";
    }
    return mb_substr($text, 0, 40);
}

/**
 * Copy current constN (+ texN if present) into assets/archive/{id}/.
 * Returns ["id"=>..., "skipped"=>bool, "reason"=>...] or ["error"=>...]
 */
function archive_slot($classIndex, $reason) {
    $classIndex = (int)$classIndex;
    if ($classIndex < 0 || $classIndex > 9) {
        return ["error" => "bad classIndex"];
    }
    $constPath = __DIR__ . "/assets/json/const" . $classIndex . ".json";
    if (!file_exists($constPath)) {
        return ["skipped" => true, "reason" => "no const file"];
    }
    $raw = file_get_contents($constPath);
    $obj = json_decode($raw, true);
    if (!is_array($obj) || !isset($obj["vert"]) || !is_array($obj["vert"]) || count($obj["vert"]) === 0) {
        return ["skipped" => true, "reason" => "empty const"];
    }
    $animal = animal_for_index($classIndex);
    $slug = safe_slug($animal);
    $baseId = date("Ymd-His") . "_const" . $classIndex . "_" . $slug;
    $id = $baseId;
    $dir = __DIR__ . "/assets/archive/" . $id;
    $n = 1;
    while (is_dir($dir)) {
        $id = $baseId . "_" . $n;
        $dir = __DIR__ . "/assets/archive/" . $id;
        $n++;
        if ($n > 50) {
            return ["error" => "archive id collision"];
        }
    }
    if (!is_dir(__DIR__ . "/assets/archive") && !mkdir(__DIR__ . "/assets/archive", 0775, true)) {
        return ["error" => "cannot create archive root"];
    }
    if (!mkdir($dir, 0775, true)) {
        return ["error" => "cannot create archive dir"];
    }
    if (file_put_contents($dir . "/const.json", $raw) === false) {
        return ["error" => "archive const write failed"];
    }
    $texSrc = __DIR__ . "/assets/textures/tex" . $classIndex . ".png";
    $hasTex = false;
    if (file_exists($texSrc)) {
        if (!copy($texSrc, $dir . "/tex.png")) {
            return ["error" => "archive tex copy failed"];
        }
        $hasTex = true;
    }
    $meta = [
        "id" => $id,
        "fromIndex" => $classIndex,
        "animal" => $animal,
        "vertCount" => count($obj["vert"]),
        "hasTex" => $hasTex,
        "archivedAt" => date("c"),
        "reason" => is_string($reason) ? $reason : "overwrite",
    ];
    $metaJson = json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($metaJson === false || file_put_contents($dir . "/meta.json", $metaJson . "\n") === false) {
        return ["error" => "archive meta write failed"];
    }
    return ["skipped" => false, "id" => $id, "meta" => $meta];
}

function list_archive() {
    $root = __DIR__ . "/assets/archive";
    $items = [];
    if (!is_dir($root)) {
        return $items;
    }
    $dirs = scandir($root);
    if ($dirs === false) {
        return $items;
    }
    foreach ($dirs as $name) {
        if ($name === "." || $name === ".." || $name === ".gitkeep") {
            continue;
        }
        $dir = $root . "/" . $name;
        if (!is_dir($dir)) {
            continue;
        }
        $metaPath = $dir . "/meta.json";
        if (!file_exists($metaPath)) {
            continue;
        }
        $meta = json_decode(file_get_contents($metaPath), true);
        if (!is_array($meta)) {
            continue;
        }
        $meta["id"] = $name;
        $meta["constUrl"] = "assets/archive/" . rawurlencode($name) . "/const.json";
        $meta["texUrl"] = file_exists($dir . "/tex.png")
            ? "assets/archive/" . rawurlencode($name) . "/tex.png"
            : null;
        $items[] = $meta;
    }
    usort($items, function ($a, $b) {
        $ta = isset($a["archivedAt"]) ? $a["archivedAt"] : "";
        $tb = isset($b["archivedAt"]) ? $b["archivedAt"] : "";
        return strcmp($tb, $ta);
    });
    return $items;
}

$action = isset($data["action"]) ? $data["action"] : "save_all";

if ($action === "list_archive") {
    echo json_encode(["ok" => true, "items" => list_archive()], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === "archive_slot") {
    $result = archive_slot($data["classIndex"] ?? -1, $data["reason"] ?? "manual");
    if (isset($result["error"])) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => $result["error"]]);
        exit;
    }
    echo json_encode(array_merge(["ok" => true], $result), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === "save_json") {
    $err = write_json_file($data["constName"] ?? "", $data["obj"] ?? "");
    if ($err) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => $err]);
        exit;
    }
    echo json_encode(["ok" => true]);
    exit;
}

if ($action === "save_png") {
    $err = write_png_file($data["texName"] ?? "", $data["pngBase64"] ?? "");
    if ($err) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => $err]);
        exit;
    }
    echo json_encode(["ok" => true]);
    exit;
}

if ($action === "save_all") {
    $archiveInfo = null;
    if (!empty($data["archiveBefore"])) {
        $idx = isset($data["classIndex"]) ? (int)$data["classIndex"] : -1;
        if ($idx < 0 && !empty($data["constName"]) && preg_match('/^const([0-9])$/', $data["constName"], $m)) {
            $idx = (int)$m[1];
        }
        $archiveInfo = archive_slot($idx, $data["archiveReason"] ?? "overwrite");
        if (isset($archiveInfo["error"])) {
            http_response_code(400);
            echo json_encode(["ok" => false, "error" => "archive: " . $archiveInfo["error"]]);
            exit;
        }
    }

    $errors = [];
    $constName = $data["constName"] ?? "";
    $obj = $data["obj"] ?? "";
    if ($constName !== "" && $obj !== "") {
        $err = write_json_file($constName, $obj);
        if ($err) {
            $errors[] = $err;
        }
    }
    $texName = $data["texName"] ?? null;
    $png = $data["pngBase64"] ?? null;
    if ($texName && $png) {
        $err = write_png_file($texName, $png);
        if ($err) {
            $errors[] = $err;
        }
    }
    $skipAnimal = !empty($data["skipAnimal"]);
    if (!$skipAnimal && array_key_exists("animal", $data) && $data["animal"] !== null) {
        $err = update_animal($data["classIndex"] ?? -1, $data["animal"]);
        if ($err) {
            $errors[] = $err;
        }
    }
    if ($errors) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => implode("; ", $errors), "archive" => $archiveInfo]);
        exit;
    }
    echo json_encode(["ok" => true, "archive" => $archiveInfo], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === "restore_archive") {
    $id = $data["archiveId"] ?? "";
    $dst = isset($data["classIndex"]) ? (int)$data["classIndex"] : -1;
    if (!allowed_archive_id($id) || $dst < 0 || $dst > 9) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "bad archiveId or classIndex"]);
        exit;
    }
    $dir = __DIR__ . "/assets/archive/" . $id;
    $constSrc = $dir . "/const.json";
    if (!is_dir($dir) || !file_exists($constSrc)) {
        http_response_code(404);
        echo json_encode(["ok" => false, "error" => "archive not found"]);
        exit;
    }
    // archive current destination first
    $prev = archive_slot($dst, "before_restore");
    if (isset($prev["error"])) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "archive current: " . $prev["error"]]);
        exit;
    }
    $raw = file_get_contents($constSrc);
    $obj = json_decode($raw, true);
    if (!is_array($obj)) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "bad archive const"]);
        exit;
    }
    // clear achievement texts on restore into a class slot? Keep as archived (full copy).
    $err = write_json_file("const" . $dst, $raw);
    if ($err) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => $err]);
        exit;
    }
    $texSrc = $dir . "/tex.png";
    if (file_exists($texSrc)) {
        if (!copy($texSrc, __DIR__ . "/assets/textures/tex" . $dst . ".png")) {
            http_response_code(400);
            echo json_encode(["ok" => false, "error" => "tex restore failed"]);
            exit;
        }
    }
    $meta = json_decode(@file_get_contents($dir . "/meta.json"), true);
    $animal = is_array($meta) && isset($meta["animal"]) ? $meta["animal"] : "";
    if ($animal !== "" && empty($data["skipAnimal"])) {
        $err = update_animal($dst, $animal);
        if ($err) {
            http_response_code(400);
            echo json_encode(["ok" => false, "error" => $err]);
            exit;
        }
    }
    echo json_encode([
        "ok" => true,
        "restoredTo" => $dst,
        "archive" => $prev,
        "animal" => $animal,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo json_encode(["ok" => false, "error" => "unknown action"]);
