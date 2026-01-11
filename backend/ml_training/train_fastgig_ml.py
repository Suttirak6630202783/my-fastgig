# train_fastgig_ml.py
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments
)
import pandas as pd
from sklearn.model_selection import train_test_split
import torch
from datasets import Dataset

# โหลด dataset
df = pd.read_csv("training_jobs.csv")

# รวมข้อความ skill + job
df["text"] = df["user_skill"] + " [SEP] " + df["job_title"] + " " + df["job_desc"]

# แบ่ง train/test
train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)

# โหลด tokenizer
MODEL_NAME = "airesearch/wangchanberta-base-att-spm-uncased"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

def tokenize(batch):
    return tokenizer(batch["text"], truncation=True, padding="max_length", max_length=128)

train_dataset = Dataset.from_pandas(train_df)
test_dataset = Dataset.from_pandas(test_df)
train_dataset = train_dataset.map(tokenize, batched=True)
test_dataset = test_dataset.map(tokenize, batched=True)

# โหลดโมเดล
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, num_labels=2)

# ตั้งค่า train
args = TrainingArguments(
    output_dir="./results",
    evaluation_strategy="epoch",
    save_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,
    num_train_epochs=2,
    weight_decay=0.01,
    logging_dir="./logs"
)

trainer = Trainer(
    model=model,
    args=args,
    train_dataset=train_dataset,
    eval_dataset=test_dataset,
)

trainer.train()
trainer.save_model("../fastgig_model")  # บันทึกไว้ที่ backend/fastgig_model
print("✅ Model trained and saved at ../fastgig_model")
