$body = @{ username = "prasad"; password = "password" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $body -ContentType "application/json"
$token = $response.token
$analytics = Invoke-RestMethod -Uri "http://localhost:8080/api/analytics" -Headers @{ Authorization = "Bearer $token" }
$analytics | ConvertTo-Json -Depth 5
