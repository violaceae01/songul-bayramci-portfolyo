<?php
declare(strict_types=1);

const APP_API_NAME = 'les-mejor-server';
const STORAGE_DIR = __DIR__ . '/storage';
const UPLOAD_DIR = __DIR__ . '/uploads';
const DATA_FILE = STORAGE_DIR . '/site-data.json';
const ADMIN_FILE = STORAGE_DIR . '/admin.json';
const CONFIG_FILE = STORAGE_DIR . '/config.php';

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

session_name('les_mejor_admin');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

function respond(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function ensureStorage(): void
{
    foreach ([STORAGE_DIR, UPLOAD_DIR] as $directory) {
        if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
            respond(['ok' => false, 'message' => 'Sunucu depolama klasörü oluşturulamadı.'], 500);
        }
    }
}

function readJsonFile(string $path): ?array
{
    if (!is_file($path)) return null;
    $decoded = json_decode((string) file_get_contents($path), true);
    return is_array($decoded) ? $decoded : null;
}

function writeJsonFile(string $path, array $data): void
{
    $encoded = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($encoded === false) respond(['ok' => false, 'message' => 'Veri JSON biçimine dönüştürülemedi.'], 422);
    $temporary = $path . '.tmp';
    if (file_put_contents($temporary, $encoded, LOCK_EX) === false || !rename($temporary, $path)) {
        @unlink($temporary);
        respond(['ok' => false, 'message' => 'Veri sunucuya kaydedilemedi.'], 500);
    }
}

function defaultSiteData(): array
{
    $source = @file_get_contents(__DIR__ . '/data/data.js');
    if (!$source) return [];
    $source = preg_replace('/^\s*const\s+siteData\s*=\s*/', '', $source, 1) ?? '';
    $source = preg_replace('/;\s*$/', '', trim($source)) ?? '';
    $decoded = json_decode($source, true);
    return is_array($decoded) ? $decoded : [];
}

function siteData(): array
{
    $data = readJsonFile(DATA_FILE);
    if ($data !== null) return $data;
    $data = defaultSiteData();
    if ($data) writeJsonFile(DATA_FILE, $data);
    return $data;
}

function inputJson(): array
{
    $raw = (string) file_get_contents('php://input');
    if (strlen($raw) > 15 * 1024 * 1024) respond(['ok' => false, 'message' => 'Gönderilen veri çok büyük.'], 413);
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) respond(['ok' => false, 'message' => 'Geçersiz istek verisi.'], 400);
    return $decoded;
}

function requirePost(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') respond(['ok' => false, 'message' => 'Bu işlem POST isteği gerektirir.'], 405);
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if ($origin && parse_url($origin, PHP_URL_HOST) !== preg_replace('/:\d+$/', '', $host)) {
        respond(['ok' => false, 'message' => 'İstek kaynağı doğrulanamadı.'], 403);
    }
}

function isAuthenticated(): bool
{
    return !empty($_SESSION['les_mejor_authenticated']);
}

function requireAuth(): void
{
    if (!isAuthenticated()) respond(['ok' => false, 'message' => 'Oturum açmanız gerekiyor.'], 401);
}

function detectUploadedMime(string $path): string
{
    if (class_exists('finfo')) {
        $detected = (new finfo(FILEINFO_MIME_TYPE))->file($path);
        if (is_string($detected) && $detected !== '') return $detected;
    }

    if (function_exists('mime_content_type')) {
        $detected = @mime_content_type($path);
        if (is_string($detected) && $detected !== '') return $detected;
    }

    $imageInfo = @getimagesize($path);
    if (is_array($imageInfo) && !empty($imageInfo['mime'])) return (string) $imageInfo['mime'];

    $handle = @fopen($path, 'rb');
    if ($handle === false) return '';
    $header = (string) fread($handle, 32);
    fclose($handle);

    if (substr($header, 0, 4) === "\x1A\x45\xDF\xA3") return 'video/webm';
    if (substr($header, 4, 4) === 'ftyp') {
        return substr($header, 8, 4) === 'qt  ' ? 'video/quicktime' : 'video/mp4';
    }

    return '';
}

function setupTokenHash(): string
{
    if (!is_file(CONFIG_FILE)) return '';
    $config = require CONFIG_FILE;
    return is_array($config) ? (string) ($config['setup_token_hash'] ?? '') : '';
}

ensureStorage();
$action = (string) ($_GET['action'] ?? 'data');

if ($action === 'status') {
    respond([
        'ok' => true,
        'api' => APP_API_NAME,
        'configured' => is_file(ADMIN_FILE),
        'authenticated' => isAuthenticated(),
    ]);
}

if ($action === 'data' && ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    respond(['ok' => true, 'api' => APP_API_NAME, 'data' => siteData()]);
}

