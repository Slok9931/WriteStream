from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PINATA_API_KEY = "7135724bbfdd437a3e29"
PINATA_SECRET_API_KEY = "81e3d0cae283038b4ac4c3c0d43bd94ab0e4fa2b4d79b9497bc74492680859e3"

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    headers = {
        "pinata_api_key": '7135724bbfdd437a3e29',
        "pinata_secret_api_key": '81e3d0cae283038b4ac4c3c0d43bd94ab0e4fa2b4d79b9497bc74492680859e3',
    }

    files = {
        "file": (file.filename, await file.read())
    }

    response = requests.post(url, headers=headers, files=files)
    return response.json()
