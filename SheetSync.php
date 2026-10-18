<?php
/**
 * Pull Zodiac Google Sheets into constN.json.
 *
 * Class tabs (* класс): A=n, B=text, C=title, publish col (header опублик* or D).
 * Ind tabs (* инд): title=Итог, content=текст звезды, publish checkbox on group start.
 * Only rows with publish=TRUE are synced. Merge: class wins on same starId.
 *
 * Auth: admin session OR ?key= from admin_auth sync_key (legacy sync_auth key:).
 * Call: SheetSync.php?key=SECRET
 * Optional: &class=3-3  (only one class), &dry=1
 */
require_once __DIR__ . "/AdminAuth.php";
admin_authorize_sync_key();

header("Content-Type: application/json; charset=utf-8");

function sync_fetch_csv($url) {
    $ctx = stream_context_create([
        "http" => [
            "follow_location" => 1,
            "timeout" => 25,
            "header" => "User-Agent: const2024-sheet-sync\r\n",
        ],
    ]);
    $data = @file_get_contents($url, false, $ctx);
    if ($data === false) {
        return null;
    }
    if (strncmp($data, "\xEF\xBB\xBF", 3) === 0) {
        $data = substr($data, 3);
    }
    return $data;
}

function sync_parse_csv($text) {
    $rows = [];
    $row = [];
    $cell = "";
    $inQuotes = false;
    $s = str_replace("\r", "", (string)$text);
    $len = strlen($s);
    for ($i = 0; $i < $len; $i++) {
        $ch = $s[$i];
        if ($inQuotes) {
            if ($ch === '"') {
                if ($i + 1 < $len && $s[$i + 1] === '"') {
                    $cell .= '"';
                    $i++;
                } else {
                    $inQuotes = false;
                }
            } else {
                $cell .= $ch;
            }
        } elseif ($ch === '"') {
            $inQuotes = true;
        } elseif ($ch === ",") {
            $row[] = $cell;
            $cell = "";
        } elseif ($ch === "\n") {
            $row[] = $cell;
            $rows[] = $row;
            $row = [];
            $cell = "";
        } else {
            $cell .= $ch;
        }
    }
    if ($cell !== "" || count($row) > 0) {
        $row[] = $cell;
        $rows[] = $row;
    }
    return $rows;
}

function sync_norm_header($h) {
    $h = mb_strtolower(trim((string)$h), "UTF-8");
    $h = preg_replace('/\s+/u', " ", $h);
    return $h;
}

function sync_cell($row, $idx) {
    if ($idx < 0 || !isset($row[$idx])) {
        return "";
    }
    return trim((string)$row[$idx]);
}

function sync_is_published($raw) {
    $v = mb_strtolower(trim((string)$raw), "UTF-8");
    if ($v === "") {
        return false;
    }
    if ($v === "true" || $v === "1" || $v === "yes" || $v === "да" || $v === "on") {
        return true;
    }
    if ($v === "✓" || $v === "✔" || $v === "☑" || $v === "x" || $v === "х") {
        return true;
    }
    return false;
}

function sync_find_publish_col($rows, $default = 3) {
    $limit = min(3, count($rows));
    for ($i = 0; $i < $limit; $i++) {
        foreach ($rows[$i] as $ci => $c) {
            $n = sync_norm_header($c);
            if (mb_strpos($n, "опублик") !== false) {
                return (int)$ci;
            }
        }
    }
    return $default;
}

function sync_normalize_title($label) {
    $lab = trim((string)$label);
    $lab = preg_replace('/\s+и\s*$/iu', "", $lab);
    $lab = trim($lab);
    return $lab !== "" ? $lab : "ЗВЕЗДА";
}

function sync_make_group($n, $title, $content, $starId = null) {
    $title = sync_normalize_title($title);
    $content = trim((string)$content);
    if ($content === "") {
        $content = $title;
    }
    if ($starId === null || $starId === "") {
        $starId = $n !== "" && $n !== null
            ? "s" . str_pad((string)$n, 2, "0", STR_PAD_LEFT)
            : null;
    }
    return [
        "starId" => $starId,
        "label" => $title,
        "title" => $title,
        "content" => $content,
        "lines" => $content !== "" ? [$content] : [],
        "n" => $n,
    ];
}

/**
 * Class sheet: A=n, B=text, C=title, publish col (опублик* header or D).
 */
