import os
import psycopg2
from sentence_transformers import SentenceTransformer

# ==========================================
# KONFIGURASI
# ==========================================
# Ganti dengan nama folder tempat kamu menaruh 26 file .txt
KNOWLEDGE_FOLDER = "Knowledge Base/Knowledge_Base_RAG" 

from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:zaza121104@localhost:5433/postgres")

# Load model embedding (Ringan, tidak butuh GPU besar)
print("⏳ Loading Embedding Model (all-MiniLM-L6-v2)...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("✅ Model loaded!")

# ==========================================
# FUNGSI CHUNKING
# ==========================================
def chunk_text(text: str, chunk_size: int = 1000) -> list:
    """
    Memecah teks panjang menjadi potongan-potongan kecil.
    Kita memecah berdasarkan paragraf (\n\n) agar konteks kalimat tidak terpotong di tengah.
    """
    paragraphs = text.split('\n\n')
    chunks = []
    current_chunk = ""

    for para in paragraphs:
        # Jika paragraf kosong, lewati
        if not para.strip():
            continue
            
        # Gabungkan paragraf sampai batas chunk_size
        if len(current_chunk) + len(para) < chunk_size:
            current_chunk += para + "\n\n"
        else:
            chunks.append(current_chunk.strip())
            current_chunk = para + "\n\n"
            
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
        
    return chunks

# ==========================================
# PROSES UTAMA (ETL PIPELINE)
# ==========================================
def main():
    # 1. Buka koneksi ke Database
    print("⏳ Menghubungkan ke PostgreSQL...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    print("✅ Koneksi database berhasil!")

    total_chunks_inserted = 0

    # 2. Iterasi seluruh file .txt di folder
    if not os.path.exists(KNOWLEDGE_FOLDER):
        print(f"❌ Folder '{KNOWLEDGE_FOLDER}' tidak ditemukan!")
        return

    file_list = [f for f in os.listdir(KNOWLEDGE_FOLDER) if f.endswith(".txt")]
    print(f"📂 Ditemukan {len(file_list)} file .txt untuk diproses.\n")

    for filename in file_list:
        filepath = os.path.join(KNOWLEDGE_FOLDER, filename)
        
        with open(filepath, 'r', encoding='utf-8') as file:
            text_content = file.read()
            
            # Ekstrak teks menjadi beberapa chunk
            chunks = chunk_text(text_content)
            print(f"Memproses '{filename}' -> menghasilkan {len(chunks)} chunks.")
            
            for chunk in chunks:
                if len(chunk) < 50: # Abaikan chunk yang terlalu pendek/sampah
                    continue
                
                # UBAH TEKS JADI VEKTOR ANGKA!
                embedding_vector = model.encode(chunk).tolist()
                
                # Masukkan ke tabel pgvector
                cur.execute(
                    "INSERT INTO knowledge_base (file_name, content, embedding) VALUES (%s, %s, %s)",
                    (filename, chunk, embedding_vector)
                )
                total_chunks_inserted += 1

    # 3. Commit dan tutup koneksi
    conn.commit()
    cur.close()
    conn.close()

    print("\n" + "="*50)
    print(f"🎉 SUKSES! {total_chunks_inserted} potongan pengetahuan berhasil masuk ke Database.")
    print("Sistem RAG siap digunakan oleh Chatbot NeoKarir!")
    print("="*50)

if __name__ == "__main__":
    main()