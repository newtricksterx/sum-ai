import os
import certifi

DEBUG_MODE = os.getenv("DEBUG", "False").lower() == "true"

#print(DEBUG_MODE)

if DEBUG_MODE:
    os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()
    os.environ['SSL_CERT_FILE'] = certifi.where()

import time
import sys
from bs4 import BeautifulSoup
import requests
from trafilatura import fetch_url, extract
from google import genai
import logging
import re

# This tells the 'trafilatura' library to only show ERRORS, not info/debug logs
# logging.getLogger('trafilatura').setLevel(logging.ERROR)
# You might want to do the same for 'requests' and 'urllib3'
logging.getLogger('urllib3').setLevel(logging.ERROR)

session = requests.Session()
session.verify = certifi.where()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
})

def CreateQuery(page_content, length, regenerate, format, language):

    #print(f"Content Length received: {len(page_content)}")
    #print(f"Content Preview: {page_content[:500]}") # Check the first 500 chars
    
    # Clean the content (works on both raw HTML and raw Text)
    #text = extract(page_content, include_links=True, favor_recall=True)

    text = page_content
    if not text:
        text = page_content[:10000]

    # For link referencing, we use BeautifulSoup on the passed content
    soup = BeautifulSoup(page_content, 'html.parser')
    links = soup.find_all('a', href=True)
    link_string = ", ".join([link['href'] for link in links[:15]]) 
    
    different = "It also must be a different version" if regenerate else ""
    
    query = f"""
        # ROLE
        You are a specialized API that converts text into raw, semantic HTML. You do not talk to the user.

        # TASK
        Summarize the following text in {language}.
        Text: "{text}"

        # CONSTRAINTS
        - Length: {length}
        - Style: {different}
        - Format: Use {format} structure.
        - Links: Reference these URLs if relevant: {link_string}. 
        - Link Safety: All <a> tags must include target="_blank" and rel="noopener noreferrer".
        - Forbidden: No Markdown (###, **, ```), no 'class', no 'style', no <html>/<body> tags.

        # OUTPUT TEMPLATE
        <h1>Title of the Summary</h1>
        (Output based on Format goes here)
        <strong>(any key points)</strong>
        """

    return query
    

def QueryAI(query):
    #print(os.getenv("GEMINI_API_MODEL"))

    client = genai.Client(
        api_key=os.getenv("GEMINI_API_KEY")
    )

    response = client.models.generate_content(
        model=os.getenv("GEMINI_API_MODEL"), 
        contents=query
    )
    
    return response.text

   
def SummarizeContent(content, length, regenerate, format, language):
    print(f"Request made at: {time.time()}", flush=True)
    #start = time.time()
    
    query = CreateQuery(content, length, regenerate, format, language)
    #print(f"Query creation took: {time.time() - start:.2f} seconds")

    #time.sleep(3)

    if not DEBUG_MODE:
        result = QueryAI(query=query)
    else:
        result = query

    #print(f"AI response took: {time.time() - start:.2f} seconds")
    # 1. Strip triple backticks and the word "html"
    result = re.sub(r'```html|```', '', result).strip()

    # 2. Check if the AI Markdown anyway (starts with #)
    if result.startswith("#"):
        # This is a 'dirty' fix: replace Markdown headers with HTML
        result = re.sub(r'^# (.*)', r'<h1>\1</h1>', result, flags=re.M)
        result = re.sub(r'^## (.*)', r'<h2>\1</h2>', result, flags=re.M)
        result = re.sub(r'^\* (.*)', r'<li>\1</li>', result, flags=re.M)
        # Wrap lone li tags in a ul if needed, or just warn yourself in logs
        print("Warning: AI returned Markdown. Applied basic regex cleaning.")
    
    return result