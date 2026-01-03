import json
import time
from datetime import datetime
from urllib import request

API_URL = "http://localhost:5000/api/tap"


def send_tap(credential, credential_type, reader_id):
    payload = {
        "credential": credential,
        "credential_type": credential_type,
        "reader_id": reader_id,
        "method": "NFC",
        "tapped_at": datetime.now().isoformat(),
    }
    data = json.dumps(payload).encode("utf-8")
    req = request.Request(API_URL, data=data, headers={"Content-Type": "application/json"})
    with request.urlopen(req, timeout=5) as response:
        return response.read().decode("utf-8")


def simulate_reader():
    reader_id = input("Enter reader id (e.g., reader-it101): ").strip()
    print("Type card UID for physical card or token for mobile.")
    while True:
        credential = input("Tap (or type 'exit'): ").strip()
        if credential.lower() == "exit":
            break

        if credential.startswith("mtu-token-"):
            credential_type = "mobile"
        else:
            credential_type = "card"

        try:
            result = send_tap(credential, credential_type, reader_id)
            print("Response:", result)
        except Exception as exc:
            print("Failed to send tap:", exc)
        time.sleep(0.5)


if __name__ == "__main__":
    simulate_reader()
