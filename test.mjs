// Simple test script for the Zonos API
import axios from 'axios';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const API_BASE_URL = 'http://localhost:8000';

async function testTTS() {
  try {
    console.log('Testing Zonos TTS API...');
    
    // Check if the API is available
    const modelsResponse = await axios.get(`${API_BASE_URL}/v1/audio/models`);
    console.log('Available models:', modelsResponse.data);
    
    // Test speech generation
    console.log('Generating speech...');
    const emotionParams = {
      happiness: 0.2,
      sadness: 0.2,
      anger: 0.2,
      disgust: 0.05,
      fear: 0.05,
      surprise: 0.1,
      other: 0.1,
      neutral: 0.8,
    };
    
    const response = await axios.post(`${API_BASE_URL}/v1/audio/speech`, {
      model: "Zyphra/Zonos-v0.1-transformer",
      input: "Hello, this is a test of the Zonos API.",
      language: "en-us",
      emotion: emotionParams,
      speed: 1.0,
      response_format: "wav"  // Using WAV for better compatibility
    }, {
      responseType: 'arraybuffer'
    });
    
    // Save the audio response to a temporary file
    const tempAudioPath = `/tmp/tts_output_test.wav`;
    await fs.writeFile(tempAudioPath, response.data);
    console.log(`Speech saved to ${tempAudioPath}`);
    
    // Play the audio using paplay
    console.log('Detected platform:', process.platform);
    if (process.platform === 'linux') {
      try {
        console.log('Trying to play with paplay...');
        const XDG_RUNTIME_DIR = process.env.XDG_RUNTIME_DIR || '/run/user/1000';
        const env = {
          ...process.env,
          PULSE_SERVER: `unix:${XDG_RUNTIME_DIR}/pulse/native`,
          PULSE_COOKIE: `${process.env.HOME}/.config/pulse/cookie`
        };
        console.log(`PulseAudio settings: PULSE_SERVER=${env.PULSE_SERVER}, PULSE_COOKIE=${env.PULSE_COOKIE}`);
        await execAsync(`paplay ${tempAudioPath}`, { env });
        console.log('Audio played successfully!');
      } catch (error) {
        console.error('Error playing with paplay:', error.message);
        try {
          console.log('Trying with aplay...');
          await execAsync(`aplay ${tempAudioPath}`);
          console.log('Audio played successfully with aplay!');
        } catch (aplayError) {
          console.error('Error playing with aplay:', aplayError.message);
        }
      }
    } else {
      console.log(`Platform ${process.platform} not supported for audio playback in this test script.`);
    }
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error during test:', error.message);
    if (axios.isAxiosError(error) && error.response) {
      console.error('API Response:', error.response.data);
    }
  }
}

testTTS();
