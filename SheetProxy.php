<?php
header("Content-Type: text/plain; charset=utf-8");
header("Access-Control-Allow-Origin: *");

$url = isset($_GET["url"]) ? $_GET["url"] : "";
if ($url === "" || !preg_match('#^https://docs\.google\.com/spreadsheets/#', $url)) {
    http_response_code(400);
    echo "Only Google Spreadsheets URLs are allowed";
    exit;
}

$ctx = stream_context_create([
    "http" => [
        "follow_location" => 1,
        "timeout" => 20,
        "header" => "User-Agent: const2024-sheet-proxy\r\n",
    ],
]);

$data = @file_get_contents($url, false, $ctx);
if ($data === false) {
    http_response_code(502);
    echo "Failed to fetch sheet";
    exit;
}

echo $data;
