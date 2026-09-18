#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ ! -x .cache/lfm-venv/bin/mlx_lm.server ]; then
  uv venv .cache/lfm-venv --python 3.12
  uv pip install --python .cache/lfm-venv/bin/python 'mlx-lm==0.31.3'
fi
export HF_HOME="$PWD/.cache/huggingface"
exec .cache/lfm-venv/bin/mlx_lm.server \
  --model LiquidAI/LFM2.5-1.2B-Instruct-MLX-4bit \
  --host 127.0.0.1 --port 8081 \
  --temp 0.1 --top-k 50 --max-tokens 256
