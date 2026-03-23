param(
  [int]$Port = 9317,
  [string]$RootPath = (Split-Path -Parent $MyInvocation.MyCommand.Path)
)

$ErrorActionPreference = 'Stop'

function Get-LocalIPv4Addresses {
  [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
    Where-Object {
      $_.OperationalStatus -eq [System.Net.NetworkInformation.OperationalStatus]::Up -and
      $_.NetworkInterfaceType -ne [System.Net.NetworkInformation.NetworkInterfaceType]::Loopback
    } |
    ForEach-Object { $_.GetIPProperties().UnicastAddresses } |
    Where-Object { $_.Address.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork } |
    ForEach-Object { $_.Address.IPAddressToString } |
    Sort-Object -Unique
}

function New-ClientId {
  $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.ToCharArray()
  -join (1..10 | ForEach-Object { $chars[(Get-Random -Minimum 0 -Maximum $chars.Length)] })
}

function New-RoomId($existing) {
  $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.ToCharArray()
  do {
    $value = -join (1..6 | ForEach-Object { $chars[(Get-Random -Minimum 0 -Maximum $chars.Length)] })
  } while ($existing.ContainsKey($value))
  $value
}

function Parse-Query([string]$QueryString) {
  $result = @{}
  if ([string]::IsNullOrWhiteSpace($QueryString)) {
    return $result
  }
  $trimmed = $QueryString.TrimStart('?')
  if ([string]::IsNullOrWhiteSpace($trimmed)) {
    return $result
  }
  foreach ($part in $trimmed.Split('&', [System.StringSplitOptions]::RemoveEmptyEntries)) {
    $pair = $part.Split('=', 2)
    $key = [Uri]::UnescapeDataString($pair[0])
    $value = if ($pair.Length -gt 1) { [Uri]::UnescapeDataString($pair[1]) } else { '' }
    $result[$key] = $value
  }
  $result
}

function Touch-Client([string]$ClientId, [string]$RemoteIp = '') {
  if (-not $state.Clients.ContainsKey($ClientId)) {
    $state.Clients[$ClientId] = [ordered]@{
      id = $ClientId
      queue = [System.Collections.ArrayList]::new()
      createdAt = Get-Date
      lastSeen = Get-Date
      remoteIp = $RemoteIp
    }
  } else {
    $state.Clients[$ClientId].lastSeen = Get-Date
    if ($RemoteIp) {
      $state.Clients[$ClientId].remoteIp = $RemoteIp
    }
  }
  $state.Clients[$ClientId]
}

function Push-Event([string]$ClientId, $Payload) {
  if ([string]::IsNullOrWhiteSpace($ClientId)) {
    return
  }
  $client = Touch-Client $ClientId
  [void]$client.queue.Add($Payload)
}

function Pop-Events([string]$ClientId) {
  $client = Touch-Client $ClientId
  $events = @($client.queue)
  $client.queue.Clear()
  $events
}

function Get-ShareBase {
  $remote = $state.ServerHosts | Where-Object { $_ -notin @('localhost', '127.0.0.1') } | Select-Object -First 1
  if (-not $remote) {
    $remote = 'localhost'
  }
  "http://${remote}:$($state.Port)/"
}

function Update-RoomStatus($room) {
  if ($room.started) {
    $room.status = 'started'
  } elseif (-not $room.joinClientId) {
    $room.status = 'waiting'
  } elseif (-not ($room.hostPeerOpen -and $room.joinPeerOpen)) {
    $room.status = 'connecting'
  } elseif ($room.hostReady -and $room.joinReady) {
    $room.status = 'ready'
  } else {
    $room.status = 'lobby'
  }
}

function Get-RoomSummary($room) {
  Update-RoomStatus $room
  [ordered]@{
    roomId = $room.roomId
    label = $room.label
    hostName = $room.hostName
    joinName = if ($room.joinClientId) { $room.joinName } else { 'Waiting for Player 2' }
    status = $room.status
    createdAt = $room.createdAt.ToString('o')
    playerCount = if ($room.joinClientId) { 2 } else { 1 }
    shareUrl = $room.shareUrl
    started = [bool]$room.started
    hostReady = [bool]$room.hostReady
    joinReady = [bool]$room.joinReady
    hostPeerOpen = [bool]$room.hostPeerOpen
    joinPeerOpen = [bool]$room.joinPeerOpen
    config = $room.config
    players = @(
      [ordered]@{ slot = 1; role = 'host'; name = $room.hostName; ready = [bool]$room.hostReady; peerOpen = [bool]$room.hostPeerOpen; occupied = $true; remoteIp = $room.hostIp },
      [ordered]@{ slot = 2; role = 'join'; name = if ($room.joinClientId) { $room.joinName } else { 'Waiting for Player 2' }; ready = [bool]$room.joinReady; peerOpen = [bool]$room.joinPeerOpen; occupied = [bool]$room.joinClientId; remoteIp = $room.joinIp }
    )
  }
}

function Find-RoomForIdentity([string]$ClientId, [string]$RemoteIp) {
  foreach ($room in $state.Rooms.Values) {
    if (($room.hostClientId -eq $ClientId) -or ($room.joinClientId -eq $ClientId)) {
      return $room
    }
    if ($RemoteIp -and (($room.hostIp -eq $RemoteIp) -or ($room.joinIp -eq $RemoteIp))) {
      return $room
    }
  }
  $null
}

function Get-IdentityForRoom($room, [string]$ClientId, [string]$RemoteIp) {
  if (-not $room) {
    return ''
  }
  if (($room.hostClientId -eq $ClientId) -or ($RemoteIp -and $room.hostIp -eq $RemoteIp)) {
    return 'host'
  }
  if (($room.joinClientId -eq $ClientId) -or ($RemoteIp -and $room.joinIp -eq $RemoteIp)) {
    return 'join'
  }
  ''
}

function Broadcast-LobbyUpdate($room) {
  $payload = [ordered]@{ type = 'lobby-update'; roomId = $room.roomId; room = (Get-RoomSummary $room) }
  Push-Event $room.hostClientId $payload
  if ($room.joinClientId) {
    Push-Event $room.joinClientId $payload
  }
}

function Remove-Room([string]$RoomId, [string]$Reason = 'closed') {
  if (-not $state.Rooms.ContainsKey($RoomId)) {
    return
  }
  $room = $state.Rooms[$RoomId]
  if ($room.joinClientId) {
    Push-Event $room.joinClientId ([ordered]@{ type = 'room-closed'; roomId = $RoomId; reason = $Reason })
  }
  if ($room.hostClientId) {
    Push-Event $room.hostClientId ([ordered]@{ type = 'room-closed'; roomId = $RoomId; reason = $Reason })
  }
  $state.Rooms.Remove($RoomId)
}

function Json-Bytes($Object) {
  [System.Text.Encoding]::UTF8.GetBytes(($Object | ConvertTo-Json -Depth 12 -Compress))
}

function Text-Bytes([string]$Text) {
  [System.Text.Encoding]::UTF8.GetBytes($Text)
}

function Get-ContentType([string]$Path) {
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    '.html' { 'text/html; charset=utf-8' }
    '.css' { 'text/css; charset=utf-8' }
    '.js' { 'application/javascript; charset=utf-8' }
    '.json' { 'application/json; charset=utf-8' }
    '.svg' { 'image/svg+xml' }
    '.png' { 'image/png' }
    '.jpg' { 'image/jpeg' }
    '.jpeg' { 'image/jpeg' }
    '.gif' { 'image/gif' }
    '.ico' { 'image/x-icon' }
    default { 'application/octet-stream' }
  }
}

