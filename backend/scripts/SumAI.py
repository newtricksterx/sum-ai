import sys
from bs4 import BeautifulSoup
import openai
import requests
from trafilatura import fetch_url, extract
from trafilatura.sitemaps import sitemap_search
import os

def CreateQuery(url, length, regenerate, format, language):
    
    
    html = fetch_url(url)
    text = extract(html, include_links=True, favor_recall=True)
    
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Find all anchor tags (<a>) with the 'href' attribute
    links = soup.find_all('a', href=True)

    # Extract and print the href attribute (the link)
    link_string = ""
    
    for link in links:
        link_string = link_string + link['href'] + ", "
    
    
    different = ""
    
    if regenerate:
        different = "It also must be a different version" 
    
    #query = "summarize the content in this page: " + text + ", where the length is: " + str(length) + ". " + different + ". Format: " + format + \
    #    ". Return prompt as HTML, tailwind css, and dont use classname nor class. Make sure to have a title. if there are any links, make it so that it opens to new window \
    #    . If it's a video, summarize the video transcript. Remove the ```html and ``` part."
        
        
    query = f"""
            Please summarize the content of the following page: "{text}" in {language}, reference these links: "{link_string}", where the length is {length}. 
            Consider the additional instruction: "{different}". 
            Format the output using HTML and Tailwind CSS in {format}, but avoid using 'class' or 'className' or any styles. 
            Ensure the response includes a title as a header such as h1. 
            If there are any links, make them open in a new window. 
            Remove any ```html and ``` tags from the response.
            """

    #print(query)
    
    return query
    

def QueryAI(query):
    client = openai.OpenAI(  
        api_key=os.getenv("OPENAI_API_KEY")
    )

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "user",
                "content": query
            }
        ]
    )
        
    return completion.choices[0].message.content
    
    #return "temp query"

   
def SummarizeContent(url, length, regenerate, format, language):
    query = CreateQuery(url, length, regenerate, format, language)
    
    #print(query)
    
    result = QueryAI(query)
    
    #print(result)
    
    return result
   



if __name__ == "__main__":
    args = sys.argv[1]
    
    URL = str(args)
    query = CreateQuery(URL)
    result = QueryAI(query)