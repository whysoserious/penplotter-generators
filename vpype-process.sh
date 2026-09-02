#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $(basename "$0") <input.svg>" >&2
  exit 1
fi

input=$1
if [[ ! -f $input ]]; then
  echo "error: file not found: $input" >&2
  exit 1
fi

vpype read "$input" linesort --two-opt --passes 2 linemerge linesimplify write output.svg
echo "wrote output.svg"