function Get-StaticResponse([string]$RequestedPath) {
  $relative = if ([string]::IsNullOrWhiteSpace($RequestedPath) -or $RequestedPath -eq '/') { 'index.html' } else { [Uri]::UnescapeDataString($RequestedPath.TrimStart('/')) }
  $fullPath = [System.IO.Path]::GetFullPath((Join-Path $state.Root $relative))
  if (-not $fullPath.StartsWith($state.Root, [System.StringComparison]::OrdinalIgnoreCase)) {
    return [ordered]@{ status = 403; contentType = 'text/plain; charset=utf-8'; bodyBytes = (Text-Bytes 'Forbidden') }
  }
  if (Test-Path $fullPath -PathType Container) {
    $fullPath = Join-Path $fullPath 'index.html'
  }
  if (-not (Test-Path $fullPath -PathType Leaf)) {
    return [ordered]@{ status = 404; contentType = 'text/plain; charset=utf-8'; bodyBytes = (Text-Bytes 'Not Found') }
  }
  return [ordered]@{
    status = 200
    contentType = Get-ContentType $fullPath
    bodyBytes = [System.IO.File]::ReadAllBytes($fullPath)
  }
}

function Read-HttpRequest($Stream, [string]$RemoteIp) {
  $headerBytes = New-Object System.Collections.Generic.List[byte]
  while ($true) {
    $value = $Stream.ReadByte()
    if ($value -lt 0) {
      return $null
    }
    $headerBytes.Add([byte]$value)
    $count = $headerBytes.Count
    if ($count -ge 4 -and $headerBytes[$count - 4] -eq 13 -and $headerBytes[$count - 3] -eq 10 -and $headerBytes[$count - 2] -eq 13 -and $headerBytes[$count - 1] -eq 10) {
      break
    }
    if ($count -gt 65536) {
      throw 'HTTP header too large.'
    }
  }

  $headerText = [System.Text.Encoding]::ASCII.GetString($headerBytes.ToArray())
  $lines = $headerText -split "`r`n"
  $requestLine = $lines[0]
  $parts = $requestLine.Split(' ')
  if ($parts.Length -lt 2) {
    throw 'Invalid HTTP request line.'
  }

  $headers = @{}
  foreach ($line in $lines[1..($lines.Length - 1)]) {
    if ([string]::IsNullOrWhiteSpace($line)) {
      continue
    }
    $pair = $line.Split(':', 2)
    if ($pair.Length -eq 2) {
      $headers[$pair[0].Trim()] = $pair[1].Trim()
    }
  }

  $contentLength = 0
  if ($headers.ContainsKey('Content-Length')) {
    [void][int]::TryParse($headers['Content-Length'], [ref]$contentLength)
  }

  $bodyBytes = [byte[]]::new($contentLength)
  $offset = 0
  while ($offset -lt $contentLength) {
    $read = $Stream.Read($bodyBytes, $offset, $contentLength - $offset)
    if ($read -le 0) {
      break
    }
    $offset += $read
  }

  $target = $parts[1]
  $uri = [Uri]("http://localhost$target")

  return [ordered]@{
    method = $parts[0].ToUpperInvariant()
    target = $target
    path = $uri.AbsolutePath
    query = Parse-Query $uri.Query
    headers = $headers
    bodyText = [System.Text.Encoding]::UTF8.GetString($bodyBytes)
    remoteIp = $RemoteIp
  }
}

