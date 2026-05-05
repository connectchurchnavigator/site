$path = 'backend/wordpress/u887885356_LSC6X.sql'
$c = Get-Content $path
$c = $c -replace 'pk\.eyJ1[a-zA-Z0-9\._-]+', '[REDACTED]'
$c = $c -replace 'AIzaSy[a-zA-Z0-9_-]+', '[REDACTED]'
$c = $c -replace '367184008856-[a-zA-Z0-9\.]+', '[REDACTED]'
$c = $c -replace 'client_secret\\";s:[0-9]+:\\"[^\\"]+\\"', 'client_secret\\";s:10:\\"[REDACTED]\\"'
$c | Set-Content $path
