<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Ignitera GTM Command Center

> **AI-powered Go-To-Market command center for modern sales teams**

A comprehensive platform for managing startups, Ideal Customer Profiles (ICPs), leads, and sales pipelines with intelligent AI enrichment and voice assistance powered by Google Gemini.

## ✨ Features

### 🎯 Core Capabilities
- **Startup Management** - Track multiple portfolio companies and their GTM strategies
- **ICP Generator** - AI-powered Ideal Customer Profile creation and refinement
- **Lead Management** - Comprehensive lead tracking with enrichment and scoring
- **Pipeline Visualization** - Visual pipeline stages with drag-and-drop interface
- **Quick Capture** - Rapid lead entry with minimal friction
- **Activity Logging** - Track all touchpoints and interactions

### 🤖 AI-Powered Features
- **Live Enrichment** - Real-time lead data enrichment using Google Gemini
- **Smart Outbound** - AI-generated personalized email and LinkedIn drafts
- **Voice Assistant** - Hands-free lead capture and management
- **Location Verification** - Intelligent address validation with map integration

### 🔒 Data & Security
- **Supabase Backend** - Secure, scalable PostgreSQL database
- **Real-time Sync** - Live updates across all views
- **Local-first** - Works seamlessly in development mode

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **Gemini API Key** - Get yours at [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Supabase Account** (optional) - For production deployment

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/aguillen06/Ignitera-GTM-Command-Center-by-Symtri.git
   cd Ignitera-GTM-Command-Center-by-Symtri
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and add your API keys:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173` (or the port shown in terminal)

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **UI Components**: Custom components with Lucide React icons
- **AI**: Google Gemini API (@google/genai)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Modern CSS with responsive design

### Project Structure
```
├── components/          # React components
│   ├── Auth.tsx        # Authentication
│   ├── ICPGenerator.tsx # ICP creation
│   ├── LeadDetail.tsx  # Lead management
│   ├── PipelineView.tsx # Sales pipeline
│   ├── QuickCapture.tsx # Fast lead entry
│   ├── ActivityLog.tsx # Activity tracking
│   └── VoiceAssistant.tsx # Voice interface
├── services/           # Backend services
│   ├── gemini.ts      # AI enrichment
│   ├── supabase.ts    # Database client
│   └── voice_tools.ts # Voice processing
├── types.ts           # TypeScript definitions
└── index.tsx          # Main application

```

## 📖 Usage

### Managing Leads
1. Create a startup profile with basic company info
2. Generate an ICP using AI assistance
3. Add leads via Quick Capture or manual entry
4. Enrich leads with AI-powered data
5. Move through pipeline stages
6. Generate personalized outreach

### Voice Commands
Enable microphone permissions and use natural language:
- "Add lead: John Smith at Acme Corp"
- "Show pipeline for Startup X"
- "Enrich current lead"

## 🔧 Development

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Type Checking
TypeScript is configured with strict module resolution. Check types during development in your IDE.

## 📚 AI Studio Integration

View and manage this app in AI Studio: https://ai.studio/apps/drive/1ubsyyMX8dVGVAl6kefN2Jsqx4RC0VQn_

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. See our [Contributing Guidelines](CONTRIBUTING.md) for details on:
- Development workflow
- Code style guidelines
- Testing requirements
- PR submission process

## 📄 Legal

- **License**: This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
- **Privacy**: Read our [Privacy Policy](PRIVACY.md) to understand how we handle data
- **Terms**: Review our [Terms of Service](TERMS.md) before using the application

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with ❤️ by [Symtri](https://github.com/aguillen06)
- Powered by Google Gemini AI
- Database by Supabase
- Icons by Lucide

---

**Questions or issues?** Open an issue on GitHub or reach out to the maintainers.
test