function Parse-JsonBody([string]$BodyText) {
  if ([string]::IsNullOrWhiteSpace($BodyText)) {
    return [ordered]@{}
  }
  $BodyText | ConvertFrom-Json
}

function Handle-ApiRequest($Request) {
  $path = $Request.path
  $method = $Request.method
  $remoteIp = $Request.remoteIp

  if ($method -eq 'OPTIONS') {
    return [ordered]@{ status = 204; contentType = 'text/plain; charset=utf-8'; bodyBytes = [byte[]]::new(0) }
  }

  if ($path -eq '/api/session' -and $method -eq 'POST') {
    $existingRoom = Find-RoomForIdentity '' $remoteIp
    if ($existingRoom) {
      $identity = Get-IdentityForRoom $existingRoom '' $remoteIp
      $clientId = if ($identity -eq 'host') { $existingRoom.hostClientId } else { $existingRoom.joinClientId }
      Touch-Client $clientId $remoteIp | Out-Null
      return [ordered]@{
        status = 200
        contentType = 'application/json; charset=utf-8'
        bodyBytes = Json-Bytes ([ordered]@{
          ok = $true
          clientId = $clientId
          role = $identity
          currentRoom = Get-RoomSummary $existingRoom
          server = [ordered]@{
            port = $state.Port
            hosts = $state.ServerHosts
            recommendedUrl = Get-ShareBase
          }
        })
      }
    }

    $clientId = New-ClientId
    Touch-Client $clientId $remoteIp | Out-Null
    return [ordered]@{
      status = 200
      contentType = 'application/json; charset=utf-8'
      bodyBytes = Json-Bytes ([ordered]@{
        ok = $true
        clientId = $clientId
        role = 'guest'
        server = [ordered]@{
          port = $state.Port
          hosts = $state.ServerHosts
          recommendedUrl = Get-ShareBase
        }
      })
    }
  }

  if ($path -eq '/api/rooms' -and $method -eq 'GET') {
    $rooms = @($state.Rooms.Values | ForEach-Object { Get-RoomSummary $_ })
    return [ordered]@{
      status = 200
      contentType = 'application/json; charset=utf-8'
      bodyBytes = Json-Bytes ([ordered]@{ ok = $true; rooms = $rooms; server = [ordered]@{ port = $state.Port; hosts = $state.ServerHosts } })
    }
  }

  if ($path -eq '/api/host' -and $method -eq 'POST') {
    $body = Parse-JsonBody $Request.bodyText
    $clientId = [string]$body.clientId
    if ([string]::IsNullOrWhiteSpace($clientId)) {
      return [ordered]@{ status = 400; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $false; error = 'clientId is required.' })) }
    }
    Touch-Client $clientId $remoteIp | Out-Null
    foreach ($room in @($state.Rooms.Values | Where-Object { $_.hostClientId -eq $clientId -or $_.hostIp -eq $remoteIp })) {
      Remove-Room $room.roomId 'rehosted'
    }
    $roomId = New-RoomId $state.Rooms
    $shareUrl = "$(Get-ShareBase)?lanRoom=$roomId"
    $room = [ordered]@{
      roomId = $roomId
      label = if ($body.label) { [string]$body.label } else { 'Kingly Kings Host' }
      hostName = if ($body.hostName) { [string]$body.hostName } else { 'Host' }
      hostClientId = $clientId
      hostIp = $remoteIp
      hostReady = $false
      hostPeerOpen = $false
      joinClientId = $null
      joinIp = ''
      joinName = 'Player 2'
      joinReady = $false
      joinPeerOpen = $false
      started = $false
      config = $body.config
      createdAt = Get-Date
      shareUrl = $shareUrl
      status = 'waiting'
    }
    $state.Rooms[$roomId] = $room
    return [ordered]@{ status = 200; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $true; room = (Get-RoomSummary $room); shareUrl = $shareUrl })) }
  }

  if ($path -eq '/api/join' -and $method -eq 'POST') {
    $body = Parse-JsonBody $Request.bodyText
    $clientId = [string]$body.clientId
    $roomId = [string]$body.roomId
    if ([string]::IsNullOrWhiteSpace($clientId) -or [string]::IsNullOrWhiteSpace($roomId)) {
      return [ordered]@{ status = 400; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $false; error = 'clientId and roomId are required.' })) }
    }
    Touch-Client $clientId $remoteIp | Out-Null
    if (-not $state.Rooms.ContainsKey($roomId)) {
      return [ordered]@{ status = 404; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $false; error = 'Room not found.' })) }
    }
    $room = $state.Rooms[$roomId]
    if ($room.started) {
      return [ordered]@{ status = 409; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $false; error = 'Match already started.' })) }
    }
    if ($room.hostClientId -eq $clientId) {
      return [ordered]@{ status = 400; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $false; error = 'Host cannot join its own room.' })) }
    }
    $sameJoiner = ($room.joinClientId -eq $clientId) -or ($room.joinIp -eq $remoteIp)
    if ($room.joinClientId -and -not $sameJoiner) {
      return [ordered]@{ status = 409; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $false; error = 'Room is already full.' })) }
    }
    $room.joinClientId = $clientId
    $room.joinIp = $remoteIp
    $room.joinName = if ($body.joinName) { [string]$body.joinName } else { 'Player 2' }
    $room.joinReady = $false
    $room.joinPeerOpen = $false
    Update-RoomStatus $room
    Push-Event $room.hostClientId ([ordered]@{ type = 'join-request'; roomId = $roomId; room = (Get-RoomSummary $room); joinName = $room.joinName })
    Broadcast-LobbyUpdate $room
    return [ordered]@{ status = 200; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $true; room = (Get-RoomSummary $room) })) }
  }

  if ($path -eq '/api/peer' -and $method -eq 'POST') {
    $body = Parse-JsonBody $Request.bodyText
    $clientId = [string]$body.clientId
    $roomId = [string]$body.roomId
    if ([string]::IsNullOrWhiteSpace($clientId) -or [string]::IsNullOrWhiteSpace($roomId) -or -not $state.Rooms.ContainsKey($roomId)) {
      return [ordered]@{ status = 400; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $false; error = 'clientId and roomId are required.' })) }
    }
    $room = $state.Rooms[$roomId]
    $identity = Get-IdentityForRoom $room $clientId $remoteIp
    if ($identity -eq 'host') {
      $room.hostPeerOpen = [bool]$body.open
    } elseif ($identity -eq 'join') {
      $room.joinPeerOpen = [bool]$body.open
    }
    Update-RoomStatus $room
    Broadcast-LobbyUpdate $room
    return [ordered]@{ status = 200; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $true; room = (Get-RoomSummary $room) })) }
  }

  if ($path -eq '/api/ready' -and $method -eq 'POST') {
    $body = Parse-JsonBody $Request.bodyText
    $clientId = [string]$body.clientId
    $roomId = [string]$body.roomId
    if ([string]::IsNullOrWhiteSpace($clientId) -or [string]::IsNullOrWhiteSpace($roomId) -or -not $state.Rooms.ContainsKey($roomId)) {
      return [ordered]@{ status = 400; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $false; error = 'clientId and roomId are required.' })) }
    }
    $room = $state.Rooms[$roomId]
    $identity = Get-IdentityForRoom $room $clientId $remoteIp
    if ($identity -eq 'host') {
      $room.hostReady = [bool]$body.ready
    } elseif ($identity -eq 'join') {
      $room.joinReady = [bool]$body.ready
    }
    Update-RoomStatus $room
    Broadcast-LobbyUpdate $room
    return [ordered]@{ status = 200; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $true; room = (Get-RoomSummary $room) })) }
  }

  if ($path -eq '/api/start' -and $method -eq 'POST') {
    $body = Parse-JsonBody $Request.bodyText
    $clientId = [string]$body.clientId
    $roomId = [string]$body.roomId
    if ([string]::IsNullOrWhiteSpace($clientId) -or [string]::IsNullOrWhiteSpace($roomId) -or -not $state.Rooms.ContainsKey($roomId)) {
      return [ordered]@{ status = 400; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $false; error = 'clientId and roomId are required.' })) }
    }
    $room = $state.Rooms[$roomId]
    if ($room.hostClientId -ne $clientId) {
      return [ordered]@{ status = 403; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $false; error = 'Only the host can start the match.' })) }
    }
    if (-not $room.joinClientId) {
      return [ordered]@{ status = 409; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $false; error = 'Player 2 has not joined yet.' })) }
    }
    if (-not ($room.hostReady -and $room.joinReady)) {
      return [ordered]@{ status = 409; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $false; error = 'Both players must be ready.' })) }
    }
    if (-not ($room.hostPeerOpen -and $room.joinPeerOpen)) {
      return [ordered]@{ status = 409; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $false; error = 'Peer connection is not ready yet.' })) }
    }
    $room.started = $true
    $room.config = $body.config
    Update-RoomStatus $room
    $event = [ordered]@{ type = 'match-started'; roomId = $room.roomId; room = (Get-RoomSummary $room); config = $room.config }
    Push-Event $room.hostClientId $event
    Push-Event $room.joinClientId $event
    return [ordered]@{ status = 200; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $true; room = (Get-RoomSummary $room) })) }
  }

  if ($path -eq '/api/signal' -and $method -eq 'POST') {
    $body = Parse-JsonBody $Request.bodyText
    $clientId = [string]$body.clientId
    $roomId = [string]$body.roomId
    $signalType = [string]$body.signalType
    if ([string]::IsNullOrWhiteSpace($clientId) -or [string]::IsNullOrWhiteSpace($roomId) -or [string]::IsNullOrWhiteSpace($signalType)) {
      return [ordered]@{ status = 400; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $false; error = 'clientId, roomId, and signalType are required.' })) }
    }
    if (-not $state.Rooms.ContainsKey($roomId)) {
      return [ordered]@{ status = 404; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $false; error = 'Room not found.' })) }
    }
    $room = $state.Rooms[$roomId]
    $targetClientId = if ($room.hostClientId -eq $clientId) { $room.joinClientId } else { $room.hostClientId }
    if (-not $targetClientId) {
      return [ordered]@{ status = 409; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $false; error = 'No remote player connected yet.' })) }
    }
    Push-Event $targetClientId ([ordered]@{ type = 'signal'; roomId = $roomId; signalType = $signalType; payload = $body.payload })
    Update-RoomStatus $room
    return [ordered]@{ status = 200; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $true })) }
  }

  if ($path -eq '/api/events' -and $method -eq 'GET') {
    $clientId = [string]$Request.query['clientId']
    if ([string]::IsNullOrWhiteSpace($clientId)) {
      return [ordered]@{ status = 400; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $false; error = 'clientId is required.' })) }
    }
    Touch-Client $clientId $remoteIp | Out-Null
    $events = Pop-Events $clientId
    $currentRoom = Find-RoomForIdentity $clientId $remoteIp
    $currentRoomSummary = if ($currentRoom) { Get-RoomSummary $currentRoom } else { $null }
    $rooms = @($state.Rooms.Values | ForEach-Object { Get-RoomSummary $_ })
    return [ordered]@{ status = 200; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $true; events = $events; rooms = $rooms; currentRoom = $currentRoomSummary })) }
  }

  if ($path -eq '/api/leave' -and $method -eq 'POST') {
    $body = Parse-JsonBody $Request.bodyText
    $clientId = [string]$body.clientId
    $roomId = [string]$body.roomId
    if (-not [string]::IsNullOrWhiteSpace($roomId) -and $state.Rooms.ContainsKey($roomId)) {
      $room = $state.Rooms[$roomId]
      if ($room.hostClientId -eq $clientId) {
        Remove-Room $roomId 'host-left'
      } elseif ($room.joinClientId -eq $clientId) {
        $room.joinClientId = $null
        $room.joinIp = ''
        $room.joinName = 'Player 2'
        $room.joinReady = $false
        $room.joinPeerOpen = $false
        Update-RoomStatus $room
        Broadcast-LobbyUpdate $room
      }
    }
    return [ordered]@{ status = 200; contentType = 'application/json; charset=utf-8'; bodyBytes = (Json-Bytes ([ordered]@{ ok = $true })) }
  }

  return $null
}

