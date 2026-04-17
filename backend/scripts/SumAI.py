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

# This tells the 'trafilatura' library to only show ERRORS, not info/debug logs
logging.getLogger('trafilatura').setLevel(logging.ERROR)
# You might want to do the same for 'requests' and 'urllib3'
logging.getLogger('urllib3').setLevel(logging.ERROR)

session = requests.Session()
session.verify = certifi.where()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
})

def CreateQuery(page_content, length, regenerate, format, language):
    
    # Clean the content (works on both raw HTML and raw Text)
    text = extract(page_content, include_links=True, favor_recall=True)
    
    # If trafilatura fails to find text (e.g., content was already just text), 
    # fall back to the raw content
    if not text:
        text = page_content[:10000] # Cap it to avoid token limits

    # For link referencing, we use BeautifulSoup on the passed content
    soup = BeautifulSoup(page_content, 'html.parser')
    links = soup.find_all('a', href=True)
    link_string = ", ".join([link['href'] for link in links[:15]]) # Limit links to save tokens
    
    different = "It also must be a different version" if regenerate else ""
    
    query = f"""
                # ROLE
                You are a professional content summarizer that outputs clean, valid HTML.

                # TASK
                Summarize the following text in {language}.
                Text: "{text}"

                # CONSTRAINTS
                - Length: {length}
                - Style: {different}
                - Format: Use {format} structure.
                - Links: Reference these URLs: {link_string}. All <a> tags MUST include target="_blank" and rel="noopener noreferrer".
                - Technical: Use ONLY semantic HTML tags (e.g., <h1>, <p>, <ul>). 
                - STRIKINGLY IMPORTANT: Do NOT use 'class', 'className', or 'style' attributes. Do NOT include markdown code blocks (```html).

                # STRUCTURE
                1. Start immediately with an <h1> title. Remove the ```html
                2. Follow with the summary body.
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
    
    return result