<?php

header("Content-Type: application/json");

$_POST = file_get_contents('php://input');

$data = json_decode($_POST);

//$file = fopen("JSONSourses/file.json", "w+");


// записываем в него то, что пришло от страницы
//echo $data->{"obj"};
file_put_contents("./assets/json/" . $data->{"name"} . ".json", $data->{"obj"});
// тут же заново считываем все данные, чтобы убедиться, что всё записалось правильно
echo "/json/" . $data->{"name"} . ".json";
$check = file_get_contents("./assets/json/" . $data->{"name"} . ".json");

//touch("json/const" . $POST[0] . ".json");
echo $check;
