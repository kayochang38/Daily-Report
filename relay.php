<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

if (!isset($_POST["payload"])) {
    echo json_encode([
        "status" => "error",
        "message" => "No payload received"
    ]);
    exit;
}

$payload = $_POST["payload"];

$gasUrl = "https://script.google.com/macros/s/AKfycbzZlwaBE_FK5w_23KUuVXblD3rv15bzvZ6yAkFyn9U6r4MO80Y49kA9mrjUwKT7qB1M/exec";

$ch = curl_init($gasUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    "payload" => $payload
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/x-www-form-urlencoded"
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

// ★★★ これを入れると GAS の 302 が解決する！
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

$response = curl_exec($ch);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo json_encode([
        "status" => "error",
        "message" => "Curl error: " . $error
    ]);
} else {
    echo $response;
}
?>
