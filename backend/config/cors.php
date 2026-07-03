<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout', 'register', '*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        // ✅ Local Development
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        
        // ✅ Live Frontend
        'https://nooranifrontend.fusixtech.com',
        'https://www.nooranifrontend.fusixtech.com',
        'http://nooranifrontend.fusixtech.com',  // If HTTP also allowed
        
        // ✅ Live Backend (if frontend calls backend directly)
        'https://nooranibackend.fusixtech.com',
        'https://www.nooranibackend.fusixtech.com',
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];