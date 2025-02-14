// Polyfill a minimal global 'window' for Node.js (do this before any other imports)
if (typeof global.window === "undefined") {
    (global as any).window = {
        location: {
            protocol: "http:",
            hostname: "localhost",
            port: "8000", // Updated to use our FastAPI port
            href: "http://localhost:8000/"
        }
    };
}

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import axios from 'axios'; // Using axios instead of gradio client

const execAsync = promisify(exec);
const API_BASE_URL = 'http://localhost:8000';

type Emotion = "neutral" | "happy" | "sad" | "angry";

interface EmotionParameters {
    happiness: number;
    sadness: number;
    anger: number;
    disgust: number;
    fear: number;
    surprise: number;
    other: number;
    neutral: number;
}

interface ZonosRequestParams {
    text: string;
    language: string;
    emotion: Emotion;
}

interface EmotionMap {
    [key: string]: EmotionParameters;
}

class TTSServer {
    private mcp: McpServer;
    private readonly emotionMap: EmotionMap;

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

    private setupTools(): void {
        this.mcp.tool(
            "speak_response",
            {
                text: z.string(),
                      language: z.string().default("en-us"),
                      emotion: z.enum(["neutral", "happy", "sad", "angry"]).default("neutral"),
            },
            async ({ text, language, emotion }: ZonosRequestParams) => {
                try {
                    const emotionParams = this.emotionMap[emotion];
                    console.log(`Converting to speech: "${text}" with ${emotion} emotion`);

                    // Use our new API endpoint
                    const response = await axios.post(`${API_BASE_URL}/generate`, {
                        model_choice: "Zyphra/Zonos-v0.1-transformer",
                        text,
                        language,
                        emotion: {
                            happiness: emotionParams.happiness,
                            sadness: emotionParams.sadness,
                            disgust: emotionParams.disgust,
                            fear: emotionParams.fear,
                            surprise: emotionParams.surprise,
                            anger: emotionParams.anger,
                            other: emotionParams.other,
                            neutral: emotionParams.neutral
                        },
                        vq_score: 0.78,
                        fmax: 24000,
                        pitch_std: 45,
                        speaking_rate: 15,
                        dnsmos_ovrl: 4,
                        cfg_scale: 2,
                        min_p: 0.15,
                        seed: 420,
                        unconditional_keys: ["emotion"]
                    }, {
                        responseType: 'arraybuffer' // Important for handling audio response
                    });

                    // Save the audio response to a temporary file
                    const tempAudioPath = `/tmp/tts_output_${Date.now()}.wav`;
                    const fs = await import('fs/promises');
                    await fs.writeFile(tempAudioPath, response.data);

                    // Play the audio
                    await this.playAudio(tempAudioPath);

                    // Clean up the temporary file
                    await fs.unlink(tempAudioPath);

                    return {
                        content: [
                            {
                                type: "text",
                                text: `Successfully spoke: "${text}" with ${emotion} emotion`,
                            },
                        ],
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    console.error("TTS Error:", errorMessage);
                    throw new Error(`TTS failed: ${errorMessage}`);
                }
            }
        );
    }

    private async playAudio(audioPath: string): Promise<void> {
        try {
            console.log("Playing audio from:", audioPath);

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
                    await execAsync(
                        `powershell -c (New-Object Media.SoundPlayer '${audioPath}').PlaySync()`
                    );
                    break;
                default:
                    throw new Error(`Unsupported platform: ${process.platform}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error("Audio playback error:", errorMessage);
            throw new Error(`Audio playback failed: ${errorMessage}`);
        }
    }

    public async start(): Promise<void> {
        const transport = new StdioServerTransport();
        await this.mcp.connect(transport);
    }
}

const server = new TTSServer();
await server.start();
