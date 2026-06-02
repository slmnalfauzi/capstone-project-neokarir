"""
==============================================================================
MAIN.PY - Entry Point Aplikasi NeoKarir Backend
==============================================================================
File ini adalah "pintu masuk" utama aplikasi FastAPI kita.
Di sini kita:
1. Menginisialisasi aplikasi FastAPI
2. Mengatur CORS (Cross-Origin Resource Sharing) agar frontend bisa mengakses API
3. Men-load semua model AI saat server pertama kali hidup (pre-loading)
4. Mendaftarkan semua router (kumpulan endpoint)
==============================================================================
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import semua router yang sudah kita definisikan
from app.routers import onboarding, chatbot, job_match, cv_analyzer, trend
# Import semua service untuk pre-loading model
from app.ai_engine.services import cv_service, match_service, chatbot_service

# ==============================================================================
# KONFIGURASI LOGGING
# ==============================================================================
# Logging membantu kita melihat apa yang terjadi di dalam server.
# Level INFO berarti kita akan melihat pesan informasi, warning, dan error.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("neokarir.main")


# ==============================================================================
# LIFESPAN CONTEXT MANAGER (Pre-loading Model AI)
# ==============================================================================
# Kenapa kita perlu ini?
#
# Bayangkan setiap kali ada request, kita harus load model AI dari disk.
# Sebuah model .keras bisa berukuran ratusan MB dan butuh beberapa detik untuk load.
# Kalau dilakukan setiap request, API kita akan sangat lambat!
#
# Solusinya: Load model SATU KALI saat server startup, simpan di memori (RAM),
# dan gunakan berkali-kali tanpa perlu load ulang. Inilah konsep "pre-loading".
#
# `asynccontextmanager` memungkinkan kita menjalankan kode SEBELUM dan SESUDAH
# aplikasi berjalan. Kode sebelum `yield` = saat startup. Kode setelah `yield` = saat shutdown.
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Mengelola siklus hidup (lifecycle) aplikasi.
    Semua model AI di-load di sini agar siap digunakan.
    """
    # --- FASE STARTUP ---
    logger.info("🚀 NeoKarir Backend sedang memulai...")
    logger.info("📦 Mulai pre-loading semua model AI ke memori...")

    try:
        # Load model CV Analyzer (NER untuk ekstraksi entitas dari teks)
        logger.info("  [1/4] Loading CV Analyzer model...")
        cv_service.load_model()
        logger.info("  ✅ CV Analyzer model siap.")
    except Exception as e:
        # Kita log error-nya tapi tidak menghentikan server.
        # Ini berguna saat development jika file model belum ada.
        logger.error(f"  ❌ Gagal load CV Analyzer model: {e}")

    try:
        # Load model Job Matcher (Siamese Network untuk mencocokkan profil & lowongan)
        logger.info("  [2/4] Loading Job Match model...")
        match_service.load_match_engine()
        logger.info("  ✅ Job Match model siap.")
    except Exception as e:
        logger.error(f"  ❌ Gagal load Job Match model: {e}")

    try:
        # Inisialisasi pipeline RAG untuk Chatbot
        logger.info("  [3/4] Initializing Chatbot RAG pipeline...")
        # chatbot_service.load_model()
        chatbot_service.load_llm_client()
        logger.info("  ✅ Chatbot RAG pipeline siap.")
    except Exception as e:
        logger.error(f"  ❌ Gagal inisialisasi Chatbot: {e}")


    logger.info("✨ Semua service siap. NeoKarir Backend berjalan!")

    # `yield` adalah titik di mana aplikasi mulai menerima request.
    # Semua kode di atas dijalankan sebelumnya (startup).
    yield

    # --- FASE SHUTDOWN ---
    # Kode di bawah ini dijalankan saat server dimatikan (misal: Ctrl+C).
    logger.info("🛑 NeoKarir Backend sedang dimatikan. Membersihkan resources...")
    # Di sini bisa ditambahkan logika cleanup jika diperlukan
    # misal: menutup koneksi database, dll.
    logger.info("👋 Server berhasil dimatikan.")


