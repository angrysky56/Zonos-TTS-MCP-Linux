# Zonos TTS MCP for Linux

[![smithery badge](https://smithery.ai/badge/@PhialsBasement/zonos-tts-mcp)](https://smithery.ai/server/@PhialsBasement/zonos-tts-mcp)

A Model Context Protocol integration for Zonos TTS, allowing Claude to generate speech directly on Linux systems.

## Overview

This project enables text-to-speech capabilities for Claude AI using the Zonos TTS system. The integration uses the Model Context Protocol (MCP) to allow Claude to generate natural-sounding speech in multiple languages and emotions.

### Key Features

- Text-to-speech through Claude
- Multiple emotions support (neutral, happy, sad, angry)
- Multi-language support
- Proper audio playback through PulseAudio/PipeWire
- Compatible with Linux environments

## Requirements

- Node.js
- PulseAudio or PipeWire with PulseAudio compatibility layer
- Running instance of Zonos API ([PhialsBasement/zonos-api](https://github.com/PhialsBasement/Zonos-API))
- Working audio output device
- Claude Desktop app

## Setup

### Installing via Smithery

To install Zonos TTS Integration for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@PhialsBasement/zonos-tts-mcp):

```bash
npx -y @smithery/cli install @PhialsBasement/zonos-tts-mcp --client claude
```

### Manual installation

1. Make sure you have Zonos API running with the API implementation ([PhialsBasement/zonos-api](https://github.com/PhialsBasement/Zonos-API))

2. Clone this repository:
```bash
git clone https://github.com/YourUsername/Zonos-TTS-MCP-Linux.git
cd Zonos-TTS-MCP-Linux
```

3. Install dependencies:
```bash
npm install @modelcontextprotocol/sdk axios zod
```

4. Build the MCP server:
```bash
npm run build
```

5. Add to Claude's config file:
Edit your Claude config file (search for files containing "mcpServers" in your home directory) and add this to the `mcpServers` section:

```json
"zonos-tts-mcp": {
  "command": "node",
  "args": [
    "/path/to/your/Zonos-TTS-MCP-Linux/dist/server.js"
  ]
}
```

Replace `/path/to/your/Zonos-TTS-MCP-Linux` with the actual path where you installed this project.

## Troubleshooting

### Error Messages in Console

If you encounter error messages like:
```
Unexpected token 'P', 'Playing au'... is not valid JSON
```

This project includes fixes for these common issues:

1. Console output has been redirected to a log file (`/tmp/zonos-tts-mcp.log`) instead of standard output to prevent JSON parsing errors.
2. The TTS parameters have been optimized for better performance.

### Performance Optimization

This fork includes performance optimizations to reduce GPU load:
- Using more efficient sampling parameters (`top_p` and `min_p`)
- Improved log handling to prevent interference with MCP communication

## Using with Claude

Once configured, Claude can use the `speak_response` tool:

```python
speak_response(
    text="Your text here",
    language="en-us",  # optional, defaults to en-us
    emotion="happy"    # optional: "neutral", "happy", "sad", "angry"
)
```

## Credit

This project is a modified version of [PhialsBasement/zonos-tts-mcp](https://github.com/PhialsBasement/Zonos-TTS-MCP), adapted for improved Linux compatibility and performance.

The Zonos TTS system is developed by [Zyphra](https://www.zyphra.com/) and is available through their [Zonos API](https://github.com/PhialsBasement/Zonos-API).

## License

See the original project for license information.

## Notes

- Make sure both the Zonos API server and this MCP server are running
- Audio playback requires proper PulseAudio/PipeWire configuration
- If you experience high GPU usage, you may want to adjust the TTS parameters in the server code
