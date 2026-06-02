import os
import re
import json
import logging
from app.ai_engine.services.chatbot_service import get_llm_client

logger = logging.getLogger("neokarir.cv_analyzer")

def generate_heuristic_fallback(text: str) -> dict:
    """
    Heuristic Fallback Engine to analyze CV text in case Groq API is offline,
    rate-limited, or configured with an invalid key.
    """
    logger.info("Executing heuristic fallback analysis on CV text...")
    text_lower = text.lower()
    
    # 1. Checklist mandatory sections
    has_contact = bool(re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text) or re.search(r'\b\d{8,15}\b', text))
    has_linkedin = "linkedin.com" in text_lower or "/in/" in text_lower
    has_github = "github.com" in text_lower or "portfolio" in text_lower or "gitlab.com" in text_lower
    has_summary = any(kw in text_lower for kw in ["summary", "ringkasan", "tentang saya", "profil", "about me", "professional summary"])
    has_edu = any(kw in text_lower for kw in ["pendidikan", "education", "universitas", "school", "sarjana", "diploma", "institut", "kuliah"])
    has_work = any(kw in text_lower for kw in ["pengalaman", "experience", "kerja", "work", "employment", "internship", "magang"])
    has_projects = any(kw in text_lower for kw in ["proyek", "project", "portofolio"])
    has_skills = any(kw in text_lower for kw in ["keahlian", "skills", "kemampuan", "tech stack", "tools"])
    
    # 2. Slang words detection (informal words that ATS rejects)
    slang_words = []
    for slang in ["yg", "dgn", "krn", "ttg", "dlm", "utk", "saja", "bwt", "pd", "dri"]:
        if re.search(r'\b' + slang + r'\b', text_lower):
            slang_words.append(slang)
            
    # 3. Missing sections list
    missing = []
    if not has_contact: missing.append("Contact Details (Email/Phone)")
    if not has_linkedin: missing.append("LinkedIn Profile Link")
    if not has_github: missing.append("GitHub / Portfolio Link")
    if not has_summary: missing.append("Professional Summary")
    if not has_edu: missing.append("Education")
    if not has_work and not has_projects: missing.append("Work Experience or Projects")
    if not has_skills: missing.append("Technical Skills")
    
    # 4. Limit score according to strict criteria
    max_limit = 100
    if slang_words: max_limit = min(max_limit, 60)
    if missing: max_limit = min(max_limit, 65)
    
    # Calculate initial score based on completeness
    base_score = 65
    score_boost = sum([has_contact, has_linkedin, has_github, has_summary, has_edu, (has_work or has_projects), has_skills]) * 4
    ats_score = base_score + score_boost
    
    # Penalize for slang words
    if slang_words:
        ats_score -= 15
        
    ats_score = min(max(30, ats_score), max_limit)
    
    # Map score to 1-5 star rating
    star_rating = 1
    if ats_score >= 85: star_rating = 5
    elif ats_score >= 70: star_rating = 4
    elif ats_score >= 50: star_rating = 3
    elif ats_score >= 35: star_rating = 2
    
    # Strengths extraction
    strengths = []
    if has_linkedin and has_github:
        strengths.append("Mencantumkan tautan profesional (LinkedIn & GitHub) yang lengkap untuk memudahkan verifikasi portofolio.")
    if has_skills:
        strengths.append("Menyusun daftar keahlian teknis secara berstruktur sehingga memudahkan pemindaian sistem ATS.")
    if has_edu:
        strengths.append("Mendokumentasikan riwayat pendidikan formal secara terperinci.")
    if has_work:
        strengths.append("Memiliki struktur kronologis pengalaman kerja yang mudah dipahami.")
    if not strengths:
        strengths.append("Struktur umum CV cukup rapi dan mudah dibaca secara manual.")
        
    # Weaknesses extraction
    weaknesses = []
    if not has_linkedin:
        weaknesses.append("Belum menyertakan tautan LinkedIn aktif pada informasi kontak.")
    if not has_github:
        weaknesses.append("Tidak mencantumkan tautan portofolio atau repositori GitHub untuk memvalidasi proyek.")
    if not has_summary:
        weaknesses.append("Belum melampirkan Ringkasan Profesional (Professional Summary) di bagian atas CV.")
    if slang_words:
        weaknesses.append(f"Terdeteksi penggunaan kata tidak baku/singkatan informal dalam teks (seperti: {', '.join(slang_words)}) yang merusak keterbacaan ATS.")
    if not weaknesses:
        weaknesses.append("Kurangnya metrik pencapaian kuantitatif (angka nyata) di deskripsi kerja.")
        
    # Actionable recommendations
    recommendations = []
    if not has_linkedin:
        recommendations.append({"advice": "Tambahkan tautan profil LinkedIn Anda di bagian atas kontak untuk meningkatkan kredibilitas profesional.", "priority": "High"})
    if not has_github:
        recommendations.append({"advice": "Cantumkan tautan GitHub atau web portofolio personal agar perekrut dapat langsung meninjau hasil karya kode Anda.", "priority": "High"})
    if not has_summary:
        recommendations.append({"advice": "Tulis ringkasan profil profesional (2-3 kalimat) yang secara padat menggambarkan kompetensi utama dan tujuan karir Anda.", "priority": "Medium"})
    if slang_words:
        recommendations.append({"advice": "Ganti semua singkatan non-baku (contoh: 'yg' menjadi 'yang', 'dgn' menjadi 'dengan') agar CV lolos pemindaian ATS standar industri.", "priority": "High"})
    
    recommendations.append({"advice": "Gunakan format Action Verbs (seperti 'Membangun', 'Mengoptimalkan') dikombinasikan dengan metrik kuantitatif (persentase/angka) untuk memperjelas dampak pekerjaan Anda.", "priority": "Medium"})
    
    summary_text = (
        f"Analisis CV menunjukkan skor kelayakan ATS sebesar {ats_score}%. "
        f"Secara umum, struktur CV Anda sudah { 'cukup baik dengan beberapa penyesuaian' if ats_score >= 70 else 'perlu perbaikan signifikan agar lolos penyaringan otomatis' }. "
        f"Kelebihan utama terletak pada detail { 'informasi kontak dan stack keahlian' if has_skills else 'pendidikan' }, namun disarankan untuk segera memperbaiki kelemahan di bagian "
        f"{ 'penggunaan tata bahasa formal dan tautan portofolio' if slang_words or not has_github else 'ringkasan profil' }."
    )
    
    return {
        "ats_score": int(ats_score),
        "match_analysis_text": summary_text,
        "star_rating": star_rating,
        "strengths": strengths[:3],
        "weaknesses": weaknesses[:3],
        "recommendations": recommendations
    }