function sync_parse_class_sheet($text) {
    $rows = sync_parse_csv($text);
    $warnings = [];
    if (count($rows) < 2) {
        return ["title" => "", "groups" => [], "warnings" => ["empty csv"]];
    }
    $title = sync_cell($rows[0], 0);
    $pubCol = sync_find_publish_col($rows, 3);
    $groups = [];
    for ($r = 1; $r < count($rows); $r++) {
        $row = $rows[$r];
        $nRaw = sync_cell($row, 0);
        if (!preg_match('/^\d+$/', $nRaw)) {
            continue;
        }
        if (!sync_is_published(sync_cell($row, $pubCol))) {
            continue;
        }
        $content = sync_cell($row, 1);
        $starTitle = sync_cell($row, 2);
        if ($content === "" && $starTitle === "") {
            continue;
        }
        $groups[] = sync_make_group($nRaw, $starTitle !== "" ? $starTitle : "ЗВЕЗДА", $content);
    }
    return ["title" => $title, "groups" => $groups, "warnings" => $warnings];
}

function sync_detect_ind_columns($headerRow) {
    $cols = [
        "n" => 0,
        "label" => 4,
        "starText" => -1,
        "publish" => -1,
        "star" => -1,
    ];
    foreach ($headerRow as $i => $h) {
        $n = sync_norm_header($h);
        if ($n === "star" || mb_strpos($n, "якорь") !== false || $n === "id") {
            $cols["star"] = $i;
        } elseif (mb_strpos($n, "текст звезд") !== false || $n === "текст звезды") {
            $cols["starText"] = $i;
        } elseif (mb_strpos($n, "опублик") !== false) {
            $cols["publish"] = $i;
        } elseif (mb_strpos($n, "итог") !== false || $n === "label" || mb_strpos($n, "подпись") !== false) {
            $cols["label"] = $i;
        } elseif (mb_strpos($n, "п/п") !== false || $n === "n" || strpos($n, "n ") === 0) {
            $cols["n"] = $i;
        }
    }
    return $cols;
}

/**
 * Ind sheet: group by N; title=Итог; content=текст звезды; publish on group start.
 */
function sync_parse_ind_sheet($text) {
    $rows = sync_parse_csv($text);
    $warnings = [];
    if (count($rows) < 2) {
        return ["title" => "", "groups" => [], "warnings" => ["empty csv"]];
    }
    $title = sync_cell($rows[0], 0);
    $headerIdx = 1;
    $limit = min(5, count($rows));
    for ($i = 0; $i < $limit; $i++) {
        $joined = "";
        foreach ($rows[$i] as $c) {
            $joined .= sync_norm_header($c) . "|";
        }
        if (
            mb_strpos($joined, "итог") !== false
            || mb_strpos($joined, "п/п") !== false
            || mb_strpos($joined, "текст звезд") !== false
            || mb_strpos($joined, "опублик") !== false
        ) {
            $headerIdx = $i;
            break;
        }
    }
    $cols = sync_detect_ind_columns(isset($rows[$headerIdx]) ? $rows[$headerIdx] : []);
    if ($cols["starText"] < 0) {
        $warnings[] = "ind: missing column текст звезды";
    }
    if ($cols["publish"] < 0) {
        $warnings[] = "ind: missing column опубликовать";
    }

    $groups = [];
    $pending = null;
    for ($r = $headerIdx + 1; $r < count($rows); $r++) {
        $row = $rows[$r];
        $nonEmpty = false;
        foreach ($row as $c) {
            if (trim((string)$c) !== "") {
                $nonEmpty = true;
                break;
            }
        }
        if (!$nonEmpty) {
            continue;
        }
        $nRaw = sync_cell($row, $cols["n"]);
        if (preg_match('/^\d+$/', $nRaw)) {
            if ($pending !== null) {
                $groups[] = $pending;
                $pending = null;
            }
            $pubRaw = $cols["publish"] >= 0 ? sync_cell($row, $cols["publish"]) : "";
            if ($cols["publish"] >= 0 && !sync_is_published($pubRaw)) {
                continue;
            }
            if ($cols["publish"] < 0) {
                continue;
            }
            $label = sync_cell($row, $cols["label"]);
            $starText = $cols["starText"] >= 0 ? sync_cell($row, $cols["starText"]) : "";
            $starId = $cols["star"] >= 0 ? sync_cell($row, $cols["star"]) : "";
            if ($starId === "") {
                $starId = null;
            }
            if ($label === "" && $starText === "") {
                continue;
            }
            $pending = sync_make_group($nRaw, $label !== "" ? $label : "ЗВЕЗДА", $starText, $starId);
            continue;
        }
        // Continuation rows: keep first-row title/text only (may fill starId).
        if ($pending === null) {
            continue;
        }
        $starId = $cols["star"] >= 0 ? sync_cell($row, $cols["star"]) : "";
        if ($starId !== "" && empty($pending["starId"])) {
            $pending["starId"] = $starId;
        }
        if ($cols["starText"] >= 0) {
            $more = sync_cell($row, $cols["starText"]);
            if ($more !== "" && $pending["content"] === $pending["title"]) {
                $pending["content"] = $more;
                $pending["lines"] = [$more];
            }
        }
    }
    if ($pending !== null) {
        $groups[] = $pending;
    }
    return ["title" => $title, "groups" => $groups, "warnings" => $warnings];
}

