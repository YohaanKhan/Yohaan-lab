FROM python:3.11-slim

WORKDIR /app

COPY services/poker-engine/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/poker-engine/ .

EXPOSE 8003

CMD ["uvicorn", "main:socket_app", "--host", "0.0.0.0", "--port", "8003"]