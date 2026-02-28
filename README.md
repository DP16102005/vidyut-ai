# Vidyut AI

**"AI energy intelligence for every building"**

## The Problem
Buildings in India (residential societies, hospitals, schools, offices) typically waste 20–35% of their electricity expenditure. The insights to identify and fix this waste are buried within their complex multi-page electricity bills, hidden behind technical jargon (Demand Charges, Power Factor Penalties, ToD Peak Premiums). Building administrators often lack the technical expertise to parse these bills and take corrective action.

## The Solution
Vidyut AI takes the pain out of energy management. By simply uploading a standard electricity bill (PDF or Image), the application uses Local Large Language Models and Vision AI to instantly parse the document and extract every actionable data point. 

Instead of showing raw data, Vidyut AI translates these insights into plain language recommendations.

### Key Value Propositions
1. **Local Privacy**: Electricity bills contain sensitive operational and financial data. Vidyut AI leverages **AMD CPUs and AOCL optimizations** to run models like `phi3:mini` entirely offline, meaning your sensitive data never leaves your hardware.
2. **Plain Language**: It speaks the user's language. Complex Power Factor penalties are converted into simple WhatsApp-ready alerts (e.g., in Hindi or English) that a building secretary can actually act upon.
3. **Proactive Insights**: Instantly highlights the single biggest financial inefficiency on the bill the moment it is uploaded.
4. **DISCOM Analysis**: A built-in document analyzer lets users paste dense regulatory tariffs or circulars and receive a clear, 3-point summary of how it impacts their property.
5. **Peer Benchmarking**: It calculates building Energy Intensity (kWh/resident) and scores the building against anonymized peers on the city/national leaderboard.

### Technology Stack
- **Frontend**: React (Vite), Zustand, Lucide React, Recharts
- **Backend**: Python (FastAPI), SQLAlchemy (SQLite WAL for concurrency)
- **AI Infrastructure**: Local Ollama (Phi-3 Mini) orchestrated with AMD AOCL, with automated fallback routing to Gemini 1.5 Flash for vision tasks and local-unsupported languages.
