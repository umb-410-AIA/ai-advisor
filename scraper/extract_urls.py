"""
Name : extract_urls.py
Description : Tool to extract urls from a page
Author : Blake Moody
Date : 11-8-2024
"""

from urllib.request import urlopen
from bs4 import BeautifulSoup
from urllib.parse import quote

def extract_urls(url, keyword=None):
    """
    Returns a list of all urls contained on web page 

    Parameters
    ----------
    url : str
        Web page URL to be scraped for urls
    """
    page = urlopen(url).read()
    soup = BeautifulSoup(page)
    soup.prettify()
    if keyword is None:
        return [quote(anchor['href']).replace("%3A", ":") for anchor in soup.findAll('a', href=True)]
    else:
        return [quote(anchor['href']).replace("%3A", ":") for anchor in soup.findAll('a', href=True) if keyword in anchor['href']]