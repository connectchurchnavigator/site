Get-ChildItem -Recurse -Include *.js,*.json,*.sql,*.md -File | ForEach-Object {
    $content = Get-Content $_.FullName
    $content = $content -replace 'pk\.eyJ1IjoiemlueHM0IiwiYSI6ImNtbnZscGVhdDFhN3oycnF1b3V2aGI2M2UifQ\.-ITTJr79_LtT5odw3Ubvdw', '[REDACTED]'
    $content = $content -replace 'pk\.eyJ1IjoiemlueHM0IiwiYSI6ImNtaGFxOXVuYzFtaWkya3BjNmpzOXVwYWQifQ\.zcfqDcwDZ97c0ZWb7T3bhA', '[REDACTED]'
    $content = $content -replace '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', '[REDACTED]'
    $content = $content -replace 'AIzaSyBCt5zj3M8xOWv7ovKEPgzx04WvRvx0j5Y', '[REDACTED]'
    $content | Set-Content $_.FullName
}
