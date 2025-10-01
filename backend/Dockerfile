# Use a modern, slim Python image
FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /code

# Copy and install Python dependencies
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the rest of your backend code into the container
COPY . /code/

# Command to run the application using Gunicorn
# Hugging Face Spaces typically expose port 7860
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "main:app", "--host", "0.0.0.0", "--port", "7860"]