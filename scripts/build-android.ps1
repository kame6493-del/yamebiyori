# やめ日和の Android 公開用ビルド(署名済み AAB と動作確認用 APK)。powershell -File scripts/build-android.ps1 -Flavor sake
# 先に node scripts/use-flavor.mjs <sake|tabako> と npm run build・npx cap sync android を済ませておく。
# - JDK と SDK は DIAMOND NINE 用に入っている物を読むだけで使う
# - 署名鍵はやめ日和専用・アプリごと。%LOCALAPPDATA%\YamebiyoriBuild\signing\<flavor>\ に置き、パスワードは DPAPI(このWindowsユーザーだけが復号できる)で保存
# - 鍵を上書き・作り直ししない。無くしたら Play Console で「アップロード鍵のリセット」を申請することになる
# - 鍵とパスワードの値は画面にもファイルにも書き出さない
# - プロジェクトのパスに日本語があると Gradle が止まるので、一時ドライブ(subst)で英字のパスに見せる。終わったら外す
param([Parameter(Mandatory = $true)][ValidateSet('sake', 'tabako')][string]$Flavor)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$tools = Join-Path $env:LOCALAPPDATA 'Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\DiamondNineBuild'
if (!(Test-Path "$tools\java")) { $tools = Join-Path $env:LOCALAPPDATA 'DiamondNineBuild' }
$env:JAVA_HOME = (Get-ChildItem "$tools\java" -Directory | Select-Object -First 1).FullName
$env:ANDROID_HOME = "$tools\android-sdk"
if (!(Test-Path "$env:JAVA_HOME\bin\java.exe")) { throw 'JDK が見つかりません' }

$secretDir = Join-Path $env:LOCALAPPDATA "YamebiyoriBuild\signing\$Flavor"
New-Item -ItemType Directory -Force $secretDir | Out-Null
$store = Join-Path $secretDir 'yamebiyori-upload.jks'
$passFile = Join-Path $secretDir 'upload-password.dpapi'
if (!(Test-Path $store)) {
  if (Test-Path $passFile) { throw 'パスワードだけ残っていて鍵がありません。鍵を復元してください(作り直さない)' }
  $bytes = New-Object byte[] 36
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $password = [Convert]::ToBase64String($bytes)
  $password | ConvertTo-SecureString -AsPlainText -Force | ConvertFrom-SecureString | Set-Content $passFile
  $env:YB_UPLOAD_PASSWORD = $password
  # keytool は経過をエラー出力に書く。ここだけ止まらない設定にして、終了コードと鍵ファイルで判定する
  $ErrorActionPreference = 'Continue'
  & "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -keystore $store -storetype JKS -alias yamebiyori-upload -keyalg RSA -keysize 3072 -validity 10000 -storepass:env YB_UPLOAD_PASSWORD -keypass:env YB_UPLOAD_PASSWORD -dname 'CN=Yamebiyori, O=Yamebiyori, C=JP' -noprompt 2>&1 | Out-Null
  $code = $LASTEXITCODE
  $ErrorActionPreference = 'Stop'
  if ($code -ne 0 -or !(Test-Path $store)) { Remove-Item $passFile -ErrorAction SilentlyContinue; throw '署名鍵を作れませんでした' }
  Write-Output "署名鍵を作りました: $store (PC を替える前に、このフォルダごと安全な場所へ控えてください)"
} else {
  $secure = Get-Content $passFile | ConvertTo-SecureString
  $env:YB_UPLOAD_PASSWORD = [System.Net.NetworkCredential]::new('', $secure).Password
}
$env:YB_UPLOAD_STORE = $store

# 空いているドライブ文字を探す(ほかの作業の subst と重ならないように)
$drive = $null
foreach ($l in 'Y', 'X', 'W', 'V', 'U', 'T', 'S', 'R', 'Q') { if (!(Test-Path "${l}:\")) { $drive = "${l}:"; break } }
if (!$drive) { throw '空いているドライブ文字がありません' }
subst $drive (Split-Path $repo -Parent)
try {
  $proj = "$drive\$(Split-Path $repo -Leaf)\flavors\$Flavor\android"
  "sdk.dir=$($env:ANDROID_HOME -replace '\\','/')" | Out-File -Encoding ascii "$proj\local.properties"
  $err = Join-Path $env:TEMP "yb_release_err_$Flavor.txt"
  $p = Start-Process -FilePath "$proj\gradlew.bat" -ArgumentList ':app:assembleRelease', ':app:bundleRelease', '--no-daemon', '-q' -WorkingDirectory $proj -NoNewWindow -Wait -PassThru -RedirectStandardError $err
  if ($p.ExitCode -ne 0) { Get-Content $err -Tail 30; throw "Gradle が失敗しました (exit $($p.ExitCode))" }
  $out = Join-Path $repo 'releases'
  New-Item -ItemType Directory -Force $out | Out-Null
  Copy-Item "$proj\app\build\outputs\bundle\release\app-release.aab" "$out\yamebiyori-$Flavor-1.0.0-vc1.aab" -Force
  Copy-Item "$proj\app\build\outputs\apk\release\app-release.apk" "$out\yamebiyori-$Flavor-1.0.0-vc1.apk" -Force
  Write-Output "出力: $out"
} finally {
  subst $drive /D
  Remove-Item Env:YB_UPLOAD_PASSWORD, Env:YB_UPLOAD_STORE -ErrorAction SilentlyContinue
}