/** Merge ind into class groups: class wins on same starId; new ind ids are appended. */
function sync_merge_ind($groups, $indText) {
    $parsed = sync_parse_ind_sheet($indText);
    $byId = [];
    foreach ($groups as $i => $g) {
        if (!empty($g["starId"])) {
            $byId[$g["starId"]] = $i;
        }
    }
    foreach ($parsed["groups"] as $g) {
        $id = isset($g["starId"]) ? $g["starId"] : null;
        if ($id && isset($byId[$id])) {
            // class wins — keep existing title/content
            continue;
        }
        $groups[] = $g;
        if ($id) {
            $byId[$id] = count($groups) - 1;
        }
    }
    return [$groups, $parsed["warnings"]];
}

function sync_is_lit($v) {
    if (!is_array($v) || count($v) < 4) {
        return false;
    }
    $t = isset($v[2]) ? (string)$v[2] : "";
    $c = isset($v[3]) ? (string)$v[3] : "";
    if ($t === "" || $c === "" || $t === "DELETED" || $c === "DELETED") {
        return false;
    }
    return true;
}

function sync_apply_groups($constData, $groups) {
    if (!isset($constData["vert"]) || !is_array($constData["vert"])) {
        return ["error" => "bad const json", "updated" => 0, "placed" => 0, "cleared" => 0];
    }
    $verts = &$constData["vert"];
    $nVerts = count($verts);
    $byId = [];
    for ($i = 0; $i < $nVerts; $i++) {
        if (isset($verts[$i][4]) && $verts[$i][4] !== "" && $verts[$i][4] !== null) {
            $byId[(string)$verts[$i][4]] = $i;
        }
    }

    // Pass 1: keep previous STAR placements
    $assign = []; // idx => group
    $usedGroup = [];
    $updated = 0;
    foreach ($groups as $gi => $g) {
        $id = isset($g["starId"]) ? (string)$g["starId"] : "";
        if ($id !== "" && isset($byId[$id]) && !isset($assign[$byId[$id]])) {
            $assign[$byId[$id]] = $gi;
            $usedGroup[$gi] = true;
            $updated++;
        }
    }

    // Pass 2: remaining groups → first free index (any not reserved by STAR)
    $free = [];
    for ($i = 0; $i < $nVerts; $i++) {
        if (!isset($assign[$i])) {
            $free[] = $i;
        }
    }
    $fi = 0;
    $placed = 0;
    $skipped = 0;
    foreach ($groups as $gi => $g) {
        if (isset($usedGroup[$gi])) {
            continue;
        }
        if ($fi >= count($free)) {
            $skipped++;
            continue;
        }
        $assign[$free[$fi]] = $gi;
        $fi++;
        $placed++;
    }

    $cleared = 0;
    for ($i = 0; $i < $nVerts; $i++) {
        $x = $verts[$i][0];
        $y = $verts[$i][1];
        if (isset($assign[$i])) {
            $g = $groups[$assign[$i]];
            $id = isset($g["starId"]) ? (string)$g["starId"] : "";
            $title = isset($g["title"]) ? $g["title"] : "ЗВЕЗДА";
            $content = isset($g["content"]) ? $g["content"] : $title;
            $verts[$i] = [$x, $y, $title, $content, $id];
        } else {
            if (sync_is_lit($verts[$i]) || (isset($verts[$i][4]) && $verts[$i][4] !== "" && $verts[$i][4] !== null)) {
                $cleared++;
            }
            $verts[$i] = [$x, $y];
        }
    }

    $litCount = 0;
    foreach ($verts as $v) {
        if (sync_is_lit($v)) {
            $litCount++;
        }
    }
    $constData["number"] = $litCount;
    return [
        "updated" => $updated,
        "placed" => $placed,
        "cleared" => $cleared,
        "skipped" => $skipped,
        "lit" => $litCount,
        "groups" => count($groups),
        "data" => $constData,
    ];
}

