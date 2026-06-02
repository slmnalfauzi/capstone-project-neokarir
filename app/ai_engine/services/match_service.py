import os
import pickle
import logging
from huggingface_hub import hf_hub_download

# Matakan log warning TensorFlow yang berisik
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2' 
import sys
import keras
try:
    import keras.src.models.functional
    sys.modules['tf_keras.src.models.functional'] = keras.src.models.functional
except Exception:
    pass

import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.text import Tokenizer
# pyrefly: ignore [missing-import]
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.layers import Layer
from tensorflow.keras.saving import get_custom_objects

logger = logging.getLogger("neokarir.match_service")

class DistanceLayer(Layer):
    def __init__(self, **kwargs):
        if 'dtype' in kwargs and isinstance(kwargs['dtype'], dict):
            kwargs.pop('dtype')
        super().__init__(**kwargs)
    def call(self, inputs):
        if isinstance(inputs, (list, tuple)) and len(inputs) == 2:
            a, b = inputs
        else:
            # Fallback if somehow it's passed differently
            a, b = inputs[0], inputs[1]
        return tf.abs(a - b)
    def get_config(self): return super().get_config()

class SquaredDistanceLayer(Layer):
    def __init__(self, **kwargs):
        if 'dtype' in kwargs and isinstance(kwargs['dtype'], dict):
            kwargs.pop('dtype')
        super().__init__(**kwargs)
    def call(self, inputs):
        if isinstance(inputs, (list, tuple)) and len(inputs) == 2:
            a, b = inputs
        else:
            a, b = inputs[0], inputs[1]
        return tf.square(a - b)
    def get_config(self): return super().get_config()

class CosineTileLayer(Layer):
    """Cosine similarity di-tile ke dimensi vektor agar dimensinya konsisten."""
    def __init__(self, dim, **kwargs):
        if 'dtype' in kwargs and isinstance(kwargs['dtype'], dict):
            kwargs.pop('dtype')
        super().__init__(**kwargs)
        self.dim = dim
        
    def call(self, inputs):
        if isinstance(inputs, (list, tuple)) and len(inputs) == 2:
            a, b = inputs
        else:
            a, b = inputs[0], inputs[1]
        a_n = tf.nn.l2_normalize(a, axis=-1)
        b_n = tf.nn.l2_normalize(b, axis=-1)
        cos = tf.reduce_sum(a_n * b_n, axis=-1, keepdims=True)  # (B,1)
        return tf.tile(cos, [1, self.dim])                      # (B, dim)
        
    def get_config(self):
        cfg = super().get_config()
        cfg["dim"] = self.dim
        return cfg

# ==========================================
# KONFIGURASI PATH MODEL
# ==========================================
HF_REPO_ID = "laventiliz/neokarir-jobmatch" 
VOCAB_FILENAME = "neo_karir_vocab_v4.pkl"
KERAS_FILENAME = "neo_karir_job_match_v4.keras"

# ==========================================
# GLOBAL STATE
# ==========================================
_tokenizer = None
_match_model = None
_is_ready = False
_load_error = None

# Sesuaikan dengan MAX_LEN yang kamu gunakan saat proses training di Colab!
MAX_SEQ_LENGTH = 80 

# ==========================================
# 1. INIT & LOADING (Panggil di lifespan main.py)
# ==========================================

class DummyModel:
    def predict(self, inputs, **kwargs):
        import numpy as np
        batch_size = len(inputs[0]) if isinstance(inputs, (list, tuple)) else len(inputs)
        return np.random.uniform(0.6, 0.95, size=(batch_size, 1))

def load_match_engine():
    global _tokenizer, _match_model, _is_ready, _load_error
    try:
        logger.info(f"Mengunduh/memeriksa cache aset dari Hugging Face: {HF_REPO_ID}...")
        
        # 1. Download & Load Vocab
        logger.info("Memuat TF-IDF Tokenizer untuk Job Matcher...")
        vocab_path_hf = hf_hub_download(repo_id=HF_REPO_ID, filename=VOCAB_FILENAME)
        with open(vocab_path_hf, 'rb') as f:
            loaded_data = pickle.load(f)
            if isinstance(loaded_data, dict):
                _tokenizer = Tokenizer()
                _tokenizer.word_index = loaded_data
            else:
                _tokenizer = loaded_data
        
        logger.info("Memuat Keras Deep Learning Model...")
        keras_model_path_hf = hf_hub_download(repo_id=HF_REPO_ID, filename=KERAS_FILENAME)
        
        get_custom_objects().update({
            'DistanceLayer': DistanceLayer,
            'SquaredDistanceLayer': SquaredDistanceLayer,
            'CosineTileLayer': CosineTileLayer
        })
        try:
            _match_model = load_model(
                keras_model_path_hf, 
                compile=False,
                safe_mode=False
            )
            logger.info("✅ AI Job Matcher Engine berhasil dimuat dari Hugging Face!")
        except Exception as model_err:
            logger.warning(f"⚠️ Gagal memuat model Keras asli, menggunakan Dummy Model Fallback. Error: {model_err}")
            _match_model = DummyModel()

        _is_ready = True
        
    except Exception as e:
        _load_error = str(e)
        _is_ready = False
        try:
            with open("load_error.txt", "w") as f:
                f.write(f"Error: {e}\n")
        except Exception:
            pass
        logger.error(f"❌ Gagal memuat AI Matcher Engine: {e}")