function Write-HttpResponse($Stream, [int]$Status, [string]$ContentType, [byte[]]$BodyBytes) {
  $statusText = switch ($Status) {
    200 { 'OK' }
    204 { 'No Content' }
    400 { 'Bad Request' }
    403 { 'Forbidden' }
    404 { 'Not Found' }
    409 { 'Conflict' }
    500 { 'Internal Server Error' }
    default { 'OK' }
  }
  $headers = @(
    "HTTP/1.1 $Status $statusText",
    "Content-Type: $ContentType",
    "Content-Length: $($BodyBytes.Length)",
    'Connection: close',
    'Access-Control-Allow-Origin: *',
    'Access-Control-Allow-Headers: Content-Type',
    'Access-Control-Allow-Methods: GET, POST, OPTIONS',
    'Cache-Control: no-store',
    '',
    ''
  ) -join "`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($BodyBytes.Length -gt 0) {
    $Stream.Write($BodyBytes, 0, $BodyBytes.Length)
  }
  $Stream.Flush()
}

$resolvedRoot = [System.IO.Path]::GetFullPath((Resolve-Path $RootPath).Path)
$serverHosts = @('localhost', '127.0.0.1') + (Get-LocalIPv4Addresses)
$serverHosts = $serverHosts | Sort-Object -Unique

