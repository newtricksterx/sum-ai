import pymupdf


def isPDF(url):
    pass


def extractContents(pdf_path):
    doc = pymupdf.open(pdf_path)
    for page in doc:
        text = page.get_text().encode("utf8") # type: ignore

    


extractContents("summary.pdf")