function sync_sheet_url($spreadsheetId, $sheetName) {
    return "https://docs.google.com/spreadsheets/d/"
        . rawurlencode($spreadsheetId)
        . "/gviz/tq?tqx=out:csv&sheet="
        . rawurlencode($sheetName);
}

// --- main ---
$dry = isset($_GET["dry"]) && $_GET["dry"] !== "0" && $_GET["dry"] !== "";
$onlyClass = isset($_GET["class"]) ? trim((string)$_GET["class"]) : "";

$classesPath = __DIR__ . "/assets/json/classes.json";
$meta = json_decode(@file_get_contents($classesPath), true);
if (!is_array($meta) || empty($meta["classes"]) || empty($meta["spreadsheetId"])) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => "bad classes.json"], JSON_UNESCAPED_UNICODE);
    exit;
}

$spreadsheetId = $meta["spreadsheetId"];
$report = [];
foreach ($meta["classes"] as $cls) {
    $id = isset($cls["id"]) ? $cls["id"] : "";
    if ($onlyClass !== "" && $id !== $onlyClass) {
        continue;
    }
    $grid = isset($cls["gridIndex"]) ? (int)$cls["gridIndex"] : -1;
    $constName = isset($cls["constFile"]) ? $cls["constFile"] : ("const" . $grid);
    $sheetClass = isset($cls["sheetClass"]) ? $cls["sheetClass"] : "";
    $sheetInd = isset($cls["sheetInd"]) ? $cls["sheetInd"] : "";
    $entry = ["id" => $id, "file" => $constName];

    if ($sheetClass === "" || $grid < 0) {
        $entry["error"] = "missing sheetClass/gridIndex";
        $report[] = $entry;
        continue;
    }

    $classCsv = sync_fetch_csv(sync_sheet_url($spreadsheetId, $sheetClass));
    if ($classCsv === null) {
        $entry["error"] = "fetch class sheet failed: " . $sheetClass;
        $report[] = $entry;
        continue;
    }
    $parsed = sync_parse_class_sheet($classCsv);
    $groups = $parsed["groups"];
    $warnings = $parsed["warnings"];
    if ($sheetInd !== "") {
        $indCsv = sync_fetch_csv(sync_sheet_url($spreadsheetId, $sheetInd));
        if ($indCsv !== null) {
            list($groups, $indWarn) = sync_merge_ind($groups, $indCsv);
            $warnings = array_merge($warnings, $indWarn);
        } else {
            $warnings[] = "ind sheet fetch failed";
        }
    }

    $constPath = __DIR__ . "/assets/json/" . $constName . ".json";
    $constData = json_decode(@file_get_contents($constPath), true);
    if (!is_array($constData)) {
        $entry["error"] = "cannot read " . $constName . ".json";
        $report[] = $entry;
        continue;
    }

    $result = sync_apply_groups($constData, $groups);
    if (isset($result["error"])) {
        $entry["error"] = $result["error"];
        $report[] = $entry;
        continue;
    }
    $entry["title"] = $parsed["title"];
    $entry["groups"] = $result["groups"];
    $entry["updated"] = $result["updated"];
    $entry["placed"] = $result["placed"];
    $entry["cleared"] = $result["cleared"];
    $entry["skipped"] = $result["skipped"];
    $entry["lit"] = $result["lit"];
    $entry["warnings"] = $warnings;

    if (!$dry) {
        $json = json_encode($result["data"], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false || file_put_contents($constPath, $json) === false) {
            $entry["error"] = "write failed";
        } else {
            $entry["saved"] = true;
        }
    } else {
        $entry["dry"] = true;
    }
    $report[] = $entry;
}

echo json_encode(
    [
        "ok" => true,
        "dry" => $dry,
        "at" => gmdate("c"),
        "report" => $report,
    ],
    JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT
);