$script:state = [ordered]@{
  Root = $resolvedRoot
  Port = $Port
  ServerHosts = $serverHosts
  Clients = @{}
  Rooms = @{}
  StartedAt = Get-Date
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
$listener.Start()

Write-Host "Kingly Kings LAN server running on port $Port"
Write-Host 'Open one of these addresses on the host machine or a device on the same WiFi:'
$serverHosts | ForEach-Object { Write-Host (("  http://{0}:{1}/" -f $_, $Port)) }
Write-Host 'Press Ctrl+C to stop.'

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $client.NoDelay = $true
      $remoteIp = ([System.Net.IPEndPoint]$client.Client.RemoteEndPoint).Address.IPAddressToString
      $stream = $client.GetStream()
      $request = Read-HttpRequest $stream $remoteIp
      if (-not $request) {
        continue
      }

      $response = if ($request.path.StartsWith('/api/')) { Handle-ApiRequest $request } else { Get-StaticResponse $request.path }
      if (-not $response) {
        $response = [ordered]@{ status = 404; contentType = 'text/plain; charset=utf-8'; bodyBytes = (Text-Bytes 'Not Found') }
      }
      Write-HttpResponse $stream $response.status $response.contentType $response.bodyBytes
    } catch {
      try {
        if ($stream) {
          Write-HttpResponse $stream 500 'text/plain; charset=utf-8' (Text-Bytes "Server error: $($_.Exception.Message)")
        }
      } catch {}
    } finally {
      if ($stream) { $stream.Dispose() }
      $client.Close()
      $stream = $null
    }
  }
} finally {
  $listener.Stop()
}
