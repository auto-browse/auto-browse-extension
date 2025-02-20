# Auto Browser Extension

A Chrome extension that provides a side panel interface for automated browser interactions and screenshot capturing using Chrome Debugger Protocol.

## Features

- Side panel interface with chat-like interaction
- Screenshot capture functionality
- Modern UI using React and Tailwind CSS
- Built with TypeScript for type safety
- Uses Chrome Debugger Protocol for browser automation

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd auto-browse-extension
```

2. Install dependencies:

```bash
npm install
```

3. Build the extension:

```bash
npm run build
```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist` directory from this project

## Development

1. Start the development build with watch mode:

```bash
npm run dev
```

2. Type checking:

```bash
npm run type-check
```

3. Clean build files:

```bash
npm run clean
```

## Usage

1. Click the extension icon in Chrome's toolbar to open the popup
2. Click "Open Side Panel" to open the extension interface
3. Type instructions in the chat interface
4. Use the keyword "screenshot" in your message to capture the current tab's content

## Project Structure

```
auto-browse-extension/
├── src/
│   ├── background/     # Service worker and CDP integration
│   ├── components/     # React components
│   ├── content/        # Content scripts
│   ├── popup/         # Extension popup
│   ├── sidepanel/     # Side panel interface
│   ├── styles/        # Global styles and Tailwind CSS
│   ├── lib/           # Utility functions
│   └── types/         # TypeScript type definitions
├── public/           # Static assets and extension manifest
└── webpack/         # Build configuration
```

## Technologies Used

- React
- TypeScript
- Tailwind CSS
- shadcn/ui Components
- Chrome Debugger Protocol
- Webpack
- Chrome Extensions Manifest V3

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Commit your changes (`git commit -am 'Add new feature'`)
5. Push to the branch (`git push origin feature/your-feature`)
6. Create a Pull Request

## License

ISC
