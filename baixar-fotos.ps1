# Baixa fotos de referencia para o catalogo Adega Portelinha no Windows.
# Execute pelo arquivo baixar-fotos.bat. Nunca transfere senhas ou dados dos clientes.
$ErrorActionPreference='Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
$manifest = Get-Content (Join-Path $root 'catalogo-fontes.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$outDir = Join-Path $root 'portelinha_assets\fotos'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$success = @{}
$results = New-Object System.Collections.Generic.List[object]
$ok=0;$fails=0;$missing=0
foreach ($item in $manifest) {
  if ([string]::IsNullOrWhiteSpace($item.url)) {
    $missing++
    $results.Add([pscustomobject]@{Produto=$item.name; Status='Sem foto confirmada'; Fonte=''; Caminho=''});
    continue
  }
  $tmp = Join-Path $outDir ($item.id+'.tmp')
  try {
    $headers = @{'User-Agent'='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'; 'Accept'='image/avif,image/webp,image/apng,image/*,*/*;q=0.8'}
    Invoke-WebRequest -Uri $item.url -OutFile $tmp -UseBasicParsing -Headers $headers -TimeoutSec 22
    $bytes = [System.IO.File]::ReadAllBytes($tmp)
    if($bytes.Length -lt 3500) {throw 'Imagem muito pequena ou pagina de erro'}
    $ext=''
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 255 -and $bytes[1] -eq 216 -and $bytes[2] -eq 255) {$ext='.jpg'}
    elseif ($bytes.Length -ge 8 -and $bytes[0] -eq 137 -and $bytes[1] -eq 80 -and $bytes[2] -eq 78 -and $bytes[3] -eq 71) {$ext='.png'}
    elseif ($bytes.Length -ge 12 -and [System.Text.Encoding]::ASCII.GetString($bytes,0,4) -eq 'RIFF' -and [System.Text.Encoding]::ASCII.GetString($bytes,8,4) -eq 'WEBP') {$ext='.webp'}
    elseif ($bytes.Length -ge 6 -and [System.Text.Encoding]::ASCII.GetString($bytes,0,3) -eq 'GIF') {$ext='.gif'}
    if (!$ext) {throw 'Resposta nao e uma imagem JPG/PNG/WEBP/GIF valida'}
    $dest = Join-Path $outDir ($item.id+$ext)
    Move-Item -Path $tmp -Destination $dest -Force
    $success[$item.name]='./portelinha_assets/fotos/'+$item.id+$ext
    $ok++
    Write-Host ('[OK] '+$item.name) -ForegroundColor Green
    $results.Add([pscustomobject]@{Produto=$item.name;Status='Baixada';Fonte=$item.source;Caminho=$dest})
  } catch {
    if (Test-Path $tmp) {Remove-Item $tmp -Force}
    $fails++
    Write-Host ('[FALHOU] '+$item.name+' — '+$_.Exception.Message) -ForegroundColor Yellow
    $results.Add([pscustomobject]@{Produto=$item.name;Status='Nao baixada: '+$_.Exception.Message;Fonte=$item.source;Caminho=''})
  }
}
# Somente arquivos que existem fisicamente sao mapeados para imagens locais.
# Os itens que falharam permanecem com as referencias remotas, com fallback do site.
$remote = @{}
foreach($item in $manifest){if ($item.url) {$remote[$item.name]=$item.url}}
foreach($name in $success.Keys){$remote[$name]=$success[$name]}
$javascript = '// Fotos Adega Portelinha — atualizadas pelo downloader.'+[Environment]::NewLine + 'window.PORTELINHA_FOTOS='+($remote|ConvertTo-Json -Depth 5 -Compress)+';'+[Environment]::NewLine
[System.IO.File]::WriteAllText((Join-Path $root 'portelinha-fotos.js'),$javascript,[System.Text.UTF8Encoding]::new($false))
$results | Export-Csv -Path (Join-Path $root 'resultado-do-download.csv') -NoTypeInformation -Encoding UTF8
Write-Host "`nFotos baixadas: $ok | Falhas: $fails | Sem correspondencia: $missing" -ForegroundColor Cyan
Write-Host 'Confira o resultado-do-download.csv e envie index.html, portelinha-pedidos.js, portelinha-fotos.js e a pasta portelinha_assets ao GitHub.'
