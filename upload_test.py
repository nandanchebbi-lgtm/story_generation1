# upload_test.py
import requests

url = "http://127.0.0.1:8000/photo/upload?profile=Nandan"
files = {"file": open(r"C:\Users\nanda\Desktop\photo1.jpg", "rb")}
response = requests.post(url, files=files)
print("Status code:", response.status_code)
print("Response JSON:", response.json())