if ($action === 'setup') {
    requirePost();
    if (is_file(ADMIN_FILE)) respond(['ok' => false, 'message' => 'Admin hesabı zaten oluşturulmuş.'], 409);
    $input = inputJson();
    $token = (string) ($input['setupToken'] ?? '');
    $password = (string) ($input['password'] ?? '');
    if (!hash_equals(setupTokenHash(), hash('sha256', $token))) respond(['ok' => false, 'message' => 'Kurulum anahtarı geçersiz.'], 403);
    if (mb_strlen($password) < 10) respond(['ok' => false, 'message' => 'Şifre en az 10 karakter olmalıdır.'], 422);
    writeJsonFile(ADMIN_FILE, ['password_hash' => password_hash($password, PASSWORD_DEFAULT), 'created_at' => gmdate('c')]);
    session_regenerate_id(true);
    $_SESSION['les_mejor_authenticated'] = true;
    respond(['ok' => true, 'message' => 'Admin hesabı oluşturuldu.']);
}

if ($action === 'login') {
    requirePost();
    $input = inputJson();
    $admin = readJsonFile(ADMIN_FILE);
    $password = (string) ($input['password'] ?? '');
    if (!$admin || !password_verify($password, (string) ($admin['password_hash'] ?? ''))) {
        usleep(350000);
        respond(['ok' => false, 'message' => 'Şifre hatalı.'], 401);
    }
    session_regenerate_id(true);
    $_SESSION['les_mejor_authenticated'] = true;
    respond(['ok' => true, 'message' => 'Oturum açıldı.']);
}

if ($action === 'logout') {
    requirePost();
    $_SESSION = [];
    session_destroy();
    respond(['ok' => true]);
}

if ($action === 'save') {
    requirePost();
    requireAuth();
    $input = inputJson();
    $data = isset($input['data']) && is_array($input['data']) ? $input['data'] : null;
    if (!$data) respond(['ok' => false, 'message' => 'Kaydedilecek site verisi bulunamadı.'], 422);
    $data['updatedAt'] = gmdate('c');
    writeJsonFile(DATA_FILE, $data);
    respond(['ok' => true, 'message' => 'Değişiklikler sunucuya kaydedildi.']);
}

if ($action === 'upload') {
    requirePost();
    requireAuth();
    if (empty($_FILES['file'])) {
        $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
        $message = $contentLength > 0
            ? 'Dosya sunucunun yükleme sınırını aşıyor.'
            : 'Dosya yüklenemedi.';
        respond(['ok' => false, 'message' => $message], 400);
    }
    $file = $_FILES['file'];
    $uploadError = (int) ($file['error'] ?? UPLOAD_ERR_OK);
    if ($uploadError !== UPLOAD_ERR_OK) {
        $message = match ($uploadError) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Dosya sunucunun yükleme sınırını aşıyor.',
            UPLOAD_ERR_PARTIAL => 'Dosya yüklemesi yarıda kesildi. Lütfen yeniden deneyin.',
            UPLOAD_ERR_NO_FILE => 'Yüklenecek dosya bulunamadı.',
            UPLOAD_ERR_NO_TMP_DIR => 'Sunucunun geçici yükleme klasörü bulunamadı.',
            UPLOAD_ERR_CANT_WRITE => 'Dosya sunucu diskine yazılamadı.',
            UPLOAD_ERR_EXTENSION => 'Dosya yüklemesi sunucu tarafından durduruldu.',
            default => 'Dosya yükleme hatası oluştu.',
        };
        respond(['ok' => false, 'message' => $message], 400);
    }
    if (!is_uploaded_file((string) ($file['tmp_name'] ?? ''))) respond(['ok' => false, 'message' => 'Geçici yükleme dosyası doğrulanamadı.'], 400);
    if (($file['size'] ?? 0) > 250 * 1024 * 1024) respond(['ok' => false, 'message' => 'Dosya 250 MB sınırını aşıyor.'], 413);
    $mime = detectUploadedMime((string) $file['tmp_name']);
    $allowed = [
        'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif',
        'video/mp4' => 'mp4', 'video/webm' => 'webm', 'video/quicktime' => 'mov',
    ];
    if (!isset($allowed[$mime])) respond(['ok' => false, 'message' => 'Bu dosya türü desteklenmiyor.'], 415);
    $category = preg_replace('/[^a-z0-9-]+/i', '-', (string) ($_POST['category'] ?? 'media')) ?: 'media';
    $filename = strtolower($category) . '-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(5)) . '.' . $allowed[$mime];
    $target = UPLOAD_DIR . '/' . $filename;
    if (!move_uploaded_file($file['tmp_name'], $target)) respond(['ok' => false, 'message' => 'Dosya sunucuya taşınamadı.'], 500);
    respond(['ok' => true, 'reference' => 'server-media:uploads/' . $filename, 'url' => 'uploads/' . $filename]);
}

if ($action === 'delete-media') {
    requirePost();
    requireAuth();
    $input = inputJson();
    $reference = (string) ($input['reference'] ?? '');
    if (!str_starts_with($reference, 'server-media:uploads/')) respond(['ok' => true]);
    $filename = basename(substr($reference, strlen('server-media:uploads/')));
    $target = UPLOAD_DIR . '/' . $filename;
    if (is_file($target)) @unlink($target);
    respond(['ok' => true]);
}

respond(['ok' => false, 'message' => 'İşlem bulunamadı.'], 404);
