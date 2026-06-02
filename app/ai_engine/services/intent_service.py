import os
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification

class IntentClassifier:
    def __init__(self, repo_id: str):
        self.repo_id = repo_id
        
        # Batas minimal skor confidence (60%) agar tidak berhalusinasi
        self.CONFIDENCE_THRESHOLD = 0.60
        
        # Fallback intent list jika config.json tidak menyimpan id2label
        self.fallback_labels = [
            "salam_sapaan", 
            "cari_lowongan", 
            "analisis_skill_gap", 
            "tanya_roadmap_karir", 
            "tanya_tips_rekrutmen", 
            "bantuan_fitur_aplikasi", 
            "out_of_context"
        ]
        
        self.tokenizer = None
        self.model = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Load model secara otomatis saat class dipanggil
        self._load_model()

    def _load_model(self):
        """Memuat Tokenizer dan Model XLM-RoBERTa langsung dari Hugging Face Hub"""
        print(f"Mengunduh/Memuat XLM-RoBERTa Intent Classifier dari {self.repo_id} ke {self.device.type.upper()}...")
        self.use_fallback_classifier = False
        
        try:
            # transformers otomatis mengunduh (atau mengambil dari cache) berdasarkan repo_id
            self.tokenizer = AutoTokenizer.from_pretrained(self.repo_id)
            self.model = AutoModelForSequenceClassification.from_pretrained(self.repo_id)
            self.model.to(self.device)
            self.model.eval() # Set ke mode evaluasi
            
            # Ekstrak label dari config.json jika ada
            if self.model.config.id2label and len(self.model.config.id2label) > 2:
                self.labels = [self.model.config.id2label[k] for k in sorted(self.model.config.id2label.keys())]
            else:
                self.labels = self.fallback_labels
                
            print(f"XLM-RoBERTa loaded successfully from HF! Registered {len(self.labels)} intents.")
            
        except Exception as e:
            print(f"⚠️ Gagal memuat model dari awan: {str(e)}")
            print("⚠️ Mengaktifkan Rule-Based Keyword Classifier karena memori/koneksi terganggu...")
            self.use_fallback_classifier = True
            self.labels = self.fallback_labels

    def _predict_rule_based(self, user_text: str) -> dict:
        text = user_text.lower()
        
        # 1. Check roadmap
        if any(w in text for w in ["roadmap", "kurikulum", "belajar", "langkah", "panduan", "cara menjadi"]):
            return {"intent": "tanya_roadmap_karir", "confidence": 0.99, "is_fallback": False, "reason": "Rule-based"}
            
        # 2. Check tips rekrutmen / CV
        if any(w in text for w in ["rekrut", "tips", "cv", "resume", "interview", "wawancara", "negosiasi", "gaji"]):
            return {"intent": "tanya_tips_rekrutmen", "confidence": 0.99, "is_fallback": False, "reason": "Rule-based"}
            
        # 3. Check salam sapaan
        if any(w in text for w in ["hai", "halo", "hallo", "selamat pagi", "selamat siang", "selamat sore", "selamat malam", "assalamualaikum"]):
            return {"intent": "salam_sapaan", "confidence": 0.99, "is_fallback": False, "reason": "Rule-based"}
            
        # 4. Check cari lowongan
        if any(w in text for w in ["loker", "lowongan", "kerja", "cari pekerjaan", "dapatkan pekerjaan"]):
            return {"intent": "cari_lowongan", "confidence": 0.99, "is_fallback": False, "reason": "Rule-based"}
            
        # 5. Check analisis skill gap
        if any(w in text for w in ["skill gap", "analisis skill", "kekurangan skill", "skill saya"]):
            return {"intent": "analisis_skill_gap", "confidence": 0.99, "is_fallback": False, "reason": "Rule-based"}
            
        # 6. Check bantuan fitur aplikasi
        if any(w in text for w in ["fitur", "bantuan", "aplikasi", "neokarir", "bisa apa"]):
            return {"intent": "bantuan_fitur_aplikasi", "confidence": 0.99, "is_fallback": False, "reason": "Rule-based"}
            
        # Fallback
        return {
            "intent": "out_of_context",
            "confidence": 0.0,
            "is_fallback": True,
            "reason": "Rule-based fallback"
        }

    def predict(self, user_text: str) -> dict:
        """Melakukan inferensi pada teks pengguna."""
        if not user_text.strip():
            return self._build_fallback_response(0.0, "Input teks kosong.")

        if getattr(self, "use_fallback_classifier", False):
            return self._predict_rule_based(user_text)

        # 1. Preprocessing & Tokenisasi
        inputs = self.tokenizer(
            user_text, 
            return_tensors="pt", 
            truncation=True, 
            max_length=128, 
            padding=True
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        # 2. Forward Pass (tanpa kalkulasi gradien untuk hemat RAM)
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits

        # 3. Softmax & Ambil skor tertinggi
        probabilities = F.softmax(logits, dim=1).squeeze().cpu().numpy()
        best_idx = probabilities.argmax().item()
        highest_confidence = float(probabilities[best_idx])
        predicted_intent = self.labels[best_idx]

        # 4. Filter Threshold Guard
        if highest_confidence < self.CONFIDENCE_THRESHOLD:
            return self._build_fallback_response(
                highest_confidence, 
                f"Ragu-ragu (Confidence: {highest_confidence:.2f})"
            )

        if predicted_intent == "out_of_context":
            return self._build_fallback_response(highest_confidence, "Terdeteksi out_of_context")

        return {
            "intent": predicted_intent,
            "confidence": highest_confidence,
            "is_fallback": False,
            "reason": "Aman"
        }

    def _build_fallback_response(self, confidence: float, reason: str) -> dict:
        """Format standar untuk respon yang di-reject atau masuk fallback."""
        return {
            "intent": "out_of_context",
            "confidence": confidence,
            "is_fallback": True,
            "reason": reason
        }

# ==========================================
# INISIALISASI SINGLETON
# ==========================================
# Ganti ini dengan username dan nama repo Hugging Face yang menyimpan folder model XLM-R kamu
HF_INTENT_REPO_ID = "laventiliz/neokarir-chatbot_intent"

intent_classifier = IntentClassifier(repo_id=HF_INTENT_REPO_ID)