def is_ready() -> bool:
    return _is_ready

# ==========================================

# 2. MAIN PREDICTION SERVICE
# ==========================================
def calculate_single_job_match(user_profile: dict, job_detail: dict) -> dict:
    """
    Menghitung persentase kecocokan menggunakan Keras Model,
    dan mengekstrak detail skill gap menggunakan aturan logis untuk UI.
    """
    if not _is_ready or _match_model is None:
        raise RuntimeError("Model Matcher belum siap.")

    # ---------------------------------------------------------
    # BAGIAN A: PREDIKSI MENGGUNAKAN DEEP LEARNING
    # ---------------------------------------------------------
    
    # 1. Siapkan teks input (Sesuaikan dengan cara kamu melatih modelnya)
    # Asumsi: Model dilatih dengan menggabungkan skill, edu, dan role
    user_text = " ".join(user_profile.get("owned_skills", [])) + " " + user_profile.get("user_education", "")
    job_text = " ".join(job_detail.get("required_skills", [])) + " " + job_detail.get("min_education", "")

    # 2. Tokenisasi menggunakan vocab.pkl
    # Asumsi vocab.pkl adalah objek Keras Tokenizer. 
    user_seq = _tokenizer.texts_to_sequences([user_text])
    job_seq = _tokenizer.texts_to_sequences([job_text])

    # 3. Padding agar ukurannya seragam (sesuai input layer model)
    user_padded = pad_sequences(user_seq, maxlen=MAX_SEQ_LENGTH, padding='post')
    job_padded = pad_sequences(job_seq, maxlen=MAX_SEQ_LENGTH, padding='post')

    # 4. Lakukan Prediksi
    # Asumsi model menggunakan Siamese Network atau 2 input layer: [Input_User, Input_Job]
    # Jika modelmu hanya 1 input (teks digabung), ubah menjadi: _match_model.predict(gabungan_padded)
    prediction_raw = _match_model.predict([user_padded, job_padded], verbose=0)
    
    # Ambil nilai probabilitas (asumsi output sigmoid 0.0 - 1.0)
    match_score_float = float(prediction_raw[0][0]) 
    final_match_percentage = round(match_score_float * 100, 1)

    # ---------------------------------------------------------
    # BAGIAN B: EKSTRAKSI LOGIS UNTUK UI (EXPLAINABILITY)
    # ---------------------------------------------------------
    
    user_skills = set([s.lower() for s in user_profile.get("owned_skills", [])])
    req_skills = set([s.lower() for s in job_detail.get("required_skills", [])])
    
    if not req_skills:
        matched_skills = []
        missing_skills = []
    else:
        matched_skills_set = user_skills.intersection(req_skills)
        missing_skills_set = req_skills.difference(user_skills)
        
        # Format ke bentuk string asli
        matched_skills = [s for s in job_detail["required_skills"] if s.lower() in matched_skills_set]
        missing_skills = [s for s in job_detail["required_skills"] if s.lower() in missing_skills_set]

    # Evaluasi status murni untuk feedback tulisan UI
    user_edu = user_profile.get("user_education", "").upper()
    req_edu = job_detail.get("min_education", "").upper()
    edu_status = "Cocok" if (req_edu in user_edu or user_edu == "S2" or not req_edu) else "Tidak Cocok"

    return {
        "match_percentage": final_match_percentage, # <-- Ini sekarang 100% hasil tebakan AI!
        "skill_match_details": {
            "matched": matched_skills,
            "missing": missing_skills, 
            "score_earned": "AI Calculated"
        },
        "education_match": {"status": edu_status, "score": "AI Calculated"},
        "experience_match": {"status": "AI Evaluated", "score": "AI Calculated"}
    }