#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:5000}"

check() {
  local path="$1"
  local expected="$2"
  local status
  status="$(curl --silent --show-error --output /tmp/maintainpro-smoke-body --write-out '%{http_code}' "${BASE_URL}${path}")"
  if [[ "$status" != "$expected" ]]; then
    echo "Smoke check failed: ${path} returned ${status}" >&2
    cat /tmp/maintainpro-smoke-body >&2
    exit 1
  fi
  echo "OK ${path} (${status})"
}

check "/api/v1/health/live" "200"
check "/api/v1/health/ready" "200"
echo "MaintainPro smoke checks passed for ${BASE_URL}"
