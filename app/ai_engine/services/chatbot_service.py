import os
import logging
import asyncpg
from dotenv import load_dotenv
from openai import AsyncOpenAI
from sentence_transformers import SentenceTransformer

# Import service yang sudah dibuat sebelumnya
from app.ai_engine.services.intent_service import intent_classifier
from app.ai_engine.services.match_service import calculate_single_job_match

# Asumsi kamu sudah punya logger
logger = logging.getLogger("neokarir.llm_service")

# 2. Panggil fungsi ini untuk me-load isi file .env ke memory
load_dotenv()

# ==========================================
# 1. INISIALISASI MODEL & GROQ CLIENT
# ==========================================
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# Global State
# ==========================================
_llm_client = None
_is_llm_ready = False
_active_api_key = None

# ==========================================
# 1. INIT & LLM CLIENT LOADING
# ==========================================
def load_llm_client() -> None:
    """Menginisialisasi koneksi ke Groq API saat server startup"""
    global _llm_client, _is_llm_ready, _active_api_key
    try:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY tidak ditemukan di environment variables.")

        logger.info("Memuat konfigurasi Groq LLM Client...")
        
        _llm_client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1"
        )
        _active_api_key = api_key
        _is_llm_ready = True
        logger.info("✅ Groq LLM Client berhasil diinisialisasi.")
        
    except Exception as e:
        logger.error(f"❌ Gagal memuat Groq LLM Client: {e}")
        _llm_client = None
        _is_llm_ready = False

def is_llm_ready() -> bool:
    """Mengecek status kesiapan LLM Client"""
    return _is_llm_ready


def is_ready() -> bool:
    """Compatibility wrapper: align service API with other services' `is_ready()`."""
    return is_llm_ready()

def get_llm_client() -> AsyncOpenAI:
    """
    Fungsi aman untuk mengambil instance LLM Client.
    Gunakan fungsi ini di router/service lain saat butuh melakukan request ke Groq.
    Secara dinamis memuat ulang jika API key berubah.
    """
    global _llm_client, _is_llm_ready, _active_api_key
    
    # Muat ulang .env untuk mendeteksi perubahan kunci secara dinamis
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        env_path = os.path.abspath(os.path.join(current_dir, "..", "..", "..", ".env"))
        load_dotenv(env_path, override=True)
    except Exception as e:
        logger.warning(f"Gagal memuat ulang .env: {e}")
        
    api_key = os.getenv("GROQ_API_KEY")
    
    if not _is_llm_ready or _llm_client is None or _active_api_key != api_key:
        logger.info("Inisialisasi/Pembaruan dinamis untuk Groq LLM Client...")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY tidak ditemukan setelah dimuat ulang.")
        _llm_client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1"
        )
        _active_api_key = api_key
        _is_llm_ready = True
        
    return _llm_client

DB_DSN = os.getenv("DATABASE_URL", "postgresql://postgres:zaza121104@localhost:5433/postgres")

# ==========================================
# 2. FUNGSI DATABASE (RAG RETRIEVAL)
# ==========================================
async def get_db_connection():
    return await asyncpg.connect(DB_DSN)

async def semantic_search_knowledge_base(query: str, top_k: int = 2) -> str:
    """Mencari teks relevan di pgvector."""
    query_vector = embedding_model.encode(query).tolist()
    
    conn = await get_db_connection()
    try:
        rows = await conn.fetch('''
            SELECT file_name, content 
            FROM knowledge_base 
            ORDER BY embedding <=> $1::vector 
            LIMIT $2
        ''', str(query_vector), top_k)
        
        if not rows:
            return "Tidak ada referensi dokumen yang ditemukan."
            
        context_parts = [f"(Dari: {r['file_name']}) {r['content']}" for r in rows]
        return "\n\n".join(context_parts)
    except Exception as e:
        logger.error(f"DB Error: {e}")
        return ""
    finally:
        await conn.close()

# Mockup DB untuk data User (Nanti ganti dengan query DB aslimu)
async def get_user_mock(user_id: str):
    return {"owned_skills": ["Python", "SQL"]}

async def get_job_mock():
    return {"required_skills": ["Python", "SQL", "Docker", "AWS"]}

# ==========================================
# 3. FUNGSI UTAMA (CHATBOT LOGIC ROUTER)
# ==========================================
async def generate_chatbot_response(user_id: str, message: str) -> dict:
    # 1. Prediksi Intent menggunakan IndoBERT
    intent_result = intent_classifier.predict(message)
    intent = intent_result["intent"]
    is_fallback = intent_result["is_fallback"]

    system_prompt = "Kamu adalah NeoKarir AI, asisten karir untuk talenta IT. Jawab dengan ramah, profesional, dan ringkas. DILARANG membuat informasi palsu (halusinasi)."
    context_data = ""

    # 2. Routing Logika
    if is_fallback or intent == "out_of_context":
        return {
            "intent": intent,
            "confidence": intent_result["confidence"],
            "bot_response": "Maaf, saya hanya bisa membantu seputar pencarian lowongan kerja, review CV, dan panduan karir IT. Ada yang bisa saya bantu terkait hal tersebut?"
        }

    elif intent == "salam_sapaan":
        system_prompt += " Sapa pengguna dengan hangat dan tawarkan bantuan karir."
        
    elif intent == "bantuan_fitur_aplikasi":
        system_prompt += " Jelaskan secara singkat fitur NeoKarir (Job Match, CV Analyzer, Job Market)."
        
    elif intent == "cari_lowongan":
        system_prompt += " Informasikan bahwa sistem sedang mencarikan lowongan yang sesuai."
        
    elif intent == "analisis_skill_gap":
        system_prompt += " Berikan saran belajar singkat berdasarkan skill yang kurang dari hasil analisis."
        user_data = await get_user_mock(user_id)
        job_data = await get_job_mock()
        match_result = calculate_single_job_match(user_data, job_data)
        context_data = f"Fakta Sistem: Kecocokan {match_result['match_percentage']}%. Skill kurang: {', '.join(match_result['skill_match_details']['missing'])}."

    elif intent in ["tanya_roadmap_karir", "tanya_tips_rekrutmen"]:
        system_prompt += " Jawab pertanyaan HANYA berdasarkan Fakta Referensi berikut."
        # Panggil fungsi RAG
        rag_context = await semantic_search_knowledge_base(message)
        
        # SAFETY GUARD: Potong teks mentah maksimal 3000 karakter saja!
        safe_context = rag_context[:3000] 
        
        context_data = f"Fakta Referensi:\n{safe_context}"

    # 3. Susun Prompt LLM
    final_prompt = system_prompt
    if context_data:
        final_prompt += f"\n\nKONTEKS WAJIB:\n{context_data}"

    # 4. Panggil Groq API
    try:
        llm_client = get_llm_client()
        response = await llm_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": final_prompt},
                {"role": "user", "content": message}
            ],
            temperature=0.3,
            max_tokens=1024
        )
        bot_reply = response.choices[0].message.content
        
    except Exception as e:
        logger.error(f"Groq API Error: {e}")
        bot_reply = "Mohon maaf, koneksi ke server AI kami sedang terganggu. Silakan coba lagi."

    return {
        "intent": intent,
        "confidence": intent_result["confidence"],
        "bot_response": bot_reply
    }