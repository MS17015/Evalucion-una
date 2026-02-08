# **App Name**: Prompt Engineer Evaluator

## Core Features:

- System Instruction Input: Allow the user to input a system instruction for the Gemini 2.5 agent via a text field.
- File Upload: Enable users to upload a .txt file containing customer feedback examples.
- Data Extraction & JSON Conversion (AI Powered): Leverage the Gemini 2.5 agent, using the provided system instruction, to extract relevant information from the uploaded .txt file and convert it into the specified JSON format. The AI agent uses the prompt, along with its inherent reasoning tool, to identify which sentences match the correct constraints, and produce JSON output for those sentences.
- Results Display - Raw Response: Show the raw JSON response received directly from the Gemini 2.5 agent.
- Results Display - Formatted Output & Validation: Display a formatted view of the extracted data, highlighting "Success" if the data adheres to the defined JSON schema and "Failure" otherwise. Each extracted data point will have an individual status indicator.
- Student Authentication: Capture and record the full name of each student at the beginning of the session to prevent fraud.
- Record Keeping: Store and maintain data from evaluation runs including student names, models names, prompt instructions, inputs, outputs, validation results and other required metrics. Use local storage

## Style Guidelines:

- Primary color: Deep purple (#6750A4), evoking intellect and careful consideration.
- Background color: Light grey (#F2F0F7), offering a neutral backdrop to reduce distraction.
- Accent color: Teal (#4FD1C5), used for highlighting successful extractions.
- Body and headline font: 'Inter', a sans-serif font for clarity and readability.
- Code font: 'Source Code Pro' for displaying JSON and system instructions.
- Use clear and concise icons for file uploads, processing, and result indicators (success/failure).
- Subtle animations to indicate processing states and validation results.