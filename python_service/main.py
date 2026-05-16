import os
import io
from google import genai
from google.genai import types
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="FinPilot Gemini OCR Service")

# Allow CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
api_key = os.environ.get("GEMINI_API_KEY")
gemini_client = genai.Client(api_key=api_key) if api_key else None
if not api_key:
    print("WARNING: GEMINI_API_KEY not found in environment.")

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "FinPilot Python OCR Service is running"}

@app.post("/extract")
async def extract_receipt_data(file: UploadFile = File(...)):
    """
    Receives an image/pdf, sends it to Gemini Pro Vision, and returns extracted JSON schema.
    """
    if not gemini_client:
        raise HTTPException(status_code=500, detail="Gemini API Key not configured")

    try:
        content = await file.read()
        
        prompt = """
        You are an expert financial data extractor. Analyze this receipt/invoice and extract the following information.
        Return ONLY a valid JSON object with these keys:
        - vendor (string)
        - amount (number)
        - date (YYYY-MM-DD string)
        - category (string - e.g. 'Software', 'Travel', 'Food', 'Marketing', 'Utilities')
        - line_items (array of objects with 'description' and 'amount')
        
        If a field is missing, use null.
        """
        
        response = gemini_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                prompt,
                types.Part.from_bytes(data=content, mime_type=file.content_type)
            ]
        )
        
        # Response text should be JSON (usually wrapped in ```json ... ```)
        text = response.text
        # Clean up markdown if present
        if text.startswith('```json'):
            text = text[7:-3].strip()
        elif text.startswith('```'):
            text = text[3:-3].strip()
            
        import json
        try:
            parsed_json = json.loads(text)
            return {"success": True, "data": parsed_json}
        except json.JSONDecodeError:
            return {"success": False, "raw_text": text, "error": "Failed to parse Gemini output as JSON"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
