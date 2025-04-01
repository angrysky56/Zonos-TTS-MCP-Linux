// Ensure we have the necessary Node.js types
/// <reference types="node" />
if (typeof global.window === "undefined") {
    global.window = {
        location: {
            protocol: "http:",
            hostname: "localhost",
            port: "8000",
            href: "http://localhost:8000/"
        }
    };
}
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import axios from 'axios';
import fs from 'fs';
// Create a log file for debug output instead of using console.log
const logFile = fs.createWriteStream('/tmp/zonos-tts-mcp.log', { flags: 'a' });
// Custom logger function
const log = (message) => {
    const timestamp = new Date().toISOString();
    logFile.write(`[${timestamp}] ${message}\n`);
};
const execAsync = promisify(exec);
const API_BASE_URL = 'http://localhost:8000';
class TTSServer {
    mcp;
    emotionMap;
    constructor() {
        this.mcp = new McpServer({
            name: "TTS MCP Server",
            version: "1.0.0",
        });
        this.emotionMap = {
            neutral: {
                happiness: 0.2,
                sadness: 0.2,
                anger: 0.2,
                disgust: 0.05,
                fear: 0.05,
                surprise: 0.1,
                other: 0.1,
                neutral: 0.8,
            },
            happy: {
                happiness: 1,
                sadness: 0.05,
                anger: 0.05,
                disgust: 0.05,
                fear: 0.05,
                surprise: 0.2,
                other: 0.1,
                neutral: 0.2,
            },
            sad: {
                happiness: 0.05,
                sadness: 1,
                anger: 0.05,
                disgust: 0.2,
                fear: 0.2,
                surprise: 0.05,
                other: 0.1,
                neutral: 0.2,
            },
            angry: {
                happiness: 0.05,
                sadness: 0.2,
                anger: 1,
                disgust: 0.4,
                fear: 0.2,
                surprise: 0.2,
                other: 0.1,
                neutral: 0.1,
            },
        };
        this.setupTools();
    }
    setupTools() {
        this.mcp.tool("speak_response", {
            text: z.string(),
            language: z.string().default("en-us"),
            emotion: z.enum(["neutral", "happy", "sad", "angry"]).default("neutral"),
        }, async ({ text, language, emotion }) => {
            try {
                const emotionParams = this.emotionMap[emotion];
                // Use file logging instead of console.log
                log(`Converting to speech: "${text}" with ${emotion} emotion`);
                // Use new OpenAI-style endpoint with optimized parameters
                const response = await axios.post(`${API_BASE_URL}/v1/audio/speech`, {
                    model: "Zyphra/Zonos-v0.1-transformer",
                    input: text,
                    language: language,
                    emotion: emotionParams,
                    speed: 1.0,
                    response_format: "wav", // Using WAV for better compatibility
                    top_p: 0.85, // More efficient sampling
                    min_p: 0.25 // More efficient but still good quality
                }, {
                    responseType: 'arraybuffer'
                });
                // Save the audio response to a temporary file
                const tempAudioPath = `/tmp/tts_output_${Date.now()}.wav`;
                const fsPromises = await import('fs/promises');
                await fsPromises.writeFile(tempAudioPath, response.data);
                // Play the audio
                await this.playAudio(tempAudioPath);
                // Clean up the temporary file
                await fsPromises.unlink(tempAudioPath);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Successfully spoke: "${text}" with ${emotion} emotion`,
                        },
                    ],
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                // Use file logging instead of console.error
                log(`TTS Error: ${errorMessage}`);
                if (axios.isAxiosError(error) && error.response) {
                    log(`API Response: ${JSON.stringify(error.response.data)}`);
                }
                throw new Error(`TTS failed: ${errorMessage}`);
            }
        });
    }
    async playAudio(audioPath) {
        try {
            // Use file logging instead of console.log
            log(`Playing audio from: ${audioPath}`);
            switch (process.platform) {
                case "darwin":
                    await execAsync(`afplay ${audioPath}`);
                    break;
                case "linux":
                    // Try paplay for PulseAudio
                    const XDG_RUNTIME_DIR = process.env.XDG_RUNTIME_DIR || '/run/user/1000';
                    const env = {
                        ...process.env,
                        PULSE_SERVER: `unix:${XDG_RUNTIME_DIR}/pulse/native`,
                        PULSE_COOKIE: `${process.env.HOME}/.config/pulse/cookie`
                    };
                    await execAsync(`paplay ${audioPath}`, { env });
                    break;
                case "win32":
                    await execAsync(`powershell -c (New-Object Media.SoundPlayer '${audioPath}').PlaySync()`);
                    break;
                default:
                    throw new Error(`Unsupported platform: ${process.platform}`);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            // Use file logging instead of console.error
            log(`Audio playback error: ${errorMessage}`);
            throw new Error(`Audio playback failed: ${errorMessage}`);
        }
    }
    async start() {
        const transport = new StdioServerTransport();
        await this.mcp.connect(transport);
    }
}
log("Starting Zonos TTS MCP Server");
const server = new TTSServer();
await server.start();
