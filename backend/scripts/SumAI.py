import os
import time
import sys
from bs4 import BeautifulSoup
import requests
from trafilatura import fetch_url, extract
from google import genai

session = requests.Session()

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
            Please summarize the content of the following page: "{text}" in {language}, reference these links: "{link_string}", where the length is {length}. 
            Consider the additional instruction: "{different}". 
            Format the output using HTML and Tailwind CSS in {format}, but avoid using 'class' or 'className' or any styles. 
            Ensure the response includes a title as a header such as h1. 
            If there are any links, make them open in a new window. 
            Remove any ```html and ``` tags from the response.
            """
    
    return query
    

def QueryAI(query):
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
    
    #result = QueryAI(query)
    result = query
    #print(f"AI response took: {time.time() - start:.2f} seconds")
    
    return result