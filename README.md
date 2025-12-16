# OpenAI Chat App

A React Native mobile application powered by OpenAI's API that allows users to chat with AI models and upload images for analysis. Built with Expo for cross-platform compatibility.

## Features

- **AI Chat Interface**: Real-time conversations with OpenAI models
- **Image Upload**: Upload images for analysis and get responses
- **Background Processing**: Messages and images are processed in the background without UI blocking
- **Token Usage Tracking**: Displays total tokens used per request
- **Model Selection**: Choose from different OpenAI models
- **Conversation History**: Maintains chat history across sessions
- **Responsive Design**: Works on both iOS and Android devices

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- OpenAI API Key (sign up at https://platform.openai.com/)

### Installation

1. Clone the repository

   ```bash
   git clone <repository-url>
   cd openai-chat-app
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Configure OpenAI API Key

   - Create a `.env` file in the root directory
   - Add your OpenAI API key:
     ```
     OPENAI_API_KEY=your-api-key-here
     ```

4. Start the development server

   ```bash
   npx expo start
   ```

5. Run on your device
   - Scan the QR code with the Expo Go app (iOS/Android)
   - Or run on an emulator/simulator

## Project Structure

```
openai-chat-app/
├── app/
│   ├── chat.tsx          # Main chat interface component
│   ├── _layout.tsx       # Root layout component
│   └── index.tsx         # App entry point
├── context/
│   └── ChatContext.tsx   # Chat state management
├── assets/               # Images and static assets
├── .env                  # Environment variables (not tracked)
├── .gitignore            # Git ignore rules
├── app.json              # Expo configuration
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

## Key Components

### Chat Interface (`app/chat.tsx`)

- Handles user input and message sending
- Manages image uploads and processing
- Displays chat history and AI responses with token counts
- Implements background processing for non-blocking UI

### Chat Context (`context/ChatContext.tsx`)

- Manages global chat state across components
- Handles message storage and retrieval
- Manages model selection

## Usage

1. **Sending Text Messages**:

   - Type your question in the input field
   - Press send button or enter key

2. **Uploading Images**:

   - Tap the image upload button
   - Select one or more images
   - Send the images along with optional text

3. **Viewing Responses**:
   - Responses appear with the format: "QuestionNumber - Answer [TokenCount]"
   - Multiple images/questions are processed sequentially

## Development

### Available Scripts

- `npm start` - Start development server
- `npm run lint` - Run linting checks
- `npm run build` - Build for production
- `npx expo run:android` - Run on Android device/emulator
- `npx expo run:ios` - Run on iOS device/simulator

### Testing

```bash
npm test
```

### Building for Production

```bash
# Android APK using EAS
eas build --platform android

# iOS IPA using EAS
eas build --platform ios

# Web build
npx expo export --platform web
```

## Notes

- The app uses background processing to avoid UI blocking during API calls
- Token count is displayed for each request to help track usage
- Image processing may take additional time depending on image size

## License

MIT

## Acknowledgments

- [OpenAI](https://openai.com/) for the API
- [Expo](https://expo.dev/) for the development framework
- [React Native](https://reactnative.dev/) for the cross-platform capabilities
