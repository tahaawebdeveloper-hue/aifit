FROM node:20-slim

# Install Python
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm install --production

# Install Python dependencies
COPY requirements.txt ./
RUN pip3 install --break-system-packages -r requirements.txt

# Copy all project files
COPY . .

# Train the ML models
RUN cd ml-model && python3 train_model.py

EXPOSE 5000

CMD ["node", "backend/server.js"]