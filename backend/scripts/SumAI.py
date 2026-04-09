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

def CreateQuery(url, length, regenerate, format, language):
    response = session.get(url, timeout=10)
    html = response.text
    
    soup = BeautifulSoup(html, 'html.parser')
    
    text = extract(html, include_links=True, favor_recall=True)
    
    # Find all anchor tags (<a>) with the 'href' attribute
    links = soup.find_all('a', href=True)
    link_string = ", ".join([link['href'] for link in links])
    
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
                - Links: Reference these URLs: {link_string}. All <a> tags MUST include target="_blank" and rel="noopener noreferrer". If no links are provided, do not include a references section.
                - Technical: Use ONLY semantic HTML tags (e.g., <h1>, <p>, <ul>). 
                - STRIKINGLY IMPORTANT: Do NOT use 'class', 'className', or 'style' attributes. Do NOT include markdown code blocks (```html).

                # STRUCTURE
                1. Start immediately with an <h1> title.
                2. Follow with the summary body. Make it easy to read.
            """
    
    return query
    

def QueryAI(query):
    print(os.getenv("GEMINI_API_MODEL"))

    client = genai.Client(
        api_key=os.getenv("GEMINI_API_KEY")
    )

    response = client.models.generate_content(
        model=os.getenv("GEMINI_API_MODEL"), 
        contents=query
    )
    
    return response.text

   
def SummarizeContent(url, length, regenerate, format, language):
    print(f"Request made at: {time.time()}", flush=True)
    #start = time.time()
    
    query = CreateQuery(url, length, regenerate, format, language)
    #print(f"Query creation took: {time.time() - start:.2f} seconds")

    #time.sleep(3)

    if not DEBUG_MODE:
        result = QueryAI(query=query)
    else:
        result = query

    #print(f"AI response took: {time.time() - start:.2f} seconds")
    
    return result