# ==============================================================================
# INISIALISASI APLIKASI FASTAPI
# ==============================================================================
app = FastAPI(
    title="NeoKarir API",
    description="""
    ## API untuk Platform NeoKarir: AI-Driven Personalized Career Intelligence

    ### Fitur Utama:
    - **Smart CV Analyzer**: Ekstraksi entitas (skill, role, pengalaman) dari PDF CV
    - **AI Career Profiling**: Skor progress, radar skill gap, dan roadmap belajar
    - **Job Match Score**: Pencocokan profil user dengan lowongan menggunakan Siamese Network
    - **AI Career Chat Assistant**: Chatbot berbasis RAG untuk konsultasi karir

    ### Catatan untuk Developer:
    Semua model AI harus ditempatkan di `app/ai_engine/models/` sesuai nama file
    yang sudah dikonfigurasi di masing-masing service.
    """,
    version="1.0.0",
    # `lifespan` menghubungkan context manager kita ke aplikasi FastAPI
    lifespan=lifespan,
)


# ==============================================================================
# KONFIGURASI CORS (Cross-Origin Resource Sharing)
# ==============================================================================
# CORS adalah mekanisme keamanan browser yang mencegah website lain
# mengakses API kita tanpa izin.
#
# Contoh masalah tanpa CORS:
# - Frontend kita berjalan di http://localhost:3000
# - Backend berjalan di http://localhost:8000
# - Browser akan MEMBLOKIR request dari frontend ke backend (beda port = beda origin)
#
# Solusi: Kita konfigurasi CORS di backend untuk mengizinkan origin tertentu.
#
# ⚠️ PENTING untuk PRODUCTION:
# Ganti `allow_origins=["*"]` dengan daftar domain yang spesifik,
# misalnya `["https://neokarir.com", "https://app.neokarir.com"]`

ALLOWED_ORIGINS = [
    "http://localhost:3000",    # React dev server
    "http://localhost:5173",    # Vite dev server
    "http://localhost:8080",    # Vue dev server
    # Tambahkan domain production di sini
    # "https://neokarir.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,     # Izinkan cookies/auth headers
    allow_methods=["*"],        # Izinkan semua HTTP method (GET, POST, dll)
    allow_headers=["*"],        # Izinkan semua HTTP headers
)

# ==============================================================================
# REGISTRASI ROUTER
# ==============================================================================
# Router adalah kumpulan endpoint yang dikelompokkan berdasarkan fitur.
# `prefix` menambahkan awalan URL (misal: /api/v1/onboarding/analyze-cv)
# `tags` digunakan untuk pengelompokan di dokumentasi Swagger UI

app.include_router(onboarding.router, prefix="/api/v1/onboarding", tags=["Onboarding & auto-profiling"])
# app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Career Dashboard"])
app.include_router(cv_analyzer.router, prefix="/api/v1/cv-analyzer", tags=["CV Analyzer"])
app.include_router(job_match.router, prefix="/api/v1/job-market", tags=["Job match di job market"])
app.include_router(chatbot.router, prefix="/api/v1/chat", tags=["AI Career Chat Assistant"])
app.include_router(trend.router, prefix="/api/trend", tags=["IT Job Trend Forecasting"])


# ==============================================================================
# ENDPOINT ROOT (Health Check)
# ==============================================================================
@app.get("/", tags=["🏠 Root"])
async def root():
    """
    Endpoint sederhana untuk mengecek apakah API sedang berjalan.
    Biasa disebut 'health check endpoint'.
    """
    return {
        "status": "ok",
        "message": "Selamat datang di NeoKarir API! 🚀",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/health", tags=["🏠 Root"])
async def health_check():
    """
    Endpoint health check lebih detail untuk monitoring server.
    Berguna untuk load balancer atau sistem monitoring seperti Prometheus.
    """
    return {
        "status": "healthy",
        "services": {
            "cv_analyzer": cv_service.is_ready(),
            "job_matcher": match_service.is_ready(),
            "chatbot_rag": chatbot_service.is_llm_ready(),
        },
    }

