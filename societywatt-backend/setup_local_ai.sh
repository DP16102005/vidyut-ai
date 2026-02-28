#!/bin/bash
# User has AMD natively supported by Ollama. Just run install.
curl -fsSL https://ollama.com/install.sh | sh
ollama serve &
sleep 3
ollama run phi3:mini
