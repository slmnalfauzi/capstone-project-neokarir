from fastapi import APIRouter, UploadFile, File, HTTPException
import asyncio

# Import service NER kamu (sesuaikan nama file/fungsinya)
from app.ai_engine.services.cv_service import extract_text_from_cv, _clean_entities, _run_ner_pipeline
from app.ai_engine.services.cv_analyzer_service import analyze_cv_with_groq

router = APIRouter()

def map_ner_entities(entities_list: list, raw_text: str) -> dict:
    import re
    from app.ai_engine.services.cv_service import SKILL_NORMALIZER
    
    skills = []
    roles = []
    education = []
    certifications = []
    companies = []
    experience = []
    
    official_skills_keywords = list(SKILL_NORMALIZER.keys())
    
    for e in entities_list:
        teks = e.get('text', '')
        label = e.get('label', '')
        teks_lower = teks.lower()
        
        is_official_skill = any(master_skill in teks_lower for master_skill in official_skills_keywords)
        is_hidden_role = any(kw in teks_lower for kw in ["developer", "engineer", "admin", "specialist"])
        
        if label == 'SKILL' or (is_official_skill and label not in ['ROLE', 'PERSON', 'PER']):
            if teks not in skills:
                skills.append(teks)
        elif label == 'ROLE' or (is_hidden_role and label not in ['PERSON', 'PER']):
            if teks not in roles:
                roles.append(teks)
        elif label == 'EDU':
            if teks not in education:
                education.append(teks)
        elif label == 'CERT':
            if teks not in certifications:
                certifications.append(teks)
        elif label == 'COMP':
            if teks not in companies:
                companies.append(teks)
        elif label == 'EXP':
            if teks not in experience:
                experience.append(teks)

    if not experience:
        year_pattern = r'\b(19\d{2}|20\d{2})\s*(?:-|to|s/d|–|—|sampai)\s*(19\d{2}|20\d{2}|sekarang|present|now|saat ini)\b'
        matches = re.findall(year_pattern, raw_text.lower())
        for match in matches:
            val = f"{match[0]} - {match[1]}".title()
            if val not in experience:
                experience.append(val)
                
    return {
        "skills": skills,
        "roles": roles,
        "education": education,
        "certifications": certifications,
        "companies": companies,
        "experience": experience
    }

@router.post("/analyze")
async def process_cv_analyzer(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        extracted_text = extract_text_from_cv(file_bytes, file.filename)
        
        if len(extracted_text.strip()) < 50:
            raise HTTPException(status_code=400, detail="Teks CV terlalu pendek.")

        # JALANKAN DUA AI SECARA PARALEL AGAR RESPON API CEPAT
        # 1. Groq (Llama-3) untuk Analisis & Skor
        # 2. XLM-RoBERTa untuk Ekstraksi Entitas (NER)
        groq_task = analyze_cv_with_groq(extracted_text)
        
        # Karena pipeline Transformers itu synchronous, kita bungkus pakai to_thread
        ner_task = asyncio.to_thread(_run_ner_pipeline, extracted_text)
        
        # Tunggu keduanya selesai bersaman
        ai_analysis, ner_extraction = await asyncio.gather(groq_task, ner_task)
        
        # BUNGKUS MENJADI 1 JSON UTUH UNTUK FRONTEND
        return {
            "status": "success",
            "data": {
                "overview": ai_analysis,
                "entities": map_ner_entities(ner_extraction, extracted_text)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))