async def analyze_cv_with_groq(extracted_cv_text: str) -> dict:
    # Skema JSON disesuaikan persis dengan kebutuhan UI
    system_prompt = """
    You are an ELITE, highly strict Senior Technical Recruiter and ATS Specialist reviewing CVs for a Top-Tier Tech Company. You have exceptionally high standards and are highly critical of vague claims.
    
    Your task is to analyze the provided CV text and output STRICTLY in JSON format.
    Answer entirely in professional, objective, and highly critical Bahasa Indonesia.

    ATURAN KRITIS PENILAIAN (HARUS TEGAS NAMUN MEMAHAMI KONTEKS):

    1. PENILAIAN BERBASIS KONTEKS (LEVEL KANDIDAT): Segera deteksi level kandidat. JIKA CV milik mahasiswa, fresh graduate, atau level junior: JANGAN hukum mereka karena kurangnya pengalaman kerja profesional. Sebagai gantinya, evaluasi secara ketat kompleksitas proyek akademik, portofolio bootcamp, sertifikasi, dan tech stack mereka.
    2. BAGIAN WAJIB (MANDATORY SECTIONS):
    - Kontak: Wajib ada Nama, Email, Telepon, dan Tautan (LinkedIn & GitHub/Portofolio WAJIB untuk posisi IT). Potong poin jika tautan ini tidak ada.
    - Ringkasan Profesional: 2-3 kalimat padat di bagian atas yang menunjukkan nilai jual (tanpa basa-basi).
    - Keahlian Teknis: Harus berupa teks bersih (dipisah koma atau bullet). Beri peringatan jika formatnya berantakan atau tidak bisa di-parsing.
    - Pengalaman Kerja: Wajib urutan kronologis terbalik (terbaru di atas), memuat Jabatan, Perusahaan, Lokasi, dan Bulan/Tahun.
    - Pendidikan: Wajib memuat Gelar, Jurusan, Kampus, Tahun Lulus (IPK wajib untuk fresh graduate).
    3. ANTI BASA-BASI & WAJIB DETAIL: Hukum keras soft skills yang ambigu (misal: "pekerja keras"). Gunakan kata kerja aktif yang kuat. Setiap proyek WAJIB menyertakan tech stack dan peran spesifik (Contoh: Jangan hanya menulis "Membangun model AI", wajibkan "Membangun model sentimen analisis menggunakan IndoBERT dengan akurasi 92%").
    4. BAHASA & FORMAT SUPER KETAT: Pindai seluruh teks dari singkatan obrolan/bahasa gaul (misal: 'ttg', 'dgn', 'yg', 'dlm'). Sistem ATS gagal membaca singkatan ini. Beri penalti skor yang sangat berat jika ditemukan.
    5. KONSISTENSI & SKORING YANG KEJAM TAPI ADIL: JANGAN NAIKKAN SKOR SECARA SEMBARANGAN. Skor rata-rata CV adalah 50-70. Skor 85-100 HANYA untuk CV sempurna kelas dunia. Pastikan argumen kelemahan Anda konsisten dengan skor yang diberikan.
    6. BATAS MAKSIMAL SKOR (WAJIB DIPATUHI):
    - Jika CV menggunakan kata singkatan/tidak baku: SKOR MAKSIMAL 60.
    - Jika CV tidak memuat semua Bagian Wajib (Mandatory Sections): SKOR MAKSIMAL 65.
    - Jika proyek atau pengalaman kerja tidak memiliki metrik kuantitatif: SKOR MAKSIMAL 70.
    7. REKOMENDASI YANG SPESIFIK: Kritik Anda harus bisa dieksekusi. Beritahu kandidat secara persis kalimat mana yang salah dan berikan contoh konkret bagaimana cara menulis ulangnya.
    
    REQUIRED JSON SCHEMA:
    {
      "step_1_checklist_mandatory_sections": {
        "has_contact_details": <boolean, WAJIB true jika ada email dan nomor telepon>,
        "has_linkedin_link": <boolean, WAJIB true jika ada tautan/ID LinkedIn>,
        "has_github_or_portfolio": <boolean, WAJIB true jika ada tautan GitHub/Portofolio teknis>,
        "has_professional_summary": <boolean, WAJIB true jika ada paragraf ringkasan profil di atas>,
        "has_education": <boolean, WAJIB true jika ada riwayat pendidikan/kampus>,
        "has_work_experience": <boolean, WAJIB true jika ada riwayat kerja profesional>,
        "has_projects": <boolean, WAJIB true jika ada daftar proyek akademik/pribadi/bootcamp>,
        "has_technical_skills": <boolean, WAJIB true jika ada daftar skill teknis>
      },
      "step_2_detected_slang_words": [
        "<string, KUTIP HANYA singkatan chat/tidak baku (misal: 'yg', 'dgn', 'krn', 'ttg', 'dlm'). PERINGATAN KERAS: JANGAN pernah memasukkan kata baku Bahasa Indonesia seperti 'dengan', 'secara', 'memastikan', 'untuk', dll. Kosongkan array [] jika teks sudah menggunakan bahasa formal.>"
      ],
      "step_3_missing_sections": [
        "<string, EVALUASI step_1. Masukkan nama bagian untuk setiap key yang bernilai false. Khusus kandidat Fresh Grad/Student: abaikan jika 'has_work_experience' false asalkan 'has_projects' true.>"
      ],
      "calculated_max_limit": <int, JIKA step_2 terisi maka 60. JIKA step_3 terisi maka 65. JIKA keduanya terisi maka 60. Jika aman maka 100.>,
      
      "ats_score": <int, skor akhir. WAJIB <= calculated_max_limit>,
      
      "match_analysis_text": "<string, paragraf evaluasi kritis...>",
      "star_rating": <int, 1-5>,
      "strengths": [
        "<string, kekuatan utama>"
      ],
      "weaknesses": [
        "<string, kelemahan kritikal. WAJIB sebutkan isi dari missing_sections dan slang_words jika ada!>"
      ],
      "recommendations": [
        {
          "advice": "<string, saran perbaikan yang spesifik>",
          "priority": "<string, High/Medium/Low Priority>"
        }
      ]
    }
    """

    user_prompt = f"Here is the CV text to analyze:\n\n{extracted_cv_text}"

    try:
        # Force reload .env dynamically to pick up any key updates without restarting uvicorn
        from dotenv import load_dotenv
        current_dir = os.path.dirname(os.path.abspath(__file__))
        env_path = os.path.abspath(os.path.join(current_dir, "..", "..", "..", ".env"))
        load_dotenv(env_path, override=True)

        # Check if the API key is fake
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key or "fake" in api_key.lower():
            logger.info("⚠️ GROQ_API_KEY is fake or missing. Triggering heuristic fallback engine...")
            return generate_heuristic_fallback(extracted_cv_text)

        client = get_llm_client()
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=1024
        )
        
        raw_json_string = response.choices[0].message.content or "{}"
        analysis_result = json.loads(raw_json_string)

        keys_to_remove = [
            "step_1_checklist_mandatory_sections",
            "step_2_detected_slang_words",
            "step_3_missing_sections",
            "calculated_max_limit"
        ]
        
        for key in keys_to_remove:
            analysis_result.pop(key, None)

        return analysis_result

    except Exception as e:
        logger.error(f"❌ Failed to analyze CV via Groq: {e}. Triggering heuristic fallback engine...")
        try:
            return generate_heuristic_fallback(extracted_cv_text)
        except Exception as fe:
            logger.error(f"❌ Heuristic fallback also failed: {fe}")
            return {
                "ats_score": 50,
                "match_analysis_text": "Gagal menganalisis CV secara otomatis akibat kendala teknis sistem.",
                "star_rating": 3,
                "strengths": ["Berkas CV berhasil diunggah."],
                "weaknesses": ["Analisis AI tidak dapat diselesaikan saat ini."],
                "recommendations": [{"advice": "Coba kembali dalam beberapa menit.", "priority": "Medium"}]
            }